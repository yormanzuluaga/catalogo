const { Router } = require('express')
const { check } = require('express-validator')

const middleware  = require('../middlewares/validar_campos')
const middlewareJWT  = require('../middlewares/validar_jwt')
const middlewareRoles  = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const categotyCtrl  = require('../controllers/category.controller')



const router = Router();

//visualizar toda la categoria
router.get('/',[
    middlewareJWT.validarJWT,
], categotyCtrl.getAllCategory)

//visualiar una categoria
router.get('/:id',[
    middlewareJWT.validarJWT,
    check('id','No es un id de Mongo').isMongoId(),
    middleware.validarCampos,
    check('id').custom(helpers.categoryExistsId)
], categotyCtrl.getCategory)

//crear una categoria
router.post('/',[
    middlewareJWT.validarJWT,
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    middlewareRoles.hasRole('ADMIN_ROLE'),
    middleware.validarCampos,
], categotyCtrl.createrCategory)

//actualizar una categoria
router.put('/:id',[
    middlewareJWT.validarJWT,
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    middleware.validarCampos,
    check('id').custom(helpers.categoryExistsId),
    middleware.validarCampos,
], categotyCtrl.updateCategory)

//Borrar una categoria
router.delete('/:id',[
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE'),
    check('id','No es un id de Mongo').isMongoId(),
    check('id').custom(helpers.categoryExistsId),
    middleware.validarCampos,
],categotyCtrl.deletedCategory)


module.exports = router