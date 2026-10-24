/*========================================================================================================

AVISOS DA PREFEITURA

- Cidadão: lê os avisos, filtra, busca e reage com emojis (uma reação por aviso, contagem anônima).
- Administrador: vê a mesma página e também publica, edita, fixa e exclui avisos
  num painel lateral, sem sair da página.

O que o admin pode fazer é decidido também no servidor (adminMiddleware).
Esconder o botão aqui é só para a tela ficar certa para cada perfil.

=========================================================================================================*/

(() => {

"use strict";


/*---------------------------------------------------------------
  ÍCONES
---------------------------------------------------------------*/

const svg = (d, t = 18, e = 2) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${e}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
    calendario: (t) => svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', t),
    fita: (t) => svg('<path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18 12h3M16.3 7.7l2.1-2.1"/><circle cx="12" cy="14" r="4"/><path d="m9.5 17.5-1.5 4 4-1.5 4 1.5-1.5-4"/>', t),
    cone: (t) => svg('<path d="M9.3 6h5.4M7.6 12h8.8"/><path d="M10.5 2h3l6 18H4.5z"/><path d="M2 22h20"/>', t),
    saude: (t) => svg('<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/><path d="M3.2 12H9l.5-1 2 4.5 2-7 1.5 3.5h5.3"/>', t),
    predio: (t) => svg('<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>', t),
    relogio: (t) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', t),
    local: (t) => svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>', t),
    pino: (t) => svg('<path d="M12 17v5"/><path d="M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V17h14v-1.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>', t),
    mais: (t) => svg('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>', t, 2.4),
    editar: (t) => svg('<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>', t),
    lixeira: (t) => svg('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', t),
    rostoMais: (t) => svg('<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/><path d="M16 5h6M19 2v6"/>', t),
    x: (t) => svg('<path d="M18 6 6 18M6 6l12 12"/>', t),
    imagem: (t) => svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>', t, 1.7),
    seta: (t) => svg('<path d="m6 9 6 6 6-6"/>', t),
    check: (t) => svg('<path d="M20 6 9 17l-5-5"/>', t, 3),
    olho: (t) => svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', t),
    lapis: (t) => svg('<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/>', t),
    cadeado: (t) => svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', t),
    megafone: (t) => svg('<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>', t),
    mais2: (t) => svg('<path d="M12 5v14M5 12h14"/>', t, 2.5),
    info: (t) => svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', t)
};

/*---------------------------------------------------------------
  DOMÍNIO
  As chaves de categoria e de reação precisam ser as mesmas do ENUM
  da migração 006_avisos.sql e do avisoController.js.
---------------------------------------------------------------*/
const CATEGORIAS = {
    evento: { nome: "Evento", icone: I.calendario, orgao: "Secretaria de Cultura" },
    inauguracao: { nome: "Inauguração", icone: I.fita, orgao: "Gabinete do Prefeito" },
    obras: { nome: "Obras e trânsito", icone: I.cone, orgao: "Secretaria de Obras" },
    saude: { nome: "Saúde", icone: I.saude, orgao: "Secretaria de Saúde" },
    servicos: { nome: "Serviços", icone: I.predio, orgao: "Prefeitura Municipal" }
};

const REACOES = [
    { chave: "palmas", emoji: "👏", nome: "Palmas" },
    { chave: "amei", emoji: "❤️", nome: "Amei" },
    { chave: "comemorar", emoji: "🎉", nome: "Comemorar" },
    { chave: "feliz", emoji: "😄", nome: "Feliz" },
    { chave: "uau", emoji: "😮", nome: "Uau" },
    { chave: "obrigado", emoji: "🙏", nome: "Obrigado" }
];
const REACAO = Object.fromEntries(REACOES.map((r) => [r.chave, r]));

/*---------------------------------------------------------------
  CONFIGURAÇÃO
---------------------------------------------------------------*/

const API_AVISOS = "/api/avisos";

// Não começa com "cidade360_" para sobreviver ao logout (mesmo padrão das notificações).
const CHAVE_VISTOS = "avisos_vistos_cidade360";

// Um aviso aparece como "Novo" se o cidadão ainda não o viu e ele tem até 7 dias.
const DIAS_AVISO_NOVO = 7;

const LIMITE_TITULO = 90;
const LIMITE_TEXTO = 1200;
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;


/*---------------------------------------------------------------
  ESTADO
---------------------------------------------------------------*/

let avisos = [];

const est = {
    iniciado: false,
    carregando: true,
    erro: null,
    demo: false,
    perfil: "cidadao",
    filtro: "todos",
    busca: "",
    expandidos: new Set(),
    barra: null,
    viaHover: false,
    detalhe: null,
    menu: null
};

const $ = (seletor, el = document) => el.querySelector(seletor);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ehAdmin = () => est.perfil === "admin";
const fmtNum = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",").replace(",0", "") + " mil" : String(n);
const totalReacoes = (a) => Object.values(a.reacoes).reduce((s, n) => s + n, 0);
const camadas = () => $("#avisosCamadas");


/*---------------------------------------------------------------
  API
  Quando a rota ainda não existe no servidor (404) ou o banco ainda
  não tem as tabelas (503 AVISOS_INDISPONIVEL), entra no modo demonstração.
---------------------------------------------------------------*/

function obterToken() {
    return localStorage.getItem("cidade360_token") || sessionStorage.getItem("cidade360_token");
}

async function requisicao(caminho, { method = "GET", corpo } = {}) {
    const headers = { Authorization: `Bearer ${obterToken()}` };
    let body;

    if (corpo instanceof FormData) {
        body = corpo;
    } else if (corpo) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(corpo);
    }

    const resposta = await fetch(`${API_AVISOS}${caminho}`, { method, headers, body, cache: "no-store" });
    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok || !dados?.sucesso) {
        const erro = new Error(dados?.mensagem || "Não foi possível falar com o servidor.");
        erro.status = resposta.status;
        erro.codigo = dados?.codigo;
        throw erro;
    }

    return dados;
}

const apiIndisponivel = (erro) => erro.status === 404 || erro.codigo === "AVISOS_INDISPONIVEL";

function formDataDoRascunho(r) {
    const dados = new FormData();
    dados.append("categoria", r.cat);
    dados.append("titulo", r.titulo.trim());
    dados.append("texto", r.texto.trim());
    dados.append("fixado", r.fixado ? "1" : "0");
    dados.append("data_evento", r.temEvento && r.data ? `${r.data}T${r.hora || "09:00"}` : "");
    dados.append("local_evento", r.temEvento ? r.local.trim() : "");
    if (r.arquivo) dados.append("foto", r.arquivo);
    if (r.removerFoto && !r.arquivo) dados.append("remover_foto", "1");
    return dados;
}

