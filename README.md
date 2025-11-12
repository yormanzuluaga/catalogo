# 🛍️ Sistema de Catálogo - Backend API

## 🎯 Sistema Completo de Comercio Electrónico

Backend completo con gestión de productos, transacciones, órdenes de envío y comisiones automáticas.

### ✨ Características Principales

- 🛒 **Catálogo de Productos** - Productos simples y variables con imágenes
- 💳 **Transacciones con Wompi** - Integración de pagos
- 📦 **Órdenes de Envío** - Gestión automática de entregas
- 💰 **Sistema de Comisiones** - Cálculo y depósito automático
- 👛 **Wallet Digital** - Balance y movimientos
- 🔐 **Autenticación JWT** - Sistema seguro de usuarios
- 📍 **Direcciones de Envío** - Gestión de múltiples direcciones

---

## 🚀 INICIO RÁPIDO

### 1. Instalación

```bash
# Clonar repositorio
git clone <tu-repo>

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
nano .env

# Iniciar servidor
npm start
```

### 2. Probar el Sistema

```bash
# Edita y configura tu token
nano test-complete-flow.sh

# Ejecuta la prueba completa
./test-complete-flow.sh
```

### 3. Ver Documentación

Lee `INDICE.md` para navegar toda la documentación.

**Comienza aquí:** [INICIO-RAPIDO.md](./INICIO-RAPIDO.md)

---

## 📚 DOCUMENTACIÓN

### 🎯 Para Empezar
- **[INDICE.md](./INDICE.md)** - Índice completo de documentación
- **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md)** - Guía rápida visual

### 📖 Documentación Técnica
- **[RESUMEN-EJECUTIVO.md](./RESUMEN-EJECUTIVO.md)** - Resumen del proyecto
- **[SISTEMA-ORDENES-ENVIO.md](./SISTEMA-ORDENES-ENVIO.md)** - Sistema de órdenes
- **[FLUTTER_INTEGRATION_COMPLETE.md](./FLUTTER_INTEGRATION_COMPLETE.md)** - Integración Flutter

### 🧪 Scripts de Prueba
- `test-complete-flow.sh` - Prueba completa del flujo
- `test-quick-status.sh` - Consulta rápida de estado

---

## 🔌 API ENDPOINTS

### Autenticación
```
POST   /api/auth/login              Login
POST   /api/auth/register           Registro
GET    /api/auth/renew              Renovar token
```

### Productos
```
GET    /api/products                Listar productos
GET    /api/products/:id            Ver producto
POST   /api/products                Crear producto
PUT    /api/products/:id            Actualizar producto
DELETE /api/products/:id            Eliminar producto
```

### Transacciones
```
POST   /api/transactions            Crear transacción (con pago Wompi)
GET    /api/transactions            Listar transacciones
GET    /api/transactions/:id        Ver detalle
```

### Órdenes de Envío 🆕
```
GET    /api/shipping-orders         Listar órdenes
GET    /api/shipping-orders/summary Resumen de comisiones
GET    /api/shipping-orders/:id     Ver detalle
PUT    /api/shipping-orders/:id/status              Actualizar estado
PUT    /api/shipping-orders/:id/confirm-delivery    Confirmar entrega ⭐
```

### Wallet
```
GET    /api/wallet                  Ver balance
GET    /api/wallet-movements        Ver movimientos
```

### Direcciones
```
GET    /api/addresses               Listar direcciones
POST   /api/addresses               Crear dirección
PUT    /api/addresses/:id           Actualizar dirección
DELETE /api/addresses/:id           Eliminar dirección
```

---

## 🎬 FLUJO PRINCIPAL

```
1. Cliente compra → Wompi aprueba pago
   ↓
2. Backend crea TRANSACCIÓN
   ↓
3. Backend crea ORDEN DE ENVÍO automáticamente
   ↓
4. Comisión aparece como "PENDIENTE" en wallet
   ↓
5. Vendedor ve lista de órdenes pendientes
   ↓
6. Vendedor entrega el pedido
   ↓
7. Vendedor confirma entrega en la orden
   ↓
8. 💰 Comisión se deposita AUTOMÁTICAMENTE en balance
```

---

## 🛠️ TECNOLOGÍAS

- **Node.js** + **Express** - Backend framework
- **MongoDB** + **Mongoose** - Base de datos
- **JWT** - Autenticación
- **Wompi** - Procesamiento de pagos
- **Express Validator** - Validación de datos
- **Multer** - Subida de archivos

---

## 📁 ESTRUCTURA DEL PROYECTO

```
catalogo/
├── src/
│   ├── models/              # Modelos de MongoDB
│   │   ├── shipping_order.model.js    🆕
│   │   ├── transaction.model.js
│   │   ├── wallet.model.js
│   │   ├── product.model.js
│   │   └── ...
│   ├── controllers/         # Lógica de negocio
│   │   ├── shipping_order.controller.js    🆕
│   │   ├── transaction.controller.js       📝
│   │   ├── wallet.controller.js
│   │   └── ...
│   ├── routes/             # Rutas de la API
│   │   ├── shipping_order.routes.js    🆕
│   │   ├── transaction.routes.js
│   │   └── ...
│   ├── middlewares/        # Middleware de validación
│   ├── services/           # Servicios auxiliares
│   └── helpers/            # Funciones auxiliares
├── uploads/                # Archivos subidos
├── migrations/             # Scripts de migración
├── test-*.sh              # Scripts de prueba
└── *.md                   # Documentación

🆕 Nuevo   📝 Modificado
```

