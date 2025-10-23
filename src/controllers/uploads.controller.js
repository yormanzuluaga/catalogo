const { response, request } = require('express');
const helpersArchive = require('../helpers/subir_archivo');
const User = require('../models/user.model');
const Product = require('../models/product.model');

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

        switch (collection) {
            case 'users':
                model = await User.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un usuario con el id ${id}`
                    });
                }
                break;
                
            case 'products':
                model = await Product.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un producto con el id ${id}`
                    });
                }
                break;

            default:
                return res.status(500).json({ 
                    ok: false,
                    msg: 'Colección no válida. Use: users o products'
                });
        }

        // Validar que hay archivos
        if (!req.files || Object.keys(req.files).length === 0 || !req.files.archivo) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir'
            });
        }

        // Eliminar imagen anterior si existe
        const campoImagen = collection === 'users' ? 'avatar' : 'img';
        if (model[campoImagen]) {
            await helpersArchive.eliminarArchivo(model[campoImagen]);
        }

        // Subir nueva imagen
        const fileUrl = await helpersArchive.subirArchivo(req.files, undefined, collection);
        model[campoImagen] = fileUrl;

        await model.save();

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

        let model;

        switch (collection) {
            case 'users':
                model = await User.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un usuario con el id ${id}`
                    });
                }
                break;
                
            case 'products':
                model = await Product.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un producto con el id ${id}`
                    });
                }
                break;

            default:
                return res.status(500).json({ 
                    ok: false,
                    msg: 'Colección no válida. Use: users o products'
                });
        }

        // Verificar si tiene imagen
        const campoImagen = collection === 'users' ? 'avatar' : 'img';
        
        if (model[campoImagen]) {
            return res.json({
                ok: true,
                url: model[campoImagen]
            });
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

        switch (collection) {
            case 'users':
                model = await User.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un usuario con el id ${id}`
                    });
                }
                break;
                
            case 'products':
                model = await Product.findById(id);
                if (!model) {
                    return res.status(400).json({
                        ok: false,
                        msg: `No existe un producto con el id ${id}`
                    });
                }
                break;

            default:
                return res.status(500).json({ 
                    ok: false,
                    msg: 'Colección no válida. Use: users o products'
                });
        }

        const campoImagen = collection === 'users' ? 'avatar' : 'img';
        
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