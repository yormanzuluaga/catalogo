const {response, request} = require('express')

const middlewareRoles = {}

middlewareRoles.isAdminRole = (req = request, res = response, next) => {

    if ( !req.user){
        return res.status(500).json({
            msg: 'Se quiere verificar el role sin validar el token primero'
        })
    }

    const { rol, firstName } = req.user

    if( rol !== 'ADMIN_ROLE'){
        return res.status(401).json({
            msg: `${ firstName } no es administrador - No puede hacer esto`
        })
    }

    next()
}

middlewareRoles.hasRole = ( ...roles) => {
    return (req = request, res = response, next) => {

        if ( !req.user ){
            return res.status(500).json({
                msg: 'Se quiere verificar el role sin validar el token primero'
            })
        }

        if( !roles.includes(req.user.rol) ){
            return res.status(401).json({
                msg: `El servicio requiere uno de estos roles ${ roles }`
            })
        }

        next();
    }
}

module.exports = middlewareRoles
