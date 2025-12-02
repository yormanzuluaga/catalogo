const { Schema, model } = require('mongoose');

const ShippingOrderSchema = Schema({
    // Número de orden de envío único
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },

    // Transacción relacionada
    transaction: {
        type: Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },

    // Usuario (vendedor)
    seller: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // 🆕 Usuario comprador (ID del usuario que compró)
    buyer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    // Cliente (comprador) - Información básica
    customer: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String }
    },

    // Dirección de envío
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },

    // Productos a entregar
    items: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
        variations: {
            color: {
                name: String,
                code: String,
                image: String
            },
            size: {
                name: String,
                code: String
            },
            material: {
                name: String,
                code: String
            }
        }
    }],

    // Comisión que se ganará al entregar
    commission: {
        amount: {
            type: Number,
            default: 0
        },
        points: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'deposited'],
            default: 'pending'
        },
        depositedAt: Date
    },

    // Estado de la orden de envío
    status: {
        type: String,
        enum: [
            'pending',        // Pendiente de preparar
            'approved',       // Aprobado (pago confirmado)
            'preparing',      // Preparando el pedido
            'ready',          // Listo para enviar
            'in_transit',     // En camino
            'delivered',      // Entregado
            'cancelled'       // Cancelado
        ],
        default: 'approved'   // Por defecto aprobado si el pago fue exitoso
    },

    // Tracking de la orden
    tracking: {
        preparedAt: Date,
        shippedAt: Date,
        deliveredAt: Date,
        cancelledAt: Date,
        estimatedDelivery: Date
    },

    // Información de entrega
    delivery: {
        notes: String,
        photos: [String],
        signature: String,
        receivedBy: String
    },

    // Transportadora (opcional)
    carrier: {
        name: String,
        trackingNumber: String,
        trackingUrl: String
    },

    // 🆕 Información de pago Wompi
    payment: {
        wompiTransactionId: String,
        wompiReference: String,
        paymentMethod: String,
        paymentStatus: String
    },

    // Notas
    notes: {
        sellerNotes: String,
        customerNotes: String,
        deliveryInstructions: String
    },

    // Estado
    estado: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Método estático para generar número de orden
ShippingOrderSchema.statics.generateOrderNumber = async function() {
    const count = await this.countDocuments();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SHIP-${timestamp}-${random}`;
};

// Método para actualizar estado
ShippingOrderSchema.methods.updateStatus = async function(newStatus, notes = '', skipValidation = false) {
    const validTransitions = {
        'pending': ['approved', 'preparing', 'cancelled', 'delivered'],
        'approved': ['preparing', 'ready', 'in_transit', 'cancelled', 'delivered'], // 🆕 Desde aprobado puede ir a cualquier estado
        'preparing': ['ready', 'cancelled', 'delivered'],
        'ready': ['in_transit', 'cancelled', 'delivered'],
        'in_transit': ['delivered', 'cancelled'],
        'delivered': [],
        'cancelled': []
    };

    // 🆕 Permitir saltar validación para casos especiales
    if (!skipValidation && !validTransitions[this.status].includes(newStatus)) {
        throw new Error(`No se puede cambiar de "${this.status}" a "${newStatus}"`);
    }

    this.status = newStatus;

    // Actualizar tracking según el estado
    const now = new Date();
    switch (newStatus) {
        case 'preparing':
            this.tracking.preparedAt = now;
            break;
        case 'in_transit':
            this.tracking.shippedAt = now;
            break;
        case 'delivered':
            this.tracking.deliveredAt = now;
            break;
        case 'cancelled':
            this.tracking.cancelledAt = now;
            break;
    }

    if (notes) {
        this.notes.sellerNotes = (this.notes.sellerNotes || '') + `\n[${newStatus}] ${notes}`;
    }

    await this.save();
    return this;
};

module.exports = model('ShippingOrder', ShippingOrderSchema);
