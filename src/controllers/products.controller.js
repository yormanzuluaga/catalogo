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
                // Intentar eliminar imagen principal anterior si existe (sin fallar si no se puede)
                if (product.img) {
                    try {
                        await s3Service.deleteFile(product.img);
                    } catch (deleteError) {
                        console.log('Advertencia: No se pudo eliminar imagen anterior:', deleteError.message);
                        // Continúa sin fallar
                    }
                }
                const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'products');
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
                    const imageUrl = await s3Service.uploadFileFromExpressUpload(image, 'products');
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

// Crear producto con variantes
productsCtrl.createProductWithVariants = async (req = request, res = response) => {
    try {
        const { estado, user, variants, ...body } = req.body;

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
        const ProductDB = await Product.findOne({name: body.name});
        if (ProductDB) {
            return res.status(400).json({
                msg: `El producto ${ProductDB.name}, ya existe`
            });
        }

        // Validar variantes si se proporcionan
        if (variants && variants.length > 0) {
            // Verificar SKUs únicos
            const skus = variants.map(v => v.sku);
            const uniqueSkus = [...new Set(skus)];
            if (skus.length !== uniqueSkus.length) {
                return res.status(400).json({
                    msg: 'Los SKUs de las variantes deben ser únicos'
                });
            }

            // Validar que cada variante tenga los campos requeridos
            for (const variant of variants) {
                if (!variant.sku) {
                    return res.status(400).json({
                        msg: 'Cada variante debe tener SKU'
                    });
                }
                
                // Validar estructura de precios
                if (!variant.pricing || !variant.pricing.salePrice || !variant.pricing.costPrice) {
                    return res.status(400).json({
                        msg: 'Cada variante debe tener pricing.costPrice y pricing.salePrice'
                    });
                }
            }
        }

        const data = {
            ...body,
            user: req.user._id,
            productType: variants && variants.length > 0 ? 'variant' : 'simple',
            variants: variants || []
        };

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

        // Manejar imágenes adicionales generales
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

        const product = new Product(data);
        await product.save();

        res.status(201).json({
            msg: 'Producto con variantes creado exitosamente',
            product
        });

    } catch (error) {
        console.error('Error creando producto con variantes:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener variantes de un producto
productsCtrl.getProductVariants = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        if (product.productType !== 'variant') {
            return res.status(400).json({
                msg: 'Este producto no tiene variantes'
            });
        }

        res.json({
            productName: product.name,
            variants: product.variants,
            availableColors: product.getAvailableColors(),
            availableSizes: product.getAvailableSizes(),
            priceRange: {
                min: product.getMinPrice(),
                max: product.getMaxPrice()
            }
        });

    } catch (error) {
        console.error('Error obteniendo variantes:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Agregar variante a un producto existente
productsCtrl.addVariantToProduct = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { sku, color, size, measurements, pricing, points, stock, barcode } = req.body;

        if (!sku) {
            return res.status(400).json({
                msg: 'SKU es requerido para la variante'
            });
        }

        if (!pricing || !pricing.costPrice || !pricing.salePrice) {
            return res.status(400).json({
                msg: 'Pricing con costPrice y salePrice son requeridos para la variante'
            });
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        // Verificar que el SKU sea único
        const existingVariant = product.variants.find(v => v.sku === sku);
        if (existingVariant) {
            return res.status(400).json({
                msg: 'Ya existe una variante con este SKU'
            });
        }

        const newVariant = {
            sku,
            color: color || {},
            size: size || '',
            measurements: measurements || {},
            pricing: {
                costPrice: pricing.costPrice,
                salePrice: pricing.salePrice,
                commission: pricing.commission || 0,
                profit: {
                    amount: 0, // Se calculará automáticamente
                    percentage: 0 // Se calculará automáticamente
                }
            },
            points: {
                earnPoints: points?.earnPoints || 0,
                redeemPoints: points?.redeemPoints || 0
            },
            stock: stock || 0,
            barcode: barcode || '',
            available: true,
            images: []
        };

        // Manejar imágenes específicas de la variante
        if (req.files && req.files.variantImages) {
            const images = Array.isArray(req.files.variantImages) ? req.files.variantImages : [req.files.variantImages];
            const imageUrls = [];

            try {
                for (const image of images) {
                    const imageUrl = await s3Service.uploadFileFromExpressUpload(image, 'products/variants');
                    imageUrls.push(imageUrl);
                }
                newVariant.images = imageUrls;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir las imágenes de la variante',
                    error: error.message
                });
            }
        }

        // Cambiar el tipo de producto a variant si era simple
        if (product.productType === 'simple') {
            product.productType = 'variant';
        }

        product.variants.push(newVariant);
        await product.save();

        res.json({
            msg: 'Variante agregada exitosamente',
            variant: newVariant,
            product
        });

    } catch (error) {
        console.error('Error agregando variante:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Actualizar variante específica
productsCtrl.updateVariant = async (req = request, res = response) => {
    try {
        const { productId, sku } = req.params;
        const { color, size, measurements, pricing, points, stock, barcode, available } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        const variantIndex = product.variants.findIndex(v => v.sku === sku);
        if (variantIndex === -1) {
            return res.status(404).json({
                msg: 'Variante no encontrada'
            });
        }

        // Actualizar campos de la variante
        if (color !== undefined) product.variants[variantIndex].color = color;
        if (size !== undefined) product.variants[variantIndex].size = size;
        if (measurements !== undefined) product.variants[variantIndex].measurements = measurements;
        
        // Actualizar pricing
        if (pricing) {
            if (pricing.costPrice !== undefined) product.variants[variantIndex].pricing.costPrice = pricing.costPrice;
            if (pricing.salePrice !== undefined) product.variants[variantIndex].pricing.salePrice = pricing.salePrice;
            if (pricing.commission !== undefined) product.variants[variantIndex].pricing.commission = pricing.commission;
        }
        
        // Actualizar points
        if (points) {
            if (points.earnPoints !== undefined) product.variants[variantIndex].points.earnPoints = points.earnPoints;
            if (points.redeemPoints !== undefined) product.variants[variantIndex].points.redeemPoints = points.redeemPoints;
        }
        
        if (stock !== undefined) product.variants[variantIndex].stock = stock;
        if (barcode !== undefined) product.variants[variantIndex].barcode = barcode;
        if (available !== undefined) product.variants[variantIndex].available = available;

        // Manejar actualización de imágenes de la variante
        if (req.files && req.files.variantImages) {
            const images = Array.isArray(req.files.variantImages) ? req.files.variantImages : [req.files.variantImages];
            const imageUrls = [];

            try {
                // Eliminar imágenes anteriores
                if (product.variants[variantIndex].images && product.variants[variantIndex].images.length > 0) {
                    for (const oldImage of product.variants[variantIndex].images) {
                        await s3Service.deleteFile(oldImage);
                    }
                }

                // Subir nuevas imágenes
                for (const image of images) {
                    const imageUrl = await s3Service.uploadFileFromExpressUpload(image, 'products/variants');
                    imageUrls.push(imageUrl);
                }
                product.variants[variantIndex].images = imageUrls;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al actualizar las imágenes de la variante',
                    error: error.message
                });
            }
        }

        await product.save();

        res.json({
            msg: 'Variante actualizada exitosamente',
            variant: product.variants[variantIndex],
            product
        });

    } catch (error) {
        console.error('Error actualizando variante:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Eliminar variante
productsCtrl.deleteVariant = async (req = request, res = response) => {
    try {
        const { productId, sku } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        const variantIndex = product.variants.findIndex(v => v.sku === sku);
        if (variantIndex === -1) {
            return res.status(404).json({
                msg: 'Variante no encontrada'
            });
        }

        // Eliminar imágenes de la variante
        const variant = product.variants[variantIndex];
        if (variant.images && variant.images.length > 0) {
            try {
                for (const image of variant.images) {
                    await s3Service.deleteFile(image);
                }
            } catch (error) {
                console.error('Error eliminando imágenes de variante:', error);
            }
        }

        // Eliminar la variante
        product.variants.splice(variantIndex, 1);

        // Si no quedan variantes, cambiar el tipo a simple
        if (product.variants.length === 0) {
            product.productType = 'simple';
        }

        await product.save();

        res.json({
            msg: 'Variante eliminada exitosamente',
            product
        });

    } catch (error) {
        console.error('Error eliminando variante:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Buscar productos por filtros de variantes
productsCtrl.searchProductsByVariants = async (req = request, res = response) => {
    try {
        const { color, size, minPrice, maxPrice, category, subCategory, hasDiscount, minPoints, limit = 10, from = 0 } = req.query;

        let query = { estado: true };
        
        // Filtros de categoría
        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;

        // Filtros de variantes
        let variantFilters = {};
        if (color) variantFilters['variants.color.name'] = new RegExp(color, 'i');
        if (size) variantFilters['variants.size'] = size;
        if (minPrice) variantFilters['variants.pricing.salePrice'] = { $gte: Number(minPrice) };
        if (maxPrice) {
            if (variantFilters['variants.pricing.salePrice']) {
                variantFilters['variants.pricing.salePrice'].$lte = Number(maxPrice);
            } else {
                variantFilters['variants.pricing.salePrice'] = { $lte: Number(maxPrice) };
            }
        }
        
        // Filtro por puntos mínimos
        if (minPoints) {
            variantFilters['variants.points.earnPoints'] = { $gte: Number(minPoints) };
        }

        // Filtro por productos con descuento
        if (hasDiscount === 'true') {
            query.discount = { $exists: true, $ne: [] };
        }

        // Agregar filtros de variantes a la query principal
        Object.assign(query, variantFilters);

        const [totalProducts, products] = await Promise.all([
            Product.countDocuments(query).lean(),
            Product.find(query)
                .populate('user', 'firstName')
                .populate('category', 'name')
                .populate('subCategory', 'name')
                .skip(Number(from))
                .limit(Number(limit))
                .lean()
        ]);

        // Calcular información adicional para cada producto
        const enrichedProducts = products.map(product => {
            // Calcular rango de precios
            let minProductPrice = 0, maxProductPrice = 0;
            let totalStock = 0;
            let maxEarnPoints = 0;
            
            if (product.productType === 'variant' && product.variants) {
                const prices = product.variants.map(v => v.pricing?.salePrice || 0);
                const points = product.variants.map(v => v.points?.earnPoints || 0);
                minProductPrice = Math.min(...prices);
                maxProductPrice = Math.max(...prices);
                totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                maxEarnPoints = Math.max(...points);
            } else if (product.productType === 'simple') {
                minProductPrice = maxProductPrice = product.simpleProduct?.pricing?.salePrice || 0;
                totalStock = product.simpleProduct?.stock || 0;
                maxEarnPoints = product.simpleProduct?.points?.earnPoints || 0;
            }

            return {
                ...product,
                priceRange: {
                    min: minProductPrice,
                    max: maxProductPrice
                },
                totalStock,
                maxEarnPoints,
                hasActiveDiscount: product.discount && product.discount.length > 0
            };
        });

        res.json({
            total: totalProducts,
            products: enrichedProducts,
            filters: {
                color,
                size,
                priceRange: { min: minPrice, max: maxPrice },
                category,
                subCategory,
                hasDiscount,
                minPoints
            }
        });

    } catch (error) {
        console.error('Error buscando productos por variantes:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ==================== ENDPOINTS ESPECÍFICOS PARA CATÁLOGO DE VENDEDORAS ====================

// Obtener productos para vendedoras con información de comisiones y puntos
productsCtrl.getProductsForSellers = async (req = request, res = response) => {
    try {
        const { limit = 20, from = 0, category, subCategory, hasDiscount, minCommission } = req.query;
        const sellerId = req.user._id; // ID de la vendedora

        let query = { estado: true, available: true };
        
        // Filtros opcionales
        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (hasDiscount === 'true') {
            query.discount = { $exists: true, $ne: [] };
        }

        const [totalProducts, products] = await Promise.all([
            Product.countDocuments(query).lean(),
            Product.find(query)
                .populate('category', 'name')
                .populate('subCategory', 'name category')
                .skip(Number(from))
                .limit(Number(limit))
                .lean()
        ]);

        // Enriquecer productos con información específica para vendedoras
        const sellerProducts = products.map(product => {
            let sellerInfo = {
                priceRange: { min: 0, max: 0 },
                commissionRange: { min: 0, max: 0 },
                pointsRange: { min: 0, max: 0 },
                totalStock: 0,
                hasVariants: product.productType === 'variant',
                variantCount: 0,
                discountInfo: null
            };

            // Calcular información según el tipo de producto
            if (product.productType === 'variant' && product.variants && product.variants.length > 0) {
                const availableVariants = product.variants.filter(v => v.available);
                
                if (availableVariants.length > 0) {
                    const prices = availableVariants.map(v => v.pricing?.salePrice || 0);
                    const commissions = availableVariants.map(v => v.pricing?.commission || 0);
                    const points = availableVariants.map(v => v.points?.earnPoints || 0);
                    
                    sellerInfo.priceRange = {
                        min: Math.min(...prices),
                        max: Math.max(...prices)
                    };
                    sellerInfo.commissionRange = {
                        min: Math.min(...commissions),
                        max: Math.max(...commissions)
                    };
                    sellerInfo.pointsRange = {
                        min: Math.min(...points),
                        max: Math.max(...points)
                    };
                    sellerInfo.totalStock = availableVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
                    sellerInfo.variantCount = availableVariants.length;
                }
            } else if (product.productType === 'simple') {
                const pricing = product.simpleProduct?.pricing || product.pricing;
                const points = product.simpleProduct?.points || product.points;
                
                sellerInfo.priceRange = {
                    min: pricing?.salePrice || 0,
                    max: pricing?.salePrice || 0
                };
                sellerInfo.commissionRange = {
                    min: pricing?.commission || 0,
                    max: pricing?.commission || 0
                };
                sellerInfo.pointsRange = {
                    min: points?.earnPoints || 0,
                    max: points?.earnPoints || 0
                };
                sellerInfo.totalStock = product.simpleProduct?.stock || 0;
            }

            // Procesar información de descuentos
            if (product.discount && product.discount.length > 0) {
                const activeDiscounts = product.discount.filter(d => {
                    const now = new Date();
                    const start = d.startDate ? new Date(d.startDate) : new Date(0);
                    const end = d.endDate ? new Date(d.endDate) : new Date('2099-12-31');
                    return now >= start && now <= end;
                });

                if (activeDiscounts.length > 0) {
                    sellerInfo.discountInfo = {
                        hasActiveDiscount: true,
                        discounts: activeDiscounts.map(d => ({
                            type: d.type,
                            value: d.value,
                            minQuantity: d.minQuantity || 1
                        }))
                    };
                }
            }

            // Filtrar por comisión mínima si se especifica
            if (minCommission && sellerInfo.commissionRange.max < Number(minCommission)) {
                return null;
            }

            return {
                uid: product._id,
                name: product.name,
                brand: product.brand,
                description: product.description,
                img: product.img,
                images: product.images,
                category: product.category,
                subCategory: product.subCategory,
                deliveryTime: product.deliveryTime,
                ...sellerInfo
            };
        }).filter(Boolean); // Eliminar productos null (filtrados por comisión)

        res.json({
            total: sellerProducts.length,
            products: sellerProducts,
            sellerId,
            filters: {
                category,
                subCategory,
                hasDiscount,
                minCommission
            }
        });

    } catch (error) {
        console.error('Error obteniendo productos para vendedoras:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Obtener detalles completos de un producto para vendedoras
productsCtrl.getProductDetailsForSellers = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const sellerId = req.user._id;

        const product = await Product.findOne({ _id: id, estado: true })
            .populate('category', 'name')
            .populate('subCategory', 'name category')
            .lean();

        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        // Preparar información detallada para vendedoras
        const sellerProductInfo = {
            uid: product._id,
            name: product.name,
            brand: product.brand,
            model: product.model,
            description: product.description,
            img: product.img,
            images: product.images,
            category: product.category,
            subCategory: product.subCategory,
            deliveryTime: product.deliveryTime,
            details: product.details,
            warranty: product.warranty,
            productType: product.productType,
            
            // Información de precios y comisiones
            pricing: {},
            variants: [],
            discounts: product.discount || [],
            
            // Información calculada
            totalStock: 0,
            maxCommission: 0,
            maxPoints: 0
        };

        // Procesar según el tipo de producto
        if (product.productType === 'variant' && product.variants) {
            // Filtrar solo variantes disponibles
            const availableVariants = product.variants.filter(v => v.available);
            
            sellerProductInfo.variants = availableVariants.map(variant => ({
                sku: variant.sku,
                color: variant.color,
                size: variant.size,
                measurements: variant.measurements,
                images: variant.images,
                barcode: variant.barcode,
                stock: variant.stock,
                
                // Información de precios para vendedoras
                pricing: {
                    costPrice: variant.pricing?.costPrice || 0,
                    salePrice: variant.pricing?.salePrice || 0,
                    profit: {
                        amount: variant.pricing?.profit?.amount || 0,
                        percentage: variant.pricing?.profit?.percentage || 0
                    },
                    commission: variant.pricing?.commission || 0
                },
                points: {
                    earnPoints: variant.points?.earnPoints || 0,
                    redeemPoints: variant.points?.redeemPoints || 0
                }
            }));

            // Calcular totales
            sellerProductInfo.totalStock = availableVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
            sellerProductInfo.maxCommission = Math.max(...availableVariants.map(v => v.pricing?.commission || 0));
            sellerProductInfo.maxPoints = Math.max(...availableVariants.map(v => v.points?.earnPoints || 0));
            
        } else if (product.productType === 'simple') {
            const pricing = product.simpleProduct?.pricing || product.pricing;
            const points = product.simpleProduct?.points || product.points;
            
            sellerProductInfo.pricing = {
                costPrice: pricing?.costPrice || 0,
                salePrice: pricing?.salePrice || 0,
                profit: {
                    amount: pricing?.profit?.amount || 0,
                    percentage: pricing?.profit?.percentage || 0
                },
                commission: pricing?.commission || 0
            };
            
            sellerProductInfo.points = {
                earnPoints: points?.earnPoints || 0,
                redeemPoints: points?.redeemPoints || 0
            };
            
            sellerProductInfo.totalStock = product.simpleProduct?.stock || 0;
            sellerProductInfo.maxCommission = pricing?.commission || 0;
            sellerProductInfo.maxPoints = points?.earnPoints || 0;
        }

        res.json({
            product: sellerProductInfo,
            sellerId
        });

    } catch (error) {
        console.error('Error obteniendo detalles del producto para vendedoras:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

// Calcular comisión y puntos para una venta específica
productsCtrl.calculateSaleCommission = async (req = request, res = response) => {
    try {
        const { productId, variantSku, quantity = 1 } = req.body;
        const sellerId = req.user._id;

        if (!productId || quantity <= 0) {
            return res.status(400).json({
                msg: 'ID de producto y cantidad válida son requeridos'
            });
        }

        const product = await Product.findOne({ _id: productId, estado: true }).lean();

        if (!product) {
            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        let saleInfo = {
            productId,
            variantSku: variantSku || null,
            quantity: Number(quantity),
            unitPrice: 0,
            totalPrice: 0,
            unitCommission: 0,
            totalCommission: 0,
            unitPoints: 0,
            totalPoints: 0,
            availableStock: 0,
            discountApplied: null
        };

        // Determinar precios según el tipo de producto
        if (product.productType === 'variant' && variantSku) {
            const variant = product.variants.find(v => v.sku === variantSku && v.available);
            
            if (!variant) {
                return res.status(404).json({
                    msg: 'Variante no encontrada o no disponible'
                });
            }

            saleInfo.unitPrice = variant.pricing?.salePrice || 0;
            saleInfo.unitCommission = variant.pricing?.commission || 0;
            saleInfo.unitPoints = variant.points?.earnPoints || 0;
            saleInfo.availableStock = variant.stock || 0;
            
        } else if (product.productType === 'simple') {
            const pricing = product.simpleProduct?.pricing || product.pricing;
            const points = product.simpleProduct?.points || product.points;
            
            saleInfo.unitPrice = pricing?.salePrice || 0;
            saleInfo.unitCommission = pricing?.commission || 0;
            saleInfo.unitPoints = points?.earnPoints || 0;
            saleInfo.availableStock = product.simpleProduct?.stock || 0;
        }

        // Verificar stock disponible
        if (saleInfo.quantity > saleInfo.availableStock) {
            return res.status(400).json({
                msg: `Stock insuficiente. Disponible: ${saleInfo.availableStock}`
            });
        }

        // Calcular totales
        saleInfo.totalPrice = saleInfo.unitPrice * saleInfo.quantity;
        saleInfo.totalCommission = saleInfo.unitCommission * saleInfo.quantity;
        saleInfo.totalPoints = saleInfo.unitPoints * saleInfo.quantity;

        // Aplicar descuentos si existen
        if (product.discount && product.discount.length > 0) {
            const applicableDiscounts = product.discount.filter(d => {
                const now = new Date();
                const start = d.startDate ? new Date(d.startDate) : new Date(0);
                const end = d.endDate ? new Date(d.endDate) : new Date('2099-12-31');
                const validTime = now >= start && now <= end;
                const validQuantity = saleInfo.quantity >= (d.minQuantity || 1);
                
                return validTime && validQuantity;
            });

            if (applicableDiscounts.length > 0) {
                // Aplicar el mejor descuento
                let bestDiscount = null;
                let maxDiscountAmount = 0;

                applicableDiscounts.forEach(discount => {
                    let discountAmount = 0;
                    if (discount.type === 'percentage') {
                        discountAmount = (saleInfo.totalPrice * discount.value) / 100;
                    } else if (discount.type === 'fixed') {
                        discountAmount = discount.value;
                    }

                    if (discountAmount > maxDiscountAmount) {
                        maxDiscountAmount = discountAmount;
                        bestDiscount = discount;
                    }
                });

                if (bestDiscount) {
                    saleInfo.discountApplied = {
                        type: bestDiscount.type,
                        value: bestDiscount.value,
                        amount: maxDiscountAmount
                    };
                    saleInfo.totalPrice -= maxDiscountAmount;
                }
            }
        }

        res.json({
            saleCalculation: saleInfo,
            productName: product.name,
            sellerId
        });

    } catch (error) {
        console.error('Error calculando comisión de venta:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = productsCtrl