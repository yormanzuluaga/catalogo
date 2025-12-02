const { Schema, model } = require('mongoose');

const VerificationCodeSchema = Schema({
    // Usuario al que pertenece el código
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Número de teléfono al que se envió
    phoneNumber: {
        type: String,
        required: true
    },

    // Código de verificación (6 dígitos)
    code: {
        type: String,
        required: true
    },

    // Tipo de operación
    operationType: {
        type: String,
        enum: ['withdrawal', 'update_settings', 'delete_account', 'other'],
        required: true
    },

    // Datos de la operación (para validar después)
    operationData: {
        type: Schema.Types.Mixed
    },

    // Estado del código
    status: {
        type: String,
        enum: ['pending', 'verified', 'expired', 'used'],
        default: 'pending'
    },

    // Intentos de verificación
    attempts: {
        type: Number,
        default: 0,
        max: 3 // Máximo 3 intentos
    },

    // Fecha de expiración (5 minutos)
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '5m' } // TTL index - MongoDB eliminará automáticamente después de expirar
    },

    // IP desde donde se solicitó
    ipAddress: {
        type: String
    },

    // User agent
    userAgent: {
        type: String
    },

    // Fecha de verificación
    verifiedAt: {
        type: Date
    },

    estado: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices
VerificationCodeSchema.index({ user: 1, operationType: 1, status: 1 });
VerificationCodeSchema.index({ expiresAt: 1 });

// Método estático para generar código de 6 dígitos
VerificationCodeSchema.statics.generateCode = function () {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Método para verificar si el código está expirado
VerificationCodeSchema.methods.isExpired = function () {
    return new Date() > this.expiresAt;
};

// Método para verificar el código
VerificationCodeSchema.methods.verify = function (code) {
    // Incrementar intentos
    this.attempts += 1;

    // Verificar si está expirado
    if (this.isExpired()) {
        this.status = 'expired';
        return { success: false, message: 'Código expirado' };
    }

    // Verificar intentos máximos
    if (this.attempts > 3) {
        this.status = 'expired';
        return { success: false, message: 'Máximo de intentos alcanzado' };
    }

    // Verificar código
    if (this.code === code) {
        this.status = 'verified';
        this.verifiedAt = new Date();
        return { success: true, message: 'Código verificado correctamente' };
    }

    return { success: false, message: 'Código incorrecto' };
};

// Método para marcar como usado
VerificationCodeSchema.methods.markAsUsed = function () {
    this.status = 'used';
    return this.save();
};

module.exports = model('VerificationCode', VerificationCodeSchema);
