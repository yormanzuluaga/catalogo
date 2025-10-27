/**
 * Ejemplos prácticos de uso del Sistema de Catálogo para Vendedoras
 * Ejecutar con: node examples-sellers-catalog.js
 */

// ==================== EJEMPLOS DE JSON PARA CREAR PRODUCTOS ====================

console.log('📋 EJEMPLOS DE JSON PARA CREAR PRODUCTOS EN EL SISTEMA DE CATÁLOGO\n');

// 1. PRODUCTO SIMPLE PARA VENDEDORAS
console.log('1️⃣ PRODUCTO SIMPLE CON COMISIONES Y PUNTOS:');
const productoSimple = {
  "name": "Crema Facial Anti-Edad",
  "brand": "BeautyPro",
  "description": "Crema facial con colágeno y vitamina E, ideal para reducir arrugas",
  "productType": "simple",
  "category": "64f123456789abcdef123456", // ID de categoría "Belleza"
  
  // Información de precios y ganancias
  "pricing": {
    "costPrice": 25,        // Costo del producto
    "salePrice": 55,        // Precio de venta al público
    "commission": 12        // Comisión para la vendedora
    // profit se calcula automáticamente: $30 (54.55%)
  },
  
  // Sistema de puntos
  "points": {
    "earnPoints": 5,        // Puntos que gana el cliente
    "redeemPoints": 8       // Puntos para obtener gratis
  },
  
  // Datos del producto simple
  "simpleProduct": {
    "pricing": {
      "costPrice": 25,
      "salePrice": 55,
      "commission": 12
    },
    "points": {
      "earnPoints": 5,
      "redeemPoints": 8
    },
    "stock": 100,
    "barcode": "7890123456789"
  },
  
  // Detalles del producto
  "details": {
    "specifications": [
      { "name": "Contenido", "value": "50", "unit": "ml" },
      { "name": "Tipo de piel", "value": "Todo tipo de piel" },
      { "name": "Ingrediente activo", "value": "Colágeno hidrolizado" }
    ],
    "features": [
      "Reduce arrugas visibles",
      "Hidratación 24 horas",
      "Con protección UV",
      "Dermatológicamente probado"
    ],
    "included": [
      "Crema facial 50ml",
      "Manual de aplicación"
    ],
    "careInstructions": "Aplicar en rostro limpio, mañana y noche"
  },
  
  // Garantía
  "warranty": {
    "hasWarranty": true,
    "duration": { "value": 6, "unit": "meses" },
    "type": "tienda",
    "coverage": ["Defectos de fabricación"],
    "terms": "Garantía válida con comprobante de compra"
  },
  
  // Descuentos disponibles
  "discount": [
    {
      "type": "percentage",
      "value": 15,
      "startDate": "2025-10-25T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.000Z",
      "minQuantity": 1
    },
    {
      "type": "fixed",
      "value": 10,
      "minQuantity": 3  // Descuento por comprar 3 o más
    }
  ],
  
  "deliveryTime": "1-2 días hábiles"
};

console.log(JSON.stringify(productoSimple, null, 2));

console.log('\n' + '='.repeat(80) + '\n');

