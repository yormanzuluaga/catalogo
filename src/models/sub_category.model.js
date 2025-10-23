const { Schema, model } = require('mongoose')

const SubCategorySchema = Schema({
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        unique: true
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria']
    },
    number: {
        type: Number,
        required: [true, 'El número es obligatorio'],
        unique: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'La categoría padre es obligatoria']
    },
    img: {
        type: String,
        default: null
    },
    estado: {
        type: Boolean,
        default: true,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

SubCategorySchema.methods.toJSON = function() {
    const { estado, __v, _id, ...data } = this.toObject();
    data.uid = _id;
    return data;
}

module.exports = model('SubCategory', SubCategorySchema);