function camposDemoDoRascunho(r) {
    return {
        categoria: r.cat,
        titulo: r.titulo.trim(),
        texto: r.texto.trim(),
        fixado: r.fixado,
        data_evento: r.temEvento && r.data ? `${r.data}T${r.hora || "09:00"}` : "",
        local_evento: r.temEvento ? r.local.trim() : "",
        foto: r.arquivo || null,
        foto_cena: r.foto?.tipo === "cena" ? r.foto.valor : null,
        remover_foto: r.removerFoto
    };
}

const api = {
    async listar() {
        if (!est.demo) {
            try {
                return (await requisicao("")).avisos;
            } catch (erro) {
                if (!apiIndisponivel(erro) || !window.AvisosDemo) throw erro;
                est.demo = true;
            }
        }
        return window.AvisosDemo.listar();
    },

    async salvar(r) {
        if (est.demo) {
            const campos = camposDemoDoRascunho(r);
            return r.id != null ? window.AvisosDemo.atualizar(r.id, campos) : window.AvisosDemo.criar(campos);
        }
        const dados = await requisicao(r.id != null ? `/${r.id}` : "", { method: r.id != null ? "PUT" : "POST", corpo: formDataDoRascunho(r) });
        return dados.aviso;
    },

    async fixar(id, fixado) {
        if (est.demo) return window.AvisosDemo.fixar(id, fixado);
        return (await requisicao(`/${id}/fixar`, { method: "PATCH", corpo: { fixado } })).aviso;
    },

    async remover(id) {
        if (est.demo) return window.AvisosDemo.remover(id);
        await requisicao(`/${id}`, { method: "DELETE" });
    },

    async restaurar(id) {
        if (est.demo) return window.AvisosDemo.restaurar(id);
        return (await requisicao(`/${id}/restaurar`, { method: "PATCH" })).aviso;
    },

    async reagir(id, reacao) {
        if (est.demo) return reacao ? window.AvisosDemo.reagir(id, reacao) : window.AvisosDemo.removerReacao(id);
        return reacao
            ? requisicao(`/${id}/reacao`, { method: "PUT", corpo: { reacao } })
            : requisicao(`/${id}/reacao`, { method: "DELETE" });
    }
};


/*---------------------------------------------------------------
  CONVERSÃO: formato da API -> formato da tela
---------------------------------------------------------------*/

function lerVistos() {
    try {
        return new Set(JSON.parse(localStorage.getItem(CHAVE_VISTOS) || "[]"));
    } catch (error) {
        return new Set();
    }
}

function salvarVistos(ids) {
    try {
        localStorage.setItem(CHAVE_VISTOS, JSON.stringify([...ids].slice(-300)));
    } catch (error) {
        // Sem armazenamento: o selo "Novo" só não fica lembrado.
    }
}

const vistos = lerVistos();

function paraTela(dados) {
    const criado = new Date(dados.data_criacao).getTime() || Date.now();
    const dataEvento = dados.data_evento ? new Date(dados.data_evento) : null;

    let foto = null;
    if (dados.foto_url) foto = { tipo: "url", valor: dados.foto_url };
    else if (dados.foto_cena) foto = { tipo: "cena", valor: dados.foto_cena };

    return {
        id: Number(dados.id),
        cat: CATEGORIAS[dados.categoria] ? dados.categoria : "servicos",
        titulo: dados.titulo || "",
        texto: dados.texto || "",
        fixado: Boolean(dados.fixado),
        criado,
        evento: dataEvento && !isNaN(dataEvento) || dados.local_evento
            ? { data: dataEvento && !isNaN(dataEvento) ? dataEvento : null, local: dados.local_evento || "" }
            : null,
        foto,
        reacoes: { ...(dados.reacoes || {}) },
        minha: dados.minha_reacao || null,
        novo: !vistos.has(Number(dados.id)) && Date.now() - criado < DIAS_AVISO_NOVO * 24 * 3600e3
    };
}

function fotoHtml(foto) {
    if (!foto) return "";
    if (foto.tipo === "cena") return window.AvisosDemo?.CENAS?.[foto.valor] || "";
    return `<img src="${esc(foto.valor)}" alt="" loading="lazy">`;
}


/*---------------------------------------------------------------
  DATAS
---------------------------------------------------------------*/

