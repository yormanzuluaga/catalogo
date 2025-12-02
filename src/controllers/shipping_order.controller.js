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

        console.log('📦 === DEBUG GET SHIPPING ORDERS ===');
        console.log('   Usuario autenticado (uid):', uid);
        console.log('   Tipo de uid:', typeof uid);

        const filters = { seller: uid, estado: true };
        if (status) filters.status = status;

        console.log('   Filtros aplicados:', JSON.stringify(filters, null, 2));

        // Ver TODAS las órdenes primero (sin filtro de seller)
        const allOrdersInDb = await ShippingOrder.find({ estado: true })
            .select('_id orderNumber seller buyer status')
            .limit(5);

        console.log('   📊 Total órdenes en DB (todas):', allOrdersInDb.length);
        if (allOrdersInDb.length > 0) {
            console.log('   📋 Primeras órdenes en DB:');
            allOrdersInDb.forEach((o, i) => {
                console.log(`      ${i + 1}. Order: ${o.orderNumber}`);
                console.log(`         Seller ID: ${o.seller}`);
                console.log(`         Seller tipo: ${typeof o.seller}`);
                console.log(`         Buyer ID: ${o.buyer}`);
                console.log(`         Status: ${o.status}`);
                console.log(`         ¿Coincide con uid?: ${o.seller.toString() === uid.toString()}`);
            });
        }

        const orders = await ShippingOrder.find(filters)
            .populate('transaction', 'transactionNumber totalAmount')
            .populate('shippingAddress')
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await ShippingOrder.countDocuments(filters);
        const allOrders = await ShippingOrder.countDocuments({ estado: true });

        console.log('   ✅ Órdenes que coinciden con filtro:', total);
        console.log('   ✅ Total órdenes activas en DB:', allOrders);
        console.log('=================================\n');

        res.json({
            total,
            orders,
            hasMore: (Number(skip) + Number(limit)) < total,
            debug: {
                userId: uid,
                userIdType: typeof uid,
                totalInDatabase: allOrders,
                matchingOrders: total,
                filters
            }
        });

    } catch (error) {
        console.error('Error al obtener órdenes de envío:', error);
        res.status(500).json({
            msg: 'Error al obtener órdenes de envío',
            error: error.message
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

        console.log('📝 Actualizando orden:', id, 'a estado:', status);

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

        console.log('📦 Estado actual de la orden:', order.status);
        console.log('🎯 Nuevo estado solicitado:', status);

        // Actualizar estado
        await order.updateStatus(status, notes);

        console.log('✅ Estado actualizado exitosamente a:', order.status);

        // Actualizar información de transportadora si se proporciona
        if (carrier) {
            order.carrier = {
                ...order.carrier,
                ...carrier
            };
            await order.save();
        }

        // 🆕 OBTENER WALLET ACTUALIZADO SIEMPRE (ANTES Y DESPUÉS DE DEPOSITAR)
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

        // 🆕 SI EL ESTADO ES "DELIVERED", DEPOSITAR COMISIÓN AUTOMÁTICAMENTE
        let depositResult = null;
        if (status === 'delivered' && order.commission.status === 'pending') {
            try {
                console.log('💰 Depositando comisión automáticamente al marcar como entregado...');

                const commissionAmount = order.commission.amount;
                const commissionPoints = order.commission.points;

                const previousBalance = wallet.balance;
                const previousPending = wallet.pendingBalance;

                // Mover de pendiente a disponible
                wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - commissionAmount);
                wallet.balance = (wallet.balance || 0) + commissionAmount;
                wallet.totalCommissionsEarned = (wallet.totalCommissionsEarned || 0) + commissionAmount;
                wallet.points = (wallet.points || 0) + commissionPoints;
                wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + commissionPoints;
                await wallet.save();

                // Marcar comisión como depositada
                order.commission.status = 'deposited';
                order.commission.depositedAt = new Date();
                await order.save();

                // Crear movimiento en wallet
                const movement = new WalletMovements({
                    type: 'commission_deposited',
                    amount: commissionAmount,
                    points: commissionPoints,
                    balanceAfter: wallet.balance,
                    pointsAfter: wallet.points,
                    description: `💰 Comisión por entrega de orden ${order.orderNumber}`,
                    wallet: wallet._id,
                    sale: order.transaction,
                    status: 'completed',
                    metadata: {
                        orderNumber: order.orderNumber,
                        deliveryDate: new Date(),
                        previousBalance,
                        previousPending,
                        deposited: commissionAmount
                    }
                });
                await movement.save();

                depositResult = {
                    deposited: true,
                    amount: commissionAmount,
                    points: commissionPoints,
                    previousBalance,
                    previousPending,
                    newBalance: wallet.balance,
                    newPendingBalance: wallet.pendingBalance
                };

                console.log('✅ Comisión depositada automáticamente:', depositResult);

            } catch (walletError) {
                console.error('⚠️ Error al depositar comisión:', walletError);
                // Recargar wallet en caso de error
                wallet = await Wallet.findOne({ user: uid, estado: true });
            }
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

        // 🆕 RESPUESTA COMPLETA CON BALANCE ACTUALIZADO
        const response = {
            success: true,
            msg: `Orden actualizada a: ${status}`,
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                commission: order.commission,
                items: order.items,
                tracking: order.tracking,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            },
            // 🆕 BALANCE ACTUAL DEL WALLET (SIEMPRE)
            balance: {
                available: wallet.balance,
                pending: wallet.pendingBalance,
                total: wallet.balance + wallet.pendingBalance,
                points: wallet.points,
                totalEarned: wallet.totalCommissionsEarned || 0
            }
        };

        // 🆕 Si se depositó comisión, agregar detalles
        if (depositResult) {
            response.commission = {
                deposited: true,
                amount: depositResult.amount,
                points: depositResult.points,
                message: `¡Comisión de $${depositResult.amount.toLocaleString()} depositada!`,
                previousBalance: depositResult.previousBalance,
                previousPending: depositResult.previousPending,
                newBalance: depositResult.newBalance,
                newPendingBalance: depositResult.newPendingBalance,
                balanceChange: `$${(depositResult.newBalance - depositResult.previousBalance).toLocaleString()}`
            };
        }

        res.json(response);

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
            // 🆕 Aunque ya esté entregada, devolver balance actual
            const wallet = await Wallet.findOne({ user: uid, estado: true });

            return res.status(400).json({
                msg: 'Esta orden ya fue entregada',
                deliveredAt: order.tracking.deliveredAt,
                // 🆕 Balance actual del wallet
                balance: {
                    available: wallet?.balance || 0,
                    pending: wallet?.pendingBalance || 0,
                    total: (wallet?.balance || 0) + (wallet?.pendingBalance || 0),
                    points: wallet?.points || 0
                }
            });
        }

        // Validar que tenga comisión pendiente
        if (order.commission.status === 'deposited') {
            const wallet = await Wallet.findOne({ user: uid, estado: true });

            return res.status(400).json({
                msg: 'La comisión de esta orden ya fue depositada',
                // 🆕 Balance actual del wallet
                balance: {
                    available: wallet?.balance || 0,
                    pending: wallet?.pendingBalance || 0,
                    total: (wallet?.balance || 0) + (wallet?.pendingBalance || 0),
                    points: wallet?.points || 0
                }
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
                totalCommissionsEarned: 0,
                totalPointsEarned: 0,
                estado: true
            });
        }

        // Guardar balance anterior
        const previousBalance = wallet.balance;
        const previousPending = wallet.pendingBalance;

        // Transferir de pendiente a disponible
        wallet.pendingBalance = Math.max(0, (wallet.pendingBalance || 0) - commissionAmount);

        // Depositar en balance disponible
        wallet.balance = (wallet.balance || 0) + commissionAmount;
        wallet.totalCommissionsEarned = (wallet.totalCommissionsEarned || 0) + commissionAmount;
        wallet.points = (wallet.points || 0) + commissionPoints;
        wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + commissionPoints;

        await wallet.save();

        console.log('💰 Wallet actualizado:', {
            previousBalance,
            previousPending,
            newBalance: wallet.balance,
            newPending: wallet.pendingBalance,
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
                previousPending,
                newBalance: wallet.balance,
                newPending: wallet.pendingBalance,
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
        // 6. RETORNAR RESPUESTA COMPLETA
        // ====================================
        res.json({
            success: true,
            msg: '¡Entrega confirmada! Tu comisión ha sido depositada',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                deliveredAt: order.tracking.deliveredAt,
                commission: order.commission
            },
            deposit: {
                amount: commissionAmount,
                points: commissionPoints,
                previousBalance,
                previousPending,
                newBalance: wallet.balance,
                newPending: wallet.pendingBalance,
                depositedAt: new Date(),
                balanceIncrease: wallet.balance - previousBalance,
                pendingDecrease: previousPending - wallet.pendingBalance
            },
            // 🆕 BALANCE ACTUALIZADO DEL WALLET
            balance: {
                available: wallet.balance,
                pending: wallet.pendingBalance,
                total: wallet.balance + wallet.pendingBalance,
                points: wallet.points,
                totalEarned: wallet.totalCommissionsEarned || 0,
                totalPointsEarned: wallet.totalPointsEarned || 0
            },
            message: `Se han depositado $${commissionAmount.toLocaleString()} y ${commissionPoints} puntos en tu wallet. Balance pendiente restante: $${wallet.pendingBalance.toLocaleString()}`
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

/**
 * 🆕 Obtener los pedidos del cliente (comprador)
 * GET /api/shipping-orders/my-orders
 */
const getMyOrders = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { status, limit = 20, skip = 0 } = req.query;

        console.log('📦 GET /my-orders - Buscando órdenes del cliente...');
        console.log('   uid:', uid);
        console.log('   status filter:', status);

        // Buscar órdenes donde el usuario es el comprador
        const filters = { buyer: uid, estado: true };
        if (status) filters.status = status;

        console.log('   Filtros:', filters);

        const orders = await ShippingOrder.find(filters)
            .populate('seller', 'firstName lastName phone email')
            .populate('shippingAddress')
            .populate('items.product', 'name images brand')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await ShippingOrder.countDocuments(filters);

        console.log('   ✅ Órdenes encontradas:', orders.length);
        console.log('   ✅ Total en BD:', total);

        // Formatear respuesta con información de tracking
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            statusLabel: getStatusLabel(order.status),
            statusIcon: getStatusIcon(order.status),
            statusColor: getStatusColor(order.status),
            seller: {
                name: order.seller ? `${order.seller.firstName} ${order.seller.lastName}` : order.customer.name,
                phone: order.seller?.phone,
                email: order.seller?.email
            },
            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                image: item.product?.images?.[0],
                variations: item.variations
            })),
            totalAmount: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
            shippingAddress: order.shippingAddress,
            tracking: {
                current: order.status,
                estimatedDelivery: order.tracking?.estimatedDelivery,
                preparedAt: order.tracking?.preparedAt,
                shippedAt: order.tracking?.shippedAt,
                deliveredAt: order.tracking?.deliveredAt,
                progress: getProgressPercentage(order.status)
            },
            carrier: order.carrier,
            createdAt: order.createdAt,
            canCancel: ['pending', 'preparing'].includes(order.status)
        }));

        res.json({
            total,
            orders: formattedOrders,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('Error al obtener pedidos del cliente:', error);
        res.status(500).json({
            msg: 'Error al obtener tus pedidos'
        });
    }
};

