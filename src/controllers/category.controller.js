const { response, request } = require('express')
const Category = require('../models/category.model')
const S3Service = require('../services/s3.service')

const categotyCtrl = {}
const s3Service = new S3Service()

categotyCtrl.getAllCategory = async (req = request, res = response) => {
    const { limit = 5, from = 0} = req.query;
    const query = {estado: true}

    const [allCategory, category] = await Promise.all([
        Category.countDocuments(query).lean(),
        Category.find(query).populate('user', 'firstName').skip(Number(from)).limit(Number(limit)).lean()
    ])

    res.json({
        allCategory,
        category
    })


}

categotyCtrl.getCategory = async (req = request, res = response) => {

    const { id } = req.params;
    const category = await Category.findById( id ).populate('user', 'firstName').lean()

    res.json(category);

}

categotyCtrl.createrCategory = async (req = request, res = response) => {
    try {
        const { name, number, img, ...body } = req.body;

        // Verificar si la categoría ya existe
        const categoryDB = await Category.findOne({name})

        if( categoryDB ) {
            return res.status(400).json({
                msg: `La categoría ${categoryDB.name}, ya existe`
            })
        }

        const data = {
            name: name,
            number: number,
            user: req.user._id,
            ...body
        }

        // Manejar imagen si se envió
        if (req.files && req.files.img) {
            try {
                // Subir imagen a la carpeta 'categories' en S3
                const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'categories');
                data.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir la imagen de la categoría',
                    error: error.message
                });
            }
        } else if (img) {
            // Si se pasó URL de imagen en el body
            data.img = img;
        }

        const category = new Category(data)
        await category.save();

        res.status(201).json({
            msg: 'Categoría creada exitosamente',
            category
        })

    } catch (error) {
        console.error('Error creando categoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

categotyCtrl.updateCategory = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { estado, user, ...data } = req.body;

        // Obtener la categoría actual para eliminar imagen anterior si es necesario
        const currentCategory = await Category.findById(id);
        if (!currentCategory) {
            return res.status(404).json({
                msg: 'Categoría no encontrada'
            });
        }

        if (data.name) {
            data.name = data.name.toUpperCase();
        }
        data.user = req.user._id;

        // Manejar actualización de imagen
        if (req.files && req.files.img) {
            try {
                // Eliminar imagen anterior si existe
                if (currentCategory.img) {
                    await s3Service.deleteFile(currentCategory.img);
                }
                
                // Subir nueva imagen
                const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'categories');
                data.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al actualizar la imagen de la categoría',
                    error: error.message
                });
            }
        }

        const category = await Category.findByIdAndUpdate(id, data, { new: true })
            .populate('user', 'firstName');

        res.json({
            msg: 'Categoría actualizada exitosamente',
            category
        });

    } catch (error) {
        console.error('Error actualizando categoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Nuevo endpoint específico para actualizar imagen de categoría
categotyCtrl.updateCategoryImage = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        if (!req.files || !req.files.img) {
            return res.status(400).json({
                msg: 'No se envió archivo de imagen'
            });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                msg: 'Categoría no encontrada'
            });
        }

        // Eliminar imagen anterior si existe
        if (category.img) {
            try {
                await s3Service.deleteFile(category.img);
            } catch (error) {
                console.error('Error eliminando imagen anterior:', error);
            }
        }

        // Subir nueva imagen
        const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'categories');
        category.img = imageUrl;
        await category.save();

        res.json({
            msg: 'Imagen de categoría actualizada exitosamente',
            category: category
        });

    } catch (error) {
        console.error('Error actualizando imagen de categoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Nuevo endpoint para eliminar imagen de categoría
categotyCtrl.deleteCategoryImage = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                msg: 'Categoría no encontrada'
            });
        }

        // Eliminar imagen de S3
        if (category.img) {
            try {
                await s3Service.deleteFile(category.img);
                category.img = null;
                await category.save();
            } catch (error) {
                console.error('Error eliminando imagen de S3:', error);
            }
        }

        res.json({
            msg: 'Imagen de categoría eliminada exitosamente',
            category: category
        });

    } catch (error) {
        console.error('Error eliminando imagen de categoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

categotyCtrl.deletedCategory = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Obtener la categoría para eliminar su imagen
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                msg: 'Categoría no encontrada'
            });
        }

        // Eliminar imagen de S3 si existe
        if (category.img) {
            try {
                await s3Service.deleteFile(category.img);
            } catch (error) {
                console.error('Error eliminando imagen de categoría:', error);
            }
        }

        // Marcar la categoría como eliminada
        const deletedCategory = await Category.findByIdAndUpdate(id, {estado: false}, {new: true});

        res.json({
            msg: 'Categoría eliminada exitosamente',
            category: deletedCategory
        });

    } catch (error) {
        console.error('Error eliminando categoría:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

module.exports = categotyCtrl