function tempoRelativo(ts) {
    const min = Math.round((Date.now() - ts) / 60000);
    if (min < 1) return "agora mesmo";
    if (min < 60) return `há ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.round(h / 24);
    if (d === 1) return "ontem";
    if (d < 7) return `há ${d} dias`;
    return new Date(ts).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function fmtData(d) {
    const s = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
    const h = d.getMinutes() ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : `${d.getHours()}h`;
    return `${s.charAt(0).toUpperCase() + s.slice(1)} · ${h}`;
}

const doisDigitos = (n) => String(n).padStart(2, "0");
const dataLocal = (d) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
const horaLocal = (d) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;


/*---------------------------------------------------------------
  RENDER: CARD
---------------------------------------------------------------*/

function htmlAviso(a, { previa = false } = {}) {
    const cat = CATEGORIAS[a.cat];
    const total = totalReacoes(a);
    const top = Object.entries(a.reacoes).filter(([k, n]) => n > 0 && REACAO[k]).sort((x, y) => y[1] - x[1]).slice(0, 3);
    const longo = a.texto.length > 220 && !est.expandidos.has(a.id) && !previa;
    const minha = a.minha ? REACAO[a.minha] : null;

    return `
    <article class="aviso${a.fixado ? " fixado" : ""}" data-id="${a.id}" data-cat="${a.cat}" aria-labelledby="t-${a.id}">
        <div class="aviso-topo">
            <div class="orgao">${cat.icone(20)}</div>
            <div class="aviso-meta">
                <strong>${esc(cat.orgao)}</strong>
                <span>${previa ? "agora mesmo" : tempoRelativo(a.criado)}</span>
            </div>
            <div class="etiquetas">
                ${a.fixado ? `<span class="etiqueta fixo">${I.pino(13)}Fixado</span>` : ""}
                ${a.novo && !ehAdmin() && !previa ? `<span class="etiqueta novo">Novo</span>` : ""}
                <span class="etiqueta cat-txt">${cat.nome}</span>
            </div>
            ${ehAdmin() && !previa ? `<button class="btn-mais" type="button" data-acao="menu" aria-label="Opções do aviso" aria-expanded="${est.menu === a.id}">${I.mais(18)}</button>` : ""}
        </div>
        <h3 id="t-${a.id}">${esc(a.titulo) || '<span style="color:var(--muted)">Título do aviso</span>'}</h3>
        ${a.texto ? `<p class="aviso-texto${longo ? " cortado" : ""}">${esc(a.texto)}</p>` : (previa ? `<p class="aviso-texto" style="color:var(--muted)">O texto do aviso aparece aqui.</p>` : "")}
        ${a.texto.length > 220 && !previa ? `<button class="ler-mais" type="button" data-acao="expandir">${longo ? "Ler mais" : "Mostrar menos"}</button>` : ""}
        ${a.evento && (a.evento.data || a.evento.local) ? `<div class="detalhes-evento">
            ${a.evento.data ? `<span class="detalhe">${I.calendario(16)}${fmtData(a.evento.data)}</span>` : ""}
            ${a.evento.local ? `<span class="detalhe">${I.local(16)}${esc(a.evento.local)}</span>` : ""}
        </div>` : ""}
        ${a.foto ? `<figure class="foto" data-acao="ampliar" tabindex="0" role="button" aria-label="Ampliar imagem">${fotoHtml(a.foto)}</figure>` : ""}
        <div class="aviso-rodape">
            ${total ? `<button class="resumo-reacoes" type="button" data-acao="detalhe" aria-label="${total} reações. Ver detalhes" aria-expanded="${est.detalhe === a.id}">
                <span class="pilha">${top.map(([k]) => `<span class="emoji">${REACAO[k].emoji}</span>`).join("")}</span>
                <span class="total">${fmtNum(total)}</span>
            </button>` : `<span class="sem-reacoes">Seja o primeiro a reagir</span>`}
            <button class="btn-reagir${minha ? " reagiu" : ""}" type="button" data-acao="reagir" aria-haspopup="true" aria-expanded="${est.barra === a.id}">
                ${minha ? `<span class="emoji">${minha.emoji}</span>${minha.nome}` : `${I.rostoMais(19)}Reagir`}
            </button>
            ${est.barra === a.id ? htmlBarra(a) : ""}
            ${est.detalhe === a.id ? htmlDetalhe(a) : ""}
        </div>
        ${est.menu === a.id ? `<div class="menu-card" role="menu">
            <button type="button" role="menuitem" data-acao="fixar">${I.pino(16)}${a.fixado ? "Desafixar do topo" : "Fixar no topo"}</button>
            <button type="button" role="menuitem" data-acao="editar">${I.editar(16)}Editar aviso</button>
            <button type="button" role="menuitem" class="opcao-perigo" data-acao="excluir">${I.lixeira(16)}Excluir aviso</button>
        </div>` : ""}
    </article>`;
}

const htmlBarra = (a) => `<div class="barra-emojis" role="menu" aria-label="Escolha uma reação">
    ${REACOES.map((r, i) => `<button type="button" role="menuitem" class="emoji${a.minha === r.chave ? " escolhido" : ""}" style="--i:${i}" data-reacao="${r.chave}" aria-label="${r.nome}">${r.emoji}<span class="dica">${r.nome}</span></button>`).join("")}
</div>`;

function htmlDetalhe(a) {
    const total = totalReacoes(a);
    const linhas = Object.entries(a.reacoes).filter(([k, n]) => n > 0 && REACAO[k]).sort((x, y) => y[1] - x[1]);
    const max = Math.max(1, ...linhas.map(([, n]) => n));
    return `<div class="detalhe-reacoes" role="dialog" aria-label="Reações">
        <h4>${fmtNum(total)} reações</h4>
        ${linhas.map(([k, n]) => `<div class="linha-reacao"><span class="emoji">${REACAO[k].emoji}</span><span class="trilho"><i style="width:${(n / max) * 100}%"></i></span><b>${fmtNum(n)}</b></div>`).join("")}
        <small>${I.cadeado(13)}Reações anônimas: ninguém vê quem reagiu.</small>
    </div>`;
}


/*---------------------------------------------------------------
  RENDER: PÁGINA
---------------------------------------------------------------*/

function visiveis() {
    const termo = est.busca.trim().toLowerCase();
    return avisos
        .filter((a) => est.filtro === "todos" || a.cat === est.filtro)
        .filter((a) => !termo || (a.titulo + " " + a.texto).toLowerCase().includes(termo))
        .sort((x, y) => (y.fixado - x.fixado) || (y.criado - x.criado));
}

function renderFeed() {
    const feed = $("#feedAvisos");

    if (est.carregando) {
        feed.innerHTML = `<div class="esqueleto"></div><div class="esqueleto"></div>`;
        return;
    }

    if (est.erro) {
        feed.innerHTML = `<div class="vazio"><span class="emoji">⚠️</span><strong>Não foi possível carregar os avisos</strong>${esc(est.erro)}<br><br><button class="btn-secundario" type="button" data-acao-pagina="recarregar">Tentar novamente</button></div>`;
        return;
    }

    const lista = visiveis();

    if (!lista.length) {
        const semNenhum = !avisos.length;
        feed.innerHTML = `<div class="vazio"><span class="emoji">📭</span><strong>${semNenhum ? "Nenhum aviso publicado ainda" : "Nenhum aviso por aqui"}</strong>${
            est.busca ? "Tente buscar com outras palavras."
                : semNenhum && ehAdmin() ? "Clique em \"Novo aviso\" para publicar o primeiro comunicado."
                : "Quando a prefeitura publicar um aviso nesta categoria, ele aparece aqui."}</div>`;
        return;
    }

    feed.innerHTML = lista.map((a) => htmlAviso(a)).join("");
}

function renderFiltros() {
    const itens = [["todos", "Todos", null], ...Object.entries(CATEGORIAS).map(([k, c]) => [k, c.nome, k])];
    $("#filtrosAvisos").innerHTML = itens.map(([k, nome, cat]) => {
        const n = k === "todos" ? avisos.length : avisos.filter((a) => a.cat === k).length;
        return `<button class="filtro" type="button" aria-pressed="${est.filtro === k}" data-filtro="${k}">${cat ? `<span class="bolinha" style="background:var(--c-${cat})"></span>` : ""}${nome}<span style="opacity:.6;font-variant-numeric:tabular-nums">${n}</span></button>`;
    }).join("");
}

function renderLateral() {
    const lat = $("#lateralAvisos");

    if (est.carregando || est.erro) {
        lat.innerHTML = "";
        return;
    }

    if (ehAdmin()) {
        const hoje = new Date();
        const doMes = avisos.filter((a) => {
            const d = new Date(a.criado);
            return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
        });
        const total = avisos.reduce((s, a) => s + totalReacoes(a), 0);
        const top = [...avisos].sort((x, y) => totalReacoes(y) - totalReacoes(x))[0];
        const chaveTop = top ? Object.entries(top.reacoes).sort((x, y) => y[1] - x[1])[0]?.[0] : null;
        const topEmoji = REACAO[chaveTop]?.emoji || "📣";
        const mes = hoje.toLocaleDateString("pt-BR", { month: "long" });

        lat.innerHTML = `
        <section class="painel">
            <h4>Resumo de ${mes} <small>Prefeitura</small></h4>
            <div class="numeros">
                <div class="numero"><b>${doMes.length}</b><span>Avisos publicados</span></div>
                <div class="numero"><b>${fmtNum(total)}</b><span>Reações recebidas</span></div>
            </div>
            ${top && totalReacoes(top) ? `<div class="destaque"><span class="emoji">${topEmoji}</span><div><strong>${esc(top.titulo)}</strong><span>Aviso com mais reações · ${fmtNum(totalReacoes(top))}</span></div></div>` : ""}
        </section>
        <section class="painel">
            <h4>Como funciona</h4>
            <p class="nota-anonimo">${I.olho(16)}Você vê a página exatamente como o cidadão, com as opções de publicar, editar, fixar e excluir avisos.</p>
            <p class="nota-anonimo">${I.cadeado(16)}As reações são anônimas também para a prefeitura: aparecem só as quantidades de cada emoji.</p>
        </section>`;
        return;
    }

    const proximos = avisos
        .filter((a) => a.evento?.data && a.evento.data.getTime() > Date.now())
        .sort((x, y) => x.evento.data - y.evento.data)
        .slice(0, 4);

    lat.innerHTML = `
    <section class="painel">
        <h4>Agenda da cidade <small>Próximas datas</small></h4>
        ${proximos.length ? `<ul class="agenda">${proximos.map((a) => `<li data-ir="${a.id}" tabindex="0">
            <div class="dia"><b>${a.evento.data.getDate()}</b><small>${a.evento.data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></div>
            <div><strong>${esc(a.titulo)}</strong><span>${fmtData(a.evento.data).split(" · ")[1]}${a.evento.local ? " · " + esc(a.evento.local.split(",")[0]) : ""}</span></div>
        </li>`).join("")}</ul>` : `<p class="nota-anonimo">Nenhuma data marcada por enquanto.</p>`}
    </section>
    <section class="painel">
        <p class="nota-anonimo">${I.cadeado(16)}Suas reações são anônimas. A prefeitura vê apenas quantas pessoas reagiram com cada emoji.</p>
    </section>`;
}

function renderTopo() {
    const admin = ehAdmin();
    const novos = admin ? 0 : avisos.filter((a) => a.novo).length;

    $("#tituloAvisos").innerHTML = `Avisos da Prefeitura${novos ? `<span class="selo-novos">${novos} ${novos === 1 ? "novo" : "novos"}</span>` : ""}`;
    $("#subtituloAvisos").textContent = admin
        ? "Publique comunicados para a população e acompanhe como as pessoas reagem a cada um."
        : "Eventos, inaugurações, obras e serviços da cidade em um só lugar. Reaja aos avisos para mostrar à prefeitura o que você achou.";
    $("#acaoTopoAvisos").innerHTML = admin
        ? `<button class="btn-primario btn-novo" type="button" id="btnNovoAviso">${I.mais2(18)}Novo aviso</button>`
        : "";

    const demo = $("#avisoModoDemo");
    demo.hidden = !est.demo;
    demo.innerHTML = est.demo
        ? `<div class="aviso-modo-demo">${I.info(18)}<div><strong>Modo demonstração.</strong> O servidor ainda não tem as tabelas de avisos, então esta página está usando avisos de exemplo salvos só neste navegador. Nada aqui chega aos cidadãos. <button class="link-btn" type="button" data-acao-pagina="reiniciarDemo">Restaurar exemplos</button></div></div>`
        : "";
}

function renderTudo() {
    renderTopo();
    renderFiltros();
    renderFeed();
    renderLateral();
}

// Re-renderiza só um card, preservando o resto da página.
function renderCard(id) {
    const a = avisos.find((x) => x.id === id);
    const atual = document.querySelector(`#feedAvisos .aviso[data-id="${id}"]`);
    if (!a || !atual) return null;
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlAviso(a).trim();
    const novo = tmp.firstElementChild;
    novo.style.animation = "none";
    atual.replaceWith(novo);
    return novo;
}

async function carregarAvisos() {
    est.carregando = true;
    est.erro = null;
    renderTudo();

    try {
        const lista = await api.listar();
        avisos = lista.map(paraTela);
    } catch (erro) {
        console.error("Erro ao carregar avisos:", erro);
        est.erro = erro.message || "Verifique sua conexão e tente novamente.";
    } finally {
        est.carregando = false;
        renderTudo();
    }

    // Os avisos exibidos agora deixam de ser "Novo" na próxima visita.
    if (!ehAdmin() && !est.erro) {
        avisos.forEach((a) => vistos.add(a.id));
        salvarVistos(vistos);
    }
}


/*---------------------------------------------------------------
  REAÇÕES
  A tela atualiza na hora; se o servidor recusar, volta como estava.
---------------------------------------------------------------*/

function reagir(id, chave, origem) {
    const a = avisos.find((x) => x.id === id);
    if (!a) return;

    const antes = { reacoes: { ...a.reacoes }, minha: a.minha };
    const removendo = a.minha === chave;

    if (a.minha) a.reacoes[a.minha] = Math.max(0, (a.reacoes[a.minha] || 1) - 1);
    if (removendo) a.minha = null;
    else { a.reacoes[chave] = (a.reacoes[chave] || 0) + 1; a.minha = chave; }

    est.barra = null;
    est.viaHover = false;

    const rect = (origem || $(`#feedAvisos .aviso[data-id="${id}"] .btn-reagir`))?.getBoundingClientRect();
    const card = renderCard(id);
    if (!removendo) explodir(REACAO[chave].emoji, rect);
    const resumo = card && $(".resumo-reacoes", card);
    if (resumo) { resumo.classList.add("pulso"); $(".total", resumo).classList.add("subiu"); }
    if (ehAdmin()) renderLateral();

    api.reagir(id, removendo ? null : chave)
        .then((resposta) => {
            a.reacoes = { ...(resposta.reacoes || {}) };
            a.minha = resposta.minha_reacao || null;
            if (est.barra !== id && est.detalhe !== id) renderCard(id);
        })
        .catch((erro) => {
            a.reacoes = antes.reacoes;
            a.minha = antes.minha;
            renderCard(id);
            toast(erro.message || "Não foi possível registrar sua reação.", null, "erro");
        });
}

function explodir(emoji, r) {
    if (!r || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduzir-animacoes")) return;
    for (let i = 0; i < 7; i++) {
        const p = document.createElement("span");
        p.className = "particula emoji";
        p.textContent = emoji;
        const ang = (-90 + (i - 3) * 22) * Math.PI / 180;
        const dist = 60 + Math.random() * 50;
        p.style.left = r.left + r.width / 2 - 11 + "px";
        p.style.top = r.top + r.height / 2 - 11 + "px";
        p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        p.style.setProperty("--dy", Math.sin(ang) * dist - 20 + "px");
        p.style.setProperty("--rot", (Math.random() * 60 - 30) + "deg");
        p.style.animationDelay = i * 25 + "ms";
        p.style.fontSize = 16 + Math.random() * 12 + "px";
        camadas().appendChild(p);
        setTimeout(() => p.remove(), 1100);
    }
}

function abrirBarra(id) {
    if (est.barra === id) return;
    const anterior = est.barra;
    est.barra = id; est.detalhe = null; est.menu = null;
    if (anterior) renderCard(anterior);
    renderCard(id);
    const primeiro = $(`#feedAvisos .aviso[data-id="${id}"] .barra-emojis button`);
    if (primeiro && document.activeElement?.closest?.(`.aviso[data-id="${id}"]`)) primeiro.focus({ preventScroll: true });
}

function fecharBarra() {
    if (!est.barra) return;
    const id = est.barra;
    const barra = $(`#feedAvisos .aviso[data-id="${id}"] .barra-emojis`);
    est.barra = null;
    est.viaHover = false;
    if (barra) { barra.classList.add("fechando"); setTimeout(() => renderCard(id), 170); }
    else renderCard(id);
}

function fecharPopovers(exceto) {
    if (est.barra && exceto !== "barra") fecharBarra();
    if (est.detalhe && exceto !== "detalhe") { const id = est.detalhe; est.detalhe = null; renderCard(id); }
    if (est.menu && exceto !== "menu") { const id = est.menu; est.menu = null; renderCard(id); }
}


/*---------------------------------------------------------------
  TOAST
---------------------------------------------------------------*/

function toast(msg, acao, tipo = "ok") {
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", tipo === "erro" ? "alert" : "status");
    t.innerHTML = `<span class="ok" ${tipo === "erro" ? 'style="background:var(--danger)"' : ""}>${tipo === "erro" ? I.x(14) : I.check(14)}</span><span>${esc(msg)}</span>${acao ? `<button type="button">${esc(acao.rotulo)}</button>` : ""}`;
    const sair = () => { t.classList.add("saindo"); setTimeout(() => t.remove(), 300); };
    if (acao) $("button", t).addEventListener("click", () => { acao.fn(); sair(); });
    $("#toastsAvisos").appendChild(t);
    setTimeout(sair, acao ? 6000 : tipo === "erro" ? 5000 : 3200);
}


/*---------------------------------------------------------------
  IMAGEM AMPLIADA
---------------------------------------------------------------*/

function ampliar(a) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Imagem ampliada");
    box.innerHTML = `<figure>${fotoHtml(a.foto)}</figure>`;
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    const fechar = () => { box.classList.add("fechando"); setTimeout(() => box.remove(), 250); document.removeEventListener("keydown", tecla); };
    box.addEventListener("click", fechar);
    document.addEventListener("keydown", tecla);
    camadas().appendChild(box);
}


/*---------------------------------------------------------------
  EXCLUSÃO (com "Desfazer")
---------------------------------------------------------------*/

function confirmarExclusao(a) {
    const fundo = document.createElement("div");
    fundo.className = "fundo";
    const dlg = document.createElement("div");
    dlg.className = "dialogo";
    dlg.setAttribute("role", "alertdialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.innerHTML = `<div class="icone-perigo">${I.lixeira(22)}</div>
        <h3>Excluir este aviso?</h3>
        <p>"${esc(a.titulo)}" deixa de aparecer para todos os cidadãos, junto com as ${fmtNum(totalReacoes(a))} reações.</p>
        <div class="acoes"><button class="btn-secundario" type="button" data-r="nao">Cancelar</button><button class="btn-perigo" type="button" data-r="sim">Excluir aviso</button></div>`;

    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    const fechar = () => { fundo.classList.add("fechando"); dlg.remove(); setTimeout(() => fundo.remove(), 250); document.removeEventListener("keydown", tecla); };

    fundo.addEventListener("click", fechar);
    dlg.addEventListener("click", async (e) => {
        const r = e.target.closest("[data-r]")?.dataset.r;
        if (r === "nao") fechar();
        if (r !== "sim") return;

        fechar();
        const card = $(`#feedAvisos .aviso[data-id="${a.id}"]`);
        const indice = avisos.indexOf(a);
        const tirarDaLista = () => { avisos = avisos.filter((x) => x !== a); renderFiltros(); renderFeed(); renderLateral(); };

        try {
            await api.remover(a.id);
        } catch (erro) {
            toast(erro.message || "Não foi possível excluir o aviso.", null, "erro");
            return;
        }

        if (card) { card.classList.add("saindo"); setTimeout(tirarDaLista, 420); } else tirarDaLista();

        toast("Aviso excluído", {
            rotulo: "Desfazer",
            fn: async () => {
                try {
                    await api.restaurar(a.id);
                    avisos.splice(indice, 0, a);
                    renderFiltros(); renderFeed(); renderLateral();
                } catch (erro) {
                    toast(erro.message || "Não foi possível restaurar o aviso.", null, "erro");
                }
            }
        });
    });

    document.addEventListener("keydown", tecla);
    camadas().append(fundo, dlg);
    $('[data-r="nao"]', dlg).focus();
}

