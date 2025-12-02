# 📦 API de Transacciones y Órdenes V2 - Documentación

Sistema completo de transacciones, wallet y órdenes de envío construido desde cero.

---

## 🎯 Flujo Completo

```
1. Usuario realiza compra
   ↓
2. POST /api/transactions-v2/create
   - Valida dirección de envío
   - Valida productos
   - Crea transacción
   - Crea/actualiza Wallet (pendingBalance)
   - Crea ShippingOrder automáticamente
   ↓
3. GET /api/shipping-orders-v2/my-orders
   - Usuario ve sus órdenes
   ↓
4. PUT /api/shipping-orders-v2/:id/status
   - Cambia estado a "approved" o "delivered"
   - MUEVE balance de pendingBalance → balance
   - Actualiza comisión a "deposited"
```

---

## 📡 Endpoints Disponibles

### 1. **Crear Transacción Completa**

**`POST /api/transactions-v2/create`**

Crea una transacción y automáticamente:
- ✅ Crea/actualiza el Wallet con `pendingBalance`
- ✅ Crea una `ShippingOrder` 
- ✅ Registra movimientos en el wallet

#### Request Body:
```json
{
  "shippingAddressId": "673abc123...",
  "wompiTransactionId": "12345-WOMPI",
  "wompiReference": "REF-12345",
  "paymentStatus": "approved",
  "customerEmail": "cliente@example.com",
  "approvalCode": "ABC123",
  "items": [
    {
      "productId": "673def456...",
      "productType": "simple",
      "quantity": 2,
      "unitPrice": 50000,
      "variations": {
        "color": {
          "name": "Rojo",
          "code": "#FF0000"
        },
        "size": {
          "name": "M"
        }
      }
    }
  ]
}
```

#### Validaciones:
- ✅ La dirección debe existir y pertenecer al usuario
- ✅ Los productos deben existir y estar activos
- ✅ `wompiReference` único (no duplicados)
- ✅ `paymentStatus` debe ser: `approved`, `pending`, `declined`, o `error`
- ✅ `productType` debe ser: `simple` o `variable` (default: `simple`)

#### Tipos de Producto:
- **`simple`**: Producto sin variaciones (default)
- **`variable`**: Producto con variaciones (color, talla, etc.)

#### Response (201):
```json
{
  "success": true,
  "msg": "¡Compra exitosa! Tu pedido ha sido confirmado",
  "transaction": {
    "_id": "673xyz...",
    "transactionNumber": "TXN-20251201-001",
    "referenceNumber": "REF-12345",
    "orderStatus": "paid",
    "totalAmount": 100000,
    "items": [...],
    "payment": {
      "wompiTransactionId": "12345-WOMPI",
      "wompiReference": "REF-12345",
      "status": "approved",
      "customerEmail": "cliente@example.com"
    },
    "shippingAddress": {...},
    "createdAt": "2025-12-01T..."
  },
  "wallet": {
    "availableBalance": 0,
    "pendingBalance": 10000,
    "points": 100,
    "totalEarned": 0
  },
  "shippingOrder": {
    "_id": "674abc...",
    "orderNumber": "SHIP-20251201-001",
    "status": "pending",
    "commission": {
      "amount": 10000,
      "points": 100,
      "status": "pending"
    },
    "estimatedDelivery": "2025-12-04T..."
  }
}
```

---

### 2. **Ver Mis Órdenes**

**`GET /api/shipping-orders-v2/my-orders`**

Lista todas las órdenes de envío del usuario.

#### Query Parameters:
- `status` (opcional): Filtrar por estado (`pending`, `approved`, `delivered`, etc.)
- `limit` (opcional): Número de resultados (default: 20)
- `skip` (opcional): Paginación (default: 0)

