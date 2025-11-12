const { response, request } = require('express');
const Transaction = require('../models/transaction.model');
const User = require('../models/user.model');
const Address = require('../models/address.model');
const Product = require('../models/product.model');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');
const WalletService = require('../services/wallet.service');
const ShippingOrder = require('../models/shipping_order.model'); // 🆕

// Obtener todas las transacciones del usuario autenticado
const getUserTransactions = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { limit = 10, skip = 0, status } = req.query;

        // Construir filtros
        const filters = { user: uid, estado: true };
        if (status) {
            filters.orderStatus = status;
        }

        // Obtener transacciones con populate de datos relacionados
        const transactions = await Transaction.find(filters)
            .populate('user', 'firstName lastName email phone')
            .populate('shippingAddress')
            .populate('items.product', 'name images brand model')
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
        res.status(500).json({
            msg: 'Error interno del servidor al obtener transacciones'
        });
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
        .populate('items.product', 'name images brand model description')
        .populate('commissions.processedBy', 'firstName lastName');

        if (!transaction) {
            return res.status(404).json({
                msg: 'Transacción no encontrada'
            });
        }

        res.json({
            transaction
        });

    } catch (error) {
        console.error('Error al obtener transacción:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al obtener la transacción'
        });
    }
};

// Crear una nueva transacción con información de pago de Wompi
const createTransaction = async (req = request, res = response) => {
    try {
        if (!req.authenticatedUser) {
            return res.status(400).json({
                msg: 'Usuario no autenticado'
            });
        }
        
        const uid = req.authenticatedUser._id;
        const {
            items,
            shippingAddressId,
            customerNotes,
            deliveryInstructions,
            // Información de Wompi
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
            metadata = {}
        } = req.body;

        console.log('DEBUG - Wompi Payment Info:', { 
            wompiTransactionId, 
            wompiReference,
            paymentStatus,
            customerEmail
        });

        // Validar email coincide con el usuario (opcional, según tu lógica)
        const user = await User.findById(uid);
        if (!user) {
            return res.status(400).json({
                msg: 'Usuario no encontrado'
            });
        }

        // Validar que la dirección existe y pertenece al usuario
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

        // Validar y procesar items
        const processedItems = [];
        let subtotal = 0;
        let totalCommissions = 0;
        let totalPoints = 0;

        for (const item of items) {
            // Verificar que el producto existe
            const product = await Product.findOne({
                _id: item.productId,
                estado: true
            }).populate('brand subCategory');

            if (!product) {
                return res.status(400).json({
                    msg: `Producto con ID ${item.productId} no encontrado`
                });
            }

            // Calcular precio total del item
            const unitPrice = item.unitPrice || product.pricing?.salePrice || product.basePrice || 0;
            
            if (unitPrice <= 0) {
                return res.status(400).json({
                    msg: `Precio no válido para el producto ${product.name}`
                });
            }
            
            const totalPrice = unitPrice * item.quantity;
            subtotal += totalPrice;

            // 🆕 Calcular comisión y puntos por item
            const costPrice = product.pricing?.costPrice || 0;
            let commission = 0;
            let margin = 0;
            
            // ⭐ USAR LA COMISIÓN ENVIADA EN EL REQUEST SI EXISTE
            if (item.commission !== undefined && item.commission !== null) {
                // Usar la comisión específica enviada desde el frontend
                commission = item.commission;
                margin = commission / 0.10; // Calcular margen inverso (asumiendo 10%)
                console.log(`✅ Usando comisión del request: ${commission}`);
            } else if (costPrice > 0) {
                // Si hay costPrice, calcular margen real
                margin = unitPrice - costPrice;
                commission = margin * 0.10; // 10% de la ganancia
                console.log(`📊 Calculando comisión desde costPrice: ${commission}`);
            } else {
                // Si no hay costPrice, usar porcentaje directo sobre el precio de venta
                commission = unitPrice * 0.10; // 10% del precio de venta
                margin = unitPrice * 0.30; // Margen estimado del 30%
                console.log(`🔢 Calculando comisión desde precio de venta: ${commission}`);
            }
            
            const points = Math.floor(totalPrice / 1000); // 1 punto por cada $1000

            totalCommissions += commission * item.quantity;
            totalPoints += points;
            
            console.log(`💰 Item: ${product.name}`, {
                unitPrice,
                costPrice: costPrice || 'no configurado',
                margin,
                commission: commission + ' (por unidad)',
                commissionSent: item.commission !== undefined ? 'SI ✅' : 'NO',
                points,
                quantity: item.quantity,
                totalCommission: commission * item.quantity
            });

            // Crear snapshot del producto
            const productSnapshot = {
                description: product.description || '',
                brand: product.brand?.name || '',
                model: product.model || '',
                category: product.category?.name || '',
                subCategory: product.subCategory?.name || '',
                images: product.images || [],
                barcode: product.barcode || ''
            };

            // Procesar variaciones del producto (color, talla, medida)
            let variations = {};
            if (item.variations) {
                // Color
                if (item.variations.color) {
                    variations.color = {
                        name: item.variations.color.name || '',
                        code: item.variations.color.code || '',
                        image: item.variations.color.image || ''
                    };
                }
                
                // Talla/Size
                if (item.variations.size) {
                    variations.size = {
                        name: item.variations.size.name || '',
                        code: item.variations.size.code || ''
                    };
                }
                
                // Medidas
                if (item.variations.measurements) {
                    variations.measurements = {
                        length: item.variations.measurements.length || 0,
                        width: item.variations.measurements.width || 0,
                        height: item.variations.measurements.height || 0,
                        weight: item.variations.measurements.weight || 0,
                        unit: item.variations.measurements.unit || 'cm'
                    };
                }
                
                // Material
                if (item.variations.material) {
                    variations.material = {
                        name: item.variations.material.name || '',
                        code: item.variations.material.code || ''
                    };
                }
                
                // Opciones personalizadas
                if (item.variations.customOptions) {
                    variations.customOptions = item.variations.customOptions;
                }
            }

            processedItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
                variations,
                productSnapshot,
                basePrice: costPrice, // 🆕 Ahora usa costPrice correcto
                margin, // 🆕 Margen calculado
                commission, // 🆕 Comisión calculada
                points, // 🆕 Puntos calculados
                productType: item.productType || (Object.keys(variations).length > 0 ? 'variable' : 'simple'),
                estado: true
            });
        }

        console.log('💰 Resumen de comisiones:', {
            subtotal,
            totalCommissions,
            totalPoints,
            itemsCount: processedItems.length
        });

        // Generar números de transacción y referencia automáticamente
        const transactionNumber = await Transaction.generateTransactionNumber();
        const referenceNumber = wompiReference || await Transaction.generateReferenceNumber();

        // Validar que la referencia de Wompi no exista (evitar duplicados)
        if (wompiReference) {
            const existingTransaction = await Transaction.findOne({ 
                referenceNumber: wompiReference 
            });
            
            if (existingTransaction) {
                return res.status(400).json({
                    msg: 'Esta transacción de Wompi ya fue procesada anteriormente',
                    details: 'La referencia de Wompi ya existe en el sistema',
                    existingTransactionNumber: existingTransaction.transactionNumber,
                    existingTransactionId: existingTransaction._id,
                    hint: 'Cada pago de Wompi debe tener una referencia única. Si estás probando, genera una nueva referencia.'
                });
            }
        }

        // Validar que el wompiTransactionId no exista (doble validación)
        if (wompiTransactionId) {
            const existingWompiTx = await Transaction.findOne({ 
                'payment.wompiTransactionId': wompiTransactionId 
            });
            
            if (existingWompiTx) {
                return res.status(400).json({
                    msg: 'Esta transacción de Wompi ya fue registrada',
                    details: 'El ID de transacción de Wompi ya existe en el sistema',
                    existingTransactionNumber: existingWompiTx.transactionNumber,
                    existingTransactionId: existingWompiTx._id
                });
            }
        }

        // Calcular totales (puedes agregar lógica de shipping y tax aquí)
        const shipping = 0; // Calcular según la dirección y productos
        const tax = 0; // Calcular IVA si aplica
        const discount = 0; // Aplicar descuentos si existen
        const totalAmount = subtotal + shipping + tax - discount;

        // Determinar el estado de la orden según el estado del pago
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

        // Crear objeto de información de pago
        const paymentInfo = {
            wompiTransactionId,
            wompiReference,
            status: paymentStatusEnum,
            amountInCents: Math.round(totalAmount * 100),
            currency: 'COP',
            customerEmail: customerEmail
        };

        // Agregar información de método de pago si existe
        if (paymentMethod) {
            paymentInfo.paymentMethod = {
                type: paymentMethod,
                installments: installments || 1
            };
            
            if (cardBrand) paymentInfo.paymentMethod.cardBrand = cardBrand;
            if (cardLastFour) paymentInfo.paymentMethod.cardLastFour = cardLastFour;
            if (bankName) paymentInfo.paymentMethod.bankName = bankName;
        }

        // Agregar códigos de aprobación si existen
        if (approvalCode) paymentInfo.approvalCode = approvalCode;
        if (authorizationCode) paymentInfo.authorizationCode = authorizationCode;
        if (receiptUrl) paymentInfo.receiptUrl = receiptUrl;
        if (paymentDate) paymentInfo.paymentDate = new Date(paymentDate);

        // Actualizar tracking según el estado
        const trackingInfo = {
            createdAt: new Date()
        };
        
        if (paymentStatus === 'approved') {
            trackingInfo.paymentConfirmedAt = new Date();
        } else if (paymentStatus === 'declined') {
            trackingInfo.cancelledAt = new Date();
        }

        // Crear la transacción
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
            // 🆕 Agregar información de comisiones
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
                source: 'mobile_wompi_payment',
                wompiIntegration: true
            },
            estado: true
        };

        const transaction = new Transaction(transactionData);
        await transaction.save();

        // Populate los datos para la respuesta
        await transaction.populate([
            { path: 'user', select: 'firstName lastName email phone' },
            { path: 'shippingAddress' },
            { path: 'items.product', select: 'name images brand model' }
        ]);

        // 🆕 Registrar en el wallet (SOLO SI PAGO APROBADO)
        if (paymentStatus === 'approved' && totalCommissions > 0) {
            try {
                console.log('💰 Registrando comisiones en wallet...');
                
                // Buscar o crear wallet
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
                wallet.pendingBalance = (wallet.pendingBalance || 0) + totalCommissions;
                wallet.points = (wallet.points || 0) + totalPoints;
                wallet.totalPointsEarned = (wallet.totalPointsEarned || 0) + totalPoints;
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

        // 🆕 CREAR ORDEN DE ENVÍO AUTOMÁTICAMENTE (SOLO SI PAGO APROBADO)
        let shippingOrder = null;
        if (paymentStatus === 'approved') {
            try {
                console.log('📦 Creando orden de envío...');

                const orderNumber = await ShippingOrder.generateOrderNumber();

                const shippingOrderData = {
                    orderNumber,
                    transaction: transaction._id,
                    seller: uid,
                    customer: {
                        name: user.firstName + ' ' + user.lastName,
                        email: customerEmail,
                        phone: user.phone || ''
                    },
                    shippingAddress: shippingAddressId,
                    items: processedItems.map(item => ({
                        product: item.product,
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
                    notes: {
                        customerNotes: customerNotes || '',
                        deliveryInstructions: deliveryInstructions || ''
                    },
                    estado: true
                };

                shippingOrder = new ShippingOrder(shippingOrderData);
                await shippingOrder.save();

                console.log('✅ Orden de envío creada:', orderNumber);

            } catch (shippingError) {
                console.error('⚠️ Error al crear orden de envío:', shippingError);
                // No fallar la transacción si hay error creando la orden
            }
        }

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
                // 🆕 RESUMEN DETALLADO
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
                howToConfirm: shippingOrder 
                    ? `PUT /api/shipping-orders/${shippingOrder._id}/confirm-delivery`
                    : `PUT /api/transactions/${transaction._id}/confirm-delivery`
            } : null,
            // 🆕 ORDEN DE ENVÍO GENERADA
            shippingOrder: shippingOrder ? {
                _id: shippingOrder._id,
                orderNumber: shippingOrder.orderNumber,
                status: shippingOrder.status,
                commission: {
                    amount: shippingOrder.commission.amount,
                    points: shippingOrder.commission.points,
                    status: shippingOrder.commission.status
                },
                estimatedDelivery: shippingOrder.tracking.estimatedDelivery,
                message: `Orden de envío creada: ${shippingOrder.orderNumber}`,
                viewOrderUrl: `/api/shipping-orders/${shippingOrder._id}`
            } : null,
            // 🆕 DESGLOSE POR PRODUCTO
            itemsBreakdown: processedItems.map(item => ({
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                yourCommission: item.commission * item.quantity,
                yourPoints: item.points,
                margin: item.margin * item.quantity
            }))
        });

    } catch (error) {
        console.error('Error al crear transacción:', error);
        console.error('Error detallado:', {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack,
            errors: error.errors
        });
        
        // Error de clave duplicada de MongoDB
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            const value = error.keyValue ? error.keyValue[field] : 'desconocido';
            
            if (field === 'referenceNumber') {
                return res.status(400).json({
                    msg: 'Esta referencia de Wompi ya fue utilizada',
                    error: `La referencia "${value}" ya existe en el sistema`,
                    hint: 'Genera una nueva referencia única para cada transacción. En Flutter usa: DateTime.now().millisecondsSinceEpoch + Random'
                });
            } else if (field === 'transactionNumber') {
                return res.status(400).json({
                    msg: 'El número de transacción ya existe',
                    error: `El número de transacción "${value}" ya fue generado`,
                    hint: 'Esto no debería ocurrir. Contacta al administrador.'
                });
            } else {
                return res.status(400).json({
                    msg: 'Registro duplicado',
                    error: `El campo "${field}" con valor "${value}" ya existe`,
                    field,
                    value
                });
            }
        }
        
        // Si es un error de validación de Mongoose, dar más detalles
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                msg: 'Error de validación',
                errors: messages,
                details: error.errors
            });
        }
        
        res.status(500).json({
            msg: 'Error interno del servidor al crear la transacción',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Actualizar estado de transacción (webhook de Wompi)
const updateTransactionStatus = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const {
            wompiTransactionId,
            wompiReference,
            status,
            paymentMethod,
            approvalCode,
            authorizationCode,
            receiptUrl,
            eventType,
            eventData
        } = req.body;

        const transaction = await Transaction.findOne({
            _id: id,
            estado: true
        });

        if (!transaction) {
            return res.status(404).json({
                msg: 'Transacción no encontrada'
            });
        }

        // Actualizar información de pago de Wompi
        if (wompiTransactionId) {
            transaction.payment.wompiTransactionId = wompiTransactionId;
        }
        if (wompiReference) {
            transaction.payment.wompiReference = wompiReference;
        }
        if (status) {
            transaction.payment.status = status;
        }
        if (paymentMethod) {
            transaction.payment.paymentMethod = paymentMethod;
        }
        if (approvalCode) {
            transaction.payment.approvalCode = approvalCode;
        }
        if (authorizationCode) {
            transaction.payment.authorizationCode = authorizationCode;
        }
        if (receiptUrl) {
            transaction.payment.receiptUrl = receiptUrl;
        }

        // Procesar webhook si se proporciona
        if (eventType && eventData) {
            await transaction.processWompiWebhook(eventType, eventData);
        } else {
            // Actualizar estado manualmente
            if (status === 'approved') {
                transaction.payment.paymentDate = new Date();
                await transaction.updateOrderStatus('paid');
                
                // Actualizar wallet cuando el pago sea aprobado
                try {
                    await WalletService.approveTransaction({
                        userId: transaction.user,
                        transactionId: transaction._id,
                        amount: transaction.totalAmount
                    });
                } catch (walletError) {
                    console.error('Error al aprobar en wallet:', walletError);
                }
            } else if (status === 'declined') {
                await transaction.updateOrderStatus('cancelled', 'Pago rechazado');
                
                // Cancelar en wallet si el pago es rechazado
                try {
                    await WalletService.cancelTransaction({
                        userId: transaction.user,
                        transactionId: transaction._id
                    });
                } catch (walletError) {
                    console.error('Error al cancelar en wallet:', walletError);
                }
            }
            
            await transaction.save();
        }

        await transaction.populate([
            { path: 'user', select: 'firstName lastName email phone' },
            { path: 'shippingAddress' }
        ]);

        res.json({
            msg: 'Estado de transacción actualizado exitosamente',
            transaction
        });

    } catch (error) {
        console.error('Error al actualizar transacción:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al actualizar la transacción'
        });
    }
};

