#!/bin/bash

# 🧪 SCRIPT DE PRUEBA - Crear transacción con comisión personalizada

echo "🚀 PROBANDO TRANSACCIÓN CON COMISIÓN PERSONALIZADA"
echo "=================================================="
echo ""

# Configuración
BASE_URL="http://localhost:8080/api"
TOKEN="TU_TOKEN_JWT_AQUI" # ⚠️ REEMPLAZAR CON TU TOKEN

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Validar token
if [ "$TOKEN" == "TU_TOKEN_JWT_AQUI" ]; then
    echo -e "${RED}❌ ERROR: Debes configurar tu TOKEN en el script${NC}"
    exit 1
fi

# Obtener dirección de envío
echo "📍 Obteniendo dirección de envío..."
ADDRESS_RESPONSE=$(curl -s -X GET "$BASE_URL/addresses" \
  -H "x-token: $TOKEN")

ADDRESS_ID=$(echo $ADDRESS_RESPONSE | jq -r '.addresses[0]._id // empty')

if [ -z "$ADDRESS_ID" ]; then
    echo -e "${RED}❌ ERROR: No se encontró ninguna dirección${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dirección: $ADDRESS_ID${NC}"
echo ""

# Obtener producto
echo "📦 Obteniendo producto..."
PRODUCT_RESPONSE=$(curl -s -X GET "$BASE_URL/products?limit=1" \
  -H "x-token: $TOKEN")

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.products[0]._id // empty')
PRODUCT_NAME=$(echo $PRODUCT_RESPONSE | jq -r '.products[0].name // "Producto"')
PRODUCT_PRICE=$(echo $PRODUCT_RESPONSE | jq -r '.products[0].pricing.price // 10000')

if [ -z "$PRODUCT_ID" ]; then
    echo -e "${RED}❌ ERROR: No se encontró ningún producto${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Producto: $PRODUCT_NAME ($PRODUCT_ID)${NC}"
echo -e "${BLUE}   Precio: $$PRODUCT_PRICE${NC}"
echo ""

# Crear transacción con comisión personalizada
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💰 Creando transacción con comisión personalizada...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CUSTOM_COMMISSION=5000
echo -e "${GREEN}   Comisión personalizada: $$CUSTOM_COMMISSION por unidad${NC}"
echo ""

TRANSACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "x-token: $TOKEN" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID\",
        \"quantity\": 2,
        \"unitPrice\": $PRODUCT_PRICE,
        \"commission\": $CUSTOM_COMMISSION
      }
    ],
    \"shippingAddressId\": \"$ADDRESS_ID\",
    \"customerNotes\": \"Prueba con comisión personalizada de \$$CUSTOM_COMMISSION\",
    \"wompiTransactionId\": \"wompi_test_$(date +%s)\",
    \"wompiReference\": \"TEST-COMMISSION-$(date +%s)\",
    \"paymentStatus\": \"approved\",
    \"paymentMethod\": \"CARD\"
  }")

# Verificar si hubo error
if echo "$TRANSACTION_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR al crear transacción:${NC}"
    echo "$TRANSACTION_RESPONSE" | jq '.'
    exit 1
fi

# Verificar si la respuesta es válida
if ! echo "$TRANSACTION_RESPONSE" | jq -e '.transaction' > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Respuesta inesperada del servidor${NC}"
    echo "$TRANSACTION_RESPONSE"
    exit 1
fi

TRANSACTION_ID=$(echo $TRANSACTION_RESPONSE | jq -r '.transaction._id // empty')
ORDER_ID=$(echo $TRANSACTION_RESPONSE | jq -r '.shippingOrder._id // empty')
COMMISSION_RECEIVED=$(echo $TRANSACTION_RESPONSE | jq -r '.earnings.commissionsEarned // 0')

echo -e "${GREEN}✅ Transacción creada exitosamente${NC}"
echo ""

# Mostrar información detallada
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 RESUMEN DE LA TRANSACCIÓN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Transaction ID:     $TRANSACTION_ID"
echo "Shipping Order ID:  $ORDER_ID"
echo ""
echo "📦 Producto:        $PRODUCT_NAME"
echo "   Cantidad:        2 unidades"
echo "   Precio unitario: \$$PRODUCT_PRICE"
echo ""
echo "💰 Comisión:"
echo -e "${YELLOW}   Enviada:         \$$CUSTOM_COMMISSION por unidad${NC}"
echo -e "${GREEN}   Total recibida:  \$$COMMISSION_RECEIVED${NC}"
echo ""

# Verificar que la comisión sea correcta
EXPECTED_COMMISSION=$((CUSTOM_COMMISSION * 2))

if [ "$COMMISSION_RECEIVED" == "$EXPECTED_COMMISSION" ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ ¡ÉXITO! La comisión personalizada fue aplicada correctamente${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Comisión enviada:    \$$CUSTOM_COMMISSION x 2 = \$$EXPECTED_COMMISSION"
    echo "Comisión recibida:   \$$COMMISSION_RECEIVED"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  ADVERTENCIA: La comisión no coincide${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Esperado:  \$$EXPECTED_COMMISSION (\$$CUSTOM_COMMISSION x 2)"
    echo "Recibido:  \$$COMMISSION_RECEIVED"
fi
echo ""

# Mostrar detalles completos
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 DETALLES COMPLETOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "$TRANSACTION_RESPONSE" | jq '{
  transaction: {
    _id: .transaction._id,
    transactionNumber: .transaction.transactionNumber,
    totalAmount: .transaction.totalAmount
  },
  earnings: .earnings,
  shippingOrder: {
    _id: .shippingOrder._id,
    orderNumber: .shippingOrder.orderNumber,
    commission: .shippingOrder.commission
  }
}'
echo ""

echo -e "${GREEN}🎉 Prueba completada${NC}"
