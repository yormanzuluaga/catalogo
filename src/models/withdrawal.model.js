const { Schema, model } = require('mongoose');

const WithdrawalSchema = Schema({
    // Número de solicitud único
    withdrawalNumber: {
        type: String,
        required: true,
        unique: true
    },

    // Usuario que solicita el retiro
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Wallet del usuario
    wallet: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
    },

    // Monto a retirar
    amount: {
        type: Number,
        required: [true, 'El monto es obligatorio'],
        min: [1, 'El monto mínimo es $1']
    },

    // Método de retiro
    withdrawalMethod: {
        type: String,
        enum: ['nequi', 'bancolombia', 'daviplata', 'other_bank'],
        required: [true, 'El método de retiro es obligatorio']
    },

    // Información de la cuenta
    accountInfo: {
        // Para Nequi o bancos
        accountNumber: {
            type: String,
            required: true
        },
        accountType: {
            type: String,
            enum: ['ahorros', 'corriente', 'nequi', 'daviplata'],
            required: true
        },
        accountHolder: {
            type: String,
            required: true
        },
        // Para otros bancos
        bankName: {
            type: String
        },
        // Documento del titular
        documentType: {
            type: String,
            enum: ['CC', 'CE', 'TI', 'PEP', 'NIT'],
            required: true
        },
        documentNumber: {
            type: String,
            required: true
        },
        // Email de confirmación
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },

    // Estado de la solicitud
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'],
        default: 'pending'
    },

    // Balance del wallet al momento de la solicitud
    walletBalanceSnapshot: {
        availableBalance: Number,
        pendingBalance: Number,
        totalEarned: Number
    },

    // Fechas importantes
    requestedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
        type: Date
    },
    processedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    },

    // Admin que aprobó/rechazó
    processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // Notas y razones
    notes: {
        userNotes: String,      // Notas del usuario
        adminNotes: String,     // Notas del admin
        rejectionReason: String // Razón de rechazo
    },

    // Información del proceso
    transactionInfo: {
        transactionId: String,      // ID de la transacción bancaria
        transferReference: String,  // Referencia de transferencia
        receiptUrl: String,         // URL del comprobante
        processedDate: Date
    },

    // Estado
    estado: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true,
    versionKey: false
});

// Índices
WithdrawalSchema.index({ user: 1, status: 1 });
WithdrawalSchema.index({ status: 1, requestedAt: -1 });
WithdrawalSchema.index({ withdrawalNumber: 1 });

// Método estático para generar número de retiro único
WithdrawalSchema.statics.generateWithdrawalNumber = async function () {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Formato: WTH-YYMMDD-XXXXX
    const prefix = `WTH-${year}${month}${day}`;

    // Buscar el último número del día
    const lastWithdrawal = await this.findOne({
        withdrawalNumber: new RegExp(`^${prefix}`)
    }).sort({ withdrawalNumber: -1 });

    let sequential = 1;
    if (lastWithdrawal) {
        const lastNumber = parseInt(lastWithdrawal.withdrawalNumber.split('-')[2]);
        sequential = lastNumber + 1;
    }

    return `${prefix}-${String(sequential).padStart(5, '0')}`;
};

// Método para verificar si puede ser aprobado
WithdrawalSchema.methods.canBeApproved = function () {
    return this.status === 'pending';
};

// Método para verificar si puede ser rechazado
WithdrawalSchema.methods.canBeRejected = function () {
    return this.status === 'pending' || this.status === 'processing';
};

module.exports = model('Withdrawal', WithdrawalSchema);
