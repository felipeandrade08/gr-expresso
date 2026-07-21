// =====================================================================
// FELIPINHO LAUNCHER - Configuração do Banco de Dados (MySQL)
// =====================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

// Algumas hospedagens de banco de dados (ex: Railway, PlanetScale) exigem
// conexão criptografada (SSL). Defina DB_SSL=true no .env quando necessário.
const usarSSL = process.env.DB_SSL === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gr_expresso',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  dateStrings: true,
  ...(usarSSL ? { ssl: { rejectUnauthorized: false } } : {})
});

/**
 * Testa a conexão com o banco de dados na inicialização do servidor.
 */
async function testarConexao() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexão com o MySQL estabelecida com sucesso.');
    connection.release();
  } catch (error) {
    console.error('❌ Falha ao conectar ao MySQL:', error.message);
    console.error('   Verifique as variáveis de ambiente no arquivo .env');
  }
}

module.exports = { pool, testarConexao };
