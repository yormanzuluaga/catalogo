const mongoose = require('mongoose');
const Product = require('../src/models/product.model');
require('dotenv').config();

/**
 * Migración para agregar el campo 'images' a productos existentes
 */
async function migrateProducts() {
    try {
        console.log('🔄 Iniciando migración de productos...');

        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_CNN);
        console.log('✅ Conectado a la base de datos');

        // Buscar productos que no tengan el campo 'images'
        const productsToUpdate = await Product.find({
            images: { $exists: false }
        });

        console.log(`📊 Encontrados ${productsToUpdate.length} productos para actualizar`);

        if (productsToUpdate.length === 0) {
            console.log('✅ No hay productos que necesiten migración');
            return;
        }

        // Actualizar productos agregando el campo 'images' como array vacío
        const updateResult = await Product.updateMany(
            { images: { $exists: false } },
            { $set: { images: [] } }
        );

        console.log(`✅ Migración completada: ${updateResult.modifiedCount} productos actualizados`);

        // Verificar la migración
        const verificationCount = await Product.countDocuments({
            images: { $exists: true }
        });

        console.log(`🔍 Verificación: ${verificationCount} productos ahora tienen el campo 'images'`);

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('📪 Conexión a la base de datos cerrada');
    }
}

/**
 * Migración para actualizar el campo 'avatar' en usuarios si no existe
 */
async function migrateUsers() {
    try {
        console.log('🔄 Iniciando migración de usuarios...');

        const User = require('../src/models/user.model');

        // Conectar a la base de datos si no está conectada
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_CNN);
            console.log('✅ Conectado a la base de datos');
        }

        // Buscar usuarios que no tengan el campo 'avatar'
        const usersToUpdate = await User.find({
            avatar: { $exists: false }
        });

        console.log(`📊 Encontrados ${usersToUpdate.length} usuarios para actualizar`);

        if (usersToUpdate.length === 0) {
            console.log('✅ No hay usuarios que necesiten migración');
            return;
        }

        // Actualizar usuarios agregando el campo 'avatar' como null
        const updateResult = await User.updateMany(
            { avatar: { $exists: false } },
            { $set: { avatar: null } }
        );

        console.log(`✅ Migración de usuarios completada: ${updateResult.modifiedCount} usuarios actualizados`);

    } catch (error) {
        console.error('❌ Error durante la migración de usuarios:', error);
    }
}

/**
 * Ejecutar todas las migraciones
 */
async function runMigrations() {
    console.log('🚀 Iniciando migraciones del sistema de uploads...\n');
    
    await migrateProducts();
    console.log('');
    await migrateUsers();
    
    console.log('\n🎉 Migraciones completadas exitosamente!');
    process.exit(0);
}

// Ejecutar migraciones si este archivo es ejecutado directamente
if (require.main === module) {
    runMigrations();
}

module.exports = {
    migrateProducts,
    migrateUsers,
    runMigrations
};
