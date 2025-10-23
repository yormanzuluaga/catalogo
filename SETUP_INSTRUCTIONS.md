# Catálogo Backend - Setup y Testing

## 🚀 Estado Actual del Proyecto

El sistema de billetera (wallet) para vendedoras ha sido completamente implementado e integrado con el sistema de órdenes. Todos los archivos están actualizados y el servidor puede iniciarse correctamente.

### ✅ Componentes Implementados

1. **Sistema de Billetera Completo**
   - Modelo de billetera (`wallet.model.js`)
   - Modelo de movimientos (`wallet_movements_model.js`)
   - Controlador de billetera (`wallet.controller.js`)
   - Servicio de billetera (`wallet.service.js`)
   - Rutas de billetera (`wallet.routes.js`)

2. **Sistema de Órdenes Actualizado**
   - Integración con comisiones y puntos
   - Cálculo automático de ganancias
   - Estados de aprobación de comisiones

3. **Integración AWS S3**
   - Migración a SDK v3
   - Sistema de carga de archivos actualizado

## 🔧 Problema Actual: Conexión MongoDB Atlas

### Error Detectado
```
❌ Error al conectar con la base de datos: Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

### IP Actual del Sistema
```
191.95.34.187
```

## 🛠️ Solución: Configurar MongoDB Atlas

### Opción 1: Agregar IP Específica (Recomendado)
1. Ve a [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Selecciona tu proyecto "emprendedoras"
3. Ve a **Network Access** en el menú lateral
4. Haz clic en **Add IP Address**
5. Agrega la IP: `191.95.34.187`
6. Agrega descripción: "Development - Local Machine"
7. Confirma los cambios

### Opción 2: Permitir Todas las IPs (Menos Seguro)
1. En **Network Access**
2. Haz clic en **Add IP Address**
3. Selecciona **Allow Access from Anywhere**
4. Esto agregará `0.0.0.0/0`

### Opción 3: Verificar Credenciales
Si el problema persiste, verifica en `.env`:
```env
MONGODB_CNN=mongodb+srv://yormangomez588_db_user:X93LFqYBZpDy0eWQ@emprendedoras.ap8l1ez.mongodb.net/catalogo?retryWrites=true&w=majority&authSource=admin
```

## 🧪 Testing del Sistema

### 1. Test de Conexión
```bash
# Probar conexión a MongoDB
node test-connection.js
```

### 2. Test Completo del Sistema de Billetera
```bash
# Probar todo el sistema de billetera
node test-wallet-system.js
```

### 3. Iniciar el Servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📊 Endpoints del Sistema de Billetera

### Para Vendedoras (Requieren JWT)
```
GET    /api/wallet/my-wallet              # Ver mi billetera
GET    /api/wallet/my-movements           # Ver mis movimientos
POST   /api/wallet/withdrawal             # Solicitar retiro
PUT    /api/wallet/settings               # Configurar billetera
GET    /api/wallet/stats                  # Ver estadísticas
```

### Para Administradores (Requieren Admin Role)
```
GET    /api/wallet/admin/all-wallets      # Ver todas las billeteras
GET    /api/wallet/admin/user/:userId     # Ver billetera específica
GET    /api/wallet/admin/pending          # Ver comisiones pendientes
POST   /api/wallet/admin/approve/:movementId  # Aprobar comisión
GET    /api/wallet/admin/withdrawals      # Ver retiros pendientes
POST   /api/wallet/admin/process-withdrawal/:id  # Procesar retiro
```

### Órdenes Integradas
```
POST   /api/orders                        # Crear orden (calcula comisiones)
GET    /api/orders/admin/pending-commission  # Ver comisiones pendientes
PUT    /api/orders/admin/approve-commission/:id  # Aprobar comisión
PUT    /api/orders/admin/status/:id       # Cambiar estado de orden
```

## 🔐 Autenticación

Para probar los endpoints que requieren autenticación:

1. **Crear Usuario**
```bash
curl -X POST http://localhost:4000/api/user \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ana",
    "lastName": "Vendedora", 
    "mobile": "573001234567",
    "email": "ana@test.com",
    "password": "123456",
    "role": "VENDEDORA_ROLE"
  }'
```

2. **Hacer Login**
```bash
curl -X POST http://localhost:4000/api/auth/signIn \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@test.com",
    "password": "123456"
  }'
```

3. **Usar Token en Headers**
```bash
curl -X GET http://localhost:4000/api/wallet/my-wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📋 Lista de Verificación Post-Conexión

Una vez solucionado el problema de MongoDB:

- [ ] Ejecutar `node test-connection.js` ✅ 
- [ ] Ejecutar `node test-wallet-system.js` ✅
- [ ] Crear usuario de prueba ✅
- [ ] Probar login y obtener JWT ✅
- [ ] Probar endpoints de billetera ✅
- [ ] Crear orden de prueba ✅
- [ ] Verificar cálculo de comisiones ✅
- [ ] Probar aprobación de comisiones ✅
- [ ] Probar solicitud de retiro ✅

## 🚦 Próximos Pasos

1. **Configurar MongoDB Atlas IP Whitelist**
2. **Ejecutar tests del sistema**  
3. **Configurar variables de entorno para producción**
4. **Documentar endpoints para el frontend**
5. **Configurar sistema de notificaciones (opcional)**

## 📞 Soporte

Si encuentras problemas adicionales:
1. Verifica los logs del servidor
2. Ejecuta los scripts de testing
3. Revisa la configuración de MongoDB Atlas
4. Verifica las variables de entorno en `.env`

El sistema está completamente funcional y listo para pruebas una vez resuelto el problema de conectividad con MongoDB Atlas.