// 2. PRODUCTO CON VARIANTES PARA VENDEDORAS
console.log('2️⃣ PRODUCTO CON VARIANTES - ROPA:');
const productoVariantes = {
  "name": "Blusa Elegante Oficina",
  "brand": "Fashion Elite",
  "description": "Blusa elegante perfecta para oficina, disponible en múltiples colores y tallas",
  "productType": "variant",
  "subCategory": "64f987654321abcdef654321", // ID de subcategoría "Blusas"
  
  // Precios base del producto
  "pricing": {
    "costPrice": 20,
    "salePrice": 45,
    "commission": 8
  },
  "points": {
    "earnPoints": 4,
    "redeemPoints": 7
  },
  
  // Detalles del producto
  "details": {
    "specifications": [
      { "name": "Material", "value": "95% Poliéster, 5% Elastano" },
      { "name": "Cuidado", "value": "Lavado a máquina 30°C" },
      { "name": "Origen", "value": "Importado" }
    ],
    "features": [
      "Tela que no se arruga",
      "Corte moderno y cómodo",
      "Ideal para oficina",
      "Fácil cuidado"
    ],
    "included": ["Blusa"],
    "careInstructions": "Lavar con colores similares, no usar blanqueador"
  },
  
  "warranty": {
    "hasWarranty": true,
    "duration": { "value": 3, "unit": "meses" },
    "type": "tienda",
    "coverage": ["Defectos de confección", "Decoloración prematura"]
  },
  
  // Variantes con diferentes precios y comisiones
  "variants": [
    {
      "sku": "BLUSA-ELE-BLANCO-S",
      "color": { "name": "Blanco", "code": "#FFFFFF" },
      "size": "S",
      "measurements": {
        "custom": [
          { "name": "Busto", "value": 88, "unit": "cm" },
          { "name": "Cintura", "value": 68, "unit": "cm" },
          { "name": "Largo", "value": 60, "unit": "cm" }
        ]
      },
      "pricing": {
        "costPrice": 18,
        "salePrice": 42,
        "commission": 7
      },
      "points": {
        "earnPoints": 4,
        "redeemPoints": 6
      },
      "stock": 15,
      "barcode": "1111111111111",
      "available": true
    },
    {
      "sku": "BLUSA-ELE-BLANCO-M",
      "color": { "name": "Blanco", "code": "#FFFFFF" },
      "size": "M",
      "measurements": {
        "custom": [
          { "name": "Busto", "value": 92, "unit": "cm" },
          { "name": "Cintura", "value": 72, "unit": "cm" },
          { "name": "Largo", "value": 62, "unit": "cm" }
        ]
      },
      "pricing": {
        "costPrice": 18,
        "salePrice": 42,
        "commission": 7
      },
      "points": {
        "earnPoints": 4,
        "redeemPoints": 6
      },
      "stock": 20,
      "barcode": "1111111111112",
      "available": true
    },
    {
      "sku": "BLUSA-ELE-NEGRO-M",
      "color": { "name": "Negro", "code": "#000000" },
      "size": "M",
      "measurements": {
        "custom": [
          { "name": "Busto", "value": 92, "unit": "cm" },
          { "name": "Cintura", "value": 72, "unit": "cm" },
          { "name": "Largo", "value": 62, "unit": "cm" }
        ]
      },
      "pricing": {
        "costPrice": 20,
        "salePrice": 45,
        "commission": 8
      },
      "points": {
        "earnPoints": 4,
        "redeemPoints": 7
      },
      "stock": 18,
      "barcode": "1111111111113",
      "available": true
    },
    {
      "sku": "BLUSA-ELE-AZUL-L",
      "color": { "name": "Azul Marino", "code": "#000080" },
      "size": "L",
      "measurements": {
        "custom": [
          { "name": "Busto", "value": 96, "unit": "cm" },
          { "name": "Cintura", "value": 76, "unit": "cm" },
          { "name": "Largo", "value": 64, "unit": "cm" }
        ]
      },
      "pricing": {
        "costPrice": 20,
        "salePrice": 47,
        "commission": 9  // Mejor comisión para talla L
      },
      "points": {
        "earnPoints": 5,
        "redeemPoints": 7
      },
      "stock": 12,
      "barcode": "1111111111114",
      "available": true
    }
  ],
  
  "discount": [
    {
      "type": "percentage",
      "value": 20,
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-11-30T23:59:59.000Z",
      "minQuantity": 1
    }
  ]
};

console.log(JSON.stringify(productoVariantes, null, 2));

console.log('\n' + '='.repeat(80) + '\n');

// 3. ENDPOINTS PARA USAR EN POSTMAN O INSOMNIA
console.log('3️⃣ ENDPOINTS PARA VENDEDORAS:');

const endpoints = {
  "1_crear_producto_simple": {
    "method": "POST",
    "url": "/api/products/",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_JWT_TOKEN"
    },
    "body": "// Usar productoSimple de arriba"
  },
  
  "2_crear_producto_variantes": {
    "method": "POST", 
    "url": "/api/products/variants",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_JWT_TOKEN"
    },
    "body": "// Usar productoVariantes de arriba"
  },
  
  "3_catalogo_vendedoras": {
    "method": "GET",
    "url": "/api/products/sellers/catalog?minCommission=5&hasDiscount=true&limit=20",
    "headers": {
      "Authorization": "Bearer YOUR_JWT_TOKEN"
    },
    "description": "Obtener productos con comisión mínima de $5 y que tengan descuento"
  },
  
  "4_detalles_producto": {
    "method": "GET", 
    "url": "/api/products/sellers/details/PRODUCT_ID",
    "headers": {
      "Authorization": "Bearer YOUR_JWT_TOKEN"
    },
    "description": "Detalles completos para mostrar al cliente"
  },
  
  "5_calcular_comision": {
    "method": "POST",
    "url": "/api/products/sellers/calculate-commission",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_JWT_TOKEN"
    },
    "body": {
      "productId": "PRODUCT_ID",
      "variantSku": "BLUSA-ELE-NEGRO-M", // Opcional
      "quantity": 2
    },
    "description": "Calcular precio final, descuentos y comisión"
  },
  
  "6_buscar_productos": {
    "method": "GET",
    "url": "/api/products/search/variants?color=Negro&minPrice=30&hasDiscount=true&minPoints=5",
    "headers": {
      "Authorization": "Bearer YOUR_JWT_TOKEN"
    },
    "description": "Buscar productos negros, precio mínimo $30, con descuento y mínimo 5 puntos"
  }
};

