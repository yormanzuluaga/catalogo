const { Router } = require('express')
const { check } = require('express-validator')

const middleware  = require('../middlewares/validar_campos')
const authCtrl = require('../controllers/auth.controller')

const router = Router();



router.post('/signIn',[
    check('email', 'El correo es obligatorio').isEmail(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    middleware.validarCampos
],  authCtrl.signIn);

router.post('/mobile',[
    check('mobile', 'el numero es obligatoria').not().isEmpty(),
    middleware.validarCampos
],  authCtrl.mobile);

router.get('/sms/:mobile',[
    middleware.validarCampos
],  authCtrl.sendSMS,);

router.get('/verify/:mobile/:code',[
    middleware.validarCampos
],  authCtrl.verify);

router.post('/google',[
    check('id_token', 'id_toke es necesario').not().isEmpty(),
    middleware.validarCampos
],  authCtrl.googleSignIn);

module.exports = router