# 📸 Guía para Subir Imágenes de Productos

## Acceso al Panel de Administración

1. **Inicia sesión** en el panel de administración
2. Ve a la sección **"📦 Productos"** en el menú lateral
3. Haz clic en el botón **"+ Nuevo Producto"**

---

## Formulario de Creación de Productos

### 📋 Sección de Imágenes y Multimedia

El formulario ahora tiene **DOS OPCIONES** para agregar imágenes:

#### **Opción 1: Subir imágenes desde tu computadora** (RECOMENDADO) ✅

1. **Imagen Principal:**
   - Busca el campo **"🖼️ Subir Imagen Principal"**
   - Haz clic en **"Elegir archivo"** o arrastra la imagen
   - Formatos aceptados: JPG, PNG, GIF
   - Verás una **vista previa** de la imagen seleccionada
   - Puedes eliminarla con el botón **×** si quieres cambiarla

2. **Imágenes Adicionales:**
   - Busca el campo **"🖼️ Subir Imágenes Adicionales"**
   - Haz clic en **"Elegir archivo"**
   - Puedes seleccionar **MÚLTIPLES imágenes** (mantén presionado Ctrl en Windows o Cmd en Mac)
   - Verás **miniaturas** de todas las imágenes seleccionadas
   - Puedes eliminar cualquiera con el botón **×**

#### **Opción 2: Usar URLs de imágenes externas**

Si ya tienes las imágenes en línea:
- Pega la URL en el campo **"📎 O usar URL de Imagen Principal"**
- Para imágenes adicionales, pega las URLs separadas por comas en **"📎 O usar URLs de Imágenes Adicionales"**

---

## 📝 Pasos Completos para Crear un Producto

### 1️⃣ **Información Básica**
```
✓ Nombre del Producto (obligatorio)
✓ Modelo (opcional)
✓ Descripción (opcional)
✓ Marca (obligatorio - seleccionar del menú)
```

### 2️⃣ **Categorización**
```
✓ Selecciona UNA de estas opciones:
  - Categoría directa
  - Subcategoría (recomendado)
  
⚠️ NO puedes seleccionar ambas al mismo tiempo
```

### 3️⃣ **Tipo de Producto**
- **Producto Simple:** Un solo producto sin variantes
- **Producto con Variantes:** Con colores, tallas, etc.

### 4️⃣ **Precios** (si es producto simple)
```
✓ Precio de Costo
✓ Precio de Venta
✓ La ganancia se calcula automáticamente
✓ Stock disponible
```

### 5️⃣ **Imágenes** 📸
```
✓ Sube la imagen principal (archivo o URL)
✓ Sube imágenes adicionales (archivos o URLs)
✓ Opcional: Agrega un video de YouTube
```

### 6️⃣ **Guardar**
- Haz clic en **"Guardar Producto"**
- Espera a que aparezca el mensaje de éxito
- ¡Listo! Tu producto está creado con imágenes

---

## 🎨 Características de las Imágenes

### Vista Previa
- **Imagen Principal:** Se muestra en tamaño mediano (200x200px máx)
- **Imágenes Adicionales:** Se muestran en cuadrícula como miniaturas

### Almacenamiento
- Las imágenes se suben automáticamente a **AWS S3**
- Se genera una URL única para cada imagen
- Las imágenes se comprimen y optimizan automáticamente

### Eliminación
- Puedes eliminar imágenes antes de guardar con el botón **×**
- Si ya guardaste el producto, puedes editarlo y cambiar las imágenes

---

## 🔧 Agregar Imágenes a un Producto Existente

### Método 1: Editar el producto
1. Ve a la lista de productos
2. Haz clic en **"Editar"** en el producto deseado
3. Sube las nuevas imágenes
4. Guarda los cambios

### Método 2: Usar la API directamente
Si eres desarrollador, puedes usar el endpoint:
```
POST /api/products/images/:id
Content-Type: multipart/form-data

Body:
- img: archivo de imagen principal
- images: archivos de imágenes adicionales (múltiples)
```

---

## ❓ Preguntas Frecuentes

**P: ¿Cuántas imágenes puedo subir?**  
R: Una imagen principal y múltiples imágenes adicionales (sin límite establecido, pero se recomienda máximo 5-10 para mejor rendimiento)

**P: ¿Qué tamaño deben tener las imágenes?**  
R: El sistema acepta cualquier tamaño, pero se recomienda:
- Mínimo: 500x500px
- Óptimo: 1000x1000px
- Máximo: 2000x2000px

**P: ¿Qué pasa si subo archivos Y pongo URLs?**  
R: Los archivos tienen prioridad. Si subes un archivo, la URL se ignorará.

**P: ¿Puedo mezclar archivos locales y URLs?**  
R: No en la misma categoría. Usa archivos O URLs, no ambos en la misma sección.

**P: ¿Las imágenes se guardan si hay un error?**  
R: No. Si hay un error al crear el producto, las imágenes se eliminan automáticamente para evitar archivos huérfanos.

---

## 🚨 Solución de Problemas

### "No se pueden subir las imágenes"
- Verifica que el formato sea JPG, PNG o GIF
- Asegúrate de que el archivo no sea muy grande (máx 10MB)
- Revisa que tengas conexión a internet

### "Error al crear producto"
- Verifica que completaste todos los campos obligatorios (*)
- Asegúrate de seleccionar categoría O subcategoría (no ambas)
- Revisa que la marca esté seleccionada

### "Las imágenes no se muestran"
- Espera unos segundos, S3 puede tardar en procesar
- Recarga la página del producto
- Verifica que la imagen principal esté cargada

---

## 📞 Soporte

Si tienes problemas o dudas:
1. Revisa la consola del navegador (F12) para ver errores
2. Verifica los logs del servidor
3. Contacta al administrador del sistema

---

**Última actualización:** Enero 2026  
**Versión del sistema:** 2.0
