const Wallet = require('../models/wallet.model');
const WalletMovements = require('../models/wallet_movements_model');
const Product = require('../models/product.model');

class WalletService {
    
    /**
     * Calcular comisión basada en el margen de ganancia
     * @param {Object} product - Producto vendido
     * @param {Number} salePrice - Precio de venta
     * @param {Number} commissionRate - Porcentaje de comisión (ej: 20 = 20%)
     * @returns {Number} Monto de comisión
     */
    static calculateCommission(product, salePrice, commissionRate = 20) {
        // Margen de ganancia = Precio de venta - Precio base
        const margin = salePrice - product.price;
        
        // Comisión = Porcentaje del margen
        const commission = (margin * commissionRate) / 100;
        
        return Math.max(0, commission); // No permitir comisiones negativas
    }

    /**
     * Calcular puntos basados en el monto de venta
     * @param {Number} saleAmount - Monto de la venta
     * @param {Number} pointsRate - Puntos por cada peso (ej: 1 punto por cada 10000)
     * @returns {Number} Puntos ganados
     */
    static calculatePoints(saleAmount, pointsRate = 10000) {
        return Math.floor(saleAmount / pointsRate);
    }

    /**
     * Procesar venta y generar comisión y puntos
     * @param {String} userId - ID del usuario/vendedora
     * @param {Object} saleData - Datos de la venta
     * @param {String} saleData.productId - ID del producto
     * @param {Number} saleData.salePrice - Precio de venta
     * @param {Number} saleData.quantity - Cantidad vendida
     * @param {String} saleData.saleId - ID de la venta
     * @returns {Object} Resultado del procesamiento
     */
    static async processSale(userId, saleData) {
        try {
            const { productId, salePrice, quantity = 1, saleId } = saleData;

            // Obtener o crear wallet
            let wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                wallet = new Wallet({ user: userId });
                await wallet.save();
            }

            // Obtener producto
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Producto no encontrado');
            }

            // Calcular montos totales
            const totalSaleAmount = salePrice * quantity;
            const commissionPerUnit = this.calculateCommission(product, salePrice);
            const totalCommission = commissionPerUnit * quantity;
            const pointsEarned = this.calculatePoints(totalSaleAmount);

            // Crear movimiento de comisión
            if (totalCommission > 0) {
                const commissionMovement = new WalletMovements({
                    type: 'commission_earned',
                    amount: totalCommission,
                    balanceAfter: wallet.pendingBalance + totalCommission,
                    pointsAfter: wallet.points + pointsEarned,
                    description: `Comisión por venta de ${quantity}x ${product.name}`,
                    wallet: wallet._id,
                    sale: saleId,
                    product: productId,
                    status: 'pending' // Las comisiones requieren aprobación
                });

                await commissionMovement.save();

                // Actualizar wallet con comisión pendiente
                await wallet.addCommission(totalCommission, `Venta de ${product.name}`);
            }

            // Crear movimiento de puntos (se aprueban automáticamente)
            if (pointsEarned > 0) {
                const pointsMovement = new WalletMovements({
                    type: 'points_earned',
                    amount: 0,
                    points: pointsEarned,
                    balanceAfter: wallet.balance,
                    pointsAfter: wallet.points + pointsEarned,
                    description: `${pointsEarned} puntos por venta de $${totalSaleAmount.toLocaleString()}`,
                    wallet: wallet._id,
                    sale: saleId,
                    product: productId,
                    status: 'approved'
                });

                await pointsMovement.save();

                // Agregar puntos a la wallet
                await wallet.addPoints(pointsEarned);
            }

            // Actualizar estadísticas de la wallet
            await wallet.updateStats(totalSaleAmount, totalCommission);

