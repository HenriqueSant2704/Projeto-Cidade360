/*===================================================================

 ÍCONES E STATUS COMPARTILHADOS

 Usado pelo painel e pela página de ocorrências.
 Os ícones são SVG com stroke="currentColor": pegam a cor do texto,
 então funcionam no tema claro e no escuro sem trocar imagem.

 Uso:
   Cidade360.icone("lupa", 18)
   Cidade360.iconeCategoria("Buraco na Via", 20)
   Cidade360.chaveStatus("Em atendimento")  -> "em_andamento"

===================================================================*/

window.Cidade360 = window.Cidade360 || {};

(() => {

    "use strict";

    function svg(caminhos, tamanho = 18, espessura = 2) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${espessura}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos}</svg>`;
    }

    // [caminhos, espessura]
    const CAMINHOS = {
        // Gerais
        lupa: ['<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'],
        local: ['<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'],
        etiqueta: ['<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.2"/>'],
        direita: ['<path d="M5 12h14M13 6l6 6-6 6"/>'],
        voltar: ['<path d="M19 12H5M11 18l-6-6 6-6"/>'],
        mais: ['<path d="M12 5v14M5 12h14"/>', 2.5],
        lista: ['<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'],
        check: ['<path d="M20 6 9 17l-5-5"/>', 3],
        x: ['<path d="M18 6 6 18M6 6l12 12"/>'],
        lixeira: ['<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'],
        megafone: ['<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'],
        pino: ['<path d="M12 17v5"/><path d="M9 3h6l-1 7 4 4H6l4-4z"/>'],
        calendario: ['<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'],
        medalha: ['<circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-1.5 8.5 5-3 5 3-1.5-8.5"/>'],
        estrela: ['<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'],
        grafico: ['<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>'],
        alvo: ['<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'],
        camera: ['<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>'],
        enviar: ['<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'],
        expandir: ['<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'],
        alerta: ['<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'],
        predio: ['<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>'],
        usuario: ['<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
        cadeado: ['<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'],
        seta: ['<path d="m6 9 6 6 6-6"/>'],
        // Status
        entrada: ['<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>'],
        andamento: ['<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.2 16.2l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.2 7.8l2.8-2.8"/>'],
        checkCirculo: ['<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'],
        bloqueio: ['<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>'],
        // Categorias de ocorrência
        buraco: ['<path d="M5 21 9 3M19 21 15 3"/><ellipse cx="12" cy="15.5" rx="4.2" ry="2"/><path d="M12 5v2M12 9.5v1.5"/>'],
        lampada: ['<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>'],
        lixo: ['<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>'],
        gota: ['<path d="M12 2.7s-6 6.6-6 11.3a6 6 0 0 0 12 0c0-4.7-6-11.3-6-11.3z"/>'],
        arvore: ['<path d="M12 22v-5"/><path d="M12 2 5 12h3l-3 5h14l-3-5h3z"/>'],
        semaforo: ['<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="17" r="1.4"/>'],
        spray: ['<rect x="5" y="9" width="9" height="13" rx="2"/><path d="M7.5 9V6h4v3M9 3h1.5"/><path d="M17 4l2-1M17 7h3M17 10l2 1"/>'],
        chave: ['<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'],
        pontos: ['<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>', 2.4],
        // Categorias de aviso
        fita: ['<path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1"/><circle cx="12" cy="14" r="4"/><path d="m9.5 17.5-1.5 4 4-1.5 4 1.5-1.5-4"/>'],
        cone: ['<path d="M9.3 6h5.4M7.6 12h8.8"/><path d="M10.5 2h3l6 18H4.5z"/><path d="M2 22h20"/>'],
        saude: ['<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/><path d="M3.2 12H9l.5-1 2 4.5 2-7 1.5 3.5h5.3"/>']
    };

    function icone(nome, tamanho = 18) {
        const [caminhos, espessura] = CAMINHOS[nome] || CAMINHOS.pontos;
        return svg(caminhos, tamanho, espessura || 2);
    }

    // Minúsculas e sem acento: "Em Análise" e "em analise" viram a mesma coisa.
    function normalizar(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .trim()
            .toLowerCase();
    }

    // As categorias vêm do banco pelo nome. O ícone é escolhido por palavra-chave,
    // então uma categoria nova continua funcionando (cai em "pontos").
    function nomeIconeCategoria(categoria) {
        const valor = normalizar(categoria);
        if (valor.includes("buraco") || valor.includes("via") || valor.includes("asfalto")) return "buraco";
        if (valor.includes("ilumina") || valor.includes("poste") || valor.includes("lampada")) return "lampada";
        if (valor.includes("lixo") || valor.includes("coleta") || valor.includes("entulho")) return "lixo";
        if (valor.includes("esgoto") || valor.includes("agua") || valor.includes("bueiro")) return "gota";
        if (valor.includes("arvore") || valor.includes("galho")) return "arvore";
        if (valor.includes("semaforo") || valor.includes("transito")) return "semaforo";
        if (valor.includes("vandal") || valor.includes("pichac")) return "spray";
        if (valor.includes("manutenc")) return "chave";
        return "pontos";
    }

    function iconeCategoria(categoria, tamanho = 20) {
        return icone(nomeIconeCategoria(categoria), tamanho);
    }

    // "Em atendimento" (nome do banco) e "Em andamento" viram a mesma chave.
    function chaveStatus(status) {
        const valor = normalizar(status);
        if (valor === "recebido") return "recebido";
        if (valor === "em analise" || valor === "pendente") return "em_analise";
        if (valor === "em andamento" || valor === "em atendimento") return "em_andamento";
        if (valor === "resolvido") return "resolvido";
        if (valor === "cancelado") return "cancelado";
        return null;
    }

    const STATUS = {
        recebido: { nome: "Recebido", plural: "Recebidos", passo: 0, icone: "entrada" },
        em_analise: { nome: "Em análise", plural: "Em análise", passo: 1, icone: "lupa" },
        em_andamento: { nome: "Em andamento", plural: "Em andamento", passo: 2, icone: "andamento" },
        resolvido: { nome: "Resolvido", plural: "Resolvidos", passo: 3, icone: "checkCirculo" },
        cancelado: { nome: "Cancelado", plural: "Cancelados", passo: -1, icone: "bloqueio" }
    };

    function pilula(chave) {
        const status = STATUS[chave] || STATUS.recebido;
        return `<span class="pilula st" data-st="${chave || "recebido"}">${status.nome}</span>`;
    }

    // Pino do mapa (a cor vem do status, via CSS).
    const PINO = '<svg viewBox="0 0 30 38" aria-hidden="true"><path class="ponta" d="M15 37S2 23.5 2 14a13 13 0 0 1 26 0c0 9.5-13 23-13 23z" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>';

    function tempoRelativo(valor) {
        const momento = new Date(valor).getTime();
        if (!Number.isFinite(momento)) {
            return "";
        }
        const minutos = Math.round(Math.max(0, Date.now() - momento) / 60000);
        if (minutos < 1) return "agora mesmo";
        if (minutos < 60) return `há ${minutos} min`;
        const horas = Math.round(minutos / 60);
        if (horas < 24) return `há ${horas} h`;
        const dias = Math.round(horas / 24);
        if (dias === 1) return "ontem";
        if (dias < 7) return `há ${dias} dias`;
        return new Date(momento)
            .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
            .replace(".", "");
    }

    function iniciais(nome) {
        const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
        if (partes.length === 0) {
            return "U";
        }
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
        return (partes[0][0] + ultima).toUpperCase();
    }

    Object.assign(window.Cidade360, {
        svg,
        icone,
        iconeCategoria,
        nomeIconeCategoria,
        normalizar,
        chaveStatus,
        STATUS,
        pilula,
        PINO,
        tempoRelativo,
        iniciais
    });

})();