async function alternarFixado(a) {
    const novoValor = !a.fixado;
    a.fixado = novoValor;
    est.menu = null;
    renderFeed();

    try {
        await api.fixar(a.id, novoValor);
        toast(novoValor ? "Aviso fixado no topo" : "Aviso desafixado");
    } catch (erro) {
        a.fixado = !novoValor;
        renderFeed();
        toast(erro.message || "Não foi possível alterar o aviso.", null, "erro");
    }
}


/*---------------------------------------------------------------
  PAINEL LATERAL: CRIAR / EDITAR AVISO (admin)
---------------------------------------------------------------*/

let rascunho = null;

function novoRascunho(base) {
    if (!base) {
        return { id: null, cat: "evento", titulo: "", texto: "", fixado: false, foto: null, arquivo: null, removerFoto: false, temEvento: false, data: "", hora: "", local: "", aba: "editar", sujo: false, tentou: false, enviando: false };
    }
    return {
        id: base.id, cat: base.cat, titulo: base.titulo, texto: base.texto, fixado: !!base.fixado,
        foto: base.foto, arquivo: null, removerFoto: false, temEvento: !!base.evento,
        data: base.evento?.data ? dataLocal(base.evento.data) : "",
        hora: base.evento?.data ? horaLocal(base.evento.data) : "",
        local: base.evento?.local || "", aba: "editar", sujo: false, tentou: false, enviando: false
    };
}

