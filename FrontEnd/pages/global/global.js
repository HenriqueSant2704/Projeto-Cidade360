/*===================================================================

 PREFERÊNCIAS DO USUÁRIO

 Tema escuro, contador do sininho e reduzir animações ficam salvos
 na CONTA (/api/preferencias), então valem em qualquer navegador.
 O navegador guarda só uma cópia, para a página já abrir com o
 tema certo antes do login ser confirmado. "Menu recolhido" fica
 só no navegador, porque depende da tela de cada aparelho.

 A chave NÃO começa com "cidade360_" de propósito: o logout.js apaga
 tudo que começa com "cidade360_", e a cópia deve continuar.

===================================================================*/

const CHAVE_PREFERENCIAS_CIDADE360 =

    "preferencias_cidade360";

const PREFERENCIAS_PADRAO_CIDADE360 = {

    menuRecolhido: false,

    contadorNotificacoes: true,

    reduzirAnimacoes: false,

    // Tema escuro (o tema.js aplica antes da página aparecer)
    temaEscuro: false

};


function lerPreferenciasCidade360() {

    try {

        const salvas =

            JSON.parse(
                localStorage.getItem(
                    CHAVE_PREFERENCIAS_CIDADE360
                ) || "{}"
            );

        return {
            ...PREFERENCIAS_PADRAO_CIDADE360,
            ...salvas
        };

    } catch (error) {

        return {
            ...PREFERENCIAS_PADRAO_CIDADE360
        };

    }

}


function salvarPreferenciasCidade360(preferencias) {

    try {

        localStorage.setItem(
            CHAVE_PREFERENCIAS_CIDADE360,
            JSON.stringify(preferencias)
        );

    } catch (error) {

        console.warn(
            "Não foi possível salvar as preferências.",
            error
        );

    }

}


function aplicarPreferenciasVisuaisCidade360() {

    document.documentElement.classList.toggle(

        "reduzir-animacoes",

        lerPreferenciasCidade360().reduzirAnimacoes

    );

}


aplicarPreferenciasVisuaisCidade360();


/*-------------------------------------------------------------------
  PREFERÊNCIAS NA CONTA
-------------------------------------------------------------------*/

const API_PREFERENCIAS_CIDADE360 = "/api/preferencias";

const PREFERENCIAS_DA_CONTA_CIDADE360 = [
    "temaEscuro",
    "contadorNotificacoes",
    "reduzirAnimacoes"
];

// "conta" quando o servidor salvou; "navegador" enquanto o servidor não tiver a migração 008.
let ondePreferenciasFicamCidade360 = "navegador";
let preferenciasSincronizadasCidade360 = false;


function tokenPreferenciasCidade360() {
    return (
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token")
    );
}


function preferenciasDaContaCidade360(preferencias) {
    return Object.fromEntries(
        PREFERENCIAS_DA_CONTA_CIDADE360.map((chave) => [chave, Boolean(preferencias[chave])])
    );
}


function aplicarTodasPreferenciasCidade360() {
    aplicarPreferenciasVisuaisCidade360();

    window.aplicarTemaCidade360?.(
        lerPreferenciasCidade360().temaEscuro
    );

    window.dispatchEvent(
        new CustomEvent("cidade360:preferencias")
    );
}


async function enviarPreferenciasDaContaCidade360(preferencias) {
    const token = tokenPreferenciasCidade360();

    if (!token) {
        return false;
    }

    try {
        const resposta = await fetch(API_PREFERENCIAS_CIDADE360, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(preferencias)
        });

        if (resposta.ok) {
            ondePreferenciasFicamCidade360 = "conta";
        }

        return resposta.ok;

    } catch (error) {
        console.warn("Não foi possível salvar as preferências na conta.", error);
        return false;
    }
}


/*
  Roda uma vez por página, quando o login é confirmado:
  - a conta já tem preferências → elas vencem e viram a cópia do navegador;
  - a conta ainda não tem (primeiro acesso depois da atualização) → envia as do navegador;
  - servidor sem a migração 008 (404/503) → continua só com o navegador.
*/
async function sincronizarPreferenciasDaContaCidade360() {
    const token = tokenPreferenciasCidade360();

    if (preferenciasSincronizadasCidade360 || !token) {
        return;
    }

    preferenciasSincronizadasCidade360 = true;

    try {
        const resposta = await fetch(API_PREFERENCIAS_CIDADE360, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store"
        });

        const dados = await resposta.json().catch(() => null);

        if (!resposta.ok || !dados?.sucesso) {
            return;
        }

        ondePreferenciasFicamCidade360 = "conta";

        const locais = lerPreferenciasCidade360();

        if (!dados.preferencias) {
            await enviarPreferenciasDaContaCidade360(preferenciasDaContaCidade360(locais));
            return;
        }

        const mudou = PREFERENCIAS_DA_CONTA_CIDADE360.some(
            (chave) => typeof dados.preferencias[chave] === "boolean" &&
                dados.preferencias[chave] !== locais[chave]
        );

        salvarPreferenciasCidade360({ ...locais, ...dados.preferencias });

        if (mudou) {
            aplicarTodasPreferenciasCidade360();
        }

    } catch (error) {
        console.warn("Não foi possível carregar as preferências da conta.", error);
    } finally {
        window.dispatchEvent(new CustomEvent("cidade360:preferencias"));
    }
}

window.addEventListener("cidade360:usuario-carregado", sincronizarPreferenciasDaContaCidade360);

if (window.usuarioLogado) {
    sincronizarPreferenciasDaContaCidade360();
}


// Se o tema for trocado em outra aba, esta aba acompanha.
window.addEventListener("storage", (event) => {

    if (event.key !== CHAVE_PREFERENCIAS_CIDADE360) {
        return;
    }

    aplicarPreferenciasVisuaisCidade360();

    window.aplicarTemaCidade360?.(
        lerPreferenciasCidade360().temaEscuro
    );

});


/*===================================================================

 MENU LATERAL GLOBAL

===================================================================*/

const menuLateral =

    document.querySelector(".menu-lateral");

const btnMinimizarMenu =

    document.querySelector(".minimizar-menu");


/*===================================================================

 OVERLAY

===================================================================*/

function obterOverlayMenu() {

    let overlay =

        document.querySelector(".overlay-menu");

    if (!overlay) {

        overlay =

            document.createElement("div");

        overlay.className =

            "overlay-menu";

        document.body.appendChild(

            overlay

        );

    }

    return overlay;

}


/*===================================================================

 MOBILE

===================================================================*/

function menuEstaNoMobile() {

    return window.matchMedia(

        "(max-width: 768px)"

    ).matches;

}


/*===================================================================

 OVERLAY

===================================================================*/

function atualizarOverlayMenu() {

    if (!menuLateral) {

        return;

    }

    const overlay =

        obterOverlayMenu();

    const menuAberto =

        menuEstaNoMobile()

            ? menuLateral.classList.contains(
                "menu-aberto"
            )

            : !menuLateral.classList.contains(
                "menu-recolhido"
            );


    if (

        menuEstaNoMobile() &&

        menuAberto

    ) {

        overlay.classList.add(

            "ativo"

        );

    } else {

        overlay.classList.remove(

            "ativo"

        );

    }

}


