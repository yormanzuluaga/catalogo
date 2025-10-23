const jwt = require('jsonwebtoken')
const {response, request} = require('express')

const User = require('../models/user.model')

const middlewareJWT = {}


middlewareJWT.validarJWT = async ( req = request, res = response, next ) => {

     const token = req.header('Authorization');

     if(!token) {
          return res.status(401).json({ msj: 'No hay token en la petición' })
     }



     try{

          const { id } = jwt.verify(token, 'secret')



          //leer el usuario que corresponde el uid
          const user = await User.findById(id);

          if(!user) {
               return res.status(401).json({
                    msg: 'Token no valido - usuario no existe DB'
               })
          }

          //Verificar si el uid tiene estado true
          if(!user.estado) {
               return res.status(401).json({
                    msg: 'Token no valido - Usuario cn estado: false'
               })
          }


          req.user = user

          next()

     } catch (err) {
          console.log(err)
          res.status(401).json({
               msj: 'Token no valido'
          })
     }
}

module.exports = middlewareJWT