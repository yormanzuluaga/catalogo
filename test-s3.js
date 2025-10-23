const S3Service = require('./src/services/s3.service');
require('dotenv').config();

async function testS3Connection() {
    try {
        console.log('🧪 Iniciando pruebas de conexión S3...\n');

        // Verificar variables de entorno
        const requiredEnvVars = [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_REGION',
            'AWS_S3_BUCKET_NAME'
        ];

        console.log('📋 Verificando variables de entorno:');
        requiredEnvVars.forEach(envVar => {
            const value = process.env[envVar];
            console.log(`   ${envVar}: ${value ? '✅ Configurado' : '❌ No configurado'}`);
        });

        if (!requiredEnvVars.every(envVar => process.env[envVar])) {
            console.log('\n❌ Faltan variables de entorno. Por favor configúralas en el archivo .env');
            console.log('\nConfigura estas variables en tu archivo .env:');
            requiredEnvVars.forEach(envVar => {
                if (!process.env[envVar]) {
                    console.log(`${envVar}=tu_valor_aqui`);
                }
            });
            return;
        }

        // Crear instancia del servicio
        const s3Service = new S3Service();
        console.log('\n✅ Servicio S3 inicializado correctamente');

        // Crear un archivo de prueba
        const testContent = Buffer.from('Esto es un archivo de prueba para S3 - AWS SDK v3');
        const testFileName = 'test-file.txt';
        
        console.log('\n📤 Subiendo archivo de prueba...');
        const fileUrl = await s3Service.uploadFile(
            testContent,
            testFileName,
            'test',
            'text/plain'
        );
        console.log(`✅ Archivo subido exitosamente: ${fileUrl}`);

        // Verificar si el archivo existe
        console.log('\n🔍 Verificando si el archivo existe...');
        const exists = await s3Service.fileExists(fileUrl);
        console.log(`${exists ? '✅' : '❌'} Archivo ${exists ? 'existe' : 'no existe'} en S3`);

        // Eliminar archivo de prueba
        console.log('\n🗑️  Eliminando archivo de prueba...');
        const deleted = await s3Service.deleteFile(fileUrl);
        console.log(`${deleted ? '✅' : '❌'} Archivo ${deleted ? 'eliminado' : 'no eliminado'} correctamente`);

        console.log('\n🎉 Todas las pruebas pasaron exitosamente!');
        console.log('El sistema de uploads con S3 (AWS SDK v3) está listo para usar.');

    } catch (error) {
        console.error('\n❌ Error durante las pruebas:', error.message);
        console.log('\n🔧 Posibles soluciones:');
        console.log('   1. Verifica que las credenciales de AWS sean correctas');
        console.log('   2. Asegúrate de que el bucket exista y tengas permisos');
        console.log('   3. Verifica la configuración de la región');
        console.log('   4. Revisa las políticas de acceso del bucket');
        console.log('   5. Si es la primera vez, crea el bucket en AWS S3 Console');
    }
}

// Ejecutar las pruebas
testS3Connection();
