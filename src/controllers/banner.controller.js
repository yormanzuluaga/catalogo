const { response, request } = require('express');
const Banner = require('../models/banner.model');
const Product = require('../models/product.model');

/**
 * 🆕 CREAR BANNER
 * POST /api/banners/create
 */
const createBanner = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const {
            title,
            description,
            imageUrl,
            type,
            position,
            startDate,
            endDate,
            action,
            settings
        } = req.body;

        console.log('📸 Creando banner:', title);

        // Validar productos si se envían
        if (action?.type === 'products' && action?.products?.length > 0) {
            for (const productId of action.products) {
                const product = await Product.findById(productId);
                if (!product || !product.estado) {
                    return res.status(400).json({
                        success: false,
                        msg: `Producto con ID ${productId} no encontrado o inactivo`
                    });
                }
            }
        }

        const bannerData = {
            title,
            description,
            imageUrl,
            type: type || 'home',
            position: position || 0,
            startDate: startDate || new Date(),
            endDate,
            action: action || { type: 'none' },
            settings: settings || {},
            isActive: true,
            createdBy: uid,
            stats: {
                views: 0,
                clicks: 0
            }
        };

        const banner = new Banner(bannerData);
        await banner.save();

        console.log('✅ Banner creado:', banner._id);

        res.status(201).json({
            success: true,
            msg: 'Banner creado exitosamente',
            banner
        });

    } catch (error) {
        console.error('❌ Error al crear banner:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al crear el banner',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER BANNERS ACTIVOS
 * GET /api/banners
 */
const getBanners = async (req = request, res = response) => {
    try {
        const { type, limit = 10 } = req.query;

        console.log('📸 Obteniendo banners, tipo:', type || 'todos');

        const now = new Date();

        // Construir query
        const query = {
            isActive: true,
            $or: [
                { startDate: { $lte: now } },
                { startDate: null }
            ]
        };

        // Filtrar por tipo si se especifica
        if (type) {
            query.type = type;
        }

        // Filtrar por fecha de fin
        query.$and = [
            {
                $or: [
                    { endDate: { $gte: now } },
                    { endDate: null }
                ]
            }
        ];

        const banners = await Banner.find(query)
            .populate('action.products', 'name images pricing brand')
            .populate('action.category', 'name')
            .populate('action.subCategory', 'name')
            .sort({ position: 1, createdAt: -1 })
            .limit(Number(limit));

        console.log(`✅ ${banners.length} banners encontrados`);

        res.json({
            success: true,
            total: banners.length,
            banners
        });

    } catch (error) {
        console.error('❌ Error al obtener banners:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener banners',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER BANNER POR ID
 * GET /api/banners/:id
 */
const getBannerById = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id)
            .populate('action.products', 'name images pricing brand category subCategory')
            .populate('action.category', 'name')
            .populate('action.subCategory', 'name');

        if (!banner) {
            return res.status(404).json({
                success: false,
                msg: 'Banner no encontrado'
            });
        }

        res.json({
            success: true,
            banner
        });

    } catch (error) {
        console.error('❌ Error al obtener banner:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener banner',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER PRODUCTOS DE UN BANNER
 * GET /api/banners/:id/products
 */
const getBannerProducts = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { limit = 20, skip = 0 } = req.query;

        console.log('📦 Obteniendo productos del banner:', id);

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                msg: 'Banner no encontrado'
            });
        }

        if (!banner.isValid()) {
            return res.status(400).json({
                success: false,
                msg: 'Banner no vigente'
            });
        }

        // Incrementar vistas
        await banner.incrementViews();

        let products = [];

        // Si tiene productos asignados directamente
        if (banner.action.type === 'products' && banner.action.products.length > 0) {
            products = await Product.find({
                _id: { $in: banner.action.products },
                estado: true
            })
                .populate('brand', 'name logo')
                .populate('category', 'name')
                .populate('subCategory', 'name')
                .skip(Number(skip))
                .limit(Number(limit));
        }
        // Si es por categoría
        else if (banner.action.type === 'category' && banner.action.category) {
            products = await Product.find({
                category: banner.action.category,
                estado: true
            })
                .populate('brand', 'name logo')
                .populate('category', 'name')
                .sort({ createdAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit));
        }
        // Si es por subcategoría
        else if (banner.action.type === 'subcategory' && banner.action.subCategory) {
            products = await Product.find({
                subCategory: banner.action.subCategory,
                estado: true
            })
                .populate('brand', 'name logo')
                .populate('subCategory', 'name')
                .sort({ createdAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit));
        }

        console.log(`✅ ${products.length} productos encontrados`);

        res.json({
            success: true,
            banner: {
                _id: banner._id,
                title: banner.title,
                description: banner.description,
                type: banner.type
            },
            total: products.length,
            products
        });

    } catch (error) {
        console.error('❌ Error al obtener productos:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener productos del banner',
            error: error.message
        });
    }
};

/**
 * 🆕 REGISTRAR CLICK EN BANNER
 * POST /api/banners/:id/click
 */
const registerBannerClick = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                msg: 'Banner no encontrado'
            });
        }

        await banner.incrementClicks();

        res.json({
            success: true,
            msg: 'Click registrado'
        });

    } catch (error) {
        console.error('❌ Error al registrar click:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al registrar click',
            error: error.message
        });
    }
};

/**
 * 🆕 ACTUALIZAR BANNER
 * PUT /api/banners/:id
 */
const updateBanner = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { id } = req.params;
        const {
            title,
            description,
            imageUrl,
            type,
            position,
            startDate,
            endDate,
            action,
            settings,
            isActive
        } = req.body;

        console.log('✏️ Actualizando banner:', id);

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                msg: 'Banner no encontrado'
            });
        }

        // Actualizar campos
        if (title !== undefined) banner.title = title;
        if (description !== undefined) banner.description = description;
        if (imageUrl !== undefined) banner.imageUrl = imageUrl;
        if (type !== undefined) banner.type = type;
        if (position !== undefined) banner.position = position;
        if (startDate !== undefined) banner.startDate = startDate;
        if (endDate !== undefined) banner.endDate = endDate;
        if (action !== undefined) banner.action = action;
        if (settings !== undefined) banner.settings = settings;
        if (isActive !== undefined) banner.isActive = isActive;

        await banner.save();

        console.log('✅ Banner actualizado');

        res.json({
            success: true,
            msg: 'Banner actualizado exitosamente',
            banner
        });

    } catch (error) {
        console.error('❌ Error al actualizar banner:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al actualizar banner',
            error: error.message
        });
    }
};

/**
 * 🆕 ELIMINAR BANNER
 * DELETE /api/banners/:id
 */
const deleteBanner = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Eliminando banner:', id);

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                msg: 'Banner no encontrado'
            });
        }

        // Soft delete
        banner.isActive = false;
        await banner.save();

        console.log('✅ Banner eliminado');

        res.json({
            success: true,
            msg: 'Banner eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al eliminar banner:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al eliminar banner',
            error: error.message
        });
    }
};

module.exports = {
    createBanner,
    getBanners,
    getBannerById,
    getBannerProducts,
    registerBannerClick,
    updateBanner,
    deleteBanner
};
