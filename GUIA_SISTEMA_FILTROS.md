# 🏁 Sistema de Filtros por Categoría - Guía Completa

## 📋 Descripción

El sistema de filtros permite organizar productos por características específicas de cada categoría. Por ejemplo:

- **Categoría: Maquillaje** → Filtros: Labiales, Sombras, Bases, Rubor
- **Categoría: Ropa** → Filtros: Casual, Formal, Deportivo
- **Categoría: Electrónica** → Filtros: Smartphones, Tablets, Laptops

## 🎯 Características Principales

✅ **Filtros relacionados con categorías** - Cada filtro pertenece a una categoría específica  
✅ **Gestión completa CRUD** - Crear, leer, actualizar y eliminar filtros  
✅ **Selección visual** - Botones con colores personalizados para cada filtro  
✅ **Icono personalizable** - Agrega emojis o iconos a cada filtro  
✅ **Orden configurable** - Define el orden de aparición de los filtros  
✅ **Integración automática** - Los filtros aparecen automáticamente en el formulario de productos

---

## 📍 Acceso al Módulo de Filtros

### Paso 1: Navegar al Panel de Filtros
1. Inicia sesión en el panel de administración
2. En el menú lateral, haz clic en **🏁 Filtros**
3. Verás la lista de todos los filtros configurados

---

## ➕ Crear un Nuevo Filtro

### Paso 1: Abrir el Formulario
1. En la página de Filtros, haz clic en **"+ Nuevo Filtro"**

### Paso 2: Completar los Datos

**Campos Obligatorios:**

- **Nombre del Filtro** ⭐
  - Ejemplo: "Labiales", "Sombras", "Bases"
  - Debe ser descriptivo y único dentro de la categoría

- **Categoría** ⭐
  - Selecciona la categoría a la que pertenece este filtro
  - Solo los productos de esta categoría mostrarán este filtro

**Campos Opcionales:**

- **Descripción**
  - Información adicional sobre el filtro
  
