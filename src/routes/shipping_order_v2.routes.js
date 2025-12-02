const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');

const {
    getMyOrders,
    updateOrderStatus,
    getOrderDetail,
    getWalletBalance,
    getPendingOrders  // 🆕 Nuevo endpoint
} = require('../controllers/shipping_order_v2.controller');

const router = Router();

// ⚠️ IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

/**
 * 🆕 OBTENER BALANCE DEL WALLET
 * GET /api/shipping-orders-v2/wallet-balance
 */
router.get('/wallet-balance', [
    validarJWT
], getWalletBalance);

/**
 * 🆕 OBTENER ÓRDENES PENDIENTES (NO APROBADAS)
 * GET /api/shipping-orders-v2/pending-orders
 */
router.get('/pending-orders', [
    validarJWT
], getPendingOrders);

/**
 * 🆕 OBTENER MIS ÓRDENES
 * GET /api/shipping-orders-v2/my-orders
 */
router.get('/my-orders', [
    validarJWT
], getMyOrders);

// ⚠️ Esta ruta debe ir al FINAL porque captura cualquier string como ID
/**
 * 🆕 OBTENER DETALLE DE UNA ORDEN
 * GET /api/shipping-orders-v2/:id
 */
router.get('/:id', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    validarCampos
], getOrderDetail);

/**
 * 🆕 ACTUALIZAR ESTADO DE ORDEN
 * PUT /api/shipping-orders-v2/:id/status
 */
router.put('/:id/status', [
    validarJWT,
    check('id', 'No es un ID válido').isMongoId(),
    check('status', 'El estado es obligatorio').notEmpty(),
    check('status', 'Estado no válido').isIn([
        'pending', 'approved', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled'
    ]),
    validarCampos
], updateOrderStatus);

module.exports = router;
