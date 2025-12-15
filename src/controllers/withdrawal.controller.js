const { response, request } = require('express');
const Withdrawal = require('../models/withdrawal.model');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');

/**
 * 🆕 CREAR SOLICITUD DE RETIRO
 * POST /api/withdrawals/request
 */
const requestWithdrawal = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const {
            amount,
            withdrawalMethod,
            accountInfo,
            userNotes
        } = req.body;

        console.log('💳 Solicitud de retiro - Usuario:', uid);
        console.log('💰 Monto:', amount);

        // Validar que el monto sea válido
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                msg: 'El monto debe ser mayor a 0'
            });
        }

        // Buscar wallet del usuario
        const wallet = await Wallet.findOne({ user: uid, estado: true });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                msg: 'Wallet no encontrado'
            });
        }

        // Verificar que tenga saldo disponible suficiente
        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                msg: `Saldo insuficiente. Disponible: $${wallet.balance.toLocaleString()}`,
                availableBalance: wallet.balance
            });
        }

        // Verificar que no tenga retiros pendientes
        const pendingWithdrawals = await Withdrawal.countDocuments({
            user: uid,
            status: { $in: ['pending', 'processing'] },
            estado: true
        });

        if (pendingWithdrawals > 0) {
            return res.status(400).json({
                success: false,
                msg: 'Ya tienes una solicitud de retiro pendiente. Espera a que sea procesada.'
            });
        }

        // Generar número de retiro
        const withdrawalNumber = await Withdrawal.generateWithdrawalNumber();

        // Crear solicitud de retiro
        const withdrawalData = {
            withdrawalNumber,
            user: uid,
            wallet: wallet._id,
            amount,
            withdrawalMethod,
            accountInfo: {
                accountNumber: accountInfo.accountNumber,
                accountType: accountInfo.accountType,
                accountHolder: accountInfo.accountHolder,
                bankName: accountInfo.bankName || '',
                documentType: accountInfo.documentType,
                documentNumber: accountInfo.documentNumber,
                email: accountInfo.email,
                phone: accountInfo.phone
            },
            status: 'pending',
            walletBalanceSnapshot: {
                availableBalance: wallet.balance,
                pendingBalance: wallet.pendingBalance,
                totalEarned: wallet.totalCommissionsEarned
            },
            notes: {
                userNotes: userNotes || ''
            },
            estado: true
        };

        const withdrawal = new Withdrawal(withdrawalData);
        await withdrawal.save();

        console.log('✅ Solicitud de retiro creada:', withdrawalNumber);

        res.status(201).json({
            success: true,
            msg: 'Solicitud de retiro creada exitosamente. Será revisada por el administrador.',
            withdrawal: {
                _id: withdrawal._id,
                withdrawalNumber: withdrawal.withdrawalNumber,
                amount: withdrawal.amount,
                withdrawalMethod: withdrawal.withdrawalMethod,
                status: withdrawal.status,
                requestedAt: withdrawal.requestedAt
            }
        });

    } catch (error) {
        console.error('❌ Error al crear solicitud de retiro:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al crear solicitud de retiro',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER MIS SOLICITUDES DE RETIRO
 * GET /api/withdrawals/my-withdrawals
 */
const getMyWithdrawals = async (req = request, res = response) => {
    try {
        const uid = req.authenticatedUser._id;
        const { limit = 10, skip = 0, status } = req.query;

        console.log('📋 Obteniendo retiros del usuario:', uid);

        const filters = { user: uid, estado: true };
        if (status) {
            filters.status = status;
        }

        const [total, withdrawals] = await Promise.all([
            Withdrawal.countDocuments(filters),
            Withdrawal.find(filters)
                .populate('wallet', 'balance pendingBalance')
                .sort({ requestedAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit))
        ]);

        res.json({
            success: true,
            total,
            withdrawals,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('❌ Error al obtener retiros:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener retiros',
            error: error.message
        });
    }
};

/**
 * 🆕 OBTENER DETALLE DE SOLICITUD
 * GET /api/withdrawals/:id
 */
const getWithdrawalDetail = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const uid = req.authenticatedUser._id;

        const withdrawal = await Withdrawal.findOne({
            _id: id,
            user: uid,
            estado: true
        })
            .populate('user', 'firstName lastName email')
            .populate('wallet', 'balance pendingBalance')
            .populate('processedBy', 'firstName lastName');

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                msg: 'Solicitud de retiro no encontrada'
            });
        }

        res.json({
            success: true,
            withdrawal
        });

    } catch (error) {
        console.error('❌ Error al obtener detalle:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener detalle de retiro',
            error: error.message
        });
    }
};

