const { Router } = require('express')
const { check } = require('express-validator')

const router = Router();

const userCtrl = require('../controllers/user.controller.js')

const middleware  = require('../middlewares/validar_campos')
const middlewareJWT  = require('../middlewares/validar_jwt')
const middlewareRoles  = require('../middlewares/validar_roles')

const helpers = require('../helpers/db_validators')


router.get('/', userCtrl.getUsers)

router.post('/', [
    check('firstName', 'El nombre es obligatorio').not().isEmail(),
    check('mobile', 'El mobile debe de ser minimo de 13 letras').isLength({max: 13}),
    check('mobile', 'El mobile debe de ser mas de 7 letras').isLength({min: 7}),
    //check('rol').custom( helpers.esRoleValido ),
    middleware.validarCampos
], userCtrl.postUser);

router.get('/:id', userCtrl.getUser)

router.patch('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID válido').isMongoId(), 
    check('id').custom(helpers.emailExistsId),
    middleware.validarCampos
], userCtrl.putUser)

router.post('/user/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole(
        "ADMIN_ROLE",
       "USER_ROLE",
       "COMPANY_ROLE",
       "TECHNICAL_ROLE",
       "STORE_ROLE",),
    check('id').custom(helpers.emailExistsId),
    middleware.validarCampos
], userCtrl.updateCollabotor)

router.delete('/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.hasRole('ADMIN_ROLE','USER_ROLE'),
    check('id', 'No es un ID válido').isMongoId(),
    check('id').custom(helpers.emailExistsId),
    middleware.validarCampos

], userCtrl.deleteUser)

module.exports = router