/**
 * 🆕 Obtener detalle de un pedido del cliente
 * GET /api/shipping-orders/my-orders/:id
 */
const getMyOrderDetail = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;

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
                msg: 'Pedido no encontrado'
            });
        }

        // Formatear respuesta detallada
        const detailedOrder = {
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            statusLabel: getStatusLabel(order.status),
            statusIcon: getStatusIcon(order.status),
            statusColor: getStatusColor(order.status),

            // Información del vendedor
            seller: {
                name: order.seller ? `${order.seller.firstName} ${order.seller.lastName}` : order.customer.name,
                phone: order.seller?.phone,
                email: order.seller?.email
            },

            // Productos
            items: order.items.map(item => ({
                product: {
                    _id: item.product?._id,
                    name: item.name,
                    images: item.product?.images || [],
                    brand: item.product?.brand,
                    model: item.product?.model,
                    description: item.product?.description
                },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                variations: item.variations
            })),

            // Totales
            subtotal: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
            totalAmount: order.items.reduce((sum, item) => sum + item.totalPrice, 0),

            // Dirección de envío
            shippingAddress: order.shippingAddress,

            // Tracking detallado
            tracking: {
                current: order.status,
                estimatedDelivery: order.tracking?.estimatedDelivery,
                timeline: getTrackingTimeline(order),
                progress: getProgressPercentage(order.status)
            },

            // Transportadora
            carrier: order.carrier,

            // Notas
            deliveryInstructions: order.notes?.deliveryInstructions,
            customerNotes: order.notes?.customerNotes,

            // Fechas
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,

            // Acciones disponibles
            canCancel: ['pending', 'preparing'].includes(order.status),
            canContact: true
        };

        res.json({ order: detailedOrder });

    } catch (error) {
        console.error('Error al obtener detalle del pedido:', error);
        res.status(500).json({
            msg: 'Error al obtener el detalle de tu pedido'
        });
    }
};

