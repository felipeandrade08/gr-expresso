# 🚛 GR EXPRESSO

Sistema de gestão completo para transportadora virtual de **Euro Truck Simulator 2 (ETS2)**.

Plataforma SaaS de logística com dashboard, controle de viagens, frota, motoristas, financeiro, relatórios avançados e muito mais — pronta para evoluir com integrações de Telemetria ETS2, TrucksBook e Trucky.

---

## 📦 Estrutura do projeto

```
gr-expresso/
├── INSTALAR.bat                # Instalação automática (rodar 1x)
├── INICIAR.bat                 # Abre o sistema (uso diário)
├── PARAR.bat                   # Encerra o sistema corretamente
│
├── backend/                   # API REST (Node.js + Express + MySQL)
│   ├── src/
│   │   ├── config/            # Configuração de conexão com o banco
│   │   ├── controllers/       # Lógica de cada módulo (1 controller por entidade)
│   │   ├── models/            # Camada de acesso a dados (queries SQL)
│   │   ├── routes/            # Definição de rotas da API
│   │   ├── middlewares/       # Tratamento de erros e 404
│   │   ├── utils/             # Helpers (respostas padrão, geração de código, etc)
│   │   ├── database/
│   │   │   ├── schema.sql     # Schema completo do banco
│   │   │   ├── seeds/seed.sql # Dados de exemplo
│   │   │   └── init.js        # Script de inicialização do banco
│   │   ├── app.js             # Configuração do Express
│   │   └── server.js          # Ponto de entrada
│   ├── package.json
│   └── .env.example
│
└── frontend/                  # Interface web (HTML + CSS + JS puro)
    └── public/
        ├── css/design-system.css   # Design system (cores, componentes)
        ├── js/
        │   ├── services/api.js     # Cliente HTTP central
        │   ├── utils/               # Layout, formatadores
        │   └── pages/                # 1 script por página
        ├── index.html               # Tela de login
        ├── dashboard.html
        ├── viagens.html
        ├── motoristas.html
        ├── caminhoes.html
        ├── reboques.html
        ├── abastecimentos.html
        ├── despesas.html
        ├── notas-fiscais.html
        ├── financeiro.html
        ├── relatorios.html
        ├── ranking.html
        ├── mapa.html
        └── integracoes.html
```

---

## 🌐 Quer hospedar para sua equipe acessar pela internet?

Se você quer que outras pessoas acessem o sistema por um link (sem precisar
rodar nada no computador delas), veja o guia completo e gratuito em
**[HOSPEDAGEM.md](./HOSPEDAGEM.md)**.

---

## 🚀 Como rodar o projeto (modo fácil — recomendado)

Se você recebeu esta pasta pronta para usar, **não precisa mexer em nada manualmente**.
Existem 3 arquivos na raiz do projeto que automatizam tudo:

| Arquivo | Quando usar |
|---|---|
| **`INSTALAR.bat`** | Uma única vez, na primeira vez que for usar o sistema neste computador |
| **`INICIAR.bat`** | Todo dia, sempre que quiser abrir o sistema |
| **`PARAR.bat`** | Quando quiser encerrar o sistema corretamente |

### Passo a passo

1. Dê **dois cliques** em `INSTALAR.bat`.
2. O instalador vai verificar se você tem **Node.js** e **MySQL** no computador.
   - Se não tiver algum dos dois, ele vai te avisar exatamente o que fazer e abrir o
     site de download certo. Depois de instalar, é só rodar o `INSTALAR.bat` de novo.
3. Ele vai pedir a **senha do MySQL** (a que você definiu quando instalou o MySQL).
   Se você não lembra ou não definiu nenhuma, pode tentar deixar em branco (ENTER).
4. O instalador faz o resto sozinho: cria o banco de dados, instala tudo que é
   necessário e já deixa populado com dados de exemplo.
5. Ao final, ele já abre o sistema pela primeira vez automaticamente.

Da próxima vez que for usar o sistema, **não precisa mais rodar o INSTALAR.bat**.
Basta dar dois cliques em **`INICIAR.bat`** — ele abre tudo (servidor + site) e
já leva você direto para o navegador.

Quando terminar de usar, você pode simplesmente fechar as janelas, ou rodar
**`PARAR.bat`** para encerrar tudo de forma mais limpa.

