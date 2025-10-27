const { Router } = require('express')
const { check } = require('express-validator')

const middleware = require('../middlewares/validar_campos')
const middlewareJWT = require('../middlewares/validar_jwt')
const middlewareRoles = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const subCategoryCtrl = require('../controllers/sub_category.controller')

const router = Router()

// Obtener todas las subcategorías (opcionalmente filtradas por categoría)
router.get('/', subCategoryCtrl.getAllSubCategories)

// Obtener subcategorías de una categoría específica
router.get('/:categoryId', [
    check('categoryId', 'No es un ID de MongoDB válido').isMongoId(),
    // check('categoryId').custom(helpers.categoryExistsId), // Agregar esta validación si existe
    middleware.validarCampos
], subCategoryCtrl.getAllSubCategories)

// Obtener una subcategoría específica
router.get('/:id', [
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    middleware.validarCampos,
    // check('id').custom(helpers.subCategoryExistsId), // Agregar esta validación
], subCategoryCtrl.getSubCategory)

// Crear nueva subcategoría
router.post('/', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('description', 'La descripción es obligatoria').not().isEmpty(),
    check('category', 'La categoría es obligatoria').isMongoId(),
    check('category').custom(helpers.categoryExistsId), // Agregar esta validación
    middleware.validarCampos,
], subCategoryCtrl.createSubCategory)

// Actualizar subcategoría
router.put('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    // check('id').custom(helpers.subCategoryExistsId), // Agregar esta validación
    check('name', 'El nombre es obligatorio').optional().not().isEmpty(),
    check('description', 'La descripción es obligatoria').optional().not().isEmpty(),
    check('number', 'El número debe ser numérico').optional().isNumeric(),
    check('category', 'La categoría debe ser un ID válido').optional().isMongoId(),
    middleware.validarCampos,
], subCategoryCtrl.updateSubCategory)

// Eliminar subcategoría (soft delete)
router.delete('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    // check('id').custom(helpers.subCategoryExistsId), // Agregar esta validación
    middleware.validarCampos,
], subCategoryCtrl.deleteSubCategory)

// Actualizar imagen de subcategoría
router.put('/image/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    // check('id').custom(helpers.subCategoryExistsId), // Agregar esta validación
    middleware.validarCampos,
], subCategoryCtrl.updateSubCategoryImage)

// Eliminar imagen de subcategoría
router.delete('/image/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    // check('id').custom(helpers.subCategoryExistsId), // Agregar esta validación
    middleware.validarCampos,
], subCategoryCtrl.deleteSubCategoryImage)

module.exports = router
