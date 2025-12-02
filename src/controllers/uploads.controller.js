const { response, request } = require('express');
const helpersArchive = require('../helpers/subir_archivo');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const SubCategory = require('../models/sub_category.model');
const Brand = require('../models/brand.model');

const uploadsCtrl = {}

/**
 * Subir archivo general
 */
uploadsCtrl.fileUpload = async (req = request, res = response) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0 || !req.files.archivo) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir'
            });
        }

        const fileUrl = await helpersArchive.subirArchivo(req.files, undefined, 'general');

        res.json({
            ok: true,
            msg: 'Archivo subido exitosamente',
            url: fileUrl
        });

    } catch (error) {
        console.error('Error en fileUpload:', error);
        res.status(500).json({
            ok: false,
            msg: error
        });
    }
}

/**
 * Actualizar imagen de usuario o producto
 */
uploadsCtrl.updateImage = async (req = request, res = response) => {
    try {
        const { id, collection } = req.params;

        let model;
        let campoImagen;

        switch (collection) {
            case 'users':
                model = await User.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un usuario con el id ${id}`
                    });
                }
                campoImagen = 'avatar';
                break;

            case 'products':
                model = await Product.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un producto con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'categories':
                model = await Category.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una categoría con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'subcategories':
                model = await SubCategory.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una subcategoría con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'brands':
                model = await Brand.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una marca con el id ${id}`
                    });
                }
                campoImagen = 'logo';
                break;

            default:
                return res.status(500).json({
                    ok: false,
                    msg: 'Colección no válida. Use: users, products, categories, subcategories o brands'
                });
        }

        // Validar que hay archivos
        console.log('📥 [UPLOAD] Files recibidos:', req.files);
        console.log('📥 [UPLOAD] Keys:', req.files ? Object.keys(req.files) : 'No files');

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir - req.files está vacío'
            });
        }

        if (!req.files.archivo) {
            console.log('❌ [UPLOAD] No se encontró "archivo" en req.files');
            console.log('📥 [UPLOAD] Archivos disponibles:', Object.keys(req.files));
            return res.status(400).json({
                ok: false,
                msg: 'No se encontró el campo "archivo". Campos disponibles: ' + Object.keys(req.files).join(', ')
            });
        }

        console.log('📥 [UPLOAD] Archivo recibido:', {
            name: req.files.archivo.name,
            size: req.files.archivo.size,
            mimetype: req.files.archivo.mimetype
        });

        // Eliminar imagen anterior si existe
        if (model[campoImagen]) {
            await helpersArchive.eliminarArchivo(model[campoImagen]);
        }

        // Subir nueva imagen
        const fileUrl = await helpersArchive.subirArchivo(req.files, undefined, collection);
        console.log('📤 [UPLOAD] URL generada por S3:', fileUrl);
        console.log('📤 [UPLOAD] Collection:', collection);
        console.log('📤 [UPLOAD] Campo de imagen:', campoImagen);

        model[campoImagen] = fileUrl;
        console.log('📤 [UPLOAD] Model antes de guardar:', { [campoImagen]: model[campoImagen] });

        await model.save();
        console.log('📤 [UPLOAD] Model después de guardar:', { [campoImagen]: model[campoImagen] });

        res.json({
            ok: true,
            msg: 'Imagen actualizada exitosamente',
            model
        });

    } catch (error) {
        console.error('Error en updateImage:', error);
        res.status(500).json({
            ok: false,
            msg: error
        });
    }
}

/**
 * Mostrar imagen de usuario o producto
 */
