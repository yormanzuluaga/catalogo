const { Router } = require('express')
const { check } = require('express-validator')

const middleware = require('../middlewares/validar_campos')
const middlewareJWT = require('../middlewares/validar_jwt')
const middlewareRoles = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const brandCtrl = require('../controllers/brand.controller')

const router = Router();

// Obtener todas las marcas
router.get('/', [
    middlewareJWT.validarJWT,
], brandCtrl.getAllBrands)

// Obtener estadísticas de marcas
router.get('/stats', [
    middlewareJWT.validarJWT,
], brandCtrl.getBrandStats)

// Obtener productos por marca
router.get('/:id/products', [
    middlewareJWT.validarJWT,
    check('id', 'No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.brandExistsId),
    middleware.validarCampos,
], brandCtrl.getProductsByBrand)

// Obtener una marca específica
router.get('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.brandExistsId),
    middleware.validarCampos,
], brandCtrl.getBrand)

// Crear una nueva marca
router.post('/', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('name', 'El nombre de la marca es obligatorio').not().isEmpty(),
    check('name', 'El nombre debe tener al menos 2 caracteres').isLength({ min: 2 }),
    check('website').optional().isURL().withMessage('Debe ser una URL válida'),
    check('colors.primary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color primario debe ser un código hex válido'),
    check('colors.secondary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color secundario debe ser un código hex válido'),
    check('contact.email').optional().isEmail().withMessage('Debe ser un email válido'),
    middleware.validarCampos,
], brandCtrl.createBrand)

// Actualizar una marca
router.put('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.brandExistsId),
    check('name').optional().not().isEmpty().withMessage('El nombre no puede estar vacío'),
    check('name').optional().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    check('website').optional().isURL().withMessage('Debe ser una URL válida'),
    check('colors.primary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color primario debe ser un código hex válido'),
    check('colors.secondary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color secundario debe ser un código hex válido'),
    check('contact.email').optional().isEmail().withMessage('Debe ser un email válido'),
    middleware.validarCampos,
], brandCtrl.updateBrand)

// Eliminar una marca
router.delete('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.brandExistsId),
    middleware.validarCampos,
], brandCtrl.deleteBrand)

// Agregar logo a una marca
router.post('/logo/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.brandExistsId),
    middleware.validarCampos,
], brandCtrl.addBrandLogo)

// Eliminar logo de una marca
router.delete('/logo/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.brandExistsId),
    middleware.validarCampos,
], brandCtrl.removeBrandLogo)

module.exports = router
