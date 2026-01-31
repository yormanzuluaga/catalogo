require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
const fileUpload = require('express-fileupload')
const path = require('path');

const app = express();

const auth = require('./routes/auth.routes');
const category = require('./routes/category.routes');
const subCategory = require('./routes/sub_category.routes');
const products = require('./routes/products.routes');
const search = require('./routes/search.routes');
const user = require('./routes/user.routes');
const role = require('./routes/role.routes');
const uploads = require('./routes/uploads.routes');
const wallet = require('./routes/wallet.routes');
const orden = require('./routes/orden.routes');
const payment = require('./routes/payment.routes');
const brand = require('./routes/brand.routes');
const address = require('./routes/address.routes');
const filter = require('./routes/filter.routes'); // 🆕 Filtros por categoría
const transactionV2 = require('./routes/transaction_v2.routes'); // 🆕 V2
const shippingOrderV2 = require('./routes/shipping_order_v2.routes'); // 🆕 V2
const catalogV2 = require('./routes/catalog_v2.routes'); // 🆕 V2
const banner = require('./routes/banner.routes'); // 🆕 Banners promocionales
const withdrawal = require('./routes/withdrawal.routes'); // 🆕 Retiros de balance

app.use(cors())

app.set('port', process.env.PORT || 3000)

// Morgan con filtro para excluir archivos estáticos
app.use(morgan('dev', {
    skip: function (req, res) {
        // Ignorar archivos estáticos del panel admin
        if (req.url.startsWith('/admin/') && (
            req.url.endsWith('.html') ||
            req.url.endsWith('.css') ||
            req.url.endsWith('.js') ||
            req.url.endsWith('.png') ||
            req.url.endsWith('.jpg') ||
            req.url.endsWith('.jpeg') ||
            req.url.endsWith('.gif') ||
            req.url.endsWith('.ico') ||
            req.url.endsWith('.svg')
        )) {
            return true;
        }
        // Ignorar respuestas 304 (Not Modified)
        return res.statusCode === 304;
    }
}))

app.use(fileUpload({
    useTempFiles: false,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    abortOnLimit: true,
    debug: false
}))
app.use(express.json())

// Servir archivos estáticos del panel de administración
app.use('/admin', express.static(path.join(__dirname, '../public/admin')))

// Rutas de la API
app.use('/api/auth', auth)
app.use('/api/category', category)
app.use('/api/subcategory', subCategory)
app.use('/api/products', products)
app.use('/api/search', search)
app.use('/api/user', user)
app.use('/api/role', role)
app.use('/api/uploads', uploads)
app.use('/api/wallet', wallet)
app.use('/api/orden', orden)
app.use('/api/payments', payment)
app.use('/api/brands', brand)
app.use('/api/addresses', address)
app.use('/api/filters', filter) // 🆕 NUEVO - Filtros por categoría
app.use('/api/transactions-v2', transactionV2) // 🆕 NUEVO - Limpio desde cero
app.use('/api/shipping-orders-v2', shippingOrderV2) // 🆕 NUEVO - Limpio desde cero
app.use('/api/catalogs-v2', catalogV2) // 🆕 NUEVO - Sistema de catálogos
app.use('/api/banners', banner) // 🆕 NUEVO - Carousel promocional
app.use('/api/withdrawals', withdrawal) // 🆕 NUEVO - Sistema de retiros

module.exports = app;