/**
 * 🆕 Tracking del pedido (público con orderNumber)
 * GET /api/shipping-orders/track/:orderNumber
 */
const trackOrder = async (req = request, res = response) => {
    try {
        const { orderNumber } = req.params;

        const order = await ShippingOrder.findOne({
            orderNumber,
            estado: true
        })
            .populate('shippingAddress', 'city state')
            .populate('items.product', 'name images');

        if (!order) {
            return res.status(404).json({
                msg: 'Pedido no encontrado',
                hint: 'Verifica que el número de orden sea correcto'
            });
        }

        // Información pública del tracking (sin datos sensibles)
        const trackingInfo = {
            orderNumber: order.orderNumber,
            status: order.status,
            statusLabel: getStatusLabel(order.status),
            statusIcon: getStatusIcon(order.status),

            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                image: item.product?.images?.[0]
            })),

            destination: {
                city: order.shippingAddress?.city,
                state: order.shippingAddress?.state
            },

            tracking: {
                current: order.status,
                estimatedDelivery: order.tracking?.estimatedDelivery,
                timeline: getTrackingTimeline(order),
                progress: getProgressPercentage(order.status)
            },

            carrier: order.carrier,

            createdAt: order.createdAt
        };

        res.json(trackingInfo);

    } catch (error) {
        console.error('Error al rastrear pedido:', error);
        res.status(500).json({
            msg: 'Error al rastrear el pedido'
        });
    }
};

