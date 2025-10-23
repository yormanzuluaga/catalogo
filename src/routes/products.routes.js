const { Router } = require('express')
const { check } = require('express-validator')

const middleware  = require('../middlewares/validar_campos')
const middlewareJWT  = require('../middlewares/validar_jwt')
const middlewareRoles  = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const productsCtrl  = require('../controllers/products.controller')

const router = Router();

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

module.exports = router