function rascunhoComoAviso(r) {
    let data = null;
    if (r.temEvento && r.data) { data = new Date(`${r.data}T${r.hora || "09:00"}`); if (isNaN(data)) data = null; }
    return {
        id: r.id ?? "previa", cat: r.cat, titulo: r.titulo.trim(), texto: r.texto.trim(), fixado: r.fixado, foto: r.foto,
        evento: r.temEvento && (data || r.local.trim()) ? { data, local: r.local.trim() } : null,
        reacoes: {}, minha: null, criado: Date.now()
    };
}

const rascunhoValido = (r) => r.titulo.trim().length >= 5 && r.texto.trim().length >= 10;

function abrirGaveta(base) {
    fecharPopovers();
    rascunho = novoRascunho(base);
    const fundo = document.createElement("div");
    fundo.className = "fundo";
    fundo.id = "fundoGaveta";
    const g = document.createElement("aside");
    g.className = "gaveta";
    g.id = "gaveta";
    g.setAttribute("role", "dialog");
    g.setAttribute("aria-modal", "true");
    g.setAttribute("aria-labelledby", "gavetaTitulo");
    camadas().append(fundo, g);
    fundo.addEventListener("click", tentarFechar);
    renderGaveta();
    setTimeout(() => $("#campoTitulo")?.focus(), 350);
}

