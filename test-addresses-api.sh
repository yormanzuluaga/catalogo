#!/bin/bash

# Script para probar la API de direcciones independiente
# Autor: Sistema de catálogo
# Fecha: 6 de noviembre de 2025

BASE_URL="http://localhost:3000/api"
TOKEN=""
ADDRESS_ID=""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================="
echo -e "TESTING API DE DIRECCIONES INDEPENDIENTE"
echo -e "==================================================${NC}"

# Función para hacer login
login() {
    echo -e "${YELLOW}1. Haciendo login para obtener token...${NC}"
    
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signIn" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@correo.com",
            "password": "123456"
        }')
    
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
    
    if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
        echo -e "${GREEN}✓ Login exitoso${NC}"
        echo "Token: ${TOKEN:0:50}..."
    else
        echo -e "${RED}✗ Error en login${NC}"
        echo "Response: $LOGIN_RESPONSE"
        echo -e "${CYAN}Nota: Asegúrate de que exista un usuario con email 'test@correo.com' y password '123456'${NC}"
        exit 1
    fi
}

# Función para obtener direcciones existentes
get_addresses() {
    echo -e "${YELLOW}2. Obteniendo direcciones del usuario...${NC}"
    
    ADDRESSES_RESPONSE=$(curl -s -X GET "$BASE_URL/addresses" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Direcciones actuales:"
    echo $ADDRESSES_RESPONSE | jq '.'
    
    # Verificar si hay direcciones existentes
    TOTAL=$(echo $ADDRESSES_RESPONSE | jq -r '.total')
    if [ "$TOTAL" != "null" ] && [ "$TOTAL" -gt 0 ]; then
        echo -e "${GREEN}✓ Se encontraron $TOTAL direcciones${NC}"
    else
        echo -e "${CYAN}ℹ️ No hay direcciones existentes${NC}"
    fi
}

# Función para crear nueva dirección
create_address() {
    echo -e "${YELLOW}3. Creando nueva dirección...${NC}"
    
    CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/addresses" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Casa de Prueba",
            "fullName": "Usuario Test",
            "phone": "+57 300 123 4567",
            "address": "Calle 123 #45-67, Apartamento 101",
            "city": "Medellín",
            "state": "Antioquia", 
            "country": "Colombia",
            "postalCode": "050001",
            "neighborhood": "El Poblado",
            "instructions": "Portería blanca, timbre 101. Dejar con el portero si no hay nadie.",
            "isDefault": true,
            "coordinates": {
                "latitude": 6.2442,
                "longitude": -75.5812
            }
        }')
    
    ADDRESS_ID=$(echo $CREATE_RESPONSE | jq -r '.address.uid')
    
    if [ "$ADDRESS_ID" != "null" ] && [ "$ADDRESS_ID" != "" ]; then
        echo -e "${GREEN}✓ Dirección creada exitosamente${NC}"
        echo "ID de la nueva dirección: $ADDRESS_ID"
        echo "Respuesta completa:"
        echo $CREATE_RESPONSE | jq '.'
    else
        echo -e "${RED}✗ Error creando dirección${NC}"
        echo "Response: $CREATE_RESPONSE"
    fi
}

