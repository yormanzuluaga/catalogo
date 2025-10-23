# Sistema de Categorías y Subcategorías con Imágenes

## 📋 Nueva Estructura de Datos

### Jerarquía Reorganizada
```
Categorías (Categories)
├── Subcategorías (SubCategories)
    └── Productos (Products)
```

**IMPORTANTE**: Los productos ahora se relacionan con **subcategorías**, no directamente con categorías.

## 🏗️ Modelos Actualizados

### 1. **Categoría (Category)**
```javascript
{
  name: String,          // Nombre único
  description: String,   // Descripción
  number: Number,        // Número único
  img: String,          // URL imagen en S3 (carpeta: categories/)
  estado: Boolean,      // Activo/Inactivo
  user: ObjectId        // Usuario creador
}
```

### 2. **Subcategoría (SubCategory)** 🆕
```javascript
{
  name: String,          // Nombre único
  description: String,   // Descripción
  number: Number,        // Número único
  category: ObjectId,    // Referencia a categoría padre
  img: String,          // URL imagen en S3 (carpeta: subcategories/)
  estado: Boolean,      // Activo/Inactivo
  user: ObjectId        // Usuario creador
}
```

### 3. **Producto (Product)** ✅ ACTUALIZADO
```javascript
{
  name: String,
  subCategory: ObjectId,  // ✅ CAMBIO: Ahora referencia subcategoría
  // category: ObjectId,  // ❌ REMOVIDO: Ya no se usa
  img: String,           // Imagen principal (carpeta: products/)
  images: [String],      // Imágenes adicionales (carpeta: products/)
  // ... otros campos
}
```

## 🗂️ Organización en S3 Bucket

```
catalogo-360/
├── categories/         # Imágenes de categorías principales
│   ├── category-1.jpg
│   └── category-2.jpg
├── subcategories/      # Imágenes de subcategorías
│   ├── subcategory-1.jpg
│   └── subcategory-2.jpg
└── products/           # Imágenes de productos
    ├── product-main-1.jpg
    ├── product-add-1.jpg
    └── product-add-2.jpg
```

## 🛠️ Endpoints Disponibles

### **Categorías** - `/api/category`
- `GET /` - Obtener todas las categorías
- `GET /:id` - Obtener categoría específica
- `POST /` - Crear categoría (con imagen opcional)
- `PUT /:id` - Actualizar categoría (con imagen opcional)
- `DELETE /:id` - Eliminar categoría

### **Subcategorías** - `/api/subcategory` 🆕
- `GET /` - Obtener todas las subcategorías
- `GET /category/:categoryId` - Obtener subcategorías de una categoría
- `GET /:id` - Obtener subcategoría específica
- `POST /` - Crear subcategoría (con imagen opcional)
- `PUT /:id` - Actualizar subcategoría (con imagen opcional)
- `DELETE /:id` - Eliminar subcategoría
- `PUT /image/:id` - Actualizar solo imagen de subcategoría
- `DELETE /image/:id` - Eliminar solo imagen de subcategoría

### **Productos** - `/api/products` ✅ ACTUALIZADO
- `GET /:id` - Obtener productos de una **subcategoría**
- `GET /product/:id` - Obtener producto específico
- `POST /` - Crear producto (requiere `subCategory`, con imágenes opcionales)
- `PUT /:id` - Actualizar producto (con imágenes opcionales)
- `DELETE /:id` - Eliminar producto
- `POST /images/:id` - Agregar imágenes a producto existente
- `DELETE /images/:id` - Eliminar imagen específica

## 📄 Ejemplos de Uso

### 1. Crear Categoría con Imagen
```http
POST /api/category
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- name: "Ropa Femenina"
- description: "Categoría principal de ropa para mujeres"
- number: 1
- img: [archivo_imagen.jpg]
```

### 2. Crear Subcategoría con Imagen
```http
POST /api/subcategory
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- name: "Vestidos"
- description: "Vestidos para toda ocasión"
- number: 101
- category: "category_id_de_ropa_femenina"
- img: [archivo_imagen.jpg]
```

### 3. Crear Producto (Nuevo flujo)
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- name: "Vestido Elegante"
- description: "Vestido para ocasiones especiales"
- price: 150000
- subCategory: "subcategory_id_de_vestidos"  ← CAMBIO IMPORTANTE
- img: [imagen_principal.jpg]
- images: [imagen1.jpg, imagen2.jpg]
```

### 4. Obtener Subcategorías de una Categoría
```http
GET /api/subcategory/category/{category_id}
```

### 5. Obtener Productos de una Subcategoría
```http
GET /api/products/{subcategory_id}
```

## 🔄 Flujo de Trabajo Completo

### Crear Estructura Completa:
1. **Crear Categoría Principal**
   ```javascript
   POST /api/category
   { name: "Ropa Femenina", description: "...", number: 1 }
   ```

2. **Crear Subcategorías**
   ```javascript
   POST /api/subcategory
   { name: "Vestidos", category: "category_id", number: 101 }
   
   POST /api/subcategory
   { name: "Blusas", category: "category_id", number: 102 }
   ```

3. **Crear Productos**
   ```javascript
   POST /api/products
   { name: "Vestido Elegante", subCategory: "subcategory_vestidos_id" }
   
   POST /api/products
   { name: "Blusa Casual", subCategory: "subcategory_blusas_id" }
   ```

## 📊 Consultas con Populate

### Producto con Categoría y Subcategoría:
```javascript
const product = await Product.findById(id)
  .populate('user', 'firstName')
  .populate({
    path: 'subCategory',
    select: 'name category',
    populate: {
      path: 'category',
      select: 'name'
    }
  });

// Resultado:
{
  name: "Vestido Elegante",
  subCategory: {
    name: "Vestidos",
    category: {
      name: "Ropa Femenina"
    }
  }
}
```

## ⚠️ Migraciones Necesarias

### Para datos existentes:
1. **Crear subcategorías** basadas en las categorías actuales
2. **Migrar productos** para que referencien subcategorías
3. **Actualizar frontend** para usar nueva estructura

## 🔐 Permisos y Validaciones

- **Crear/Editar**: Solo `ADMIN_ROLE`
- **Ver**: Público (productos) / Autenticado (gestión)
- **Validaciones**: Nombres únicos, números únicos, referencias válidas
- **Imágenes**: Validación de tipo y tamaño en S3Service

## 🎯 Beneficios de la Nueva Estructura

1. **Mejor Organización**: Jerarquía más clara y escalable
2. **Flexibilidad**: Fácil agregar nuevas subcategorías
3. **Rendimiento**: Consultas más eficientes por subcategoría
4. **Mantenimiento**: Separación clara de responsabilidades
5. **SEO**: URLs más descriptivas con categoría/subcategoría/producto

Esta estructura proporciona una base sólida y escalable para el catálogo de productos.