// Cancelar transacción
const cancelTransaction = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { uid } = req.authenticatedUser;
        const { reason } = req.body;

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

        // Solo se puede cancelar si está en ciertos estados
        const cancellableStates = ['created', 'payment_pending', 'paid', 'confirmed'];
        if (!cancellableStates.includes(transaction.orderStatus)) {
            return res.status(400).json({
                msg: 'No se puede cancelar una transacción en este estado'
            });
        }

        await transaction.updateOrderStatus('cancelled', reason || 'Cancelado por el usuario');

        res.json({
            msg: 'Transacción cancelada exitosamente',
            transaction
        });

    } catch (error) {
        console.error('Error al cancelar transacción:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al cancelar la transacción'
        });
    }
};

// Obtener resumen de transacciones del usuario
const getTransactionsSummary = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;

        // Estadísticas básicas
        const totalTransactions = await Transaction.countDocuments({ 
            user: uid, 
            estado: true 
        });

        const completedTransactions = await Transaction.countDocuments({ 
            user: uid, 
            orderStatus: 'delivered',
            estado: true 
        });

        const pendingTransactions = await Transaction.countDocuments({ 
            user: uid, 
            orderStatus: { $in: ['created', 'payment_pending', 'paid', 'confirmed', 'processing', 'shipped'] },
            estado: true 
        });

        // Calcular total gastado
        const totalSpentResult = await Transaction.aggregate([
            { 
                $match: { 
                    user: uid, 
                    orderStatus: { $ne: 'cancelled' },
                    'payment.status': 'approved',
                    estado: true 
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    totalSpent: { $sum: '$totalAmount' } 
                } 
            }
        ]);

        const totalSpent = totalSpentResult[0]?.totalSpent || 0;

        // Obtener últimas transacciones
        const recentTransactions = await Transaction.find({ 
            user: uid, 
            estado: true 
        })
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 })
        .limit(5);

        res.json({
            summary: {
                totalTransactions,
                completedTransactions,
                pendingTransactions,
                totalSpent
            },
            recentTransactions
        });

    } catch (error) {
        console.error('Error al obtener resumen de transacciones:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al obtener el resumen'
        });
    }
};

