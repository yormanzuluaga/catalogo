const { response, request } = require('express');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const Address = require('../models/address.model');
const Product = require('../models/product.model');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');

/**
 * Crear una nueva transacción/orden después del pago con Wompi
 * POST /api/transactions
 */
const createTransaction = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const {
            items,
            shippingAddressId,
            wompiTransactionId,
            wompiReference,
            paymentStatus,
            customerEmail,
            approvalCode,
            authorizationCode,
            paymentMethod,
            cardBrand,
            cardLastFour,
            bankName,
            installments,
            receiptUrl,
            paymentDate,
            customerNotes,
            deliveryInstructions,
            metadata = {}
        } = req.body;

        console.log('🛒 Creando transacción para usuario:', uid);
        console.log('💳 Pago Wompi:', { wompiTransactionId, wompiReference, paymentStatus });

        // ====================================
        // 1. VALIDAR REFERENCIA ÚNICA DE WOMPI
        // ====================================
        const existingTransaction = await Transaction.findOne({ 
            referenceNumber: wompiReference 
        });
        
        if (existingTransaction) {
            return res.status(400).json({
                msg: 'Esta transacción de Wompi ya fue procesada',
                existingTransactionNumber: existingTransaction.transactionNumber,
                hint: 'Genera una nueva referencia única desde Flutter'
            });
        }

        // ====================================
        // 2. VALIDAR DIRECCIÓN
        // ====================================
        const shippingAddress = await Address.findOne({
            _id: shippingAddressId,
            user: uid,
            estado: true
        });

        if (!shippingAddress) {
            return res.status(400).json({
                msg: 'Dirección de envío no válida o no pertenece al usuario'
            });
        }

        // ====================================
        // 3. PROCESAR ITEMS Y CALCULAR TOTALES
        // ====================================
        const processedItems = [];
        let subtotal = 0;
        let totalCommissions = 0;
        let totalPoints = 0;

        for (const item of items) {
            const product = await Product.findOne({
                _id: item.productId,
                estado: true
            }).populate('brand subCategory');

            if (!product) {
                return res.status(400).json({
                    msg: `Producto ${item.productId} no encontrado`
                });
            }

            const unitPrice = item.unitPrice || product.pricing?.salePrice || product.basePrice || 0;
            const totalPrice = unitPrice * item.quantity;
            subtotal += totalPrice;

            // Calcular comisión y puntos por item
            // Intentar obtener el costo del producto (precio de compra)
            const basePrice = product.pricing?.costPrice || product.basePrice || 0;
            
            let commission = 0;
            let margin = 0;
            
            if (basePrice > 0) {
                // Si hay basePrice, calcular margen real
                margin = unitPrice - basePrice;
                commission = margin * 0.10; // 10% de la ganancia
            } else {
                // Si no hay basePrice, usar porcentaje directo sobre el precio de venta
                // Esto asume un margen de ganancia típico del 30% y comisiona el 10% del total
                commission = unitPrice * 0.10; // 10% del precio de venta
                margin = unitPrice * 0.30; // Margen estimado del 30%
            }
            
            const points = Math.floor(totalPrice / 1000); // 1 punto por cada $1000

            totalCommissions += commission * item.quantity;
            totalPoints += points * item.quantity;
            
            console.log(`💰 Item: ${product.name}`, {
                unitPrice,
                basePrice: basePrice || 'no configurado',
                margin,
                commission,
                points,
                quantity: item.quantity
            });

            // Procesar variaciones
            let variations = {};
            if (item.variations) {
                if (item.variations.color) {
                    variations.color = {
                        name: item.variations.color.name || '',
                        code: item.variations.color.code || '',
                        image: item.variations.color.image || ''
                    };
                }
                if (item.variations.size) {
                    variations.size = {
                        name: item.variations.size.name || '',
                        code: item.variations.size.code || ''
                    };
                }
                if (item.variations.material) {
                    variations.material = {
                        name: item.variations.material.name || '',
                        code: item.variations.material.code || ''
                    };
                }
                if (item.variations.measurements) {
                    variations.measurements = item.variations.measurements;
                }
                if (item.variations.customOptions) {
                    variations.customOptions = item.variations.customOptions;
                }
            }

            processedItems.push({
                product: product._id,
                name: product.name,
                productType: item.productType || 'simple',
                quantity: item.quantity,
                unitPrice,
                totalPrice,
                variations,
                productSnapshot: {
                    description: product.description || '',
                    brand: product.brand?.name || '',
                    model: product.model || '',
                    category: product.category?.name || '',
                    subCategory: product.subCategory?.name || '',
                    images: product.images || [],
                    barcode: product.barcode || ''
                },
                basePrice,
                margin,
                commission,
                points,
                estado: true
            });
        }

        // ====================================
        // 4. CALCULAR TOTALES FINALES
        // ====================================
        const shipping = 0; // Puedes calcular envío aquí
        const tax = 0; // Puedes calcular impuestos aquí
        const discount = 0; // Puedes aplicar descuentos aquí
        const totalAmount = subtotal + shipping + tax - discount;

        // ====================================
        // 5. DETERMINAR ESTADO SEGÚN PAGO
        // ====================================
        let orderStatus = 'created';
        let paymentStatusEnum = 'pending';
        
        if (paymentStatus === 'approved') {
            orderStatus = 'paid';
            paymentStatusEnum = 'approved';
        } else if (paymentStatus === 'declined') {
            orderStatus = 'cancelled';
            paymentStatusEnum = 'declined';
        } else if (paymentStatus === 'pending') {
            orderStatus = 'payment_pending';
            paymentStatusEnum = 'pending';
        } else if (paymentStatus === 'error') {
            orderStatus = 'created';
            paymentStatusEnum = 'error';
        }

        // ====================================
        // 6. CREAR INFORMACIÓN DE PAGO
        // ====================================
        const paymentInfo = {
            customerEmail,
            wompiTransactionId,
            wompiReference,
            status: paymentStatusEnum,
            amountInCents: Math.round(totalAmount * 100),
            currency: 'COP'
        };

        if (paymentMethod) {
            paymentInfo.paymentMethod = {
                type: paymentMethod,
                installments: installments || 1
            };
            if (cardBrand) paymentInfo.paymentMethod.cardBrand = cardBrand;
            if (cardLastFour) paymentInfo.paymentMethod.cardLastFour = cardLastFour;
            if (bankName) paymentInfo.paymentMethod.bankName = bankName;
        }

        if (approvalCode) paymentInfo.approvalCode = approvalCode;
        if (authorizationCode) paymentInfo.authorizationCode = authorizationCode;
        if (receiptUrl) paymentInfo.receiptUrl = receiptUrl;
        if (paymentDate) paymentInfo.paymentDate = new Date(paymentDate);

        // ====================================
        // 7. CREAR TRACKING
        // ====================================
        const trackingInfo = {
            createdAt: new Date()
        };
        
        if (paymentStatus === 'approved') {
            trackingInfo.paymentConfirmedAt = new Date();
        } else if (paymentStatus === 'declined') {
            trackingInfo.cancelledAt = new Date();
        }

        // ====================================
        // 8. GENERAR NÚMEROS DE TRANSACCIÓN
        // ====================================
        const transactionNumber = await Transaction.generateTransactionNumber();
        const referenceNumber = wompiReference;

        // ====================================
        // 9. CREAR LA TRANSACCIÓN
        // ====================================
        const transactionData = {
            transactionNumber,
            referenceNumber,
            user: uid,
            shippingAddress: shippingAddressId,
            items: processedItems,
            subtotal,
            shipping,
            tax,
            discount,
            totalAmount,
            payment: paymentInfo,
            orderStatus,
            tracking: trackingInfo,
            commissions: {
                totalCommission: totalCommissions,
                totalPoints: totalPoints,
                commissionStatus: paymentStatus === 'approved' ? 'pending' : 'rejected'
            },
            notes: {
                customerNotes: customerNotes || '',
                deliveryInstructions: deliveryInstructions || ''
            },
            metadata: {
                ...metadata,
                platform: 'flutter_app',
                source: 'wompi_payment',
                wompiIntegration: true,
                createdVia: 'mobile'
            },
            estado: true
        };

        const transaction = new Transaction(transactionData);
        await transaction.save();

        console.log('✅ Transacción creada:', transaction.transactionNumber);

        // ====================================
        // 10. REGISTRAR EN WALLET (SOLO SI PAGO APROBADO)
        // ====================================
        if (paymentStatus === 'approved' && totalCommissions > 0) {
            try {
                console.log('💰 Registrando en wallet...');
                
                // Buscar o crear wallet del usuario
                let wallet = await Wallet.findOne({ user: uid, estado: true });
                
                if (!wallet) {
                    console.log('📝 Creando nueva wallet para usuario');
                    wallet = new Wallet({
                        user: uid,
                        balance: 0,
                        pendingBalance: 0,
                        points: 0,
                        estado: true
                    });
                    await wallet.save();
                }

                // Actualizar saldo pendiente y puntos
                wallet.pendingBalance += totalCommissions;
                wallet.points += totalPoints;
                wallet.totalPointsEarned += totalPoints;
                await wallet.save();

                // Crear movimiento en wallet
                const movement = new WalletMovements({
                    type: 'commission_earned',
                    amount: totalCommissions,
                    points: totalPoints,
                    balanceAfter: wallet.balance,
                    pointsAfter: wallet.points,
                    description: `Comisión por venta #${transactionNumber}`,
                    wallet: wallet._id,
                    sale: transaction._id,
                    status: 'pending',
                    metadata: {
                        transactionNumber: transactionNumber,
                        totalItems: items.length,
                        orderTotal: totalAmount,
                        wompiReference: wompiReference
                    }
                });
                await movement.save();

                console.log('✅ Wallet actualizado:', {
                    pendingBalance: wallet.pendingBalance,
                    points: wallet.points,
                    commission: totalCommissions
                });

            } catch (walletError) {
                console.error('⚠️ Error al registrar en wallet:', walletError);
                // No fallar la transacción si hay error en wallet
            }
        }

        // ====================================
        // 11. POPULATE Y RETORNAR RESPUESTA
        // ====================================
        await transaction.populate([
            { path: 'user', select: 'firstName lastName email phone' },
            { path: 'shippingAddress' },
            { path: 'items.product', select: 'name images brand model' }
        ]);

        res.status(201).json({
            success: true,
            msg: paymentStatus === 'approved' 
                ? '¡Compra exitosa! Tu pedido ha sido confirmado' 
                : 'Transacción registrada',
            transaction: {
                _id: transaction._id,
                transactionNumber: transaction.transactionNumber,
                referenceNumber: transaction.referenceNumber,
                orderStatus: transaction.orderStatus,
                totalAmount: transaction.totalAmount,
                items: transaction.items,
                payment: transaction.payment,
                tracking: transaction.tracking,
                shippingAddress: transaction.shippingAddress,
                createdAt: transaction.createdAt,
                // 🆕 RESUMEN DETALLADO DE COMISIONES
                summary: {
                    subtotal: transaction.subtotal,
                    shipping: transaction.shipping,
                    tax: transaction.tax,
                    discount: transaction.discount,
                    totalAmount: transaction.totalAmount,
                    totalCommissions: totalCommissions,
                    totalPoints: totalPoints,
                    itemsCount: items.length,
                    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
                }
            },
            // 🆕 INFORMACIÓN DE GANANCIAS
            earnings: paymentStatus === 'approved' ? {
                commissionsEarned: totalCommissions,
                pointsEarned: totalPoints,
                status: 'pending_delivery',
                message: 'Las comisiones se depositarán en tu wallet cuando confirmes la entrega',
                willBeDepositedWhen: 'delivery_confirmed',
                howToConfirm: `PUT /api/transactions/${transaction._id}/confirm-delivery`
            } : null,
            // 🆕 DESGLOSE POR PRODUCTO
            itemsBreakdown: processedItems.map(item => ({
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                yourCommission: item.commission * item.quantity,
                yourPoints: item.points * item.quantity,
                margin: item.margin * item.quantity
            }))
        });

    } catch (error) {
        console.error('❌ Error al crear transacción:', error);
        
        // Error de clave duplicada
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            return res.status(400).json({
                msg: 'Transacción duplicada',
                error: `La ${field === 'referenceNumber' ? 'referencia de Wompi' : field} ya existe`,
                hint: 'Genera una nueva referencia única desde Flutter'
            });
        }
        
        // Error de validación
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                msg: 'Error de validación',
                errors: messages
            });
        }
        
        res.status(500).json({
            msg: 'Error al crear la transacción',
            error: error.message
        });
    }
};

