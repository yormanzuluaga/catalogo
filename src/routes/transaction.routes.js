const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');
const { existeAddressPorId, existeProductoPorId } = require('../helpers/db_validators');

const {
    getUserTransactions,
    getTransaction,
    createTransaction,
    updateTransactionStatus,
    cancelTransaction,
    getTransactionsSummary,
    wompiWebhook,
    confirmDelivery,
    getEarningsSummary
} = require('../controllers/transaction.controller');

const router = Router();

// Obtener todas las transacciones del usuario autenticado
router.get('/', [
    validarJWT,
    validarCampos
], getUserTransactions);

// Obtener resumen de transacciones del usuario
router.get('/summary', [
    validarJWT,
    validarCampos
], getTransactionsSummary);

// Webhook de Wompi (sin autenticación, debe ser público)
router.post('/webhook/wompi', [
    validarCampos
], wompiWebhook);

// Obtener una transacción específica
router.get('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], getTransaction);

// Crear una nueva transacción con pago de Wompi
router.post('/', [
    validarJWT,
    check('items', 'Los items son obligatorios').isArray({ min: 1 }),
    check('items.*.productId', 'El ID del producto es obligatorio').isMongoId(),
    check('items.*.quantity', 'La cantidad debe ser un número mayor a 0').isInt({ min: 1 }),
    check('items.*.unitPrice', 'El precio unitario debe ser un número mayor a 0').isNumeric({ min: 0 }),
    check('items.*.productType', 'El tipo de producto debe ser simple o variable').optional().isIn(['simple', 'variable']),
    check('shippingAddressId', 'El ID de la dirección de envío es obligatorio').isMongoId(),
    
    // Información de Wompi (obligatoria cuando viene del pago)
    check('wompiTransactionId', 'El ID de transacción de Wompi es obligatorio').isString(),
    check('wompiReference', 'La referencia de Wompi es obligatoria').isString(),
    check('paymentStatus', 'El estado del pago es obligatorio').isIn(['approved', 'declined', 'pending', 'error']),
    check('customerEmail', 'El correo del cliente es obligatorio').isEmail(),
    
    // Campos opcionales de Wompi
    check('approvalCode', 'El código de aprobación debe ser texto válido').optional().isString(),
    check('authorizationCode', 'El código de autorización debe ser texto válido').optional().isString(),
    check('paymentMethod', 'El método de pago debe ser válido').optional().isString(),
    check('cardLastFour', 'Los últimos 4 dígitos de la tarjeta deben ser válidos').optional().isString().isLength({ min: 4, max: 4 }),
    
    validarCampos
], createTransaction);

// Actualizar estado de transacción (webhook de Wompi o admin)
router.patch('/:id/status', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('status', 'El estado debe ser válido').optional().isIn([
        'pending', 'approved', 'declined', 'voided', 'error', 'expired'
    ]),
    check('wompiTransactionId', 'El ID de transacción de Wompi debe ser texto válido').optional().isString(),
    check('wompiReference', 'La referencia de Wompi debe ser texto válido').optional().isString(),
    check('approvalCode', 'El código de aprobación debe ser texto válido').optional().isString(),
    check('authorizationCode', 'El código de autorización debe ser texto válido').optional().isString(),
    check('receiptUrl', 'La URL del recibo debe ser válida').optional().isURL(),
    validarCampos
], updateTransactionStatus);

// Cancelar transacción
router.patch('/:id/cancel', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('reason', 'La razón de cancelación debe ser texto válido').optional().isString().isLength({ max: 200 }),
    validarCampos
], cancelTransaction);

// Confirmar entrega del pedido (deposita automáticamente en wallet)
router.put('/:id/confirm-delivery', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], confirmDelivery);

// Obtener resumen de ganancias del usuario (DEBE IR ANTES DE /:id)
router.get('/earnings/summary', [
    validarJWT,
    validarCampos
], getEarningsSummary);

module.exports = router;
