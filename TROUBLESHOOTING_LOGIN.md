# 🔧 Guía de Solución de Problemas - Login

## Pasos para diagnosticar errores de inicio de sesión

### 1. Verificar que el servidor esté corriendo
```bash
npm run dev
```
El servidor debería estar en `http://localhost:3000`

### 2. Abrir la consola del navegador
- Chrome/Edge: F12 o Clic derecho > Inspeccionar > Console
- Firefox: F12 o Clic derecho > Inspeccionar elemento > Consola
- Safari: Cmd+Option+C

### 3. Intentar el login y revisar errores

#### Errores comunes y soluciones:

**❌ Error: "Failed to fetch" o "Network request failed"**
- **Causa**: El servidor no está corriendo o usa un puerto diferente
- **Solución**: Verifica que `npm run dev` esté ejecutándose y el puerto sea 3000

**❌ Error: "CORS policy"**
- **Causa**: Problema de CORS
- **Solución**: Ya está configurado en src/app.js línea 30, pero verifica que el servidor esté en localhost:3000

**❌ Error 400: "Usuario / Password no son correcto"**
- **Causa**: Credenciales incorrectas
- **Solución**: Usa las credenciales creadas:
  - Email: `admin@admin.com`
  - Password: `admin123`

**❌ Error: "No tienes permisos de administrador"**
- **Causa**: El usuario no tiene rol ADMIN_ROLE
- **Solución**: Ejecuta de nuevo el script create-admin.js

### 4. Verificar que el usuario admin existe

Desde la terminal, ejecuta:
```bash
node create-admin.js
```

Esto creará o verificará el usuario administrador con:
- Email: admin@admin.com
- Password: admin123
- Rol: ADMIN_ROLE

### 5. Probar el endpoint directamente

Abre la consola del navegador (F12) y pega este código:

```javascript
fetch('http://localhost:3000/api/auth/signIn', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
    })
})
.then(response => response.json())
.then(data => console.log('Respuesta:', data))
.catch(error => console.error('Error:', error));
```

### 6. Revisar variables de entorno

Verifica que exista el archivo `.env` con:
```
PORT=3000
MONGODB_CNN=tu_conexion_mongodb
JWT_SECRET=secret
```

### 7. Verificar conexión a MongoDB

El error también puede ser por problemas de conexión a la base de datos. Revisa:
- Que MongoDB esté corriendo (si es local)
- Que la cadena de conexión en `.env` sea correcta
- Que la base de datos tenga la colección de usuarios

### 8. Limpiar localStorage

A veces tokens viejos causan problemas. En la consola del navegador:
```javascript
localStorage.clear();
location.reload();
```

## 📋 Checklist de verificación

- [ ] El servidor está corriendo (npm run dev)
- [ ] MongoDB está conectado
- [ ] El usuario admin existe (ejecutar create-admin.js)
- [ ] Las credenciales son correctas (admin@admin.com / admin123)
- [ ] El navegador puede acceder a localhost:3000
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en la terminal del servidor

## 🆘 Si nada funciona

Comparte en el chat:
1. Los errores exactos de la consola del navegador
2. Los errores de la terminal del servidor
3. Captura de pantalla del error
