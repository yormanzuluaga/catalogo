const { response, request } = require('express');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const Address = require('../models/address.model');
const Product = require('../models/product.model');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');
const ShippingOrder = require('../models/shipping_order.model');

/**
 * 🆕 CREAR TRANSACCIÓN COMPLETA
 * POST /api/transactions/create
 * 
 * Body:
 * - shippingAddressId: ID de la dirección de envío
 * - wompiTransactionId: ID de transacción de Wompi
 * - wompiReference: Referencia de Wompi
 * - paymentStatus: Estado del pago (approved, pending, declined)
 * - customerEmail: Email del cliente
 * - approvalCode: Código de aprobación del pago
 * - items: Array de productos [{productId, quantity, unitPrice}]
 */
const createTransactionComplete = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id; // 🔧 FIX: Usar _id en lugar de uid
        const {
            shippingAddressId,
            wompiTransactionId,
            wompiReference,
            paymentStatus,
            customerEmail,
            approvalCode,
            items = []
        } = req.body;

        console.log('🛒 === CREAR TRANSACCIÓN COMPLETA ===');
        console.log('Usuario:', uid);
        console.log('Items:', items.length);
        console.log('Payment Status:', paymentStatus);

        // ========================================
        // 1. VALIDACIONES INICIALES
        // ========================================

        // Obtener usuario desde req.authenticatedUser (ya está validado por el middleware)
        const user = req.authenticatedUser;

        // Validar dirección de envío
        const shippingAddress = await Address.findOne({
            _id: shippingAddressId,
            user: uid,
            estado: true
        });

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                msg: 'Dirección de envío no válida o no pertenece al usuario'
            });
        }

        // Validar items
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                msg: 'Debe agregar al menos un producto'
            });
        }

        // Validar que wompiReference no exista (evitar duplicados)
        if (wompiReference) {
            console.log('🔍 Verificando wompiReference:', wompiReference);
            const existingTransaction = await Transaction.findOne({
                referenceNumber: wompiReference
            });

            if (existingTransaction) {
                console.log('⚠️ Transacción duplicada detectada:', existingTransaction.transactionNumber);
                return res.status(400).json({
                    success: false,
                    msg: 'Esta transacción de Wompi ya fue procesada anteriormente',
                    existingTransactionNumber: existingTransaction.transactionNumber,
                    wompiReference: wompiReference
                });
            }
            console.log('✅ wompiReference es único, continuando...');
        }

        // ========================================
        // 2. PROCESAR ITEMS Y CALCULAR TOTALES
        // ========================================

        const processedItems = [];
        let subtotal = 0;
        let totalCommissions = 0;
        let totalPoints = 0;

        for (const item of items) {
            console.log(`🔍 Procesando item: ${item.productId}, Tipo: ${item.productType}`);

            // Verificar que el producto existe
            const product = await Product.findOne({
                _id: item.productId,
                estado: true
            });

            if (!product) {
                console.log(`❌ Producto no encontrado: ${item.productId}`);
                return res.status(400).json({
                    success: false,
                    msg: `Producto con ID ${item.productId} no encontrado`
                });
            }
            console.log(`✅ Producto encontrado: ${product.name}`);

            // Obtener precio
            const unitPrice = item.unitPrice || product.pricing?.salePrice || product.basePrice || 0;

            if (unitPrice <= 0) {
                return res.status(400).json({
                    success: false,
                    msg: `Precio no válido para el producto ${product.name}`
                });
            }

            const totalPrice = unitPrice * item.quantity;
            subtotal += totalPrice;

            // Usar comisión enviada o calcular 10% del precio de venta
            const commissionPerUnit = item.commission || (unitPrice * 0.10);
            const totalCommission = commissionPerUnit * item.quantity;
            const points = Math.floor(totalPrice / 1000); // 1 punto por cada $1000

            totalCommissions += totalCommission;
            totalPoints += points;

            processedItems.push({
                product: product._id,
                productType: item.productType || 'simple', // 🆕 Tipo de producto
                name: product.name,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
                commission: totalCommission, // Comisión total del item
                points,
                variations: item.variations || {},
                estado: true
            });
        }

        console.log('💰 Totales calculados:');
        console.log('   Subtotal:', subtotal);
        console.log('   Comisiones:', totalCommissions);
        console.log('   Puntos:', totalPoints);

        // ========================================
        // 3. CREAR TRANSACCIÓN
        // ========================================

        const transactionNumber = await Transaction.generateTransactionNumber();
        const referenceNumber = wompiReference || await Transaction.generateReferenceNumber();

        const orderStatus = paymentStatus === 'approved' ? 'paid' :
            paymentStatus === 'pending' ? 'payment_pending' : 'created';

        const transactionData = {
            transactionNumber,
            referenceNumber,
            user: uid,
            shippingAddress: shippingAddressId,
            items: processedItems,
            subtotal,
            shipping: 0,
            tax: 0,
            discount: 0,
            totalAmount: subtotal,
            payment: {
                wompiTransactionId,
                wompiReference,
                status: paymentStatus || 'pending',
                amountInCents: Math.round(subtotal * 100),
                currency: 'COP',
                customerEmail,
                approvalCode
            },
            orderStatus,
            tracking: {
                createdAt: new Date(),
                paymentConfirmedAt: paymentStatus === 'approved' ? new Date() : null
            },
            commissions: {
                totalCommission: totalCommissions,
                totalPoints: totalPoints,
                commissionStatus: paymentStatus === 'approved' ? 'pending' : 'rejected'
            },
            estado: true
        };

        const transaction = new Transaction(transactionData);
        await transaction.save();

        console.log('✅ Transacción creada:', transactionNumber);

        // ========================================
        // 4. CREAR/ACTUALIZAR WALLET
        // ========================================

        let wallet = null;
        let walletMovement = null;

        if (paymentStatus === 'approved' && totalCommissions > 0) {
            // Buscar o crear wallet
            wallet = await Wallet.findOne({ user: uid, estado: true });

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

            // Agregar a balance pendiente
            wallet.pendingBalance = (wallet.pendingBalance || 0) + totalCommissions;
            wallet.points = (wallet.points || 0) + totalPoints;
            wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + totalPoints;
            await wallet.save();

            console.log('✅ Wallet actualizado - Pending Balance:', wallet.pendingBalance);

            // Crear movimiento
            walletMovement = new WalletMovements({
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
                    transactionNumber,
                    totalItems: items.length,
                    orderTotal: subtotal
                }
            });
            await walletMovement.save();

            console.log('✅ Movimiento de wallet creado');
        }

        // ========================================
        // 5. CREAR SHIPPING ORDER
        // ========================================

        let shippingOrder = null;

        if (paymentStatus === 'approved') {
            const orderNumber = await ShippingOrder.generateOrderNumber();

            const shippingOrderData = {
                orderNumber,
                transaction: transaction._id,
                seller: uid,
                buyer: uid,
                customer: {
                    name: `${user.firstName} ${user.lastName}`,
                    email: customerEmail || user.email,
                    phone: user.phone || ''
                },
                shippingAddress: shippingAddressId,
                items: processedItems.map(item => ({
                    product: item.product,
                    productType: item.productType, // 🆕 Tipo de producto
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    variations: item.variations
                })),
                commission: {
                    amount: totalCommissions,
                    points: totalPoints,
                    status: 'pending'
                },
                status: 'pending',
                tracking: {
                    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
                },
                payment: {
                    wompiTransactionId: wompiTransactionId || '',
                    wompiReference: wompiReference || '',
                    paymentMethod: 'wompi',
                    paymentStatus: paymentStatus || 'pending'
                },
                estado: true
            };

            shippingOrder = new ShippingOrder(shippingOrderData);
            await shippingOrder.save();

            console.log('✅ Shipping Order creada:', orderNumber);
        }

        // ========================================
        // 6. RESPUESTA COMPLETA
        // ========================================

        await transaction.populate([
            { path: 'user', select: 'firstName lastName email phone' },
            { path: 'shippingAddress' },
            { path: 'items.product', select: 'name images' }
        ]);

        const responseData = {
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
                shippingAddress: transaction.shippingAddress,
                createdAt: transaction.createdAt
            }
        };

        // Agregar información de wallet si existe
        if (wallet) {
            responseData.wallet = {
                availableBalance: wallet.balance,
                pendingBalance: wallet.pendingBalance,
                points: wallet.points,
                totalEarned: wallet.totalCommissionsEarned
            };
        }

        // Agregar información de shipping order si existe
        if (shippingOrder) {
            responseData.shippingOrder = {
                _id: shippingOrder._id,
                orderNumber: shippingOrder.orderNumber,
                status: shippingOrder.status,
                commission: shippingOrder.commission,
                estimatedDelivery: shippingOrder.tracking.estimatedDelivery
            };
        }

        console.log('✅ Transacción completada exitosamente');

        res.status(201).json(responseData);

    } catch (error) {
        console.error('❌ Error al crear transacción:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al crear la transacción',
            error: error.message
        });
    }
};

module.exports = {
    createTransactionComplete
};
