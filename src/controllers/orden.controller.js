const { response, request } = require("express");
const Orden = require("../models/orden.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const WalletService = require("../services/wallet.service");

const ordenCtrl = {};

/**
 * Crear nueva orden con cálculo automático de comisiones
 */
ordenCtrl.createOrder = async (req = request, res = response) => {
  try {
    const { items, ...orderData } = req.body;
    const userId = req.usuario.id;

    // Validar y enriquecer items con información del producto
    const enrichedItems = [];
    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          ok: false,
          msg: `Producto con ID ${item.product} no encontrado`
        });
      }

      const enrichedItem = {
        ...item,
        name: product.name,
        basePrice: product.price,
        model: product.model,
        description: product.description,
        img: product.img,
        barcode: product.barcode
      };

      enrichedItems.push(enrichedItem);
    }

    // Crear orden
    const newOrder = new Orden({
      ...orderData,
      items: enrichedItems,
      user: userId
    });

    const savedOrder = await newOrder.save();

    // Procesar comisiones y puntos para cada item
    for (let item of savedOrder.items) {
      if (item.commission > 0 || item.points > 0) {
        await WalletService.processSale(userId, {
          productId: item.product,
          salePrice: item.price,
          quantity: item.quantity,
          saleId: savedOrder._id
        });
      }
    }

    // Poblar la orden con información completa
    const populatedOrder = await Orden.findById(savedOrder._id)
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name category brand');

    res.status(201).json({
      ok: true,
      msg: 'Orden creada exitosamente',
      order: populatedOrder
    });

  } catch (error) {
    console.error('Error en createOrder:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener órdenes de la vendedora autenticada
 */
ordenCtrl.getMyOrders = async (req = request, res = response) => {
  try {
    const userId = req.usuario.id;
    const { page = 1, limit = 10, status } = req.query;

    const filters = { user: userId, estado: true };
    if (status) filters.orderStatus = status;

    const orders = await Orden.find(filters)
      .populate('items.product', 'name category brand')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Orden.countDocuments(filters);

    res.json({
      ok: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error en getMyOrders:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener detalle de una orden
 */
ordenCtrl.getOrderById = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const userId = req.usuario.id;

    const order = await Orden.findOne({ _id: id, user: userId, estado: true })
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name category brand description')
      .populate('commissionProcessedBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({
        ok: false,
        msg: 'Orden no encontrada'
      });
    }

    res.json({
      ok: true,
      order
    });

  } catch (error) {
    console.error('Error en getOrderById:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor'
    });
  }
};

// ============= MÉTODOS PARA ADMINISTRADORES =============

/**
 * Obtener todas las órdenes (Admin)
 */
ordenCtrl.getAllOrders = async (req = request, res = response) => {
  try {
    const { page = 1, limit = 20, status, commissionStatus, search } = req.query;

    // Construir filtros
    const filters = { estado: true };
    if (status) filters.orderStatus = status;
    if (commissionStatus) filters.commissionStatus = commissionStatus;

    // Filtro de búsqueda por vendedora
    if (search) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      if (users.length > 0) {
        filters.user = { $in: users.map(u => u._id) };
      }
    }

    const orders = await Orden.find(filters)
      .populate('user', 'firstName lastName email avatar')
      .populate('items.product', 'name category brand')
      .populate('commissionProcessedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Orden.countDocuments(filters);

    res.json({
      ok: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error en getAllOrders:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor'
    });
  }
};

/**
 * Aprobar comisiones de una orden (Admin)
 */
ordenCtrl.approveOrderCommissions = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const adminId = req.usuario.id;

    const order = await Orden.findById(id);
    if (!order) {
      return res.status(404).json({
        ok: false,
        msg: 'Orden no encontrada'
      });
    }

    if (order.commissionStatus !== 'pending') {
      return res.status(400).json({
        ok: false,
        msg: 'Las comisiones de esta orden ya fueron procesadas'
      });
    }

    // Aprobar la orden
    await order.approveCommission(adminId);

    // Buscar y aprobar movimientos de comisión pendientes de esta orden
    const WalletMovements = require('../models/wallet_movements_model');
    const pendingMovements = await WalletMovements.find({
      sale: id,
      type: 'commission_earned',
      status: 'pending'
    });

    for (let movement of pendingMovements) {
      await WalletService.approveCommission(movement._id, adminId);
    }

    res.json({
      ok: true,
      msg: 'Comisiones aprobadas exitosamente',
      order: await Orden.findById(id).populate('user', 'firstName lastName')
    });

  } catch (error) {
    console.error('Error en approveOrderCommissions:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Actualizar estado de orden (Admin)
 */
ordenCtrl.updateOrderStatus = async (req = request, res = response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Orden.findById(id);
    if (!order) {
      return res.status(404).json({
        ok: false,
        msg: 'Orden no encontrada'
      });
    }

    await order.updateStatus(status);

    res.json({
      ok: true,
      msg: 'Estado de orden actualizado exitosamente',
      order
    });

  } catch (error) {
    console.error('Error en updateOrderStatus:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener estadísticas de órdenes y comisiones (Admin)
 */
ordenCtrl.getOrdersStats = async (req = request, res = response) => {
  try {
    const { startDate, endDate } = req.query;

    // Construir filtros de fecha
    const dateFilter = { estado: true };
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Estadísticas generales
    const totalOrders = await Orden.countDocuments(dateFilter);
    const totalSales = await Orden.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const totalCommissions = await Orden.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$totalCommission' } } }
    ]);

    // Estadísticas por estado
    const ordersByStatus = await Orden.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    // Estadísticas por estado de comisión
    const commissionsByStatus = await Orden.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$commissionStatus', count: { $sum: 1 }, totalAmount: { $sum: '$totalCommission' } } }
    ]);

    // Top vendedoras
    const topSellers = await Orden.aggregate([
      { $match: dateFilter },
      { $group: { 
        _id: '$user', 
        totalSales: { $sum: '$totalPrice' },
        totalCommissions: { $sum: '$totalCommission' },
        ordersCount: { $sum: 1 }
      }},
      { $sort: { totalSales: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        seller: '$user.firstName',
        lastName: '$user.lastName',
        totalSales: 1,
        totalCommissions: 1,
        ordersCount: 1
      }}
    ]);

    res.json({
      ok: true,
      stats: {
        totalOrders,
        totalSales: totalSales[0]?.total || 0,
        totalCommissions: totalCommissions[0]?.total || 0,
        ordersByStatus,
        commissionsByStatus,
        topSellers
      }
    });

  } catch (error) {
    console.error('Error en getOrdersStats:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error interno del servidor'
    });
  }
};

module.exports = ordenCtrl;

