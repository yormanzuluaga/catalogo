const { response, request } = require('express');
const Catalog = require('../models/catalog.model');
const Product = require('../models/product.model');

const catalogCtrl = {};

// ========== GESTIÓN DE CATÁLOGOS ==========

// Crear nuevo catálogo
catalogCtrl.createCatalog = async (req = request, res = response) => {
    try {
        const { name, description, settings = {} } = req.body;
        const userId = req.user._id;

        // Verificar si el usuario ya tiene un catálogo con el mismo nombre
        const existingCatalog = await Catalog.findOne({
            owner: userId,
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            isActive: true
        });

        if (existingCatalog) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya tienes un catálogo con ese nombre'
            });
        }

        // Crear nuevo catálogo
        const catalog = new Catalog({
            name,
            description,
            owner: userId,
            settings: {
                ...settings,
                contactInfo: {
                    email: req.user.email,
                    ...settings.contactInfo
                }
            }
        });

        await catalog.save();

        // Poblar datos del propietario
        await catalog.populate('owner', 'firstName lastName email');

        res.status(201).json({
            ok: true,
            msg: 'Catálogo creado exitosamente',
            catalog
        });

    } catch (error) {
        console.error('Error creando catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener catálogos del usuario
catalogCtrl.getUserCatalogs = async (req = request, res = response) => {
    try {
        const userId = req.user._id;
        const { limit = 10, from = 0, includeInactive = false } = req.query;

        const query = { owner: userId };
        if (!includeInactive) {
            query.isActive = true;
        }

        const [totalCatalogs, catalogs] = await Promise.all([
            Catalog.countDocuments(query),
            Catalog.find(query)
                .populate('owner', 'firstName lastName email')
                .populate('products.product', 'name brand pricing.salePrice images')
                .sort({ createdAt: -1 })
                .skip(Number(from))
                .limit(Number(limit))
        ]);

        res.json({
            ok: true,
            totalCatalogs,
            catalogs,
            pagination: {
                from: Number(from),
                limit: Number(limit),
                hasMore: (Number(from) + Number(limit)) < totalCatalogs
            }
        });

    } catch (error) {
        console.error('Error obteniendo catálogos del usuario:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener catálogo específico
catalogCtrl.getCatalog = async (req = request, res = response) => {
    try {
        const { catalogId } = req.params;
        const userId = req.user._id;

        const catalog = await Catalog.findOne({
            _id: catalogId,
            $or: [
                { owner: userId }, // Propietario puede ver siempre
                { 'settings.isPublic': true, isActive: true } // Público y activo
            ]
        })
        .populate('owner', 'firstName lastName email')
        .populate({
            path: 'products.product',
            select: 'name brand model pricing images category subCategory stock variants',
            populate: [
                { path: 'category', select: 'name' },
                { path: 'subCategory', select: 'name' }
            ]
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado o sin permisos para verlo'
            });
        }

        // Incrementar contador de vistas si no es el propietario
        if (catalog.owner._id.toString() !== userId.toString()) {
            catalog.stats.views += 1;
            catalog.stats.lastViewed = new Date();
            await catalog.save();
        }

        res.json({
            ok: true,
            catalog
        });

    } catch (error) {
        console.error('Error obteniendo catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Actualizar catálogo
catalogCtrl.updateCatalog = async (req = request, res = response) => {
    try {
        const { catalogId } = req.params;
        const userId = req.user._id;
        const updates = req.body;

        // Verificar que el catálogo pertenezca al usuario
        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Campos permitidos para actualizar
        const allowedUpdates = ['name', 'description', 'settings', 'favoriteCategories', 'favoriteSubCategories', 'favoriteBrands'];
        const updateData = {};

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        });

        // Actualizar catálogo
        const updatedCatalog = await Catalog.findByIdAndUpdate(
            catalogId,
            updateData,
            { new: true, runValidators: true }
        ).populate('owner', 'firstName lastName email');

        res.json({
            ok: true,
            msg: 'Catálogo actualizado exitosamente',
            catalog: updatedCatalog
        });

    } catch (error) {
        console.error('Error actualizando catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Eliminar catálogo (soft delete)
catalogCtrl.deleteCatalog = async (req = request, res = response) => {
    try {
        const { catalogId } = req.params;
        const userId = req.user._id;

        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Soft delete
        catalog.isActive = false;
        await catalog.save();

        res.json({
            ok: true,
            msg: 'Catálogo eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ========== GESTIÓN DE PRODUCTOS EN CATÁLOGOS ==========

// Agregar producto al catálogo
catalogCtrl.addProductToCatalog = async (req = request, res = response) => {
    try {
        const { catalogId, productId } = req.params;
        const { catalogConfig = {} } = req.body;
        const userId = req.user._id;

        // Verificar que el catálogo pertenezca al usuario
        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Verificar que el producto exista
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                ok: false,
                msg: 'Producto no encontrado'
            });
        }

        // Verificar si el producto ya está en el catálogo
        const existingProduct = catalog.products.find(p => p.product.toString() === productId);
        if (existingProduct) {
            return res.status(400).json({
                ok: false,
                msg: 'El producto ya está en este catálogo'
            });
        }

        // Agregar producto al catálogo
        catalog.addProduct(productId, catalogConfig);
        await catalog.save();

        // Poblar el producto agregado
        await catalog.populate({
            path: 'products.product',
            select: 'name brand pricing.salePrice images'
        });

        const addedProduct = catalog.products.find(p => p.product._id.toString() === productId);

        res.status(201).json({
            ok: true,
            msg: 'Producto agregado al catálogo exitosamente',
            product: addedProduct
        });

    } catch (error) {
        console.error('Error agregando producto al catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: error.message || 'Error interno del servidor',
            error: error.message
        });
    }
};

// Remover producto del catálogo
catalogCtrl.removeProductFromCatalog = async (req = request, res = response) => {
    try {
        const { catalogId, productId } = req.params;
        const userId = req.user._id;

        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Verificar si el producto está en el catálogo
        const productExists = catalog.products.find(p => p.product.toString() === productId);
        if (!productExists) {
            return res.status(404).json({
                ok: false,
                msg: 'Producto no encontrado en el catálogo'
            });
        }

        // Remover producto
        catalog.removeProduct(productId);
        await catalog.save();

        res.json({
            ok: true,
            msg: 'Producto removido del catálogo exitosamente'
        });

    } catch (error) {
        console.error('Error removiendo producto del catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Actualizar configuración de producto en catálogo
catalogCtrl.updateProductInCatalog = async (req = request, res = response) => {
    try {
        const { catalogId, productId } = req.params;
        const { catalogConfig } = req.body;
        const userId = req.user._id;

        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Actualizar configuración del producto
        catalog.updateProductConfig(productId, catalogConfig);
        await catalog.save();

        res.json({
            ok: true,
            msg: 'Configuración del producto actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando producto en catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: error.message || 'Error interno del servidor',
            error: error.message
        });
    }
};

// Reordenar productos en catálogo
catalogCtrl.reorderProducts = async (req = request, res = response) => {
    try {
        const { catalogId } = req.params;
        const { productOrder } = req.body; // Array de IDs en el orden deseado
        const userId = req.user._id;

        if (!Array.isArray(productOrder)) {
            return res.status(400).json({
                ok: false,
                msg: 'El orden de productos debe ser un array'
            });
        }

        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Reordenar productos
        catalog.reorderProducts(productOrder);
        await catalog.save();

        res.json({
            ok: true,
            msg: 'Productos reordenados exitosamente'
        });

    } catch (error) {
        console.error('Error reordenando productos:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ========== BÚSQUEDA Y FILTROS ==========

// Buscar productos para agregar al catálogo
catalogCtrl.searchProductsForCatalog = async (req = request, res = response) => {
    try {
        const { catalogId } = req.params;
        const { 
            search = '', 
            category, 
            subCategory, 
            brand, 
            limit = 20, 
            from = 0 
        } = req.query;
        const userId = req.user._id;

        // Verificar que el catálogo pertenezca al usuario
        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Construir query de búsqueda
        let query = { estado: true };

        // Excluir productos que ya están en el catálogo
        const catalogProductIds = catalog.products.map(p => p.product);
        if (catalogProductIds.length > 0) {
            query._id = { $nin: catalogProductIds };
        }

        // Filtros de búsqueda
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (brand) query.brand = { $regex: new RegExp(`^${brand}$`, 'i') };

        const [totalProducts, products] = await Promise.all([
            Product.countDocuments(query),
            Product.find(query)
                .select('name brand pricing.salePrice images category subCategory stock')
                .populate('category', 'name')
                .populate('subCategory', 'name')
                .sort({ createdAt: -1 })
                .skip(Number(from))
                .limit(Number(limit))
        ]);

        res.json({
            ok: true,
            totalProducts,
            products,
            pagination: {
                from: Number(from),
                limit: Number(limit),
                hasMore: (Number(from) + Number(limit)) < totalProducts
            }
        });

    } catch (error) {
        console.error('Error buscando productos para catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener catálogos públicos
catalogCtrl.getPublicCatalogs = async (req = request, res = response) => {
    try {
        const { limit = 10, from = 0, search = '' } = req.query;

        let query = {
            'settings.isPublic': true,
            isActive: true
        };

        // Búsqueda por nombre del catálogo o propietario
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const [totalCatalogs, catalogs] = await Promise.all([
            Catalog.countDocuments(query),
            Catalog.find(query)
                .populate('owner', 'firstName lastName')
                .select('name description settings.theme stats owner createdAt')
                .sort({ 'stats.views': -1, createdAt: -1 })
                .skip(Number(from))
                .limit(Number(limit))
        ]);

        res.json({
            ok: true,
            totalCatalogs,
            catalogs,
            pagination: {
                from: Number(from),
                limit: Number(limit),
                hasMore: (Number(from) + Number(limit)) < totalCatalogs
            }
        });

    } catch (error) {
        console.error('Error obteniendo catálogos públicos:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener estadísticas del catálogo
catalogCtrl.getCatalogStats = async (req = request, res = response) => {
    try {
        const { catalogId } = req.params;
        const userId = req.user._id;

        const catalog = await Catalog.findOne({
            _id: catalogId,
            owner: userId,
            isActive: true
        }).populate({
            path: 'products.product',
            select: 'pricing.salePrice category subCategory brand'
        });

        if (!catalog) {
            return res.status(404).json({
                ok: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Calcular estadísticas
        const activeProducts = catalog.getActiveProducts();
        const featuredProducts = catalog.getFeaturedProducts();
        
        const stats = {
            totalProducts: catalog.stats.totalProducts,
            activeProducts: activeProducts.length,
            featuredProducts: featuredProducts.length,
            views: catalog.stats.views,
            lastViewed: catalog.stats.lastViewed,
            
            // Estadísticas de precios
            pricing: {
                averagePrice: 0,
                minPrice: 0,
                maxPrice: 0,
                totalValue: 0
            },
            
            // Distribución por categorías
            categories: {},
            brands: {},
            
            // Comisiones totales
            totalCommissions: 0
        };

        if (activeProducts.length > 0) {
            const prices = activeProducts.map(p => {
                const price = p.catalogConfig.customPrice || p.product.pricing.salePrice;
                stats.totalCommissions += p.catalogConfig.sellerCommission || 0;
                return price;
            });

            stats.pricing.averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            stats.pricing.minPrice = Math.min(...prices);
            stats.pricing.maxPrice = Math.max(...prices);
            stats.pricing.totalValue = prices.reduce((a, b) => a + b, 0);

            // Agrupar por categorías y marcas
            activeProducts.forEach(p => {
                const categoryName = p.product.category?.name || p.product.subCategory?.name || 'Sin categoría';
                const brandName = p.product.brand || 'Sin marca';

                stats.categories[categoryName] = (stats.categories[categoryName] || 0) + 1;
                stats.brands[brandName] = (stats.brands[brandName] || 0) + 1;
            });
        }

        res.json({
            ok: true,
            stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas del catálogo:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = catalogCtrl;