/*===================================================================

 ESTADO INICIAL

===================================================================*/

function prepararMenuLateral() {

    if (!menuLateral) {

        return;

    }

    if (menuEstaNoMobile()) {

        /*
         * Celular começa fechado.
         */

        menuLateral.classList.remove(

            "menu-aberto"

        );

        menuLateral.classList.add(

            "menu-recolhido"

        );

    } else {

        /*
         * Computador começa aberto,
         * a não ser que o usuário tenha escolhido
         * "Recolher menu lateral" nas configurações.
         */

        menuLateral.classList.remove(

            "menu-aberto"

        );

        menuLateral.classList.toggle(

            "menu-recolhido",

            lerPreferenciasCidade360().menuRecolhido

        );

    }

    atualizarOverlayMenu();

}


/*===================================================================

 ABRIR / FECHAR

===================================================================*/

function alternarMenuLateral() {

    if (!menuLateral) {

        return;

    }


    if (menuEstaNoMobile()) {

        /*
         * Se estiver fechado:
         * remove o estado recolhido
         * e abre o menu.
         */

        if (
            menuLateral.classList.contains(
                "menu-recolhido"
            )
        ) {

            menuLateral.classList.remove(
                "menu-recolhido"
            );

            menuLateral.classList.add(
                "menu-aberto"
            );

        } else {

            /*
             * Se estiver aberto:
             * remove o estado aberto
             * e fecha o menu.
             */

            menuLateral.classList.remove(
                "menu-aberto"
            );

            menuLateral.classList.add(
                "menu-recolhido"
            );

        }

    } else {

        /*
         * Computador:
         * usa somente menu-recolhido.
         */

        menuLateral.classList.toggle(
            "menu-recolhido"
        );

    }

    atualizarOverlayMenu();

}


/*===================================================================

 FECHAR

===================================================================*/

function fecharMenuLateral() {

    if (!menuLateral) {

        return;

    }


    if (menuEstaNoMobile()) {

        menuLateral.classList.remove(
            "menu-aberto"
        );

        menuLateral.classList.add(
            "menu-recolhido"
        );

    } else {

        menuLateral.classList.add(
            "menu-recolhido"
        );

    }

    atualizarOverlayMenu();

}


/*===================================================================

 EVENTOS

===================================================================*/

function inicializarMenuLateral() {

    if (!menuLateral) {

        return;

    }

    const overlay =

        obterOverlayMenu();


    prepararMenuLateral();


    /*
     * Botão abrir / fechar
     */

    btnMinimizarMenu

        ?.addEventListener(

            "click",

            alternarMenuLateral

        );


    /*
     * Clique fora fecha o menu no celular.
     */

    overlay.addEventListener(

        "click",

        () => {

            if (menuEstaNoMobile()) {

                fecharMenuLateral();

            }

        }

    );


    /*
     * ESC fecha o menu no celular.
     */

    document.addEventListener(

        "keydown",

        (event) => {

            if (

                event.key === "Escape" &&

                menuEstaNoMobile()

            ) {

                fecharMenuLateral();

            }

        }

    );


    /*===================================================================

     TROCA ENTRE DESKTOP E MOBILE

     ===================================================================*/

    let estavaNoMobile =

        menuEstaNoMobile();


    window.addEventListener(

        "resize",

        () => {

            const estaNoMobileAgora =

                menuEstaNoMobile();


            /*
             * Só altera o estado quando realmente
             * mudou de desktop para mobile ou
             * de mobile para desktop.
             */

            if (

                estavaNoMobile !==

                estaNoMobileAgora

            ) {

                if (

                    estaNoMobileAgora

                ) {

                    /*
                     * Entrou no mobile:
                     * menu começa fechado.
                     */

                    menuLateral.classList.remove(
                        "menu-aberto"
                    );

                    menuLateral.classList.add(
                        "menu-recolhido"
                    );

                } else {

                    /*
                     * Voltou para desktop:
                     * respeita a preferência do usuário.
                     */

                    menuLateral.classList.remove(
                        "menu-aberto"
                    );

                    menuLateral.classList.toggle(
                        "menu-recolhido",
                        lerPreferenciasCidade360().menuRecolhido
                    );

                }

                atualizarOverlayMenu();

            }


            estavaNoMobile =

                estaNoMobileAgora;

        }

    );

}


/*===================================================================

 INICIALIZAÇÃO

===================================================================*/

if (

    document.readyState === "loading"

) {

    document.addEventListener(

        "DOMContentLoaded",

        inicializarMenuLateral

    );

} else {

    inicializarMenuLateral();

}




/*===================================================================

 MENU SUPERIOR (NOVO)

 - Sino: painel de notificações
 - Engrenagem: painel de configurações (provisório)
 - Perfil: dados do usuário, atalhos e "Sair da conta"

 Os painéis são criados aqui mesmo e presos ao <body>,
 para ficarem por cima de tudo (inclusive dos mapas).

===================================================================*/

