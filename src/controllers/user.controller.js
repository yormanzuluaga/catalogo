const { response, request } = require('express')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken');

const User = require('../models/user.model');
const s3Service = require('../services/s3.service');

const userCtrl = {}


userCtrl.getUsers = async (req = request, res = response) => {

    const { limit = 5, from = 0 } = req.query;
    const query = { estado: true }

    const [allUser, user] = await Promise.all([
        User.countDocuments(query),
        User.find(query).skip(Number(from)).limit(Number(limit))
    ])

    res.json({
        allUser,
        user
    })
}

userCtrl.postUser = async (req = request, res = response) => {
    try {
        const { nameStore, location, date, ...body } = req.body;

        const UserDB = await User.findOne({ mobile: body.mobile });

        if (UserDB) {
            return res.status(400).json({
                msg: `Este numero ${UserDB.mobile}, ya existe`
            });
        }

        const data = {
            ...body,
        };

        // Manejar avatar si se envió archivo
        if (req.files && req.files.avatar) {
            try {
                const avatarUrl = await s3Service.uploadFileFromExpressUpload(req.files.avatar, 'avatars');
                data.avatar = avatarUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir el avatar',
                    error: error.message
                });
            }
        }

        const user = new User(data);

        //Encriptar la contraseña
        const salt = bcryptjs.genSaltSync();
        user.password = bcryptjs.hashSync(user.password, salt);

        //guardar en Bd
        const createrUser = await user.save();

        const token = jwt.sign({ id: createrUser._id }, 'secret', {
            expiresIn: 1296000
        });

        const [newUser] = await Promise.all([
            User.findOneAndUpdate(
                { _id: user._id },
                { new: true }
            )
        ]);

        res.json({
            user: newUser,
            token: token,
        });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

userCtrl.getUser = async (req, res) => { }

userCtrl.updateCollabotor = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { collaboratorId } = req.body;

        const collaborator = await User.findOneAndUpdate(
            { _id: id }, // Filtro para encontrar el usuario
            { collaborator: collaboratorId }, // Actualización del campo collaborator
            { new: true } // Opcional: Devolver el usuario actualizado en lugar del original
        )



        res.status(200).json(collaborator)
    } catch (err) {
        return res.status(500).json({ message: "Failed to add collaborator" });
    }
};


userCtrl.putUser = async (req = request, res = response) => {
    try {
        const { id } = req.params;
        const { ...data } = req.body;

        // Preparar datos de actualización
        const updateData = {
            "collaborator": data.collaborator,
            "firstName": data.firstName,
            "lastName": data.lastName,
            "email": data.email,
            "mobile": data.mobile,
        };

        // Manejar avatar si se envió archivo
        if (req.files && req.files.avatar) {
            try {
                const avatarUrl = await s3Service.uploadFileFromExpressUpload(req.files.avatar, 'avatars');
                updateData.avatar = avatarUrl;
            } catch (error) {
                return res.status(400).json({
                    msg: 'Error al subir el avatar',
                    error: error.message
                });
            }
        } else if (data.avatar) {
            // Si se pasó URL de avatar en el body
            updateData.avatar = data.avatar;
        }

        const users = await User.findOneAndUpdate(
            { _id: id },
            updateData,
            { new: true }
        ).lean();

        if (!users) {
            return res.status(404).json({
                msg: 'Usuario no encontrado'
            });
        }

        res.json(users);
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            msg: 'Error interno del servidor',
            error: error.message
        });
    }
}

userCtrl.deleteUser = async (req = request, res = response) => {

    const { id } = req.params;

    const user = await User.findByIdAndUpdate(id, { estado: false })

    res.json({ user })


}

module.exports = userCtrl;