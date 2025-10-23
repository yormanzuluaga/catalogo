const { response, request } = require('express')
const { ObjectId } = require('mongoose').Types;
const Category = require('../models/category.model')
const User = require('../models/user.model')
const Product = require('../models/product.model')


const collectionPermite = [
    'user',
    'category',
    'product',
    'roles'
];

const searchCtrl = {}

searchCtrl.searchUser = async (term = '', res = response) => {

    const isMongoId = ObjectId.isValid(term)

    if( isMongoId ) {
        const user = await User.findById(term);
        return res.json({
            results: (user) ? [user] : []
        })
    }

    const regex = new RegExp( term, 'i');

    const users = await User.find({
        $or: [{ firstName: regex }, { email: regex}],
        $and: [{estado: true}]
    })
    return res.json({
        results: users
    })
}

searchCtrl.searchCategory = async (term = '', res = response) => {

    const isMongoId = ObjectId.isValid(term)

    if( isMongoId ) {
        const category = await Category.findById(term);
        return res.json({
            results: (category) ? [category] : []
        })
    }

    const regex = new RegExp( term, 'i');

    const categories = await Category.find({ name: regex , estado: true })

    return res.json({
        results: categories
    })
}

searchCtrl.searchProduct = async (term = '', res = response) => {

    const isMongoId = ObjectId.isValid(term)

    if( isMongoId ) {
        const product = await Product.findById(term).populate('category', 'name');
        return res.json({
            results: (product) ? [product] : []
        })
    }

    const regex = new RegExp( term, 'i');
    const products = await Product.find({ name: regex, estado: true}).populate('category', 'name')
    return res.json({
        results: products
    })
}

searchCtrl.search = (req = request, res = response) => {

    const { collection, term} = req.params;

    if( !collectionPermite.includes(collection)){
        return res.status(400).json({
            msg: `Las colecciones permitidas son: ${collectionPermite}`
        })
    }

    switch (collection) {
        case 'user':
           searchCtrl.searchUser(term, res)
        break;
        case 'category':
            searchCtrl.searchCategory(term, res)
        break;
        case 'product':
            searchCtrl.searchProduct(term, res)
        break;

        default:
            res.status(500).json({
                msg: 'Se le olvido hacer esta busqueda'
            })
    }

}

module.exports = searchCtrl