// Obtener transacciones del usuario
const getUserTransactions = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { limit = 10, skip = 0, status } = req.query;

        const filters = { user: uid, estado: true };
        if (status) filters.orderStatus = status;

        const transactions = await Transaction.find(filters)
            .populate('user', 'firstName lastName email')
            .populate('shippingAddress')
            .populate('items.product', 'name images')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await Transaction.countDocuments(filters);

        res.json({
            total,
            transactions,
            hasMore: (Number(skip) + Number(limit)) < total
        });
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        res.status(500).json({ msg: 'Error al obtener transacciones' });
    }
};

// Obtener una transacción específica
const getTransaction = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;

        const transaction = await Transaction.findOne({ 
            _id: id, 
            user: uid, 
            estado: true 
        })
        .populate('user', 'firstName lastName email phone')
        .populate('shippingAddress')
        .populate('items.product', 'name images brand model');

        if (!transaction) {
            return res.status(404).json({ msg: 'Transacción no encontrada' });
        }

        res.json({ transaction });
    } catch (error) {
        console.error('Error al obtener transacción:', error);
        res.status(500).json({ msg: 'Error al obtener la transacción' });
    }
};

/**
 * 🆕 Confirmar entrega del pedido y depositar comisiones en la wallet
 * PUT /api/transactions/:id/confirm-delivery
 */
