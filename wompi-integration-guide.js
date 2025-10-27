/**
 * INTEGRACIÓN WOMPI - GUÍA COMPLETA
 * =================================
 * 
 * Esta guía te muestra cómo procesar pagos con Wompi en tu sistema de catálogo
 */

console.log('💳 INTEGRACIÓN WOMPI - PASARELA DE PAGOS');
console.log('='.repeat(60));

console.log('\n📋 CONFIGURACIÓN REQUERIDA:');
console.log(`
1. 🔑 CREDENCIALES DE WOMPI (en .env):
   - WOMPI_ENV=sandbox (o production)
   - WOMPI_PUBLIC_KEY=pub_test_tu_key_aqui
   - WOMPI_PRIVATE_KEY=prv_test_tu_key_aqui
   - WOMPI_EVENT_SECRET=tu_event_secret_aqui

2. 📧 REGISTRO EN WOMPI:
   - Crea cuenta en https://wompi.com
   - Obtén tus credenciales de prueba
   - Configura webhook URL: https://tu-dominio.com/api/payments/webhook
`);

console.log('\n🚀 FLUJO COMPLETO DE PAGO:');
console.log(`
PASO 1: Crear la orden
POST /api/orders
{
  "items": [...],
  "totalPrice": 150000,
  "name": "Juan Pérez",
  "phone": "3001234567",
  "customerAddress": {...}
}

PASO 2: Crear pago para la orden
POST /api/payments/order/{ORDER_ID}
{
  "use_payment_link": true,
  "redirect_url": "https://tu-app.com/payment-success"
}

PASO 3: Cliente paga usando el link generado
PASO 4: Wompi notifica vía webhook
PASO 5: Consultar estado del pago
GET /api/payments/order/{ORDER_ID}/status
`);

console.log('\n💡 EJEMPLOS PRÁCTICOS:');

// Ejemplo 1: Crear pago con link (Recomendado)
const ejemploPaymentLink = {
    "use_payment_link": true,
    "redirect_url": "https://mi-tienda.com/orders/success"
};

console.log('\n📄 EJEMPLO 1 - CREAR PAGO CON LINK:');
console.log('POST /api/payments/order/ORDER_ID_AQUI');
console.log('Headers: x-token: TU_JWT_TOKEN');
console.log('Body:', JSON.stringify(ejemploPaymentLink, null, 2));

// Ejemplo 2: Pago directo (requiere más datos)
const ejemploPaymentDirect = {
    "use_payment_link": false,
    "payment_method": "CARD",
    "customer_document": "12345678",
    "redirect_url": "https://mi-tienda.com/orders/success"
};

console.log('\n📄 EJEMPLO 2 - PAGO DIRECTO:');
console.log('POST /api/payments/order/ORDER_ID_AQUI');
console.log('Body:', JSON.stringify(ejemploPaymentDirect, null, 2));

console.log('\n📊 RESPUESTA EXITOSA:');
const respuestaExitosa = {
    "ok": true,
    "msg": "Pago creado exitosamente",
    "payment": {
        "order_id": "67123abc456def789012345a",
        "reference": "ORDER_67123abc456def789012345a_1761512345678",
        "amount": 150000,
        "amount_in_cents": 15000000,
        "payment_url": "https://checkout.wompi.co/l/abcd1234",
        "payment_id": "1234567890",
        "status": "pending"
    }
};

console.log(JSON.stringify(respuestaExitosa, null, 2));

console.log('\n🔔 WEBHOOK DE WOMPI:');
console.log(`
Wompi enviará notificaciones a: /api/payments/webhook

Eventos principales:
- transaction.updated: Cuando cambia el estado del pago
- payment_link.updated: Cuando se actualiza el link de pago

Estados de pago:
- PENDING: Pendiente de pago
- APPROVED: Pago aprobado
- DECLINED: Pago rechazado
- VOIDED: Pago anulado
`);

console.log('\n🔍 CONSULTAR ESTADO DE PAGO:');
console.log('GET /api/payments/order/ORDER_ID/status');
console.log('Headers: x-token: TU_JWT_TOKEN');

const respuestaEstado = {
    "ok": true,
    "payment": {
        "order_id": "67123abc456def789012345a",
        "status": "approved",
        "transaction_id": "12345-67890-abcdef",
        "payment_method": "CARD",
        "amount": 150000,
        "payment_date": "2025-10-26T15:30:00.000Z",
        "receipt_url": "https://wompi.com/receipt/12345"
    }
};

console.log('Respuesta:', JSON.stringify(respuestaEstado, null, 2));

console.log('\n💳 MÉTODOS DE PAGO SOPORTADOS:');
console.log(`
- CARD: Tarjetas de crédito/débito
- NEQUI: Billetera digital Nequi
- PSE: Pagos Seguros en Línea
- BANCOLOMBIA_TRANSFER: Transferencia Bancolombia
- BANCOLOMBIA_COLLECT: Recaudo Bancolombia
`);

console.log('\n🛡️ SEGURIDAD:');
console.log(`
✅ Webhooks firmados con HMAC SHA256
✅ URLs de pago temporales y seguras
✅ Validación de referencias únicas
✅ Encriptación TLS en todas las comunicaciones
`);

console.log('\n📱 INTEGRACIÓN FRONTEND:');
console.log(`
1. Crear la orden desde tu app
2. Llamar al endpoint de crear pago
3. Redirigir al usuario al payment_url
4. El usuario completa el pago en Wompi
5. Wompi redirige de vuelta a tu app
6. Consultar el estado final del pago
`);

console.log('\n🔧 CONFIGURACIÓN EN WOMPI:');
console.log(`
1. Panel de Wompi → Configuración → Webhooks
2. URL: https://tu-dominio.com/api/payments/webhook
3. Eventos: transaction.updated, payment_link.updated
4. Copiar el Event Secret al .env
`);

console.log('\n✅ VENTAJAS DE ESTA INTEGRACIÓN:');
console.log(`
🚀 Links de pago seguros y fáciles
💰 Múltiples métodos de pago
📱 Optimizado para móviles
🔔 Notificaciones automáticas via webhook
📊 Tracking completo de pagos
🛡️ Cumple con normativas de seguridad
💼 Integración con sistema de comisiones
`);

console.log('\n🎉 ¡INTEGRACIÓN LISTA!');
console.log('='.repeat(60));
