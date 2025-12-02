const { response, request } = require('express');
const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');
const VerificationCode = require('../models/verification_code.model');
const User = require('../models/user.model');
const smsService = require('../services/sms.service');

/**
 * 🔐 Paso 1: Solicitar código de verificación para retiro
 * POST /api/wallet/withdrawal/request-code
 */
const requestWithdrawalCode = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { amount, withdrawalMethod, accountInfo } = req.body;

        console.log('💰 Solicitud de código de retiro:', {
            userId: uid,
            amount,
            withdrawalMethod
        });

        // 1. Validar monto
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                msg: 'El monto debe ser mayor a 0'
            });
        }

        // 2. Buscar usuario y wallet
        const user = await User.findById(uid);
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: 'Usuario no encontrado'
            });
        }

        const wallet = await Wallet.findOne({ user: uid, estado: true });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                msg: 'Wallet no encontrada'
            });
        }

        // 3. Validar saldo suficiente
        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                msg: 'Saldo insuficiente',
                available: wallet.balance,
                requested: amount,
                missing: amount - wallet.balance
            });
        }

        // 4. Validar monto mínimo
        const minimumWithdrawal = wallet.settings?.minimumWithdrawal || 50000;
        if (amount < minimumWithdrawal) {
            return res.status(400).json({
                success: false,
                msg: `El monto mínimo de retiro es $${minimumWithdrawal.toLocaleString()}`,
                minimumRequired: minimumWithdrawal,
                provided: amount
            });
        }

        // 5. Validar método de retiro
        const validMethods = ['bancolombia', 'nequi', 'daviplata', 'bank_transfer'];
        if (!validMethods.includes(withdrawalMethod)) {
            return res.status(400).json({
                success: false,
                msg: 'Método de retiro no válido',
                validMethods: ['bancolombia', 'nequi', 'daviplata', 'bank_transfer']
            });
        }

        // 6. Validar información de cuenta según método
        const accountValidation = validateAccountInfo(withdrawalMethod, accountInfo);
        if (!accountValidation.valid) {
            return res.status(400).json({
                success: false,
                msg: accountValidation.message,
                required: accountValidation.required
            });
        }

        // 7. Verificar que no haya códigos pendientes recientes (anti-spam)
        const recentCode = await VerificationCode.findOne({
            user: uid,
            operationType: 'withdrawal',
            status: 'pending',
            createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // Últimos 2 minutos
        });

        if (recentCode) {
            const timeLeft = Math.ceil((recentCode.expiresAt - new Date()) / 1000);
            return res.status(429).json({
                success: false,
                msg: 'Ya tienes un código de verificación activo',
                expiresIn: timeLeft,
                codeId: recentCode._id
            });
        }

        // 8. Generar código de verificación
        const code = VerificationCode.generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

        // 9. Formatear número de teléfono
        const phoneNumber = smsService.formatPhoneNumber(user.countryCode, user.mobile);

        // 10. Crear registro de código
        const verificationCode = new VerificationCode({
            user: uid,
            phoneNumber,
            code,
            operationType: 'withdrawal',
            operationData: {
                amount,
                withdrawalMethod,
                accountInfo,
                walletBalance: wallet.balance
            },
            expiresAt,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: 'pending'
        });

        await verificationCode.save();

        // 11. Enviar SMS
        let smsResult;
        try {
            smsResult = await smsService.sendVerificationCode(
                phoneNumber,
                code,
                'withdrawal'
            );
        } catch (smsError) {
            console.error('Error al enviar SMS:', smsError);
            // Eliminar código si falla el envío
            await verificationCode.deleteOne();

            return res.status(500).json({
                success: false,
                msg: 'Error al enviar código de verificación',
                error: smsError.message
            });
        }

        // 12. Respuesta exitosa
        res.json({
            success: true,
            msg: 'Código de verificación enviado',
            codeId: verificationCode._id,
            phoneNumber: maskPhoneNumber(phoneNumber),
            expiresIn: 300, // 5 minutos en segundos
            expiresAt,
            sms: smsResult,
            withdrawal: {
                amount,
                method: withdrawalMethod,
                accountInfo: maskAccountInfo(withdrawalMethod, accountInfo)
            },
            instructions: {
                step: 1,
                next: 'Ingresa el código de 6 dígitos que recibiste por SMS',
                endpoint: 'POST /api/wallet/withdrawal/verify-code'
            }
        });

    } catch (error) {
        console.error('Error en requestWithdrawalCode:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al solicitar código de verificación',
            error: error.message
        });
    }
};

/**
 * 🔐 Paso 2: Verificar código y procesar retiro
 * POST /api/wallet/withdrawal/verify-code
 */
