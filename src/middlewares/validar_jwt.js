const jwt = require('jsonwebtoken')
const {response, request} = require('express')

const User = require('../models/user.model')

const middlewareJWT = {}


middlewareJWT.validarJWT = async ( req = request, res = response, next ) => {

     const authHeader = req.header('Authorization');

     if(!authHeader) {
          return res.status(401).json({ msj: 'No hay token en la petición' })
     }

     // Extraer el token del header "Bearer TOKEN"
     const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

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

          // Asignar usuario a req.authenticatedUser en lugar de req.user
          req.authenticatedUser = user;
          req.user = user; // También asignar a req.user para compatibilidad

          next()

     } catch (err) {
          console.log(err)
          res.status(401).json({
               msj: 'Token no valido'
          })
     }
}

module.exports = middlewareJWT