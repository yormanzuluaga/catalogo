# 💳 Sistema de Wallet para Vendedoras - Catálogo 360

## 📋 Descripción General

El sistema de wallet permite a las vendedoras gestionar sus comisiones, puntos y retiros de manera transparente y eficiente. Cada vendedora tiene su propia billetera digital donde puede:

- ✅ Ver saldo disponible y pendiente
- ✅ Consultar historial de comisiones y movimientos
- ✅ Solicitar retiros de fondos
- ✅ Acumular y gestionar puntos
- ✅ Configurar métodos de pago

## 🏗️ Arquitectura del Sistema

### Modelos Principales

#### 1. **Wallet** (`wallet.model.js`)
- **balance**: Saldo disponible para retiro
- **pendingBalance**: Comisiones pendientes de aprobación
- **points**: Puntos acumulados
- **settings**: Configuraciones de la wallet (método de pago, mínimo de retiro, etc.)
- **stats**: Estadísticas de ventas de la vendedora

#### 2. **WalletMovements** (`wallet_movements_model.js`)
- **type**: Tipo de movimiento (comisión, retiro, puntos, etc.)
- **amount**: Monto del movimiento
- **status**: Estado (pending, approved, completed, rejected)
- **withdrawalInfo**: Información para retiros

#### 3. **Orden** (actualizada)
- **totalCommission**: Total de comisión de la orden
- **totalPoints**: Total de puntos de la orden
- **commissionStatus**: Estado de aprobación de comisiones

## ⚙️ Cálculo de Comisiones y Puntos

### 📊 Fórmula de Comisiones
```javascript
Margen = Precio de Venta - Precio Base del Producto
Comisión = (Margen × 20%) × Cantidad
```

### 🎯 Fórmula de Puntos
```javascript
Puntos = Math.floor(Monto Total de Venta / 10000)
// Ejemplo: $50,000 de venta = 5 puntos
```

## 🔄 Flujo de Proceso

### 1. **Creación de Venta**
1. Vendedora crea una orden
2. Sistema calcula automáticamente comisiones y puntos
3. Comisión se agrega como "pendiente" en la wallet
4. Puntos se aprueban automáticamente

### 2. **Aprobación de Comisiones** (Admin)
1. Admin revisa órdenes pendientes
2. Aprueba comisiones individual o masivamente
3. Dinero se transfiere de "pendiente" a "disponible"

### 3. **Solicitud de Retiro** (Vendedora)
1. Vendedora solicita retiro (mínimo $50,000)
2. Sistema valida saldo disponible
3. Crea movimiento de retiro "pendiente"
4. Resta dinero del saldo disponible

### 4. **Procesamiento de Retiro** (Admin)
1. Admin procesa el retiro
2. Marca como "completado" o "rechazado"
3. Si se rechaza, devuelve dinero a la wallet

## 🛠️ API Endpoints

### 👩‍💼 Para Vendedoras

#### Obtener Mi Wallet
```http
GET /api/wallet/my-wallet
Authorization: Bearer {token}
```

#### Obtener Mis Movimientos
```http
GET /api/wallet/my-movements?page=1&limit=20&type=commission_earned
Authorization: Bearer {token}
```

#### Solicitar Retiro
```http
POST /api/wallet/withdrawal
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 100000,
  "withdrawalMethod": "bank_transfer",
  "bankInfo": {
    "bankName": "Bancolombia",
    "accountNumber": "12345678",
    "accountType": "savings",
    "accountHolderName": "María García"
  }
}
```

#### Configurar Wallet
```http
PUT /api/wallet/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "minimumWithdrawal": 50000,
  "preferredPaymentMethod": "nequi",
  "notifications": {
    "emailOnCommission": true,
    "emailOnWithdrawal": true
  }
}
```

### 👨‍💼 Para Administradores

#### Ver Todas las Wallets
```http
GET /api/wallet/admin/all?page=1&limit=20&search=María
Authorization: Bearer {admin_token}
```

