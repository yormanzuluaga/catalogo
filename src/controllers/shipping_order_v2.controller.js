const { response, request } = require('express');
const ShippingOrder = require('../models/shipping_order.model');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');
const Transaction = require('../models/transaction.model');

/**
 * 🆕 OBTENER MIS ÓRDENES DE ENVÍO
 * GET /api/shipping-orders-v2/my-orders
 */
const getMyOrders = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id; // 🔧 FIX: Usar _id
        const { status, limit = 20, skip = 0 } = req.query;

        console.log('📦 GET /my-orders');
        console.log('Usuario:', uid);

        // Filtros
        const filters = { buyer: uid, estado: true };
        if (status) filters.status = status;

        const orders = await ShippingOrder.find(filters)
            .populate('seller', 'firstName lastName phone email')
            .populate('shippingAddress')
            .populate('items.product', 'name images brand')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await ShippingOrder.countDocuments(filters);

        res.json({
            success: true,
            total,
            orders: orders.map(order => ({
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                statusLabel: getStatusLabel(order.status),
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    image: item.product?.images?.[0]
                })),
                totalAmount: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
                shippingAddress: order.shippingAddress,
                commission: order.commission,
                tracking: order.tracking,
                createdAt: order.createdAt
            })),
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('Error al obtener órdenes:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener tus pedidos'
        });
    }
};

/**
 * 🆕 ACTUALIZAR ESTADO DE ORDEN
 * PUT /api/shipping-orders-v2/:id/status
 * 
 * Body:
 * - status: nuevo estado (pending, approved, preparing, in_transit, delivered, cancelled)
 * - notes: notas opcionales
 */
