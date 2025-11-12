const { response, request } = require('express');
const ShippingOrder = require('../models/shipping_order.model');
const Transaction = require('../models/transaction.model');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');

/**
 * Obtener todas las órdenes de envío del vendedor
 * GET /api/shipping-orders
 */
const getShippingOrders = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { status, limit = 20, skip = 0 } = req.query;

        const filters = { seller: uid, estado: true };
        if (status) filters.status = status;

        const orders = await ShippingOrder.find(filters)
            .populate('transaction', 'transactionNumber totalAmount')
            .populate('shippingAddress')
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await ShippingOrder.countDocuments(filters);

        res.json({
            total,
            orders,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('Error al obtener órdenes de envío:', error);
        res.status(500).json({
            msg: 'Error al obtener órdenes de envío'
        });
    }
};

/**
 * Obtener una orden de envío específica
 * GET /api/shipping-orders/:id
 */
const getShippingOrder = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;

        const order = await ShippingOrder.findOne({
            _id: id,
            seller: uid,
            estado: true
        })
        .populate('transaction')
        .populate('shippingAddress')
        .populate('items.product', 'name images brand model');

        if (!order) {
            return res.status(404).json({
                msg: 'Orden de envío no encontrada'
            });
        }

        res.json({ order });

    } catch (error) {
        console.error('Error al obtener orden:', error);
        res.status(500).json({
            msg: 'Error al obtener la orden de envío'
        });
    }
};

/**
 * Actualizar estado de la orden de envío
 * PUT /api/shipping-orders/:id/status
 */
const updateShippingStatus = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;
        const { status, notes, carrier } = req.body;

        const order = await ShippingOrder.findOne({
            _id: id,
            seller: uid,
            estado: true
        });

        if (!order) {
            return res.status(404).json({
                msg: 'Orden de envío no encontrada'
            });
        }

        // Actualizar estado
        await order.updateStatus(status, notes);

        // Actualizar información de transportadora si se proporciona
        if (carrier) {
            order.carrier = {
                ...order.carrier,
                ...carrier
            };
            await order.save();
        }

        // Actualizar la transacción relacionada
        const transaction = await Transaction.findById(order.transaction);
        if (transaction) {
            if (status === 'in_transit') {
                transaction.orderStatus = 'shipped';
                transaction.tracking.shippedAt = new Date();
            } else if (status === 'delivered') {
                transaction.orderStatus = 'delivered';
                transaction.tracking.deliveredAt = new Date();
            }
            await transaction.save();
        }

        res.json({
            msg: `Orden actualizada a: ${status}`,
            order
        });

    } catch (error) {
        console.error('Error al actualizar orden:', error);
        res.status(400).json({
            msg: error.message || 'Error al actualizar el estado'
        });
    }
};

/**
 * 🆕 Confirmar entrega de la orden (DEPOSITA COMISIÓN EN WALLET)
 * PUT /api/shipping-orders/:id/confirm-delivery
 */
