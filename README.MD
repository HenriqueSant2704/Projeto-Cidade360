# Cidade360

Sistema web desenvolvido para o projeto **Cidade360**, com estrutura separada entre **FrontEnd** e **BackEnd**.
O sistema possui tela de login integrada com API em Node.js, autenticação com JWT e banco de dados MySQL.

## Tecnologias utilizadas

* HTML5
* CSS3
* JavaScript
* Node.js
* Express
* MySQL
* JWT
* Bcrypt
* Dotenv
* MySQL2

## Estrutura do projeto

```txt
PROJETO-CIDADE360-MASTER
│
├── assets
│   ├── icons
│   └── img
│
├── BackEnd
│   ├── src
│   │   └── config
│   │       └── db.js
│   │
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
└── FrontEnd
    ├── pages
    │   ├── login
    │   │   ├── login.css
    │   │   └── login.js
    │   │
    │   └── painel
    │       ├── index.html
    │       ├── painel.css
    │       └── painel.js
    │
    └── login.html
```

## Funcionalidades atuais

* Tela de login
* Validação de email e senha
* Integração do login com API Node.js
* Conexão com banco de dados MySQL
* Cadastro de usuários via API
* Senha criptografada com Bcrypt
* Geração de token JWT
* Armazenamento do usuário no `localStorage` ou `sessionStorage`
* Redirecionamento para o painel após login

## Configuração do ambiente

Antes de rodar o projeto, entre na pasta `BackEnd` e instale as dependências:

```bash
cd BackEnd
npm install
```

## Arquivo `.env`

Crie um arquivo chamado `.env` dentro da pasta `BackEnd` com as seguintes configurações:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=cidade360
DB_CONNECTION_LIMIT=10

JWT_SECRET=cidade360_chave_super_secreta_troque_depois
JWT_EXPIRES_IN=2h
```

Caso seu MySQL tenha senha, preencha o campo:

```env
DB_PASSWORD=sua_senha_aqui
```

## Banco de dados

Crie o banco de dados e a tabela de usuários no MySQL:

```sql
CREATE DATABASE IF NOT EXISTS cidade360;

USE cidade360;

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    nome VARCHAR(150) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    telefone VARCHAR(20) NOT NULL,

    senha_hash VARCHAR(255) NOT NULL,

    tipo_usuario ENUM(
        'CIDADAO',
        'ADMIN'
    ) NOT NULL DEFAULT 'CIDADAO',

    pontos INT DEFAULT 0,

    ativo BOOLEAN DEFAULT TRUE,

    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);
```

## Como rodar o projeto

Dentro da pasta `BackEnd`, execute:

```bash
npm run dev
```

Ou, caso queira rodar sem Nodemon:

```bash
npm start
```

Depois acesse no navegador:

```txt
http://localhost:3000
```

ou:

```txt
http://localhost:3000/login
```

## Cadastro de usuário para teste

Com a API rodando, abra o PowerShell e execute:

```powershell
$body = @{
  nome = "Administrador"
  email = "admin@cidade360.com"
  telefone = "17999999999"
  senha = "123456"
  tipo_usuario = "ADMIN"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/cadastrar" -Method Post -ContentType "application/json" -Body $body
```

Depois acesse o sistema com:

```txt
Email: admin@cidade360.com
Senha: 123456
```

## Rotas da API

### Testar conexão com o banco

```http
GET /api/teste
```

Essa rota verifica se a API está conectando corretamente ao banco de dados.

### Login

```http
POST /api/login
```

Corpo da requisição:

```json
{
  "email": "admin@cidade360.com",
  "senha": "123456"
}
```

Resposta esperada:

```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso.",
  "token": "TOKEN_JWT",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@cidade360.com",
    "telefone": "17999999999",
    "tipo_usuario": "ADMIN",
    "pontos": 0,
    "ativo": true
  }
}
```

### Cadastrar usuário

```http
POST /api/cadastrar
```

Corpo da requisição:

```json
{
  "nome": "Administrador",
  "email": "admin@cidade360.com",
  "telefone": "17999999999",
  "senha": "123456",
  "tipo_usuario": "ADMIN"
}
```

### Buscar usuário logado

```http
GET /api/me
```

Essa rota precisa receber o token JWT no cabeçalho:

```http
Authorization: Bearer SEU_TOKEN_AQUI
```

## Observações importantes

O arquivo `.env` não deve ser enviado para o GitHub, pois contém informações sensíveis como usuário, senha do banco e chave JWT.

Por isso, o `.gitignore` deve conter:

```gitignore
node_modules
.env
package-lock.json
```

## Problemas comuns

### Erro de permissão no banco

Caso apareça um erro parecido com:

```txt
Access denied for user
```

verifique se o usuário configurado no `.env` tem permissão para acessar o banco `cidade360`.

### Email já cadastrado

Caso apareça:

```txt
Esse email já está cadastrado.
```

significa que o usuário já existe na tabela `usuarios`.
Nesse caso, tente fazer login ou apague o usuário antigo no banco antes de cadastrar novamente.

### Erro interno no servidor

Se aparecer:

```txt
Erro interno no servidor.
```

verifique o terminal onde a API está rodando, pois o erro detalhado aparecerá nele.

## Status do projeto

Projeto em desenvolvimento.

Funcionalidades implementadas até o momento:

* Estrutura inicial do FrontEnd
* Tela de login
* API Node.js
* Conexão com MySQL
* Cadastro de usuários
* Login com autenticação
* Geração de token JWT

## Autor

Desenvolvido por Leonardo Causin.
