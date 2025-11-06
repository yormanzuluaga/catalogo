const { Router } = require('express')
const { check } = require('express-validator')

const middleware  = require('../middlewares/validar_campos')
const middlewareJWT  = require('../middlewares/validar_jwt')
const middlewareRoles  = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const productsCtrl  = require('../controllers/products.controller')

const router = Router();

// ========== RUTAS DE MARCAS ==========

// Obtener todas las marcas disponibles
router.get('/brands', [
    middlewareJWT.validarJWT,
], productsCtrl.getAllBrands);

// Obtener productos por marca
router.get('/brand/:brand', [
    middlewareJWT.validarJWT,
    check('brand', 'La marca es obligatoria').not().isEmpty(),
    middleware.validarCampos,
], productsCtrl.getProductsByBrand);

// Obtener estadísticas de marcas
router.get('/brands/stats', [
    middlewareJWT.validarJWT,
], productsCtrl.getBrandStats);

// ========== RUTAS DE PRODUCTOS ==========

//visualizar productos por subcategoría (default)
router.get('/subcategory/:id',[
    middlewareJWT.validarJWT,
    check('id','No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
],productsCtrl.getAllproducts)

//visualizar productos por categoría directa
router.get('/category/:id',[
    middlewareJWT.validarJWT,
    check('id','No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
],(req, res, next) => {
    req.query.type = 'category';
    next();
}, productsCtrl.getAllproducts)

//visualizar toda la productos (mantener compatibilidad)
router.get('/:id',[
    middlewareJWT.validarJWT,
],productsCtrl.getAllproducts)

//visualiar una productos
router.get('/one/:id',[
    middlewareJWT.validarJWT,
    check('id','No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
    check('id').custom(helpers.productExistsId)
], productsCtrl.getproduct)

//crear una productos
router.post('/',[
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('brand', 'La marca es obligatoria').isMongoId().withMessage('La marca debe ser un ID válido'),
    check('brand').custom(helpers.brandExistsId),
    // Validación personalizada para category o subCategory
    check().custom((value, { req }) => {
        if (!req.body.category && !req.body.subCategory) {
            throw new Error('Debe proporcionar una categoría o subcategoría');
        }
        if (req.body.category && req.body.subCategory) {
            throw new Error('No puede proporcionar categoría y subcategoría al mismo tiempo');
        }
        return true;
    }),
    check('category').optional().isMongoId().withMessage('La categoría debe ser un ID válido'),
    check('subCategory').optional().isMongoId().withMessage('La subcategoría debe ser un ID válido'),
    // check('category').optional().custom(helpers.categoryExistsId),
    // check('subCategory').optional().custom(helpers.subCategoryExistsId),
    middleware.validarCampos,
],productsCtrl.createrproduct )

//actualizar una productos
router.put('/:id',[
    middlewareJWT.validarJWT,
    //check('category', 'La categoria es obligatorio').isMongoId(),
    check('brand').optional().isMongoId().withMessage('La marca debe ser un ID válido'),
    check('brand').optional().custom(helpers.brandExistsId),
    check('id').custom(helpers.productExistsId),
    middleware.validarCampos,
], productsCtrl.updateproduct)

//Borrar una productos
router.delete('/:id',[
    middlewareJWT.validarJWT,
  //  middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id','No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.productExistsId),
    middleware.validarCampos,
],productsCtrl.deletedproduct)

// Agregar imágenes a un producto existente
router.post('/images/:id',[
    middlewareJWT.validarJWT,
    check('id','No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.productExistsId),
    middleware.validarCampos,
], productsCtrl.addProductImages)

// Eliminar una imagen específica del producto
router.delete('/images/:id',[
    middlewareJWT.validarJWT,
    check('id','No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.productExistsId),
    check('imageUrl', 'URL de imagen requerida').not().isEmpty(),
    check('type', 'Tipo de imagen requerido').isIn(['main', 'additional']),
    middleware.validarCampos,
], productsCtrl.removeProductImage)

// Obtener todos los productos (mixto: categorías y subcategorías)
router.get('/all/mixed', [
    middlewareJWT.validarJWT,
], productsCtrl.getAllProductsMixed)

// Migrar producto de categoría a subcategoría
router.put('/migrate/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un ID válido').isMongoId(),
    check('subCategoryId', 'ID de subcategoría requerido').isMongoId(),
    middleware.validarCampos,
], productsCtrl.migrateProductToSubCategory)

// ==================== RUTAS PARA VARIANTES ====================

// Crear producto con variantes
router.post('/variants', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check().custom((value, { req }) => {
        if (!req.body.category && !req.body.subCategory) {
            throw new Error('Debe proporcionar una categoría o subcategoría');
        }
        if (req.body.category && req.body.subCategory) {
            throw new Error('No puede proporcionar categoría y subcategoría al mismo tiempo');
        }
        return true;
    }),
    check('category').optional().isMongoId().withMessage('La categoría debe ser un ID válido'),
    check('subCategory').optional().isMongoId().withMessage('La subcategoría debe ser un ID válido'),
    middleware.validarCampos,
], productsCtrl.createProductWithVariants)

// Obtener variantes de un producto
router.get('/variants/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(helpers.productExistsId),
    middleware.validarCampos,
], productsCtrl.getProductVariants)

// Agregar variante a producto existente
router.post('/variants/:id/add', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(helpers.productExistsId),
    check('sku', 'SKU es requerido').not().isEmpty(),
    check('pricing.costPrice', 'Precio de costo es requerido').isNumeric(),
    check('pricing.salePrice', 'Precio de venta es requerido').isNumeric(),
    middleware.validarCampos,
], productsCtrl.addVariantToProduct)

