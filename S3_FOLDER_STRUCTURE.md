# 🗂️ Estructura de Carpetas en S3 Bucket

## 📋 Organización del Bucket

Tu bucket S3 ahora está organizado con carpetas específicas para diferentes tipos de contenido:

```
catalogo-360/
├── categories/              # Imágenes de categorías del catálogo
│   ├── uuid1.jpg           # Imagen de categoría 1
│   ├── uuid2.png           # Imagen de categoría 2
│   └── uuid3.webp          # Imagen de categoría 3
├── products/               # Imágenes de productos
│   ├── uuid4.jpg           # Imagen principal de producto
│   ├── uuid5.png           # Imagen adicional de producto
│   └── uuid6.webp          # Otra imagen de producto
├── users/                  # Avatares de usuarios (futuro)
│   └── uuid7.jpg
└── temp/                   # Archivos temporales (futuro)
    └── temp_file.jpg
```

## 🎯 Carpetas Implementadas

### 1. **`categories/`** - Imágenes de Categorías
- **Propósito**: Almacenar imágenes de las categorías del catálogo
- **Tipos**: Imágenes principales de cada categoría
- **Formatos**: JPEG, PNG, GIF, WEBP
- **Tamaño máximo**: 5MB por imagen

**Endpoints que usan esta carpeta:**
```http
POST   /api/category          # Crear categoría con imagen
PUT    /api/category/:id      # Actualizar categoría e imagen
POST   /api/category/image/:id # Actualizar solo imagen
DELETE /api/category/image/:id # Eliminar imagen
```

### 2. **`products/`** - Imágenes de Productos
- **Propósito**: Almacenar todas las imágenes de productos
- **Tipos**: Imagen principal + imágenes adicionales
- **Formatos**: JPEG, PNG, GIF, WEBP
- **Tamaño máximo**: 5MB por imagen
- **Cantidad**: Sin límite de imágenes adicionales

**Endpoints que usan esta carpeta:**
```http
POST   /api/products             # Crear producto con imágenes
PUT    /api/products/:id         # Actualizar producto e imágenes
POST   /api/products/images/:id  # Agregar más imágenes
DELETE /api/products/images/:id  # Eliminar imagen específica
```

## 🔧 Configuración Técnica

### **S3Service Mejorado**
Se agregó el método `uploadFileFromExpressUpload()` que:
- ✅ Maneja archivos de express-fileupload directamente
- ✅ Valida tipos de archivo automáticamente
- ✅ Valida tamaños de archivo
- ✅ Organiza archivos en carpetas específicas
- ✅ Genera nombres únicos con UUID

### **Naming Convention**
- **Formato**: `{carpeta}/{uuid}.{extension}`
- **Ejemplo**: `categories/550e8400-e29b-41d4-a716-446655440000.jpg`
- **Beneficio**: Evita conflictos de nombres y organización clara

## 📊 Uso por Controlador

### **Category Controller**
```javascript
// Crear categoría con imagen
const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'categories');

// Actualizar imagen
const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'categories');

// Eliminar imagen
await s3Service.deleteFile(category.img);
```

### **Products Controller**
```javascript
// Imagen principal
const imageUrl = await s3Service.uploadFileFromExpressUpload(req.files.img, 'products');

// Múltiples imágenes
for (const image of images) {
    const imageUrl = await s3Service.uploadFileFromExpressUpload(image, 'products');
    imageUrls.push(imageUrl);
}
```

## 🚀 Ejemplos de Uso

### **Crear Categoría con Imagen**
```http
POST /api/category
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

Form data:
- name: "Vestidos"
- number: 1
- description: "Categoría de vestidos elegantes"
- img: [archivo_imagen.jpg]
```

**Resultado en S3:**
- URL: `https://catalogo-360.s3.us-east-2.amazonaws.com/categories/uuid.jpg`
- Carpeta: `categories/`

### **Crear Producto con Múltiples Imágenes**
```http
POST /api/products
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}

Form data:
- name: "Vestido Elegante"
- category: "category_id"
- price: 75000
- img: [imagen_principal.jpg]
- images: [imagen1.jpg, imagen2.jpg, imagen3.jpg]
```

**Resultado en S3:**
- Imagen principal: `https://catalogo-360.s3.us-east-2.amazonaws.com/products/uuid1.jpg`
- Adicionales: `https://catalogo-360.s3.us-east-2.amazonaws.com/products/uuid2.jpg`
- Todas en carpeta: `products/`

## 🛡️ Validaciones Implementadas

### **Tipos de Archivo**
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ GIF (.gif)
- ✅ WEBP (.webp)
- ❌ Otros formatos rechazados

### **Tamaños**
- **Imágenes**: Máximo 5MB
- **Videos** (futuro): Máximo 50MB

### **Seguridad**
- **ACL**: `public-read` para acceso público a imágenes
- **Validación**: Tipos y tamaños estrictos
- **Limpieza**: Eliminación automática en fallos
- **Nombres únicos**: UUID para evitar conflictos

## 📈 Beneficios de esta Estructura

1. **Organización Clara**: Fácil navegación en el bucket
2. **Escalabilidad**: Estructura preparada para crecer
3. **Mantenimiento**: Fácil limpieza por tipo de contenido
4. **Performance**: Mejor gestión de archivos
5. **Backup**: Posibilidad de backup selectivo por carpeta
6. **Análisis**: Métricas separadas por tipo de contenido

## 🔮 Carpetas Futuras (Preparadas)

- **`users/`**: Avatares de usuarios
- **`videos/`**: Videos de productos
- **`documents/`**: Documentos y PDFs
- **`temp/`**: Archivos temporales
- **`banners/`**: Imágenes promocionales

Esta estructura proporciona una base sólida y escalable para el manejo de archivos multimedia en tu aplicación de catálogo.
