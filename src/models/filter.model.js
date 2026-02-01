const { Schema, model } = require('mongoose')

const FilterSchema = Schema({
    name: {
        type: String,
        required: [true, 'El nombre del filtro es obligatorio'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'La categoría es obligatoria']
    },
    subCategory: {
        type: Schema.Types.ObjectId,
        ref: 'SubCategory',
        default: null
    },
    description: {
        type: String,
        trim: true
    },
    icon: {
        type: String,
        default: null
    },
    color: {
        type: String,
        default: '#000000'
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

FilterSchema.index({ name: 1, category: 1 }, { unique: true });

FilterSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    next();
});

module.exports = model('Filter', FilterSchema)
