const { DateTime } = require('luxon');
const {Schema, model} = require('mongoose')

const ProductSchema = Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        unique: true
    },
    model: {
        type: String,
    },
    brand: {
        type: String,
    },
    urlVideo : {
        type: String,
    },
    estado: {
        type: Boolean,
        default: true,
        required: true
    },
    countryCodes: 
    [
        {
            countryCode: {type: String},
        },
    ],
    cities: [
        {
            city: {type: String},
        },
    ],
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Campo para categoría directa (productos legacy o simples)
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: false
    },
    // Campo para subcategoría (productos con estructura jerárquica)
    subCategory: {
        type: Schema.Types.ObjectId,
        ref: 'SubCategory',
        required: false
    },
    price: {
        type: Number,
        default: 0
    },
    commission: {
        type: Number,
        default: 0
    },
    points: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0
    },
    discount: [
        {
          type: { type: String,},
          price: { type: Number},
        },
      ],
    barcode:  { type: String,},
    deliveryTime: { type: String },
    description: { type: String },
    available: { type: String, default: true },
    img: { type: String }, // Imagen principal
    images: [{ type: String }] // Array de imágenes adicionales
},{
    timestamps: true,
    versionKey: false
});

// Validación personalizada: debe tener category O subCategory
ProductSchema.pre('validate', function(next) {
    if (!this.category && !this.subCategory) {
        const error = new Error('El producto debe tener una categoría o subcategoría');
        error.name = 'ValidationError';
        return next(error);
    }
    
    if (this.category && this.subCategory) {
        const error = new Error('El producto no puede tener categoría y subcategoría al mismo tiempo');
        error.name = 'ValidationError';
        return next(error);
    }
    
    next();
});

// Método para obtener la categoría (directa o a través de subcategoría)
ProductSchema.methods.getCategory = async function() {
    if (this.category) {
        await this.populate('category', 'name');
        return this.category;
    }
    
    if (this.subCategory) {
        await this.populate({
            path: 'subCategory',
            select: 'name category',
            populate: {
                path: 'category',
                select: 'name'
            }
        });
        return this.subCategory.category;
    }
    
    return null;
};

// Método para determinar el tipo de clasificación
ProductSchema.methods.getClassificationType = function() {
    if (this.category) return 'category';
    if (this.subCategory) return 'subCategory';
    return 'none';
};

ProductSchema.methods.toJSON = function() {
    const {estado, _id,...data } = this.toObject();
    data.uid = _id;
    return data;
}

module.exports = model('Product', ProductSchema);