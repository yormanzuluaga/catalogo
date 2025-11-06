const { response, request } = require('express')
const Brand = require('../models/brand.model')
const Product = require('../models/product.model')
const S3Service = require('../services/s3.service')

const brandCtrl = {}
const s3Service = new S3Service()

// Obtener todas las marcas
brandCtrl.getAllBrands = async (req = request, res = response) => {
    try {
        const { limit = 10, from = 0, active = 'true' } = req.query;
        
        // Construir query
        let query = { estado: true };
        if (active === 'true') {
            query.isActive = true;
        }

        const [totalBrands, brands] = await Promise.all([
            Brand.countDocuments(query).lean(),
            Brand.find(query)
                .populate('user', 'firstName')
                .select('name description logo website isActive country founded colors socialMedia contact user createdAt updatedAt')
                .skip(Number(from))
                .limit(Number(limit))
                .sort({ name: 1 })
                .lean()
        ]);

        // Agregar conteo de productos para cada marca
        const brandsWithProductCount = await Promise.all(
            brands.map(async (brand) => {
                const productCount = await Product.countDocuments({
                    brand: brand._id,
                    estado: true
                });
                
                return {
                    ...brand,
                    productCount
                };
            })
        );

        res.json({
            totalBrands,
            brands: brandsWithProductCount
        });

    } catch (error) {
        console.error('Error obteniendo marcas:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Obtener una marca específica
brandCtrl.getBrand = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        
        const brand = await Brand.findById(id)
            .populate('user', 'firstName')
            .select('name description logo website isActive country founded colors socialMedia contact user createdAt updatedAt')
            .lean();

        if (!brand) {
            return res.status(404).json({
                msg: 'Marca no encontrada'
            });
        }

        // Obtener conteo de productos
        const productCount = await Product.countDocuments({
            brand: id,
            estado: true
        });

        res.json({
            ...brand,
            productCount
        });

    } catch (error) {
        console.error('Error obteniendo marca:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Crear una nueva marca
brandCtrl.createBrand = async (req = request, res = response) => {
    try {
        const { name, logo, ...body } = req.body;

        // Verificar si la marca ya existe
        const brandDB = await Brand.findOne({ name: name.trim() });

        if (brandDB) {
            return res.status(400).json({
                msg: `La marca ${brandDB.name} ya existe`
            });
        }

        const data = {
            name: name.trim(),
            logo: logo,
            user: req.user._id,
            ...body
        };

        // Manejar logo si se envió archivo
        if (req.files && req.files.logo) {
            try {
                const logoUrl = await s3Service.uploadFileFromExpressUpload(req.files.logo, 'brands');
                data.logo = logoUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir el logo de la marca',
                    error: error.message
                });
            }
        } else if (logo) {
            // Si se pasó URL de logo en el body
            data.logo = logo;
        }

        const brand = new Brand(data);
        await brand.save();

        // Obtener la marca creada con populate
        const createdBrand = await Brand.findById(brand._id)
            .populate('user', 'firstName');

        res.status(201).json({
            msg: 'Marca creada exitosamente',
            brand: createdBrand
        });

    } catch (error) {
        console.error('Error creando marca:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Actualizar una marca
brandCtrl.updateBrand = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { estado, user, ...data } = req.body;

        // Obtener la marca actual
        const currentBrand = await Brand.findById(id);
        if (!currentBrand) {
            return res.status(404).json({
                msg: 'Marca no encontrada'
            });
        }

        // Manejar logo si se envió archivo
        if (req.files && req.files.logo) {
            try {
                // Eliminar logo anterior si existe
                if (currentBrand.logo) {
                    const key = currentBrand.logo.split('/').pop();
                    await s3Service.deleteFile(key);
                }

                // Subir nuevo logo
                const logoUrl = await s3Service.uploadFileFromExpressUpload(req.files.logo, 'brands');
                data.logo = logoUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al actualizar el logo de la marca',
                    error: error.message
                });
            }
        }

        // Actualizar marca
        const updatedBrand = await Brand.findByIdAndUpdate(id, data, { new: true })
            .populate('user', 'firstName');

        res.json({
            msg: 'Marca actualizada exitosamente',
            brand: updatedBrand
        });

    } catch (error) {
        console.error('Error actualizando marca:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Eliminar una marca (soft delete)
brandCtrl.deleteBrand = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Verificar si hay productos asociados a esta marca
        const productCount = await Product.countDocuments({
            brand: id,
            estado: true
        });

        if (productCount > 0) {
            return res.status(400).json({
                msg: `No se puede eliminar la marca porque tiene ${productCount} productos asociados`
            });
        }

        // Marcar la marca como eliminada
        const deletedBrand = await Brand.findByIdAndUpdate(id, { estado: false }, { new: true });

        res.json({
            msg: 'Marca eliminada exitosamente',
            brand: deletedBrand
        });

    } catch (error) {
        console.error('Error eliminando marca:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Obtener productos por marca
brandCtrl.getProductsByBrand = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { limit = 10, from = 0, category, subCategory } = req.query;

        // Verificar que la marca existe
        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({
                msg: 'Marca no encontrada'
            });
        }

        // Construir query para productos
        let query = {
            brand: id,
            estado: true
        };

        // Filtros adicionales opcionales
        if (category) {
            query.category = category;
        }
        if (subCategory) {
            query.subCategory = subCategory;
        }

        const [totalProducts, products] = await Promise.all([
            Product.countDocuments(query),
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
                .populate('brand', 'name logo')
                .skip(Number(from))
                .limit(Number(limit))
                .sort({ createdAt: -1 })
                .lean()
        ]);

        res.json({
            brand: {
                _id: brand._id,
                name: brand.name,
                logo: brand.logo
            },
            totalProducts,
            from: Number(from),
            limit: Number(limit),
            products
        });

    } catch (error) {
        console.error('Error obteniendo productos por marca:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Agregar logo a una marca existente
brandCtrl.addBrandLogo = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Verificar que la marca existe
        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({
                msg: 'Marca no encontrada'
            });
        }

        // Verificar que se envió un logo
        if (!req.files || !req.files.logo) {
            return res.status(400).json({
                msg: 'No se envió ningún logo'
            });
        }

        try {
            // Eliminar logo anterior si existe
            if (brand.logo) {
                const key = brand.logo.split('/').pop();
                await s3Service.deleteFile(key);
            }

            // Subir nuevo logo
            const logoUrl = await s3Service.uploadFileFromExpressUpload(req.files.logo, 'brands');
            
            // Actualizar marca con nuevo logo
            brand.logo = logoUrl;
            await brand.save();

            // Obtener marca actualizada con populate
            const updatedBrand = await Brand.findById(id)
                .populate('user', 'firstName');

            res.json({
                msg: 'Logo agregado exitosamente',
                brand: updatedBrand
            });

        } catch (uploadError) {
            console.error('Error al subir logo:', uploadError);
            res.status(500).json({
                msg: 'Error al subir el logo',
                error: uploadError.message
            });
        }

    } catch (error) {
        console.error('Error en addBrandLogo:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Eliminar logo de una marca
brandCtrl.removeBrandLogo = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Verificar que la marca existe
        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({
                msg: 'Marca no encontrada'
            });
        }

        if (!brand.logo) {
            return res.status(400).json({
                msg: 'La marca no tiene logo para eliminar'
            });
        }

        try {
            // Eliminar logo de S3
            const key = brand.logo.split('/').pop();
            await s3Service.deleteFile(key);

            // Remover referencia de logo de la marca
            brand.logo = null;
            await brand.save();

            // Obtener marca actualizada con populate
            const updatedBrand = await Brand.findById(id)
                .populate('user', 'firstName');

            res.json({
                msg: 'Logo eliminado exitosamente',
                brand: updatedBrand
            });

        } catch (deleteError) {
            console.error('Error al eliminar logo:', deleteError);
            res.status(500).json({
                msg: 'Error al eliminar el logo',
                error: deleteError.message
            });
        }

    } catch (error) {
        console.error('Error en removeBrandLogo:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

// Obtener estadísticas de marcas
brandCtrl.getBrandStats = async (req = request, res = response) => {
    try {
        // Agregación para obtener estadísticas completas
        const brandStats = await Brand.aggregate([
            // Filtrar solo marcas activas
            {
                $match: {
                    estado: true,
                    isActive: true
                }
            },
            // Lookup para contar productos
            {
                $lookup: {
                    from: 'products',
                    let: { brandId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$brand', '$$brandId'] },
                                        { $eq: ['$estado', true] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'products'
                }
            },
            // Proyectar datos necesarios
            {
                $project: {
                    name: 1,
                    logo: 1,
                    country: 1,
                    website: 1,
                    productCount: { $size: '$products' },
                    createdAt: 1
                }
            },
            // Ordenar por cantidad de productos
            {
                $sort: { productCount: -1, name: 1 }
            }
        ]);

        res.json({
            totalBrands: brandStats.length,
            stats: brandStats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de marcas:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

module.exports = brandCtrl
