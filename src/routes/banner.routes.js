const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    createBanner,
    getBanners,
    getBannerById,
    getBannerProducts,
    registerBannerClick,
    updateBanner,
    deleteBanner
} = require('../controllers/banner.controller');

const router = Router();

/**
 * 🆕 OBTENER BANNERS ACTIVOS (público)
 * GET /api/banners
 */
router.get('/', getBanners);

/**
 * 🆕 OBTENER PRODUCTOS DE UN BANNER (público)
 * GET /api/banners/:id/products
 */
router.get('/:id/products', [
    check('id', 'ID de banner no válido').isMongoId(),
    validarCampos
], getBannerProducts);

/**
 * 🆕 REGISTRAR CLICK EN BANNER (público)
 * POST /api/banners/:id/click
 */
router.post('/:id/click', [
    check('id', 'ID de banner no válido').isMongoId(),
    validarCampos
], registerBannerClick);

/**
 * 🆕 OBTENER BANNER POR ID (público)
 * GET /api/banners/:id
 */
router.get('/:id', [
    check('id', 'ID de banner no válido').isMongoId(),
    validarCampos
], getBannerById);

/**
 * 🆕 CREAR BANNER (requiere autenticación - admin)
 * POST /api/banners/create
 */
router.post('/create', [
    validarJWT,
    check('title', 'El título es obligatorio').notEmpty(),
    check('title', 'El título no puede exceder 100 caracteres').isLength({ max: 100 }),
    validarCampos
], createBanner);

/**
 * 🆕 ACTUALIZAR BANNER (requiere autenticación - admin)
 * PUT /api/banners/:id
 */
router.put('/:id', [
    validarJWT,
    check('id', 'ID de banner no válido').isMongoId(),
    validarCampos
], updateBanner);

/**
 * 🆕 ELIMINAR BANNER (requiere autenticación - admin)
 * DELETE /api/banners/:id
 */
router.delete('/:id', [
    validarJWT,
    check('id', 'ID de banner no válido').isMongoId(),
    validarCampos
], deleteBanner);

module.exports = router;
