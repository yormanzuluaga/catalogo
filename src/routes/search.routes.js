const { Router } = require('express')

const middlewareJWT  = require('../middlewares/validar_jwt')
const searchCtrl = require('../controllers/search.controller')


const router = Router();

router.get('/:collection/:term',[middlewareJWT.validarJWT], searchCtrl.search)

module.exports = router