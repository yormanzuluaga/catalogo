const { dbConnection } = require('./database/config');
const app = require('./app');

// Conectar a la base de datos
dbConnection();

app.listen(app.get('port'));

console.log("Server on port", app.get('port')); 
 