> ⚠️ Se o `INSTALAR.bat` ou `INICIAR.bat` forem bloqueados pelo Windows com um aviso
> azul ("o Windows protegeu o computador"), clique em **"Mais informações"** e depois
> em **"Executar assim mesmo"**. Isso acontece porque o arquivo veio de outro
> computador/da internet — é normal e seguro neste caso.

---

## 🛠️ Como rodar o projeto (modo manual / avançado)

Use este caminho se preferir configurar tudo manualmente, ou se estiver em
Mac/Linux (os arquivos `.bat` são exclusivos do Windows).

### 1. Pré-requisitos

- [Node.js](https://nodejs.org) v18 ou superior
- [MySQL](https://dev.mysql.com/downloads/) 8.0 ou superior (local ou remoto)

### 2. Configurar o backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env` com as credenciais do seu MySQL (e defina um `JWT_SECRET`
próprio — qualquer texto longo e aleatório serve):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=gr_expresso
JWT_SECRET=qualquer-texto-longo-e-aleatorio-aqui
```

### 3. Criar o banco de dados

```bash
# Cria todas as tabelas
npm run db:init

# Cria as tabelas E popula com dados de exemplo (recomendado para teste)
npm run db:init -- --seed
```

### 4. Iniciar o servidor

```bash
npm run dev    # modo desenvolvimento (com reinício automático)
# ou
npm start      # modo produção
```

A API estará disponível em `http://localhost:3000/api`.

Você pode testar com: `http://localhost:3000/api/health`

### 5. Abrir o frontend

O frontend é 100% estático (HTML/CSS/JS), sem necessidade de build. Basta servir a pasta `frontend/public`:

**Opção A — Extensão Live Server (VS Code):** botão direito em `index.html` → "Open with Live Server".

**Opção B — servidor HTTP simples:**
```bash
cd frontend/public
npx serve . -l 5500
# ou
python3 -m http.server 5500
```

Depois acesse `http://localhost:5500` (ou a porta indicada).

> ⚠️ Se o frontend rodar em uma porta diferente de `http://localhost:3000`, configure `FRONTEND_URL` no `.env` do backend para evitar bloqueio de CORS, e ajuste `window.GR_API_URL` no início de `frontend/public/js/services/api.js` se a API não estiver em `http://localhost:3000/api`.

---

## 🎨 Identidade visual

| Cor | Hex | Uso |
|---|---|---|
| Verde Escuro | `#0B3D2E` | Sidebar, marca, elementos primários |
| Verde Limão | `#A4FF00` | Ações, destaques, indicadores positivos |
| Preto | `#121212` | Texto, superfícies escuras |
| Branco | `#FFFFFF` | Fundos, texto sobre escuro |

Tipografia: **Space Grotesk** (títulos/números) + **Inter** (corpo de texto).

---

## 🧩 Módulos do sistema

1. **Dashboard** — indicadores gerais, gráficos de faturamento e viagens, alertas de frota
2. **Viagens** — CRUD completo + controle de status (agendada → em andamento → concluída)
3. **Abastecimentos** — controle de combustível por caminhão, gráfico de gastos
4. **Despesas** — categorização de custos operacionais
5. **Notas Fiscais** — emissão e controle de notas vinculadas a viagens
6. **Motoristas** — cadastro, status e estatísticas individuais
7. **Caminhões** — frota com status, consumo médio e vínculo de motorista
8. **Reboques** — gestão de semirreboques por tipo e capacidade
9. **Financeiro** — lançamentos manuais, resumo de entradas/saídas, fluxo de caixa
10. **Relatórios Avançados** — lucratividade, desempenho por motorista, custo por caminhão, rotas mais frequentes
11. **Ranking de Motoristas** — pódio + classificação geral por pontuação
12. **Mapa das Entregas** — visualização geográfica das rotas (Leaflet/OpenStreetMap)
13. **Integrações** — Telemetria ETS2 **real** via Launcher desktop; estrutura preparada para TrucksBook e Trucky

---

## 🔌 Telemetria ETS2 (Launcher) — integração real

Diferente de TrucksBook/Trucky (ainda não implementadas), a **Telemetria ETS2** é
uma integração real e funcional através do **Launcher GR EXPRESSO** (aplicativo
desktop em Python que lê a shared memory do jogo).

O motorista faz login no Launcher com a mesma conta do site, e o aplicativo passa
a enviar automaticamente:
- Status em tempo real (posição, velocidade, combustível) — módulo `telemetria_status`
- Criação e finalização de viagens conforme os fretes do jogo
- Abastecimentos detectados pela variação do nível de combustível
- Alertas de manutenção quando o desgaste do veículo cruza um limite (`alertas_manutencao`)

**Endpoints** (em `backend/src/routes/telemetria.routes.js`, todos autenticados):
```
POST /api/telemetria/heartbeat
POST /api/telemetria/viagem/inicio
POST /api/telemetria/viagem/:id/fim
POST /api/telemetria/abastecimento
POST /api/telemetria/manutencao
POST /api/telemetria/desconectar
GET  /api/telemetria/meu-status
GET  /api/telemetria/online        (admin: ver quem está jogando agora)
```

**Banco de dados:** se você já tem uma instalação em produção, rode a migration
para criar as tabelas novas sem perder dados existentes:
```bash
npm run db:migrate
```
(Instalações novas via `npm run db:init` já recebem essas tabelas automaticamente,
pois fazem parte do `schema.sql`.)

O código do Launcher fica no projeto separado `gr-expresso-telemetry/` — veja o
README dele para instruções de uso e configuração (`API_URL`, `VEHICLE_PLATE`).

---

## 🔌 Sobre as integrações futuras (TrucksBook e Trucky)

As integrações com **TrucksBook** e **Trucky** ainda não foram implementadas.
Hoje elas possuem apenas:
- Tabela `integracoes` no banco de dados
- Endpoints REST (`GET/PUT /api/integracoes/:nome`, `POST /api/integracoes/:nome/sincronizar`)
- Tela de configuração no frontend (ativar, configurar URL/API key, sincronizar)

A lógica de sincronização real com cada serviço externo está marcada com `// TODO` em
`backend/src/controllers/IntegracaoController.js`, pronta para receber a implementação
da chamada à API de cada ferramenta quando o desenvolvimento avançar.

---

## 🔐 Autenticação e perfis de usuário

O sistema possui **login real com dois perfis**:

- **Administrador**: acesso completo a todos os módulos (dashboard, frota, financeiro, relatórios, integrações, aprovação de novos motoristas).
- **Motorista**: acesso a uma área própria, com painel pessoal, suas viagens, seus abastecimentos, suas notas fiscais (geradas automaticamente) e o ranking geral.

### Login de administrador padrão (criado pelo seed)
```
E-mail: admin@grexpresso.com
Senha:  admin123
```
> Troque essa senha assim que possível em um ambiente real (ainda não há tela de troca de senha — pode ser feito diretamente no banco caso necessário).

### Como um motorista ganha acesso
1. O motorista acessa a tela de login e clica em **"Criar minha conta"**.
2. Preenche nome, e-mail, telefone, CNH e senha. A conta nasce com status **pendente**.
3. Um administrador acessa **Aprovações de Acesso** no menu, e aprova ou rejeita o cadastro.
4. Assim que aprovado, o motorista já consegue fazer login normalmente.

### Nota fiscal automática
Ao iniciar uma viagem (status muda para "Em andamento"), o sistema **gera automaticamente**
uma nota fiscal vinculada a essa viagem, simulando a emissão real de frete. Isso vale tanto
quando o admin movimenta a viagem quanto quando o próprio motorista faz isso pela área dele.

### Detalhes técnicos
Autenticação via **JWT** (token salvo no `sessionStorage` do navegador, expira em 7 dias).
Senhas armazenadas com hash **bcrypt**. Cada rota da API decide, no backend, se é pública,
compartilhada (admin + motorista) ou exclusiva de admin — a interface no frontend apenas
reflete essas permissões, mas a segurança real é sempre aplicada no servidor.

---

## 🛠️ Tecnologias utilizadas

**Frontend:** HTML5, CSS3, JavaScript ES6+, Bootstrap 5, Chart.js, SweetAlert2, Font Awesome, Animate.css, AOS, Leaflet

**Backend:** Node.js, Express.js, MySQL (mysql2), Helmet, CORS, Morgan, Compression, express-rate-limit, bcryptjs, jsonwebtoken

---

## 📄 Licença

Projeto desenvolvido para fins de gestão de transportadora virtual em Euro Truck Simulator 2 (ETS2). Uso livre para fins pessoais e de comunidade.
