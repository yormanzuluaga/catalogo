# Panel de Administración - Catálogo

Panel de administración web completo para gestionar el catálogo de productos, categorías, marcas, banners, transacciones y órdenes.

## 🚀 Características

- ✅ **Autenticación segura** - Solo administradores pueden acceder
- 📊 **Dashboard** - Vista general con estadísticas
- 📁 **Gestión de Categorías** - CRUD completo de categorías
- 📂 **Gestión de Subcategorías** - CRUD completo de subcategorías enlazadas a categorías
- 🏷️ **Gestión de Marcas** - CRUD completo de marcas
- 📦 **Gestión de Productos** - CRUD completo con relaciones a categorías, subcategorías y marcas
- 🖼️ **Gestión de Banners** - CRUD completo con upload de imágenes
- 💳 **Visualización de Transacciones** - Ver todas las transacciones realizadas
- 🛒 **Gestión de Órdenes** - Ver y administrar el estado de las órdenes

## 📋 Requisitos Previos

1. Tener el servidor backend ejecutándose
2. Tener una cuenta de usuario con rol `ADMIN_ROLE`

## 🔧 Instalación

El panel de administración ya está configurado en tu proyecto. Solo necesitas:

1. Asegurarte de que el servidor esté corriendo:
```bash
npm run dev
```

2. Acceder al panel de administración en:
```
http://localhost:3000/admin/login.html
```

## 👤 Primer Acceso

Para acceder por primera vez, necesitas crear un usuario administrador en la base de datos:

1. Crea un usuario desde el endpoint de registro
2. Modifica el rol del usuario en la base de datos a `ADMIN_ROLE`
3. Inicia sesión en `http://localhost:3000/admin/login.html`

Alternativamente, puedes crear un usuario administrador usando MongoDB Compass o la consola de MongoDB.

## 📱 Páginas Disponibles

- **Login** (`/admin/login.html`) - Página de inicio de sesión
- **Dashboard** (`/admin/index.html`) - Panel principal con estadísticas
- **Categorías** (`/admin/categories.html`) - Gestión de categorías
- **Subcategorías** (`/admin/subcategories.html`) - Gestión de subcategorías
- **Marcas** (`/admin/brands.html`) - Gestión de marcas
- **Productos** (`/admin/products.html`) - Gestión de productos
- **Banners** (`/admin/banners.html`) - Gestión de banners promocionales
- **Transacciones** (`/admin/transactions.html`) - Visualización de transacciones
- **Órdenes** (`/admin/orders.html`) - Gestión de órdenes

## 🎨 Funcionalidades por Módulo

### Categorías
- Crear nuevas categorías
- Editar categorías existentes
- Eliminar categorías
- Activar/Desactivar categorías

### Subcategorías
- Crear subcategorías enlazadas a categorías
- Editar subcategorías
- Eliminar subcategorías
- Activar/Desactivar subcategorías

### Marcas
- Crear nuevas marcas
- Editar marcas existentes
- Eliminar marcas
- Activar/Desactivar marcas

### Productos
- Crear productos con:
  - Nombre y descripción
  - Categoría y subcategoría
  - Marca
  - Precio y stock
  - Descuentos
  - Estado activo/inactivo
- Editar productos existentes
- Eliminar productos
- Ver relaciones con categorías, subcategorías y marcas

### Banners
- Crear banners promocionales
- Subir imágenes para banners
- Ordenar banners
- Activar/Desactivar banners
- Eliminar banners

### Transacciones
- Ver todas las transacciones
- Ver detalles de cada transacción
- Filtrar por estado
- Ver información del cliente

### Órdenes
- Ver todas las órdenes
- Ver detalles de cada orden (productos, dirección, etc.)
- Actualizar estado de órdenes:
  - Pendiente
  - En Proceso
  - Enviado
  - Entregado
  - Cancelado

## 🔐 Seguridad

- Todas las peticiones requieren autenticación con JWT
- Solo usuarios con rol `ADMIN_ROLE` pueden acceder
- El token se almacena de forma segura en localStorage
- Sesión expira según configuración del backend

## 🛠️ Tecnologías Utilizadas

- **HTML5** - Estructura
- **CSS3** - Estilos responsive
- **JavaScript (Vanilla)** - Lógica del cliente
- **Fetch API** - Llamadas a la API REST
- **LocalStorage** - Almacenamiento de sesión

## 📝 Notas Importantes

1. **URL de la API**: Por defecto apunta a `http://localhost:3000/api`. Si tu servidor corre en otro puerto, modifica la variable `API_URL` en `/admin/js/api.js`

2. **Rutas de la API**: Asegúrate de que las siguientes rutas estén disponibles en tu backend:
   - `/api/auth/signIn`
   - `/api/category`
   - `/api/subcategory`
   - `/api/brands`
   - `/api/products`
   - `/api/banners`
   - `/api/transactions`
   - `/api/orden`

3. **Permisos**: Algunas rutas pueden requerir validación de roles adicional en el backend.

## 🐛 Solución de Problemas

### No puedo iniciar sesión
- Verifica que tu usuario tenga el rol `ADMIN_ROLE`
- Verifica que el servidor backend esté corriendo
- Revisa la consola del navegador para ver errores

### Las imágenes no se cargan
- Verifica que el endpoint de uploads esté configurado correctamente
- Verifica que tengas permisos de escritura en la carpeta de uploads

### Error al crear/editar elementos
- Verifica que todos los campos requeridos estén completos
- Revisa la consola del navegador para ver el error específico
- Verifica que el token JWT sea válido

## 📞 Soporte

Para problemas o sugerencias, revisa los logs del servidor y la consola del navegador para obtener más información sobre los errores.

---

**Desarrollado para el sistema de catálogo de productos**
