const { Router } = require('express');
const { check } = require('express-validator');

const middleware = require('../middlewares/validar_campos');
const middlewareJWT = require('../middlewares/validar_jwt');
const catalogCtrl = require('../controllers/catalog.controller');

const router = Router();

// ========== GESTIÓN DE CATÁLOGOS ==========

// Crear nuevo catálogo
router.post('/', [
    middlewareJWT.validarJWT,
    check('name', 'El nombre del catálogo es obligatorio').not().isEmpty(),
    check('name', 'El nombre debe tener entre 3 y 100 caracteres').isLength({ min: 3, max: 100 }),
    check('description').optional().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
    check('settings.isPublic').optional().isBoolean().withMessage('isPublic debe ser un valor booleano'),
    check('settings.showPrices').optional().isBoolean().withMessage('showPrices debe ser un valor booleano'),
    check('settings.theme.primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('primaryColor debe ser un color hexadecimal válido'),
    check('settings.theme.secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('secondaryColor debe ser un color hexadecimal válido'),
    check('settings.contactInfo.email').optional().isEmail().withMessage('Email debe ser válido'),
    check('settings.contactInfo.phone').optional().isMobilePhone().withMessage('Teléfono debe ser válido'),
    middleware.validarCampos
], catalogCtrl.createCatalog);

// Obtener catálogos del usuario autenticado
router.get('/my-catalogs', [
    middlewareJWT.validarJWT,
    check('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit debe ser entre 1 y 50'),
    check('from').optional().isInt({ min: 0 }).withMessage('from debe ser mayor o igual a 0'),
    check('includeInactive').optional().isBoolean().withMessage('includeInactive debe ser booleano'),
    middleware.validarCampos
], catalogCtrl.getUserCatalogs);

// Obtener catálogos públicos
router.get('/public', [
    check('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit debe ser entre 1 y 50'),
    check('from').optional().isInt({ min: 0 }).withMessage('from debe ser mayor o igual a 0'),
    check('search').optional().isLength({ max: 100 }).withMessage('search no puede exceder 100 caracteres'),
    middleware.validarCampos
], catalogCtrl.getPublicCatalogs);

// Obtener catálogo específico
router.get('/:catalogId', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    middleware.validarCampos
], catalogCtrl.getCatalog);

// Actualizar catálogo
router.put('/:catalogId', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    check('name').optional().isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    check('description').optional().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
    check('settings.isPublic').optional().isBoolean().withMessage('isPublic debe ser un valor booleano'),
    check('settings.showPrices').optional().isBoolean().withMessage('showPrices debe ser un valor booleano'),
    check('settings.theme.primaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('primaryColor debe ser un color hexadecimal válido'),
    check('settings.theme.secondaryColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('secondaryColor debe ser un color hexadecimal válido'),
    check('settings.contactInfo.email').optional().isEmail().withMessage('Email debe ser válido'),
    check('settings.contactInfo.phone').optional().isMobilePhone().withMessage('Teléfono debe ser válido'),
    middleware.validarCampos
], catalogCtrl.updateCatalog);

// Eliminar catálogo (soft delete)
router.delete('/:catalogId', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    middleware.validarCampos
], catalogCtrl.deleteCatalog);

// Obtener estadísticas del catálogo
router.get('/:catalogId/stats', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    middleware.validarCampos
], catalogCtrl.getCatalogStats);

// ========== GESTIÓN DE PRODUCTOS EN CATÁLOGOS ==========

// Buscar productos para agregar al catálogo
router.get('/:catalogId/search-products', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    check('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe ser entre 1 y 100'),
    check('from').optional().isInt({ min: 0 }).withMessage('from debe ser mayor o igual a 0'),
    check('search').optional().isLength({ max: 100 }).withMessage('search no puede exceder 100 caracteres'),
    check('category').optional().isMongoId().withMessage('category debe ser un ID válido'),
    check('subCategory').optional().isMongoId().withMessage('subCategory debe ser un ID válido'),
    check('brand').optional().isLength({ max: 50 }).withMessage('brand no puede exceder 50 caracteres'),
    middleware.validarCampos
], catalogCtrl.searchProductsForCatalog);

// Agregar producto al catálogo
router.post('/:catalogId/products/:productId', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    check('productId', 'ID de producto debe ser válido').isMongoId(),
    check('catalogConfig.customPrice').optional().isFloat({ min: 0 }).withMessage('customPrice debe ser mayor o igual a 0'),
    check('catalogConfig.sellerCommission').optional().isFloat({ min: 0 }).withMessage('sellerCommission debe ser mayor o igual a 0'),
    check('catalogConfig.isAvailable').optional().isBoolean().withMessage('isAvailable debe ser booleano'),
    check('catalogConfig.position').optional().isInt({ min: 0 }).withMessage('position debe ser mayor o igual a 0'),
    check('catalogConfig.sellerNotes').optional().isLength({ max: 300 }).withMessage('sellerNotes no puede exceder 300 caracteres'),
    check('catalogConfig.customTags').optional().isArray().withMessage('customTags debe ser un array'),
    check('catalogConfig.customTags.*').optional().isLength({ max: 30 }).withMessage('Cada tag no puede exceder 30 caracteres'),
    check('catalogConfig.isFeatured').optional().isBoolean().withMessage('isFeatured debe ser booleano'),
    middleware.validarCampos
], catalogCtrl.addProductToCatalog);

// Actualizar configuración de producto en catálogo
router.put('/:catalogId/products/:productId', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    check('productId', 'ID de producto debe ser válido').isMongoId(),
    check('catalogConfig.customPrice').optional().isFloat({ min: 0 }).withMessage('customPrice debe ser mayor o igual a 0'),
    check('catalogConfig.sellerCommission').optional().isFloat({ min: 0 }).withMessage('sellerCommission debe ser mayor o igual a 0'),
    check('catalogConfig.isAvailable').optional().isBoolean().withMessage('isAvailable debe ser booleano'),
    check('catalogConfig.position').optional().isInt({ min: 0 }).withMessage('position debe ser mayor o igual a 0'),
    check('catalogConfig.sellerNotes').optional().isLength({ max: 300 }).withMessage('sellerNotes no puede exceder 300 caracteres'),
    check('catalogConfig.customTags').optional().isArray().withMessage('customTags debe ser un array'),
    check('catalogConfig.customTags.*').optional().isLength({ max: 30 }).withMessage('Cada tag no puede exceder 30 caracteres'),
    check('catalogConfig.isFeatured').optional().isBoolean().withMessage('isFeatured debe ser booleano'),
    middleware.validarCampos
], catalogCtrl.updateProductInCatalog);

// Remover producto del catálogo
router.delete('/:catalogId/products/:productId', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    check('productId', 'ID de producto debe ser válido').isMongoId(),
    middleware.validarCampos
], catalogCtrl.removeProductFromCatalog);

// Reordenar productos en catálogo
router.put('/:catalogId/reorder', [
    middlewareJWT.validarJWT,
    check('catalogId', 'ID de catálogo debe ser válido').isMongoId(),
    check('productOrder', 'productOrder es obligatorio').isArray({ min: 1 }),
    check('productOrder.*', 'Cada elemento debe ser un ID válido').isMongoId(),
    middleware.validarCampos
], catalogCtrl.reorderProducts);

module.exports = router;
