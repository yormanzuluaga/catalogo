const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');
const { isAdminRole } = require('../middlewares/validar_roles');

const {
    getMyOrders,
    updateOrderStatus,
    getOrderDetail,
    getWalletBalance,
    getPendingOrders,
    adminGetAllOrders,      // 🔐 ADMIN
    adminUpdateOrderStatus  // 🔐 ADMIN
} = require('../controllers/shipping_order_v2.controller');

const router = Router();

// ⚠️ IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

/**
 * 🔐 ADMIN: OBTENER TODAS LAS ÓRDENES DE TODOS LOS USUARIOS
 * GET /api/shipping-orders-v2/admin/all-orders
 */
router.get('/admin/all-orders', [
    validarJWT,
    isAdminRole,
    validarCampos
], adminGetAllOrders);

/**
 * 🔐 ADMIN: ACTUALIZAR ESTADO DE CUALQUIER ORDEN
 * PUT /api/shipping-orders-v2/admin/:id/status
 */
router.put('/admin/:id/status', [
    validarJWT,
    isAdminRole,
    check('id', 'No es un ID válido').isMongoId(),
    check('status', 'El estado es obligatorio').notEmpty(),
    check('status', 'Estado no válido').isIn([
        'pending', 'approved', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled'
    ]),
    validarCampos
], adminUpdateOrderStatus);

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
 * ⚠️ DEPRECADO: Actualizar estado de orden (ahora solo admin puede hacerlo)
 * PUT /api/shipping-orders-v2/:id/status
 * 
 * Este endpoint ahora requiere rol de administrador
 */
router.put('/:id/status', [
    validarJWT,
    isAdminRole,  // 🔐 Ahora requiere ser admin
    check('id', 'No es un ID válido').isMongoId(),
    check('status', 'El estado es obligatorio').notEmpty(),
    check('status', 'Estado no válido').isIn([
        'pending', 'approved', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled'
    ]),
    validarCampos
], adminUpdateOrderStatus);  // 🔧 Usa la función de admin

module.exports = router;