// Webhook para recibir notificaciones de Wompi
const wompiWebhook = async (req = request, res = response) => {
    try {
        const { event, data } = req.body;

        // Buscar la transacción por referencia de Wompi
        const transaction = await Transaction.findOne({
            $or: [
                { 'payment.wompiTransactionId': data.id },
                { 'payment.wompiReference': data.reference }
            ]
        });

        if (!transaction) {
            return res.status(404).json({
                msg: 'Transacción no encontrada'
            });
        }

        // Procesar el evento
        await transaction.processWompiWebhook(event, data);

        res.json({
            msg: 'Webhook procesado exitosamente'
        });

    } catch (error) {
        console.error('Error al procesar webhook de Wompi:', error);
        res.status(500).json({
            msg: 'Error interno del servidor al procesar el webhook'
        });
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

        // Transferir de pendiente a disponible
        if (wallet.pendingBalance >= totalCommissions) {
            wallet.pendingBalance -= totalCommissions;
        }

        // Depositar comisión en balance disponible
        wallet.balance += totalCommissions;
        wallet.totalEarned = (wallet.totalEarned || 0) + totalCommissions;
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

        // Actualizar el movimiento anterior a completado
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
                _id: t._id,
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
    getUserTransactions,
    getTransaction,
    createTransaction,
    updateTransactionStatus,
    cancelTransaction,
    getTransactionsSummary,
    wompiWebhook,
    confirmDelivery,
    getEarningsSummary
};
