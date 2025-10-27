const { Router } = require('express');
const { check } = require('express-validator');

const middleware = require('../middlewares/validar_campos');
const middlewareJWT = require('../middlewares/validar_jwt');
const middlewareRoles = require('../middlewares/validar_roles');
const helpers = require('../helpers/db_validators');

const ordenCtrl = require('../controllers/orden.controller');

const router = Router();

// ============= RUTAS PARA VENDEDORAS =============

/**
 * Crear nueva orden
 * POST /api/orders
 */
router.post('/', [
    middlewareJWT.validarJWT,
    check('items', 'Los items son requeridos').isArray({ min: 1 }),
    check('items.*.product', 'El ID del producto es requerido').isMongoId(),
    check('items.*.quantity', 'La cantidad debe ser un número mayor a 0').isInt({ min: 1 }),
    check('items.*.price', 'El precio debe ser un número mayor a 0').isFloat({ min: 0.01 }),
    check('totalPrice', 'El precio total es requerido').isFloat({ min: 0.01 }),
    check('paymentMethod', 'El método de pago es requerido').not().isEmpty(),
    check('phone', 'El teléfono es requerido').not().isEmpty(),
    check('name', 'El nombre del cliente es requerido').not().isEmpty(),
    // Validaciones de dirección
    check('customerAddress.street', 'La dirección es requerida').not().isEmpty(),
    check('customerAddress.city', 'La ciudad es requerida').not().isEmpty(),
    check('customerAddress.department', 'El departamento es requerido').not().isEmpty(),
    middleware.validarCampos
], ordenCtrl.createOrder);

/**
 * Obtener mis órdenes
 * GET /api/orders/my-orders
 */
router.get('/my-orders', [
    middlewareJWT.validarJWT
], ordenCtrl.getMyOrders);

/**
 * Obtener detalle de una orden
 * GET /api/orders/:id
 */
router.get('/:id', [
    middlewareJWT.validarJWT,
    check('id', 'ID debe ser un MongoID válido').isMongoId(),
    middleware.validarCampos
], ordenCtrl.getOrderById);

// ============= RUTAS PARA ADMINISTRADORES =============

/**
 * Obtener todas las órdenes (Admin)
 * GET /api/orders/admin/all
 */
router.get('/admin/all', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole
], ordenCtrl.getAllOrders);

/**
 * Aprobar comisiones de una orden (Admin)
 * PUT /api/orders/admin/approve-commissions/:id
 */
router.put('/admin/approve-commissions/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole,
    check('id', 'ID debe ser un MongoID válido').isMongoId(),
    middleware.validarCampos
], ordenCtrl.approveOrderCommissions);

/**
 * Actualizar estado de orden (Admin)
 * PUT /api/orders/admin/status/:id
 */
router.put('/admin/status/:id', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole,
    check('id', 'ID debe ser un MongoID válido').isMongoId(),
    check('status', 'El estado es requerido').not().isEmpty(),
    check('status', 'Estado no válido').isIn([
        'draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
    ]),
    middleware.validarCampos
], ordenCtrl.updateOrderStatus);

/**
 * Obtener estadísticas de órdenes (Admin)
 * GET /api/orders/admin/stats
 */
router.get('/admin/stats', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole
], ordenCtrl.getOrdersStats);

module.exports = router;