// =====================================================================
// GR EXPRESSO - Script de inicialização do banco de dados
// Executa o schema.sql e, opcionalmente, o seed.sql
// Uso: npm run db:init
// =====================================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function executarArquivoSQL(connection, caminhoArquivo, { nomeBanco, pularCreateUse } = {}) {
  // Normaliza quebras de linha (Windows usa \r\n, o que pode confundir parsers ingênuos)
  let sqlBruto = fs.readFileSync(caminhoArquivo, 'utf8').replace(/\r\n/g, '\n');

  // Os arquivos .sql do projeto usam "gr_expresso" como nome fixo do banco.
  // Se o usuário configurou um nome diferente (comum em hospedagens gratuitas,
  // que já fornecem um banco com nome próprio), substituímos aqui.
  if (nomeBanco && nomeBanco !== 'gr_expresso') {
    sqlBruto = sqlBruto.replace(/gr_expresso/g, nomeBanco);
  }

  // Remove comentários de linha inteira (começando com --) antes de dividir em statements,
  // para que comentários no meio de um bloco não fiquem grudados no statement seguinte.
  const sqlSemComentarios = sqlBruto
    .split('\n')
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n');

  // Divide por ponto-e-vírgula (fim de statement). Cada statement do nosso schema/seed
  // é simples (sem ; dentro de strings/procedures), então o split direto é seguro aqui.
  let statements = sqlSemComentarios
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Em hospedagens sem permissão de CREATE DATABASE, o banco já foi
  // selecionado manualmente antes — então pulamos esses comandos aqui.
  if (pularCreateUse) {
    statements = statements.filter((s) => {
      const inicio = s.trim().toUpperCase();
      return !inicio.startsWith('CREATE DATABASE') && !inicio.startsWith('USE ');
    });
  }

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function init() {
  console.log('🚚 GR EXPRESSO - Inicializando banco de dados...\n');

  const nomeBanco = process.env.DB_NAME || 'gr_expresso';
  const usarSSL = process.env.DB_SSL === 'true';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ...(usarSSL ? { ssl: { rejectUnauthorized: false } } : {})
  });

  try {
    console.log('🗑️  Limpando instalação anterior (se existir)...');
    let temPermissaoDeDb = true;
    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${nomeBanco}\``);
      await connection.query(`CREATE DATABASE \`${nomeBanco}\``);
      console.log('✅ Ambiente limpo.\n');
    } catch (e) {
      // Algumas hospedagens gratuitas (ex: Railway) não permitem apagar/criar
      // bancos pelo usuário padrão — nesse caso, o banco já existe pronto e
      // só precisamos limpar as tabelas dentro dele.
      temPermissaoDeDb = false;
      console.log('ℹ️  Sem permissão para recriar o banco; limpando tabelas existentes...');
      await connection.query(`USE \`${nomeBanco}\``);
      const [tabelas] = await connection.query('SHOW TABLES');
      if (tabelas.length > 0) {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const linha of tabelas) {
          const nomeTabela = Object.values(linha)[0];
          await connection.query(`DROP TABLE IF EXISTS \`${nomeTabela}\``);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      }
      console.log('✅ Tabelas antigas removidas.\n');
    }

    console.log('📦 Criando schema (tabelas, índices, relacionamentos)...');
    await executarArquivoSQL(connection, path.join(__dirname, 'schema.sql'), {
      nomeBanco,
      pularCreateUse: !temPermissaoDeDb
    });
    console.log('✅ Schema criado com sucesso.\n');

    const popularComExemplos = process.argv.includes('--seed');
    if (popularComExemplos) {
      console.log('🌱 Populando banco com dados de exemplo...');
      await executarArquivoSQL(connection, path.join(__dirname, 'seeds', 'seed.sql'), {
        nomeBanco,
        pularCreateUse: !temPermissaoDeDb
      });
      console.log('✅ Dados de exemplo inseridos com sucesso.\n');
    } else {
      console.log('ℹ️  Para popular com dados de exemplo, rode: npm run db:init -- --seed\n');
    }

    console.log(`🎉 Banco de dados "${nomeBanco}" pronto para uso!`);
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

init();
