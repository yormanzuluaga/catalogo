require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const cors = require('cors')
const fileUpload = require('express-fileupload')

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
const catalog = require('./routes/catalog.routes');
const brand = require('./routes/brand.routes');
const address = require('./routes/address.routes');

app.use(cors())

app.set('port', process.env.PORT || 3000)

app.use(morgan('dev'))
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: './uploads'
}))

app.use(express.json())

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
app.use('/api/catalogs', catalog)
app.use('/api/brands', brand)
app.use('/api/addresses', address)

module.exports = app;