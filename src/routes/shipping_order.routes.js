const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    getShippingOrders,
    getShippingOrder,
    updateShippingStatus,
    confirmOrderDelivery,
    getShippingOrdersSummary
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

module.exports = router;