---

## 🔧 VARIABLES DE ENTORNO

```env
# Servidor
PORT=8080
NODE_ENV=development

# Base de datos
MONGODB_CNN=mongodb://localhost:27017/catalogo

# JWT
SECRET_JWT_SEED=tu-secret-super-seguro-aqui

# Wompi (opcional)
WOMPI_PUBLIC_KEY=pub_test_xxxxx
WOMPI_PRIVATE_KEY=prv_test_xxxxx
```

---

## 🧪 TESTING

### Prueba Completa del Flujo
```bash
./test-complete-flow.sh
```

Esto probará:
- ✅ Crear transacción
- ✅ Crear orden de envío automáticamente
- ✅ Comisión pendiente en wallet
- ✅ Confirmar entrega
- ✅ Depósito automático de comisión
- ✅ Actualización de balance

### Consulta Rápida
```bash
./test-quick-status.sh
```

Muestra:
- 💰 Estado del wallet
- 📦 Resumen de órdenes
- 📋 Lista de órdenes

---

## 📱 INTEGRACIÓN FLUTTER

La integración completa con Flutter está documentada en:
**[FLUTTER_INTEGRATION_COMPLETE.md](./FLUTTER_INTEGRATION_COMPLETE.md)**

Incluye:
- ✅ Servicios listos para usar
- ✅ Modelos de datos
- ✅ Pantallas completas con código
- ✅ Widgets personalizados
- ✅ Ejemplos de uso

---

## 🆕 NOVEDADES v2.0

### Sistema de Órdenes de Envío
- ✅ Creación automática al aprobar pago
- ✅ Estados: pending → preparing → ready → in_transit → delivered
- ✅ Tracking de fechas
- ✅ Gestión de comisiones

### Depósito Automático de Comisiones
- ✅ Comisiones se registran como "pendientes"
- ✅ Al confirmar entrega, se depositan automáticamente
- ✅ Balance se actualiza en tiempo real
- ✅ Puntos se acreditan automáticamente

### Endpoints Mejorados
- ✅ Respuestas más completas
- ✅ Breakdown de comisiones por producto
- ✅ Información de órdenes en transacciones
- ✅ Resumen de comisiones pendientes

---

## 📊 EJEMPLOS DE USO

### Crear Transacción
```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "x-token: TU_TOKEN" \
  -d '{
    "items": [
      {
        "product": "PRODUCT_ID",
        "quantity": 2,
        "unitPrice": 10000
      }
    ],
    "shippingAddressId": "ADDRESS_ID",
    "wompiTransactionId": "wompi_12345",
    "wompiReference": "REF-12345",
    "paymentStatus": "approved"
  }'
```

### Ver Órdenes Pendientes
```bash
curl -X GET http://localhost:8080/api/shipping-orders/summary \
  -H "x-token: TU_TOKEN"
```

### Confirmar Entrega
```bash
curl -X PUT http://localhost:8080/api/shipping-orders/ORDER_ID/confirm-delivery \
  -H "x-token: TU_TOKEN"
```

---

## 🤝 CONTRIBUIR

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📝 LICENCIA

Este proyecto es privado. Todos los derechos reservados.

---

## 📞 SOPORTE

Para soporte y documentación completa:

1. **Lee primero:** [INDICE.md](./INDICE.md)
2. **Guía rápida:** [INICIO-RAPIDO.md](./INICIO-RAPIDO.md)
3. **Integración Flutter:** [FLUTTER_INTEGRATION_COMPLETE.md](./FLUTTER_INTEGRATION_COMPLETE.md)

---

## ✅ ESTADO DEL PROYECTO

- ✅ Backend: Producción ready
- ✅ API: Completa y documentada
- ✅ Testing: Scripts disponibles
- ✅ Documentación: Completa
- 🚧 Frontend Flutter: En integración

---

## 🎯 ROADMAP

### Actual (v2.0)
- ✅ Sistema de órdenes de envío
- ✅ Depósito automático de comisiones
- ✅ Endpoints completos
- ✅ Documentación completa

### Próximo (v2.1)
- [ ] Notificaciones push
- [ ] Emails automáticos
- [ ] Dashboard de estadísticas
- [ ] Sistema de calificaciones

### Futuro (v3.0)
- [ ] Chat integrado
- [ ] Integración WhatsApp
- [ ] Multi-currency
- [ ] Sistema de devoluciones

---

**🎉 ¡Listo para usar!**

```bash
# Instala y prueba ahora
npm install && npm start

# En otra terminal
./test-complete-flow.sh
```

---

**Versión:** 2.0  
**Última actualización:** Enero 2024  
**Estado:** ✅ Producción Ready
