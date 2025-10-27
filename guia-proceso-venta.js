/**
 * GUÍA COMPLETA PARA CREAR UNA ORDEN/VENTA
 * ========================================
 */

console.log('📋 PROCESO DE VENTA - SISTEMA DE CATÁLOGO');
console.log('='.repeat(50));

console.log('\n🎯 ENDPOINT PRINCIPAL:');
console.log('POST http://localhost:3000/api/orders');
console.log('Headers: x-token: {TU_JWT_TOKEN}');
console.log('Content-Type: application/json');

console.log('\n📝 CAMPOS REQUERIDOS:');
console.log(`
✅ PRODUCTOS (items):
   - product: ID del producto en MongoDB
   - quantity: Cantidad a comprar
   - price: Precio de venta por unidad

✅ INFORMACIÓN GENERAL:
   - totalPrice: Precio total de la orden
   - paymentMethod: Método de pago
   - phone: Teléfono del cliente
   - name: Nombre del cliente

✅ DIRECCIÓN DEL CLIENTE:
   - customerAddress.street: Dirección/calle
   - customerAddress.city: Ciudad
   - customerAddress.department: Departamento
`);

console.log('\n📄 EJEMPLO DE JSON COMPLETO:');
const ejemploOrden = {
  "items": [
    {
      "product": "67123abc456def789012345a", // Reemplaza con ID real
      "quantity": 2,
      "price": 45000,
      "model": "Blusa Elegante",
      "description": "Blusa manga larga, color azul"
    },
    {
      "product": "67123abc456def789012345b", // Reemplaza con ID real
      "quantity": 1, 
      "price": 65000,
      "model": "Pantalón Casual"
    }
  ],
  "totalPrice": 155000,
  "paymentMethod": "transferencia",
  "phone": "3001234567",
  "name": "Ana García",
  "collaborator": "Vendedora María López",
  "customerAddress": {
    "street": "Carrera 15 #32-45",
    "neighborhood": "La Candelaria", 
    "city": "Bogotá",
    "department": "Cundinamarca",
    "postalCode": "110111",
    "country": "Colombia",
    "additionalInfo": "Apartamento 304, edificio azul"
  },
  "discount": [
    {
      "type": "descuento_cliente",
      "price": 10000
    }
  ]
};

console.log(JSON.stringify(ejemploOrden, null, 2));

console.log('\n🔄 PROCESO AUTOMÁTICO:');
console.log(`
1. ✅ Se valida que los productos existan
2. ✅ Se calculan comisiones automáticamente  
3. ✅ Se generan puntos para la vendedora
4. ✅ Se actualiza el wallet de comisiones
5. ✅ Se guarda la orden con toda la información
`);

console.log('\n📊 INFORMACIÓN QUE SE CALCULA AUTOMÁTICAMENTE:');
console.log(`
- 💰 Comisión de la vendedora (20% del margen)
- 🎯 Puntos ganados (1 punto por cada $10,000)
- 📦 Información completa del producto
- ⏰ Timestamps de creación
- 🆔 ID único de la orden
`);

console.log('\n🚀 OTROS ENDPOINTS DISPONIBLES:');
console.log(`
📋 Mis órdenes:
GET /api/orders/my-orders?page=1&limit=10&status=confirmed

🔍 Ver orden específica:
GET /api/orders/{ORDER_ID}

📊 Órdenes por estado:
GET /api/orders/my-orders?status=processing

🏷️ Estados disponibles:
- draft, confirmed, processing, shipped, delivered, cancelled
`);

console.log('\n⚠️  NOTAS IMPORTANTES:');
console.log(`
1. 🔐 Requiere autenticación JWT válida
2. 💼 Los productos deben existir en la base de datos
3. 🧮 El totalPrice debe coincidir con la suma de (price * quantity)
4. 🏠 La dirección es obligatoria para el envío
5. 💳 Los métodos de pago aceptados: efectivo, transferencia, tarjeta
`);

console.log('\n🎉 ¡Listo para procesar ventas!');
console.log('='.repeat(50));