#### Response (200):
```json
{
  "success": true,
  "total": 5,
  "orders": [
    {
      "_id": "674abc...",
      "orderNumber": "SHIP-20251201-001",
      "status": "pending",
      "statusLabel": "Pendiente",
      "items": [
        {
          "name": "Producto 1",
          "quantity": 2,
          "unitPrice": 50000,
          "totalPrice": 100000,
          "image": "https://..."
        }
      ],
      "totalAmount": 100000,
      "shippingAddress": {...},
      "commission": {
        "amount": 10000,
        "points": 100,
        "status": "pending"
      },
      "tracking": {
        "estimatedDelivery": "2025-12-04T..."
      },
      "createdAt": "2025-12-01T..."
    }
  ],
  "hasMore": false
}
```

---

### 3. **Actualizar Estado de Orden**

**`PUT /api/shipping-orders-v2/:id/status`**

Actualiza el estado de una orden y **automáticamente mueve el balance** cuando se aprueba o entrega.

#### Request Body:
```json
{
  "status": "approved",
  "notes": "Producto verificado y listo para envío"
}
```

#### Estados Válidos:
- `pending` - Pendiente
- `approved` - Aprobado ✨ **MUEVE BALANCE**
- `preparing` - Preparando
- `ready` - Listo para enviar
- `in_transit` - En camino
- `delivered` - Entregado ✨ **MUEVE BALANCE**
- `cancelled` - Cancelado

#### Response (200):
```json
{
  "success": true,
  "msg": "Orden actualizada a: Aprobado - ¡Comisión de $10,000 depositada!",
  "order": {
    "_id": "674abc...",
    "orderNumber": "SHIP-20251201-001",
    "status": "approved",
    "statusLabel": "Aprobado",
    "commission": {
      "amount": 10000,
      "points": 100,
      "status": "deposited",
      "depositedAt": "2025-12-01T..."
    },
    "tracking": {
      "preparedAt": "2025-12-01T...",
      "estimatedDelivery": "2025-12-04T..."
    }
  },
  "wallet": {
    "availableBalance": 10000,
    "pendingBalance": 0,
    "points": 100,
    "totalEarned": 10000
  },
  "balanceUpdated": true
}
```

---

### 4. **Ver Detalle de Orden**

**`GET /api/shipping-orders-v2/:id`**

Obtiene el detalle completo de una orden específica.

#### Response (200):
```json
{
  "success": true,
  "order": {
    "_id": "674abc...",
    "orderNumber": "SHIP-20251201-001",
    "status": "approved",
    "statusLabel": "Aprobado",
    "seller": {
      "firstName": "Juan",
      "lastName": "Pérez",
      "phone": "+57300123456",
      "email": "juan@example.com"
    },
    "customer": {
      "name": "Juan Pérez",
      "email": "cliente@example.com",
      "phone": "+57300123456"
    },
    "shippingAddress": {
      "fullAddress": "Calle 123 #45-67",
      "city": "Bogotá",
      "department": "Cundinamarca"
    },
    "items": [...],
    "commission": {...},
    "tracking": {...},
    "payment": {...},
    "createdAt": "2025-12-01T...",
    "updatedAt": "2025-12-01T..."
  }
}
```

---

### 5. **Ver Balance del Wallet**

**`GET /api/shipping-orders-v2/wallet-balance`**

Obtiene el balance actual del wallet del usuario.

#### Response (200):
```json
{
  "success": true,
  "wallet": {
    "availableBalance": 10000,
    "pendingBalance": 5000,
    "totalBalance": 15000,
    "points": 150,
    "totalEarned": 25000,
    "totalPointsEarned": 250
  },
  "pendingOrders": 2,
  "updatedAt": "2025-12-01T..."
}
```

---

## 💰 Sistema de Balance

### **Tipos de Balance:**

1. **`pendingBalance`** (Balance Pendiente)
   - Se crea automáticamente al hacer una compra con `paymentStatus: "approved"`
   - Representa comisiones pendientes de confirmación
   - NO se puede retirar

2. **`balance`** (Balance Disponible)
   - Se mueve desde `pendingBalance` cuando la orden cambia a `approved` o `delivered`
   - Disponible para retiro
   - Se acumula en `totalCommissionsEarned`

### **Flujo del Balance:**

