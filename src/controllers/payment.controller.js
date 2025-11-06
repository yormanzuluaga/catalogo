const { response, request } = require('express');
const Orden = require('../models/orden.model');
const WompiService = require('../services/wompi.service');

const paymentCtrl = {};
const wompiService = new WompiService();

/**
 * Crear pago para una orden existente
 */
paymentCtrl.createPayment = async (req = request, res = response) => {
    try {
        const { orderId } = req.params;
        const { 
            payment_method = 'CARD',
            customer_document,
            redirect_url,
            use_payment_link = true,
            single_use = true,
            collect_shipping = false,
            expires_in_hours = 24
        } = req.body;

        // Buscar la orden
        const order = await Orden.findById(orderId)
            .populate('user', 'firstName lastName email');

        if (!order) {
            return res.status(404).json({
                ok: false,
                msg: 'Orden no encontrada'
            });
        }

        // Verificar si ya tiene un pago procesado
        if (order.payment.status === 'approved') {
            return res.status(400).json({
                ok: false,
                msg: 'La orden ya tiene un pago aprobado'
            });
        }

        // Generar referencia única para el pago
        const reference = `ORDER_${order._id}_${Date.now()}`;
        const amountInCents = wompiService.toCents(order.totalPrice);

        let paymentResult;

        if (use_payment_link) {
            // Calcular fecha de expiración
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + expires_in_hours);
            const expires_at = expirationDate.toISOString();

            // Crear link de pago (recomendado para la mayoría de casos)
            paymentResult = await wompiService.createPaymentLink({
                name: `Pago Orden #${order._id.toString().slice(-6)} - ${order.name}`,
                description: `Compra de ${order.items.length} producto(s) por $${order.totalPrice.toLocaleString('es-CO')} - Cliente: ${order.name}`,
                amount_in_cents: amountInCents,
                currency: 'COP',
                single_use: single_use,
                collect_shipping: collect_shipping,
                expires_at: expires_at,
                redirect_url: redirect_url || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}/payment-result`
            });

            if (!paymentResult.success) {
                return res.status(500).json({
                    ok: false,
                    msg: 'Error creando link de pago',
                    error: paymentResult.error
                });
            }

            // Actualizar la orden con información del pago
            order.payment = {
                ...order.payment,
                payment_link_id: paymentResult.link_id,
                reference: reference,
                amount_in_cents: amountInCents,
                payment_link_url: paymentResult.data.permalink,
                status: 'pending'
            };

        } else {
            // Crear transacción directa (requiere más datos del cliente)
            const customerData = wompiService.formatCustomerData({
                document_type: 'CC',
                document_number: customer_document,
                name: order.name,
                phone: order.phone,
                email: order.user.email
            });

            const shippingAddress = wompiService.formatShippingAddress({
                address_line_1: order.customerAddress.street,
                country: 'CO',
                region: order.customerAddress.department,
                city: order.customerAddress.city,
                name: order.name,
                phone_number: order.phone
            });

            paymentResult = await wompiService.createTransaction({
                amount_in_cents: amountInCents,
                currency: 'COP',
                customer_email: order.user.email,
                payment_method: payment_method,
                reference: reference,
                customer_data: customerData,
                shipping_address: shippingAddress,
                redirect_url: redirect_url
            });

            if (!paymentResult.success) {
                return res.status(500).json({
                    ok: false,
                    msg: 'Error creando transacción',
                    error: paymentResult.error
                });
            }

            // Actualizar la orden con información del pago
            order.payment = {
                ...order.payment,
                transaction_id: paymentResult.transaction_id,
                reference: reference,
                amount_in_cents: amountInCents,
                payment_link_url: paymentResult.payment_link,
                status: paymentResult.status
            };
        }

        await order.save();

        res.json({
            ok: true,
            msg: 'Pago creado exitosamente',
            payment: {
                order_id: order._id,
                reference: reference,
                amount: order.totalPrice,
                amount_in_cents: amountInCents,
                payment_url: paymentResult.data.permalink || paymentResult.payment_link,
                payment_id: paymentResult.link_id || paymentResult.transaction_id,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error en createPayment:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

/**
 * Webhook para recibir notificaciones de Wompi
 */
paymentCtrl.webhook = async (req = request, res = response) => {
    try {
        const event = req.body;
        const signature = req.headers['x-signature'];

        console.log('📨 Webhook recibido de Wompi:', event.event);

        // Verificar la firma del webhook (en producción)
        if (process.env.WOMPI_ENV === 'production') {
            const isValidSignature = wompiService.verifyWebhookSignature(event, signature);
            if (!isValidSignature) {
                console.log('❌ Firma de webhook inválida');
                return res.status(401).json({ ok: false, msg: 'Firma inválida' });
            }
        }

        // Procesar el evento
        const result = wompiService.processWebhookEvent(event);

        if (event.event === 'transaction.updated') {
            await paymentCtrl.handleTransactionUpdate(event.data);
        } else if (event.event === 'payment_link.updated') {
            await paymentCtrl.handlePaymentLinkUpdate(event.data);
        }

        res.json({ ok: true, message: 'Webhook procesado' });

    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error procesando webhook',
            error: error.message
        });
    }
};

/**
 * Manejar actualización de transacción
 */
paymentCtrl.handleTransactionUpdate = async (data) => {
    try {
        const { transaction } = data;
        
        // Buscar la orden por referencia
        const order = await Orden.findOne({ 'payment.reference': transaction.reference });
        
        if (!order) {
            console.log('⚠️  Orden no encontrada para referencia:', transaction.reference);
            return;
        }

        // Actualizar información de pago
        order.payment.transaction_id = transaction.id;
        order.payment.status = transaction.status;
        order.payment.payment_method = transaction.payment_method?.type;
        order.payment.approval_code = transaction.payment_method?.extra?.approval_code;
        order.payment.receipt_url = transaction.receipt_url;

        if (transaction.status === 'APPROVED') {
            order.payment.payment_date = new Date();
            order.orderStatus = 'confirmed';
        } else if (transaction.status === 'DECLINED') {
            order.orderStatus = 'cancelled';
        }

        // Registrar evento del webhook
        order.payment.webhook_events.push({
            event_type: 'transaction.updated',
            data: transaction
        });

        await order.save();

        console.log(`✅ Orden ${order._id} actualizada con pago ${transaction.status}`);

    } catch (error) {
        console.error('Error manejando actualización de transacción:', error);
    }
};

/**
 * Manejar actualización de link de pago
 */
paymentCtrl.handlePaymentLinkUpdate = async (data) => {
    try {
        const { payment_link } = data;
        
        // Buscar la orden por payment_link_id
        const order = await Orden.findOne({ 'payment.payment_link_id': payment_link.id });
        
        if (!order) {
            console.log('⚠️  Orden no encontrada para payment_link:', payment_link.id);
            return;
        }

        // Si el link fue pagado, buscar la transacción asociada
        if (payment_link.status === 'PAID' && payment_link.transactions?.length > 0) {
            const transaction = payment_link.transactions[0];
            
            order.payment.transaction_id = transaction.id;
            order.payment.status = 'approved';
            order.payment.payment_method = transaction.payment_method?.type;
            order.payment.approval_code = transaction.payment_method?.extra?.approval_code;
            order.payment.receipt_url = transaction.receipt_url;
            order.payment.payment_date = new Date();
            order.orderStatus = 'confirmed';
        }

        // Registrar evento del webhook
        order.payment.webhook_events.push({
            event_type: 'payment_link.updated',
            data: payment_link
        });

        await order.save();

        console.log(`✅ Orden ${order._id} actualizada con link de pago ${payment_link.status}`);

    } catch (error) {
        console.error('Error manejando actualización de link de pago:', error);
    }
};

/**
 * Consultar estado de pago de una orden
 */
paymentCtrl.getPaymentStatus = async (req = request, res = response) => {
    try {
        const { orderId } = req.params;

        const order = await Orden.findById(orderId)
            .populate('user', 'firstName lastName email');

        if (!order) {
            return res.status(404).json({
                ok: false,
                msg: 'Orden no encontrada'
            });
        }

        // Si hay transaction_id, consultar estado en Wompi
        if (order.payment.transaction_id) {
            const paymentResult = await wompiService.getTransactionStatus(order.payment.transaction_id);
            
            if (paymentResult.success) {
                // Actualizar estado local si es diferente
                if (order.payment.status !== paymentResult.status) {
                    order.payment.status = paymentResult.status;
                    await order.save();
                }
            }
        }

        res.json({
            ok: true,
            payment: {
                order_id: order._id,
                status: order.payment.status,
                transaction_id: order.payment.transaction_id,
                payment_link_id: order.payment.payment_link_id,
                payment_method: order.payment.payment_method,
                amount: wompiService.fromCents(order.payment.amount_in_cents),
                payment_date: order.payment.payment_date,
                receipt_url: order.payment.receipt_url,
                payment_link_url: order.payment.payment_link_url
            }
        });

    } catch (error) {
        console.error('Error en getPaymentStatus:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = paymentCtrl;