const updateOrderStatus = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const uid = req.authenticatedUser._id; // 🔧 FIX: Usar _id
        const { status, notes } = req.body;

        console.log('📝 Actualizar estado de orden:', id);
        console.log('Nuevo estado:', status);

        // Buscar orden
        const order = await ShippingOrder.findOne({
            _id: id,
            buyer: uid,
            estado: true
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                msg: 'Orden de envío no encontrada'
            });
        }

        const previousStatus = order.status;
        console.log('Estado anterior:', previousStatus);

        // Actualizar estado
        order.status = status;

        // Actualizar tracking según el estado
        const now = new Date();
        switch (status) {
            case 'approved':
                if (!order.tracking.preparedAt) {
                    order.tracking.preparedAt = now;
                }
                break;
            case 'preparing':
                if (!order.tracking.preparedAt) {
                    order.tracking.preparedAt = now;
                }
                break;
            case 'in_transit':
                order.tracking.shippedAt = now;
                break;
            case 'delivered':
                order.tracking.deliveredAt = now;
                break;
            case 'cancelled':
                order.tracking.cancelledAt = now;
                break;
        }

        if (notes) {
            order.notes = order.notes || {};
            order.notes.sellerNotes = (order.notes.sellerNotes || '') + `\n[${status}] ${notes}`;
        }

        await order.save();

        // ========================================
        // MOVER BALANCE DE PENDING A DISPONIBLE
        // ========================================

        let balanceUpdated = false;
        let walletInfo = null;

        // Cuando se aprueba o se entrega, mover el balance
        if ((status === 'approved' || status === 'delivered') &&
            order.commission.status === 'pending' &&
            order.commission.amount > 0) {

            console.log('💰 Moviendo balance de pending a disponible...');

            // Buscar wallet
            let wallet = await Wallet.findOne({ user: uid, estado: true });

            if (!wallet) {
                wallet = new Wallet({
                    user: uid,
                    balance: 0,
                    pendingBalance: 0,
                    points: 0,
                    totalCommissionsEarned: 0,
                    totalPointsEarned: 0,
                    estado: true
                });
            }

            const commissionAmount = order.commission.amount;
            const commissionPoints = order.commission.points;

            // Solo mover de pendiente a disponible (NO sumar a total, ya se sumó al crear la transacción)
            wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - commissionAmount);
            wallet.balance = (wallet.balance || 0) + commissionAmount;
            // ❌ NO sumar a totalCommissionsEarned aquí, ya se sumó en la transacción

            if (commissionPoints > 0) {
                wallet.points = (wallet.points || 0) + commissionPoints;
                wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + commissionPoints;
            }

            await wallet.save();

            // Marcar comisión como depositada
            order.commission.status = 'deposited';
            order.commission.depositedAt = new Date();
            await order.save();

            // Crear movimiento en wallet
            const movement = new WalletMovements({
                type: 'commission_approved', // 🔧 FIX: Usar type válido del enum
                amount: commissionAmount,
                points: commissionPoints,
                balanceAfter: wallet.balance,
                pointsAfter: wallet.points,
                description: `💰 Comisión ${status === 'approved' ? 'aprobada' : 'entregada'} - Orden ${order.orderNumber}`,
                wallet: wallet._id,
                sale: order.transaction,
                status: 'completed',
                metadata: {
                    orderNumber: order.orderNumber,
                    statusChange: `${previousStatus} -> ${status}`,
                    deposited: commissionAmount
                }
            });
            await movement.save();

            balanceUpdated = true;
            walletInfo = {
                availableBalance: wallet.balance,
                pendingBalance: wallet.pendingBalance,
                points: wallet.points,
                totalEarned: wallet.totalCommissionsEarned
            };

            console.log('✅ Balance actualizado');
            console.log('   Disponible:', wallet.balance);
            console.log('   Pendiente:', wallet.pendingBalance);
        }

        // Actualizar transacción relacionada
        const transaction = await Transaction.findById(order.transaction);
        if (transaction) {
            if (status === 'in_transit') {
                transaction.orderStatus = 'shipped';
                transaction.tracking.shippedAt = new Date();
            } else if (status === 'delivered') {
                transaction.orderStatus = 'delivered';
                transaction.tracking.deliveredAt = new Date();
            } else if (status === 'approved') {
                transaction.orderStatus = 'processing';
            }
            await transaction.save();
        }

        // Respuesta
        const responseData = {
            success: true,
            msg: `Orden actualizada a: ${getStatusLabel(status)}`,
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                statusLabel: getStatusLabel(order.status),
                commission: order.commission,
                tracking: order.tracking
            }
        };

        if (balanceUpdated && walletInfo) {
            responseData.wallet = walletInfo;
            responseData.balanceUpdated = true;
            responseData.msg += ` - ¡Comisión de $${order.commission.amount.toLocaleString()} depositada!`;
        }

        res.json(responseData);

    } catch (error) {
        console.error('Error al actualizar orden:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al actualizar el estado',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER DETALLE DE UNA ORDEN
 * GET /api/shipping-orders-v2/:id
 */
const getOrderDetail = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const uid = req.authenticatedUser._id; // 🔧 FIX: Usar _id

        const order = await ShippingOrder.findOne({
            _id: id,
            buyer: uid,
            estado: true
        })
            .populate('seller', 'firstName lastName phone email')
            .populate('shippingAddress')
            .populate('items.product', 'name images brand model description');

        if (!order) {
            return res.status(404).json({
                success: false,
                msg: 'Pedido no encontrado'
            });
        }

        res.json({
            success: true,
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                statusLabel: getStatusLabel(order.status),
                seller: order.seller,
                customer: order.customer,
                shippingAddress: order.shippingAddress,
                items: order.items,
                commission: order.commission,
                tracking: order.tracking,
                payment: order.payment,
                notes: order.notes,
                carrier: order.carrier,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            }
        });

    } catch (error) {
        console.error('Error al obtener orden:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener la orden'
        });
    }
};

/**
 * 🆕 OBTENER BALANCE DEL WALLET
 * GET /api/shipping-orders-v2/wallet-balance
 */
