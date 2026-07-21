// =====================================================================
// FELIPINHO LAUNCHER - Configuração do Express App
// =====================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const rotasApi = require('./routes/index');
const tratadorDeErros = require('./middlewares/tratadorDeErros');
const rotaNaoEncontrada = require('./middlewares/rotaNaoEncontrada');

const app = express();

// Necessário para o express-rate-limit funcionar corretamente atrás de
// proxies como Render, Vercel, Heroku, Nginx, etc.
// "1" confia apenas no primeiro proxy reverso na frente da aplicação
// (o load balancer do Render). É isso que faz req.ip e o cabeçalho
// X-Forwarded-For serem interpretados corretamente pelo rate-limit.
app.set('trust proxy', 1);

// Segurança e performance
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());

// CORS - permite o(s) frontend(s) consumir a API.
// FRONTEND_URL aceita uma URL única ou várias separadas por vírgula,
// por exemplo: FRONTEND_URL=https://meusite.vercel.app,http://localhost:5500
const origensPermitidas = (process.env.FRONTEND_URL || '*')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origem, callback) => {
    // Requisições sem "origin" (ex: chamadas server-to-server, curl, apps mobile)
    // ou quando o admin liberou tudo com "*"
    if (!origem || origensPermitidas.includes('*') || origensPermitidas.includes(origem)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pela política de CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logs de requisições (formato 'dev' apenas fora de produção)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parsing do corpo das requisições
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Limitação de requisições (proteção básica contra abuso)
const limitadorGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // "trust proxy" já está configurado corretamente acima para o Render
  // (1 proxy reverso). Desativamos apenas a validação automática do
  // X-Forwarded-For: ela serve só de aviso e, em algumas versões da lib,
  // pode lançar um erro não tratado que derruba o processo Node inteiro.
  validate: { xForwardedForHeader: false },
  message: { sucesso: false, mensagem: 'Muitas requisições. Tente novamente em alguns minutos.' }
});
app.use('/api', limitadorGeral);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    sistema: 'FELIPINHO LAUNCHER',
    descricao: 'API de gestão de transportadora virtual para Euro Truck Simulator 2 (ETS2)',
    versao: '1.0.0',
    status: 'online'
  });
});

// Rotas da API
app.use('/api', rotasApi);

// Tratamento de rota inexistente e erros (sempre por último)
app.use(rotaNaoEncontrada);
app.use(tratadorDeErros);

module.exports = app;