// Actualizar variante específica
router.put('/variants/:productId/:sku', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('productId', 'No es un ID válido').isMongoId(),
    check('productId').custom(helpers.productExistsId),
    check('sku', 'SKU es requerido').not().isEmpty(),
    middleware.validarCampos,
], productsCtrl.updateVariant)

// Eliminar variante
router.delete('/variants/:productId/:sku', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('productId', 'No es un ID válido').isMongoId(),
    check('productId').custom(helpers.productExistsId),
    check('sku', 'SKU es requerido').not().isEmpty(),
    middleware.validarCampos,
], productsCtrl.deleteVariant)

// Buscar productos por filtros de variantes
router.get('/search/variants', [
    middlewareJWT.validarJWT,
    check('minPrice').optional().isNumeric().withMessage('Precio mínimo debe ser numérico'),
    check('maxPrice').optional().isNumeric().withMessage('Precio máximo debe ser numérico'),
    check('category').optional().isMongoId().withMessage('ID de categoría inválido'),
    check('subCategory').optional().isMongoId().withMessage('ID de subcategoría inválido'),
    check('minPoints').optional().isNumeric().withMessage('Puntos mínimos debe ser numérico'),
    middleware.validarCampos,
], productsCtrl.searchProductsByVariants)

// ==================== RUTAS ESPECÍFICAS PARA VENDEDORAS ====================

// Obtener productos para vendedoras con información de comisiones
router.get('/sellers/catalog', [
    middlewareJWT.validarJWT,
    check('minCommission').optional().isNumeric().withMessage('Comisión mínima debe ser numérica'),
    middleware.validarCampos,
], productsCtrl.getProductsForSellers)

// Obtener detalles completos de producto para vendedoras
router.get('/sellers/details/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(helpers.productExistsId),
    middleware.validarCampos,
], productsCtrl.getProductDetailsForSellers)

// Calcular comisión y puntos para una venta
router.post('/sellers/calculate-commission', [
    middlewareJWT.validarJWT,
    check('productId', 'ID de producto requerido').isMongoId(),
    check('quantity', 'Cantidad debe ser un número positivo').isInt({ min: 1 }),
    middleware.validarCampos,
], productsCtrl.calculateSaleCommission)

module.exports = router