const { Router } = require('express');
const { check } = require('express-validator');

const middleware = require('../middlewares/validar_campos');
const middlewareJWT = require('../middlewares/validar_jwt');
const paymentCtrl = require('../controllers/payment.controller');

const router = Router();

/**
 * Crear pago para una orden
 * POST /api/payments/order/:orderId
 */
router.post('/order/:orderId', [
    middlewareJWT.validarJWT,
    check('orderId', 'ID de orden debe ser un MongoID válido').isMongoId(),
    check('payment_method', 'Método de pago es requerido').optional().not().isEmpty(),
    check('customer_document', 'Documento del cliente es requerido para pago directo').optional().isLength({ min: 5 }),
    check('use_payment_link', 'use_payment_link debe ser boolean').optional().isBoolean(),
    check('single_use', 'single_use debe ser boolean').optional().isBoolean(),
    check('collect_shipping', 'collect_shipping debe ser boolean').optional().isBoolean(),
    check('expires_in_hours', 'expires_in_hours debe ser un número positivo').optional().isInt({ min: 1, max: 8760 }),
    check('redirect_url', 'redirect_url debe ser una URL válida').optional().isURL(),
    middleware.validarCampos
], paymentCtrl.createPayment);

/**
 * Webhook de Wompi para notificaciones de pago
 * POST /api/payments/webhook
 * Nota: Este endpoint NO requiere autenticación JWT
 */
router.post('/webhook', paymentCtrl.webhook);

/**
 * Consultar estado de pago de una orden
 * GET /api/payments/order/:orderId/status
 */
router.get('/order/:orderId/status', [
    middlewareJWT.validarJWT,
    check('orderId', 'ID de orden debe ser un MongoID válido').isMongoId(),
    middleware.validarCampos
], paymentCtrl.getPaymentStatus);

module.exports = router;
