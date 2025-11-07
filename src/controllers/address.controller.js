const { response, request } = require('express');
const Address = require('../models/address.model');

const addressCtrl = {};

/**
 * Obtener todas las direcciones del usuario autenticado
 */
addressCtrl.getAllAddresses = async (req = request, res = response) => {
    try {
        const { limit = 10, from = 0 } = req.query;
        const userId = req.user._id;
        const query = { estado: true, user: userId };

        const [allAddresses, addresses] = await Promise.all([
            Address.countDocuments(query).lean(),
            Address.find(query)
                .populate('user', 'firstName lastName')
                .skip(Number(from))
                .limit(Number(limit))
                .sort({ isDefault: -1, createdAt: -1 })
                .lean()
        ]);

        res.json({
            total: allAddresses,
            addresses
        });

    } catch (error) {
        console.error('Error obteniendo direcciones:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Obtener una dirección específica por ID
 */
addressCtrl.getAddress = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const address = await Address.findOne({ 
            _id: id, 
            user: userId, 
            estado: true 
        }).populate('user', 'firstName lastName').lean();

        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }

        res.json(address);

    } catch (error) {
        console.error('Error obteniendo dirección:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Crear nueva dirección
 */
addressCtrl.createAddress = async (req = request, res = response) => {
    try {
        const { estado, user, ...body } = req.body;
        const userId = req.user._id;

        // Verificar si es la primera dirección del usuario
        const existingAddresses = await Address.countDocuments({ 
            user: userId, 
            estado: true 
        });

        const data = {
            ...body,
            user: userId,
        };

        // Si es la primera dirección o se especifica como default, establecerla como predeterminada
        if (existingAddresses === 0 || body.isDefault) {
            // Quitar default de otras direcciones del usuario
            await Address.updateMany(
                { user: userId, estado: true },
                { isDefault: false }
            );
            data.isDefault = true;
        }

        const address = new Address(data);
        await address.save();

        // Populate para respuesta
        await address.populate('user', 'firstName lastName');

        res.status(201).json({
            msg: 'Dirección creada exitosamente',
            address
        });

    } catch (error) {
        console.error('Error creando dirección:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Actualizar dirección
 */
addressCtrl.updateAddress = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { estado, user, ...data } = req.body;
        const userId = req.user._id;

        // Verificar que la dirección pertenece al usuario
        const existingAddress = await Address.findOne({ 
            _id: id, 
            user: userId, 
            estado: true 
        });

        if (!existingAddress) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }

        // Si se está marcando como default, quitar default de otras
        if (data.isDefault) {
            await Address.updateMany(
                { user: userId, estado: true, _id: { $ne: id } },
                { isDefault: false }
            );
        }

        data.user = userId;

        const address = await Address.findByIdAndUpdate(id, data, { new: true })
            .populate('user', 'firstName lastName');

        res.json({
            msg: 'Dirección actualizada exitosamente',
            address
        });

    } catch (error) {
        console.error('Error actualizando dirección:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Eliminar dirección (soft delete)
 */
addressCtrl.deleteAddress = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Verificar que la dirección pertenece al usuario
        const existingAddress = await Address.findOne({ 
            _id: id, 
            user: userId, 
            estado: true 
        });

        if (!existingAddress) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }

        // Marcar como eliminada (soft delete)
        await Address.findByIdAndUpdate(id, { estado: false });

        // Si era la dirección predeterminada, asignar default a otra dirección
        if (existingAddress.isDefault) {
            const firstActiveAddress = await Address.findOne({
                user: userId,
                estado: true,
                _id: { $ne: id }
            });

            if (firstActiveAddress) {
                firstActiveAddress.isDefault = true;
                await firstActiveAddress.save();
            }
        }

        res.json({
            msg: 'Dirección eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando dirección:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Establecer dirección como predeterminada
 */
addressCtrl.setDefaultAddress = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Verificar que la dirección pertenece al usuario
        const address = await Address.findOne({ 
            _id: id, 
            user: userId, 
            estado: true 
        });

        if (!address) {
            return res.status(404).json({
                msg: 'Dirección no encontrada'
            });
        }

        // Quitar default de todas las direcciones del usuario
        await Address.updateMany(
            { user: userId, estado: true },
            { isDefault: false }
        );

        // Establecer como default la dirección seleccionada
        address.isDefault = true;
        await address.save();

        // Populate para respuesta
        await address.populate('user', 'firstName lastName');

        res.json({
            msg: 'Dirección establecida como predeterminada',
            address
        });

    } catch (error) {
        console.error('Error estableciendo dirección predeterminada:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Obtener la dirección predeterminada del usuario
 */
addressCtrl.getDefaultAddress = async (req = request, res = response) => {
    try {
        const userId = req.user._id;

        const defaultAddress = await Address.findOne({ 
            user: userId, 
            estado: true, 
            isDefault: true 
        }).populate('user', 'firstName lastName').lean();

        if (!defaultAddress) {
            return res.status(404).json({
                msg: 'No se encontró dirección predeterminada'
            });
        }

        res.json({
            msg: 'Dirección predeterminada obtenida',
            address: defaultAddress
        });

    } catch (error) {
        console.error('Error obteniendo dirección predeterminada:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

module.exports = addressCtrl;
