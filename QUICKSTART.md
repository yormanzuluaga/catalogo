# 🚀 Guía de Inicio Rápido - Panel de Administración

## Paso 1: Crear Usuario Administrador

Ejecuta el siguiente comando para crear un usuario administrador:

```bash
npm run create-admin
```

Esto creará un usuario con las siguientes credenciales:
- **Email:** admin@admin.com
- **Password:** admin123

## Paso 2: Iniciar el Servidor

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

## Paso 3: Acceder al Panel de Administración

Abre tu navegador y ve a:

```
http://localhost:3000/admin/login.html
```

Ingresa con las credenciales creadas en el Paso 1.

## 🎯 Funcionalidades Disponibles

Una vez dentro, podrás:

### 📊 Dashboard
- Ver estadísticas generales
- Resumen de productos, categorías, marcas y transacciones
- Órdenes y transacciones recientes

### 📁 Categorías
- Crear, editar y eliminar categorías
- Activar/desactivar categorías
- Agregar descripción a cada categoría

### 📂 Subcategorías
- Crear subcategorías enlazadas a categorías
- Editar y eliminar subcategorías
- Activar/desactivar subcategorías

### 🏷️ Marcas
- Gestionar marcas de productos
- Crear, editar y eliminar marcas
- Activar/desactivar marcas

### 📦 Productos
- Crear productos completos con:
  - Nombre y descripción
  - Categoría y subcategoría
  - Marca asociada
  - Precio y stock
  - Descuentos
  - Estado (activo/inactivo)
- Editar productos existentes
- Eliminar productos
- Ver todas las relaciones (categoría, subcategoría, marca)

### 🖼️ Banners
- Crear banners promocionales
- Subir imágenes para banners
- Ordenar banners por prioridad
- Activar/desactivar banners

### 💳 Transacciones
- Ver historial completo de transacciones
- Ver detalles de cada transacción
- Información del cliente y método de pago
- Estado de las transacciones

### 🛒 Órdenes
- Ver todas las órdenes
- Ver detalles completos (productos, dirección, cliente)
- Actualizar estado de órdenes:
  - Pendiente
  - En Proceso
  - Enviado
  - Entregado
  - Cancelado

## 🔧 Configuración Adicional

### Cambiar URL de la API

Si tu servidor corre en un puerto diferente, edita el archivo:
`/public/admin/js/api.js`

Y cambia la línea:
```javascript
const API_URL = 'http://localhost:3000/api';
```

### Cambiar Puerto del Servidor

Edita el archivo `.env` y cambia:
```
PORT=3000
```

## ⚠️ Importante

1. **Seguridad**: Cambia la contraseña del administrador después del primer inicio de sesión
2. **Rol de Usuario**: Solo usuarios con rol `ADMIN_ROLE` pueden acceder al panel
3. **Token JWT**: Asegúrate de tener configurado JWT_SECRET en tu archivo `.env`

## 🐛 Solución de Problemas

### Error: "No tienes permisos de administrador"
- Verifica que tu usuario tenga el rol `ADMIN_ROLE` en la base de datos

### Error: "Error al iniciar sesión"
- Verifica que el servidor esté corriendo
- Verifica que las credenciales sean correctas
- Revisa la consola del navegador para más detalles

### Las imágenes no se cargan
- Verifica la configuración de uploads en el backend
- Asegúrate de tener permisos de escritura en la carpeta de uploads

## 📚 Documentación Completa

Para más información, consulta el archivo `ADMIN_PANEL_README.md`

---

¡Listo! Ahora puedes administrar tu catálogo de forma completa desde el navegador. 🎉