function renderGaveta() {
    const g = $("#gaveta");
    if (!g) return;
    const r = rascunho;
    const editando = r.id != null;
    const valido = rascunhoValido(r);

    g.innerHTML = `
    <div class="gaveta-topo">
        <div><h3 id="gavetaTitulo">${editando ? "Editar aviso" : "Novo aviso"}</h3><p>${editando ? "As alterações aparecem para todos assim que você salvar." : "O aviso aparece para todos os cidadãos assim que for publicado."}</p></div>
        <button class="btn-icone" type="button" data-g="fechar" aria-label="Fechar">${I.x(18)}</button>
    </div>
    <div class="abas" role="tablist" data-aba="${r.aba}">
        <span class="indicador"></span>
        <button type="button" role="tab" aria-selected="${r.aba === "editar"}" data-aba="editar">${I.lapis(16)}Escrever</button>
        <button type="button" role="tab" aria-selected="${r.aba === "previa"}" data-aba="previa">${I.olho(16)}Como o cidadão vê</button>
    </div>
    <div class="gaveta-corpo" id="gavetaCorpo">
        ${r.aba === "editar" ? `
        <div class="campo">
            <span class="rotulo">Categoria</span>
            <div class="chips-categoria" role="radiogroup" aria-label="Categoria">
                ${Object.entries(CATEGORIAS).map(([k, c]) => `<button type="button" class="chip-cat" role="radio" data-cat="${k}" aria-checked="${r.cat === k}">${c.icone(16)}${c.nome}</button>`).join("")}
            </div>
        </div>
        <div class="campo">
            <label for="campoTitulo">Título <small id="contTitulo">${r.titulo.length}/${LIMITE_TITULO}</small></label>
            <input type="text" id="campoTitulo" maxlength="${LIMITE_TITULO}" placeholder="Ex.: Inauguração da nova UBS do Jardim América" value="${esc(r.titulo)}">
            ${r.tentou && r.titulo.trim().length < 5 ? `<span class="erro">Escreva um título com pelo menos 5 caracteres.</span>` : ""}
        </div>
        <div class="campo">
            <label for="campoTexto">Texto do aviso <small id="contTexto">${r.texto.length}/${LIMITE_TEXTO}</small></label>
            <textarea id="campoTexto" maxlength="${LIMITE_TEXTO}" placeholder="Conte o que vai acontecer, quando, onde e o que o cidadão precisa saber.">${esc(r.texto)}</textarea>
            ${r.tentou && r.texto.trim().length < 10 ? `<span class="erro">Escreva o texto do aviso com pelo menos 10 caracteres.</span>` : ""}
        </div>
        <div class="campo">
            <span class="rotulo">Foto <small>Opcional · JPG, PNG ou WEBP até 5 MB</small></span>
            ${r.foto ? `<div class="foto-escolhida">${fotoHtml(r.foto)}<button type="button" data-g="removerFoto">${I.x(14)}Remover</button></div>` : `
            <label class="zona-foto" id="zonaFoto" for="campoFoto">
                ${I.imagem(30)}
                <strong>Arraste uma foto ou clique para escolher</strong>
                <small>A foto aparece em formato 16:9, acima das reações.</small>
                ${est.demo ? `<button type="button" class="link-btn" data-g="exemplo">Usar uma imagem de exemplo</button>` : ""}
            </label>
            <input type="file" id="campoFoto" accept="image/jpeg,image/png,image/webp" hidden>`}
        </div>
        <div class="expansivel" data-aberto="${r.temEvento}">
            <button type="button" data-g="evento" aria-expanded="${r.temEvento}"><span style="display:flex;gap:10px;align-items:center">${I.calendario(17)}Adicionar data e local</span>${I.seta(18).replace("<svg", '<svg class="seta"')}</button>
            <div class="dentro"><div><div class="grade-campos">
                <div class="campo"><label for="campoData">Data</label><input type="date" id="campoData" value="${r.data}"></div>
                <div class="campo"><label for="campoHora">Horário</label><input type="time" id="campoHora" value="${r.hora}"></div>
                <div class="campo"><label for="campoLocal">Local</label><input type="text" id="campoLocal" maxlength="150" placeholder="Ex.: Praça Central" value="${esc(r.local)}"></div>
            </div></div></div>
        </div>
        <div class="linha-fixar">
            <div><strong>Fixar no topo</strong><span>Mantém o aviso em primeiro na lista até você desafixar.</span></div>
            <button type="button" class="switch" role="switch" aria-checked="${r.fixado}" data-g="fixar" aria-label="Fixar no topo"></button>
        </div>` : `
        <div class="previa-rotulo">${I.olho(15)}Pré-visualização. É assim que o aviso aparece no feed.</div>
        <div class="previa-wrap">${htmlAviso(rascunhoComoAviso(r), { previa: true })}</div>`}
    </div>
    <div class="gaveta-rodape" id="gavetaRodape">
        <div class="acoes">
            <button class="btn-secundario" type="button" data-g="fechar">Cancelar</button>
            <button class="btn-primario" type="button" data-g="publicar" ${valido ? "" : 'aria-disabled="true"'} style="${valido ? "" : "opacity:.55"}">${editando ? "Salvar alterações" : `${I.megafone(17)}Publicar aviso`}</button>
        </div>
    </div>`;

    const titulo = $("#campoTitulo", g);
    const texto = $("#campoTexto", g);
    if (titulo) titulo.addEventListener("input", () => { r.titulo = titulo.value; r.sujo = true; $("#contTitulo").textContent = `${r.titulo.length}/${LIMITE_TITULO}`; atualizarBotao(); });
    if (texto) texto.addEventListener("input", () => { r.texto = texto.value; r.sujo = true; $("#contTexto").textContent = `${r.texto.length}/${LIMITE_TEXTO}`; atualizarBotao(); });
    ["Data", "Hora", "Local"].forEach((c) => {
        const el = $(`#campo${c}`, g);
        if (el) el.addEventListener("input", () => { r[c.toLowerCase()] = el.value; r.sujo = true; });
    });

    const arquivo = $("#campoFoto", g);
    const zona = $("#zonaFoto", g);
    if (arquivo) arquivo.addEventListener("change", () => escolherFoto(arquivo.files[0]));
    if (zona) {
        zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("arrastando"); });
        zona.addEventListener("dragleave", () => zona.classList.remove("arrastando"));
        zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("arrastando"); escolherFoto(e.dataTransfer.files[0]); });
    }
}

