# Sistema Híbrido: Categorías y Subcategorías

## 🔄 Flexibilidad Total en la Clasificación de Productos

Este sistema permite que coexistan productos con **categorías directas** y productos con **subcategorías**, proporcionando máxima flexibilidad para diferentes tipos de productos y facilitando migraciones graduales.

## 🏗️ Estructura del Modelo Producto

```javascript
{
  name: "Producto",
  // OPCIÓN 1: Categoría directa (productos simples o legacy)
  category: ObjectId,     // Referencia directa a Category
  
  // OPCIÓN 2: Subcategoría (productos con jerarquía)
  subCategory: ObjectId,  // Referencia a SubCategory → Category
  
  // Restricciones:
  // - Debe tener category O subCategory (no ambos)
  // - Al menos uno debe estar presente
}
```

## ✅ Validaciones Automáticas

### **Pre-validación en el Modelo:**
- ✅ **Obligatorio**: Al menos uno (category O subCategory)
- ✅ **Exclusivo**: No ambos al mismo tiempo
- ✅ **Error automático**: Si no cumple las reglas

### **Validación en Rutas:**
- ✅ Verifica IDs válidos de MongoDB
- ✅ Valida existencia de categoría/subcategoría
- ✅ Mensajes de error descriptivos

## 🚀 Endpoints Disponibles

### **1. Productos por Subcategoría** (Recomendado)
```http
GET /api/products/subcategory/{subcategory_id}
```
**Uso**: Para productos con estructura jerárquica

### **2. Productos por Categoría Directa**
```http
GET /api/products/category/{category_id}
```
**Uso**: Para productos con categoría simple

### **3. Productos Mixtos** (Todos)
```http
GET /api/products/all/mixed?categoryId={id}&subCategoryId={id}
```
**Uso**: Ver todos los productos, opcionalmente filtrados

### **4. Crear Producto** (Flexible)
```http
POST /api/products
Content-Type: application/json

// OPCIÓN A: Con categoría directa
{
  "name": "Producto Simple",
  "category": "category_id",
  "price": 50000
}

// OPCIÓN B: Con subcategoría
{
  "name": "Producto Jerárquico", 
  "subCategory": "subcategory_id",
  "price": 75000
}
```

### **5. Migrar Producto**
```http
PUT /api/products/migrate/{product_id}
{
  "subCategoryId": "new_subcategory_id"
}
```
**Uso**: Migrar producto de categoría directa a subcategoría

## 📊 Ejemplos de Uso

### **Crear Producto con Categoría Directa**
```javascript
// Para productos simples sin subcategorías
POST /api/products
{
  "name": "Producto Básico",
  "description": "Producto con categoría directa",
  "price": 25000,
  "category": "electronics_category_id",
  "img": "image_file" // opcional
}
```

### **Crear Producto con Subcategoría**
```javascript
// Para productos con estructura jerárquica
POST /api/products
{
  "name": "Vestido Elegante",
  "description": "Vestido para ocasiones especiales",
  "price": 150000,
  "subCategory": "vestidos_subcategory_id",
  "img": "image_file" // opcional
}
```

### **Obtener Productos Mixtos con Filtros**
```javascript
// Todos los productos
GET /api/products/all/mixed

// Solo productos de una categoría específica
GET /api/products/all/mixed?categoryId=electronics_id

// Solo productos de una subcategoría específica  
GET /api/products/all/mixed?subCategoryId=vestidos_id
```

### **Migrar Producto Legacy**
```javascript
// Convertir producto de categoría directa a subcategoría
PUT /api/products/migrate/product_id
{
  "subCategoryId": "nueva_subcategoria_id"
}
```

## 🔍 Respuestas del API

### **Producto con Categoría Directa**
```json
{
  "_id": "product_id",
  "name": "Producto Básico",
  "category": {
    "_id": "category_id",
    "name": "Electrónicos"
  },
  "classificationType": "category",
  "price": 25000
}
```

### **Producto con Subcategoría**
```json
{
  "_id": "product_id", 
  "name": "Vestido Elegante",
  "subCategory": {
    "_id": "subcategory_id",
    "name": "Vestidos",
    "category": {
      "_id": "category_id",
      "name": "Ropa Femenina"
    }
  },
  "classificationType": "subCategory",
  "price": 150000
}
```

### **Lista Mixta de Productos**
```json
{
  "total": 25,
  "products": [
    {
      "name": "Producto Simple",
      "category": { "name": "Electrónicos" },
      "classificationType": "category"
    },
    {
      "name": "Vestido",
      "subCategory": {
        "name": "Vestidos",
        "category": { "name": "Ropa Femenina" }
      },
      "classificationType": "subCategory"
    }
  ]
}
```

## 🎯 Casos de Uso Prácticos

### **1. Migración Gradual**
```javascript
// Paso 1: Productos legacy con categorías directas
{ name: "TV", category: "electronics_id" }

// Paso 2: Crear subcategorías
POST /api/subcategory
{ name: "Televisores", category: "electronics_id" }

// Paso 3: Migrar productos
PUT /api/products/migrate/tv_product_id
{ subCategoryId: "televisores_subcategory_id" }
```

### **2. Productos Simples vs Complejos**
```javascript
// Producto simple (sin subcategorías necesarias)
{ name: "Accesorio USB", category: "accessories_id" }

// Producto complejo (con subcategorías detalladas)  
{ name: "Laptop Gaming", subCategory: "laptops_gaming_subcategory_id" }
```

### **3. E-commerce Flexible**
```javascript
// Categoría principal: Electrónicos
// - Productos directos: Cables, Adaptadores, Pilas
// - Subcategorías: Computadoras, Televisores, Audio
//   - Productos en subcategorías: Laptops, Smart TV, Audífonos
```

## ⚙️ Métodos del Modelo

### **Obtener Categoría Principal**
```javascript
const product = await Product.findById(id);
const category = await product.getCategory();
// Retorna la categoría directa o la categoría padre de la subcategoría
```

### **Determinar Tipo de Clasificación**
```javascript
const type = product.getClassificationType();
// Retorna: 'category', 'subCategory', o 'none'
```

## 🛡️ Validaciones y Errores

### **Errores Comunes**
```javascript
// Error: Sin clasificación
{
  "error": "El producto debe tener una categoría o subcategoría"
}

// Error: Ambas clasificaciones
{
  "error": "El producto no puede tener categoría y subcategoría al mismo tiempo"
}

// Error: ID inválido
{
  "error": "La categoría debe ser un ID válido"
}
```

## 📈 Beneficios del Sistema Híbrido

1. **Flexibilidad**: Productos simples y complejos coexisten
2. **Migración Suave**: Transición gradual sin interrupciones
3. **Compatibilidad**: Código legacy sigue funcionando
4. **Escalabilidad**: Fácil expansión hacia subcategorías
5. **Simplicidad**: Productos simples no necesitan subcategorías
6. **Potencia**: Productos complejos tienen jerarquía completa

Este sistema híbrido proporciona la máxima flexibilidad mientras mantiene la integridad de los datos y facilita tanto el desarrollo como las migraciones futuras.
