# Cidade360

Aplicação web para cidadãos registrarem ocorrências municipais e acompanharem a resposta da prefeitura. Administradores gerenciam as ocorrências, publicam avisos e administram o acesso da equipe.

## Estrutura

- `FrontEnd/pages`: páginas em HTML, CSS e JavaScript. A API e as páginas são servidas pelo mesmo Express.
- `BackEnd/server.js`: entrada da API Node.js.
- `BackEnd/src/routes`, `controllers` e `models`: rotas HTTP, regras de aplicação e acesso ao MySQL.
- `BackEnd/src/database/schema.sql`: estrutura para uma instalação nova.
- `BackEnd/src/database/migrations`: alterações para bancos existentes. A sequência disponível começa na `004` e vai até a `011`.
- `assets`: imagens, ícones e dados públicos usados pelas páginas.

## Dependências

Node.js, MySQL, uma conta Brevo para envio de e-mails e Cloudinary para armazenar fotos de ocorrências e avisos. O mapa usa Leaflet e OpenStreetMap.

## Configuração local

```powershell
cd BackEnd
npm ci
Copy-Item .env.example .env
```

Preencha o `.env` com as credenciais locais. Para MySQL local, deixe `DB_SSL_CA` vazio. Para Aiven, defina `DB_SSL_CA=src/certs/ca.pem`; conexões remotas sem certificado são recusadas. Use uma chave aleatória longa em `JWT_SECRET`. O backend usa a API da Brevo, não SMTP. Para fotos, configure as três variáveis `CLOUDINARY_*`.

Em um banco novo, aplique `BackEnd/src/database/schema.sql`. Em um banco existente, faça backup e aplique somente as migrações pendentes, em ordem. A migração `009` concede pontos a ocorrências anteriores e recalcula `usuarios.pontos`; confira o resultado antes de executá-la em produção. As migrações não são aplicadas automaticamente pelo servidor.

```powershell
npm run dev
```

A aplicação abre em `http://localhost:3000`. `GET /api/teste` verifica a conexão com o banco.

## API principal

| Área | Rotas | Acesso |
| --- | --- | --- |
| Conta | `/api/login`, `/api/cadastrar`, `/api/me`, `/api/cadastro/email/*`, `/api/recuperar-senha/*` | Públicas, exceto `/api/me` |
| Ocorrências | `/api/ocorrencias/*`, `/api/ocorrencias-proximas` | Login; mudanças de status exigem ADMIN |
| Cidade | `/api/cidade-atendida` | Pública |
| Avisos | `/api/avisos/*` | Login; publicação e edição exigem ADMIN |
| Sininho e pontos | `/api/notificacoes/*`, `/api/pontos/*` | Login |
| Preferências | `/api/preferencias` | Login |
| Administração | `/api/administradores/*` | ADMIN |
| Convites | `/api/convites-admin/:token` | Pública; o token do convite autoriza o acesso |

Rotas privadas recebem `Authorization: Bearer <token>`. O cadastro público sempre cria uma conta `CIDADAO`. O primeiro administrador deve ser criado por um procedimento controlado no banco; depois, a equipe pode promover cidadãos ou convidar novos administradores pela interface.

## Regras importantes

- A única cidade atendida atualmente é Jaborandi-SP. O servidor valida cidade no cadastro e coordenadas da ocorrência; o limite tem tolerância de 150 metros.
- Ocorrências recebem de uma a cinco fotos JPG, PNG ou WEBP de até 5 MB cada. Avisos aceitam uma foto. Arquivos são validados antes do envio ao Cloudinary.
- Cada etapa da ocorrência concede pontos uma vez: registro `+1`, análise `+2`, atendimento `+3`, resolução `+5`. Cancelamento retira os pontos da ocorrência e reabertura os devolve.
- Notificações e pontos são processados em melhor esforço após a ação principal. Monitore os logs e confira o saldo contra `pontos_historico` após falhas.
- O servidor publica `FrontEnd`, `assets` e `/uploads` para fotos legadas. Arquivos internos de `BackEnd` não devem ser servidos ao navegador.

## Testes

```powershell
cd BackEnd
npm test
npm audit --omit=dev
```

Antes de publicar, teste as rotas com contas de ADMIN e CIDADAO e confira o esquema do banco. Evite usar contas reais nos testes que criam ocorrências, avisos ou convites.

## Autor

Desenvolvido por Leonardo Causin.