/**
 * 🔐 ADMIN: OBTENER TODAS LAS SOLICITUDES
 * GET /api/withdrawals/admin/all-requests
 */
const adminGetAllWithdrawals = async (req = request, res = response) => {
    try {
        const { limit = 20, skip = 0, status, userId } = req.query;

        console.log('👨‍💼 ADMIN: Obteniendo todas las solicitudes de retiro');

        const filters = { estado: true };
        if (status) {
            filters.status = status;
        }
        if (userId) {
            filters.user = userId;
        }

        const [total, withdrawals] = await Promise.all([
            Withdrawal.countDocuments(filters),
            Withdrawal.find(filters)
                .populate('user', 'firstName lastName email phone')
                .populate('wallet', 'balance pendingBalance totalCommissionsEarned')
                .populate('processedBy', 'firstName lastName')
                .sort({ requestedAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit))
        ]);

        console.log(`✅ ADMIN: ${withdrawals.length} solicitudes encontradas de ${total} totales`);

        res.json({
            success: true,
            total,
            withdrawals,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('❌ Error admin al obtener solicitudes:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener solicitudes',
            error: error.message
        });
    }
};

/**
 * 🔐 ADMIN: APROBAR SOLICITUD DE RETIRO
 * PUT /api/withdrawals/admin/:id/approve
 */
const adminApproveWithdrawal = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const adminUser = req.authenticatedUser;
        const adminNotes = req.body?.adminNotes || '';
        const transactionId = req.body?.transactionId || '';
        const transferReference = req.body?.transferReference || '';

        console.log('👨‍💼 ADMIN: Aprobando retiro:', id);
        console.log('Admin:', adminUser.firstName);

        // Buscar solicitud
        const withdrawal = await Withdrawal.findOne({
            _id: id,
            estado: true
        }).populate('wallet');

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                msg: 'Solicitud de retiro no encontrada'
            });
        }

        if (!withdrawal.canBeApproved()) {
            return res.status(400).json({
                success: false,
                msg: `No se puede aprobar esta solicitud. Estado actual: ${withdrawal.status}`
            });
        }

        // Buscar wallet
        const wallet = await Wallet.findOne({
            _id: withdrawal.wallet._id,
            estado: true
        });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                msg: 'Wallet no encontrado'
            });
        }

        // Verificar que aún tenga saldo suficiente
        if (wallet.balance < withdrawal.amount) {
            return res.status(400).json({
                success: false,
                msg: `Saldo insuficiente en wallet. Disponible: $${wallet.balance.toLocaleString()}, Solicitado: $${withdrawal.amount.toLocaleString()}`
            });
        }

        // Restar del balance
        wallet.balance = wallet.balance - withdrawal.amount;
        await wallet.save();

        // Actualizar solicitud
        withdrawal.status = 'completed';
        withdrawal.approvedAt = new Date();
        withdrawal.processedAt = new Date();
        withdrawal.completedAt = new Date();
        withdrawal.processedBy = adminUser._id;
        withdrawal.notes.adminNotes = adminNotes;
        withdrawal.transactionInfo = {
            transactionId: transactionId,
            transferReference: transferReference,
            processedDate: new Date()
        };
        await withdrawal.save();

        // Crear movimiento en wallet
        const movement = new WalletMovements({
            type: 'withdrawal',
            amount: -withdrawal.amount,
            points: 0,
            balanceAfter: wallet.balance,
            pointsAfter: wallet.points,
            description: `💸 Retiro aprobado - ${withdrawal.withdrawalNumber}`,
            wallet: wallet._id,
            status: 'completed',
            metadata: {
                withdrawalId: withdrawal._id,
                withdrawalNumber: withdrawal.withdrawalNumber,
                withdrawalMethod: withdrawal.withdrawalMethod,
                accountNumber: withdrawal.accountInfo.accountNumber,
                approvedBy: adminUser.firstName,
                transactionId: transactionId
            }
        });
        await movement.save();

        console.log('✅ ADMIN: Retiro aprobado y procesado');

        await withdrawal.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'processedBy', select: 'firstName lastName' }
        ]);

        res.json({
            success: true,
            msg: `Retiro aprobado exitosamente. Se descontó $${withdrawal.amount.toLocaleString()} del wallet.`,
            withdrawal,
            wallet: {
                newBalance: wallet.balance,
                pendingBalance: wallet.pendingBalance
            }
        });

    } catch (error) {
        console.error('❌ Error al aprobar retiro:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al aprobar retiro',
            error: error.message
        });
    }
};