function atualizarBotao() {
    const b = $('[data-g="publicar"]');
    if (!b || !rascunho) return;
    const valido = rascunhoValido(rascunho);
    b.style.opacity = valido ? "" : ".55";
    valido ? b.removeAttribute("aria-disabled") : b.setAttribute("aria-disabled", "true");
}

function escolherFoto(f) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return toast("Escolha uma imagem JPG, PNG ou WEBP.", null, "erro");
    if (f.size > TAMANHO_MAXIMO_FOTO) return toast("A imagem passa de 5 MB. Escolha uma menor.", null, "erro");
    if (rascunho.foto?.tipo === "previa") URL.revokeObjectURL(rascunho.foto.valor);
    rascunho.arquivo = f;
    rascunho.foto = { tipo: "previa", valor: URL.createObjectURL(f) };
    rascunho.sujo = true;
    renderGaveta();
}

function fecharGaveta() {
    const g = $("#gaveta");
    const f = $("#fundoGaveta");
    if (!g) return;
    if (rascunho?.foto?.tipo === "previa") setTimeout(() => URL.revokeObjectURL(rascunho?.foto?.valor), 400);
    g.classList.add("fechando");
    f?.classList.add("fechando");
    setTimeout(() => { g.remove(); f?.remove(); }, 320);
    rascunho = null;
}

function tentarFechar() {
    if (!rascunho || rascunho.enviando) return;
    if (!rascunho.sujo) return fecharGaveta();
    const rod = $("#gavetaRodape");
    if ($(".confirmar-descarte", rod)) return;
    const c = document.createElement("div");
    c.className = "confirmar-descarte";
    c.innerHTML = `<span>Descartar o que você escreveu?</span><div><button class="btn-secundario" type="button" data-g="continuar">Continuar editando</button><button class="btn-perigo" type="button" data-g="descartar">Descartar</button></div>`;
    rod.prepend(c);
}

