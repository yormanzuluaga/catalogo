const {Schema, model} = require('mongoose')

const CategorySchema = Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        unique: true
    },
    isSubCatalogo: {
        type: Boolean,
        default: false,
        required: [true, 'El número es obligatorio'],
        unique: true
    },
    estado: {
        type: Boolean,
        default: true,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    img: {type: String}
},{
    timestamps: true,
    versionKey: false
});

CategorySchema.methods.toJSON = function() {
    const {estado,_id, ...data } = this.toObject();
    data.uid = _id;
    return data;
}

module.exports = model('Category', CategorySchema);