const getWalletBalance = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id; // 🔧 FIX: Usar _id

        let wallet = await Wallet.findOne({ user: uid, estado: true });

        if (!wallet) {
            wallet = new Wallet({
                user: uid,
                balance: 0,
                pendingBalance: 0,
                points: 0,
                totalCommissionsEarned: 0,
                totalPointsEarned: 0,
                estado: true
            });
            await wallet.save();
        }

        // Contar órdenes pendientes
        const pendingOrders = await ShippingOrder.countDocuments({
            buyer: uid,
            status: { $nin: ['delivered', 'cancelled'] },
            'commission.status': 'pending',
            estado: true
        });

        res.json({
            success: true,
            wallet: {
                availableBalance: wallet.balance || 0,
                pendingBalance: wallet.pendingBalance || 0,
                totalBalance: (wallet.balance || 0) + (wallet.pendingBalance || 0),
                points: wallet.points || 0,
                totalEarned: wallet.totalCommissionsEarned || 0,
                totalPointsEarned: wallet.totalPointsEarned || 0
            },
            pendingOrders,
            updatedAt: new Date()
        });

    } catch (error) {
        console.error('Error al obtener balance:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener el balance del wallet'
        });
    }
};

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendiente',
        'approved': 'Aprobado',
        'preparing': 'Preparando',
        'ready': 'Listo para enviar',
        'in_transit': 'En camino',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    };
    return labels[status] || status;
}

/**
 * 🆕 OBTENER ÓRDENES PENDIENTES (NO APROBADAS)
 * GET /api/shipping-orders-v2/pending-orders
 */
const getPendingOrders = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { limit = 20, skip = 0 } = req.query;

        console.log('⏳ GET /pending-orders');
        console.log('Usuario:', uid);

        // Filtrar solo órdenes pendientes (no aprobadas)
        const filters = {
            buyer: uid,
            estado: true,
            status: 'pending'  // Solo órdenes pendientes
        };

        const orders = await ShippingOrder.find(filters)
            .populate('seller', 'firstName lastName phone email')
            .populate('shippingAddress')
            .populate('items.product', 'name images brand')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await ShippingOrder.countDocuments(filters);

        res.json({
            success: true,
            total,
            orders: orders.map(order => ({
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                statusLabel: getStatusLabel(order.status),
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    image: item.product?.images?.[0]
                })),
                totalAmount: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
                shippingAddress: order.shippingAddress,
                commission: order.commission,
                tracking: order.tracking,
                createdAt: order.createdAt
            })),
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('Error al obtener órdenes pendientes:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener órdenes pendientes'
        });
    }
};

/**
 * 🔐 ADMIN: OBTENER TODAS LAS ÓRDENES (TODOS LOS USUARIOS)
 * GET /api/shipping-orders-v2/admin/all-orders
 */
