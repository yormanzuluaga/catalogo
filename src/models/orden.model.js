const { Schema, model } = require("mongoose");

const OrdenSchema = Schema(
  {
    items: [
      {
        name: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        model: { type: String },
        description: { type: String },
        countryCodes: [
          {
            countryCode: { type: String },
          },
        ],
        cities: [
          {
            city: { type: String },
          },
        ],
        deliveryTime: { type: String },
        img: { type: String },
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        barcode: { type: String },
        estado: { type: Boolean, default: true },
        // Campos para comisiones
        basePrice: { type: Number }, // Precio base del producto
        margin: { type: Number }, // Margen de ganancia
        commission: { type: Number }, // Comisión calculada
        points: { type: Number } // Puntos generados
      },
    ],
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    phone: { type: String, required: true },
    discount: [
      {
        type: { type: String },
        price: { type: Number },
      },
    ],
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    collaborator: {
      type: String,
    },
    name: { type: String, required: true },
    date: { type: Date },
    estado: { type: Boolean, default: true, required: true },
    
    // Nuevos campos para el sistema de comisiones
    totalCommission: { type: Number, default: 0 }, // Total de comisión de la orden
    totalPoints: { type: Number, default: 0 }, // Total de puntos de la orden
    commissionStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    commissionProcessedAt: { type: Date },
    commissionProcessedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Estado de la orden
    orderStatus: {
      type: String,
      enum: ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'confirmed'
    },
    
    // Tracking
    tracking: {
      confirmedAt: { type: Date, default: Date.now },
      processedAt: { type: Date },
      shippedAt: { type: Date },
      deliveredAt: { type: Date }
    },
    
    // Dirección del cliente
    customerAddress: {
      street: { type: String, required: true },
      neighborhood: { type: String },
      city: { type: String, required: true },
      department: { type: String, required: true },
      postalCode: { type: String },
      country: { type: String, default: 'Colombia' },
      additionalInfo: { type: String }, // Referencias adicionales
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },

    // Información de pago con Wompi
    payment: {
      provider: { type: String, default: 'wompi' },
      transaction_id: { type: String }, // ID de transacción en Wompi
      payment_link_id: { type: String }, // ID del link de pago
      status: {
        type: String,
        enum: ['pending', 'approved', 'declined', 'voided', 'error'],
        default: 'pending'
      },
      payment_method: { type: String }, // CARD, NEQUI, PSE, etc.
      amount_in_cents: { type: Number },
      currency: { type: String, default: 'COP' },
      reference: { type: String }, // Referencia única del pago
      approval_code: { type: String },
      receipt_url: { type: String },
      payment_date: { type: Date },
      payment_link_url: { type: String }, // URL de pago para el cliente
      webhook_events: [
        {
          event_type: { type: String },
          received_at: { type: Date, default: Date.now },
          data: { type: Schema.Types.Mixed }
        }
      ]
    },
  },
  { 
    timestamps: true,
    versionKey: false 
  }
);

// Middleware para calcular comisiones antes de guardar
OrdenSchema.pre('save', async function(next) {
  if (this.isModified('items') || this.isNew) {
    let totalCommission = 0;
    let totalPoints = 0;

    // Calcular comisión por cada item
    for (let item of this.items) {
      if (item.basePrice && item.price) {
        const margin = item.price - item.basePrice;
        const commission = (margin * 20) / 100; // 20% del margen
        const points = Math.floor((item.price * item.quantity) / 10000); // 1 punto por cada $10,000

        item.margin = margin;
        item.commission = commission * item.quantity;
        item.points = points;

        totalCommission += item.commission;
        totalPoints += item.points;
      }
    }

    this.totalCommission = totalCommission;
    this.totalPoints = totalPoints;
  }
  next();
});

// Método para aprobar comisiones
OrdenSchema.methods.approveCommission = function(approvedBy) {
  this.commissionStatus = 'approved';
  this.commissionProcessedAt = new Date();
  this.commissionProcessedBy = approvedBy;
  return this.save();
};

// Método para actualizar estado de la orden
OrdenSchema.methods.updateStatus = function(newStatus) {
  this.orderStatus = newStatus;
  
  const now = new Date();
  switch (newStatus) {
    case 'processing':
      this.tracking.processedAt = now;
      break;
    case 'shipped':
      this.tracking.shippedAt = now;
      break;
    case 'delivered':
      this.tracking.deliveredAt = now;
      break;
  }
  
  return this.save();
};

OrdenSchema.methods.toJSON = function() {
  const { _id, ...orden } = this.toObject();
  orden.uid = _id;
  return orden;
};

module.exports = model("Orden", OrdenSchema);
