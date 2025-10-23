const { Router } = require('express');
const { check } = require('express-validator');

const walletCtrl = require('../controllers/wallet.controller');
const middleware = require('../middlewares/validar_campos');
const middlewareJWT = require('../middlewares/validar_jwt');
const middlewareRoles = require('../middlewares/validar_roles');

const router = Router();

// ============= RUTAS PARA VENDEDORAS =============

/**
 * Obtener mi wallet
 * GET /api/wallet/my-wallet
 */
router.get('/my-wallet', [
    middlewareJWT.validarJWT
], walletCtrl.getMyWallet);

/**
 * Obtener mis movimientos
 * GET /api/wallet/my-movements
 */
router.get('/my-movements', [
    middlewareJWT.validarJWT
], walletCtrl.getMyMovements);

/**
 * Solicitar retiro
 * POST /api/wallet/withdrawal
 */
router.post('/withdrawal', [
    middlewareJWT.validarJWT,
    check('amount', 'El monto es requerido y debe ser un número').isNumeric(),
    check('amount', 'El monto debe ser mayor a 0').isFloat({ min: 0.01 }),
    check('withdrawalMethod', 'El método de retiro es requerido').not().isEmpty(),
    check('withdrawalMethod', 'Método de retiro no válido').isIn([
        'bank_transfer', 'nequi', 'daviplata', 'bancolombia', 'other'
    ]),
    middleware.validarCampos
], walletCtrl.requestWithdrawal);

/**
 * Actualizar configuración de wallet
 * PUT /api/wallet/settings
 */
router.put('/settings', [
    middlewareJWT.validarJWT,
    check('minimumWithdrawal', 'El monto mínimo debe ser un número').optional().isNumeric(),
    check('preferredPaymentMethod', 'Método de pago no válido').optional().isIn([
        'bank_transfer', 'nequi', 'daviplata', 'bancolombia', 'other'
    ]),
    middleware.validarCampos
], walletCtrl.updateWalletSettings);

/**
 * Obtener estadísticas de mi wallet
 * GET /api/wallet/stats
 */
router.get('/stats', [
    middlewareJWT.validarJWT
], walletCtrl.getWalletStats);

// ============= RUTAS PARA ADMINISTRADORES =============

/**
 * Obtener todas las wallets (Admin)
 * GET /api/wallet/admin/all
 */
router.get('/admin/all', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole
], walletCtrl.getAllWallets);

/**
 * Aprobar comisión (Admin)
 * PUT /api/wallet/admin/approve-commission/:movementId
 */
router.put('/admin/approve-commission/:movementId', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole,
    check('movementId', 'ID de movimiento debe ser un ID válido de MongoDB').isMongoId(),
    middleware.validarCampos
], walletCtrl.approveCommission);

/**
 * Procesar retiro (Admin)
 * PUT /api/wallet/admin/process-withdrawal/:movementId
 */
router.put('/admin/process-withdrawal/:movementId', [
    middlewareJWT.validarJWT,
    middlewareRoles.isAdminRole,
    check('movementId', 'ID de movimiento debe ser un ID válido de MongoDB').isMongoId(),
    check('status', 'El estado es requerido').not().isEmpty(),
    check('status', 'Estado no válido').isIn(['completed', 'rejected']),
    middleware.validarCampos
], walletCtrl.processWithdrawal);

module.exports = router;