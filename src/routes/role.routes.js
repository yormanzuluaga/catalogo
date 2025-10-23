const { Router } = require('express')
const { check } = require('express-validator')

const router = Router();

const roleCtrl = require('../controllers/role.controller.js')


router.get('/', roleCtrl.getRole)

router.post('/', roleCtrl.postRole);

router.get('/:id', roleCtrl.getUser)

router.patch('/:id', roleCtrl.putRole)

router.delete('/:id', roleCtrl.deleteRole)

module.exports = router