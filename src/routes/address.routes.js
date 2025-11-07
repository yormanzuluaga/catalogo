const { Router } = require('express');
const { check } = require('express-validator');

const middleware = require('../middlewares/validar_campos');
const middlewareJWT = require('../middlewares/validar_jwt');
const helpers = require('../helpers/db_validators');

const addressCtrl = require('../controllers/address.controller');

const router = Router();

// Obtener todas las direcciones del usuario autenticado
router.get('/', [
    middlewareJWT.validarJWT,
    middleware.validarCampos
], addressCtrl.getAllAddresses);

// Obtener dirección predeterminada del usuario
router.get('/default', [
    middlewareJWT.validarJWT,
    middleware.validarCampos
], addressCtrl.getDefaultAddress);

// Obtener una dirección específica
router.get('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    middleware.validarCampos
], addressCtrl.getAddress);

// Crear nueva dirección
router.post('/', [
    middlewareJWT.validarJWT,
    check('title', 'El título de la dirección es requerido').not().isEmpty(),
    check('fullName', 'El nombre completo es requerido').not().isEmpty(),
    check('phone', 'El teléfono es requerido').not().isEmpty(),
    check('address', 'La dirección es requerida').not().isEmpty(),
    check('city', 'La ciudad es requerida').not().isEmpty(),
    check('state', 'El estado/departamento es requerido').not().isEmpty(),
    check('country', 'El país es requerido').not().isEmpty(),
    middleware.validarCampos
], addressCtrl.createAddress);

// Actualizar dirección
router.put('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    check('title', 'El título de la dirección es requerido').optional().not().isEmpty(),
    check('fullName', 'El nombre completo es requerido').optional().not().isEmpty(),
    check('phone', 'El teléfono es requerido').optional().not().isEmpty(),
    check('address', 'La dirección es requerida').optional().not().isEmpty(),
    check('city', 'La ciudad es requerida').optional().not().isEmpty(),
    check('state', 'El estado/departamento es requerido').optional().not().isEmpty(),
    check('country', 'El país es requerido').optional().not().isEmpty(),
    middleware.validarCampos
], addressCtrl.updateAddress);

// Establecer dirección como predeterminada
router.patch('/:id/default', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    middleware.validarCampos
], addressCtrl.setDefaultAddress);

// Eliminar dirección (soft delete)
router.delete('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'No es un ID de MongoDB válido').isMongoId(),
    middleware.validarCampos
], addressCtrl.deleteAddress);

module.exports = router;
