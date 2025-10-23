const { response, request } = require('express')
const Product = require('../models/product.model')
const S3Service = require('../services/s3.service')

const productsCtrl = {}
const s3Service = new S3Service()

productsCtrl.getAllproducts = async (req = request, res = response) => {
    try {
        const { limit = 10, from = 0 } = req.query;
        const { id } = req.params;
        const { type = 'subCategory' } = req.query; // 'category' o 'subCategory'

        let query = { estado: true };
        let populateField = '';

        // Determinar qué campo usar según el tipo
        if (type === 'category') {
            query.category = id;
            populateField = 'category';
        } else {
            query.subCategory = id;
            populateField = 'subCategory';
        }

        const [allProduct, product] = await Promise.all([
            Product.countDocuments(query).lean(),
            Product.find(query)
                .populate('user', 'firstName')
                .populate({
                    path: populateField,
                    select: 'name category',
                    populate: populateField === 'subCategory' ? {
                        path: 'category',
                        select: 'name'
                    } : undefined
                })
                .skip(Number(from))
                .limit(Number(limit))
                .lean()
        ]);

        res.json({
            allProduct,
            product,
            type: type // Indicar qué tipo de filtro se usó
        });

    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

productsCtrl.getproduct = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        
        let product = await Product.findById(id)
            .populate('user', 'firstName')
            .lean();

        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        // Populate dinámico según el tipo de clasificación
        if (product.category) {
            product = await Product.findById(id)
                .populate('user', 'firstName')
                .populate('category', 'name')
                .lean();
        } else if (product.subCategory) {
            product = await Product.findById(id)
                .populate('user', 'firstName')
                .populate({
                    path: 'subCategory',
                    select: 'name category',
                    populate: {
                        path: 'category',
                        select: 'name'
                    }
                })
                .lean();
        }

        // Agregar información sobre el tipo de clasificación
        product.classificationType = product.category ? 'category' : 'subCategory';

        res.json(product);

    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

productsCtrl.createrproduct = async (req = request, res = response) => {
    try {
        const { estado, user, ...body } = req.body;

        // Validar que se proporcione category O subCategory, pero no ambos
        if (!body.category && !body.subCategory) {
            return res.status(400).json({
                msg: 'Debe proporcionar una categoría o subcategoría'
            });
        }

        if (body.category && body.subCategory) {
            return res.status(400).json({
                msg: 'No puede proporcionar categoría y subcategoría al mismo tiempo'
            });
        }

        // Verificar si el producto ya existe
        const ProductDB = await Product.findOne({name: body.name})

        if( ProductDB ) {
            return res.status(400).json({
                msg: `El producto ${ProductDB.name}, ya existe`
            })
        }

        const data = {
            ...body,
            user: req.user._id,
        }

        // Manejar imagen principal si se envió
        if (req.files && req.files.img) {
            try {
                const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'products');
                data.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir la imagen principal',
                    error: error.message
                });
            }
        }

        // Manejar imágenes adicionales si se enviaron
        if (req.files && req.files.images) {
            const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const imageUrls = [];

            try {
                for (const image of images) {
                    const imageUrl = await s3Service.uploadFileFromExpressUpload(image, 'products');
                    imageUrls.push(imageUrl);
                }
                data.images = imageUrls;
            } catch (error) {
                // Si falla, limpiar la imagen principal si se subió
                if (data.img) {
                    try {
                        await s3Service.deleteFile(data.img);
                    } catch (deleteError) {
                        console.error('Error limpiando imagen principal:', deleteError);
                    }
                }
                return res.status(400).json({
                    msg: 'Error al subir las imágenes adicionales',
                    error: error.message
                });
            }
        }

        const product = new Product(data)
        await product.save();

        res.status(201).json({
            msg: 'Producto creado exitosamente',
            product
        })

    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

productsCtrl.updateproduct = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { estado, user, ...data } = req.body;

        if ( data.name ) {
            data.name = data.name.toUpperCase();
        }

        data.user = req.user._id;

        // Obtener el producto actual para eliminar imágenes antiguas si es necesario
        const currentProduct = await Product.findById(id);
        if (!currentProduct) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        // Manejar actualización de imagen principal
        if (req.files && req.files.img) {
            try {
                // Eliminar imagen anterior si existe
                if (currentProduct.img) {
                    await s3Service.deleteFile(currentProduct.img);
                }
                
                // Subir nueva imagen
                const imageUrl = await s3Service.uploadFile(req.files.img, 'products');
                data.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al actualizar la imagen principal',
                    error: error.message
                });
            }
        }

        // Manejar actualización de imágenes adicionales
        if (req.files && req.files.images) {
            const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const imageUrls = [];

            try {
                // Eliminar imágenes anteriores si existen
                if (currentProduct.images && currentProduct.images.length > 0) {
                    for (const oldImage of currentProduct.images) {
                        await s3Service.deleteFile(oldImage);
                    }
                }

                // Subir nuevas imágenes
                for (const image of images) {
                    const imageUrl = await s3Service.uploadFile(image, 'products');
                    imageUrls.push(imageUrl);
                }
                data.images = imageUrls;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al actualizar las imágenes adicionales',
                    error: error.message
                });
            }
        }

        const product = await Product.findByIdAndUpdate(id, data, { new: true })
            .populate('user', 'firstName')
            .populate('subCategory', 'name');

        res.json({
            msg: 'Producto actualizado exitosamente',
            product
        });

    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}


