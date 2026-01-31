const { Router } = require('express')
const { check } = require('express-validator')

const middleware = require('../middlewares/validar_campos')
const middlewareJWT = require('../middlewares/validar_jwt')
const middlewareRoles = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const filterCtrl = require('../controllers/filter.controller')

const router = Router();

// Obtener todos los filtros
router.get('/', [
    middlewareJWT.validarJWT,
], filterCtrl.getAllFilters)

// Obtener estadísticas de filtros
router.get('/stats', [
    middlewareJWT.validarJWT,
], filterCtrl.getFilterStats)

// Obtener filtros por categoría
router.get('/category/:categoryId', [
    middlewareJWT.validarJWT,
    check('categoryId', 'No es un id de Mongo').isMongoId(),
    check('categoryId').custom(helpers.categoryExistsId),
    middleware.validarCampos,
], filterCtrl.getFiltersByCategory)

// Obtener un filtro específico
router.get('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
], filterCtrl.getFilter)

// Crear un nuevo filtro
router.post('/', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('name', 'El nombre del filtro es obligatorio').not().isEmpty(),
    check('name', 'El nombre debe tener al menos 2 caracteres').isLength({ min: 2 }),
    check('category', 'La categoría es obligatoria').not().isEmpty(),
    check('category', 'No es un id de Mongo').isMongoId(),
    check('category').custom(helpers.categoryExistsId),
    check('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('El color debe ser un código hex válido'),
    check('order').optional().isInt({ min: 0 }).withMessage('El orden debe ser un número entero positivo'),
    middleware.validarCampos,
], filterCtrl.createFilter)

// Actualizar un filtro
router.put('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    check('name').optional().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    check('category').optional().isMongoId().withMessage('No es un id de Mongo'),
    check('category').optional().custom(helpers.categoryExistsId),
    check('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('El color debe ser un código hex válido'),
    check('order').optional().isInt({ min: 0 }).withMessage('El orden debe ser un número entero positivo'),
    middleware.validarCampos,
], filterCtrl.updateFilter)

// Desactivar un filtro (soft delete)
router.delete('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
], filterCtrl.deleteFilter)

// Reactivar un filtro
router.patch('/:id/activate', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
], filterCtrl.activateFilter)

// Eliminar permanentemente un filtro
router.delete('/:id/permanent', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
], filterCtrl.hardDeleteFilter)

module.exports = router