const verifyCodeAndWithdraw = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { codeId, code } = req.body;

        console.log('🔍 Verificando código de retiro:', { codeId, userId: uid });

        // 1. Validar datos
        if (!codeId || !code) {
            return res.status(400).json({
                success: false,
                msg: 'Se requiere el ID del código y el código de verificación'
            });
        }

        // 2. Buscar código de verificación
        const verificationCode = await VerificationCode.findOne({
            _id: codeId,
            user: uid,
            operationType: 'withdrawal',
            estado: true
        });

        if (!verificationCode) {
            return res.status(404).json({
                success: false,
                msg: 'Código de verificación no encontrado'
            });
        }

        // 3. Verificar código
        const verificationResult = verificationCode.verify(code);
        await verificationCode.save();

        if (!verificationResult.success) {
            const attemptsLeft = 3 - verificationCode.attempts;
            return res.status(400).json({
                success: false,
                msg: verificationResult.message,
                attemptsLeft,
                codeExpired: verificationCode.status === 'expired'
            });
        }

        // 4. Extraer datos de la operación
        const { amount, withdrawalMethod, accountInfo } = verificationCode.operationData;

        // 5. Buscar wallet
        const wallet = await Wallet.findOne({ user: uid, estado: true });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                msg: 'Wallet no encontrada'
            });
        }

        // 6. Validar saldo nuevamente (por si cambió)
        if (wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                msg: 'Saldo insuficiente',
                available: wallet.balance,
                requested: amount
            });
        }

        // 7. Generar ID de transacción único
        const transactionId = generateTransactionId(withdrawalMethod);

        // 8. Crear movimiento de retiro
        const movement = new WalletMovements({
            type: 'withdrawal',
            amount: -amount, // Negativo porque es una salida
            points: 0,
            balanceAfter: wallet.balance - amount,
            pointsAfter: wallet.points,
            description: `💸 Retiro a ${getMethodLabel(withdrawalMethod)} - ${maskAccountNumber(accountInfo.accountNumber)}`,
            wallet: wallet._id,
            status: 'pending', // Pending hasta que admin apruebe
            withdrawalMethod,
            withdrawalInfo: {
                ...accountInfo,
                transactionId,
                requestedAt: new Date(),
                verificationCodeId: verificationCode._id
            },
            metadata: {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                verifiedWithSMS: true,
                phoneNumber: verificationCode.phoneNumber
            }
        });

        await movement.save();

        // 9. Actualizar saldo (restar del disponible)
        const previousBalance = wallet.balance;
        wallet.balance -= amount;
        await wallet.save();

        // 10. Marcar código como usado
        await verificationCode.markAsUsed();

        // 11. Respuesta exitosa
        res.json({
            success: true,
            msg: '✅ Retiro solicitado exitosamente',
            withdrawal: {
                id: movement._id,
                transactionId,
                amount,
                method: withdrawalMethod,
                accountInfo: maskAccountInfo(withdrawalMethod, accountInfo),
                status: 'pending',
                requestedAt: movement.createdAt
            },
            balance: {
                previous: previousBalance,
                current: wallet.balance,
                pending: wallet.pendingBalance,
                withdrawn: amount
            },
            nextSteps: {
                step: 2,
                message: 'Tu solicitud de retiro está siendo procesada',
                estimatedTime: '24-48 horas hábiles',
                canTrack: true,
                trackEndpoint: `GET /api/wallet/withdrawal/${movement._id}`
            },
            important: [
                '⏰ El retiro será procesado en 24-48 horas hábiles',
                '📧 Recibirás una notificación cuando se complete',
                '💰 El dinero fue descontado de tu balance disponible',
                '❌ Si cancelas o se rechaza, se devolverá a tu wallet'
            ]
        });

    } catch (error) {
        console.error('Error en verifyCodeAndWithdraw:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al verificar código y procesar retiro',
            error: error.message
        });
    }
};

/**
 * 📋 Obtener estado de un retiro
 * GET /api/wallet/withdrawal/:id
 */
const getWithdrawalStatus = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { id } = req.params;

        const wallet = await Wallet.findOne({ user: uid, estado: true });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                msg: 'Wallet no encontrada'
            });
        }

        const movement = await WalletMovements.findOne({
            _id: id,
            wallet: wallet._id,
            type: 'withdrawal',
            estado: true
        }).populate('processedBy', 'firstName lastName');

        if (!movement) {
            return res.status(404).json({
                success: false,
                msg: 'Retiro no encontrado'
            });
        }

        res.json({
            success: true,
            withdrawal: {
                id: movement._id,
                transactionId: movement.withdrawalInfo?.transactionId,
                amount: Math.abs(movement.amount),
                method: movement.withdrawalMethod,
                accountInfo: maskAccountInfo(movement.withdrawalMethod, movement.withdrawalInfo),
                status: movement.status,
                statusLabel: getStatusLabel(movement.status),
                requestedAt: movement.createdAt,
                processedAt: movement.withdrawalInfo?.processedDate,
                processedBy: movement.processedBy,
                notes: movement.withdrawalInfo?.notes
            }
        });

    } catch (error) {
        console.error('Error en getWithdrawalStatus:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener estado del retiro',
            error: error.message
        });
    }
};

