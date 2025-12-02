const S3Service = require('../services/s3.service');

const helpersArchive = {}

/**
 * Subir archivo a S3
 * @param {Object} files - Archivos del request
 * @param {Array} extensiones - Extensiones permitidas
 * @param {string} folder - Carpeta en S3
 * @returns {Promise<string>} URL del archivo subido
 */
helpersArchive.subirArchivo = async (files, extensiones = ['png', 'jpg', 'jpeg', 'gif', 'webp'], folder = '') => {

    return new Promise(async (resolve, reject) => {
        try {
            console.log('📦 [HELPER] Files recibidos:', files ? Object.keys(files) : 'No files');

            const { archivo } = files;

            if (!archivo) {
                console.log('❌ [HELPER] No se encontró "archivo" en files');
                return reject('No se encontró el archivo');
            }

            console.log('📄 [HELPER] Detalles del archivo:', {
                name: archivo.name,
                size: archivo.size,
                mimetype: archivo.mimetype,
                dataLength: archivo.data ? archivo.data.length : 0
            });

            if (archivo.size === 0) {
                return reject('El archivo está vacío (0 bytes)');
            }

            const nombreCortado = archivo.name.split('.');
            const extension = nombreCortado[nombreCortado.length - 1].toLowerCase();

            // Validar la extensión
            if (!extensiones.includes(extension)) {
                return reject(`La extensión ${extension} no es permitida - ${extensiones}`);
            }

            // Crear instancia del servicio S3
            const s3Service = new S3Service();

            // Validar tipo de archivo
            if (!s3Service.isValidFileType(archivo.mimetype)) {
                return reject(`Tipo de archivo no válido: ${archivo.mimetype}`);
            }

            // Validar tamaño de archivo
            if (!s3Service.isValidFileSize(archivo.size)) {
                return reject('El archivo es demasiado grande. Máximo 5MB para imágenes');
            }

            console.log('✅ [HELPER] Subiendo archivo a S3...');
            // Subir archivo a S3
            const fileUrl = await s3Service.uploadFile(
                archivo.data,
                archivo.name,
                folder,
                archivo.mimetype
            );

            console.log('✅ [HELPER] Archivo subido exitosamente:', fileUrl);
            resolve(fileUrl);

        } catch (error) {
            console.error('❌ [HELPER] Error:', error);
            reject(`Error al subir archivo: ${error.message}`);
        }
    });
}

/**
 * Eliminar archivo de S3
 * @param {string} fileUrl - URL del archivo en S3
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
helpersArchive.eliminarArchivo = async (fileUrl) => {
    try {
        if (!fileUrl) return true;

        const s3Service = new S3Service();
        return await s3Service.deleteFile(fileUrl);
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return false;
    }
}

/**
 * Validar archivo antes de subirlo
 * @param {Object} archivo - Archivo a validar
 * @param {string} tipo - Tipo de archivo (image/video)
 * @returns {Object} Resultado de la validación
 */
helpersArchive.validarArchivo = (archivo, tipo = 'image') => {
    const errores = [];

    if (!archivo) {
        errores.push('No se proporcionó ningún archivo');
        return { valido: false, errores };
    }

    const s3Service = new S3Service();

    // Validar tipo MIME
    if (!s3Service.isValidFileType(archivo.mimetype, tipo)) {
        errores.push(`Tipo de archivo no válido: ${archivo.mimetype}`);
    }

    // Validar tamaño
    if (!s3Service.isValidFileSize(archivo.size, tipo)) {
        const maxSize = tipo === 'image' ? '5MB' : '50MB';
        errores.push(`Archivo demasiado grande. Máximo ${maxSize}`);
    }

    return {
        valido: errores.length === 0,
        errores
    };
}

module.exports = helpersArchive