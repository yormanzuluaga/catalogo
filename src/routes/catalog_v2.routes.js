const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    createCatalog,
    addProductsToCatalog,
    getMyCatalogs,
    getCatalogDetail,
    removeProductFromCatalog,
    updateCatalog,
    deleteCatalog
} = require('../controllers/catalog_v2.controller');

const router = Router();

// ⚠️ IMPORTANTE: Las rutas específicas deben ir ANTES que las rutas con parámetros
// para evitar que Express las interprete incorrectamente

/**
 * 🆕 CREAR CATÁLOGO
 * POST /api/catalogs-v2/create
 */
router.post('/create', [
    validarJWT,
    check('name', 'El nombre del catálogo es obligatorio').notEmpty(),
    check('name', 'El nombre no puede exceder 100 caracteres').isLength({ max: 100 }),
    validarCampos
], createCatalog);

/**
 * 🆕 OBTENER MIS CATÁLOGOS
 * GET /api/catalogs-v2/my-catalogs
 */
router.get('/my-catalogs', [
    validarJWT
], getMyCatalogs);

/**
 * 🆕 AGREGAR PRODUCTOS A CATÁLOGO
 * POST /api/catalogs-v2/:id/products
 */
router.post('/:id/products', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('products', 'Debes proporcionar un array de productos').isArray(),
    validarCampos
], addProductsToCatalog);

/**
 * 🆕 ELIMINAR PRODUCTO DEL CATÁLOGO
 * DELETE /api/catalogs-v2/:id/products/:productId
 */
router.delete('/:id/products/:productId', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('productId', 'No es un ID válido').isMongoId(),
    validarCampos
], removeProductFromCatalog);

/**
 * 🆕 OBTENER DETALLE DE CATÁLOGO
 * GET /api/catalogs-v2/:id
 */
router.get('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], getCatalogDetail);

/**
 * 🆕 ACTUALIZAR CATÁLOGO
 * PUT /api/catalogs-v2/:id
 */
router.put('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], updateCatalog);

/**
 * 🆕 ELIMINAR CATÁLOGO
 * DELETE /api/catalogs-v2/:id
 */
router.delete('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], deleteCatalog);

module.exports = router;
