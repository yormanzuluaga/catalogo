const { Schema, model } = require("mongoose");

const TransactionSchema = Schema(
  {
    // Información básica de la transacción
    transactionNumber: {
      type: String,
      required: true,
      unique: true
      // Se genera automáticamente si no se proporciona
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true
      // Se genera automáticamente si no se proporciona
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      required: true
    },

    // Usuario que realiza la compra
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Dirección de envío (referencia al modelo independiente)
    shippingAddress: {
      type: Schema.Types.ObjectId,
      ref: 'Address',
      required: true
    },

    // Items comprados
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        name: {
          type: String,
          required: true
        },
        productType: {
          type: String,
          enum: ['simple', 'variable'],
          default: 'simple'
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0
        },
        
        // Variaciones del producto (opcionales - algunos productos pueden no tener variaciones)
        variations: {
          color: {
            name: { type: String },
            code: { type: String }, // Código hexadecimal o código interno
            image: { type: String } // URL de imagen del color
          },
          size: {
            name: { type: String },
            code: { type: String }
          },
          material: {
            name: { type: String },
            code: { type: String }
          },
          // Medidas para productos que requieren dimensiones específicas
          measurements: {
            length: { type: Number },
            width: { type: Number },
            height: { type: Number },
            weight: { type: Number },
            unit: { type: String, default: 'cm' } // cm, m, in, etc.
          },
          // Otras variaciones personalizables
          customOptions: [{
            optionName: { type: String },
            optionValue: { type: String },
            additionalCost: { type: Number, default: 0 }
          }]
        },

        // Información adicional del producto en el momento de compra
        productSnapshot: {
          description: { type: String },
          brand: { type: String },
          model: { type: String },
          category: { type: String },
          subCategory: { type: String },
          images: [{ type: String }],
          barcode: { type: String }
        },

        // Comisiones y puntos
        basePrice: { type: Number },
        margin: { type: Number },
        commission: { type: Number },
        points: { type: Number },
        
        estado: { type: Boolean, default: true }
      }
    ],

    // Totales
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    // Información de descuentos aplicados
    discounts: [
      {
        type: {
          type: String,
          enum: ['percentage', 'fixed', 'coupon', 'loyalty']
        },
        name: { type: String },
        code: { type: String },
        value: { type: Number },
        appliedAmount: { type: Number }
      }
    ],

    // Información de pago con Wompi
    payment: {
      // Email del cliente (para notificaciones)
      customerEmail: { type: String },
      
      // Identificadores de Wompi
      wompiTransactionId: { type: String }, // ID de la transacción en Wompi
      wompiReference: { type: String }, // Referencia única en Wompi
      wompiPaymentLinkId: { type: String }, // ID del payment link
      wompiPaymentLinkUrl: { type: String }, // URL de pago para el cliente
      
      // Estado del pago
      status: {
        type: String,
        enum: ['pending', 'approved', 'declined', 'voided', 'error', 'expired'],
        default: 'pending'
      },
      
      // Método de pago usado
      paymentMethod: {
        type: {
          type: String,
          enum: ['CARD', 'NEQUI', 'PSE', 'BANCOLOMBIA_TRANSFER', 'BANCOLOMBIA_COLLECT']
        },
        installments: { type: Number, default: 1 },
        cardBrand: { type: String }, // VISA, MASTERCARD, etc.
        cardLastFour: { type: String },
        bankName: { type: String } // Para PSE y transferencias
      },
      
      // Detalles financieros
      amountInCents: { type: Number, required: true },
      currency: { type: String, default: 'COP' },
      
      // Códigos y comprobantes
      approvalCode: { type: String },
      receiptUrl: { type: String },
      authorizationCode: { type: String },
      
      // Fechas importantes
      paymentDate: { type: Date },
      expirationDate: { type: Date },
      
      // Webhooks y eventos de Wompi
      webhookEvents: [{
        eventType: { type: String },
        receivedAt: { type: Date, default: Date.now },
        data: { type: Schema.Types.Mixed },
        processed: { type: Boolean, default: false }
      }],
      
      // Información adicional de seguridad
      fraudScore: { type: Number },
      riskLevel: { type: String, enum: ['low', 'medium', 'high'] }
    },

    // Estado y seguimiento de la orden
    orderStatus: {
      type: String,
      enum: ['created', 'payment_pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'created'
    },

    // Tracking detallado
    tracking: {
      createdAt: { type: Date, default: Date.now },
      paymentConfirmedAt: { type: Date },
      confirmedAt: { type: Date },
      processingStartedAt: { type: Date },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
      cancelledAt: { type: Date },
      
      // Información de envío
      carrier: { type: String }, // Transportadora
      trackingNumber: { type: String }, // Número de guía
      estimatedDeliveryDate: { type: Date },
      deliveryNotes: { type: String }
    },

    // Comisiones y puntos totales
    commissions: {
      totalCommission: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      commissionStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      processedAt: { type: Date },
      processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    },

    // Notas y comunicación
    notes: {
      customerNotes: { type: String }, // Notas del cliente
      internalNotes: { type: String }, // Notas internas del equipo
      deliveryInstructions: { type: String } // Instrucciones de entrega
    },

    // Información del dispositivo y sesión (para análisis)
    metadata: {
      userAgent: { type: String },
      ipAddress: { type: String },
      platform: { type: String }, // 'web', 'mobile', 'app'
      source: { type: String }, // De dónde viene la orden
      sessionId: { type: String }
    },

    estado: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Índices para mejorar performance (commented to avoid duplicates with unique fields)
// TransactionSchema.index({ transactionNumber: 1 });
// TransactionSchema.index({ referenceNumber: 1 });
TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ "payment.wompiTransactionId": 1 });
TransactionSchema.index({ "payment.wompiReference": 1 });
TransactionSchema.index({ orderStatus: 1 });
TransactionSchema.index({ transactionDate: -1 });

