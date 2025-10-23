const { response, request } = require('express');
const helpersArchive = require('../helpers/subir_archivo');

const middlewareArchive = {}

/**
 * Validar que se suban archivos
 */
middlewareArchive.validarArchivoSubir = async (req = request, res = response, next) => {
    try {
        // Verificar si hay archivos en la request
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir'
            });
        }

        // Verificar si existe el campo 'archivo' o 'archivos' para múltiples archivos
        if (!req.files.archivo && !req.files.archivos) {
            return res.status(400).json({
                ok: false,
                msg: 'Debe enviar el archivo con el nombre "archivo" o "archivos" para múltiples'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error
        });
    }
}

/**
 * Validar archivos de imagen específicamente
 */
middlewareArchive.validarImagenSubir = async (req = request, res = response, next) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir'
            });
        }

        const archivo = req.files.archivo;
        if (!archivo) {
            return res.status(400).json({
                ok: false,
                msg: 'Debe enviar el archivo con el nombre "archivo"'
            });
        }

        // Validar que sea una imagen
        const validacion = helpersArchive.validarArchivo(archivo, 'image');
        if (!validacion.valido) {
            return res.status(400).json({
                ok: false,
                msg: 'Archivo no válido',
                errores: validacion.errores
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error
        });
    }
}

/**
 * Validar múltiples archivos de imagen
 */
middlewareArchive.validarMultiplesImagenes = async (req = request, res = response, next) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No hay archivos que subir'
            });
        }

        const archivos = req.files.archivos;
        if (!archivos) {
            return res.status(400).json({
                ok: false,
                msg: 'Debe enviar los archivos con el nombre "archivos"'
            });
        }

        // Convertir a array si es un solo archivo
        const files = Array.isArray(archivos) ? archivos : [archivos];

        // Validar cada archivo
        for (let i = 0; i < files.length; i++) {
            const validacion = helpersArchive.validarArchivo(files[i], 'image');
            if (!validacion.valido) {
                return res.status(400).json({
                    ok: false,
                    msg: `Archivo ${i + 1} no válido`,
                    errores: validacion.errores
                });
            }
        }

        next();
    } catch (error) {
        return res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor',
            error
        });
    }
}

module.exports = middlewareArchive