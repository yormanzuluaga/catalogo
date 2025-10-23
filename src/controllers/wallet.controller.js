const { response, request } = require('express');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');
const User = require('../models/user.model');

const walletCtrl = {};

/**
 * Obtener wallet de la vendedora autenticada
 */
walletCtrl.getMyWallet = async (req = request, res = response) => {
    try {
        const userId = req.usuario.id;

        let wallet = await Wallet.findOne({ user: userId }).populate('user', 'firstName lastName email');

        // Si no existe wallet, crear una nueva
        if (!wallet) {
            wallet = new Wallet({ user: userId });
            await wallet.save();
            wallet = await Wallet.findById(wallet._id).populate('user', 'firstName lastName email');
        }

        res.json({
            ok: true,
            wallet
        });

    } catch (error) {
        console.error('Error en getMyWallet:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

/**
 * Obtener historial de movimientos de la wallet
 */
walletCtrl.getMyMovements = async (req = request, res = response) => {
    try {
        const userId = req.usuario.id;
        const { page = 1, limit = 20, type, status } = req.query;

        // Buscar la wallet del usuario
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({
                ok: false,
                msg: 'Wallet no encontrada'
            });
        }

        // Construir filtros
        const filters = { wallet: wallet._id, estado: true };
        if (type) filters.type = type;
        if (status) filters.status = status;

        // Obtener movimientos con paginación
        const movements = await WalletMovements.find(filters)
            .populate('sale', 'total createdAt')
            .populate('product', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await WalletMovements.countDocuments(filters);

        res.json({
            ok: true,
            movements,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error en getMyMovements:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

/**
 * Solicitar retiro de fondos
 */
walletCtrl.requestWithdrawal = async (req = request, res = response) => {
    try {
        const userId = req.usuario.id;
        const { amount, withdrawalMethod, bankInfo } = req.body;

        // Validar monto
        if (!amount || amount <= 0) {
            return res.status(400).json({
                ok: false,
                msg: 'El monto debe ser mayor a 0'
            });
        }

        // Buscar wallet
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({
                ok: false,
                msg: 'Wallet no encontrada'
            });
        }

        // Validar saldo suficiente
        if (wallet.balance < amount) {
            return res.status(400).json({
                ok: false,
                msg: 'Saldo insuficiente'
            });
        }

        // Validar monto mínimo
        if (amount < wallet.settings.minimumWithdrawal) {
            return res.status(400).json({
                ok: false,
                msg: `El monto mínimo de retiro es $${wallet.settings.minimumWithdrawal.toLocaleString()}`
            });
        }

        // Crear movimiento de retiro pendiente
        const movement = new WalletMovements({
            type: 'withdrawal',
            amount: -amount,
            balanceAfter: wallet.balance - amount,
            pointsAfter: wallet.points,
            description: `Solicitud de retiro por $${amount.toLocaleString()}`,
            wallet: wallet._id,
            status: 'pending',
            withdrawalMethod,
            withdrawalInfo: bankInfo,
            metadata: {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await movement.save();

        // Actualizar saldo (restar del disponible)
        wallet.balance -= amount;
        await wallet.save();

        res.json({
            ok: true,
            msg: 'Solicitud de retiro creada exitosamente',
            movement,
            newBalance: wallet.balance
        });

    } catch (error) {
        console.error('Error en requestWithdrawal:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

/**
 * Actualizar configuración de la wallet
 */
walletCtrl.updateWalletSettings = async (req = request, res = response) => {
    try {
        const userId = req.usuario.id;
        const { minimumWithdrawal, preferredPaymentMethod, bankInfo, notifications } = req.body;

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({
                ok: false,
                msg: 'Wallet no encontrada'
            });
        }

        // Actualizar configuraciones
        if (minimumWithdrawal !== undefined) {
            wallet.settings.minimumWithdrawal = minimumWithdrawal;
        }
        if (preferredPaymentMethod) {
            wallet.settings.preferredPaymentMethod = preferredPaymentMethod;
        }
        if (bankInfo) {
            wallet.settings.bankInfo = { ...wallet.settings.bankInfo, ...bankInfo };
        }
        if (notifications) {
            wallet.settings.notifications = { ...wallet.settings.notifications, ...notifications };
        }

        await wallet.save();

        res.json({
            ok: true,
            msg: 'Configuración actualizada exitosamente',
            wallet
        });

    } catch (error) {
        console.error('Error en updateWalletSettings:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

/**
 * Obtener estadísticas de la wallet
 */
walletCtrl.getWalletStats = async (req = request, res = response) => {
    try {
        const userId = req.usuario.id;

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({
                ok: false,
                msg: 'Wallet no encontrada'
            });
        }

        // Obtener estadísticas de movimientos
        const movementsStats = await WalletMovements.aggregate([
            { $match: { wallet: wallet._id, estado: true } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        // Movimientos del último mes
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const recentMovements = await WalletMovements.find({
            wallet: wallet._id,
            estado: true,
            createdAt: { $gte: lastMonth }
        }).countDocuments();

        // Comisiones pendientes
        const pendingCommissions = await WalletMovements.find({
            wallet: wallet._id,
            type: 'commission_earned',
            status: 'pending'
        }).countDocuments();

        res.json({
            ok: true,
            stats: {
                wallet: wallet.stats,
                movements: movementsStats,
                recentMovements,
                pendingCommissions,
                canWithdraw: wallet.canWithdraw,
                totalBalance: wallet.totalBalance
            }
        });

    } catch (error) {
        console.error('Error en getWalletStats:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

// ============= MÉTODOS PARA ADMINISTRADORES =============

/**
 * Obtener todas las wallets (Admin)
 */
walletCtrl.getAllWallets = async (req = request, res = response) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        // Construir filtros
        let userFilter = {};
        if (search) {
            userFilter = {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Buscar usuarios que coincidan con el filtro
        const users = await User.find(userFilter).select('_id');
        const userIds = users.map(user => user._id);

        const filters = { estado: true };
        if (userIds.length > 0) {
            filters.user = { $in: userIds };
        }

        const wallets = await Wallet.find(filters)
            .populate('user', 'firstName lastName email avatar')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await Wallet.countDocuments(filters);

        res.json({
            ok: true,
            wallets,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error en getAllWallets:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

/**
 * Aprobar comisión (Admin)
 */
walletCtrl.approveCommission = async (req = request, res = response) => {
    try {
        const { movementId } = req.params;
        const adminId = req.usuario.id;

        const movement = await WalletMovements.findById(movementId);
        if (!movement) {
            return res.status(404).json({
                ok: false,
                msg: 'Movimiento no encontrado'
            });
        }

        if (movement.status !== 'pending') {
            return res.status(400).json({
                ok: false,
                msg: 'El movimiento ya fue procesado'
            });
        }

        // Actualizar movimiento
        movement.status = 'approved';
        movement.processedBy = adminId;
        await movement.save();

        // Aprobar comisión en la wallet
        const wallet = await Wallet.findById(movement.wallet);
        await wallet.approveCommission(Math.abs(movement.amount));

        res.json({
            ok: true,
            msg: 'Comisión aprobada exitosamente',
            movement
        });

    } catch (error) {
        console.error('Error en approveCommission:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

/**
 * Procesar retiro (Admin)
 */
walletCtrl.processWithdrawal = async (req = request, res = response) => {
    try {
        const { movementId } = req.params;
        const { status, transactionId, notes } = req.body;
        const adminId = req.usuario.id;

        const movement = await WalletMovements.findById(movementId);
        if (!movement) {
            return res.status(404).json({
                ok: false,
                msg: 'Movimiento no encontrado'
            });
        }

        if (movement.status !== 'pending') {
            return res.status(400).json({
                ok: false,
                msg: 'El movimiento ya fue procesado'
            });
        }

        // Actualizar movimiento
        movement.status = status;
        movement.processedBy = adminId;
        movement.withdrawalInfo.transactionId = transactionId;
        movement.withdrawalInfo.notes = notes;
        movement.withdrawalInfo.processedDate = new Date();

        await movement.save();

        // Si se rechaza el retiro, devolver el dinero a la wallet
        if (status === 'rejected') {
            const wallet = await Wallet.findById(movement.wallet);
            wallet.balance += Math.abs(movement.amount);
            await wallet.save();
        }

        res.json({
            ok: true,
            msg: `Retiro ${status === 'completed' ? 'completado' : 'rechazado'} exitosamente`,
            movement
        });

    } catch (error) {
        console.error('Error en processWithdrawal:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

module.exports = walletCtrl;