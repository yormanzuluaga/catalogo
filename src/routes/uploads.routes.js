const { Router } = require('express');
const { check } = require('express-validator');

const middleware = require('../middlewares/validar_campos');
const middlewareArchive = require('../middlewares/validar_archivo');
const helpers = require('../helpers/db_validators');
const middlewareJWT = require('../middlewares/validar_jwt');

const uploadsCtrl = require('../controllers/uploads.controller');

const router = Router();

// Subir archivo general
router.post('/', [
    middlewareJWT.validarJWT,
    middlewareArchive.validarImagenSubir
], uploadsCtrl.fileUpload);

// Mostrar imagen por ID y colección
router.get('/:collection/:id', [
    check('id', 'El id debe ser de mongo').isMongoId(),
    check('collection').custom(c => helpers.coleccionesPermitidas(c, ['users', 'products'])),
    middleware.validarCampos
], uploadsCtrl.showImage);

// Actualizar imagen de usuario o producto
router.put('/:collection/:id', [
    middlewareJWT.validarJWT,
    middlewareArchive.validarImagenSubir,
    check('id', 'El id debe ser de mongo').isMongoId(),
    check('collection').custom(c => helpers.coleccionesPermitidas(c, ['users', 'products'])),
    middleware.validarCampos
], uploadsCtrl.updateImage);

// Eliminar imagen de usuario o producto
router.delete('/:collection/:id', [
    middlewareJWT.validarJWT,
    check('id', 'El id debe ser de mongo').isMongoId(),
    check('collection').custom(c => helpers.coleccionesPermitidas(c, ['users', 'products'])),
    middleware.validarCampos
], uploadsCtrl.deleteImage);

// Subir múltiples imágenes para productos
router.post('/multiple/:id', [
    middlewareJWT.validarJWT,
    middlewareArchive.validarMultiplesImagenes,
    check('id', 'El id debe ser de mongo').isMongoId(),
    middleware.validarCampos
], uploadsCtrl.uploadMultipleImages);

module.exports = router