const { DateTime } = require('luxon');
const { Schema, model } = require('mongoose');

const WalletSchema = Schema({
    // Saldo disponible (comisiones acumuladas)
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Saldo en proceso (comisiones pendientes de aprobación)
    pendingBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Total de comisiones generadas (histórico)
    totalCommissionsEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Puntos acumulados
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Total de puntos ganados (histórico)
    totalPointsEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Usuario/Vendedora propietaria
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Una wallet por usuario
    },
    
    // Estado activo/inactivo
    estado: {
        type: Boolean,
        default: true,
        required: true
    },
    
    // Configuración de la wallet
    settings: {
        // Mínimo para retiro
        minimumWithdrawal: {
            type: Number,
            default: 50000 // $50,000 COP mínimo
        },
        // Método de pago preferido
        preferredPaymentMethod: {
            type: String,
            enum: ['bank_transfer', 'nequi', 'daviplata', 'bancolombia', 'other'],
            default: 'bank_transfer'
        },
        // Datos bancarios
        bankInfo: {
            bankName: String,
            accountNumber: String,
            accountType: {
                type: String,
                enum: ['savings', 'checking']
            },
            accountHolderName: String
        },
        // Notificaciones
        notifications: {
            emailOnCommission: { type: Boolean, default: true },
            emailOnWithdrawal: { type: Boolean, default: true },
            smsOnCommission: { type: Boolean, default: false }
        }
    },
    
    // Estadísticas de la vendedora
    stats: {
        totalSales: { type: Number, default: 0 },
        totalProducts: { type: Number, default: 0 },
        averageCommissionPerSale: { type: Number, default: 0 },
        bestSellingMonth: String,
        lastSaleDate: Date,
        salesThisMonth: { type: Number, default: 0 },
        commissionsThisMonth: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Métodos de instancia
WalletSchema.methods.addCommission = function(amount, description = '') {
    this.pendingBalance += amount;
    this.totalCommissionsEarned += amount;
    this.stats.commissionsThisMonth += amount;
    return this.save();
};

WalletSchema.methods.approveCommission = function(amount) {
    if (this.pendingBalance >= amount) {
        this.pendingBalance -= amount;
        this.balance += amount;
        return this.save();
    }
    throw new Error('Saldo pendiente insuficiente');
};

WalletSchema.methods.addPoints = function(points) {
    this.points += points;
    this.totalPointsEarned += points;
    return this.save();
};

WalletSchema.methods.withdraw = function(amount) {
    if (this.balance >= amount && amount >= this.settings.minimumWithdrawal) {
        this.balance -= amount;
        return this.save();
    }
    throw new Error('Saldo insuficiente o monto menor al mínimo');
};

WalletSchema.methods.updateStats = function(saleAmount, commissionAmount) {
    this.stats.totalSales += saleAmount;
    this.stats.totalProducts += 1;
    this.stats.salesThisMonth += saleAmount;
    this.stats.lastSaleDate = new Date();
    
    // Calcular promedio de comisión por venta
    if (this.stats.totalProducts > 0) {
        this.stats.averageCommissionPerSale = this.totalCommissionsEarned / this.stats.totalProducts;
    }
    
    return this.save();
};

// Método virtual para obtener balance total
WalletSchema.virtual('totalBalance').get(function() {
    return this.balance + this.pendingBalance;
});

// Método virtual para verificar si puede retirar
WalletSchema.virtual('canWithdraw').get(function() {
    return this.balance >= this.settings.minimumWithdrawal;
});

WalletSchema.methods.toJSON = function() {
    const { estado, _id, ...data } = this.toObject({ virtuals: true });
    data.uid = _id;
    return data;
};

module.exports = model('Wallet', WalletSchema);