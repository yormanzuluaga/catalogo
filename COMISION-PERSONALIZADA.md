# 💰 GUÍA: Cómo enviar comisión personalizada

## 🎯 Problema Resuelto

Antes, el sistema calculaba la comisión automáticamente y **no usaba** la comisión que enviabas en el request.

**Ahora, el sistema funciona así:**

1. **Si envías `commission` en el item** → Usa esa comisión ✅
2. **Si NO envías `commission`** → Calcula automáticamente desde el `costPrice` o precio de venta

---

## 📝 Formato del Request

### Estructura del Item con Comisión Personalizada

```json
{
  "items": [
    {
      "productId": "64abc123...",
      "quantity": 2,
      "unitPrice": 45800,
      "commission": 5000,  // ⭐ COMISIÓN POR UNIDAD (no total)
      "variations": {
        "color": { "name": "Rojo" },
        "size": { "name": "M" }
      }
    }
  ],
  "shippingAddressId": "64def456...",
  "wompiTransactionId": "wompi_12345",
  "wompiReference": "REF-12345",
  "paymentStatus": "approved"
}
```

### ⚠️ IMPORTANTE

- **`commission`** es la comisión **POR UNIDAD**, no la comisión total
- Si `quantity = 2` y `commission = 5000`, la comisión total será: `2 × 5000 = 10,000`

---

## 🚀 Ejemplos de Uso

### Ejemplo 1: Comisión Fija de $5,000 por unidad

```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "x-token: TU_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "64abc123...",
        "quantity": 2,
        "unitPrice": 45800,
        "commission": 5000
      }
    ],
    "shippingAddressId": "64def456...",
    "wompiTransactionId": "wompi_12345",
    "paymentStatus": "approved"
  }'
```

**Resultado:**
- Comisión por unidad: $5,000
- Cantidad: 2
- **Comisión total: $10,000** ✅

---

### Ejemplo 2: Comisión Diferente por Producto

```json
{
  "items": [
    {
      "productId": "producto_1",
      "quantity": 1,
      "unitPrice": 50000,
      "commission": 8000  // $8,000 para este producto
    },
    {
      "productId": "producto_2",
      "quantity": 3,
      "unitPrice": 30000,
      "commission": 3000  // $3,000 para este producto
    }
  ],
  "shippingAddressId": "...",
  "wompiTransactionId": "...",
  "paymentStatus": "approved"
}
```

**Resultado:**
- Producto 1: 1 × $8,000 = $8,000
- Producto 2: 3 × $3,000 = $9,000
- **Comisión total: $17,000** ✅

---

### Ejemplo 3: Sin Comisión (Se calcula automáticamente)

```json
{
  "items": [
    {
      "productId": "producto_1",
      "quantity": 2,
      "unitPrice": 45800
      // NO se envía commission, se calculará automáticamente
    }
  ],
  "shippingAddressId": "...",
  "wompiTransactionId": "...",
  "paymentStatus": "approved"
}
```

**Resultado:**
- Si el producto tiene `costPrice` configurado:
  - Comisión = (unitPrice - costPrice) × 10%
- Si NO tiene `costPrice`:
  - Comisión = unitPrice × 10%

---

## 📱 Integración Flutter

### Servicio de Transacciones

```dart
// lib/services/transaction_service.dart

Future<Map<String, dynamic>> createTransaction({
  required List<CartItem> items,
  required String shippingAddressId,
  required String wompiTransactionId,
  required String wompiReference,
}) async {
  final itemsData = items.map((item) => {
    'productId': item.productId,
    'quantity': item.quantity,
    'unitPrice': item.price,
    
    // ⭐ ENVIAR COMISIÓN PERSONALIZADA
    'commission': item.commission, // Comisión por unidad
    
    'variations': {
      if (item.selectedColor != null)
        'color': {
          'name': item.selectedColor,
          'code': item.selectedColorCode,
        },
      if (item.selectedSize != null)
        'size': {
          'name': item.selectedSize,
        },
    },
  }).toList();

  final response = await _api.dio.post(
    '/transactions',
    data: {
      'items': itemsData,
      'shippingAddressId': shippingAddressId,
      'wompiTransactionId': wompiTransactionId,
      'wompiReference': wompiReference,
      'paymentStatus': 'approved',
    },
  );

  return response.data;
}
```

### Modelo de Item con Comisión

```dart
// lib/models/cart_item.dart

class CartItem {
  final String productId;
  final String name;
  final int quantity;
  final double price;
  final double commission; // ⭐ Comisión por unidad
  final String? selectedColor;
  final String? selectedSize;

  CartItem({
    required this.productId,
    required this.name,
    required this.quantity,
    required this.price,
    required this.commission, // ⭐ OBLIGATORIO
    this.selectedColor,
    this.selectedSize,
  });

  // Calcular comisión total para este item
  double get totalCommission => commission * quantity;
}
```

### Uso en el Checkout

