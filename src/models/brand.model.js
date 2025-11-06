const { Schema, model } = require('mongoose')

const BrandSchema = Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la marca es obligatorio'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    logo: {
        type: String, // URL de la imagen/logo de la marca
        default: null
    },
    website: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    country: {
        type: String,
        trim: true
    },
    founded: {
        type: Date
    },
    colors: {
        primary: {
            type: String,
            default: '#000000' // Color principal de la marca
        },
        secondary: {
            type: String,
            default: '#FFFFFF' // Color secundario de la marca
        }
    },
    socialMedia: {
        instagram: { type: String, trim: true },
        facebook: { type: String, trim: true },
        twitter: { type: String, trim: true },
        linkedin: { type: String, trim: true }
    },
    contact: {
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        address: { type: String, trim: true }
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    estado: {
        type: Boolean,
        default: true,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices para optimizar consultas
BrandSchema.index({ name: 1 });
BrandSchema.index({ estado: 1 });
BrandSchema.index({ isActive: 1 });

// Método para transformar el JSON response
BrandSchema.methods.toJSON = function() {
    const { estado, _id, ...data } = this.toObject();
    data.uid = _id;
    return data;
}

// Método estático para buscar marcas activas
BrandSchema.statics.findActive = function() {
    return this.find({ estado: true, isActive: true });
}

// Método estático para contar productos por marca
BrandSchema.statics.getProductCount = async function(brandId) {
    const Product = require('./product.model');
    return await Product.countDocuments({ brand: brandId, estado: true });
}

module.exports = model('Brand', BrandSchema);
