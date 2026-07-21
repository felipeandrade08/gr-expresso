// =====================================================================
// FELIPINHO LAUNCHER - Ponto de entrada do servidor
// =====================================================================

require('dotenv').config();
const app = require('./app');
const { testarConexao } = require('./config/database');

const PORTA = process.env.PORT || 3000;

// Rede de segurança: erros assíncronos não tratados (ex: uma Promise que
// rejeita fora de um try/catch, ou de fora do ciclo request/response do
// Express) NÃO devem derrubar o processo inteiro — apenas a requisição
// que falhou. Sem isso, um único bug em uma rota pouco usada (ex: o que
// aconteceu em /api/motoristas/ranking) tira o sistema inteiro do ar até
// o Render reiniciar o serviço, mesmo que outras rotas estivessem ok.
process.on('unhandledRejection', (motivo) => {
  console.error('🔥 unhandledRejection (Promise rejeitada sem catch):', motivo);
});

process.on('uncaughtException', (erro) => {
  console.error('🔥 uncaughtException (erro síncrono não tratado):', erro);
});

async function iniciarServidor() {
  await testarConexao();

  app.listen(PORTA, () => {
    console.log('');
    console.log('🚚 ════════════════════════════════════════════');
    console.log('   FELIPINHO LAUNCHER - Sistema de Gestão ETS2');
    console.log('   ════════════════════════════════════════════');
    console.log(`   🌐 Servidor rodando em: http://localhost:${PORTA}`);
    console.log(`   📡 API disponível em:   http://localhost:${PORTA}/api`);
    console.log(`   🔧 Ambiente:            ${process.env.NODE_ENV || 'development'}`);
    console.log('🚚 ════════════════════════════════════════════');
    console.log('');
  });
}

iniciarServidor();