/**
 * 🆕 Crear orden de envío desde una transacción existente
 * POST /api/shipping-orders/create-from-transaction
 */
const createOrderFromTransaction = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { transactionId, shippingAddressId } = req.body;

        console.log('📦 Creando orden de envío desde transacción:', transactionId);

        // Verificar que la transacción existe
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                msg: 'Transacción no encontrada'
            });
        }

        // Verificar que no exista ya una orden para esta transacción
        const existingOrder = await ShippingOrder.findOne({
            transaction: transactionId,
            estado: true
        });

        if (existingOrder) {
            return res.status(400).json({
                msg: 'Ya existe una orden de envío para esta transacción',
                order: {
                    _id: existingOrder._id,
                    orderNumber: existingOrder.orderNumber,
                    status: existingOrder.status
                }
            });
        }

        // Generar número de orden
        const orderNumber = await ShippingOrder.generateOrderNumber();

        // Calcular comisiones desde la transacción
        let totalCommissions = 0;
        let totalPoints = 0;

        if (transaction.commissions) {
            totalCommissions = transaction.commissions.totalCommission || 0;
            totalPoints = transaction.commissions.totalPoints || 0;
        }

        // Preparar items desde la transacción
        const items = transaction.products.map(item => ({
            product: item.product,
            name: item.name || 'Producto',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            variations: item.variations || {}
        }));

        // Crear la orden
        const shippingOrderData = {
            orderNumber,
            transaction: transaction._id,
            seller: uid,
            buyer: transaction.user || uid,
            customer: {
                name: transaction.customerName || 'Cliente',
                email: transaction.customerEmail || 'cliente@example.com',
                phone: transaction.customerPhone || ''
            },
            shippingAddress: shippingAddressId || transaction.shippingAddress,
            items,
            commission: {
                amount: totalCommissions,
                points: totalPoints,
                status: 'pending'
            },
            status: 'approved',
            tracking: {
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            },
            payment: {
                wompiTransactionId: transaction.payment?.wompiTransactionId || '',
                wompiReference: transaction.payment?.wompiReference || '',
                paymentMethod: transaction.payment?.method || '',
                paymentStatus: transaction.payment?.status || ''
            },
            notes: {
                customerNotes: transaction.notes || '',
                sellerNotes: 'Orden creada manualmente desde transacción'
            },
            estado: true
        };

        const shippingOrder = new ShippingOrder(shippingOrderData);
        await shippingOrder.save();

        console.log('✅ Orden de envío creada:', orderNumber);

        res.status(201).json({
            success: true,
            msg: 'Orden de envío creada exitosamente',
            order: {
                _id: shippingOrder._id,
                orderNumber: shippingOrder.orderNumber,
                status: shippingOrder.status,
                commission: shippingOrder.commission,
                items: shippingOrder.items
            },
            instructions: {
                updateStatus: `PUT /api/shipping-orders/${shippingOrder._id}/status`,
                confirmDelivery: `PUT /api/shipping-orders/${shippingOrder._id}/confirm-delivery`
            }
        });

    } catch (error) {
        console.error('Error al crear orden desde transacción:', error);
        res.status(500).json({
            msg: 'Error al crear orden de envío',
            error: error.message
        });
    }
};