const confirmDelivery = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;
        const { deliveryNotes, deliveryPhotos } = req.body;

        console.log('📦 Confirmando entrega de transacción:', id);

        // Buscar la transacción
        const transaction = await Transaction.findOne({
            _id: id,
            user: uid,
            estado: true
        });

        if (!transaction) {
            return res.status(404).json({ 
                msg: 'Transacción no encontrada' 
            });
        }

        // Validar que el pago esté aprobado
        if (transaction.payment.status !== 'approved') {
            return res.status(400).json({
                msg: 'No se puede confirmar la entrega',
                reason: 'El pago no ha sido aprobado',
                paymentStatus: transaction.payment.status
            });
        }

        // Validar que no haya sido entregada ya
        if (transaction.orderStatus === 'delivered') {
            return res.status(400).json({
                msg: 'Esta orden ya fue entregada',
                deliveredAt: transaction.tracking.deliveredAt
            });
        }

        // Validar que tenga comisiones pendientes
        const totalCommissions = transaction.commissions?.totalCommission || 0;
        const totalPoints = transaction.commissions?.totalPoints || 0;

        if (totalCommissions === 0) {
            return res.status(400).json({
                msg: 'No hay comisiones para depositar en esta transacción'
            });
        }

        // ====================================
        // ACTUALIZAR ESTADO DE LA TRANSACCIÓN
        // ====================================
        transaction.orderStatus = 'delivered';
        transaction.tracking.deliveredAt = new Date();
        transaction.commissions.commissionStatus = 'approved';
        
        if (deliveryNotes) {
            transaction.notes.deliveryNotes = deliveryNotes;
        }
        if (deliveryPhotos) {
            transaction.tracking.deliveryPhotos = deliveryPhotos;
        }

        await transaction.save();

        console.log('✅ Transacción actualizada a "delivered"');

        // ====================================
        // DEPOSITAR EN WALLET
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

        // Calcular saldos antes del depósito
        const previousBalance = wallet.balance;
        const previousPendingBalance = wallet.pendingBalance;
        const previousPoints = wallet.points;

        // Transferir de pendiente a disponible
        if (wallet.pendingBalance >= totalCommissions) {
            wallet.pendingBalance -= totalCommissions;
        } else {
            // Si no hay suficiente en pendiente, agregar directamente
            console.log('⚠️ No hay suficiente saldo pendiente, agregando directamente');
        }

        // Depositar comisión en balance disponible
        wallet.balance += totalCommissions;
        wallet.totalEarned = (wallet.totalEarned || 0) + totalCommissions;
        
        // Actualizar puntos (ya se sumaron al crear la transacción)
        // pero los confirmamos
        wallet.points = Math.max(wallet.points, totalPoints);
        wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + totalPoints;

        await wallet.save();

        console.log('💰 Wallet actualizado:', {
            previousBalance,
            newBalance: wallet.balance,
            deposited: totalCommissions,
            points: wallet.points
        });

        // ====================================
        // REGISTRAR MOVIMIENTO EN WALLET
        // ====================================
        const movement = new WalletMovements({
            type: 'delivery_confirmed',
            amount: totalCommissions,
            points: totalPoints,
            balanceAfter: wallet.balance,
            pointsAfter: wallet.points,
            description: `💰 Depósito por entrega confirmada - Orden #${transaction.transactionNumber}`,
            wallet: wallet._id,
            sale: transaction._id,
            status: 'completed',
            metadata: {
                transactionNumber: transaction.transactionNumber,
                deliveredAt: transaction.tracking.deliveredAt,
                previousBalance,
                newBalance: wallet.balance,
                deposited: totalCommissions
            }
        });
        await movement.save();

        console.log('✅ Movimiento registrado en wallet_movements');

        // ====================================
        // ACTUALIZAR EL MOVIMIENTO ANTERIOR A COMPLETADO
        // ====================================
        await WalletMovements.updateOne(
            { 
                sale: transaction._id,
                type: 'commission_earned',
                status: 'pending'
            },
            { 
                $set: { 
                    status: 'completed',
                    'metadata.completedAt': new Date(),
                    'metadata.deliveredAt': transaction.tracking.deliveredAt
                } 
            }
        );

        // ====================================
        // RETORNAR RESPUESTA
        // ====================================
        res.json({
            success: true,
            msg: '¡Entrega confirmada! El dinero ha sido depositado en tu wallet',
            transaction: {
                _id: transaction._id,
                transactionNumber: transaction.transactionNumber,
                orderStatus: transaction.orderStatus,
                deliveredAt: transaction.tracking.deliveredAt
            },
            deposit: {
                amount: totalCommissions,
                points: totalPoints,
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
            message: `Se han depositado $${totalCommissions.toLocaleString()} y ${totalPoints} puntos en tu wallet`
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
 * 🆕 Obtener resumen de ganancias del usuario
 * GET /api/transactions/earnings/summary
 */
const getEarningsSummary = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;

        // Obtener wallet
        const wallet = await Wallet.findOne({ user: uid, estado: true });

        // Obtener transacciones con comisiones
        const transactions = await Transaction.find({
            user: uid,
            estado: true,
            'payment.status': 'approved'
        }).select('transactionNumber orderStatus commissions createdAt tracking');

        // Calcular estadísticas
        const pending = transactions.filter(t => 
            t.orderStatus !== 'delivered' && 
            t.commissions?.commissionStatus !== 'approved'
        );

        const delivered = transactions.filter(t => 
            t.orderStatus === 'delivered'
        );

        const totalPendingCommissions = pending.reduce((sum, t) => 
            sum + (t.commissions?.totalCommission || 0), 0
        );

        const totalDeliveredCommissions = delivered.reduce((sum, t) => 
            sum + (t.commissions?.totalCommission || 0), 0
        );

        res.json({
            wallet: {
                availableBalance: wallet?.balance || 0,
                pendingBalance: wallet?.pendingBalance || 0,
                totalPoints: wallet?.points || 0,
                totalEarned: wallet?.totalEarned || 0
            },
            transactions: {
                total: transactions.length,
                pending: pending.length,
                delivered: delivered.length
            },
            commissions: {
                pendingDelivery: totalPendingCommissions,
                delivered: totalDeliveredCommissions,
                total: totalPendingCommissions + totalDeliveredCommissions
            },
            pendingOrders: pending.map(t => ({
                transactionNumber: t.transactionNumber,
                orderStatus: t.orderStatus,
                commission: t.commissions?.totalCommission || 0,
                points: t.commissions?.totalPoints || 0,
                createdAt: t.createdAt
            }))
        });

    } catch (error) {
        console.error('Error al obtener resumen de ganancias:', error);
        res.status(500).json({ 
            msg: 'Error al obtener resumen de ganancias',
            error: error.message 
        });
    }
};

module.exports = {
    createTransaction,
    getUserTransactions,
    getTransaction,
    confirmDelivery,
    getEarningsSummary
};