console.log(JSON.stringify(endpoints, null, 2));

console.log('\n' + '='.repeat(80) + '\n');

// 4. FLUJO DE TRABAJO PARA VENDEDORAS
console.log('4️⃣ FLUJO DE TRABAJO PARA VENDEDORAS:');

const flujoTrabajo = {
  "paso_1_explorar_catalogo": {
    "descripcion": "Ver productos disponibles con buenas comisiones",
    "endpoint": "GET /api/products/sellers/catalog?minCommission=8",
    "resultado": "Lista de productos con información de comisiones y descuentos"
  },
  
  "paso_2_mostrar_producto": {
    "descripcion": "Mostrar detalles completos al cliente",
    "endpoint": "GET /api/products/sellers/details/:id",
    "resultado": "Especificaciones, garantía, variantes, precios"
  },
  
  "paso_3_configurar_venta": {
    "descripcion": "Cliente elige variante y cantidad",
    "datos_necesarios": ["productId", "variantSku (si aplica)", "quantity"]
  },
  
  "paso_4_calcular_total": {
    "descripcion": "Obtener precio final con descuentos",
    "endpoint": "POST /api/products/sellers/calculate-commission",
    "resultado": "Precio final, descuento aplicado, comisión, puntos, stock"
  },
  
  "paso_5_confirmar_venta": {
    "descripcion": "Verificar stock y proceder con la venta",
    "notas": "El sistema ya verificó disponibilidad en paso 4"
  }
};

console.log(JSON.stringify(flujoTrabajo, null, 2));

console.log('\n' + '='.repeat(80) + '\n');

// 5. EJEMPLOS DE RESPUESTAS DEL SISTEMA
console.log('5️⃣ EJEMPLOS DE RESPUESTAS DEL SISTEMA:');

const ejemplosRespuestas = {
  "catalogo_respuesta": {
    "total": 15,
    "products": [
      {
        "uid": "64f123456789abcdef123456",
        "name": "Blusa Elegante Oficina",
        "brand": "Fashion Elite",
        "img": "https://bucket.s3.amazonaws.com/products/image1.jpg",
        "priceRange": { "min": 42, "max": 47 },
        "commissionRange": { "min": 7, "max": 9 },
        "pointsRange": { "min": 4, "max": 5 },
        "totalStock": 65,
        "hasVariants": true,
        "variantCount": 4,
        "discountInfo": {
          "hasActiveDiscount": true,
          "discounts": [{ "type": "percentage", "value": 20 }]
        }
      }
    ]
  },
  
  "calculo_comision": {
    "saleCalculation": {
      "productId": "64f123456789abcdef123456",
      "variantSku": "BLUSA-ELE-NEGRO-M",
      "quantity": 2,
      "unitPrice": 45,
      "totalPrice": 72,        // $90 - $18 descuento
      "unitCommission": 8,
      "totalCommission": 16,
      "unitPoints": 4,
      "totalPoints": 8,
      "availableStock": 18,
      "discountApplied": {
        "type": "percentage",
        "value": 20,
        "amount": 18
      }
    },
    "productName": "Blusa Elegante Oficina"
  }
};

console.log(JSON.stringify(ejemplosRespuestas, null, 2));

console.log('\n🎉 SISTEMA COMPLETO LISTO PARA VENDEDORAS! 🎉');
console.log('\n📝 Características implementadas:');
console.log('✅ Precios de costo y venta');
console.log('✅ Cálculo automático de ganancias');
console.log('✅ Sistema de comisiones para vendedoras');
console.log('✅ Sistema de puntos de recompensa');
console.log('✅ Descuentos por porcentaje y cantidad');
console.log('✅ Productos simples y con variantes');
console.log('✅ Endpoints específicos para vendedoras');
console.log('✅ Calculadora de comisiones');
console.log('✅ Búsqueda avanzada con filtros');
console.log('✅ Información de stock en tiempo real');

module.exports = {
  productoSimple,
  productoVariantes,
  endpoints,
  flujoTrabajo,
  ejemplosRespuestas
};
