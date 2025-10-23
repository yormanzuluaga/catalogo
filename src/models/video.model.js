const { DateTime } = require('luxon');
const {Schema, model} = require('mongoose')

const VideoSchema = Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        unique: true
    },
    urlVideo : {
        type: String,
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
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0
    },
    discount: [
        {
          type: { type: String,},
          price: { type: Number},
        },
      ],
    barcode:  { type: String,},
    deliveryTime: { type: String },
    description: { type: String },
    available: { type: String, default: true },
    img: {type: String}
},{
    timestamps: true,
    versionKey: false
});

VideoSchema.methods.toJSON = function() {
    const {estado, _id,...data } = this.toObject();
    data.uid = _id;
    return data;
}

module.exports = model('Video', VideoSchema);