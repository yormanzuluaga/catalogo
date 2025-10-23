# Sistema de Imágenes para Productos

## 📋 Descripción General
El sistema de productos ahora incluye manejo completo de imágenes usando AWS S3. Permite subir, actualizar y eliminar imágenes tanto al crear como al modificar productos.

## 🖼️ Estructura de Imágenes

### Tipos de Imágenes Soportadas
1. **Imagen Principal (`img`)**: Una sola imagen que representa el producto
2. **Imágenes Adicionales (`images`)**: Array de imágenes adicionales del producto

### Formatos y Restricciones
- **Formatos**: JPEG (.jpg, .jpeg), PNG (.png), WEBP (.webp)
- **Tamaño máximo**: 5MB por imagen (configurable en S3Service)
- **Cantidad**: Sin límite específico para imágenes adicionales

## 🚀 Endpoints Disponibles

### 1. Crear Producto con Imágenes
```http
POST /api/products
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Body (form-data):
- name: "Nombre del Producto" (requerido)
- description: "Descripción del producto"
- price: 50000 (requerido)
- category: "category_id" (requerido)
- commission: 0.15
- points: 10
- stock: 100
- img: [archivo_imagen_principal] (opcional)
- images: [archivo1, archivo2, archivo3] (opcional)
```

### 2. Actualizar Producto con Imágenes
```http
PUT /api/products/{product_id}
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Body (form-data):
- name: "Nuevo nombre" (opcional)
- description: "Nueva descripción" (opcional)
- price: 60000 (opcional)
- img: [nueva_imagen_principal] (opcional) - Reemplaza la existente
- images: [nuevas_imagenes] (opcional) - Reemplaza todas las existentes
```

### 3. Agregar Imágenes a Producto Existente
```http
POST /api/products/images/{product_id}
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Body (form-data):
- img: [imagen_principal] (opcional) - Reemplaza la imagen principal
- images: [imagen1, imagen2] (opcional) - Se agregan a las existentes
```

### 4. Eliminar Imagen Específica
```http
DELETE /api/products/images/{product_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "imageUrl": "https://s3.amazonaws.com/bucket/products/image.jpg",
  "type": "main" // o "additional"
}
```

### 5. Eliminar Producto (y sus imágenes)
```http
DELETE /api/products/{product_id}
Authorization: Bearer {jwt_token}
```

## 💻 Ejemplos de Uso

### Ejemplo 1: Crear producto con imagen principal
```javascript
const formData = new FormData();
formData.append('name', 'Vestido Elegante');
formData.append('description', 'Vestido para ocasiones especiales');
formData.append('price', '75000');
formData.append('category', 'category_id');
formData.append('commission', '0.15');
formData.append('img', imageFile); // File object

fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### Ejemplo 2: Crear producto con múltiples imágenes
```javascript
const formData = new FormData();
formData.append('name', 'Conjunto Deportivo');
formData.append('description', 'Conjunto completo para ejercicio');
formData.append('price', '120000');
formData.append('category', 'category_id');
formData.append('img', mainImage); // Imagen principal

// Múltiples imágenes adicionales
additionalImages.forEach(image => {
  formData.append('images', image);
});

fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### Ejemplo 3: Agregar imágenes a producto existente
```javascript
const formData = new FormData();
formData.append('images', newImage1);
formData.append('images', newImage2);

fetch('/api/products/images/product_id', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### Ejemplo 4: Eliminar imagen específica
```javascript
fetch('/api/products/images/product_id', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageUrl: 'https://s3.amazonaws.com/bucket/products/image.jpg',
    type: 'additional'
  })
});
```

## 📝 Respuestas del API

### Éxito - Crear Producto (201)
```json
{
  "msg": "Producto creado exitosamente",
  "product": {
    "_id": "product_id",
    "name": "Vestido Elegante",
    "description": "Vestido para ocasiones especiales",
    "price": 75000,
    "img": "https://s3.amazonaws.com/bucket/products/main-image.jpg",
    "images": [
      "https://s3.amazonaws.com/bucket/products/image1.jpg",
      "https://s3.amazonaws.com/bucket/products/image2.jpg"
    ],
    "user": {
      "_id": "user_id",
      "firstName": "Nombre Usuario"
    },
    "category": {
      "_id": "category_id",
      "name": "Vestidos"
    }
  }
}
```

### Error - Imagen inválida (400)
```json
{
  "msg": "Error al subir la imagen principal",
  "error": "Tipo de archivo no válido"
}
```

### Error - Producto no encontrado (404)
```json
{
  "msg": "Producto no encontrado"
}
```

## ⚙️ Características Técnicas

### Almacenamiento en S3
- **Bucket**: Configurado en variables de entorno
- **Carpeta**: `products/` para organización
- **URLs**: Públicas para acceso de lectura
- **Eliminación**: Automática al actualizar o eliminar producto

### Validaciones
- **Autenticación**: JWT requerido para todas las operaciones
- **Permisos**: Solo el usuario propietario puede modificar (excepto admins)
- **Archivos**: Validación de tipo y tamaño en el servicio S3
- **IDs**: Validación de MongoDB ObjectId

### Manejo de Errores
- **Rollback**: Si falla la subida de múltiples imágenes, se limpian las exitosas
- **Logs**: Errores de S3 se registran en consola
- **Respuestas**: Mensajes descriptivos para cada tipo de error

### Rendimiento
- **Operaciones asíncronas**: Upload/delete no bloquean la respuesta
- **Populate selectivo**: Solo campos necesarios en consultas
- **Eliminación suave**: Productos marcados como inactivos, no eliminados

## 🔧 Configuración Requerida

### Variables de Entorno (.env)
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=catalogo-360
```

### Estructura de Carpetas en S3
```
catalogo-360/
├── products/
│   ├── main-images/
│   └── additional-images/
├── users/
└── temp/
```

## 🛡️ Seguridad

- **Autenticación**: JWT obligatorio
- **Autorización**: Solo propietarios y admins
- **Validación**: Tipos de archivo estrictos
- **Sanitización**: Nombres de archivo seguros
- **CORS**: Configurado para el dominio de la aplicación

Este sistema proporciona una gestión completa y segura de imágenes para el catálogo de productos, integrado con AWS S3 para un almacenamiento escalable y confiable.
