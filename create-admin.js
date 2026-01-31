// Script para crear un usuario administrador inicial
// Ejecutar con: node create-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conexión a la base de datos
const dbConfig = require('./src/database/config');

const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    countryCode: String,
    mobile: String,
    avatar: String,
    rol: String,
    estado: Boolean,
    google: Boolean
});

const User = mongoose.model('User', UserSchema);

async function createAdmin() {
    try {
        // Conectar a la base de datos
        await dbConfig.dbConnection();
        console.log('✅ Conectado a la base de datos');

        // Datos del administrador
        const adminData = {
            firstName: 'Admin',
            lastName: 'Principal',
            email: 'admin@admin.com',
            password: 'admin123',
            countryCode: '+57',
            mobile: '3001234567',
            rol: 'ADMIN_ROLE',
            estado: true,
            google: false
        };

        // Verificar si ya existe un admin con ese email
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log('⚠️  Ya existe un usuario con el email:', adminData.email);
            console.log('Usuario existente:', {
                nombre: `${existingAdmin.firstName} ${existingAdmin.lastName}`,
                email: existingAdmin.email,
                rol: existingAdmin.rol
            });

            // Preguntar si desea actualizar el rol
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            readline.question('¿Deseas cambiar el rol a ADMIN_ROLE? (s/n): ', async (answer) => {
                if (answer.toLowerCase() === 's') {
                    existingAdmin.rol = 'ADMIN_ROLE';
                    await existingAdmin.save();
                    console.log('✅ Rol actualizado a ADMIN_ROLE');
                }
                readline.close();
                process.exit(0);
            });
            return;
        }

        // Encriptar contraseña
        const salt = bcrypt.genSaltSync(10);
        adminData.password = bcrypt.hashSync(adminData.password, salt);

        // Crear el usuario administrador
        const admin = new User(adminData);
        await admin.save();

        console.log('\n✅ Usuario administrador creado exitosamente!');
        console.log('\n📋 Credenciales de acceso:');
        console.log('==================================');
        console.log('Email:', adminData.email);
        console.log('Password: admin123');
        console.log('==================================');
        console.log('\n🌐 Accede al panel en: http://localhost:3000/admin/login.html');
        console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear el administrador:', error);
        process.exit(1);
    }
}

createAdmin();