productsCtrl.deletedproduct = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Obtener el producto para eliminar sus imágenes
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        // Eliminar imagen principal de S3
        if (product.img) {
            try {
                await s3Service.deleteFile(product.img);
            } catch (error) {
                console.error('Error eliminando imagen principal:', error);
            }
        }

        // Eliminar imágenes adicionales de S3
        if (product.images && product.images.length > 0) {
            for (const image of product.images) {
                try {
                    await s3Service.deleteFile(image);
                } catch (error) {
                    console.error('Error eliminando imagen adicional:', error);
                }
            }
        }

        // Marcar el producto como eliminado
        const deletedProduct = await Product.findByIdAndUpdate(id, {estado: false}, {new: true});

        res.json({
            msg: 'Producto eliminado exitosamente',
            product: deletedProduct
        });

    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Nuevo endpoint específico para agregar imágenes a un producto existente
productsCtrl.addProductImages = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        if (!req.files || (!req.files.img && !req.files.images)) {
            return res.status(400).json({
                msg: 'No se enviaron archivos de imagen'
            });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        const updateData = {};

        // Agregar imagen principal si se envió
        if (req.files.img) {
            try {
                // Eliminar imagen principal anterior si existe
                if (product.img) {
                    await s3Service.deleteFile(product.img);
                }
                const imageUrl = await s3Service.uploadFile(req.files.img, 'products');
                updateData.img = imageUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir la imagen principal',
                    error: error.message
                });
            }
        }

        // Agregar imágenes adicionales si se enviaron
        if (req.files.images) {
            const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
            const imageUrls = [];

            try {
                for (const image of images) {
                    const imageUrl = await s3Service.uploadFile(image, 'products');
                    imageUrls.push(imageUrl);
                }
                
                // Combinar con imágenes existentes
                const existingImages = product.images || [];
                updateData.images = [...existingImages, ...imageUrls];
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir las imágenes adicionales',
                    error: error.message
                });
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true })
            .populate('user', 'firstName')
            .populate('subCategory', 'name');

        res.json({
            msg: 'Imágenes agregadas exitosamente',
            product: updatedProduct
        });

    } catch (error) {
        console.error('Error agregando imágenes:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Nuevo endpoint para eliminar una imagen específica
productsCtrl.removeProductImage = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { imageUrl, type = 'additional' } = req.body; // type: 'main' o 'additional'

        if (!imageUrl) {
            return res.status(400).json({
                msg: 'URL de imagen requerida'
            });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        const updateData = {};

        if (type === 'main' && product.img === imageUrl) {
            // Eliminar imagen principal
            try {
                await s3Service.deleteFile(imageUrl);
                updateData.img = null;
            } catch (error) {
                console.error('Error eliminando imagen principal de S3:', error);
            }
        } else if (type === 'additional' && product.images && product.images.includes(imageUrl)) {
            // Eliminar imagen adicional
            try {
                await s3Service.deleteFile(imageUrl);
                updateData.images = product.images.filter(img => img !== imageUrl);
            } catch (error) {
                console.error('Error eliminando imagen adicional de S3:', error);
            }
        } else {
            return res.status(400).json({
                msg: 'Imagen no encontrada en el producto'
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true })
            .populate('user', 'firstName')
            .populate('subCategory', 'name');

        res.json({
            msg: 'Imagen eliminada exitosamente',
            product: updatedProduct
        });

    } catch (error) {
        console.error('Error eliminando imagen:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Nuevo método para obtener todos los productos (categorías y subcategorías)
productsCtrl.getAllProductsMixed = async (req = request, res = response) => {
    try {
        const { limit = 10, from = 0 } = req.query;
        const { categoryId, subCategoryId } = req.query;

        let query = { estado: true };

        // Filtrar por categoría o subcategoría si se especifica
        if (categoryId) {
            query.category = categoryId;
        }
        if (subCategoryId) {
            query.subCategory = subCategoryId;
        }

        const [allProducts, products] = await Promise.all([
            Product.countDocuments(query).lean(),
            Product.find(query)
                .populate('user', 'firstName')
                .populate('category', 'name')
                .populate({
                    path: 'subCategory',
                    select: 'name category',
                    populate: {
                        path: 'category',
                        select: 'name'
                    }
                })
                .skip(Number(from))
                .limit(Number(limit))
                .lean()
        ]);

        // Agregar tipo de clasificación a cada producto
        const productsWithType = products.map(product => ({
            ...product,
            classificationType: product.category ? 'category' : 'subCategory'
        }));

        res.json({
            total: allProducts,
            products: productsWithType
        });

    } catch (error) {
        console.error('Error obteniendo productos mixtos:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Método para migrar productos de category a subCategory
productsCtrl.migrateProductToSubCategory = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { subCategoryId } = req.body;

        if (!subCategoryId) {
            return res.status(400).json({
                msg: 'ID de subcategoría requerido'
            });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        if (!product.category) {
            return res.status(400).json({
                msg: 'El producto ya usa subcategorías'
            });
        }

        // Actualizar producto
        product.subCategory = subCategoryId;
        product.category = undefined;
        await product.save();

        // Populate para respuesta
        await product.populate('user', 'firstName');
        await product.populate({
            path: 'subCategory',
            select: 'name category',
            populate: {
                path: 'category',
                select: 'name'
            }
        });

        res.json({
            msg: 'Producto migrado exitosamente a subcategoría',
            product
        });

    } catch (error) {
        console.error('Error migrando producto:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

module.exports = productsCtrl