const { response, request } = require('express')

const Role = require('../models/role.model');

const roleCtrl = {}


roleCtrl.getRole = async (req = request, res = response) => {

    const { limit = 5, from = 0 } = req.query;

    const [allRole, role] = await Promise.all([
        Role.find(query).skip(Number(from)).limit(Number(limit))
    ])

    res.json({
        allRole,
        role
    })
}

roleCtrl.postRole = async (req = request, res = response) => {

    const { rol  } = req.body;

    
    // const RoleDB = await Role.findOne({ role: role })

    // if (RoleDB) {
    //     return res.status(400).json({
    //         msg: `Este rol ${RoleDB.role}, ya existe`
    //     })
    // }

    const data = {
    rol: rol,   
    }

     const roles = new Role(data);


    //guardar en Bd
    const createrRole = await roles.save()


    res.json({
         createrRole,
    })
}

roleCtrl.getUser = async (req, res) => { }

roleCtrl.updateRole = async (req = request, res = response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

        const roles = await User.findOneAndUpdate(
        { _id: id }, // Filtro para encontrar el usuario
        { collaborator: role }, // Actualización del campo collaborator
        { new: true } // Opcional: Devolver el usuario actualizado en lugar del original
      )

  
  
      res.status(200).json(roles)
    } catch (err) {
      return res.status(500).json({ message: "Failed to add collaborator" });
    }
  };
  

roleCtrl.putRole = async (req = request, res = response) => {

    // const { id } = req.params;
    // const { ...data } = req.body;
    //  const users = await  User.findOneAndUpdate(        
    //     { _id: id }, // Filtro para encontrar el usuario
    //    {
    //     "collaborator": data.collaborator,
    //     "firstName": data.firstName,
    //     "lastName": data.lastName,
    //     "avatar": data.avatar,
    //     "email": data.email,
    //     "mobile": data.mobile,

    //   },{ new: true }).lean()

   // res.json(users)

}

roleCtrl.deleteRole = async (req = request, res = response) => {

    // const { id } = req.params;

    // const user = await User.findByIdAndUpdate(id, { estado: false })

    // res.json({ user })


}

module.exports = roleCtrl;