// ==========================================
// FUNCIONES HELPER
// ==========================================

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

function getStatusIcon(status) {
    const icons = {
        'pending': '⏳',
        'approved': '✅',
        'preparing': '📦',
        'ready': '✅',
        'in_transit': '🚚',
        'delivered': '🎉',
        'cancelled': '❌'
    };
    return icons[status] || '📦';
}

function getStatusColor(status) {
    const colors = {
        'pending': 'gray',
        'approved': 'green',
        'preparing': 'blue',
        'ready': 'purple',
        'in_transit': 'orange',
        'delivered': 'green',
        'cancelled': 'red'
    };
    return colors[status] || 'gray';
}

function getProgressPercentage(status) {
    const progress = {
        'pending': 10,
        'approved': 25,
        'preparing': 40,
        'ready': 60,
        'in_transit': 80,
        'delivered': 100,
        'cancelled': 0
    };
    return progress[status] || 0;
}

function getTrackingTimeline(order) {
    const timeline = [];

    // Pedido confirmado
    timeline.push({
        status: 'pending',
        label: 'Pedido confirmado',
        icon: '✅',
        date: order.createdAt,
        completed: true
    });

    // Preparando
    if (order.tracking?.preparedAt || ['preparing', 'ready', 'in_transit', 'delivered'].includes(order.status)) {
        timeline.push({
            status: 'preparing',
            label: 'Preparando pedido',
            icon: '📦',
            date: order.tracking?.preparedAt,
            completed: !!order.tracking?.preparedAt || order.status !== 'pending'
        });
    }

    // En camino
    if (order.tracking?.shippedAt || ['in_transit', 'delivered'].includes(order.status)) {
        timeline.push({
            status: 'in_transit',
            label: 'En camino',
            icon: '🚚',
            date: order.tracking?.shippedAt,
            completed: !!order.tracking?.shippedAt || order.status === 'delivered'
        });
    }

    // Entregado
    if (order.status === 'delivered') {
        timeline.push({
            status: 'delivered',
            label: 'Entregado',
            icon: '🎉',
            date: order.tracking?.deliveredAt,
            completed: true
        });
    } else if (order.status !== 'cancelled') {
        timeline.push({
            status: 'delivered',
            label: 'Por entregar',
            icon: '📍',
            date: order.tracking?.estimatedDelivery,
            completed: false
        });
    }

    // Cancelado
    if (order.status === 'cancelled') {
        timeline.push({
            status: 'cancelled',
            label: 'Cancelado',
            icon: '❌',
            date: order.tracking?.cancelledAt || order.updatedAt,
            completed: true
        });
    }

    return timeline;
}

