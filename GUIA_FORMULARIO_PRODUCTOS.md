# Guía de Campos para Formulario de Productos

## Campos Principales del Modelo de Producto

### 📋 Información Básica (Requerido)
- **name** (String) - Nombre del producto (único, requerido)
- **brand** (ObjectId) - Marca del producto (requerido)
- **productType** (Enum) - Tipo: 'simple' o 'variant' (default: 'simple')
- **category** O **subCategory** (ObjectId) - Categoría directa O subcategoría (requerido uno de los dos)
- **description** (String) - Descripción del producto
- **estado** (Boolean) - Estado activo/inactivo (default: true)

### 💰 Precios (Para productos simples)
**simpleProduct.pricing:**
- **costPrice** (Number) - Precio de costo
- **salePrice** (Number) - Precio de venta
- **commission** (Number) - Comisión
- **wholesaleCommission** (Number) - Comisión mayorista
- **specialClientCommission** (Number) - Comisión cliente especial

### 📦 Inventario (Para productos simples)
**simpleProduct:**
- **stock** (Number) - Stock disponible
- **quantity** (Number) - Cantidad
- **barcode** (String) - Código de barras

### 🎨 Variantes (Para productos con variantes)
**variants[]** (Array):
- **sku** (String) - SKU único (requerido)
- **color.name** (String) - Nombre del color
- **color.code** (String) - Código hexadecimal del color
- **size** (String) - Talla/tamaño
- **pricing.costPrice** (Number) - Precio de costo
- **pricing.salePrice** (Number) - Precio de venta
- **stock** (Number) - Stock de esta variante
- **images[]** (Array) - Imágenes específicas de la variante
- **barcode** (String) - Código de barras
- **available** (Boolean) - Disponibilidad

### 🏷️ Filtros y Categorización
- **filters[]** (Array de Strings) - Filtros del producto (ej: "sombras", "labiales")
- **model** (String) - Modelo del producto
- **urlVideo** (String) - URL de video del producto

### 📸 Imágenes
- **img** (String) - Imagen principal
- **images[]** (Array) - Imágenes adicionales generales

### 💯 Sistema de Puntos
**points:**
- **earnPoints** (Number) - Puntos que gana al comprar
- **redeemPoints** (Number) - Puntos para canjear

### 🎁 Descuentos
**discount[]** (Array):
- **type** (String) - Tipo: "percentage" o "fixed"
- **value** (Number) - Valor del descuento
- **startDate** (Date) - Fecha de inicio
- **endDate** (Date) - Fecha de fin
- **minQuantity** (Number) - Cantidad mínima

### 📝 Detalles del Producto
**details:**
- **specifications[]** - Especificaciones técnicas
  - **name** - Nombre de la especificación
  - **value** - Valor
  - **unit** - Unidad de medida
- **features[]** - Características destacadas
- **included[]** - Qué incluye el producto
- **instructions** - Instrucciones de uso
- **careInstructions** - Instrucciones de cuidado

### 🛡️ Garantía
**warranty:**
- **hasWarranty** (Boolean) - Tiene garantía
- **duration.value** (Number) - Duración
- **duration.unit** (Enum) - Unidad: 'días', 'meses', 'años'
- **type** (Enum) - Tipo: 'fabricante', 'tienda', 'extendida', 'limitada'
- **coverage[]** - Qué cubre
- **exclusions[]** - Qué no cubre
- **terms** - Términos y condiciones

### 🌍 Disponibilidad Geográfica
- **countryCodes[]** - Códigos de países
- **cities[]** - Ciudades disponibles
- **deliveryTime** (String) - Tiempo de entrega
- **available** (Boolean) - Disponibilidad general

## Campos Calculados Automáticamente
Estos campos se calculan automáticamente por el backend:
- **pricing.profit.amount** - Ganancia en monto
- **pricing.profit.percentage** - Ganancia en porcentaje
- **createdAt** - Fecha de creación
- **updatedAt** - Fecha de actualización

## Validaciones Importantes
1. Debe tener **category** O **subCategory** (no ambos, no ninguno)
2. Si `productType = 'variant'`, los **SKUs deben ser únicos**
3. Si `productType = 'simple'`, **costPrice** y **salePrice** son requeridos
4. El campo **brand** es siempre requerido
5. El campo **name** debe ser único en toda la base de datos
