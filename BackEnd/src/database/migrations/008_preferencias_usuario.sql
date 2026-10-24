-- ========================================================================================
-- CIDADE360
-- PREFERÊNCIAS DO USUÁRIO SALVAS NA CONTA
-- Execute uma única vez, antes de publicar o código novo do backend.
-- ========================================================================================


-- ========================================================================================
-- PREFERÊNCIAS
-- Tema escuro, contador do sininho e reduzir animações acompanham o usuário em qualquer
-- navegador ou aparelho. NULL = o usuário ainda não mudou nada (vale o padrão).
-- Exemplo: {"temaEscuro": true, "contadorNotificacoes": true, "reduzirAnimacoes": false}
-- ========================================================================================

ALTER TABLE usuarios
    ADD COLUMN preferencias JSON NULL
        AFTER pontos;


SELECT
    'Preferências do usuário configuradas.' AS resultado;
