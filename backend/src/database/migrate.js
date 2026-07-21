// =====================================================================
// FELIPINHO LAUNCHER - Runner de Migrations
// Executa os arquivos .sql da pasta migrations/ em ordem, usando uma
// conexão com multipleStatements (necessário para os blocos PREPARE/
// EXECUTE usados para simular "CREATE INDEX IF NOT EXISTS").
// Uso: npm run db:migrate
// =====================================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrate() {
  console.log('🚚 FELIPINHO LAUNCHER - Executando migrations...\n');

  const nomeBanco = process.env.DB_NAME || 'gr_expresso';
  const usarSSL = process.env.DB_SSL === 'true';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: nomeBanco,
    multipleStatements: true,
    ...(usarSSL ? { ssl: { rejectUnauthorized: false } } : {})
  });

  try {
    const pastaMigrations = path.join(__dirname, 'migrations');
    const arquivos = fs.readdirSync(pastaMigrations)
      .filter((nome) => nome.endsWith('.sql'))
      .sort();

    if (arquivos.length === 0) {
      console.log('ℹ️  Nenhuma migration encontrada em src/database/migrations/.');
      return;
    }

    for (const arquivo of arquivos) {
      console.log(`📦 Aplicando ${arquivo}...`);
      let sql = fs.readFileSync(path.join(pastaMigrations, arquivo), 'utf8').replace(/\r\n/g, '\n');
      if (nomeBanco !== 'gr_expresso') {
        sql = sql.replace(/gr_expresso/g, nomeBanco);
      }
      await connection.query(sql);
      console.log(`✅ ${arquivo} aplicada com sucesso.\n`);
    }

    console.log('🎉 Migrations concluídas!');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

migrate();
