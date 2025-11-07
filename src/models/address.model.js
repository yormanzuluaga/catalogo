const { Schema, model } = require('mongoose');

const AddressSchema = Schema({
    title: {
        type: String,
        required: [true, 'El título de la dirección es requerido'],
        trim: true
    },
    fullName: {
        type: String,
        required: [true, 'El nombre completo es requerido'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'El teléfono es requerido'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'La dirección es requerida'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'La ciudad es requerida'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'El estado/departamento es requerido'],
        trim: true
    },
    country: {
        type: String,
        required: [true, 'El país es requerido'],
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    neighborhood: {
        type: String,
        trim: true
    },
    instructions: {
        type: String,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    coordinates: {
        latitude: {
            type: Number
        },
        longitude: {
            type: Number
        }
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

// Método para serializar la respuesta JSON
AddressSchema.methods.toJSON = function() {
    const { estado, __v, _id, ...data } = this.toObject();
    data.uid = _id;
    return data;
}

// Índice para optimizar consultas por usuario
AddressSchema.index({ user: 1, estado: 1 });

// Índice para direcciones predeterminadas por usuario
AddressSchema.index({ user: 1, isDefault: 1 });

module.exports = model('Address', AddressSchema);
