/*===================================================================

 TEMA CLARO / ESCURO

 Carregado no <head> de todas as páginas, ANTES do CSS aparecer,
 para a página já abrir com o tema certo (sem "piscar" branco).

 A escolha fica nas preferências salvas pelo global.js
 (Configurações > Tema escuro). O CSS usa html[data-tema="escuro"].

===================================================================*/

(() => {

    "use strict";

    // Mesma chave do global.js (CHAVE_PREFERENCIAS_CIDADE360).
    const CHAVE = "preferencias_cidade360";

    function temaEscuroSalvo() {

        try {

            return Boolean(
                JSON.parse(localStorage.getItem(CHAVE) || "{}").temaEscuro
            );

        } catch (error) {

            return false;

        }

    }


    /*
     * Aplica o tema na página.
     * animar = true faz as cores trocarem suavemente (usado no botão das Configurações).
     */
    function aplicarTemaCidade360(escuro, animar = false) {

        const html = document.documentElement;

        if (animar) {

            html.classList.add("trocando-tema");

            clearTimeout(aplicarTemaCidade360.timer);

            aplicarTemaCidade360.timer = setTimeout(() => {
                html.classList.remove("trocando-tema");
            }, 450);

        }

        if (escuro) {
            html.dataset.tema = "escuro";
        } else {
            delete html.dataset.tema;
        }

        // Avisa as páginas (ex.: mapas) que o tema mudou.
        window.dispatchEvent(
            new CustomEvent("cidade360:tema", { detail: { escuro } })
        );

    }

    window.aplicarTemaCidade360 = aplicarTemaCidade360;

    aplicarTemaCidade360(temaEscuroSalvo());

})();
