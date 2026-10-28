# Administradores: atualização do backend

O banco de produção já executou a versão antiga da migração `011_administradores.sql`.
Por isso, **não execute uma versão substituta da 011**. A atualização incremental está em
`src/database/migrations/012_permissoes_administradores.sql`. O código bloqueia as
mudanças da equipe com `503 MIGRACAO_PENDENTE` até a 012 estar completa; consultas
continuam disponíveis para os administradores atuais.

## Sequência segura no Aiven

1. Gere um backup atual do banco com `mysqldump --single-transaction` e guarde-o fora
   do repositório. Verifique que o arquivo tem conteúdo antes de continuar.
2. Confirme que a 010 foi aplicada: `SHOW COLUMNS FROM usuarios LIKE 'cidade';`.
3. Confirme o estado antigo: `SHOW TABLES LIKE '%admin%';` deve mostrar
   `convites_admin` e `historico_administradores`, sem `permissoes_admin`.
4. Execute `src/database/migrations/012_permissoes_administradores.sql` no MySQL
   do Aiven usando TLS (`--ssl-mode=VERIFY_CA --ssl-ca=src/certs/ca.pem`).
5. Confira `SHOW TABLES LIKE '%admin%';` e o SELECT final da 012. Ele deve
   mostrar **exatamente um** `principal=1`, atribuído ao administrador ativo de
   menor ID, e uma linha para cada administrador ativo. Verifique também os cinco
   tipos novos em `SHOW COLUMNS FROM notificacoes LIKE 'tipo';`.
6. Publique o backend no Render e leia o log de inicialização. `APP_URL` é opcional;
   quando configurada, use a URL pública sem barra final. Sem ela, o link do
   convite usa a origem da requisição.

A 012 preserva convites e histórico. Convites antigos pendentes passam a carregar
Ocorrências e Avisos, sem Equipe. Reexecutar a 012 não redefine permissões já
atribuídas. A tabela `usuarios` não muda.

## Contrato da API para o frontend

As rotas `GET /api/me` e `POST /api/login` devolvem, para ADMIN,
`usuario.permissoes = { principal, ocorrencias, avisos, equipe, configurado }`.
`GET /api/administradores` devolve `eu.pode_dar`, `eu.principal`, permissões e
`pode_gerenciar` em cada administrador, convites com permissões e
`migracao_pendente`. A interface deve usar esses campos para exibir as ações.

Para promover e convidar, envie `permissoes` como lista não vazia com valores de
`ocorrencias`, `avisos` e/ou `equipe`, além de `senha_confirmacao`. A permissão
Equipe só pode ser concedida pelo principal. Alterar permissões usa
`POST /api/administradores/:id/permissoes` e permite lista vazia para suspender
o acesso às áreas. Passar o cargo usa `POST /api/administradores/:id/principal`.
Reenviar convite agora também exige `senha_confirmacao`.

As decisões de acesso são refeitas no servidor a cada requisição. Até o frontend
ser adaptado a este contrato, os formulários antigos de promoção e convite
receberão `400 PERMISSOES_INVALIDAS`.

## Verificação HTTP após a publicação

Use contas de teste e substitua os valores entre `<...>`. Em PowerShell, execute
`curl.exe` para evitar o alias do PowerShell. Os exemplos de alteração de dados
devem ser feitos apenas com contas descartáveis.

```powershell
$base = 'https://cidade360-api-virginia.onrender.com'
$principal = '<TOKEN_DO_PRINCIPAL>'
$soAvisos = '<TOKEN_DO_ADMIN_SO_AVISOS>'

curl.exe -i -H "Authorization: Bearer $soAvisos" "$base/api/administradores"
curl.exe -i -H "Authorization: Bearer $soAvisos" "$base/api/ocorrencias/admin/resumo"
curl.exe -i -X POST -H "Authorization: Bearer $principal" -H 'Content-Type: application/json' -d '{"usuario_id":123,"senha_confirmacao":"<SENHA>"}' "$base/api/administradores/promover"
```

Os dois GET devem responder `403 SEM_PERMISSAO`; a promoção sem lista de
permissões deve responder `400 PERMISSOES_INVALIDAS`. Para testar a proteção do
principal, use um administrador com Equipe que não seja o principal e tente
`POST /api/administradores/<ID_PRINCIPAL>/remover` com sua senha: deve ser
`403 SEM_PERMISSAO_SOBRE_ALVO`. Pelo principal, a mudança de uma conta descartável
com `{"permissoes":["avisos"],"senha_confirmacao":"<SENHA>"}` em
`POST /api/administradores/<ID_TESTE>/permissoes` deve responder `200`.
