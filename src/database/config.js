require('dotenv').config();
const mongoose = require('mongoose');

const dbConnection = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        console.log('URL:', process.env.MONGODB_CNN);
        
        await mongoose.connect(process.env.MONGODB_CNN);
        console.log('✅ Base de datos conectada exitosamente');
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        console.log('🔧 Posibles soluciones:');
        console.log('   1. Verifica tu conexión a internet');
        console.log('   2. Confirma que las credenciales de MongoDB sean correctas');
        console.log('   3. Verifica que el cluster de MongoDB esté activo');
        console.log('   4. Revisa la whitelist de IPs en MongoDB Atlas');
        
        // No lanzar error para que el servidor pueda iniciar sin BD
        console.log('⚠️  Servidor iniciado sin conexión a base de datos');
    }
}

module.exports = {
    dbConnection
};
