const { response, request } = require('express')
const SubCategory = require('../models/sub_category.model')
const S3Service = require('../services/s3.service')

const subCategoryCtrl = {}
const s3Service = new S3Service()

/**
 * Obtener todas las subcategorías
 */
subCategoryCtrl.getAllSubCategories = async (req = request, res = response) => {
    try {
        const { limit = 10, from = 0 } = req.query;
        const { categoryId } = req.params; // Para filtrar por categoría padre
        
        let query = { estado: true };
        
        // Si se proporciona categoryId, filtrar por categoría padre
        if (categoryId) {
            query.category = categoryId;
        }

        const [allSubCategories, subCategories] = await Promise.all([
            SubCategory.countDocuments(query).lean(),
            SubCategory.find(query)
                .populate('user', 'firstName')
                .populate('category', 'name')
                .skip(Number(from))
                .limit(Number(limit))
                .lean()
        ]);

        res.json({
            total: allSubCategories,
            subCategories
        });

    } catch (error) {
        console.error('Error obteniendo subcategorías:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Obtener una subcategoría por ID
 */
subCategoryCtrl.getSubCategory = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const subCategory = await SubCategory.findById(id)
            .populate('user', 'firstName')
            .populate('category', 'name')
            .lean();

        if (!subCategory) {
            return res.status(404).json({
                msg: 'Subcategoría no encontrada'
            });
        }

        res.json(subCategory);

    } catch (error) {
        console.error('Error obteniendo subcategoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Crear nueva subcategoría
 */
subCategoryCtrl.createSubCategory = async (req = request, res = response) => {
    try {
        const { estado, user, ...body } = req.body;

        // Verificar si la subcategoría ya existe EN LA MISMA CATEGORÍA
        const subCategoryDB = await SubCategory.findOne({ 
            name: body.name, 
            category: body.category,
            estado: true
        });

        if (subCategoryDB) {
            return res.status(400).json({
                msg: `La subcategoría "${body.name}" ya existe en esta categoría`
            });
        }

        const data = {
            ...body,
            user: req.user._id,
        }

        // Manejar imagen si se envió
        if (req.files && req.files.img) {
            try {
                const imageUrl = await s3Service.uploadFile(req.files.img, 'subcategories');
                data.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir la imagen',
                    error: error.message
                });
            }
        }

        const subCategory = new SubCategory(data);
        await subCategory.save();

        // Populate para respuesta
        await subCategory.populate('user', 'firstName');
        await subCategory.populate('category', 'name');

        res.status(201).json({
            msg: 'Subcategoría creada exitosamente',
            subCategory
        });

    } catch (error) {
        console.error('Error creando subcategoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Actualizar subcategoría
 */
subCategoryCtrl.updateSubCategory = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { estado, user, ...data } = req.body;

        // Obtener la subcategoría actual para eliminar imagen anterior si es necesario
        const currentSubCategory = await SubCategory.findById(id);
        if (!currentSubCategory) {
            return res.status(404).json({
                msg: 'Subcategoría no encontrada'
            });
        }

        // Si se está actualizando el nombre, verificar duplicados en la misma categoría
        if (data.name) {
            const categoryToCheck = data.category || currentSubCategory.category;
            const existingSubCategory = await SubCategory.findOne({
                name: data.name,
                category: categoryToCheck,
                estado: true,
                _id: { $ne: id } // Excluir la subcategoría actual
            });

            if (existingSubCategory) {
                return res.status(400).json({
                    msg: `La subcategoría "${data.name}" ya existe en esta categoría`
                });
            }
        }

        if (data.name) {
            data.name = data.name.toUpperCase();
        }
        data.user = req.user._id;

        // Manejar actualización de imagen
        if (req.files && req.files.img) {
            try {
                // Eliminar imagen anterior si existe
                if (currentSubCategory.img) {
                    await s3Service.deleteFile(currentSubCategory.img);
                }
                
                // Subir nueva imagen
                const imageUrl = await s3Service.uploadFile(req.files.img, 'subcategories');
                data.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al actualizar la imagen',
                    error: error.message
                });
            }
        }

        const subCategory = await SubCategory.findByIdAndUpdate(id, data, { new: true })
            .populate('user', 'firstName')
            .populate('category', 'name');

        res.json({
            msg: 'Subcategoría actualizada exitosamente',
            subCategory
        });

    } catch (error) {
        console.error('Error actualizando subcategoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Eliminar subcategoría (soft delete)
 */
subCategoryCtrl.deleteSubCategory = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Obtener la subcategoría para eliminar su imagen
        const subCategory = await SubCategory.findById(id);
        if (!subCategory) {
            return res.status(404).json({
                msg: 'Subcategoría no encontrada'
            });
        }

        // Eliminar imagen de S3 si existe
        if (subCategory.img) {
            try {
                await s3Service.deleteFile(subCategory.img);
            } catch (error) {
                console.error('Error eliminando imagen de subcategoría:', error);
            }
        }

        // Marcar como eliminada (soft delete)
        const deletedSubCategory = await SubCategory.findByIdAndUpdate(
            id, 
            { estado: false }, 
            { new: true }
        );

        res.json({
            msg: 'Subcategoría eliminada exitosamente',
            subCategory: deletedSubCategory
        });

    } catch (error) {
        console.error('Error eliminando subcategoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Actualizar imagen de subcategoría específicamente
 */
subCategoryCtrl.updateSubCategoryImage = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        if (!req.files || !req.files.img) {
            return res.status(400).json({
                msg: 'No se envió ninguna imagen'
            });
        }

        const subCategory = await SubCategory.findById(id);
        if (!subCategory) {
            return res.status(404).json({
                msg: 'Subcategoría no encontrada'
            });
        }

        // Eliminar imagen anterior si existe
        if (subCategory.img) {
            try {
                await s3Service.deleteFile(subCategory.img);
            } catch (error) {
                console.error('Error eliminando imagen anterior:', error);
            }
        }

        // Subir nueva imagen
        const imageUrl = await s3Service.uploadFile(req.files.img, 'subcategories');
        subCategory.img = imageUrl;
        await subCategory.save();

        await subCategory.populate('user', 'firstName');
        await subCategory.populate('category', 'name');

        res.json({
            msg: 'Imagen de subcategoría actualizada exitosamente',
            subCategory
        });

    } catch (error) {
        console.error('Error actualizando imagen de subcategoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

/**
 * Eliminar imagen de subcategoría
 */
subCategoryCtrl.deleteSubCategoryImage = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const subCategory = await SubCategory.findById(id);
        if (!subCategory) {
            return res.status(404).json({
                msg: 'Subcategoría no encontrada'
            });
        }

        // Eliminar imagen de S3 si existe
        if (subCategory.img) {
            try {
                await s3Service.deleteFile(subCategory.img);
                subCategory.img = null;
                await subCategory.save();
            } catch (error) {
                console.error('Error eliminando imagen de S3:', error);
                return res.status(500).json({
                    msg: 'Error eliminando imagen del servidor'
                });
            }
        }

        await subCategory.populate('user', 'firstName');
        await subCategory.populate('category', 'name');

        res.json({
            msg: 'Imagen eliminada exitosamente',
            subCategory
        });

    } catch (error) {
        console.error('Error eliminando imagen de subcategoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

module.exports = subCategoryCtrl
