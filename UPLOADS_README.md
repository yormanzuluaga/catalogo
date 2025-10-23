# Sistema de Uploads con AWS S3

Este sistema permite subir imágenes de usuarios y productos a AWS S3 de manera segura y eficiente.

## Configuración

### Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=tu_nombre_bucket
```

### Configuración del Bucket S3

1. Crea un bucket en AWS S3
2. Configura las políticas de acceso público para lectura
3. Obtén las credenciales de acceso (Access Key ID y Secret Access Key)

## Endpoints Disponibles

### 1. Subir Archivo General
```
POST /api/uploads/
```
- **Headers**: Authorization (Bearer token)
- **Body**: FormData con campo `archivo`
- **Respuesta**: URL del archivo subido

### 2. Actualizar Imagen de Usuario/Producto
```
PUT /api/uploads/:collection/:id
```
- **Parámetros**: 
  - `collection`: "users" o "products"
  - `id`: ID del usuario/producto
- **Headers**: Authorization (Bearer token)
- **Body**: FormData con campo `archivo`
- **Respuesta**: Modelo actualizado con nueva imagen

### 3. Mostrar Imagen
```
GET /api/uploads/:collection/:id
```
- **Parámetros**:
  - `collection`: "users" o "products"
  - `id`: ID del usuario/producto
- **Respuesta**: URL de la imagen

### 4. Eliminar Imagen
```
DELETE /api/uploads/:collection/:id
```
- **Parámetros**:
  - `collection`: "users" o "products"
  - `id`: ID del usuario/producto
- **Headers**: Authorization (Bearer token)
- **Respuesta**: Confirmación de eliminación

### 5. Subir Múltiples Imágenes (Solo Productos)
```
POST /api/uploads/multiple/:id
```
- **Parámetros**: `id`: ID del producto
- **Headers**: Authorization (Bearer token)
- **Body**: FormData con campo `archivos` (array de archivos)
- **Respuesta**: Array de URLs de las imágenes subidas

## Validaciones

### Tipos de Archivo Permitidos
- **Imágenes**: JPG, JPEG, PNG, GIF, WEBP
- **Videos**: MP4, MPEG, QuickTime, AVI (para futuras implementaciones)

### Tamaños Máximos
- **Imágenes**: 5MB
- **Videos**: 50MB

## Ejemplos de Uso

### JavaScript/Fetch
```javascript
// Subir imagen de usuario
const formData = new FormData();
formData.append('archivo', file);

fetch('/api/uploads/users/64a1b2c3d4e5f6789012345', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL
```bash
# Subir imagen de producto
curl -X PUT \
  http://localhost:8080/api/uploads/products/64a1b2c3d4e5f6789012345 \
  -H 'Authorization: Bearer tu_token' \
  -F 'archivo=@imagen.jpg'
```

## Estructura de Archivos

```
src/
├── services/
│   └── s3.service.js          # Servicio principal de S3
├── helpers/
│   └── subir_archivo.js       # Helper para manejo de archivos
├── controllers/
│   └── uploads.controller.js  # Controladores de uploads
├── middlewares/
│   └── validar_archivo.js     # Middlewares de validación
└── routes/
    └── uploads.routes.js      # Rutas de uploads
```

## Modelos Actualizados

### Usuario (User)
- `avatar`: String - URL de la imagen de perfil en S3

### Producto (Product)
- `img`: String - URL de la imagen principal en S3
- `images`: [String] - Array de URLs de imágenes adicionales en S3

## Seguridad

- Todas las operaciones de upload requieren autenticación JWT
- Validación de tipos de archivo en el servidor
- Validación de tamaños de archivo
- Eliminación automática de archivos anteriores al actualizar
- URLs públicas para lectura, operaciones protegidas para escritura

## Errores Comunes

### Error: "AWS_S3_BUCKET_NAME no está configurado"
- Solución: Verifica que las variables de entorno estén configuradas correctamente

### Error: "Tipo de archivo no válido"
- Solución: Asegúrate de enviar archivos con extensiones permitidas

### Error: "Archivo demasiado grande"
- Solución: Reduce el tamaño del archivo (máximo 5MB para imágenes)

### Error: "No hay archivos que subir"
- Solución: Verifica que el campo del archivo se llame 'archivo' o 'archivos'

## Monitoreo

Los errores se registran en la consola del servidor. Para producción, considera implementar un sistema de logging más robusto como Winston o Morgan.
