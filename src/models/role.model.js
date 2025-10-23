const {Schema, model} = require('mongoose')

const RoleSchema = Schema({
    rol: {
        type: String,
        required: [true, 'Rol is required']
    }
});

RoleSchema.methods.toJSON = function () {
  const { _id, ...role } = this.toObject();
  role.uid = _id;
  return role;
};

module.exports = model('Role', RoleSchema);