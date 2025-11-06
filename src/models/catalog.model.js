const { Schema, model } = require('mongoose');

const CatalogSchema = Schema({
    // Información básica del catálogo
    name: {
        type: String,
        required: [true, 'El nombre del catálogo es obligatorio'],
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción no puede exceder 500 caracteres']
    },
    
    // Propietario del catálogo
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El propietario del catálogo es obligatorio']
    },
    
    // Estado del catálogo
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Configuración del catálogo
    settings: {
        // Si es público (visible para otros usuarios)
        isPublic: {
            type: Boolean,
            default: false
        },
        // Permitir a otros usuarios ver precios
        showPrices: {
            type: Boolean,
            default: true
        },
        // Tema/colores del catálogo
        theme: {
            primaryColor: {
                type: String,
                default: '#007bff'
            },
            secondaryColor: {
                type: String,
                default: '#6c757d'
            },
            logoUrl: {
                type: String
            }
        },
        // Información de contacto del vendedor
        contactInfo: {
            phone: {
                type: String,
                trim: true
            },
            email: {
                type: String,
                trim: true
            },
            whatsapp: {
                type: String,
                trim: true
            },
            socialMedia: {
                instagram: String,
                facebook: String,
                tiktok: String
            }
        }
    },
    
    // Productos en el catálogo
    products: [{
        // Referencia al producto original
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        
        // Configuración específica para este catálogo
        catalogConfig: {
            // Precio personalizado (si es diferente al producto original)
            customPrice: {
                type: Number,
                min: 0
            },
            
            // Comisión del vendedor para este producto
            sellerCommission: {
                type: Number,
                default: 0,
                min: 0
            },
            
            // Disponibilidad en este catálogo
            isAvailable: {
                type: Boolean,
                default: true
            },
            
            // Orden/posición del producto en el catálogo
            position: {
                type: Number,
                default: 0
            },
            
            // Notas específicas del vendedor sobre el producto
            sellerNotes: {
                type: String,
                maxlength: [300, 'Las notas no pueden exceder 300 caracteres']
            },
            
            // Tags personalizados para este catálogo
            customTags: [{
                type: String,
                trim: true
            }],
            
            // Si el producto está destacado en este catálogo
            isFeatured: {
                type: Boolean,
                default: false
            }
        },
        
        // Fechas de gestión
        addedAt: {
            type: Date,
            default: Date.now
        },
        lastModified: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Estadísticas del catálogo
    stats: {
        views: {
            type: Number,
            default: 0
        },
        totalProducts: {
            type: Number,
            default: 0
        },
        lastViewed: {
            type: Date
        }
    },
    
    // Categorías favoritas del vendedor
    favoriteCategories: [{
        type: Schema.Types.ObjectId,
        ref: 'Category'
    }],
    
    // Subcategorías favoritas del vendedor
    favoriteSubCategories: [{
        type: Schema.Types.ObjectId,
        ref: 'SubCategory'
    }],
    
    // Marcas favoritas del vendedor
    favoriteBrands: [{
        type: String,
        trim: true
    }]
    
}, {
    timestamps: true,
    versionKey: false
});

// Índices para mejorar rendimiento
CatalogSchema.index({ owner: 1 });
CatalogSchema.index({ owner: 1, isActive: 1 });
CatalogSchema.index({ 'settings.isPublic': 1, isActive: 1 });
CatalogSchema.index({ 'products.product': 1 });

// Middleware para actualizar estadísticas
CatalogSchema.pre('save', function(next) {
    if (this.isModified('products')) {
        this.stats.totalProducts = this.products.filter(p => p.catalogConfig.isAvailable).length;
    }
    next();
});

// Método para agregar producto al catálogo
CatalogSchema.methods.addProduct = function(productId, config = {}) {
    // Verificar si el producto ya existe en el catálogo
    const existingProduct = this.products.find(p => p.product.toString() === productId.toString());
    
    if (existingProduct) {
        throw new Error('El producto ya existe en este catálogo');
    }
    
    // Configuración por defecto
    const defaultConfig = {
        isAvailable: true,
        position: this.products.length,
        isFeatured: false,
        sellerCommission: 0,
        ...config
    };
    
    this.products.push({
        product: productId,
        catalogConfig: defaultConfig,
        addedAt: new Date()
    });
    
    return this;
};

// Método para remover producto del catálogo
CatalogSchema.methods.removeProduct = function(productId) {
    this.products = this.products.filter(p => p.product.toString() !== productId.toString());
    return this;
};

// Método para actualizar configuración de producto
CatalogSchema.methods.updateProductConfig = function(productId, newConfig) {
    const productIndex = this.products.findIndex(p => p.product.toString() === productId.toString());
    
    if (productIndex === -1) {
        throw new Error('Producto no encontrado en el catálogo');
    }
    
    // Actualizar configuración
    this.products[productIndex].catalogConfig = {
        ...this.products[productIndex].catalogConfig,
        ...newConfig
    };
    
    this.products[productIndex].lastModified = new Date();
    
    return this;
};

// Método para reordenar productos
CatalogSchema.methods.reorderProducts = function(productOrder) {
    productOrder.forEach((productId, index) => {
        const product = this.products.find(p => p.product.toString() === productId.toString());
        if (product) {
            product.catalogConfig.position = index;
        }
    });
    
    // Ordenar array según posiciones
    this.products.sort((a, b) => a.catalogConfig.position - b.catalogConfig.position);
    
    return this;
};

// Método para obtener productos activos
CatalogSchema.methods.getActiveProducts = function() {
    return this.products.filter(p => p.catalogConfig.isAvailable);
};

// Método para obtener productos destacados
CatalogSchema.methods.getFeaturedProducts = function() {
    return this.products.filter(p => p.catalogConfig.isAvailable && p.catalogConfig.isFeatured);
};

// Método estático para buscar catálogos públicos
CatalogSchema.statics.findPublicCatalogs = function(filters = {}) {
    return this.find({
        'settings.isPublic': true,
        isActive: true,
        ...filters
    }).populate('owner', 'firstName lastName email');
};

// Validaciones
CatalogSchema.path('products').validate(function(products) {
    return products.length <= 1000; // Límite de productos por catálogo
}, 'Un catálogo no puede tener más de 1000 productos');

// Virtual para URL del catálogo
CatalogSchema.virtual('catalogUrl').get(function() {
    return `/catalog/${this.owner}/${this._id}`;
});

// Virtual para conteo de productos activos
CatalogSchema.virtual('activeProductsCount').get(function() {
    return this.products.filter(p => p.catalogConfig.isAvailable).length;
});

// Configurar virtuals en JSON
CatalogSchema.set('toJSON', { virtuals: true });
CatalogSchema.set('toObject', { virtuals: true });

module.exports = model('Catalog', CatalogSchema);
