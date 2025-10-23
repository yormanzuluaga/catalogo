/*const {OAuth2Client} = require('google-auth-library');

const client = new OAuth2Client('181554970240-pe1q0ues4vkelbts4s2u4k0bpcdjve3r.apps.googleusercontent.com');

const helpersGoogle = {}

helpersGoogle.googleVerify = async (token = '') => {
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '181554970240-pe1q0ues4vkelbts4s2u4k0bpcdjve3r.apps.googleusercontent.com',  // Specify the CLIENT_ID of the app that accesses the backend
      // Or, if multiple clients access the backend:
      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
  });
  const {firstName: name, img: picture,email: email } = ticket.getPayload();

  return {
    name,
    picture,
    email
  }


}

module.exports = helpersGoogle;*/