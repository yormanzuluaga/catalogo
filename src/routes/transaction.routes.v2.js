const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    createTransaction,
    getUserTransactions,
    getTransaction,
    confirmDelivery,
    getEarningsSummary
} = require('../controllers/transaction.controller.v2');

const router = Router();

/**
 * Crear transacción después de pago con Wompi
 * POST /api/transactions
 */
router.post('/', [
    validarJWT,
    // Items
    check('items', 'Los items son obligatorios').isArray({ min: 1 }),
    check('items.*.productId', 'El productId es obligatorio').isMongoId(),
    check('items.*.quantity', 'La cantidad debe ser mayor a 0').isInt({ min: 1 }),
    check('items.*.unitPrice', 'El unitPrice debe ser mayor a 0').isNumeric({ min: 0 }),
    
    // Dirección
    check('shippingAddressId', 'La dirección de envío es obligatoria').isMongoId(),
    
    // Información de Wompi (viene de Flutter)
    check('wompiTransactionId', 'El wompiTransactionId es obligatorio').notEmpty(),
    check('wompiReference', 'El wompiReference es obligatorio').notEmpty(),
    check('paymentStatus', 'El paymentStatus es obligatorio').isIn(['approved', 'declined', 'pending', 'error']),
    check('customerEmail', 'El customerEmail debe ser un email válido').isEmail(),
    
    validarCampos
], createTransaction);

/**
 * Obtener transacciones del usuario
 * GET /api/transactions
 */
router.get('/', [
    validarJWT,
    validarCampos
], getUserTransactions);

/**
 * Obtener una transacción específica
 * GET /api/transactions/:id
 */
router.get('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], getTransaction);

/**
 * 🆕 Confirmar entrega del pedido (deposita automáticamente en wallet)
 * PUT /api/transactions/:id/confirm-delivery
 */
router.put('/:id/confirm-delivery', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], confirmDelivery);

/**
 * 🆕 Obtener resumen de ganancias del usuario
 * GET /api/transactions/earnings/summary
 */
router.get('/earnings/summary', [
    validarJWT,
    validarCampos
], getEarningsSummary);

module.exports = router;
