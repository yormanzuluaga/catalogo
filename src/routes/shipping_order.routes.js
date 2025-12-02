const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    getShippingOrders,
    getShippingOrder,
    updateShippingStatus,
    confirmOrderDelivery,
    getShippingOrdersSummary,
    getMyOrders,                  // 🆕
    getMyOrderDetail,             // 🆕
    trackOrder,                   // 🆕
    createOrderFromTransaction,   // 🆕
    getWalletBalance              // 🆕 Nuevo endpoint de balance
} = require('../controllers/shipping_order.controller');

const router = Router();

/**
 * Obtener resumen de órdenes y comisiones (DEBE IR PRIMERO)
 * GET /api/shipping-orders/summary
 */
router.get('/summary', [
    validarJWT,
    validarCampos
], getShippingOrdersSummary);

/**
 * 🆕 Obtener balance del wallet con comisiones pendientes
 * GET /api/shipping-orders/balance
 */
router.get('/balance', [
    validarJWT,
    validarCampos
], getWalletBalance);

/**
 * 🆕 Obtener los pedidos del cliente (comprador)
 * GET /api/shipping-orders/my-orders
 */
router.get('/my-orders', [
    validarJWT,
    validarCampos
], getMyOrders);

/**
 * 🆕 Tracking público por número de orden
 * GET /api/shipping-orders/track/:orderNumber
 */
router.get('/track/:orderNumber', [
    // Sin validarJWT para que sea público
], trackOrder);

/**
 * 🆕 Obtener detalle de un pedido del cliente
 * GET /api/shipping-orders/my-orders/:id
 */
router.get('/my-orders/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], getMyOrderDetail);

/**
 * Obtener todas las órdenes de envío del vendedor
 * GET /api/shipping-orders
 */
router.get('/', [
    validarJWT,
    validarCampos
], getShippingOrders);

/**
 * Obtener una orden específica
 * GET /api/shipping-orders/:id
 */
router.get('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], getShippingOrder);

/**
 * Actualizar estado de la orden
 * PUT /api/shipping-orders/:id/status
 */
router.put('/:id/status', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('status', 'El estado es obligatorio').isIn([
        'pending', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled'
    ]),
    validarCampos
], updateShippingStatus);

/**
 * Confirmar entrega (deposita comisión automáticamente)
 * PUT /api/shipping-orders/:id/confirm-delivery
 */
router.put('/:id/confirm-delivery', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], confirmOrderDelivery);

/**
 * 🆕 Crear orden de envío desde una transacción existente
 * POST /api/shipping-orders/create-from-transaction
 */
router.post('/create-from-transaction', [
    validarJWT,
    check('transactionId', 'El ID de la transacción es obligatorio').notEmpty(),
    check('transactionId', 'No es un ID de transacción válido').isMongoId(),
    validarCampos
], createOrderFromTransaction);

module.exports = router;
