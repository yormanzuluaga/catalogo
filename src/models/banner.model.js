const { Schema, model } = require('mongoose');

const BannerSchema = Schema({
    // Información básica del banner
    title: {
        type: String,
        required: [true, 'El título del banner es obligatorio'],
        trim: true,
        maxlength: [100, 'El título no puede exceder 100 caracteres']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [300, 'La descripción no puede exceder 300 caracteres']
    },

    // Imagen del banner
    imageUrl: {
        type: String,
        required: [true, 'La imagen del banner es obligatoria']
    },

    // Tipo de banner (para filtrar diferentes carousels)
    type: {
        type: String,
        enum: ['home', 'category', 'promotion', 'new_products', 'best_sellers', 'custom'],
        default: 'home'
    },

    // Estado del banner
    isActive: {
        type: Boolean,
        default: true
    },

    // Orden de aparición en el carousel
    position: {
        type: Number,
        default: 0
    },

    // Fechas de vigencia (opcional)
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },

    // Acción del banner
    action: {
        // Tipo de acción: products (lista de productos), category, url, none
        type: {
            type: String,
            enum: ['products', 'category', 'subcategory', 'url', 'none'],
            default: 'products'
        },

        // Lista de productos relacionados (si action.type = 'products')
        products: [{
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }],

        // Categoría relacionada (si action.type = 'category')
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },

        // Subcategoría relacionada (si action.type = 'subcategory')
        subCategory: {
            type: Schema.Types.ObjectId,
            ref: 'SubCategory'
        },

        // URL externa (si action.type = 'url')
        url: {
            type: String
        }
    },

    // Configuración de visualización
    settings: {
        // Color de fondo
        backgroundColor: {
            type: String,
            default: '#FFFFFF'
        },
        // Color de texto
        textColor: {
            type: String,
            default: '#000000'
        },
        // Mostrar título en el banner
        showTitle: {
            type: Boolean,
            default: true
        },
        // Mostrar descripción en el banner
        showDescription: {
            type: Boolean,
            default: true
        }
    },

    // Estadísticas
    stats: {
        views: {
            type: Number,
            default: 0
        },
        clicks: {
            type: Number,
            default: 0
        },
        lastViewed: {
            type: Date
        }
    },

    // Usuario creador (admin)
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: true,
    versionKey: false
});

// Índices
BannerSchema.index({ type: 1, isActive: 1, position: 1 });
BannerSchema.index({ startDate: 1, endDate: 1 });
BannerSchema.index({ isActive: 1, position: 1 });

// Método para verificar si el banner está vigente
BannerSchema.methods.isValid = function () {
    const now = new Date();

    if (!this.isActive) return false;
    if (this.startDate && this.startDate > now) return false;
    if (this.endDate && this.endDate < now) return false;

    return true;
};

// Método para incrementar vistas
BannerSchema.methods.incrementViews = async function () {
    this.stats.views += 1;
    this.stats.lastViewed = new Date();
    return this.save();
};

// Método para incrementar clicks
BannerSchema.methods.incrementClicks = async function () {
    this.stats.clicks += 1;
    return this.save();
};

module.exports = model('Banner', BannerSchema);