uploadsCtrl.showImage = async (req = request, res = response) => {
    try {
        const { id, collection } = req.params;
        const S3Service = require('../services/s3.service');
        const s3Service = new S3Service();

        let model;
        let campoImagen;

        switch (collection) {
            case 'users':
                model = await User.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un usuario con el id ${id}`
                    });
                }
                campoImagen = 'avatar';
                break;

            case 'products':
                model = await Product.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un producto con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'categories':
                model = await Category.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una categoría con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'subcategories':
                model = await SubCategory.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una subcategoría con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'brands':
                model = await Brand.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una marca con el id ${id}`
                    });
                }
                campoImagen = 'logo';
                break;

            default:
                return res.status(500).json({
                    ok: false,
                    msg: 'Colección no válida. Use: users, products, categories, subcategories o brands'
                });
        }

        // Verificar si tiene imagen
        if (model[campoImagen]) {
            console.log('🔍 [SHOW] URL original en DB:', model[campoImagen]);

            try {
                // Generar URL firmada temporal (válida por 1 hora)
                const signedUrl = await s3Service.getSignedUrl(model[campoImagen], 3600);
                console.log('✅ [SHOW] URL firmada generada:', signedUrl);

                return res.json({
                    ok: true,
                    url: signedUrl,
                    originalUrl: model[campoImagen]
                });
            } catch (error) {
                console.error('❌ [SHOW] Error generando URL firmada:', error);
                // Si falla generar URL firmada, devolver la original
                return res.json({
                    ok: true,
                    url: model[campoImagen],
                    error: 'No se pudo generar URL firmada, usando URL original'
                });
            }
        }

        // Imagen por defecto
        res.json({
            ok: true,
            url: null,
            msg: 'No hay imagen disponible'
        });

    } catch (error) {
        console.error('Error en showImage:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
}

/**
 * Eliminar imagen de usuario o producto
 */
uploadsCtrl.deleteImage = async (req = request, res = response) => {
    try {
        const { id, collection } = req.params;

        let model;
        let campoImagen;

        switch (collection) {
            case 'users':
                model = await User.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un usuario con el id ${id}`
                    });
                }
                campoImagen = 'avatar';
                break;

            case 'products':
                model = await Product.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un producto con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'categories':
                model = await Category.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una categoría con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'subcategories':
                model = await SubCategory.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una subcategoría con el id ${id}`
                    });
                }
                campoImagen = 'img';
                break;

            case 'brands':
                model = await Brand.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe una marca con el id ${id}`
                    });
                }
                campoImagen = 'logo';
                break;

            default:
                return res.status(500).json({
                    ok: false,
                    msg: 'Colección no válida. Use: users, products, categories, subcategories o brands'
                });
        }

        // Eliminar imagen de S3
        if (model[campoImagen]) {
            await helpersArchive.eliminarArchivo(model[campoImagen]);
            model[campoImagen] = null;
            await model.save();
        }

        res.json({
            ok: true,
            msg: 'Imagen eliminada exitosamente',
            model
        });

    } catch (error) {
        console.error('Error en deleteImage:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
}

/**
 * Subir múltiples imágenes para productos
 */
uploadsCtrl.uploadMultipleImages = async (req = request, res = response) => {
    try {
        const { id } = req.params;

        // Verificar que el producto existe
        const product = await Product.findById(id);
        if (!product) {
            return res.status(400).json({
                ok: false,
                msg: `No existe un producto con el id ${id}`
            });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir'
            });
        }

        const uploadedUrls = [];
        const files = Array.isArray(req.files.archivos) ? req.files.archivos : [req.files.archivos];

        // Subir cada archivo
        for (const file of files) {
            const fileUrl = await helpersArchive.subirArchivo(
                { archivo: file },
                undefined,
                'products'
            );
            uploadedUrls.push(fileUrl);
        }

        // Actualizar producto con las nuevas imágenes
        if (!product.images) {
            product.images = [];
        }
        product.images.push(...uploadedUrls);
        await product.save();

        res.json({
            ok: true,
            msg: 'Imágenes subidas exitosamente',
            urls: uploadedUrls,
            product
        });

    } catch (error) {
        console.error('Error en uploadMultipleImages:', error);
        res.status(500).json({
            ok: false,
            msg: error
        });
    }
}

module.exports = uploadsCtrl