# Función para obtener dirección específica
get_specific_address() {
    if [ "$ADDRESS_ID" != "null" ] && [ "$ADDRESS_ID" != "" ]; then
        echo -e "${YELLOW}4. Obteniendo dirección específica por ID...${NC}"
        
        SPECIFIC_RESPONSE=$(curl -s -X GET "$BASE_URL/addresses/$ADDRESS_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        echo "Dirección específica:"
        echo $SPECIFIC_RESPONSE | jq '.'
    else
        echo -e "${YELLOW}4. Saltando obtención específica - no hay dirección creada${NC}"
    fi
}

# Función para obtener dirección predeterminada
get_default_address() {
    echo -e "${YELLOW}5. Obteniendo dirección predeterminada...${NC}"
    
    DEFAULT_RESPONSE=$(curl -s -X GET "$BASE_URL/addresses/default" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Dirección predeterminada:"
    echo $DEFAULT_RESPONSE | jq '.'
}

# Función para actualizar dirección
update_address() {
    if [ "$ADDRESS_ID" != "null" ] && [ "$ADDRESS_ID" != "" ]; then
        echo -e "${YELLOW}6. Actualizando dirección...${NC}"
        
        UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/addresses/$ADDRESS_ID" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "title": "Casa Actualizada",
                "fullName": "Usuario Test Actualizado",
                "phone": "+57 300 123 4567",
                "address": "Calle 123 #45-67, Apartamento 101",
                "city": "Medellín",
                "state": "Antioquia",
                "country": "Colombia",
                "postalCode": "050001",
                "neighborhood": "El Poblado",
                "instructions": "Dirección actualizada. Portería blanca, timbre 101.",
                "isDefault": true
            }')
        
        echo "Respuesta de actualización:"
        echo $UPDATE_RESPONSE | jq '.'
    else
        echo -e "${YELLOW}6. Saltando actualización - no hay dirección para actualizar${NC}"
    fi
}

# Función para crear segunda dirección
create_second_address() {
    echo -e "${YELLOW}7. Creando segunda dirección...${NC}"
    
    CREATE2_RESPONSE=$(curl -s -X POST "$BASE_URL/addresses" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Oficina",
            "fullName": "Usuario Test Trabajo",
            "phone": "+57 311 987 6543",
            "address": "Carrera 70 #23-45, Torre B, Piso 12",
            "city": "Bogotá",
            "state": "Cundinamarca",
            "country": "Colombia",
            "postalCode": "110111",
            "neighborhood": "Zona Rosa",
            "instructions": "Torre B, ascensor derecho, oficina 1205",
            "isDefault": false
        }')
    
    ADDRESS_ID_2=$(echo $CREATE2_RESPONSE | jq -r '.address.uid')
    
    if [ "$ADDRESS_ID_2" != "null" ] && [ "$ADDRESS_ID_2" != "" ]; then
        echo -e "${GREEN}✓ Segunda dirección creada${NC}"
        echo "ID: $ADDRESS_ID_2"
        echo "Respuesta:"
        echo $CREATE2_RESPONSE | jq '.'
    else
        echo -e "${RED}✗ Error creando segunda dirección${NC}"
        echo "Response: $CREATE2_RESPONSE"
    fi
}

# Función para establecer dirección como default
set_default() {
    if [ "$ADDRESS_ID_2" != "null" ] && [ "$ADDRESS_ID_2" != "" ]; then
        echo -e "${YELLOW}8. Estableciendo segunda dirección como predeterminada...${NC}"
        
        DEFAULT_RESPONSE=$(curl -s -X PATCH "$BASE_URL/addresses/$ADDRESS_ID_2/default" \
            -H "Authorization: Bearer $TOKEN")
        
        echo "Respuesta:"
        echo $DEFAULT_RESPONSE | jq '.'
    else
        echo -e "${YELLOW}8. Saltando set default - no hay segunda dirección${NC}"
    fi
}

# Función para mostrar todas las direcciones después de cambios
show_all_after_changes() {
    echo -e "${YELLOW}9. Mostrando todas las direcciones después de los cambios...${NC}"
    
    ALL_RESPONSE=$(curl -s -X GET "$BASE_URL/addresses" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Todas las direcciones:"
    echo $ALL_RESPONSE | jq '.'
}

# Función para eliminar primera dirección
delete_first_address() {
    if [ "$ADDRESS_ID" != "null" ] && [ "$ADDRESS_ID" != "" ]; then
        echo -e "${YELLOW}10. Eliminando primera dirección...${NC}"
        
        DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/addresses/$ADDRESS_ID" \
            -H "Authorization: Bearer $TOKEN")
        
        echo "Respuesta de eliminación:"
        echo $DELETE_RESPONSE | jq '.'
    else
        echo -e "${YELLOW}10. Saltando eliminación - no hay dirección para eliminar${NC}"
    fi
}

# Función para mostrar estado final
final_state() {
    echo -e "${YELLOW}11. Estado final de direcciones...${NC}"
    
    FINAL_RESPONSE=$(curl -s -X GET "$BASE_URL/addresses" \
        -H "Authorization: Bearer $TOKEN")
    
    echo "Estado final:"
    echo $FINAL_RESPONSE | jq '.'
}

# Función principal que ejecuta todas las pruebas
main() {
    login
    get_addresses
    create_address
    get_specific_address
    get_default_address
    update_address
    create_second_address
    set_default
    show_all_after_changes
    delete_first_address
    final_state
    
    echo -e "${BLUE}=================================================="
    echo -e "TESTING COMPLETADO"
    echo -e "==================================================${NC}"
    echo -e "${GREEN}✓ API de direcciones independiente funcionando correctamente${NC}"
    echo -e "${CYAN}📋 Endpoints probados:${NC}"
    echo -e "   • GET /api/addresses (obtener todas)"
    echo -e "   • GET /api/addresses/default (obtener predeterminada)"
    echo -e "   • GET /api/addresses/:id (obtener específica)"
    echo -e "   • POST /api/addresses (crear)"
    echo -e "   • PUT /api/addresses/:id (actualizar)"
    echo -e "   • PATCH /api/addresses/:id/default (establecer default)"
    echo -e "   • DELETE /api/addresses/:id (eliminar)"
}

# Verificar dependencias
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq no está instalado. Instalar con:${NC}"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl no está instalado${NC}"
    exit 1
fi

# Ejecutar script principal
main
