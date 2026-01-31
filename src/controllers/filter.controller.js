const { response, request } = require('express')
const Filter = require('../models/filter.model')
const Product = require('../models/product.model')

const filterCtrl = {}

/**
 * Obtener todos los filtros
 */
filterCtrl.getAllFilters = async (req = request, res = response) => {
    try {
        const { limit = 100, from = 0, active = 'true', category } = req.query;

        // Construir query
        let query = {};
        if (active === 'true') {
            query.isActive = true;
        }
        if (category) {
            query.category = category;
        }

        const [totalFilters, filters] = await Promise.all([
            Filter.countDocuments(query).lean(),
            Filter.find(query)
                .populate('category', 'name')
                .populate('user', 'firstName')
                .skip(Number(from))
                .limit(Number(limit))
                .sort({ order: 1, name: 1 })
                .lean()
        ]);

        res.json({
            totalFilters,
            filters
        });

    } catch (error) {
        console.error('Error obteniendo filtros:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Obtener filtros por categoría
 */
filterCtrl.getFiltersByCategory = async (req = request, res = response) => {
    try {
        const { categoryId } = req.params;
        const { active = 'true' } = req.query;

        let query = { category: categoryId };
        if (active === 'true') {
            query.isActive = true;
        }

        const filters = await Filter.find(query)
            .select('name slug description icon color order')
            .sort({ order: 1, name: 1 })
            .lean();

        res.json({
            category: categoryId,
            totalFilters: filters.length,
            filters
        });

    } catch (error) {
        console.error('Error obteniendo filtros por categoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Obtener un filtro específico
 */
filterCtrl.getFilter = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const filter = await Filter.findById(id)
            .populate('category', 'name')
            .populate('user', 'firstName')
            .lean();

        if (!filter) {
            return res.status(404).json({
                msg: 'Filtro no encontrado'
            });
        }

        res.json({
            filter
        });

    } catch (error) {
        console.error('Error obteniendo filtro:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Crear un nuevo filtro
 */
filterCtrl.createFilter = async (req = request, res = response) => {
    try {
        const { name, category, ...body } = req.body;

        // Verificar si el filtro ya existe en esa categoría
        const filterExists = await Filter.findOne({ name, category });

        if (filterExists) {
            return res.status(400).json({
                msg: `El filtro "${name}" ya existe en esta categoría`
            });
        }

        const data = {
            name,
            category,
            ...body,
            user: req.user._id
        };

        const filter = new Filter(data);
        await filter.save();

        // Populate para la respuesta
        await filter.populate('category', 'name');
        await filter.populate('user', 'firstName');

        res.status(201).json({
            msg: 'Filtro creado exitosamente',
            filter
        });

    } catch (error) {
        console.error('Error creando filtro:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Actualizar un filtro
 */
filterCtrl.updateFilter = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { user, ...data } = req.body;

        // Si se actualiza el nombre, verificar que no exista otro con ese nombre en la misma categoría
        if (data.name && data.category) {
            const filterExists = await Filter.findOne({
                name: data.name,
                category: data.category,
                _id: { $ne: id }
            });

            if (filterExists) {
                return res.status(400).json({
                    msg: `Ya existe otro filtro con el nombre "${data.name}" en esta categoría`
                });
            }
        }

        const filter = await Filter.findByIdAndUpdate(id, data, { new: true })
            .populate('category', 'name')
            .populate('user', 'firstName');

        if (!filter) {
            return res.status(404).json({
                msg: 'Filtro no encontrado'
            });
        }

        res.json({
            msg: 'Filtro actualizado exitosamente',
            filter
        });

    } catch (error) {
        console.error('Error actualizando filtro:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Eliminar un filtro (soft delete)
 */
filterCtrl.deleteFilter = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const filter = await Filter.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        ).populate('category', 'name');

        if (!filter) {
            return res.status(404).json({
                msg: 'Filtro no encontrado'
            });
        }

        res.json({
            msg: 'Filtro desactivado exitosamente',
            filter
        });

    } catch (error) {
        console.error('Error eliminando filtro:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Eliminar permanentemente un filtro
 */
filterCtrl.hardDeleteFilter = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Verificar si hay productos usando este filtro
        const productsUsingFilter = await Product.countDocuments({
            filters: id,
            estado: true
        });

        if (productsUsingFilter > 0) {
            return res.status(400).json({
                msg: `No se puede eliminar el filtro porque está siendo usado en ${productsUsingFilter} producto(s)`,
                productsCount: productsUsingFilter
            });
        }

        const filter = await Filter.findByIdAndDelete(id);

        if (!filter) {
            return res.status(404).json({
                msg: 'Filtro no encontrado'
            });
        }

        res.json({
            msg: 'Filtro eliminado permanentemente',
            filter
        });

    } catch (error) {
        console.error('Error eliminando filtro permanentemente:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Reactivar un filtro
 */
filterCtrl.activateFilter = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const filter = await Filter.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        ).populate('category', 'name');

        if (!filter) {
            return res.status(404).json({
                msg: 'Filtro no encontrado'
            });
        }

        res.json({
            msg: 'Filtro reactivado exitosamente',
            filter
        });

    } catch (error) {
        console.error('Error activando filtro:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Obtener estadísticas de filtros
 */
filterCtrl.getFilterStats = async (req = request, res = response) => {
    try {
        const stats = await Filter.aggregate([
            {
                $group: {
                    _id: '$category',
                    totalFilters: { $sum: 1 },
                    activeFilters: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $unwind: '$categoryInfo'
            },
            {
                $project: {
                    categoryName: '$categoryInfo.name',
                    totalFilters: 1,
                    activeFilters: 1
                }
            },
            {
                $sort: { totalFilters: -1 }
            }
        ]);

        const totalFilters = await Filter.countDocuments();
        const activeFilters = await Filter.countDocuments({ isActive: true });

        res.json({
            totalFilters,
            activeFilters,
            inactiveFilters: totalFilters - activeFilters,
            byCategory: stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

module.exports = filterCtrl
