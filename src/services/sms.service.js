/**
 * Servicio de SMS para envío de códigos de verificación
 * 
 * IMPLEMENTACIÓN ACTUAL: Mock/Simulado
 * 
 * PARA PRODUCCIÓN, integrar con:
 * - Twilio: https://www.twilio.com/
 * - AWS SNS: https://aws.amazon.com/sns/
 * - Vonage (Nexmo): https://www.vonage.com/
 * - MessageBird: https://www.messagebird.com/
 */

class SMSService {
    constructor() {
        this.provider = process.env.SMS_PROVIDER || 'mock'; // 'twilio', 'aws', 'vonage', 'mock'
        this.isMockMode = this.provider === 'mock' || process.env.NODE_ENV === 'development';
    }

    /**
     * Enviar código de verificación por SMS
     * @param {string} phoneNumber - Número de teléfono con código de país (ej: +57300123456)
     * @param {string} code - Código de 6 dígitos
     * @param {string} operationType - Tipo de operación (withdrawal, etc.)
     * @returns {Promise<Object>} - Resultado del envío
     */
    async sendVerificationCode(phoneNumber, code, operationType = 'general') {
        try {
            console.log('');
            console.log('╔═══════════════════════════════════════════════════════════╗');
            console.log('║           📱 ENVIANDO CÓDIGO DE VERIFICACIÓN             ║');
            console.log('╚═══════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('  📞 Teléfono:', phoneNumber);
            console.log('  🔐 Código:', code);
            console.log('  📋 Operación:', this.getOperationLabel(operationType));
            console.log('  ⚙️  Modo:', this.isMockMode ? 'MOCK (Desarrollo)' : this.provider.toUpperCase());
            console.log('');

            if (this.isMockMode) {
                return await this.sendMockSMS(phoneNumber, code, operationType);
            }

            // Aquí se implementarían los servicios reales
            switch (this.provider) {
                case 'twilio':
                    return await this.sendTwilioSMS(phoneNumber, code, operationType);
                case 'aws':
                    return await this.sendAWSSMS(phoneNumber, code, operationType);
                case 'vonage':
                    return await this.sendVonageSMS(phoneNumber, code, operationType);
                default:
                    return await this.sendMockSMS(phoneNumber, code, operationType);
            }

        } catch (error) {
            console.error('❌ Error al enviar SMS:', error);
            throw new Error('Error al enviar código de verificación por SMS');
        }
    }

    /**
     * Mock SMS - Para desarrollo y testing
     */
    async sendMockSMS(phoneNumber, code, operationType) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));

        const message = this.buildMessage(code, operationType);

        console.log('  ═══════════════════════════════════════════════════════════');
        console.log('  📨 MENSAJE SIMULADO (NO SE ENVÍA REALMENTE):');
        console.log('  ═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('  ' + message.split('\n').join('\n  '));
        console.log('');
        console.log('  ═══════════════════════════════════════════════════════════');
        console.log('  ✅ SMS SIMULADO ENVIADO EXITOSAMENTE');
        console.log('  ═══════════════════════════════════════════════════════════');
        console.log('');

        return {
            success: true,
            provider: 'mock',
            messageId: 'MOCK-' + Date.now(),
            phoneNumber,
            message,
            timestamp: new Date(),
            cost: 0,
            note: '⚠️  Este es un mensaje simulado. En producción, configure un proveedor de SMS real.'
        };
    }

    /**
     * Twilio SMS - Para producción
     */
    async sendTwilioSMS(phoneNumber, code, operationType) {
        // Implementar integración con Twilio
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            console.warn('⚠️  Credenciales de Twilio no configuradas. Usando modo MOCK.');
            return await this.sendMockSMS(phoneNumber, code, operationType);
        }

        // Aquí iría la implementación real con Twilio SDK
        // const twilio = require('twilio');
        // const client = twilio(accountSid, authToken);
        // const result = await client.messages.create({
        //     body: this.buildMessage(code, operationType),
        //     from: fromNumber,
        //     to: phoneNumber
        // });

        console.log('✅ SMS enviado con Twilio (implementación pendiente)');

        return {
            success: true,
            provider: 'twilio',
            messageId: 'TWILIO-' + Date.now(),
            phoneNumber,
            timestamp: new Date()
        };
    }

    /**
     * AWS SNS - Para producción
     */
    async sendAWSSMS(phoneNumber, code, operationType) {
        // Implementar integración con AWS SNS
        console.log('✅ SMS enviado con AWS SNS (implementación pendiente)');

        return {
            success: true,
            provider: 'aws',
            messageId: 'AWS-' + Date.now(),
            phoneNumber,
            timestamp: new Date()
        };
    }

    /**
     * Vonage (Nexmo) - Para producción
     */
    async sendVonageSMS(phoneNumber, code, operationType) {
        // Implementar integración con Vonage
        console.log('✅ SMS enviado con Vonage (implementación pendiente)');

        return {
            success: true,
            provider: 'vonage',
            messageId: 'VONAGE-' + Date.now(),
            phoneNumber,
            timestamp: new Date()
        };
    }

    /**
     * Construir mensaje según el tipo de operación
     */
    buildMessage(code, operationType) {
        const messages = {
            withdrawal: `🏦 CATÁLOGO - Retiro de Fondos\n\nTu código de verificación es:\n\n${code}\n\nEste código expira en 5 minutos.\n\n⚠️ No compartas este código con nadie.`,

            update_settings: `⚙️ CATÁLOGO - Actualización de Configuración\n\nTu código de verificación es:\n\n${code}\n\nEste código expira en 5 minutos.\n\n⚠️ No compartas este código con nadie.`,

            delete_account: `🗑️ CATÁLOGO - Eliminar Cuenta\n\nTu código de verificación es:\n\n${code}\n\nEste código expira en 5 minutos.\n\n⚠️ No compartas este código con nadie.`,

            general: `🔐 CATÁLOGO - Código de Verificación\n\nTu código es:\n\n${code}\n\nEste código expira en 5 minutos.\n\n⚠️ No compartas este código con nadie.`
        };

        return messages[operationType] || messages.general;
    }

    /**
     * Obtener etiqueta de operación
     */
    getOperationLabel(operationType) {
        const labels = {
            withdrawal: 'Retiro de Fondos',
            update_settings: 'Actualizar Configuración',
            delete_account: 'Eliminar Cuenta',
            general: 'General'
        };

        return labels[operationType] || operationType;
    }

    /**
     * Validar formato de número de teléfono
     */
    validatePhoneNumber(phoneNumber) {
        // Formato esperado: +57300123456 (código país + número)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }

    /**
     * Formatear número de teléfono
     */
    formatPhoneNumber(countryCode, mobile) {
        // Remover caracteres no numéricos
        const cleanCountryCode = countryCode.replace(/\D/g, '');
        const cleanMobile = mobile.replace(/\D/g, '');

        // Asegurar que tenga el +
        const formattedCountryCode = cleanCountryCode.startsWith('+')
            ? cleanCountryCode
            : '+' + cleanCountryCode;

        return formattedCountryCode + cleanMobile;
    }
}

module.exports = new SMSService();
