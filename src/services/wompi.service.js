const axios = require('axios');
const crypto = require('crypto');

class WompiService {
    constructor() {
        // URLs de Wompi
        this.baseURL = process.env.WOMPI_ENV === 'production' 
            ? 'https://production.wompi.co' 
            : 'https://sandbox.wompi.co';
        
        // Credenciales de Wompi
        this.publicKey = process.env.WOMPI_PUBLIC_KEY;
        this.privateKey = process.env.WOMPI_PRIVATE_KEY;
        this.eventSecret = process.env.WOMPI_EVENT_SECRET;
        
        // Validar credenciales
        if (!this.publicKey || !this.privateKey) {
            console.warn('⚠️  Credenciales de Wompi no configuradas completamente');
        }

        // Configurar axios
        this.api = axios.create({
            baseURL: this.baseURL + '/v1',
            headers: {
                'Authorization': `Bearer ${this.privateKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Crear una transacción de pago
     * @param {Object} paymentData - Datos del pago
     * @returns {Promise<Object>} Respuesta de Wompi
     */
    async createTransaction(paymentData) {
        try {
            const {
                amount_in_cents,
                currency = 'COP',
                customer_email,
                payment_method,
                reference,
                customer_data,
                shipping_address,
                redirect_url,
                payment_source_id
            } = paymentData;

            const transactionData = {
                amount_in_cents,
                currency,
                customer_email,
                payment_method,
                reference,
                customer_data,
                shipping_address,
                redirect_url
            };

            // Si se proporciona un payment_source_id (tarjeta tokenizada)
            if (payment_source_id) {
                transactionData.payment_source_id = payment_source_id;
            }

            console.log('🚀 Creando transacción en Wompi:', reference);
            
            const response = await this.api.post('/transactions', transactionData);
            
            console.log('✅ Transacción creada exitosamente:', response.data.data.id);
            
            return {
                success: true,
                data: response.data.data,
                transaction_id: response.data.data.id,
                status: response.data.data.status,
                payment_link: response.data.data.payment_link_url
            };

        } catch (error) {
            console.error('❌ Error creando transacción en Wompi:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || { message: error.message },
                message: 'Error al procesar el pago'
            };
        }
    }

    /**
     * Consultar el estado de una transacción
     * @param {string} transactionId - ID de la transacción
     * @returns {Promise<Object>} Estado de la transacción
     */
    async getTransactionStatus(transactionId) {
        try {
            console.log('🔍 Consultando estado de transacción:', transactionId);
            
            const response = await this.api.get(`/transactions/${transactionId}`);
            
            return {
                success: true,
                data: response.data.data,
                status: response.data.data.status,
                payment_method: response.data.data.payment_method
            };

        } catch (error) {
            console.error('❌ Error consultando transacción:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || { message: error.message }
            };
        }
    }

    /**
     * Crear un link de pago
     * @param {Object} linkData - Datos del link de pago
     * @returns {Promise<Object>} Link de pago creado
     */
    async createPaymentLink(linkData) {
        try {
            const {
                name,
                description,
                single_use = true,
                amount_in_cents,
                currency = 'COP',
                expires_at,
                collect_shipping = false,
                redirect_url
            } = linkData;

            // Estructura de datos según documentación de Wompi
            const paymentLinkData = {
                name,                    // Nombre del link de pago
                description,             // Descripción del pago
                single_use,              // false para múltiples transacciones, true para una sola
                amount_in_cents,         // Monto en centavos (obligatorio)
                currency,                // Moneda (COP por defecto)
                collect_shipping         // Si recoger información de envío
            };

            // Campos opcionales
            if (expires_at) {
                // Fecha en formato ISO 8601 con UTC
                paymentLinkData.expires_at = expires_at;
            }

            if (redirect_url) {
                paymentLinkData.redirect_url = redirect_url;
            }

            console.log('🔗 Creando link de pago en Wompi:');
            console.log('   📋 Nombre:', name);
            console.log('   💰 Monto:', this.fromCents(amount_in_cents), 'COP');
            console.log('   🔄 Single use:', single_use);
            
            const response = await this.api.post('/payment_links', paymentLinkData);
            
            console.log('✅ Link de pago creado exitosamente:');
            console.log('   🆔 ID:', response.data.data.id);
            console.log('   🔗 URL:', response.data.data.permalink);
            
            return {
                success: true,
                data: response.data.data,
                link_id: response.data.data.id,
                permalink: response.data.data.permalink
            };

        } catch (error) {
            console.error('❌ Error creando link de pago:', error.response?.data || error.message);
            
            return {
                success: false,
                error: error.response?.data || { message: error.message }
            };
        }
    }

    /**
     * Verificar la integridad de un webhook
     * @param {Object} event - Evento del webhook
     * @param {string} signature - Firma del webhook
     * @returns {boolean} Si la firma es válida
     */
    verifyWebhookSignature(event, signature) {
        try {
            if (!this.eventSecret) {
                console.warn('⚠️  Event secret no configurado para verificación de webhooks');
                return false;
            }

            // Crear el checksum como lo hace Wompi
            const eventString = JSON.stringify(event);
            const expectedSignature = crypto
                .createHash('sha256')
                .update(eventString + this.eventSecret)
                .digest('hex');

            return signature === expectedSignature;

        } catch (error) {
            console.error('❌ Error verificando firma de webhook:', error.message);
            return false;
        }
    }

    /**
     * Procesar evento de webhook
     * @param {Object} event - Evento recibido
     * @returns {Object} Resultado del procesamiento
     */
    processWebhookEvent(event) {
        try {
            const { event: eventType, data } = event;

            console.log('📨 Webhook recibido:', eventType, 'para transacción:', data.transaction?.id);

            switch (eventType) {
                case 'transaction.updated':
                    return this.handleTransactionUpdated(data);
                    
                case 'payment_link.updated':
                    return this.handlePaymentLinkUpdated(data);
                    
                default:
                    console.log('ℹ️  Evento no manejado:', eventType);
                    return { success: true, message: 'Evento recibido pero no procesado' };
            }

        } catch (error) {
            console.error('❌ Error procesando webhook:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Manejar actualización de transacción
     * @param {Object} data - Datos de la transacción
     * @returns {Object} Resultado
     */
    handleTransactionUpdated(data) {
        const { transaction } = data;
        
        console.log(`🔄 Transacción ${transaction.id} actualizada a estado: ${transaction.status}`);
        
        return {
            success: true,
            transaction_id: transaction.id,
            status: transaction.status,
            reference: transaction.reference,
            amount: transaction.amount_in_cents,
            payment_method: transaction.payment_method
        };
    }

    /**
     * Manejar actualización de link de pago
     * @param {Object} data - Datos del link
     * @returns {Object} Resultado
     */
    handlePaymentLinkUpdated(data) {
        const { payment_link } = data;
        
        console.log(`🔗 Link de pago ${payment_link.id} actualizado a estado: ${payment_link.status}`);
        
        return {
            success: true,
            link_id: payment_link.id,
            status: payment_link.status
        };
    }

    /**
     * Formatear datos de cliente para Wompi
     * @param {Object} customerData - Datos del cliente
     * @returns {Object} Datos formateados
     */
    formatCustomerData(customerData) {
        const {
            document_type = 'CC',
            document_number,
            name,
            phone,
            email
        } = customerData;

        return {
            document_type,
            document_number: document_number.toString(),
            name,
            phone,
            email
        };
    }

    /**
     * Formatear dirección de envío para Wompi
     * @param {Object} shippingData - Datos de dirección
     * @returns {Object} Dirección formateada
     */
    formatShippingAddress(shippingData) {
        const {
            address_line_1,
            country = 'CO',
            region,
            city,
            name,
            phone_number
        } = shippingData;

        return {
            address_line_1,
            country,
            region,
            city,
            name,
            phone_number
        };
    }

    /**
     * Convertir monto a centavos
     * @param {number} amount - Monto en pesos
     * @returns {number} Monto en centavos
     */
    toCents(amount) {
        return Math.round(amount * 100);
    }

    /**
     * Convertir de centavos a pesos
     * @param {number} amountInCents - Monto en centavos
     * @returns {number} Monto en pesos
     */
    fromCents(amountInCents) {
        return amountInCents / 100;
    }
}

module.exports = WompiService;
