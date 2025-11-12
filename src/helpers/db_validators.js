const Role = require('../models/role.model');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const SubCategory = require('../models/sub_category.model');
const Product = require('../models/product.model');


const helpers = {}

helpers.esRoleValido = async (rol = '')  => {

    const existRol = await Role.findOne({ rol });
    if ( !existRol ){
        throw new Error(`El rol ${ rol } no esta registrado en la base de datos`)
    }
    return true;

}

helpers.emailExists = async (email = '') => {
    const existEmail = await User.findOne({email});
    if (existEmail) {
        throw new Error(`El correo: ${email} ya esta registrado`)
    }
    return true;

}

helpers.emailExistsId = async (id) => {
    const emailExists = await User.findById(id);
    if (!emailExists) {
        throw new Error(`El id no existe ${id}`)
    }
    return true;

}

helpers.categoryExistsId = async (id) => {
    const categoryExists = await Category.findById(id);
    if (!categoryExists) {
        throw new Error(`El id no existe ${id}`)
    }
    return true;
}


helpers.productExistsId = async (id) => {
    const productExists = await Product.findById(id);
    if (!productExists) {
        throw new Error(`El id no existe ${id}`)
    }
    return true;
}

// Validaciones para subcategorías
helpers.subCategoryExistsId = async (id) => {
    const subCategoryExists = await SubCategory.findById(id);
    if (!subCategoryExists) {
        throw new Error(`La subcategoría con id ${id} no existe`);
    }
    return true;
}

helpers.subCategoryNameExists = async (name = '') => {
    const subCategoryExists = await SubCategory.findOne({ name });
    if (subCategoryExists) {
        throw new Error(`La subcategoría ${name} ya está registrada`);
    }
    return true;
}

helpers.subCategoryNumberExists = async (number) => {
    const subCategoryExists = await SubCategory.findOne({ number });
    if (subCategoryExists) {
        throw new Error(`El número ${number} ya está asignado a otra subcategoría`);
    }
    return true;
}

// Validador para marcas
helpers.brandExistsId = async (id) => {
    const Brand = require('../models/brand.model');
    const brandExists = await Brand.findById(id);
    if (!brandExists) {
        throw new Error(`La marca con id ${id} no existe`);
    }
    return true;
}

helpers.brandNameExists = async (name) => {
    const Brand = require('../models/brand.model');
    const brandExists = await Brand.findOne({ name });
    if (brandExists) {
        throw new Error(`La marca ${name} ya existe`);
    }
    return true;
}

// Validador para direcciones
helpers.addressExistsId = async (id) => {
    const Address = require('../models/address.model');
    const addressExists = await Address.findOne({ _id: id, estado: true });
    if (!addressExists) {
        throw new Error(`La dirección con id ${id} no existe`);
    }
    return true;
}

helpers.addressBelongsToUser = async (id, userId) => {
    const Address = require('../models/address.model');
    const address = await Address.findOne({ _id: id, user: userId, estado: true });
    if (!address) {
        throw new Error(`La dirección no existe o no pertenece al usuario`);
    }
    return true;
}

helpers.coleccionesPermitidas = (collection = '', collections = []) => {
    const incluide = collections.includes(collection);
    if (!incluide) {
        throw new Error(`La colección ${collection} no es permitida, ${collections}`)
    }
    return true;
}

// Validadores para transacciones
helpers.transactionExistsId = async (id) => {
    const Transaction = require('../models/transaction.model');
    const transactionExists = await Transaction.findOne({ _id: id, estado: true });
    if (!transactionExists) {
        throw new Error(`La transacción con id ${id} no existe`);
    }
    return true;
}

helpers.transactionBelongsToUser = async (id, userId) => {
    const Transaction = require('../models/transaction.model');
    const transaction = await Transaction.findOne({ _id: id, user: userId, estado: true });
    if (!transaction) {
        throw new Error(`La transacción no existe o no pertenece al usuario`);
    }
    return true;
}

// Alias para compatibility
helpers.existeProductoPorId = helpers.productExistsId;
helpers.existeAddressPorId = helpers.addressExistsId;

module.exports = helpers