const confirmOrderDelivery = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;
        const {
            deliveryNotes,
            deliveryPhotos,
            signature,
            receivedBy
        } = req.body;

        console.log('📦 Confirmando entrega de orden:', id);

        // Buscar la orden
        const order = await ShippingOrder.findOne({
            _id: id,
            seller: uid,
            estado: true
        }).populate('transaction');

        if (!order) {
            return res.status(404).json({
                msg: 'Orden de envío no encontrada'
            });
        }

        // Validar que no esté ya entregada
        if (order.status === 'delivered') {
            return res.status(400).json({
                msg: 'Esta orden ya fue entregada',
                deliveredAt: order.tracking.deliveredAt
            });
        }

        // Validar que tenga comisión pendiente
        if (order.commission.status === 'deposited') {
            return res.status(400).json({
                msg: 'La comisión de esta orden ya fue depositada'
            });
        }

        const commissionAmount = order.commission.amount || 0;
        const commissionPoints = order.commission.points || 0;

        if (commissionAmount === 0) {
            return res.status(400).json({
                msg: 'No hay comisión para depositar'
            });
        }

        // ====================================
        // 1. ACTUALIZAR ORDEN A ENTREGADA
        // ====================================
        await order.updateStatus('delivered');
        order.delivery.notes = deliveryNotes;
        order.delivery.photos = deliveryPhotos || [];
        order.delivery.signature = signature;
        order.delivery.receivedBy = receivedBy;
        await order.save();

        console.log('✅ Orden actualizada a "delivered"');

        // ====================================
        // 2. ACTUALIZAR TRANSACCIÓN
        // ====================================
        const transaction = await Transaction.findById(order.transaction);
        if (transaction) {
            transaction.orderStatus = 'delivered';
            transaction.tracking.deliveredAt = new Date();
            if (transaction.commissions) {
                transaction.commissions.commissionStatus = 'approved';
            }
            await transaction.save();
        }

        // ====================================
        // 3. DEPOSITAR COMISIÓN EN WALLET
        // ====================================
        let wallet = await Wallet.findOne({ user: uid, estado: true });

        if (!wallet) {
            console.log('📝 Creando wallet para usuario');
            wallet = new Wallet({
                user: uid,
                balance: 0,
                pendingBalance: 0,
                points: 0,
                estado: true
            });
        }

        // Guardar balance anterior
        const previousBalance = wallet.balance;
        const previousPending = wallet.pendingBalance;

        // Transferir de pendiente a disponible
        if (wallet.pendingBalance >= commissionAmount) {
            wallet.pendingBalance -= commissionAmount;
        }

        // Depositar en balance disponible
        wallet.balance += commissionAmount;
        wallet.totalEarned = (wallet.totalEarned || 0) + commissionAmount;
        wallet.points = (wallet.points || 0) + commissionPoints;
        wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + commissionPoints;

        await wallet.save();

        console.log('💰 Wallet actualizado:', {
            previousBalance,
            newBalance: wallet.balance,
            deposited: commissionAmount
        });

        // ====================================
        // 4. REGISTRAR MOVIMIENTO EN WALLET
        // ====================================
        const movement = new WalletMovements({
            type: 'delivery_confirmed',
            amount: commissionAmount,
            points: commissionPoints,
            balanceAfter: wallet.balance,
            pointsAfter: wallet.points,
            description: `💰 Comisión por entrega - Orden #${order.orderNumber}`,
            wallet: wallet._id,
            sale: transaction?._id,
            status: 'completed',
            metadata: {
                orderNumber: order.orderNumber,
                transactionNumber: transaction?.transactionNumber,
                deliveredAt: order.tracking.deliveredAt,
                previousBalance,
                newBalance: wallet.balance,
                deposited: commissionAmount
            }
        });
        await movement.save();

        // ====================================
        // 5. ACTUALIZAR COMISIÓN DE LA ORDEN
        // ====================================
        order.commission.status = 'deposited';
        order.commission.depositedAt = new Date();
        await order.save();

        console.log('✅ Comisión depositada y registrada');

        // ====================================
        // 6. RETORNAR RESPUESTA
        // ====================================
        res.json({
            success: true,
            msg: '¡Entrega confirmada! Tu comisión ha sido depositada',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                deliveredAt: order.tracking.deliveredAt
            },
            commission: {
                amount: commissionAmount,
                points: commissionPoints,
                status: 'deposited',
                depositedAt: order.commission.depositedAt
            },
            deposit: {
                amount: commissionAmount,
                points: commissionPoints,
                previousBalance,
                newBalance: wallet.balance,
                depositedAt: new Date()
            },
            wallet: {
                availableBalance: wallet.balance,
                pendingBalance: wallet.pendingBalance,
                totalPoints: wallet.points,
                totalEarned: wallet.totalEarned
            },
            message: `Se han depositado $${commissionAmount.toLocaleString()} y ${commissionPoints} puntos en tu wallet`
        });

    } catch (error) {
        console.error('❌ Error al confirmar entrega:', error);
        res.status(500).json({
            msg: 'Error al confirmar la entrega',
            error: error.message
        });
    }
};

/**
 * 🆕 Obtener resumen de órdenes pendientes y comisiones
 * GET /api/shipping-orders/summary
 */
const getShippingOrdersSummary = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;

        // Estadísticas de órdenes
        const totalOrders = await ShippingOrder.countDocuments({
            seller: uid,
            estado: true
        });

        const pendingOrders = await ShippingOrder.countDocuments({
            seller: uid,
            status: { $in: ['pending', 'preparing', 'ready', 'in_transit'] },
            estado: true
        });

        const deliveredOrders = await ShippingOrder.countDocuments({
            seller: uid,
            status: 'delivered',
            estado: true
        });

        // Obtener órdenes pendientes con comisiones
        const pendingWithCommissions = await ShippingOrder.find({
            seller: uid,
            status: { $ne: 'delivered' },
            'commission.status': 'pending',
            estado: true
        })
        .populate('shippingAddress', 'fullAddress city department')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 });

        // Calcular comisiones pendientes
        const totalPendingCommissions = pendingWithCommissions.reduce((sum, order) =>
            sum + (order.commission.amount || 0), 0
        );

        const totalPendingPoints = pendingWithCommissions.reduce((sum, order) =>
            sum + (order.commission.points || 0), 0
        );

        // Obtener wallet
        const wallet = await Wallet.findOne({ user: uid, estado: true });

        res.json({
            wallet: {
                availableBalance: wallet?.balance || 0,
                pendingBalance: wallet?.pendingBalance || 0,
                totalPoints: wallet?.points || 0,
                totalEarned: wallet?.totalEarned || 0
            },
            orders: {
                total: totalOrders,
                pending: pendingOrders,
                delivered: deliveredOrders
            },
            commissions: {
                pending: {
                    amount: totalPendingCommissions,
                    points: totalPendingPoints,
                    orders: pendingOrders
                }
            },
            pendingOrders: pendingWithCommissions.map(order => ({
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                commission: order.commission.amount,
                points: order.commission.points,
                itemsCount: order.items.length,
                shippingAddress: order.shippingAddress,
                createdAt: order.createdAt,
                estimatedDelivery: order.tracking.estimatedDelivery
            }))
        });

    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({
            msg: 'Error al obtener resumen de órdenes'
        });
    }
};

module.exports = {
    getShippingOrders,
    getShippingOrder,
    updateShippingStatus,
    confirmOrderDelivery,
    getShippingOrdersSummary
};
