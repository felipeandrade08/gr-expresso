# 🌐 Como hospedar o GR EXPRESSO (guia passo a passo)

Este guia mostra como colocar o GR EXPRESSO no ar de graça, para você e seus
amigos acessarem por um link, de qualquer lugar — sem precisar deixar o seu
computador ligado.

Vamos usar 3 serviços gratuitos, todos confiáveis e muito usados:

| Parte do sistema | Onde vai ficar | Por quê |
|---|---|---|
| Banco de dados (MySQL) | **Railway** | Tem plano gratuito de MySQL fácil de configurar |
| Backend (a API) | **Render** | Conecta direto com o GitHub, gratuito |
| Frontend (o site) | **Vercel** | Conecta direto com o GitHub, gratuito, super rápido |

O processo todo leva uns 30-40 minutos na primeira vez. Vá com calma, seguindo
cada passo na ordem. Sempre que esse guia disser "salve" ou "anote", guarde a
informação num bloco de notas — você vai precisar dela em um passo seguinte.

---

## Parte 1 — Colocar o projeto no GitHub

Se o seu projeto ainda não está no GitHub, faça isso primeiro:

1. Acesse [github.com](https://github.com) e faça login.
2. Clique no botão **"+"** no canto superior direito → **"New repository"**.
3. Dê um nome, por exemplo `gr-expresso`. Deixe como **Private** (privado) se
   não quiser que qualquer pessoa veja o código (recomendado, já que o banco
   de dados tem dados da sua "empresa").
4. Clique em **"Create repository"**.
5. Na página que abrir, siga as instruções em **"...or push an existing
   repository from the command line"** — ou, mais fácil: na sua pasta do
   projeto, clique com o botão direito → "Open in Terminal" (ou use o GitHub
   Desktop, se preferir interface gráfica: [desktop.github.com](https://desktop.github.com)).

Se você usa o **GitHub Desktop** (recomendado para quem não usa terminal):
1. Abra o GitHub Desktop → **File → Add Local Repository** → escolha a pasta
   `gr-expresso` no seu computador.
2. Se ele avisar que a pasta não é um repositório Git, clique em
   **"create a repository"**.
3. Escreva uma mensagem tipo "Primeira versão" e clique em **"Commit to main"**.
4. Clique em **"Publish repository"** no topo. Desmarque "Keep this code
   private" se quiser público, ou deixe marcado para privado.

Pronto, seu código está no GitHub.

---

## Parte 2 — Criar o banco de dados no Railway

1. Acesse [railway.app](https://railway.app) e faça login (pode entrar direto
   com sua conta do GitHub).
2. Clique em **"New Project"**.
3. Escolha **"Provision MySQL"** (ou "Deploy MySQL", dependendo da versão da
   tela).
4. Espere alguns segundos até o banco ser criado.
5. Clique na caixinha do MySQL que apareceu → aba **"Variables"** (Variáveis).
6. Você vai ver várias informações como `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE` (ou similares, com nomes parecidos).
   **Anote os valores de cada uma** — vamos usá-los no próximo passo.

> 💡 Dica: clique no ícone de "olho" ao lado de cada valor para revelar o
> conteúdo, e copie um por um.

---

## Parte 3 — Hospedar o backend no Render

1. Acesse [render.com](https://render.com) e faça login com sua conta do
   GitHub.
2. Clique em **"New +"** → **"Web Service"**.
3. Escolha o repositório `gr-expresso` que você acabou de subir no GitHub
   (pode ser necessário autorizar o Render a acessar seus repositórios).
4. Na tela de configuração, preencha:
   - **Name**: `gr-expresso-backend` (ou o nome que preferir)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Role até **"Environment Variables"** (Variáveis de Ambiente) e adicione,
   uma por uma, clicando em **"Add Environment Variable"**:

   | Nome (Key) | Valor (Value) |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | o valor de `MYSQLHOST` que você anotou no Railway |
   | `DB_PORT` | o valor de `MYSQLPORT` |
   | `DB_USER` | o valor de `MYSQLUSER` |
   | `DB_PASSWORD` | o valor de `MYSQLPASSWORD` |
   | `DB_NAME` | o valor de `MYSQLDATABASE` |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | qualquer frase longa e aleatória, ex: `gr-expresso-2026-chave-super-secreta-xyz` |
   | `FRONTEND_URL` | `*` (vamos trocar isso depois de criar o frontend) |

6. Clique em **"Create Web Service"**.
7. Aguarde o deploy (acompanhe os logs na tela — leva de 2 a 5 minutos). Ao
   final, vai aparecer "Live" em verde no topo.
8. **Anote a URL do seu backend** — algo como:
   `https://gr-expresso-backend.onrender.com`

### Criando as tabelas no banco (uma única vez)

O Render não roda comandos extras sozinho, então vamos criar as tabelas
manualmente, só desta vez:

1. No Render, vá na aba **"Shell"** do seu serviço (no menu lateral do
   serviço que você criou).
2. Digite o comando abaixo e aperte Enter:
   ```
   npm run db:init -- --seed
   ```
3. Espere aparecer "Banco de dados pronto para uso!". Pronto, as tabelas e os
   dados de exemplo (incluindo o usuário admin) já estão criados.

> ⚠️ O plano gratuito do Render "dorme" depois de alguns minutos sem uso, e
> demora uns 30-50 segundos para "acordar" na primeira requisição do dia.
> Isso é normal — só esperar um pouco na primeira vez que alguém acessar.

---

## Parte 4 — Hospedar o frontend na Vercel

Antes de hospedar, precisamos apontar o frontend para o backend real (não mais
`localhost`).

### 4.1 — Editar o arquivo de configuração

1. No seu computador (ou direto no GitHub, editando o arquivo pelo site),
   abra o arquivo: `frontend/public/js/config.js`
2. Troque a linha:
   ```js
   window.GR_API_URL = 'http://localhost:3000/api';
   ```
   por:
   ```js
   window.GR_API_URL = 'https://gr-expresso-backend.onrender.com/api';
   ```
   (usando a URL real que o Render te deu, sempre terminando em `/api`)
3. Salve e envie essa mudança para o GitHub (commit + push, ou pelo GitHub
   Desktop: escreva uma mensagem e clique em "Commit" → "Push origin").

### 4.2 — Criar o projeto na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta do
   GitHub.
2. Clique em **"Add New..."** → **"Project"**.
3. Escolha o repositório `gr-expresso`.
4. Na tela de configuração:
   - **Root Directory**: clique em "Edit" e escolha `frontend/public`
   - **Framework Preset**: deixe como `Other`
   - Não precisa mexer em "Build Command" nem "Output Directory"
5. Clique em **"Deploy"**.
6. Aguarde 1-2 minutos. Ao final, a Vercel te dá uma URL tipo:
   `https://gr-expresso.vercel.app`

**Esse é o link que você vai compartilhar com seus amigos!**

---

## Parte 5 — Conectar tudo (último passo)

Agora que você tem a URL final do frontend, precisa autorizar ela no backend:

1. Volte no **Render**, no seu serviço de backend.
2. Vá em **"Environment"** (Variáveis de Ambiente).
3. Edite a variável `FRONTEND_URL` que estava com `*` e coloque a URL real da
   Vercel, por exemplo:
   ```
   https://gr-expresso.vercel.app
   ```
4. Clique em salvar. O Render vai reiniciar o backend automaticamente
   (leva uns 30 segundos).

Pronto! Agora acesse a URL da Vercel no navegador. Você deve ver a tela de
login do GR EXPRESSO. Use o login padrão para testar:

```
E-mail: admin@grexpresso.com
Senha:  admin123
```

> 🔒 Troque essa senha o quanto antes (veja a seção de segurança abaixo).

---

## Como seus amigos vão acessar

Basta mandar o link da Vercel para eles (ex: `https://gr-expresso.vercel.app`).
Motoristas clicam em **"Criar minha conta"** na tela de login, e você aprova
o acesso deles em **"Aprovações de Acesso"** no menu (como admin).

---

## ❗ Cuidados importantes depois de hospedar publicamente

1. **Troque a senha do admin.** A senha `admin123` é conhecida por qualquer
   pessoa que veja este projeto. Como ainda não existe uma tela de "trocar
   senha" no sistema, a forma mais simples é: no Railway, abra a aba **"Data"**
   do seu banco MySQL, encontre a tabela `usuarios`, e gere um novo hash de
   senha (peça ajuda se precisar fazer isso, é um passo técnico).

2. **O link fica público.** Qualquer pessoa com o link pode acessar a tela de
   login e tentar se cadastrar. Isso é esperado (é assim que seus amigos vão
   se cadastrar também), mas lembre-se de **revisar os cadastros pendentes**
   antes de aprovar — não aprove gente que você não reconhece.

3. **Planos gratuitos têm limites.** Tanto Render quanto Railway têm cotas
   gratuitas (geralmente algumas centenas de horas por mês, ou um valor de
   créditos mensais). Para o uso casual de até 10 pessoas, isso costuma ser
   mais que suficiente. Se um dia passar do limite, essas plataformas avisam
   por e-mail antes de qualquer cobrança.

4. **Atualizações futuras.** Sempre que você quiser mudar algo no sistema, é
   só enviar a mudança para o GitHub (commit + push) — tanto o Render quanto
   a Vercel fazem o redeploy automaticamente, sem precisar repetir os passos
   acima.

---

## Resolução de problemas comuns

**"Erro ao conectar à API" na tela de login**
→ O backend no Render ainda está "acordando" (plano gratuito dorme após
inatividade). Espere 1 minuto e recarregue a página.

**Erro de CORS no console do navegador (F12)**
→ Confira se `FRONTEND_URL` no Render está com a URL exata da Vercel, sem
barra `/` no final.

**"Unknown database" ou erro ao rodar `npm run db:init`**
→ Confira se todas as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME` no Render foram copiadas exatamente como aparecem
no Railway, sem espaços extras.

**Quero usar meu próprio domínio (ex: grexpresso.com.br)**
→ Tanto Render quanto Vercel suportam domínios próprios gratuitamente, nas
configurações do projeto em "Domains". Você precisaria comprar o domínio
separadamente em algum registrador (Registro.br, GoDaddy, etc).
