const { validationResult } = require('express-validator');

const middleware = {}

middleware.validarCampos = ( req, res, next ) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.log('=== VALIDATION ERRORS FOUND ===');
        console.log(JSON.stringify(errors.array(), null, 2));
        console.log('================================');
        return res.status(400).json({
            msg: 'Errores de validación',
            errors: errors.array()
        })
    }

    next();
}


module.exports = middleware