(() => {

    "use strict";


    /*---------------------------------------------------------------
      CONFIGURAÇÃO
    ---------------------------------------------------------------*/

    const API_TOPO = "/api";
    const PAGINA_OCORRENCIAS_TOPO = "/FrontEnd/pages/ocorrencia/ocorrencia.html";
    const LOGIN_PAGE_TOPO = "/FrontEnd/pages/login/login.html";
    const PAGINA_AVISOS_TOPO = "/FrontEnd/pages/avisos/avisos.html";
    const PAGINA_PERFIL_TOPO = "/FrontEnd/pages/perfil/perfil.html";
    const PAGINA_PONTOS_TOPO = "/FrontEnd/pages/pontos/pontos.html";
    const PAGINA_ADMINISTRADORES_TOPO = "/FrontEnd/pages/administradores/administradores.html";

    // Saldo e título do cartão do perfil: busca de novo depois de 1 minuto.
    const VALIDADE_RESUMO_PONTOS = 60 * 1000;

    // Também não começa com "cidade360_" para sobreviver ao logout.
    const CHAVE_LIDAS = "notificacoes_lidas_cidade360";

    const LIMITE_NOTIFICACOES = 15;
    const LIMITE_NOTIFICACOES_SERVIDOR = 30;
    const INTERVALO_ATUALIZACAO = 2 * 60 * 1000; // 2 minutos

    // Só usado no modo provisório (servidor ainda sem a tabela de notificações).
    const AVISOS_GERAIS = [
        {
            id: "boas-vindas",
            titulo: "Bem-vindo ao Cidade360",
            texto: "Registre problemas da cidade e acompanhe cada etapa do atendimento por aqui.",
            data: "2026-09-01T09:00:00"
        }
    ];

    // Textos das notificações do cidadão, por status da ocorrência.
    const NOTIFICACAO_POR_STATUS = {
        recebido: {
            titulo: "Ocorrência recebida",
            texto: (titulo) => `Recebemos "${titulo}". Ela aguarda a análise da prefeitura.`
        },
        em_analise: {
            titulo: "Ocorrência em análise",
            texto: (titulo) => `A prefeitura está analisando "${titulo}".`
        },
        em_andamento: {
            titulo: "Ocorrência em andamento",
            texto: (titulo) => `Uma equipe já está cuidando de "${titulo}".`
        },
        resolvido: {
            titulo: "Ocorrência resolvida",
            texto: (titulo) => `"${titulo}" foi resolvida. Obrigado por ajudar a cuidar da cidade!`
        },
        cancelado: {
            titulo: "Ocorrência cancelada",
            texto: (titulo) => `"${titulo}" foi cancelada. Veja o motivo nos detalhes.`
        }
    };


    /*---------------------------------------------------------------
      ÍCONES
    ---------------------------------------------------------------*/

    function svg(caminhos, tamanho = 18, espessura = 2) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${espessura}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos}</svg>`;
    }

    const ICONES = {
        sino: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', 26, 1.6),
        megafone: svg('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
        caixaEntrada: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
        lupa: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
        ferramenta: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>'),
        confirmado: svg('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>'),
        cancelado: svg('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
        lixeira: svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>', 15),
        marcarLidas: svg('<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>', 16),
        medalha: svg('<circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-1.5 8.5 5-3 5 3-1.5-8.5"/>'),
        prancheta: svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h4"/>'),
        usuario: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
        escudo: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
        ajustes: svg('<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>'),
        ajuda: svg('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>'),
        sair: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
        lua: svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>', 16),
        colunas: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>', 16),
        onda: svg('<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>', 16),
        bolinha: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', 16),
        cadeado: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', 13),
        seta: svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', 16),
        coroa: svg('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>'),
        equipe: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>')
    };

    const VISUAL_NOTIFICACAO = {
        recebido: { classe: "tom-azul", icone: ICONES.caixaEntrada },
        em_analise: { classe: "tom-amarelo", icone: ICONES.lupa },
        em_andamento: { classe: "tom-verde", icone: ICONES.ferramenta },
        resolvido: { classe: "tom-roxo", icone: ICONES.confirmado },
        cancelado: { classe: "tom-vermelho", icone: ICONES.cancelado },
        geral: { classe: "tom-indigo", icone: ICONES.megafone },
        titulo: { classe: "tom-amarelo", icone: ICONES.medalha },
        // Equipe de administradores
        admin_promovido: { classe: "tom-verde", icone: ICONES.escudo },
        admin_removido: { classe: "tom-vermelho", icone: ICONES.usuario },
        admin_permissoes: { classe: "tom-azul", icone: ICONES.ajustes },
        admin_principal: { classe: "tom-amarelo", icone: ICONES.coroa },
        admin_equipe: { classe: "tom-indigo", icone: ICONES.equipe }
    };

    // Avisos da equipe de administradores (ficam na aba "Gerais").
    // Os da própria pessoa mudam o acesso dela: o menu é atualizado na hora.
    const TIPOS_ADMIN = ["admin_promovido", "admin_removido", "admin_permissoes", "admin_principal", "admin_equipe"];
    const TIPOS_MUDAM_MEU_ACESSO = ["admin_promovido", "admin_removido", "admin_permissoes", "admin_principal"];


    /*---------------------------------------------------------------
      ESTADO
    ---------------------------------------------------------------*/

    const estado = {
        usuario: null,
        ocorrencias: [],
        notificacoes: [],
        doServidor: [],
        // "servidor": notificações salvas no banco (/api/notificacoes).
        // "local": modo provisório, montado a partir das ocorrências.
        fonte: null,
        aba: "todas",
        carregando: false,
        erro: false,
        jaCarregou: false,
        painelAberto: null,
        gatilhos: {},
        paineis: {},
        timerAtualizacao: null,
        // Cidadão: { saldo, titulo } vindo de /api/pontos/resumo
        resumoPontos: null,
        resumoPontosEm: 0,
        carregandoResumoPontos: false,
        // Notificações de mudança de acesso que já fizeram o usuário ser recarregado
        acessoConferido: new Set()
    };


    /*---------------------------------------------------------------
      UTILITÁRIOS
    ---------------------------------------------------------------*/

    function escaparHtml(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    // Mesma regra do acompanhamentoOcorrencias.js
    function obterChaveStatus(status) {
        const valor = normalizarTexto(status);

        if (valor === "recebido") return "recebido";
        if (valor === "em analise" || valor === "pendente") return "em_analise";
        if (valor === "em andamento" || valor === "em atendimento") return "em_andamento";
        if (valor === "resolvido") return "resolvido";
        if (valor === "cancelado") return "cancelado";

        return null;
    }

    function obterToken() {
        return (
            localStorage.getItem("cidade360_token") ||
            sessionStorage.getItem("cidade360_token")
        );
    }

    function obterUsuarioArmazenado() {
        const valor =
            localStorage.getItem("cidade360_usuario") ||
            sessionStorage.getItem("cidade360_usuario");

        try {
            return valor ? JSON.parse(valor) : null;
        } catch (error) {
            return null;
        }
    }

    function ehAdministrador() {
        return String(estado.usuario?.tipo_usuario || "").trim().toUpperCase() === "ADMIN";
    }

    // Permissões do administrador: "ocorrencias", "avisos" ou "equipe" (o principal tem todas).
    // Sem a informação (login antigo ou banco sem a migração 012), vale o acesso de antes;
    // o servidor confere de qualquer jeito.
    function temPermissao(permissao) {
        const permissoes = estado.usuario?.permissoes;

        return ehAdministrador() && (!permissoes || permissoes.principal === true || permissoes[permissao] === true);
    }

    function tempoDe(valor) {
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? 0 : data.getTime();
    }

    function tempoRelativo(valor) {
        const momento = tempoDe(valor);

        if (!momento) {
            return "";
        }

        const segundos = Math.max(0, (Date.now() - momento) / 1000);

        if (segundos < 60) return "agora mesmo";
        if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
        if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
        if (segundos < 172800) return "ontem";
        if (segundos < 604800) return `há ${Math.floor(segundos / 86400)} dias`;

        return new Date(momento).toLocaleDateString("pt-BR");
    }

    function iniciais(nome) {
        const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);

        if (partes.length === 0) {
            return "U";
        }

        const primeira = partes[0][0];
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

        return (primeira + ultima).toUpperCase();
    }

    function nomeTipoUsuario() {
        if (!ehAdministrador()) {
            return "Cidadão";
        }

        return estado.usuario?.permissoes?.principal ? "Administrador principal" : "Administrador";
    }


    /*---------------------------------------------------------------
      NOTIFICAÇÕES LIDAS (por usuário, neste navegador)
    ---------------------------------------------------------------*/

    function chaveLidas() {
        return `${CHAVE_LIDAS}:${estado.usuario?.id ?? "anonimo"}`;
    }

    function lerLidas() {
        try {
            return new Set(JSON.parse(localStorage.getItem(chaveLidas()) || "[]"));
        } catch (error) {
            return new Set();
        }
    }

    function salvarLidas(lidas) {
        try {
            // Guarda só as 300 mais recentes para não crescer para sempre.
            localStorage.setItem(chaveLidas(), JSON.stringify([...lidas].slice(-300)));
        } catch (error) {
            console.warn("Não foi possível salvar as notificações lidas.", error);
        }
    }

    function marcarComoLidas(ids, { todas = false } = {}) {
        if (estado.fonte === "servidor") {
            marcarLidasNoServidor(ids, todas);
        } else {
            const lidas = lerLidas();
            ids.forEach((id) => lidas.add(id));
            salvarLidas(lidas);
        }

        estado.notificacoes.forEach((notificacao) => {
            if (ids.includes(notificacao.id)) {
                notificacao.lida = true;
            }
        });

        renderizarNotificacoes();
        atualizarContador();
    }


    // Atualiza a tela na hora e avisa o servidor em segundo plano.
    function marcarLidasNoServidor(ids, todas) {
        const token = obterToken();

        if (!token) {
            return;
        }

        const pedidos = todas
            ? [`${API_TOPO}/notificacoes/lidas`]
            : ids.map((id) => `${API_TOPO}/notificacoes/${encodeURIComponent(String(id).replace("srv-", ""))}/lida`);

        pedidos.forEach((url) => {
            fetch(url, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
                keepalive: true
            }).catch((error) => {
                console.warn("Não foi possível marcar a notificação como lida.", error);
            });
        });
    }


    /*---------------------------------------------------------------
      NOTIFICAÇÕES DO SERVIDOR

      Vêm da tabela "notificacoes" (migração 007):
      - Cidadão: cada mudança na ocorrência dele, com os pontos ganhos.
      - Admin: cada ocorrência nova registrada.
      - Todos: cada aviso novo publicado pela prefeitura.
      - Equipe de administradores: quem foi promovido, removido ou teve
        as permissões mudadas, e quem cuida da equipe (migração 012).
    ---------------------------------------------------------------*/

    function linkDaNotificacao(notificacao) {
        if (notificacao.tipo === "titulo_novo") {
            return PAGINA_PONTOS_TOPO;
        }

        // Quem cuida da equipe vai para a página Administradores; os outros só leem.
        if (TIPOS_ADMIN.includes(notificacao.tipo)) {
            return notificacao.tipo !== "admin_removido" && temPermissao("equipe")
                ? PAGINA_ADMINISTRADORES_TOPO
                : null;
        }

        if (notificacao.aviso_id) {
            return `${PAGINA_AVISOS_TOPO}?aviso=${Number(notificacao.aviso_id) || 0}`;
        }

        if (notificacao.ocorrencia_id) {
            return `${PAGINA_OCORRENCIAS_TOPO}?ocorrencia=${Number(notificacao.ocorrencia_id) || 0}`;
        }

        return null;
    }

    function visualDoServidor(notificacao) {
        if (notificacao.tipo === "titulo_novo") return "titulo";
        if (notificacao.tipo === "aviso_novo") return "geral";
        if (TIPOS_ADMIN.includes(notificacao.tipo)) return notificacao.tipo;

        return VISUAL_NOTIFICACAO[notificacao.status] ? notificacao.status : "recebido";
    }

    // Lixeirinha: some da tela na hora e o servidor apaga do banco em segundo plano.
    async function excluirNotificacao(id) {
        const token = obterToken();
        const idServidor = String(id).replace("srv-", "");

        if (!token || estado.fonte !== "servidor") {
            return;
        }

        estado.doServidor = estado.doServidor.filter((n) => String(n.id) !== idServidor);
        estado.notificacoes = estado.notificacoes.filter((n) => n.id !== id);

        renderizarNotificacoes();
        atualizarContador();

        try {
            const resposta = await fetch(`${API_TOPO}/notificacoes/${encodeURIComponent(idServidor)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            // 404 = já não existia: para o usuário dá no mesmo.
            if (!resposta.ok && resposta.status !== 404) {
                throw new Error(`HTTP ${resposta.status}`);
            }
        } catch (error) {
            // Não apagou no banco: recarrega para a notificação voltar a aparecer.
            console.warn("Não foi possível excluir a notificação.", error);
            carregarNotificacoes({ silencioso: true });
        }
    }

    function montarNotificacoesDoServidor() {
        estado.notificacoes = estado.doServidor.map((notificacao) => ({
            id: `srv-${notificacao.id}`,
            tipo: notificacao.tipo === "aviso_novo" || notificacao.tipo === "titulo_novo" || TIPOS_ADMIN.includes(notificacao.tipo)
                ? "geral"
                : "ocorrencia",
            visual: visualDoServidor(notificacao),
            titulo: notificacao.titulo,
            texto: notificacao.texto,
            pontos: Number(notificacao.pontos) || 0,
            data: notificacao.data_criacao,
            link: linkDaNotificacao(notificacao),
            lida: Boolean(notificacao.lida)
        }));
    }

    /*
      Devolve true quando o servidor respondeu.
      Devolve false quando o servidor ainda não tem a rota ou a tabela
      (404 ou 503 NOTIFICACOES_INDISPONIVEIS): aí o sininho usa o modo provisório.
    */
    async function carregarDoServidor(token) {
        const resposta = await fetch(`${API_TOPO}/notificacoes?limite=${LIMITE_NOTIFICACOES_SERVIDOR}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store"
        });

        const dados = await resposta.json().catch(() => null);

        if (
            resposta.status === 404 ||
            (resposta.status === 503 && dados?.codigo === "NOTIFICACOES_INDISPONIVEIS")
        ) {
            return false;
        }

        if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.notificacoes)) {
            throw new Error(dados?.mensagem || "Resposta inválida.");
        }

        // Mantém marcadas as que o usuário acabou de ler, se o PATCH ainda estiver a caminho.
        const lidasAgora = new Set(
            estado.notificacoes.filter((n) => n.lida).map((n) => n.id)
        );

        estado.doServidor = dados.notificacoes.map((notificacao) => ({
            ...notificacao,
            lida: notificacao.lida || lidasAgora.has(`srv-${notificacao.id}`)
        }));

        conferirMudancaDeAcesso();

        return true;
    }

    /*
      Alguém promoveu, removeu ou mudou as permissões desta pessoa com a página aberta:
      pede para o authGuard.js buscar o usuário de novo (/api/me). Ele avisa o
      global.js pelo evento "cidade360:usuario-carregado" e o menu se ajusta.
      Cada notificação só dispara isso uma vez por página.
    */
    function conferirMudancaDeAcesso() {
        const novas = estado.doServidor.filter((notificacao) =>
            !notificacao.lida &&
            TIPOS_MUDAM_MEU_ACESSO.includes(notificacao.tipo) &&
            !estado.acessoConferido.has(notificacao.id)
        );

        if (!novas.length) {
            return;
        }

        const primeiraConferencia = !estado.jaCarregou;

        novas.forEach((notificacao) => estado.acessoConferido.add(notificacao.id));

        // Ao abrir a página o authGuard.js acabou de buscar o usuário: não precisa repetir.
        if (!primeiraConferencia && typeof window.verificarAcesso === "function") {
            window.verificarAcesso();
        }
    }


    /*---------------------------------------------------------------
      NOTIFICAÇÕES: MODO PROVISÓRIO

      Usado enquanto o servidor não tem a tabela de notificações.
      Elas são montadas a partir das ocorrências:
      - Cidadão: o status atual de cada ocorrência dele.
        Quando o status muda, nasce uma notificação nova (não lida).
      - Admin: ocorrências novas que ainda estão como "Recebido".
    ---------------------------------------------------------------*/

    function montarNotificacoes() {
        if (estado.fonte === "servidor") {
            montarNotificacoesDoServidor();
            return;
        }

        const lidas = lerLidas();
        const admin = temPermissao("ocorrencias");

        const deOcorrencias = estado.ocorrencias
            .map((ocorrencia) => {
                const chave = obterChaveStatus(ocorrencia.status) || "recebido";
                const titulo = ocorrencia.titulo || "sua ocorrência";
                const link = `${PAGINA_OCORRENCIAS_TOPO}?ocorrencia=${Number(ocorrencia.id) || 0}`;

                if (admin) {
                    if (chave !== "recebido") {
                        return null;
                    }

                    return {
                        id: `admin-${ocorrencia.id}`,
                        tipo: "ocorrencia",
                        visual: "recebido",
                        titulo: "Nova ocorrência para analisar",
                        texto: ocorrencia.usuario_nome
                            ? `${ocorrencia.usuario_nome} registrou "${titulo}".`
                            : `"${titulo}" aguarda a análise da prefeitura.`,
                        data: ocorrencia.data_criacao || ocorrencia.data_ocorrencia,
                        link
                    };
                }

                const modelo = NOTIFICACAO_POR_STATUS[chave];

                return {
                    id: `ocorrencia-${ocorrencia.id}-${chave}`,
                    tipo: "ocorrencia",
                    visual: chave,
                    titulo: modelo.titulo,
                    texto: modelo.texto(titulo),
                    data: ocorrencia.data_atualizacao || ocorrencia.data_criacao || ocorrencia.data_ocorrencia,
                    link
                };
            })
            .filter(Boolean);

        const gerais = AVISOS_GERAIS.map((aviso) => ({
            id: `geral-${aviso.id}`,
            tipo: "geral",
            visual: "geral",
            titulo: aviso.titulo,
            texto: aviso.texto,
            data: aviso.data,
            link: aviso.link || null
        }));

        estado.notificacoes = [...deOcorrencias, ...gerais]
            .map((notificacao) => ({
                ...notificacao,
                lida: lidas.has(notificacao.id)
            }))
            .sort((a, b) => tempoDe(b.data) - tempoDe(a.data));
    }

    async function carregarNotificacoes({ silencioso = false } = {}) {
        const token = obterToken();

        if (!estado.usuario || !token) {
            return;
        }

        if (!silencioso) {
            estado.carregando = true;
            renderizarNotificacoes();
        }

        try {
            if (estado.fonte !== "local") {
                const respondeu = await carregarDoServidor(token);

                if (respondeu) {
                    estado.fonte = "servidor";
                    estado.erro = false;
                    return;
                }

                estado.fonte = "local";
            }

            const base = temPermissao("ocorrencias")
                ? `${API_TOPO}/ocorrencias/admin`
                : `${API_TOPO}/ocorrencias`;

            const resposta = await fetch(`${base}?pagina=1&limite=${LIMITE_NOTIFICACOES}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            });

            const dados = await resposta.json().catch(() => null);

            if (!resposta.ok || !dados?.sucesso || !Array.isArray(dados.ocorrencias)) {
                throw new Error(dados?.mensagem || "Resposta inválida.");
            }

            estado.ocorrencias = dados.ocorrencias;
            estado.erro = false;

        } catch (error) {
            console.error("Erro ao carregar notificações:", error);

            // Em atualizações silenciosas, mantém o que já estava na tela.
            if (!silencioso || !estado.jaCarregou) {
                estado.erro = true;
            }

        } finally {
            estado.carregando = false;
            estado.jaCarregou = true;

            montarNotificacoes();
            renderizarNotificacoes();
            atualizarContador();
        }
    }


    /*---------------------------------------------------------------
      CONTADOR NO SINO
    ---------------------------------------------------------------*/

    function atualizarContador() {
        const gatilho = estado.gatilhos.notificacoes;

        if (!gatilho) {
            return;
        }

        let badge = gatilho.querySelector(".badge-notificacao");

        if (!badge) {
            badge = document.createElement("span");
            badge.className = "badge-notificacao";
            badge.setAttribute("aria-hidden", "true");
            gatilho.appendChild(badge);
        }

        const naoLidas = estado.notificacoes.filter((n) => !n.lida).length;
        const mostrar = naoLidas > 0 && lerPreferenciasCidade360().contadorNotificacoes;

        badge.textContent = naoLidas > 9 ? "9+" : String(naoLidas);
        badge.hidden = !mostrar;

        gatilho.setAttribute(
            "aria-label",
            naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : "Notificações"
        );
    }


    /*---------------------------------------------------------------
      PAINEL DE NOTIFICAÇÕES
    ---------------------------------------------------------------*/

    function renderizarNotificacoes() {
        const painel = estado.paineis.notificacoes;

        if (!painel) {
            return;
        }

        const naoLidas = estado.notificacoes.filter((n) => !n.lida).length;

        const visiveis = estado.notificacoes.filter((notificacao) => {
            if (estado.aba === "ocorrencias") return notificacao.tipo === "ocorrencia";
            if (estado.aba === "gerais") return notificacao.tipo === "geral";
            return true;
        });

        const abas = [
            ["todas", "Todas"],
            ["ocorrencias", "Ocorrências"],
            ["gerais", "Gerais"]
        ].map(([valor, rotulo]) => `
            <button type="button" class="aba-notificacao ${estado.aba === valor ? "ativa" : ""}"
                data-aba="${valor}" aria-pressed="${estado.aba === valor}">
                ${rotulo}
            </button>
        `).join("");

        let conteudo;

        if (estado.carregando && !estado.jaCarregou) {
            conteudo = `
                <div class="notificacoes-estado">
                    <div class="spinner-topo" aria-hidden="true"></div>
                    <span>Carregando notificações...</span>
                </div>
            `;
        } else if (estado.erro && visiveis.length === 0) {
            conteudo = `
                <div class="notificacoes-estado">
                    <strong>Não foi possível carregar</strong>
                    <span>Verifique sua conexão e tente de novo.</span>
                    <button type="button" class="btn-texto-topo" data-acao="recarregar">Tentar novamente</button>
                </div>
            `;
        } else if (visiveis.length === 0) {
            conteudo = `
                <div class="notificacoes-estado">
                    <div class="notificacoes-estado-icone">${ICONES.sino}</div>
                    <strong>Tudo em dia</strong>
                    <span>Quando houver novidades sobre ocorrências e avisos, elas aparecem aqui.</span>
                </div>
            `;
        } else {
            conteudo = `
                <ul class="lista-notificacoes">
                    ${visiveis.map((notificacao) => {
                        const visual = VISUAL_NOTIFICACAO[notificacao.visual] || VISUAL_NOTIFICACAO.geral;

                        // Só dá para excluir as que estão salvas no banco.
                        const podeExcluir = estado.fonte === "servidor";

                        return `
                            <li class="linha-notificacao">
                                <button type="button" class="item-notificacao ${notificacao.lida ? "" : "nao-lida"}"
                                    data-notificacao="${escaparHtml(notificacao.id)}">
                                    <span class="item-notificacao-icone ${visual.classe}">${visual.icone}</span>
                                    <span class="item-notificacao-textos">
                                        <strong>${escaparHtml(notificacao.titulo)}</strong>
                                        <span>${escaparHtml(notificacao.texto)}</span>
                                        <span class="item-notificacao-rodape">
                                            <time>${escaparHtml(tempoRelativo(notificacao.data))}</time>
                                            ${notificacao.pontos ? `<em class="pontos-notificacao ${notificacao.pontos < 0 ? "negativo" : ""}">${notificacao.pontos > 0 ? "+" : "−"}${Math.abs(notificacao.pontos)} ${Math.abs(notificacao.pontos) === 1 ? "ponto" : "pontos"}</em>` : ""}
                                        </span>
                                    </span>
                                    ${notificacao.lida ? "" : '<span class="ponto-nao-lida" aria-label="Não lida"></span>'}
                                </button>
                                ${podeExcluir ? `
                                <button type="button" class="excluir-notificacao" data-acao="excluir" data-id="${escaparHtml(notificacao.id)}"
                                    aria-label="Excluir notificação: ${escaparHtml(notificacao.titulo)}" title="Excluir notificação">
                                    ${ICONES.lixeira}
                                </button>` : ""}
                            </li>
                        `;
                    }).join("")}
                </ul>
            `;
        }

        painel.innerHTML = `
            <div class="painel-topo-cabecalho">
                <div>
                    <h3>Notificações</h3>
                    <span class="painel-topo-subtitulo">
                        ${naoLidas > 0 ? `${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}` : "Nenhuma pendente"}
                    </span>
                </div>

                <button type="button" class="btn-texto-topo" data-acao="marcar-todas" ${naoLidas === 0 ? "disabled" : ""}>
                    ${ICONES.marcarLidas}
                    Marcar todas como lidas
                </button>
            </div>

            <div class="abas-notificacao" role="group" aria-label="Filtrar notificações">${abas}</div>

            <div class="corpo-notificacoes">${conteudo}</div>

            <a class="rodape-painel-topo" href="${PAGINA_OCORRENCIAS_TOPO}">
                ${temPermissao("ocorrencias") ? "Ver todas as ocorrências" : "Ver minhas ocorrências"}
                ${ICONES.seta}
            </a>
        `;
    }

    function tratarCliqueNotificacoes(event) {
        const aba = event.target.closest("[data-aba]");

        if (aba) {
            estado.aba = aba.dataset.aba;
            renderizarNotificacoes();
            return;
        }

        const acao = event.target.closest("[data-acao]")?.dataset.acao;

        if (acao === "marcar-todas") {
            marcarComoLidas(estado.notificacoes.map((n) => n.id), { todas: true });
            return;
        }

        if (acao === "recarregar") {
            carregarNotificacoes();
            return;
        }

        if (acao === "excluir") {
            const botao = event.target.closest("[data-acao]");
            const linha = botao.closest(".linha-notificacao");
            const vizinha = linha?.nextElementSibling || linha?.previousElementSibling;
            const focoDepois = vizinha?.querySelector(".item-notificacao")?.dataset.notificacao;

            excluirNotificacao(botao.dataset.id);

            // O painel é redesenhado: o foco vai para a notificação ao lado (teclado/leitor de tela).
            const proxima = focoDepois
                ? estado.paineis.notificacoes?.querySelector(`[data-notificacao="${CSS.escape(focoDepois)}"]`)
                : null;

            (proxima || estado.paineis.notificacoes)?.focus?.();
            return;
        }

        const item = event.target.closest("[data-notificacao]");

        if (item) {
            const notificacao = estado.notificacoes.find((n) => n.id === item.dataset.notificacao);

            if (!notificacao) {
                return;
            }

            marcarComoLidas([notificacao.id]);

            if (notificacao.link) {
                window.location.href = notificacao.link;
            }
        }
    }


    /*---------------------------------------------------------------
      PAINEL DO PERFIL
    ---------------------------------------------------------------*/

    function renderizarPerfil() {
        const painel = estado.paineis.perfil;

        if (!painel) {
            return;
        }

        const usuario = estado.usuario || {};
        const nome = String(usuario.nome || "Usuário").replace(/\s+/g, " ").trim();
        const admin = ehAdministrador();

        painel.innerHTML = `
            <div class="perfil-topo-cabecalho">
                <div class="avatar-topo" aria-hidden="true">${escaparHtml(iniciais(nome))}</div>

                <div class="perfil-topo-dados">
                    <strong title="${escaparHtml(nome)}">${escaparHtml(nome)}</strong>
                    ${usuario.email ? `<span title="${escaparHtml(usuario.email)}">${escaparHtml(usuario.email)}</span>` : ""}
                    <div class="selos-perfil-topo">
                        <em class="selo-tipo-usuario ${admin ? "admin" : ""}">${nomeTipoUsuario()}</em>
                        ${admin ? "" : seloTituloPerfil()}
                    </div>
                </div>
            </div>

            <div class="lista-opcoes-topo" role="menu">
                <a class="opcao-topo" role="menuitem" href="${PAGINA_PERFIL_TOPO}">
                    ${ICONES.usuario}
                    <span>Meu perfil</span>
                </a>

                ${admin ? `
                ${temPermissao("ocorrencias") ? `
                <a class="opcao-topo" role="menuitem" href="${PAGINA_OCORRENCIAS_TOPO}">
                    ${ICONES.prancheta}
                    <span>Todas as ocorrências</span>
                </a>` : ""}
                ${temPermissao("equipe") ? `
                <a class="opcao-topo" role="menuitem" href="${PAGINA_ADMINISTRADORES_TOPO}">
                    ${ICONES.escudo}
                    <span>Administradores</span>
                </a>` : ""}` : `
                <a class="opcao-topo" role="menuitem" href="${PAGINA_PONTOS_TOPO}">
                    ${ICONES.medalha}
                    <span>Meus pontos</span>
                    ${estado.resumoPontos ? `<small class="contagem-pontos-topo">${formatarPontos(estado.resumoPontos.saldo)}</small>` : ""}
                </a>`}

                <button type="button" class="opcao-topo" role="menuitem" data-acao="abrir-configuracoes">
                    ${ICONES.ajustes}
                    <span>Configurações</span>
                </button>

                <div class="opcao-topo" role="menuitem" aria-disabled="true">
                    ${ICONES.ajuda}
                    <span>Ajuda e suporte</span>
                    <small class="em-breve">Em breve</small>
                </div>

                <div class="divisor-topo" role="separator"></div>

                <button type="button" class="opcao-topo perigo" role="menuitem" data-acao="sair">
                    ${ICONES.sair}
                    <span>Sair da conta</span>
                </button>
            </div>
        `;
    }

    // Cartão do perfil do cidadão: título atual (a partir de 100 pontos).
    function seloTituloPerfil() {
        const titulo = estado.resumoPontos?.titulo;

        if (!titulo) {
            return "";
        }

        return `<em class="selo-titulo-usuario" title="Seu título no Cidade360">${ICONES.medalha}${escaparHtml(titulo.nome)}</em>`;
    }

    function formatarPontos(valor) {
        const pontos = Number(valor) || 0;
        return `${pontos.toLocaleString("pt-BR")} ${pontos === 1 ? "pt" : "pts"}`;
    }

    async function carregarResumoPontos() {
        const token = obterToken();
        const recente = Date.now() - estado.resumoPontosEm < VALIDADE_RESUMO_PONTOS;

        if (!token || ehAdministrador() || estado.carregandoResumoPontos || recente) {
            return;
        }

        estado.carregandoResumoPontos = true;

        try {
            const resposta = await fetch(`${API_TOPO}/pontos/resumo`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store"
            });

            // 503 = banco ainda sem a migração 007: o menu fica sem o título.
            if (!resposta.ok) {
                return;
            }

            const dados = await resposta.json();

            estado.resumoPontos = {
                saldo: Number(dados.saldo) || 0,
                titulo: dados.titulo || null
            };

            if (estado.painelAberto === "perfil") {
                renderizarPerfil();
            }
        } catch (error) {
            // Sem rede: o menu continua funcionando sem o título.
        } finally {
            estado.resumoPontosEm = Date.now();
            estado.carregandoResumoPontos = false;
        }
    }

    function tratarCliquePerfil(event) {
        const acao = event.target.closest("[data-acao]")?.dataset.acao;

        if (acao === "abrir-configuracoes") {
            abrirPainel("configuracoes");
        }

        if (acao === "sair") {
            sairDaConta();
        }
    }

    function sairDaConta() {
        // Usa a função do logout.js. Se ela não estiver na página, faz o mesmo aqui.
        if (typeof window.sairDoSistema === "function") {
            window.sairDoSistema();
            return;
        }

        Object.keys(localStorage).forEach((chave) => {
            if (chave.startsWith("cidade360_")) localStorage.removeItem(chave);
        });

        Object.keys(sessionStorage).forEach((chave) => {
            if (chave.startsWith("cidade360_")) sessionStorage.removeItem(chave);
        });

        window.location.replace(LOGIN_PAGE_TOPO);
    }


    /*---------------------------------------------------------------
      PAINEL DE CONFIGURAÇÕES
    ---------------------------------------------------------------*/

    const OPCOES_CONFIGURACAO = [
        {
            secao: "Aparência",
            chave: "temaEscuro",
            icone: ICONES.lua,
            titulo: "Tema escuro",
            novo: true,
            texto: "Cores escuras, mais confortáveis à noite."
        },
        {
            chave: "menuRecolhido",
            icone: ICONES.colunas,
            titulo: "Menu recolhido",
            texto: "No computador, o menu lateral mostra só os ícones."
        },
        {
            secao: "Notificações e acessibilidade",
            chave: "contadorNotificacoes",
            icone: ICONES.bolinha,
            titulo: "Contador de notificações",
            texto: "Mostra o número de não lidas no sino."
        },
        {
            chave: "reduzirAnimacoes",
            icone: ICONES.onda,
            titulo: "Reduzir animações",
            texto: "Deixa as transições mais rápidas e discretas."
        }
    ];

    function renderizarConfiguracoes() {
        const painel = estado.paineis.configuracoes;

        if (!painel) {
            return;
        }

        const preferencias = lerPreferenciasCidade360();

        painel.innerHTML = `
            <div class="painel-topo-cabecalho">
                <div>
                    <h3>Configurações</h3>
                    <span class="painel-topo-subtitulo">Ajustes rápidos do Cidade360</span>
                </div>
            </div>

            <div class="lista-configuracoes">
                ${OPCOES_CONFIGURACAO.map((opcao) => `
                    ${opcao.secao ? `<div class="secao-configuracao">${opcao.secao}</div>` : ""}
                    <label class="opcao-configuracao">
                        <span class="opcao-configuracao-textos">
                            <strong>${opcao.icone}${opcao.titulo}${opcao.novo ? '<span class="novo-recurso">Novo</span>' : ""}</strong>
                            <span>${opcao.texto}</span>
                        </span>

                        <span class="interruptor">
                            <input type="checkbox" data-preferencia="${opcao.chave}" ${preferencias[opcao.chave] ? "checked" : ""}>
                            <span class="interruptor-trilho" aria-hidden="true"></span>
                        </span>
                    </label>
                `).join("")}
            </div>

            <p class="rodape-configuracoes">${ICONES.cadeado}${ondePreferenciasFicamCidade360 === "conta"
                ? "Salvas na sua conta. O menu recolhido vale só para este aparelho."
                : "As preferências ficam salvas neste navegador."}</p>
        `;
    }

    function tratarMudancaConfiguracao(event) {
        const campo = event.target.closest("[data-preferencia]");

        if (!campo) {
            return;
        }

        const preferencias = lerPreferenciasCidade360();
        preferencias[campo.dataset.preferencia] = campo.checked;
        salvarPreferenciasCidade360(preferencias);

        if (PREFERENCIAS_DA_CONTA_CIDADE360.includes(campo.dataset.preferencia)) {
            enviarPreferenciasDaContaCidade360({ [campo.dataset.preferencia]: campo.checked });
        }

        if (campo.dataset.preferencia === "reduzirAnimacoes") {
            aplicarPreferenciasVisuaisCidade360();
        }

        if (campo.dataset.preferencia === "temaEscuro") {
            window.aplicarTemaCidade360?.(campo.checked, true);
        }

        if (campo.dataset.preferencia === "contadorNotificacoes") {
            atualizarContador();
        }

        if (campo.dataset.preferencia === "menuRecolhido" && menuLateral && !menuEstaNoMobile()) {
            menuLateral.classList.toggle("menu-recolhido", campo.checked);
            atualizarOverlayMenu();
        }
    }


    /*---------------------------------------------------------------
      ABRIR / FECHAR PAINÉIS
    ---------------------------------------------------------------*/

    function criarPainel(nome, rotulo, classeExtra) {
        const painel = document.createElement("div");
        painel.className = `painel-topo ${classeExtra}`;
        painel.setAttribute("role", "dialog");
        painel.setAttribute("aria-label", rotulo);
        painel.hidden = true;

        document.body.appendChild(painel);
        estado.paineis[nome] = painel;

        return painel;
    }

    function posicionarPainel(nome) {
        const painel = estado.paineis[nome];

        // Se a página não tiver o botão de engrenagem, as configurações
        // (abertas pelo perfil) ficam alinhadas ao perfil.
        const gatilho = estado.gatilhos[nome] || estado.gatilhos.perfil;

        if (!painel || !gatilho) {
            return;
        }

        const topo = gatilho.closest(".menu-topo") || gatilho;
        const retanguloTopo = topo.getBoundingClientRect();
        const retanguloGatilho = gatilho.getBoundingClientRect();

        painel.style.top = `${Math.round(retanguloTopo.bottom + 8)}px`;

        // No celular o painel ocupa a largura toda, com uma margem.
        if (window.innerWidth <= 520) {
            painel.style.left = "12px";
            painel.style.right = "12px";
            return;
        }

        painel.style.left = "auto";
        painel.style.right = `${Math.max(12, Math.round(window.innerWidth - retanguloGatilho.right))}px`;
    }

    function marcarGatilho(nome, ativo) {
        const gatilho = estado.gatilhos[nome];

        if (!gatilho) {
            return;
        }

        gatilho.setAttribute("aria-expanded", String(ativo));
        (gatilho.closest(".menu-acoes") || gatilho).classList.toggle("ativo", ativo);
    }

    function abrirPainel(nome) {
        const painel = estado.paineis[nome];

        if (!painel) {
            return;
        }

        if (estado.painelAberto && estado.painelAberto !== nome) {
            fecharPainel({ devolverFoco: false });
        }

        if (nome === "notificacoes") {
            renderizarNotificacoes();
            carregarNotificacoes({ silencioso: estado.jaCarregou });
        }

        if (nome === "perfil") {
            renderizarPerfil();
            carregarResumoPontos();
        }

        if (nome === "configuracoes") {
            renderizarConfiguracoes();
        }

        estado.painelAberto = nome;
        marcarGatilho(nome, true);
        posicionarPainel(nome);

        clearTimeout(painel._timerFechar);
        painel.hidden = false;

        requestAnimationFrame(() => {
            painel.classList.add("aberto");
        });

        // Coloca o foco no primeiro item, para quem navega pelo teclado.
        setTimeout(() => {
            painel.querySelector("button:not([disabled]), a, input")?.focus({ preventScroll: true });
        }, 60);
    }

    function fecharPainel({ devolverFoco = false } = {}) {
        const nome = estado.painelAberto;

        if (!nome) {
            return;
        }

        const painel = estado.paineis[nome];

        estado.painelAberto = null;
        marcarGatilho(nome, false);

        painel.classList.remove("aberto");
        painel._timerFechar = setTimeout(() => {
            painel.hidden = true;
        }, 200);

        if (devolverFoco) {
            estado.gatilhos[nome]?.focus({ preventScroll: true });
        }
    }

    function alternarPainel(nome) {
        if (estado.painelAberto === nome) {
            fecharPainel();
        } else {
            abrirPainel(nome);
        }
    }


    /*---------------------------------------------------------------
      GATILHOS (botões que já existem no HTML)
    ---------------------------------------------------------------*/

    function encontrarGatilhos() {
        const botoes = [...document.querySelectorAll(".opcoes-menu-topo .menu-acoes button")];

        const porIcone = (nomeArquivo) => botoes.find((botao) =>
            (botao.querySelector("img")?.getAttribute("src") || "").includes(nomeArquivo)
        );

        return {
            notificacoes: document.getElementById("btnNotificacoesPainel") || porIcone("notificacao"),
            configuracoes: document.getElementById("btnConfiguracoesPainel") || porIcone("configuracoes"),
            perfil: document.querySelector(".opcoes-menu-topo .perfil-usuario")
        };
    }

    function prepararGatilho(nome, gatilho, rotulo) {
        if (!gatilho) {
            return;
        }

        estado.gatilhos[nome] = gatilho;

        gatilho.setAttribute("aria-haspopup", "dialog");
        gatilho.setAttribute("aria-expanded", "false");
        gatilho.setAttribute("aria-label", rotulo);

        if (gatilho.tagName !== "BUTTON") {
            gatilho.setAttribute("role", "button");
            gatilho.setAttribute("tabindex", "0");
        }
    }

    // O botão "Sair" agora fica dentro do perfil. Remove o antigo, se ainda estiver no HTML.
    function removerBotaoSairAntigo() {
        const botaoSair = document.getElementById("btnSair");

        if (!botaoSair) {
            return;
        }

        (botaoSair.closest(".menu-acoes") || botaoSair).remove();
    }


    /*---------------------------------------------------------------
      USUÁRIO
    ---------------------------------------------------------------*/

    function definirUsuario(usuario) {
        if (!usuario) {
            return;
        }

        const mudouDeUsuario = estado.usuario?.id !== usuario.id;

        estado.usuario = usuario;

        // Avatar do topo: iniciais do nome (verde-escuro para a prefeitura)
        document.querySelectorAll(".opcoes-menu-topo .foto-usuario").forEach((avatar) => {
            avatar.textContent = iniciais(usuario.nome);
            avatar.classList.toggle("admin", ehAdministrador());
        });

        if (estado.painelAberto === "perfil") {
            renderizarPerfil();
        }

        if (mudouDeUsuario) {
            estado.resumoPontos = null;
            estado.resumoPontosEm = 0;

            carregarNotificacoes({ silencioso: true });
            carregarResumoPontos();
        }
    }


    /*---------------------------------------------------------------
      EVENTOS
    ---------------------------------------------------------------*/

    function registrarEventos() {
        // Fase de captura: roda antes de outros scripts da página (ex.: painel.js)
        // que possam ter colocado cliques nesses mesmos botões.
        document.addEventListener("click", (event) => {
            for (const [nome, gatilho] of Object.entries(estado.gatilhos)) {
                if (gatilho && gatilho.contains(event.target)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    alternarPainel(nome);
                    return;
                }
            }

            const painelAberto = estado.paineis[estado.painelAberto];

            if (painelAberto && !painelAberto.contains(event.target)) {
                fecharPainel();
            }
        }, true);

        // Perfil é uma <div>: abre também com Enter e espaço.
        estado.gatilhos.perfil?.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                alternarPainel("perfil");
            }
        });

        // Esc fecha o painel antes de qualquer outro atalho da página.
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && estado.painelAberto) {
                event.preventDefault();
                event.stopImmediatePropagation();
                fecharPainel({ devolverFoco: true });
            }
        }, true);

        window.addEventListener("resize", () => {
            if (estado.painelAberto) {
                posicionarPainel(estado.painelAberto);
            }
        });

        estado.paineis.notificacoes?.addEventListener("click", tratarCliqueNotificacoes);
        estado.paineis.perfil?.addEventListener("click", tratarCliquePerfil);
        estado.paineis.configuracoes?.addEventListener("change", tratarMudancaConfiguracao);

        // Preferências vindas da conta: contador do sininho e painel aberto acompanham.
        window.addEventListener("cidade360:preferencias", () => {
            atualizarContador();

            if (estado.painelAberto === "configuracoes") {
                renderizarConfiguracoes();
            }
        });

        // O authGuard.js avisa quando confirma quem está logado.
        window.addEventListener("cidade360:usuario-carregado", (event) => {
            definirUsuario(event.detail);
        });

        // Atualiza as notificações de tempos em tempos, só com a aba visível.
        estado.timerAtualizacao = setInterval(() => {
            if (document.visibilityState === "visible") {
                carregarNotificacoes({ silencioso: true });
            }
        }, INTERVALO_ATUALIZACAO);
    }


    /*---------------------------------------------------------------
      INICIALIZAÇÃO
    ---------------------------------------------------------------*/

    function inicializarMenuSuperior() {
        const gatilhos = encontrarGatilhos();

        if (!gatilhos.notificacoes && !gatilhos.configuracoes && !gatilhos.perfil) {
            return;
        }

        removerBotaoSairAntigo();

        prepararGatilho("notificacoes", gatilhos.notificacoes, "Notificações");
        prepararGatilho("configuracoes", gatilhos.configuracoes, "Configurações");
        prepararGatilho("perfil", gatilhos.perfil, "Abrir menu do perfil");

        if (gatilhos.notificacoes) criarPainel("notificacoes", "Notificações", "painel-notificacoes");
        if (gatilhos.configuracoes || gatilhos.perfil) criarPainel("configuracoes", "Configurações", "painel-configuracoes");
        if (gatilhos.perfil) criarPainel("perfil", "Menu do perfil", "painel-perfil");

        registrarEventos();

        definirUsuario(window.usuarioLogado || obterUsuarioArmazenado());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializarMenuSuperior);
    } else {
        inicializarMenuSuperior();
    }

})();