- **Color (Hex)**
  - Color para identificar visualmente el filtro
  - Usa el selector de color o escribe el código (ej: #FF5733)
  - Default: #000000 (negro)

- **Icono**
  - Emoji o símbolo para el filtro
  - Ejemplos: 💄, 👄, ✨, 🎨

- **Orden**
  - Número para definir la posición (menor = más prioritario)
  - Default: 0

- **Estado**
  - Activo: El filtro está disponible
  - Inactivo: El filtro está oculto

### Paso 3: Guardar
- Haz clic en **"Guardar Filtro"**
- Verás el filtro en la lista

---

## ✏️ Editar un Filtro

1. En la tabla de filtros, haz clic en el botón **"Editar"** del filtro deseado
2. Modifica los campos necesarios
3. Haz clic en **"Guardar Filtro"**

---

## 🗑️ Eliminar un Filtro

1. Haz clic en el botón **"Eliminar"** del filtro
2. Confirma la acción
3. El filtro se desactivará (soft delete)

**Nota:** Si hay productos usando el filtro, no se podrá eliminar permanentemente.

---

## 📦 Usar Filtros en Productos

### Flujo Automático:

1. **Crea un Producto**
   - Ve a **📦 Productos** → **"+ Nuevo Producto"**

2. **Selecciona una Categoría**
   - Elige la categoría del producto
   - Los filtros de esa categoría se cargarán automáticamente

3. **Selecciona los Filtros**
   - Verás botones de colores con los filtros disponibles
   - Haz clic en los filtros que aplican al producto
   - Los filtros seleccionados cambiarán de color

4. **Filtros Personalizados (Opcional)**
   - Si necesitas agregar filtros adicionales que no están en el sistema
   - Escríbelos en el campo **"Filtros Personalizados"**
   - Separa con comas: `nuevo, oferta, exclusivo`

5. **Guardar el Producto**
   - El producto tendrá tanto los filtros del sistema como los personalizados

---

## 🎨 Ejemplo Práctico

### Caso: Tienda de Maquillaje

#### 1. Crear Filtros para Categoría "Maquillaje"

```
Filtro 1:
- Nombre: Labiales
- Categoría: Maquillaje
- Color: #FF1744
- Icono: 💄
- Orden: 1

Filtro 2:
- Nombre: Sombras
- Categoría: Maquillaje
- Color: #9C27B0
- Icono: 👁️
- Orden: 2

Filtro 3:
- Nombre: Bases
- Categoría: Maquillaje
- Color: #FFC107
- Icono: ✨
- Orden: 3
```

#### 2. Crear un Producto

```
Producto: Labial Rojo Intenso
Categoría: Maquillaje
Marca: MAC

Al seleccionar "Maquillaje", aparecen los filtros:
[ 💄 Labiales ] [ 👁️ Sombras ] [ ✨ Bases ]

Haces clic en "💄 Labiales" (se marca en color rojo)

Filtros finales del producto: ["Labiales"]
```

---

## 🔍 Filtrar en la Tabla de Filtros

En la página de gestión de filtros:

1. Usa el selector **"Todas las categorías"**
2. Selecciona una categoría específica
3. La tabla mostrará solo los filtros de esa categoría

---

## 📊 API Endpoints Disponibles

### Para Desarrolladores:

```javascript
// Obtener todos los filtros
GET /api/filters

// Obtener filtros por categoría
GET /api/filters/category/:categoryId

// Obtener un filtro específico
GET /api/filters/:id

// Crear un filtro
POST /api/filters
Body: {
  name: "Labiales",
  category: "categoryId",
  description: "Productos para labios",
  color: "#FF1744",
  icon: "💄",
  order: 1,
  isActive: true
}

// Actualizar un filtro
PUT /api/filters/:id
Body: { ...campos a actualizar }

// Eliminar (desactivar) un filtro
DELETE /api/filters/:id

// Reactivar un filtro
PATCH /api/filters/:id/activate

// Obtener estadísticas
GET /api/filters/stats
```

---

## 🎯 Estructura de Datos

### Modelo de Filtro:

```javascript
{
  _id: "filterId",
  name: "Labiales",
  slug: "labiales",
  category: {
    _id: "categoryId",
    name: "Maquillaje"
  },
  description: "Productos para labios",
  icon: "💄",
  color: "#FF1744",
  order: 1,
  isActive: true,
  user: "userId",
  createdAt: "2026-01-27T...",
  updatedAt: "2026-01-27T..."
}
```

### Producto con Filtros:

```javascript
{
  name: "Labial Rojo Intenso",
  category: "categoryId",
  filters: ["Labiales", "Mate", "Larga Duración"],
  // Otros campos...
}
```

---

## ⚙️ Validaciones del Sistema

✅ **Nombre único por categoría** - No puede haber dos filtros con el mismo nombre en una categoría  
✅ **Categoría obligatoria** - Todo filtro debe pertenecer a una categoría  
✅ **Color válido** - El color debe ser un código hexadecimal válido (#RRGGBB)  
✅ **Orden numérico** - El orden debe ser un número entero positivo  
✅ **Slug automático** - Se genera automáticamente a partir del nombre

---

## 🔧 Solución de Problemas

### "No se pueden eliminar filtros"
**Causa:** Hay productos usando ese filtro  
**Solución:** Primero elimina o edita los productos que usan el filtro

### "No aparecen los filtros en el formulario de productos"
**Causa:** La categoría no tiene filtros configurados  
**Solución:** Ve a **🏁 Filtros** y crea filtros para esa categoría

### "Los filtros seleccionados no se guardan"
**Causa:** No se seleccionó ningún filtro  
**Solución:** Haz clic en los botones de filtros antes de guardar

---

## 📈 Ventajas del Sistema

1. **Organización Mejorada**
   - Los productos están mejor categorizados
   - Fácil búsqueda y filtrado

2. **Flexibilidad**
   - Filtros del sistema + filtros personalizados
   - Cada categoría tiene sus propios filtros

3. **Experiencia de Usuario**
   - Interfaz visual intuitiva
   - Selección con un solo clic
   - Colores e iconos personalizados

4. **Escalabilidad**
   - Agrega tantos filtros como necesites
   - Sin límite de filtros por categoría
   - Gestión independiente por categoría

---

## 📝 Mejores Prácticas

1. **Nombres Claros**
   - Usa nombres descriptivos y cortos
   - Evita duplicados

2. **Colores Distintivos**
   - Usa colores diferentes para cada filtro
   - Facilita la identificación visual

3. **Orden Lógico**
   - Los filtros más importantes con orden menor
   - Ordena por frecuencia de uso

4. **Iconos Relevantes**
   - Usa emojis relacionados con el filtro
   - Ayuda a la identificación rápida

5. **Mantenimiento**
   - Revisa periódicamente los filtros activos
   - Desactiva los que ya no se usan

---

## 🚀 Próximas Mejoras (Futuro)

- Filtros anidados (subcategorías de filtros)
- Filtros combinables con operadores AND/OR
- Importación masiva de filtros
- Estadísticas de uso por filtro
- Traducción de filtros multi-idioma

---

## 📞 Soporte

Para dudas o problemas:
1. Revisa esta guía
2. Verifica la consola del navegador (F12)
3. Contacta al equipo de desarrollo

---

**Última actualización:** Enero 27, 2026  
**Versión:** 1.0  
**Módulo:** Sistema de Filtros por Categoría
