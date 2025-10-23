const { Router } = require('express')
const { check } = require('express-validator')

const middleware  = require('../middlewares/validar_campos')
const middlewareJWT  = require('../middlewares/validar_jwt')
const middlewareRoles  = require('../middlewares/validar_roles')
const helpers = require('../helpers/db_validators')

const videoCtrl  = require('../controllers/video.controller')


const router = Router();

//visualizar toda la productos
router.get('/:id',[
    middlewareJWT.validarJWT,
],videoCtrl.getAllproducts)

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
    check('subCategory', 'La categoria es obligatorio').isMongoId(),
    check('subCategory').custom(helpers.subCategoryExistsId),
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


module.exports = router