async function publicar(botao) {
    const r = rascunho;
    if (r.enviando) return;

    if (!rascunhoValido(r)) {
        r.tentou = true;
        r.aba = "editar";
        renderGaveta();
        $(".erro", $("#gaveta"))?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }

    const editando = r.id != null;
    const textoOriginal = botao.innerHTML;
    r.enviando = true;
    botao.disabled = true;
    botao.innerHTML = `<span class="girando"></span>${editando ? "Salvando..." : "Publicando..."}`;

    try {
        const salvo = paraTela(await api.salvar(r));
        salvo.novo = false;

        if (editando) {
            const indice = avisos.findIndex((a) => a.id === salvo.id);
            if (indice >= 0) avisos[indice] = { ...avisos[indice], ...salvo, reacoes: avisos[indice].reacoes, minha: avisos[indice].minha };
        } else {
            avisos.push(salvo);
            est.filtro = "todos";
            est.busca = "";
            $("#buscaAvisos").value = "";
        }

        r.enviando = false;
        fecharGaveta();
        renderTudo();

        const card = $(`#feedAvisos .aviso[data-id="${salvo.id}"]`);
        if (card) {
            card.classList.add("recem");
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        toast(editando ? "Alterações salvas" : est.demo ? "Aviso publicado no modo demonstração" : "Aviso publicado para todos os cidadãos");

    } catch (erro) {
        r.enviando = false;
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
        toast(erro.message || "Não foi possível salvar o aviso.", null, "erro");
    }
}


/*---------------------------------------------------------------
  EVENTOS
---------------------------------------------------------------*/

let timerSegurar = null;
let suprimirClique = false;
let timerHover = null;

document.addEventListener("click", (e) => {
    const alvo = e.target;

    // Clique fora da página de avisos (menu, topo) só fecha os popovers abertos.
    if (!alvo.closest("#paginaAvisos, #avisosCamadas")) { fecharPopovers(); return; }

    if (alvo.closest("#btnNovoAviso")) { abrirGaveta(); return; }

    const acaoPagina = alvo.closest("[data-acao-pagina]")?.dataset.acaoPagina;
    if (acaoPagina === "recarregar") { carregarAvisos(); return; }
    if (acaoPagina === "reiniciarDemo") { window.AvisosDemo?.reiniciar(); vistos.clear(); carregarAvisos(); return; }

    // Filtros
    const filtro = alvo.closest("[data-filtro]");
    if (filtro) { est.filtro = filtro.dataset.filtro; fecharPopovers(); renderFiltros(); renderFeed(); return; }

    // Agenda da lateral
    const ir = alvo.closest("[data-ir]");
    if (ir) { irPara(Number(ir.dataset.ir)); return; }

    // Painel de criação
    const g = alvo.closest("[data-g]");
    if (g && rascunho) {
        const acao = g.dataset.g;
        if (acao === "fechar") tentarFechar();
        if (acao === "continuar") g.closest(".confirmar-descarte").remove();
        if (acao === "descartar") fecharGaveta();
        if (acao === "publicar") publicar(g);
        if (acao === "fixar") { rascunho.fixado = !rascunho.fixado; rascunho.sujo = true; g.setAttribute("aria-checked", String(rascunho.fixado)); }
        if (acao === "evento") { rascunho.temEvento = !rascunho.temEvento; rascunho.sujo = true; g.closest(".expansivel").dataset.aberto = rascunho.temEvento; g.setAttribute("aria-expanded", rascunho.temEvento); }
        if (acao === "removerFoto") {
            if (rascunho.foto?.tipo === "previa") URL.revokeObjectURL(rascunho.foto.valor);
            rascunho.foto = null; rascunho.arquivo = null; rascunho.removerFoto = true; rascunho.sujo = true; renderGaveta();
        }
        if (acao === "exemplo") {
            e.preventDefault();
            rascunho.foto = { tipo: "cena", valor: { evento: "festival", inauguracao: "parque", obras: "obras", saude: "vacina", servicos: "parque" }[rascunho.cat] };
            rascunho.arquivo = null; rascunho.sujo = true; renderGaveta();
        }
        return;
    }
    const aba = alvo.closest(".abas [data-aba]");
    if (aba && rascunho) { rascunho.aba = aba.dataset.aba; renderGaveta(); return; }
    const chip = alvo.closest(".chip-cat");
    if (chip && rascunho) {
        rascunho.cat = chip.dataset.cat; rascunho.sujo = true;
        document.querySelectorAll(".chip-cat").forEach((c) => c.setAttribute("aria-checked", String(c === chip)));
        return;
    }

    // Cards
    const card = alvo.closest("#feedAvisos .aviso[data-id]");
    if (!card) { fecharPopovers(); return; }
    if (suprimirClique) { suprimirClique = false; return; }

    const id = Number(card.dataset.id);
    const a = avisos.find((x) => x.id === id);
    if (!a) return;

    const emoji = alvo.closest("[data-reacao]");
    if (emoji) { reagir(id, emoji.dataset.reacao, emoji); return; }

    const acao = alvo.closest("[data-acao]")?.dataset.acao;
    if (acao === "reagir") {
        if (est.barra === id && est.viaHover) { est.viaHover = false; return; }
        est.barra === id ? fecharBarra() : (fecharPopovers("barra"), abrirBarra(id));
        return;
    }
    if (acao === "detalhe") { const abrir = est.detalhe !== id; fecharPopovers(); est.detalhe = abrir ? id : null; renderCard(id); return; }
    if (acao === "menu") { const abrir = est.menu !== id; fecharPopovers(); est.menu = abrir ? id : null; renderCard(id); return; }
    if (acao === "expandir") { est.expandidos.has(id) ? est.expandidos.delete(id) : est.expandidos.add(id); renderCard(id); return; }
    if (acao === "ampliar") { ampliar(a); return; }
    if (acao === "fixar") { alternarFixado(a); return; }
    if (acao === "editar") { est.menu = null; renderCard(id); abrirGaveta(a); return; }
    if (acao === "excluir") { est.menu = null; renderCard(id); confirmarExclusao(a); return; }
    fecharPopovers();
});

function irPara(id) {
    if (est.filtro !== "todos" || est.busca) { est.filtro = "todos"; est.busca = ""; $("#buscaAvisos").value = ""; renderFiltros(); renderFeed(); }
    const card = $(`#feedAvisos .aviso[data-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("recem"); void card.offsetWidth; card.classList.add("recem");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (rascunho && !$(".dialogo")) { tentarFechar(); return; }
        fecharPopovers();
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("#paginaAvisos .foto, #paginaAvisos [data-ir]")) {
        e.preventDefault();
        e.target.click();
    }
});

$("#buscaAvisos").addEventListener("input", (e) => { est.busca = e.target.value; renderFeed(); });

// Segurar no card (celular) ou passar o mouse no botão (computador) abre os emojis, como no WhatsApp.
document.addEventListener("pointerdown", (e) => {
    const card = e.target.closest("#feedAvisos .aviso[data-id]");
    if (!card || e.target.closest("button, a, input, .barra-emojis, .menu-card, .detalhe-reacoes, .foto") && !e.target.closest(".btn-reagir")) return;
    suprimirClique = false;
    if (e.pointerType === "mouse") return;
    card.classList.add("pressionado");
    timerSegurar = setTimeout(() => {
        card.classList.remove("pressionado");
        if (navigator.vibrate) navigator.vibrate(12);
        suprimirClique = true;
        fecharPopovers("barra");
        abrirBarra(Number(card.dataset.id));
    }, 420);
});

["pointerup", "pointercancel", "pointerleave"].forEach((tipo) => document.addEventListener(tipo, () => {
    clearTimeout(timerSegurar);
    document.querySelectorAll("#feedAvisos .aviso.pressionado").forEach((c) => c.classList.remove("pressionado"));
}, true));

document.addEventListener("contextmenu", (e) => { if (e.target.closest("#feedAvisos .aviso")) e.preventDefault(); });

document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const btn = e.target.closest("#feedAvisos .btn-reagir");
    if (!btn) return;
    clearTimeout(timerHover);
    const id = Number(btn.closest(".aviso").dataset.id);
    timerHover = setTimeout(() => {
        if (est.barra !== id) { fecharPopovers("barra"); abrirBarra(id); est.viaHover = true; }
    }, 380);
});

document.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse") return;
    const de = e.target.closest(".btn-reagir");
    if (de && !de.contains(e.relatedTarget)) clearTimeout(timerHover);
    const rodape = e.target.closest("#feedAvisos .aviso-rodape");
    if (rodape && est.barra && !rodape.contains(e.relatedTarget)) {
        timerHover = setTimeout(() => { if (!document.querySelector("#feedAvisos .aviso-rodape:hover")) fecharBarra(); }, 450);
    }
});


/*---------------------------------------------------------------
  INÍCIO
  O perfil (cidadão ou admin) vem do usuário confirmado pelo authGuard.js.
---------------------------------------------------------------*/

function aplicarUsuario(usuario) {
    const perfil = String(usuario?.tipo_usuario || "").trim().toUpperCase() === "ADMIN" ? "admin" : "cidadao";
    const mudou = perfil !== est.perfil;
    est.perfil = perfil;

    if (!est.iniciado) {
        est.iniciado = true;
        carregarAvisos();
    } else if (mudou) {
        renderTudo();
    }
}

window.addEventListener("cidade360:usuario-carregado", (e) => aplicarUsuario(e.detail));

if (window.usuarioLogado) {
    aplicarUsuario(window.usuarioLogado);
}

})();