// Middleware pre-save para calcular totales y comisiones
TransactionSchema.pre('save', async function(next) {
  if (this.isModified('items') || this.isNew) {
    let subtotal = 0;
    let totalCommission = 0;
    let totalPoints = 0;

    // Calcular totales por cada item
    for (let item of this.items) {
      // Calcular precio total del item
      item.totalPrice = item.unitPrice * item.quantity;
      subtotal += item.totalPrice;

      // Calcular comisiones si existe precio base
      if (item.basePrice && item.unitPrice > item.basePrice) {
        const margin = item.unitPrice - item.basePrice;
        const commission = (margin * 0.20); // 20% del margen
        const points = Math.floor((item.totalPrice) / 10000); // 1 punto por cada $10,000

        item.margin = margin;
        item.commission = commission * item.quantity;
        item.points = points;

        totalCommission += item.commission;
        totalPoints += item.points;
      }
    }

    // Actualizar subtotal
    this.subtotal = subtotal;

    // Calcular total final
    this.totalAmount = this.subtotal + this.shipping + this.tax - this.discount;

    // Actualizar comisiones totales
    this.commissions.totalCommission = totalCommission;
    this.commissions.totalPoints = totalPoints;

    // Convertir a centavos para Wompi
    this.payment.amountInCents = Math.round(this.totalAmount * 100);
  }

  next();
});

// Método para generar número de transacción único
TransactionSchema.statics.generateTransactionNumber = async function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Buscar el último número del día
  const prefix = `TXN${year}${month}${day}`;
  const lastTransaction = await this.findOne({
    transactionNumber: { $regex: `^${prefix}` }
  }).sort({ transactionNumber: -1 });

  let sequence = 1;
  if (lastTransaction) {
    const lastSequence = parseInt(lastTransaction.transactionNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Método para generar número de referencia único
TransactionSchema.statics.generateReferenceNumber = async function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `REF${timestamp}${String(random).padStart(4, '0')}`;
};

// Método para actualizar estado de la orden
TransactionSchema.methods.updateOrderStatus = function(newStatus, notes = '') {
  this.orderStatus = newStatus;
  
  const now = new Date();
  switch (newStatus) {
    case 'paid':
      this.tracking.paymentConfirmedAt = now;
      break;
    case 'confirmed':
      this.tracking.confirmedAt = now;
      break;
    case 'processing':
      this.tracking.processingStartedAt = now;
      break;
    case 'shipped':
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
    this.notes.internalNotes = (this.notes.internalNotes || '') + `\n[${now.toISOString()}] ${notes}`;
  }

  return this.save();
};

// Método para procesar webhook de Wompi
TransactionSchema.methods.processWompiWebhook = function(eventType, eventData) {
  // Agregar evento al historial
  this.payment.webhookEvents.push({
    eventType,
    data: eventData,
    receivedAt: new Date()
  });

  // Actualizar estado según el evento
  switch (eventType) {
    case 'transaction.updated':
      if (eventData.status === 'APPROVED') {
        this.payment.status = 'approved';
        this.payment.paymentDate = new Date();
        this.payment.approvalCode = eventData.approval_code;
        this.payment.authorizationCode = eventData.authorization_code;
        this.updateOrderStatus('paid');
      } else if (eventData.status === 'DECLINED') {
        this.payment.status = 'declined';
        this.updateOrderStatus('cancelled', 'Pago rechazado');
      } else if (eventData.status === 'VOIDED') {
        this.payment.status = 'voided';
        this.updateOrderStatus('refunded', 'Pago anulado');
      }
      break;
  }

  return this.save();
};

// Método toJSON personalizado
TransactionSchema.methods.toJSON = function() {
  const { _id, ...transaction } = this.toObject();
  transaction.uid = _id;
  return transaction;
};

module.exports = model("Transaction", TransactionSchema);