            return {
                success: true,
                commission: totalCommission,
                points: pointsEarned,
                wallet: await Wallet.findById(wallet._id)
            };

        } catch (error) {
            console.error('Error en processSale:', error);
            throw error;
        }
    }

    /**
     * Aprobar comisión pendiente
     * @param {String} movementId - ID del movimiento
     * @param {String} approvedBy - ID del admin que aprueba
     * @returns {Object} Resultado de la aprobación
     */
    static async approveCommission(movementId, approvedBy) {
        try {
            const movement = await WalletMovements.findById(movementId);
            if (!movement || movement.type !== 'commission_earned') {
                throw new Error('Movimiento de comisión no encontrado');
            }

            if (movement.status !== 'pending') {
                throw new Error('La comisión ya fue procesada');
            }

            // Actualizar movimiento
            movement.status = 'approved';
            movement.processedBy = approvedBy;
            await movement.save();

            // Aprobar comisión en la wallet
            const wallet = await Wallet.findById(movement.wallet);
            await wallet.approveCommission(Math.abs(movement.amount));

            // Crear movimiento de aprobación
            const approvalMovement = new WalletMovements({
                type: 'commission_approved',
                amount: Math.abs(movement.amount),
                balanceAfter: wallet.balance,
                pointsAfter: wallet.points,
                description: `Comisión aprobada: ${movement.description}`,
                wallet: wallet._id,
                sale: movement.sale,
                product: movement.product,
                status: 'completed',
                processedBy: approvedBy
            });

            await approvalMovement.save();

            return {
                success: true,
                message: 'Comisión aprobada exitosamente',
                movement: approvalMovement
            };

        } catch (error) {
            console.error('Error en approveCommission:', error);
            throw error;
        }
    }

    /**
     * Procesar retiro de fondos
     * @param {String} walletId - ID de la wallet
     * @param {Number} amount - Monto a retirar
     * @param {Object} withdrawalInfo - Información del retiro
     * @returns {Object} Resultado del retiro
     */
    static async processWithdrawal(walletId, amount, withdrawalInfo) {
        try {
            const wallet = await Wallet.findById(walletId);
            if (!wallet) {
                throw new Error('Wallet no encontrada');
            }

            // Validar saldo suficiente
            if (wallet.balance < amount) {
                throw new Error('Saldo insuficiente');
            }

            // Validar monto mínimo
            if (amount < wallet.settings.minimumWithdrawal) {
                throw new Error(`Monto menor al mínimo de retiro ($${wallet.settings.minimumWithdrawal.toLocaleString()})`);
            }

            // Crear movimiento de retiro
            const withdrawalMovement = new WalletMovements({
                type: 'withdrawal',
                amount: -amount,
                balanceAfter: wallet.balance - amount,
                pointsAfter: wallet.points,
                description: `Retiro de $${amount.toLocaleString()}`,
                wallet: walletId,
                status: 'pending',
                withdrawalMethod: withdrawalInfo.method,
                withdrawalInfo: withdrawalInfo
            });

            await withdrawalMovement.save();

            // Actualizar saldo de la wallet
            await wallet.withdraw(amount);

            return {
                success: true,
                message: 'Solicitud de retiro creada exitosamente',
                movement: withdrawalMovement
            };

        } catch (error) {
            console.error('Error en processWithdrawal:', error);
            throw error;
        }
    }

    /**
     * Obtener resumen de ganancias de una vendedora
     * @param {String} userId - ID del usuario
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Object} Resumen de ganancias
     */
    static async getEarningsSummary(userId, startDate = null, endDate = null) {
        try {
            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                return {
                    totalCommissions: 0,
                    totalPoints: 0,
                    totalWithdrawals: 0,
                    currentBalance: 0,
                    pendingBalance: 0
                };
            }

            // Construir filtros de fecha
            const dateFilter = {};
            if (startDate) dateFilter.$gte = startDate;
            if (endDate) dateFilter.$lte = endDate;

            const matchFilter = { 
                wallet: wallet._id, 
                estado: true 
            };
            
            if (startDate || endDate) {
                matchFilter.createdAt = dateFilter;
            }

            // Agregar datos de movimientos
            const summary = await WalletMovements.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                        totalPoints: { $sum: '$points' }
                    }
                }
            ]);

            // Procesar resultados
            const result = {
                totalCommissions: 0,
                totalPoints: 0,
                totalWithdrawals: 0,
                commissionsCount: 0,
                withdrawalsCount: 0,
                currentBalance: wallet.balance,
                pendingBalance: wallet.pendingBalance,
                totalBalance: wallet.totalBalance
            };

            summary.forEach(item => {
                switch (item._id) {
                    case 'commission_earned':
                    case 'commission_approved':
                        result.totalCommissions += Math.abs(item.total);
                        result.commissionsCount += item.count;
                        break;
                    case 'withdrawal':
                        result.totalWithdrawals += Math.abs(item.total);
                        result.withdrawalsCount += item.count;
                        break;
                    case 'points_earned':
                        result.totalPoints += item.totalPoints;
                        break;
                }
            });

            return result;

        } catch (error) {
            console.error('Error en getEarningsSummary:', error);
            throw error;
        }
    }

    /**
     * Agregar transacción al wallet (estado pendiente)
     * @param {Object} params - Parámetros de la transacción
     * @param {String} params.userId - ID del usuario
     * @param {String} params.transactionId - ID de la transacción
     * @param {String} params.transactionNumber - Número de transacción
     * @param {Number} params.amount - Monto de la transacción
     * @param {String} params.type - Tipo de transacción ('purchase', 'refund', etc.)
     * @param {String} params.status - Estado ('pending', 'approved', 'cancelled')
     */
    static async addTransactionToWallet({ userId, transactionId, transactionNumber, amount, type = 'purchase', status = 'pending' }) {
        try {
            // Buscar o crear wallet del usuario
            let wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                wallet = new Wallet({
                    user: userId,
                    balance: 0,
                    estado: true
                });
                await wallet.save();
            }

            // Crear movimiento en el wallet (pendiente)
            const movement = new WalletMovements({
                user: userId,
                wallet: wallet._id,
                transaction: transactionId,
                tipo: type === 'purchase' ? 'debito' : 'credito',
                monto: amount,
                descripcion: `Transacción ${transactionNumber} - ${status}`,
                referencia: transactionNumber,
                estado_transaccion: status,
                metadata: {
                    transactionId,
                    transactionNumber,
                    type
                }
            });

            await movement.save();

            return {
                success: true,
                wallet,
                movement
            };
        } catch (error) {
            console.error('Error al agregar transacción al wallet:', error);
            throw error;
        }
    }

    /**
     * Aprobar transacción y actualizar balance del wallet
     * @param {Object} params - Parámetros de aprobación
     * @param {String} params.userId - ID del usuario
     * @param {String} params.transactionId - ID de la transacción
     * @param {Number} params.amount - Monto de la transacción
     */
    static async approveTransaction({ userId, transactionId, amount }) {
        try {
            // Buscar el movimiento pendiente
            const movement = await WalletMovements.findOne({
                user: userId,
                transaction: transactionId,
                estado_transaccion: 'pending'
            });

            if (!movement) {
                throw new Error('Movimiento de wallet no encontrado');
            }

            // Actualizar estado del movimiento
            movement.estado_transaccion = 'approved';
            movement.fecha_procesado = new Date();
            movement.descripcion = movement.descripcion.replace('pending', 'approved');
            await movement.save();

            // Actualizar balance del wallet si es un crédito (ganancia/comisión)
            const wallet = await Wallet.findById(movement.wallet);
            if (movement.tipo === 'credito') {
                wallet.balance += amount;
                wallet.total_ganado += amount;
                await wallet.save();
            }

            return {
                success: true,
                movement,
                wallet
            };
        } catch (error) {
            console.error('Error al aprobar transacción en wallet:', error);
            throw error;
        }
    }

    /**
     * Cancelar transacción en el wallet
     * @param {Object} params - Parámetros de cancelación
     * @param {String} params.userId - ID del usuario
     * @param {String} params.transactionId - ID de la transacción
     */
    static async cancelTransaction({ userId, transactionId }) {
        try {
            // Buscar el movimiento pendiente
            const movement = await WalletMovements.findOne({
                user: userId,
                transaction: transactionId,
                estado_transaccion: 'pending'
            });

            if (!movement) {
                throw new Error('Movimiento de wallet no encontrado');
            }

            // Actualizar estado del movimiento
            movement.estado_transaccion = 'cancelled';
            movement.fecha_procesado = new Date();
            movement.descripcion = movement.descripcion.replace('pending', 'cancelled');
            await movement.save();

            return {
                success: true,
                movement
            };
        } catch (error) {
            console.error('Error al cancelar transacción en wallet:', error);
            throw error;
        }
    }
}

module.exports = WalletService;