```dart
// lib/screens/checkout_screen.dart

Future<void> _processPayment() async {
  // 1. Procesar pago con Wompi
  final wompiResult = await _wompiService.processPayment(...);

  if (wompiResult['status'] == 'APPROVED') {
    // 2. Crear items con comisiones
    final cartItems = _cart.items.map((item) => CartItem(
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      commission: item.commission, // ⭐ Desde el producto
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
    )).toList();

    // 3. Crear transacción con comisiones personalizadas
    final result = await _transactionService.createTransaction(
      items: cartItems,
      shippingAddressId: _selectedAddressId,
      wompiTransactionId: wompiResult['id'],
      wompiReference: wompiResult['reference'],
    );

    // 4. Mostrar comisión total ganada
    final totalCommission = result['earnings']['commissionsEarned'];
    _showSuccess('Comisión ganada: \$$totalCommission');
  }
}
```

---

## 🧪 Cómo Probar

### Opción 1: Script Bash (Recomendado)

```bash
# 1. Edita el script y configura tu token
nano test-custom-commission.sh

# 2. Ejecuta
./test-custom-commission.sh
```

Este script:
- ✅ Crea una transacción con comisión de $5,000 por unidad
- ✅ Verifica que la comisión total sea correcta (2 × $5,000 = $10,000)
- ✅ Muestra todos los detalles

### Opción 2: cURL Manual

```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "x-token: TU_TOKEN" \
  -d @ejemplo-transaccion-con-comision.json
```

### Opción 3: Postman/Thunder Client

1. Abre `ejemplo-transaccion-con-comision.json`
2. Reemplaza `TU_PRODUCT_ID_AQUI` y `TU_ADDRESS_ID_AQUI`
3. Configura header: `x-token: TU_TOKEN`
4. Envía POST a `/api/transactions`

---

## 🔍 Verificar en los Logs

Cuando crees una transacción, verás en los logs del servidor:

```
✅ Usando comisión del request: 5000
💰 Item: Polvo Compacto {
  unitPrice: 45800,
  costPrice: 'no configurado',
  margin: 50000,
  commission: '5000 (por unidad)',
  commissionSent: 'SI ✅',
  points: 91,
  quantity: 2,
  totalCommission: 10000
}
💰 Resumen de comisiones: {
  subtotal: 91600,
  totalCommissions: 10000,
  totalPoints: 91,
  itemsCount: 1
}
```

---

## ✅ Verificación de la Respuesta

La respuesta incluirá:

```json
{
  "transaction": {
    "_id": "...",
    "transactionNumber": "TXN-...",
    "totalAmount": 91600
  },
  "earnings": {
    "commissionsEarned": 10000,  // ⭐ Comisión total
    "pointsEarned": 91,
    "status": "pending_delivery"
  },
  "shippingOrder": {
    "_id": "...",
    "orderNumber": "SHIP-...",
    "commission": {
      "amount": 10000,  // ⭐ Misma comisión
      "points": 91,
      "status": "pending"
    }
  }
}
```

---

## 📊 Comparación: Antes vs Ahora

### ❌ Antes (Problema)

```json
// Enviabas
{
  "productId": "...",
  "commission": 5000
}

// Backend ignoraba y calculaba automáticamente
// Resultado: commission = unitPrice × 10% = 4,580
```

### ✅ Ahora (Solucionado)

```json
// Envías
{
  "productId": "...",
  "commission": 5000
}

// Backend usa tu comisión
// Resultado: commission = 5000 ✅
```

---

## 💡 Tips

### 1. Comisión por Unidad
- **Siempre** envía la comisión **por unidad**, no la total
- El backend multiplicará por la cantidad automáticamente

### 2. Múltiples Productos
- Puedes enviar comisiones diferentes para cada producto
- Cada item puede tener su propia comisión

### 3. Comisión Opcional
- Si NO envías `commission`, se calculará automáticamente
- Útil si algunos productos tienen comisión fija y otros calculada

### 4. Validación
- No hay validación de comisión máxima/mínima actualmente
- Puedes enviar cualquier valor (incluso 0 o negativo si es necesario)

---

## 🐛 Troubleshooting

### La comisión sigue siendo calculada automáticamente

**Verifica:**
1. ✅ Estás enviando `commission` dentro de cada `item`
2. ✅ El valor es un número, no un string: `5000` no `"5000"`
3. ✅ Revisa los logs del servidor para ver qué está recibiendo

### La comisión total no coincide

**Recuerda:**
- Comisión total = `commission × quantity`
- Si tienes 2 unidades con comisión de $5,000: Total = $10,000

### No veo la comisión en la respuesta

**Verifica:**
- La respuesta incluye `earnings.commissionsEarned`
- También está en `shippingOrder.commission.amount`
- Ambos deben ser iguales

---

## 📞 Soporte

Si tienes dudas:
1. Ejecuta `./test-custom-commission.sh` para ver un ejemplo funcional
2. Revisa los logs del servidor (`npm run dev`)
3. Verifica el formato del JSON contra `ejemplo-transaccion-con-comision.json`

---

**✅ Sistema actualizado y funcionando**  
Ahora puedes enviar comisiones personalizadas por producto.
