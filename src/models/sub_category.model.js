const { Schema, model } = require('mongoose')

const SubCategorySchema = Schema({
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio']
        // Removemos unique: true para permitir nombres duplicados en diferentes categorías
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria']
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

// Índice compuesto: nombre único solo dentro de la misma categoría
SubCategorySchema.index({ name: 1, category: 1 }, { unique: true });

// Índices adicionales para optimizar consultas
SubCategorySchema.index({ category: 1 });
SubCategorySchema.index({ estado: 1 });

SubCategorySchema.methods.toJSON = function() {
    const { estado, __v, _id, ...data } = this.toObject();
    data.uid = _id;
    return data;
}

module.exports = model('SubCategory', SubCategorySchema);
