const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    createTransactionComplete
} = require('../controllers/transaction_v2.controller');

const router = Router();

/**
 * 🆕 CREAR TRANSACCIÓN COMPLETA
 * POST /api/transactions-v2/create
 * 
 * Crea transacción, wallet y shipping order automáticamente
 */
router.post('/create', [
    validarJWT,
    check('shippingAddressId', 'La dirección de envío es obligatoria').notEmpty(),
    check('shippingAddressId', 'ID de dirección no válido').isMongoId(),
    check('wompiTransactionId', 'El ID de transacción de Wompi es obligatorio').notEmpty(),
    check('wompiReference', 'La referencia de Wompi es obligatoria').notEmpty(),
    check('paymentStatus', 'El estado del pago es obligatorio').notEmpty(),
    check('paymentStatus', 'Estado de pago no válido').isIn(['approved', 'pending', 'declined', 'error']),
    check('customerEmail', 'El email del cliente es obligatorio').notEmpty(),
    check('customerEmail', 'Email no válido').isEmail(),
    check('items', 'Los items son obligatorios').isArray({ min: 1 }),
    check('items.*.productId', 'ID de producto no válido').isMongoId(),
    check('items.*.quantity', 'La cantidad debe ser mayor a 0').isInt({ min: 1 }),
    validarCampos
], createTransactionComplete);

module.exports = router;
