// Servidor local de desenvolvimento. Em produção (Vercel) a mesma aplicação
// é exposta por api/index.js.
require('dotenv').config();
const app = require('./lib/app');

const PORT = process.env.PORT || 5000;

app.ensureDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('Falha ao conectar no PostgreSQL:', error.message);
    process.exit(1);
  });
