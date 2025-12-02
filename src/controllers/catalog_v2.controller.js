const { response, request } = require('express');
const Catalog = require('../models/catalog.model');
const Product = require('../models/product.model');

/**
 * 🆕 CREAR CATÁLOGO
 * POST /api/catalogs-v2/create
 */
const createCatalog = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { name, description, settings, products = [] } = req.body;

        console.log('📚 Creando catálogo:', name);

        // Validar que el nombre no esté duplicado para este usuario
        const existingCatalog = await Catalog.findOne({
            owner: uid,
            name: name,
            isActive: true
        });

        if (existingCatalog) {
            return res.status(400).json({
                success: false,
                msg: 'Ya tienes un catálogo con ese nombre'
            });
        }

        // Crear catálogo
        const catalogData = {
            name,
            description,
            owner: uid,
            isActive: true,
            settings: settings || {},
            products: [],
            stats: {
                views: 0,
                totalProducts: 0
            }
        };

        const catalog = new Catalog(catalogData);

        // Agregar productos si se enviaron
        if (products && products.length > 0) {
            for (const item of products) {
                // Validar que el producto existe
                const product = await Product.findOne({
                    _id: item.productId,
                    estado: true
                });

                if (!product) {
                    continue; // Saltar productos que no existen
                }

                catalog.products.push({
                    product: item.productId,
                    catalogConfig: {
                        customPrice: item.customPrice,
                        sellerCommission: item.sellerCommission || 0,
                        isAvailable: item.isAvailable !== false,
                        position: item.position || catalog.products.length,
                        sellerNotes: item.sellerNotes || '',
                        customTags: item.customTags || [],
                        isFeatured: item.isFeatured || false
                    },
                    addedAt: new Date()
                });
            }

            catalog.stats.totalProducts = catalog.products.length;
        }

        await catalog.save();

        // Popular productos
        await catalog.populate({
            path: 'products.product',
            select: 'name images pricing brand category subCategory',
            populate: [
                { path: 'brand', select: 'name logo' },
                { path: 'category', select: 'name' },
                { path: 'subCategory', select: 'name' }
            ]
        });

        console.log('✅ Catálogo creado:', catalog._id);

        res.status(201).json({
            success: true,
            msg: 'Catálogo creado exitosamente',
            catalog: {
                _id: catalog._id,
                name: catalog.name,
                description: catalog.description,
                settings: catalog.settings,
                totalProducts: catalog.stats.totalProducts,
                products: catalog.products,
                createdAt: catalog.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error al crear catálogo:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al crear el catálogo',
            error: error.message
        });
    }
};

/**
 * 🆕 AGREGAR PRODUCTOS A CATÁLOGO
 * POST /api/catalogs-v2/:id/products
 */
