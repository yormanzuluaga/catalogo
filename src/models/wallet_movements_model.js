const { DateTime } = require('luxon');
const { Schema, model } = require('mongoose');

const WalletMovementsSchema = Schema({
    // Tipo de movimiento
    type: {
        type: String,
        required: true,
        enum: [
            'commission_earned',    // Comisión ganada
            'commission_approved',  // Comisión aprobada
            'withdrawal',          // Retiro
            'points_earned',       // Puntos ganados
            'points_redeemed',     // Puntos canjeados
            'bonus',              // Bonificación
            'penalty',            // Penalización
            'adjustment'           // Ajuste manual
        ]
    },
    
    // Monto del movimiento (puede ser positivo o negativo)
    amount: {
        type: Number,
        required: true
    },
    
    // Puntos involucrados en el movimiento
    points: {
        type: Number,
        default: 0
    },
    
    // Saldo después del movimiento
    balanceAfter: {
        type: Number,
        required: true
    },
    
    // Puntos después del movimiento
    pointsAfter: {
        type: Number,
        required: true
    },
    
    // Descripción del movimiento
    description: {
        type: String,
        required: true
    },
    
    // Referencia a la wallet
    wallet: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
    },
    
    // Referencia a la venta (si aplica)
    sale: {
        type: Schema.Types.ObjectId,
        ref: 'Orden'
    },
    
    // Referencia al producto (si aplica)
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    
    // Estado del movimiento
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    
    // Método de retiro (para withdrawals)
    withdrawalMethod: {
        type: String,
        enum: ['bank_transfer', 'nequi', 'daviplata', 'bancolombia', 'other']
    },
    
    // Información adicional del retiro
    withdrawalInfo: {
        bankName: String,
        accountNumber: String,
        transactionId: String,
        processedDate: Date,
        notes: String
    },
    
    // Usuario que procesó el movimiento (para retiros)
    processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Metadatos adicionales
    metadata: {
        ip: String,
        userAgent: String,
        location: String
    },
    
    // Estado activo/inactivo
    estado: {
        type: Boolean,
        default: true,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices para mejorar performance
WalletMovementsSchema.index({ wallet: 1, createdAt: -1 });
WalletMovementsSchema.index({ type: 1, status: 1 });
WalletMovementsSchema.index({ sale: 1 });

// Método virtual para determinar si es un movimiento de entrada o salida
WalletMovementsSchema.virtual('isIncome').get(function() {
    return ['commission_earned', 'commission_approved', 'bonus', 'points_earned'].includes(this.type);
});

WalletMovementsSchema.virtual('isExpense').get(function() {
    return ['withdrawal', 'penalty', 'points_redeemed'].includes(this.type);
});

// Método para formatear el monto con símbolo de moneda
WalletMovementsSchema.virtual('formattedAmount').get(function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
    }).format(this.amount);
});

// Método para obtener descripción amigable del tipo
WalletMovementsSchema.virtual('typeDescription').get(function() {
    const descriptions = {
        'commission_earned': 'Comisión ganada',
        'commission_approved': 'Comisión aprobada',
        'withdrawal': 'Retiro',
        'points_earned': 'Puntos ganados',
        'points_redeemed': 'Puntos canjeados',
        'bonus': 'Bonificación',
        'penalty': 'Penalización',
        'adjustment': 'Ajuste manual'
    };
    return descriptions[this.type] || this.type;
});

WalletMovementsSchema.methods.toJSON = function() {
    const { estado, _id, ...data } = this.toObject({ virtuals: true });
    data.uid = _id;
    return data;
};

module.exports = model('WalletMovements', WalletMovementsSchema);