const adminGetAllOrders = async (req = request, res = response) => {
    try {
        const { limit = 20, skip = 0, status, seller } = req.query;

        console.log('👨‍💼 ADMIN: Obteniendo todas las órdenes');

        // Construir filtros
        const filters = { estado: true };
        if (status) {
            filters.status = status;
        }
        if (seller) {
            filters.seller = seller;
        }

        const [total, orders] = await Promise.all([
            ShippingOrder.countDocuments(filters),
            ShippingOrder.find(filters)
                .populate('seller', 'firstName lastName email phone')
                .populate('buyer', 'firstName lastName email phone')
                .populate('transaction', 'transactionNumber totalAmount')
                .populate('shippingAddress')
                .populate('items.product', 'name images')
                .sort({ createdAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit))
        ]);

        console.log(`✅ ADMIN: ${orders.length} órdenes encontradas de ${total} totales`);

        res.json({
            success: true,
            total,
            orders,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('❌ Error admin al obtener órdenes:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener órdenes',
            error: error.message
        });
    }
};

/**
 * 🔐 ADMIN: ACTUALIZAR ESTADO DE CUALQUIER ORDEN
 * PUT /api/shipping-orders-v2/admin/:id/status
 */
const adminUpdateOrderStatus = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const adminUser = req.authenticatedUser;

        console.log('👨‍💼 ADMIN: Actualizando estado de orden:', id);
        console.log('Nuevo estado:', status);
        console.log('Admin:', adminUser.firstName);

        // Buscar orden (sin filtrar por usuario)
        const order = await ShippingOrder.findOne({
            _id: id,
            estado: true
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                msg: 'Orden de envío no encontrada'
            });
        }

        const previousStatus = order.status;
        console.log('Estado anterior:', previousStatus);

        // Actualizar estado
        order.status = status;

        // Actualizar tracking según el estado
        const now = new Date();
        switch (status) {
            case 'approved':
                if (!order.tracking.preparedAt) {
                    order.tracking.preparedAt = now;
                }
                break;
            case 'preparing':
                if (!order.tracking.preparedAt) {
                    order.tracking.preparedAt = now;
                }
                break;
            case 'in_transit':
                order.tracking.shippedAt = now;
                break;
            case 'delivered':
                order.tracking.deliveredAt = now;
                break;
            case 'cancelled':
                order.tracking.cancelledAt = now;
                break;
        }

        // Agregar nota del admin
        if (notes) {
            order.notes = order.notes || {};
            order.notes.adminNotes = (order.notes.adminNotes || '') +
                `\n[${now.toISOString()}] Admin ${adminUser.firstName}: [${status}] ${notes}`;
        }

        await order.save();

        // ========================================
        // MOVER BALANCE DE PENDING A DISPONIBLE (SI APLICA)
        // ========================================

        let balanceUpdated = false;
        let walletInfo = null;

        // Cuando se aprueba o se entrega, mover el balance
        if ((status === 'approved' || status === 'delivered') &&
            order.commission.status === 'pending' &&
            order.commission.amount > 0) {

            console.log('💰 ADMIN: Moviendo balance de pending a disponible...');

            // Buscar wallet del vendedor
            let wallet = await Wallet.findOne({ user: order.seller, estado: true });

            if (wallet) {
                const commissionAmount = order.commission.amount;

                // Solo mover de pending a disponible (NO sumar a total, ya se sumó al crear la transacción)
                wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - commissionAmount);
                wallet.balance = (wallet.balance || 0) + commissionAmount;
                // ❌ NO sumar a totalCommissionsEarned aquí, ya se sumó en la transacción

                await wallet.save();

                // Actualizar comisión de la orden
                order.commission.status = 'deposited';
                order.commission.depositedAt = now;;
                await order.save();

                // Crear movimiento en wallet
                const walletMovement = new WalletMovements({
                    type: 'commission_approved',
                    amount: commissionAmount,
                    points: order.commission.points || 0,
                    balanceAfter: wallet.balance,
                    pointsAfter: wallet.points,
                    description: `Comisión aprobada por admin - Orden #${order.orderNumber}`,
                    wallet: wallet._id,
                    sale: order.transaction,
                    status: 'completed',
                    metadata: {
                        orderNumber: order.orderNumber,
                        adminId: adminUser._id,
                        adminName: adminUser.firstName,
                        previousStatus,
                        newStatus: status
                    }
                });
                await walletMovement.save();

                balanceUpdated = true;
                walletInfo = {
                    availableBalance: wallet.balance,
                    pendingBalance: wallet.pendingBalance,
                    totalEarned: wallet.totalCommissionsEarned
                };

                console.log('✅ ADMIN: Balance actualizado');
            }
        }

        // Popular datos
        await order.populate([
            { path: 'seller', select: 'firstName lastName email' },
            { path: 'buyer', select: 'firstName lastName email' },
            { path: 'shippingAddress' }
        ]);

        res.json({
            success: true,
            msg: `Estado actualizado de ${previousStatus} a ${status}${balanceUpdated ? ' - Balance movido a disponible' : ''}`,
            order,
            balanceUpdated,
            wallet: walletInfo
        });

    } catch (error) {
        console.error('❌ Error admin al actualizar estado:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al actualizar estado de la orden',
            error: error.message
        });
    }
};

module.exports = {
    getMyOrders,
    updateOrderStatus,
    getOrderDetail,
    getWalletBalance,
    getPendingOrders,
    adminGetAllOrders,      // 🔐 ADMIN
    adminUpdateOrderStatus  // 🔐 ADMIN
};