const addProductsToCatalog = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { id } = req.params;
        const { products = [] } = req.body;

        console.log('➕ Agregando productos al catálogo:', id);

        // Buscar catálogo
        const catalog = await Catalog.findOne({
            _id: id,
            owner: uid,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                success: false,
                msg: 'Catálogo no encontrado'
            });
        }

        if (!products || products.length === 0) {
            return res.status(400).json({
                success: false,
                msg: 'Debes proporcionar al menos un producto'
            });
        }

        let added = 0;
        let skipped = 0;

        for (const item of products) {
            // Verificar que el producto existe
            const product = await Product.findOne({
                _id: item.productId,
                estado: true
            });

            if (!product) {
                skipped++;
                continue;
            }

            // Verificar si ya existe en el catálogo
            const exists = catalog.products.some(
                p => p.product.toString() === item.productId.toString()
            );

            if (exists) {
                skipped++;
                continue;
            }

            // Agregar producto
            catalog.products.push({
                product: item.productId,
                catalogConfig: {
                    customPrice: item.customPrice,
                    sellerCommission: item.sellerCommission || 0,
                    isAvailable: item.isAvailable !== false,
                    position: item.position || catalog.products.length,
                    sellerNotes: item.sellerNotes || '',
                    customTags: item.customTags || [],
                    isFeatured: item.isFeatured || false
                },
                addedAt: new Date()
            });

            added++;
        }

        catalog.stats.totalProducts = catalog.products.filter(
            p => p.catalogConfig.isAvailable
        ).length;

        await catalog.save();

        console.log(`✅ Productos agregados: ${added}, Omitidos: ${skipped}`);

        res.json({
            success: true,
            msg: `${added} producto(s) agregado(s) exitosamente`,
            added,
            skipped,
            totalProducts: catalog.stats.totalProducts
        });

    } catch (error) {
        console.error('❌ Error al agregar productos:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al agregar productos',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER MIS CATÁLOGOS
 * GET /api/catalogs-v2/my-catalogs
 */
const getMyCatalogs = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { limit = 20, skip = 0 } = req.query;

        console.log('📚 Obteniendo catálogos de usuario:', uid);

        const [total, catalogs] = await Promise.all([
            Catalog.countDocuments({ owner: uid, isActive: true }),
            Catalog.find({ owner: uid, isActive: true })
                .select('name description settings stats createdAt updatedAt')
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(Number(skip))
                .lean()
        ]);

        res.json({
            success: true,
            total,
            catalogs,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('❌ Error al obtener catálogos:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener catálogos',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER DETALLE DE CATÁLOGO
 * GET /api/catalogs-v2/:id
 */
const getCatalogDetail = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { id } = req.params;

        console.log('📖 Obteniendo detalle de catálogo:', id);

        const catalog = await Catalog.findOne({
            _id: id,
            owner: uid,
            isActive: true
        })
        .populate({
            path: 'products.product',
            select: 'name images pricing brand category subCategory filters',
            populate: [
                { path: 'brand', select: 'name logo' },
                { path: 'category', select: 'name' },
                { path: 'subCategory', select: 'name' }
            ]
        })
        .lean();

        if (!catalog) {
            return res.status(404).json({
                success: false,
                msg: 'Catálogo no encontrado'
            });
        }

        res.json({
            success: true,
            catalog
        });

    } catch (error) {
        console.error('❌ Error al obtener catálogo:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener catálogo',
            error: error.message
        });
    }
};

/**
 * 🆕 ELIMINAR PRODUCTO DEL CATÁLOGO
 * DELETE /api/catalogs-v2/:id/products/:productId
 */
const removeProductFromCatalog = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { id, productId } = req.params;

        console.log('🗑️ Eliminando producto del catálogo:', productId);

        const catalog = await Catalog.findOne({
            _id: id,
            owner: uid,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                success: false,
                msg: 'Catálogo no encontrado'
            });
        }

        const initialLength = catalog.products.length;
        catalog.products = catalog.products.filter(
            p => p.product.toString() !== productId.toString()
        );

        if (catalog.products.length === initialLength) {
            return res.status(404).json({
                success: false,
                msg: 'Producto no encontrado en el catálogo'
            });
        }

        catalog.stats.totalProducts = catalog.products.filter(
            p => p.catalogConfig.isAvailable
        ).length;

        await catalog.save();

        res.json({
            success: true,
            msg: 'Producto eliminado del catálogo',
            totalProducts: catalog.stats.totalProducts
        });

    } catch (error) {
        console.error('❌ Error al eliminar producto:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al eliminar producto',
            error: error.message
        });
    }
};

/**
 * 🆕 ACTUALIZAR CATÁLOGO
 * PUT /api/catalogs-v2/:id
 */
const updateCatalog = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { id } = req.params;
        const { name, description, settings } = req.body;

        console.log('✏️ Actualizando catálogo:', id);

        const catalog = await Catalog.findOne({
            _id: id,
            owner: uid,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                success: false,
                msg: 'Catálogo no encontrado'
            });
        }

        // Actualizar campos
        if (name) catalog.name = name;
        if (description !== undefined) catalog.description = description;
        if (settings) catalog.settings = { ...catalog.settings, ...settings };

        await catalog.save();

        res.json({
            success: true,
            msg: 'Catálogo actualizado exitosamente',
            catalog: {
                _id: catalog._id,
                name: catalog.name,
                description: catalog.description,
                settings: catalog.settings,
                updatedAt: catalog.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Error al actualizar catálogo:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al actualizar catálogo',
            error: error.message
        });
    }
};

/**
 * 🆕 ELIMINAR CATÁLOGO
 * DELETE /api/catalogs-v2/:id
 */
const deleteCatalog = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { id } = req.params;

        console.log('🗑️ Eliminando catálogo:', id);

        const catalog = await Catalog.findOne({
            _id: id,
            owner: uid,
            isActive: true
        });

        if (!catalog) {
            return res.status(404).json({
                success: false,
                msg: 'Catálogo no encontrado'
            });
        }

        catalog.isActive = false;
        await catalog.save();

        res.json({
            success: true,
            msg: 'Catálogo eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al eliminar catálogo:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al eliminar catálogo',
            error: error.message
        });
    }
};

module.exports = {
    createCatalog,
    addProductsToCatalog,
    getMyCatalogs,
    getCatalogDetail,
    removeProductFromCatalog,
    updateCatalog,
    deleteCatalog
};
