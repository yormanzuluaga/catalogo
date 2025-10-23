const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

class S3Service {
    constructor() {
        // Configurar AWS S3 Client v3
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        
        this.bucketName = process.env.AWS_S3_BUCKET_NAME;
        
        if (!this.bucketName) {
            throw new Error('AWS_S3_BUCKET_NAME no está configurado en las variables de entorno');
        }
    }

    /**
     * Subir archivo a S3
     * @param {Buffer} fileBuffer - Buffer del archivo
     * @param {string} fileName - Nombre original del archivo
     * @param {string} folder - Carpeta en S3 (users/products)
     * @param {string} mimeType - Tipo MIME del archivo
     * @returns {Promise<string>} URL del archivo subido
     */
    async uploadFile(fileBuffer, fileName, folder = '', mimeType = 'image/jpeg') {
        try {
            // Generar nombre único para el archivo
            const fileExtension = fileName.split('.').pop();
            const uniqueFileName = `${uuidv4()}.${fileExtension}`;
            const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
                ACL: 'public-read' // Hacer el archivo público para lectura
            });

            const result = await this.s3Client.send(command);
            
            // Construir la URL del archivo
            const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
            return fileUrl;
        } catch (error) {
            console.error('Error al subir archivo a S3:', error);
            throw new Error('Error al subir archivo a S3: ' + error.message);
        }
    }

    /**
     * Eliminar archivo de S3
     * @param {string} fileUrl - URL del archivo en S3
     * @returns {Promise<boolean>} True si se eliminó correctamente
     */
    async deleteFile(fileUrl) {
        try {
            // Extraer la key del archivo de la URL
            const urlParts = fileUrl.split('/');
            const bucketIndex = urlParts.findIndex(part => part === this.bucketName);
            const key = urlParts.slice(bucketIndex + 1).join('/');

            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            console.error('Error al eliminar archivo de S3:', error);
            throw new Error('Error al eliminar archivo de S3: ' + error.message);
        }
    }

    /**
     * Verificar si un archivo existe en S3
     * @param {string} fileUrl - URL del archivo en S3
     * @returns {Promise<boolean>} True si el archivo existe
     */
    async fileExists(fileUrl) {
        try {
            const urlParts = fileUrl.split('/');
            const bucketIndex = urlParts.findIndex(part => part === this.bucketName);
            const key = urlParts.slice(bucketIndex + 1).join('/');

            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtener URL firmada para acceso temporal
     * @param {string} fileUrl - URL del archivo en S3
     * @param {number} expirationTime - Tiempo de expiración en segundos (default: 1 hora)
     * @returns {Promise<string>} URL firmada
     */
    async getSignedUrl(fileUrl, expirationTime = 3600) {
        try {
            const urlParts = fileUrl.split('/');
            const bucketIndex = urlParts.findIndex(part => part === this.bucketName);
            const key = urlParts.slice(bucketIndex + 1).join('/');

            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            return await getSignedUrl(this.s3Client, command, { 
                expiresIn: expirationTime 
            });
        } catch (error) {
            console.error('Error al generar URL firmada:', error);
            throw new Error('Error al generar URL firmada: ' + error.message);
        }
    }

    /**
     * Validar tipos de archivo permitidos
     * @param {string} mimeType - Tipo MIME del archivo
     * @param {string} type - Tipo de archivo (user/product)
     * @returns {boolean} True si es válido
     */
    isValidFileType(mimeType, type = 'image') {
        const allowedImageTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        const allowedVideoTypes = [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo'
        ];

        switch (type) {
            case 'image':
                return allowedImageTypes.includes(mimeType);
            case 'video':
                return allowedVideoTypes.includes(mimeType);
            default:
                return allowedImageTypes.includes(mimeType);
        }
    }

    /**
     * Validar tamaño de archivo
     * @param {number} fileSize - Tamaño del archivo en bytes
     * @param {string} type - Tipo de archivo (image/video)
     * @returns {boolean} True si es válido
     */
    isValidFileSize(fileSize, type = 'image') {
        const maxImageSize = 5 * 1024 * 1024; // 5MB
        const maxVideoSize = 50 * 1024 * 1024; // 50MB

        switch (type) {
            case 'image':
                return fileSize <= maxImageSize;
            case 'video':
                return fileSize <= maxVideoSize;
            default:
                return fileSize <= maxImageSize;
        }
    }
}

module.exports = S3Service;
