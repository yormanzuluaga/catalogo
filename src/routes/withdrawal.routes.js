const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar_campos');
const { validarJWT } = require('../middlewares/validar_jwt');
const { isAdminRole } = require('../middlewares/validar_roles');

const {
    requestWithdrawal,
    getMyWithdrawals,
    getWithdrawalDetail,
    adminGetAllWithdrawals,
    adminApproveWithdrawal,
    adminRejectWithdrawal,
    cancelMyWithdrawal
} = require('../controllers/withdrawal.controller');

const router = Router();

// ⚠️ IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros

/**
 * 🔐 ADMIN: OBTENER TODAS LAS SOLICITUDES
 * GET /api/withdrawals/admin/all-requests
 */
router.get('/admin/all-requests', [
    validarJWT,
    isAdminRole,
    validarCampos
], adminGetAllWithdrawals);

/**
 * 🔐 ADMIN: APROBAR SOLICITUD
 * PUT /api/withdrawals/admin/:id/approve
 */
router.put('/admin/:id/approve', [
    validarJWT,
    isAdminRole,
    check('id', 'ID no válido').isMongoId(),
    validarCampos
], adminApproveWithdrawal);

/**
 * 🔐 ADMIN: RECHAZAR SOLICITUD
 * PUT /api/withdrawals/admin/:id/reject
 */
router.put('/admin/:id/reject', [
    validarJWT,
    isAdminRole,
    check('id', 'ID no válido').isMongoId(),
    check('rejectionReason', 'La razón de rechazo es obligatoria').notEmpty(),
    validarCampos
], adminRejectWithdrawal);

/**
 * 🆕 CREAR SOLICITUD DE RETIRO
 * POST /api/withdrawals/request
 */
router.post('/request', [
    validarJWT,
    check('amount', 'El monto es obligatorio').notEmpty(),
    check('amount', 'El monto debe ser mayor a 0').isFloat({ min: 1 }),
    check('withdrawalMethod', 'El método de retiro es obligatorio').notEmpty(),
    check('withdrawalMethod', 'Método de retiro no válido').isIn(['nequi', 'bancolombia', 'daviplata', 'other_bank']),
    check('accountInfo.accountNumber', 'El número de cuenta es obligatorio').notEmpty(),
    check('accountInfo.accountType', 'El tipo de cuenta es obligatorio').notEmpty(),
    check('accountInfo.accountHolder', 'El titular de la cuenta es obligatorio').notEmpty(),
    check('accountInfo.documentType', 'El tipo de documento es obligatorio').notEmpty(),
    check('accountInfo.documentNumber', 'El número de documento es obligatorio').notEmpty(),
    check('accountInfo.email', 'El email es obligatorio').isEmail(),
    check('accountInfo.phone', 'El teléfono es obligatorio').notEmpty(),
    validarCampos
], requestWithdrawal);

/**
 * 🆕 OBTENER MIS SOLICITUDES
 * GET /api/withdrawals/my-withdrawals
 */
router.get('/my-withdrawals', [
    validarJWT
], getMyWithdrawals);

/**
 * 🆕 CANCELAR MI SOLICITUD
 * DELETE /api/withdrawals/:id
 */
router.delete('/:id', [
    validarJWT,
    check('id', 'ID no válido').isMongoId(),
    validarCampos
], cancelMyWithdrawal);

/**
 * 🆕 OBTENER DETALLE DE SOLICITUD
 * GET /api/withdrawals/:id
 */
router.get('/:id', [
    validarJWT,
    check('id', 'ID no válido').isMongoId(),
    validarCampos
], getWithdrawalDetail);

module.exports = router;