/**
 * 🔐 ADMIN: RECHAZAR SOLICITUD DE RETIRO
 * PUT /api/withdrawals/admin/:id/reject
 */
const adminRejectWithdrawal = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const adminUser = req.authenticatedUser;
        const rejectionReason = req.body?.rejectionReason || '';
        const adminNotes = req.body?.adminNotes || '';

        console.log('👨‍💼 ADMIN: Rechazando retiro:', id);

        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                msg: 'La razón de rechazo es obligatoria'
            });
        }

        const withdrawal = await Withdrawal.findOne({
            _id: id,
            estado: true
        });

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                msg: 'Solicitud de retiro no encontrada'
            });
        }

        if (!withdrawal.canBeRejected()) {
            return res.status(400).json({
                success: false,
                msg: `No se puede rechazar esta solicitud. Estado actual: ${withdrawal.status}`
            });
        }

        withdrawal.status = 'rejected';
        withdrawal.rejectedAt = new Date();
        withdrawal.processedBy = adminUser._id;
        withdrawal.notes.rejectionReason = rejectionReason;
        withdrawal.notes.adminNotes = adminNotes;
        await withdrawal.save();

        console.log('✅ ADMIN: Retiro rechazado');

        await withdrawal.populate([
            { path: 'user', select: 'firstName lastName email' },
            { path: 'processedBy', select: 'firstName lastName' }
        ]);

        res.json({
            success: true,
            msg: 'Solicitud rechazada exitosamente',
            withdrawal
        });

    } catch (error) {
        console.error('❌ Error al rechazar retiro:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al rechazar retiro',
            error: error.message
        });
    }
};

/**
 * 🆕 CANCELAR MI SOLICITUD (solo si está pendiente)
 * DELETE /api/withdrawals/:id
 */
const cancelMyWithdrawal = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const uid = req.authenticatedUser._id;

        const withdrawal = await Withdrawal.findOne({
            _id: id,
            user: uid,
            estado: true
        });

        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                msg: 'Solicitud de retiro no encontrada'
            });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({
                success: false,
                msg: `No puedes cancelar esta solicitud. Estado actual: ${withdrawal.status}`
            });
        }

        withdrawal.estado = false;
        await withdrawal.save();

        res.json({
            success: true,
            msg: 'Solicitud cancelada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error al cancelar solicitud:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al cancelar solicitud',
            error: error.message
        });
    }
};

module.exports = {
    requestWithdrawal,
    getMyWithdrawals,
    getWithdrawalDetail,
    adminGetAllWithdrawals,
    adminApproveWithdrawal,
    adminRejectWithdrawal,
    cancelMyWithdrawal
};