/**
 * 🆕 Obtener balance pendiente del wallet
 * GET /api/shipping-orders/balance
 */
const getWalletBalance = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;

        // Obtener wallet del usuario
        let wallet = await Wallet.findOne({ user: uid, estado: true });

        if (!wallet) {
            // Crear wallet si no existe
            wallet = new Wallet({
                user: uid,
                balance: 0,
                pendingBalance: 0,
                points: 0,
                totalCommissionsEarned: 0,
                totalEarned: 0,
                totalPointsEarned: 0,
                estado: true
            });
            await wallet.save();
        }

        // Contar órdenes pendientes de entrega
        const pendingOrders = await ShippingOrder.countDocuments({
            seller: uid,
            status: { $ne: 'delivered' },
            'commission.status': 'pending',
            estado: true
        });

        // Calcular comisión total pendiente (de órdenes no entregadas)
        const pendingOrdersData = await ShippingOrder.find({
            seller: uid,
            status: { $ne: 'delivered' },
            'commission.status': 'pending',
            estado: true
        }).select('commission orderNumber status');

        const totalPendingFromOrders = pendingOrdersData.reduce(
            (sum, order) => sum + (order.commission?.amount || 0),
            0
        );

        res.json({
            balance: {
                available: wallet.balance || 0,
                pending: wallet.pendingBalance || 0,
                total: (wallet.balance || 0) + (wallet.pendingBalance || 0),
                points: wallet.points || 0
            },
            earnings: {
                totalEarned: wallet.totalCommissionsEarned || wallet.totalEarned || 0,
                totalPoints: wallet.totalPointsEarned || 0
            },
            orders: {
                pendingDelivery: pendingOrders,
                pendingCommission: totalPendingFromOrders,
                ordersAwaitingDelivery: pendingOrdersData.map(o => ({
                    orderNumber: o.orderNumber,
                    status: o.status,
                    commission: o.commission?.amount || 0
                }))
            },
            message: pendingOrders > 0
                ? `Tienes ${pendingOrders} orden(es) pendiente(s) de entrega con $${totalPendingFromOrders.toLocaleString()} en comisiones`
                : 'No tienes órdenes pendientes de entrega',
            updatedAt: new Date()
        });

    } catch (error) {
        console.error('Error al obtener balance:', error);
        res.status(500).json({
            msg: 'Error al obtener el balance del wallet',
            error: error.message
        });
    }
};

module.exports = {
    getShippingOrders,
    getShippingOrder,
    updateShippingStatus,
    confirmOrderDelivery,
    getShippingOrdersSummary,
    getMyOrders,
    getMyOrderDetail,
    trackOrder,
    createOrderFromTransaction,
    getWalletBalance
};
