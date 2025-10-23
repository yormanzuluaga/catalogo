const { response, request } = require('express')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config();

const twilio = require('twilio');

const authCtrl = {}

const User = require('../models/user.model');
const helpersGoogle = require('../helpers/google_verify');

const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN)


authCtrl.signIn = async (req = request, res = response) => {

    const { email, password } = req.body;

        const user = await User.findOne({ email })

        if(!user){
            return res.status(400).json({
                msj: `Usuario / Password no son correcto - email`
            })
        }

        if(!user.estado){
            return res.status(400).json({
                msj: `Usuario / Password no son correcto - estado: false`
            })
        }

        const validatorPassword = await bcryptjs.compareSync(password, user.password)
        if(!validatorPassword){
            return res.status(400).json({
                msj: `Usuario / Password no son correcto - password`
            })
        }


      const token = await jwt.sign({id: user.id}, 'secret', {
          expiresIn: 1296000
      })

        res.json({
            user,
            token
        })


}

authCtrl.sendSMS = async (req = request, res = response) => {

    const { mobile } = req.params;
    try{
        
        client
            .verify.v2
            .services(process.env.SERVICE_ID)
            .verifications
            .create({
                to:  `${mobile}`, channel: 'sms'
            }).then((verification) => 
                res.status(200).send(verification)
            )

    }catch(e){    
        res.json(e);
      }
       
}

authCtrl.verify = async (req = request, res = response) => {

    const { mobile, code } = req.params;
    try{
        client
            .verify
            .v2
            .services(process.env.SERVICE_ID)
            .verificationChecks
            .create({
                to: `${mobile}`,
                code: code
            }).then(async (data) => {
               if (data.status == 'approved') { 
                const user = await User.findOne({ mobile: mobile })

                if(!user){
                    return res.status(400).json({
                        msj: `Ese numero no esta registrado`
                    })
                }
        
                if(!user.estado){
                    return res.status(400).json({
                        msj: `Usuario no son correcto - estado: false`
                    })
                }
                if(!user.mobile > 13){
                    return res.status(400).json({
                        msj: `Usuario no son correcto - estado: false`
                    })
                }
        
              const token = jwt.sign({id: user.id}, 'secret', {
                  expiresIn: 1296000
              })
        
              return  res.status(200).json({
                    user,
                    token
                })
               } else if(data.status == 'pending'){
                return res.status(404).json('Código de verificación incorrecto. Intenta nuevamente.');
               }
            })

    }catch(e){    
        res.json(e);
      }
       
}

authCtrl.mobile = async (req = request, res = response) => {

    const { mobile } = req.body;
    try{

        const user = await User.findOne({ mobile: mobile })

        if(!user){
            return res.status(400).json({
                msj: `Ese numero no esta registrado`
            })
        }

        if(!user.estado){
            return res.status(400).json({
                msj: `Usuario no son correcto - estado: false`
            })
        }
        if(!user.mobile > 13){
            return res.status(400).json({
                msj: `Usuario no son correcto - estado: false`
            })
        }

      const token = jwt.sign({id: user.id}, 'secret', {
          expiresIn: 1296000
      })

      return  res.status(200).json({
            user,
            token
        })

    }catch(e){    
        res.json(e);
      }
       
}

authCtrl.googleSignIn = async (req = request, res = response) => {

    const { id_token } = req.body;

    try {

        const { email, firstName, img } = await helpersGoogle.googleVerify(id_token);

        let user = await User.findOne({ email });

        if ( !user ) {
            const data = {
                firstName,
                email,
                password: '',
                img,
                google: true
            }

            user = new User(data);
            await user.save();
        }

        if( !user.estado ) {
            return res.status(400).json({
                msg: 'Hable con el administrador, usuario bloqueado'
            })
        }

        const token = await jwt.sign({id: user.id}, 'secret', {
            expiresIn: 1296000
        })

        res.json({
            user,
            token
        });

    } catch (error) {

        res.status(400).json({
            ok: 'Token de Google no es válido'
        })

    }



}

module.exports = authCtrl