#### Aprobar Comisión
```http
PUT /api/wallet/admin/approve-commission/{movementId}
Authorization: Bearer {admin_token}
```

#### Procesar Retiro
```http
PUT /api/wallet/admin/process-withdrawal/{movementId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "completed",
  "transactionId": "TXN123456",
  "notes": "Transferencia procesada exitosamente"
}
```

## 📱 Gestión de Órdenes

### Crear Orden con Comisiones
```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "product": "64a1b2c3d4e5f6789012345",
      "quantity": 2,
      "price": 25000
    }
  ],
  "totalPrice": 50000,
  "paymentMethod": "efectivo",
  "phone": "3001234567",
  "name": "Cliente Ejemplo"
}
```

### Mis Órdenes
```http
GET /api/orders/my-orders?page=1&status=confirmed
Authorization: Bearer {token}
```

## 📊 Estadísticas y Reportes

### Estadísticas de Wallet (Vendedora)
```http
GET /api/wallet/stats
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "ok": true,
  "stats": {
    "wallet": {
      "totalSales": 500000,
      "totalProducts": 25,
      "averageCommissionPerSale": 2000,
      "salesThisMonth": 150000
    },
    "canWithdraw": true,
    "totalBalance": 45000,
    "pendingCommissions": 3
  }
}
```

### Estadísticas de Órdenes (Admin)
```http
GET /api/orders/admin/stats?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {admin_token}
```

## 🔒 Seguridad y Validaciones

### Validaciones de Negocio
- ✅ Mínimo de retiro: $50,000 COP
- ✅ Saldo suficiente para retiros
- ✅ Comisiones solo se aprueban por administradores
- ✅ Puntos se otorgan automáticamente (no requieren aprobación)

### Seguridad
- ✅ Autenticación JWT obligatoria
- ✅ Roles diferenciados (vendedora vs admin)
- ✅ Validación de permisos por endpoint
- ✅ Registro de todas las operaciones

## 📈 Métricas y KPIs

### Para Vendedoras
- Total de ventas realizadas
- Comisiones ganadas (mes actual vs anterior)
- Puntos acumulados
- Promedio de comisión por venta
- Productos vendidos este mes

### Para Administradores
- Total de comisiones pagadas
- Retiros procesados
- Top vendedoras por volumen
- Comisiones pendientes de aprobación
- Análisis de tendencias de ventas

## 🚀 Funcionalidades Futuras

### Versión 2.0
- [ ] Sistema de niveles/rangos para vendedoras
- [ ] Bonificaciones por metas alcanzadas
- [ ] Canje de puntos por productos
- [ ] Programa de referidos
- [ ] Dashboard analítico avanzado
- [ ] Notificaciones push en tiempo real

### Integraciones
- [ ] Pasarelas de pago (PSE, tarjetas)
- [ ] Billeteras digitales (Nequi, DaviPlata)
- [ ] Sistema de facturación electrónica
- [ ] CRM integrado

## 🛠️ Configuración e Instalación

### Variables de Entorno Requeridas
```env
# Base de datos
MONGODB_CNN=mongodb+srv://user:pass@cluster.mongodb.net/catalogo

# JWT
SECRETORPRIVATEKEY=tu_secret_key

# Configuraciones de Wallet
MINIMUM_WITHDRAWAL=50000
COMMISSION_RATE=20
POINTS_RATE=10000
```

### Scripts Disponibles
```bash
# Migrar wallets existentes
npm run migrate

# Probar conexión S3 (para imágenes)
npm run test-s3

# Iniciar servidor de desarrollo
npm run dev
```

## 📞 Soporte y Documentación

Para más información o soporte técnico:
- 📧 Email: dev@catalogo360.com
- 📱 WhatsApp: +57 300 123 4567
- 📚 Documentación completa: [docs.catalogo360.com](docs.catalogo360.com)

---

### 🏆 Sistema de Wallet Completo y Funcional
**✅ Listo para producción con todas las funcionalidades requeridas**
