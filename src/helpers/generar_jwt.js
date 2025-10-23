const jwt = require('jsonwebtoken')

const helpersJWT = {}

helpersJWT.generarJWT = (uid = '') => {
    return new Promise( ( resolve, reject) => {

        const payload = {uid};

        jwt.sign(payload, 'signIn-user', {
            expiresIn: '24h'
        }), ( err, token ) => {
            if ( err ) {
                console.log(err);
                reject('No se pudo generar el token')
            } else {
                resolve(token)
            }
        }

    })
}

module.exports = helpersJWT