/**
 * 📜 Obtener historial de retiros
 * GET /api/wallet/withdrawal/history
 */
const getWithdrawalHistory = async (req = request, res = response) => {
    try {
        const { uid } = req.authenticatedUser;
        const { status, limit = 20, skip = 0 } = req.query;

        const wallet = await Wallet.findOne({ user: uid, estado: true });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                msg: 'Wallet no encontrada'
            });
        }

        const filters = {
            wallet: wallet._id,
            type: 'withdrawal',
            estado: true
        };

        if (status) {
            filters.status = status;
        }

        const movements = await WalletMovements.find(filters)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        const total = await WalletMovements.countDocuments(filters);

        const withdrawals = movements.map(m => ({
            id: m._id,
            transactionId: m.withdrawalInfo?.transactionId,
            amount: Math.abs(m.amount),
            method: m.withdrawalMethod,
            accountInfo: maskAccountInfo(m.withdrawalMethod, m.withdrawalInfo),
            status: m.status,
            statusLabel: getStatusLabel(m.status),
            requestedAt: m.createdAt,
            processedAt: m.withdrawalInfo?.processedDate
        }));

        res.json({
            success: true,
            total,
            withdrawals,
            hasMore: (Number(skip) + Number(limit)) < total
        });

    } catch (error) {
        console.error('Error en getWithdrawalHistory:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al obtener historial de retiros',
            error: error.message
        });
    }
};

// ==========================================
// FUNCIONES HELPER
// ==========================================

function validateAccountInfo(method, accountInfo) {
    if (!accountInfo) {
        return {
            valid: false,
            message: 'Información de cuenta requerida',
            required: getRequiredFields(method)
        };
    }

    switch (method) {
        case 'bancolombia':
        case 'bank_transfer':
            if (!accountInfo.accountNumber || !accountInfo.accountType || !accountInfo.accountHolderName) {
                return {
                    valid: false,
                    message: 'Se requiere número de cuenta, tipo y titular',
                    required: ['accountNumber', 'accountType', 'accountHolderName']
                };
            }
            break;

        case 'nequi':
        case 'daviplata':
            if (!accountInfo.phoneNumber || !accountInfo.accountHolderName) {
                return {
                    valid: false,
                    message: 'Se requiere número de teléfono y nombre del titular',
                    required: ['phoneNumber', 'accountHolderName']
                };
            }
            break;

        default:
            return { valid: false, message: 'Método de retiro no válido' };
    }

    return { valid: true };
}

function getRequiredFields(method) {
    const fields = {
        bancolombia: ['accountNumber', 'accountType', 'accountHolderName'],
        bank_transfer: ['accountNumber', 'accountType', 'accountHolderName', 'bankName'],
        nequi: ['phoneNumber', 'accountHolderName'],
        daviplata: ['phoneNumber', 'accountHolderName']
    };
    return fields[method] || [];
}

function maskPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    return '+' + cleaned.substring(0, cleaned.length - 4) + '****';
}

function maskAccountNumber(accountNumber) {
    if (!accountNumber) return '';
    const cleaned = accountNumber.toString().replace(/\D/g, '');
    if (cleaned.length < 4) return accountNumber;
    return '****' + cleaned.substring(cleaned.length - 4);
}

function maskAccountInfo(method, accountInfo) {
    if (!accountInfo) return {};

    const masked = { ...accountInfo };

    if (masked.accountNumber) {
        masked.accountNumber = maskAccountNumber(masked.accountNumber);
    }

    if (masked.phoneNumber) {
        masked.phoneNumber = maskPhoneNumber(masked.phoneNumber);
    }

    return masked;
}

function generateTransactionId(method) {
    const prefix = {
        bancolombia: 'BCOL',
        nequi: 'NEQI',
        daviplata: 'DAVI',
        bank_transfer: 'BANK'
    }[method] || 'WDRL';

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
}

function getMethodLabel(method) {
    const labels = {
        bancolombia: 'Bancolombia',
        nequi: 'Nequi',
        daviplata: 'Daviplata',
        bank_transfer: 'Transferencia Bancaria'
    };
    return labels[method] || method;
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Pendiente',
        approved: 'Aprobado',
        completed: 'Completado',
        rejected: 'Rechazado',
        expired: 'Expirado'
    };
    return labels[status] || status;
}

module.exports = {
    requestWithdrawalCode,
    verifyCodeAndWithdraw,
    getWithdrawalStatus,
    getWithdrawalHistory
};