```
Compra → Wallet creado/actualizado
         pendingBalance: +$10,000
         ↓
Orden cambiada a "approved" → Balance movido
         pendingBalance: -$10,000
         balance: +$10,000
         totalCommissionsEarned: +$10,000
```

---

## 🎨 Estados de la Orden

| Estado | Label | Descripción | Acción en Balance |
|--------|-------|-------------|-------------------|
| `pending` | Pendiente | Orden creada, esperando confirmación | - |
| `approved` | Aprobado | Orden aprobada, listo para preparar | ✅ **MUEVE A BALANCE** |
| `preparing` | Preparando | Preparando el pedido | - |
| `ready` | Listo para enviar | Listo para despacho | - |
| `in_transit` | En camino | En tránsito al cliente | - |
| `delivered` | Entregado | Entregado al cliente | ✅ **MUEVE A BALANCE** (si aún está pending) |
| `cancelled` | Cancelado | Orden cancelada | - |

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación JWT.

```bash
Headers:
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

---

## ⚠️ Errores Comunes

### 400 - Bad Request
```json
{
  "success": false,
  "msg": "Dirección de envío no válida o no pertenece al usuario"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "msg": "Orden de envío no encontrada"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "msg": "Error al crear la transacción",
  "error": "Mensaje de error"
}
```

---

## 🧪 Ejemplo Completo de Uso

### 1. Crear Transacción
```bash
POST http://localhost:3000/api/transactions-v2/create
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "shippingAddressId": "673abc123...",
  "wompiTransactionId": "WOMPI-12345",
  "wompiReference": "REF-12345",
  "paymentStatus": "approved",
  "customerEmail": "cliente@example.com",
  "approvalCode": "ABC123",
  "items": [
    {
      "productId": "673def456...",
      "productType": "simple",
      "quantity": 1,
      "unitPrice": 100000
    }
  ]
}
```

### 2. Ver Órdenes
```bash
GET http://localhost:3000/api/shipping-orders-v2/my-orders
Authorization: Bearer YOUR_TOKEN
```

### 3. Aprobar Orden (Mover Balance)
```bash
PUT http://localhost:3000/api/shipping-orders-v2/674abc.../status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "approved",
  "notes": "Producto verificado"
}
```

### 4. Ver Balance
```bash
GET http://localhost:3000/api/shipping-orders-v2/wallet-balance
Authorization: Bearer YOUR_TOKEN
```

---

## ✅ Checklist de Validaciones

- ✅ Usuario autenticado
- ✅ Dirección de envío existe y pertenece al usuario
- ✅ Productos existen y están activos
- ✅ Referencia de Wompi única (no duplicados)
- ✅ Estado de pago válido
- ✅ Items con cantidades válidas
- ✅ Balance se mueve correctamente
- ✅ Comisiones se calculan automáticamente (10% del precio)
- ✅ Puntos se calculan (1 punto por cada $1000)

---

## 📊 Modelos de Datos

### Transaction
- `transactionNumber`: Número único de transacción
- `user`: Usuario que compra
- `shippingAddress`: Dirección de envío
- `items`: Array de productos
- `payment`: Información de pago de Wompi
- `orderStatus`: Estado de la orden
- `commissions`: Comisiones calculadas

### Wallet
- `balance`: Saldo disponible
- `pendingBalance`: Saldo pendiente
- `points`: Puntos acumulados
- `totalCommissionsEarned`: Total histórico ganado

### ShippingOrder
- `orderNumber`: Número único de orden
- `transaction`: Referencia a transacción
- `buyer`: Usuario comprador
- `status`: Estado actual
- `commission`: Comisión pendiente o depositada
- `tracking`: Información de seguimiento

---

## 🚀 Versión

**API V2** - Construida desde cero para mayor claridad y simplicidad.

Las rutas antiguas (`/api/transactions` y `/api/shipping-orders`) siguen funcionando para compatibilidad.

---

**Fecha:** 1 de diciembre de 2025
**Versión:** 2.0.0
