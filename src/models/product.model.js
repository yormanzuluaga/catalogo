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
        type: Schema.Types.ObjectId,
        ref: 'Brand',
        required: [true, 'La marca es obligatoria']
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
    // Precios base (para productos sin variantes)
    basePrice: {
        type: Number,
        default: 0
    },
    // Información financiera del producto (principal - para productos simples o promedio de variantes)
    pricing: {
        costPrice: {
            type: Number,
            required: function() {
                return this.productType === 'simple';
            },
            min: 0,
            default: 0
        },
        salePrice: {
            type: Number,
            required: function() {
                return this.productType === 'simple';
            },
            min: 0,
            default: 0
        },
        profit: {
            amount: {
                type: Number,
                default: 0
            },
            percentage: {
                type: Number,
                default: 0
            }
        },
        commission: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    points: {
        earnPoints: {
            type: Number,
            default: 0,
            min: 0
        },
        redeemPoints: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Sistema de variantes para productos con diferentes opciones
    variants: [{
        // Identificador único de la variante
        sku: {
            type: String,
            required: true
        },
        // Opciones de la variante
        color: {
            name: { type: String }, // ej: "Rojo", "Azul"
            code: { type: String }  // ej: "#FF0000", "#0000FF"
        },
        size: {
            type: String // ej: "S", "M", "L", "XL", "38", "40", "42"
        },
        measurements: {
            length: { type: Number }, // largo en cm
            width: { type: Number },  // ancho en cm
            height: { type: Number }, // alto en cm
            weight: { type: Number }, // peso en gramos
            diameter: { type: Number }, // diámetro en cm (para productos circulares)
            custom: [{ // medidas personalizadas
                name: { type: String }, // ej: "Cintura", "Cadera"
                value: { type: Number },
                unit: { type: String, default: "cm" }
            }]
        },
        // Precios y ganancias específicos para esta variante
        pricing: {
            costPrice: {
                type: Number,
                required: true,
                min: 0
            },
            salePrice: {
                type: Number,
                required: true,
                min: 0
            },
            profit: {
                amount: {
                    type: Number,
                    default: 0
                },
                percentage: {
                    type: Number,
                    default: 0
                }
            },
            commission: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        points: {
            earnPoints: {
                type: Number,
                default: 0,
                min: 0
            },
            redeemPoints: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        stock: {
            type: Number,
            default: 0
        },
        // Imágenes específicas de esta variante
        images: [{ type: String }],
        // Códigos de barras específicos
        barcode: { type: String },
        // Disponibilidad de esta variante
        available: {
            type: Boolean,
            default: true
        }
    }],
    
    // Campos para productos simples (sin variantes)
    simpleProduct: {
        pricing: {
            costPrice: {
                type: Number,
                default: 0,
                min: 0
            },
            salePrice: {
                type: Number,
                default: 0,
                min: 0
            },
            profit: {
                amount: {
                    type: Number,
                    default: 0
                },
                percentage: {
                    type: Number,
                    default: 0
                }
            },
            commission: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        points: {
            earnPoints: {
                type: Number,
                default: 0,
                min: 0
            },
            redeemPoints: {
                type: Number,
                default: 0,
                min: 0
            }
        },
        stock: {
            type: Number,
            default: 0
        },
        quantity: {
            type: Number,
            default: 0
        },
        barcode: { type: String }
    },
    
    // Descuentos generales del producto
    discount: [
        {
          type: { type: String }, // ej: "percentage", "fixed"
          value: { type: Number }, // valor del descuento
          startDate: { type: Date },
          endDate: { type: Date },
          minQuantity: { type: Number, default: 1 }
        },
    ],
    
    deliveryTime: { type: String },
    description: { type: String },
    
    // Detalles del producto
    details: {
        specifications: [{
            name: { type: String }, // ej: "Material", "Peso", "Dimensiones"
            value: { type: String }, // ej: "Algodón 100%", "500g", "30x20x5cm"
            unit: { type: String } // ej: "cm", "kg", "litros"
        }],
        features: [{ type: String }], // características destacadas
        included: [{ type: String }], // qué incluye el producto
        instructions: { type: String }, // instrucciones de uso
        careInstructions: { type: String } // instrucciones de cuidado
    },
    
    // Información de garantía
    warranty: {
        hasWarranty: {
            type: Boolean,
            default: false
        },
        duration: {
            value: { type: Number }, // ej: 12, 24
            unit: { 
                type: String,
                enum: ['días', 'meses', 'años'],
                default: 'meses'
            }
        },
        type: {
            type: String,
            enum: ['fabricante', 'tienda', 'extendida', 'limitada'],
            default: 'tienda'
        },
        coverage: [{ type: String }], // qué cubre la garantía
        exclusions: [{ type: String }], // qué no cubre
        terms: { type: String }, // términos y condiciones
        contact: {
            phone: { type: String },
            email: { type: String },
            address: { type: String }
        }
    },
    
    available: { type: Boolean, default: true },
    
    // Imágenes principales del producto
    img: { type: String }, // Imagen principal
    images: [{ type: String }], // Array de imágenes adicionales generales
    
    // Tipo de producto
    productType: {
        type: String,
        enum: ['simple', 'variant'],
        default: 'simple'
    }
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
    
    // Validar que los SKUs de las variantes sean únicos
    if (this.productType === 'variant' && this.variants && this.variants.length > 0) {
        const skus = this.variants.map(v => v.sku);
        const uniqueSkus = [...new Set(skus)];
        if (skus.length !== uniqueSkus.length) {
            const error = new Error('Los SKUs de las variantes deben ser únicos');
            error.name = 'ValidationError';
            return next(error);
        }
    }
    
    next();
});

// Middleware para calcular automáticamente las ganancias
ProductSchema.pre('save', function(next) {
    // Calcular ganancia para productos simples
    if (this.productType === 'simple' && this.simpleProduct?.pricing) {
        const pricing = this.simpleProduct.pricing;
        if (pricing.costPrice && pricing.salePrice) {
            pricing.profit.amount = pricing.salePrice - pricing.costPrice;
            pricing.profit.percentage = pricing.costPrice > 0 
                ? ((pricing.profit.amount / pricing.costPrice) * 100).toFixed(2)
                : 0;
        }
    }
    
    // Calcular ganancia para variantes
    if (this.productType === 'variant' && this.variants) {
        this.variants.forEach(variant => {
            if (variant.pricing?.costPrice && variant.pricing?.salePrice) {
                variant.pricing.profit.amount = variant.pricing.salePrice - variant.pricing.costPrice;
                variant.pricing.profit.percentage = variant.pricing.costPrice > 0 
                    ? ((variant.pricing.profit.amount / variant.pricing.costPrice) * 100).toFixed(2)
                    : 0;
            }
        });
    }
    
    // Calcular ganancia para el producto base (compatibilidad hacia atrás)
    if (this.pricing?.costPrice && this.pricing?.salePrice) {
        this.pricing.profit.amount = this.pricing.salePrice - this.pricing.costPrice;
        this.pricing.profit.percentage = this.pricing.costPrice > 0 
            ? ((this.pricing.profit.amount / this.pricing.costPrice) * 100).toFixed(2)
            : 0;
    }
    
    next();
});

// Método para obtener el precio más bajo del producto
ProductSchema.methods.getMinPrice = function() {
    if (this.productType === 'simple') {
        return this.simpleProduct?.pricing?.salePrice || this.pricing?.salePrice || this.basePrice;
    }
    
    if (this.variants && this.variants.length > 0) {
        return Math.min(...this.variants.map(v => v.pricing?.salePrice || 0));
    }
    
    return this.pricing?.salePrice || this.basePrice;
};

// Método para obtener el precio más alto del producto
ProductSchema.methods.getMaxPrice = function() {
    if (this.productType === 'simple') {
        return this.simpleProduct?.pricing?.salePrice || this.pricing?.salePrice || this.basePrice;
    }
    
    if (this.variants && this.variants.length > 0) {
        return Math.max(...this.variants.map(v => v.pricing?.salePrice || 0));
    }
    
    return this.pricing?.salePrice || this.basePrice;
};

// Método para obtener el stock total
ProductSchema.methods.getTotalStock = function() {
    if (this.productType === 'simple') {
        return this.simpleProduct?.stock || 0;
    }
    
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((total, variant) => total + (variant.stock || 0), 0);
    }
    
    return 0;
};

// Método para calcular la ganancia total del producto
ProductSchema.methods.getTotalProfit = function() {
    if (this.productType === 'simple') {
        const pricing = this.simpleProduct?.pricing || this.pricing;
        return {
            amount: pricing?.profit?.amount || 0,
            percentage: pricing?.profit?.percentage || 0
        };
    }
    
    if (this.variants && this.variants.length > 0) {
        const totalAmount = this.variants.reduce((total, variant) => 
            total + (variant.pricing?.profit?.amount || 0), 0);
        const avgPercentage = this.variants.reduce((total, variant) => 
            total + (variant.pricing?.profit?.percentage || 0), 0) / this.variants.length;
        
        return {
            amount: totalAmount,
            percentage: avgPercentage || 0
        };
    }
    
    return { amount: 0, percentage: 0 };
};

// Método para obtener los puntos que se pueden ganar
ProductSchema.methods.getEarnablePoints = function() {
    if (this.productType === 'simple') {
        return this.simpleProduct?.points?.earnPoints || this.points?.earnPoints || 0;
    }
    
    if (this.variants && this.variants.length > 0) {
        return Math.max(...this.variants.map(v => v.points?.earnPoints || 0));
    }
    
    return this.points?.earnPoints || 0;
};

// Método para obtener variante por SKU
ProductSchema.methods.getVariantBySku = function(sku) {
    if (this.productType === 'variant' && this.variants) {
        return this.variants.find(variant => variant.sku === sku);
    }
    return null;
};

// Método para obtener todas las opciones de colores disponibles
ProductSchema.methods.getAvailableColors = function() {
    if (this.productType === 'variant' && this.variants) {
        const colors = this.variants
            .filter(v => v.color && v.color.name && v.available)
            .map(v => v.color);
        
        // Filtrar colores únicos por nombre
        const uniqueColors = colors.filter((color, index, arr) => 
            arr.findIndex(c => c.name === color.name) === index
        );
        
        return uniqueColors;
    }
    return [];
};

// Método para obtener todas las tallas disponibles
ProductSchema.methods.getAvailableSizes = function() {
    if (this.productType === 'variant' && this.variants) {
        return [...new Set(this.variants
            .filter(v => v.size && v.available)
            .map(v => v.size))];
    }
    return [];
};

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
    const {estado, _id, ...data } = this.toObject();
    data.uid = _id;
    
    // Agregar información calculada
    data.priceRange = {
        min: this.getMinPrice(),
        max: this.getMaxPrice()
    };
    data.totalStock = this.getTotalStock();
    data.totalProfit = this.getTotalProfit();
    data.earnablePoints = this.getEarnablePoints();
    
    if (this.productType === 'variant') {
        data.availableColors = this.getAvailableColors();
        data.availableSizes = this.getAvailableSizes();
        data.variantCount = this.variants ? this.variants.length : 0;
    }
    
    // Información de garantía resumida
    if (this.warranty?.hasWarranty) {
        data.warrantyInfo = {
            duration: `${this.warranty.duration?.value || 0} ${this.warranty.duration?.unit || 'meses'}`,
            type: this.warranty.type,
            hasWarranty: true
        };
    } else {
        data.warrantyInfo = { hasWarranty: false };
    }
    
    return data;
}

module.exports = model('Product', ProductSchema);