/*===================================================================

 ADMINISTRADORES

 Página do administrador com a permissão "Equipe" (menu da conta > Administradores).
 - Lista a equipe (administradores ativos e convites pendentes) com as permissões
   de cada um: Ocorrências, Avisos e Equipe. O principal tem acesso total.
 - Adicionar administrador escolhendo as permissões:
     "Já tem conta"       -> busca um cidadão e promove
     "Ainda não tem conta" -> convite por e-mail (a pessoa cria a senha)
 - Mudar permissões, remover acesso (a pessoa volta a ser cidadã),
   reenviar e cancelar convite, passar o cargo de principal
 - Histórico de quem deu, mudou ou tirou o acesso de quem

 Quem pode mexer em quem vem pronto do servidor (pode_gerenciar, pode_dar).

 Toda mudança pede a senha de quem está fazendo. As regras valem no
 servidor (BackEnd/src/controllers/administradorController.js); esta
 tela só mostra e envia.

===================================================================*/

(() => {

    "use strict";

    const API_ADMINS = "/api/administradores";

    const C = window.Cidade360;

    const FILTROS = [
        { chave: "todos", nome: "Todos" },
        { chave: "ativos", nome: "Ativos" },
        { chave: "convites", nome: "Convites pendentes" }
    ];

    const REGRAS = [
        ["coroa", "O administrador principal tem acesso total. Ninguém pode remover ou mudar o acesso dele."],
        ["equipe", "Quem tem <b>Equipe</b> só mexe em quem não tem Equipe. A permissão Equipe só o principal dá."],
        ["escudo", "Você só pode dar as permissões que você mesmo tem."],
        ["cadeado", "Toda mudança pede a sua senha, e ninguém mexe no próprio acesso."],
        ["voltar", "Remover acesso não apaga a conta: a pessoa volta a ser cidadã."]
    ];

    // As 3 permissões. Cada uma libera uma parte do sistema (o servidor confere em toda rota).
    const PERMISSOES = [
        { chave: "ocorrencias", nome: "Ocorrências", icone: "alerta", descricao: "Ver todas as ocorrências da cidade, mudar o status e cancelar trotes." },
        { chave: "avisos", nome: "Avisos", icone: "megafone", descricao: "Publicar, editar, fixar e excluir avisos para a população." },
        { chave: "equipe", nome: "Equipe", icone: "equipe", descricao: "Adicionar administradores, mudar permissões e remover acessos." }
    ];

    // Ícones que não existem no icones.js
    const ICONES_EXTRA = {
        escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
        envelope: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
        voltar: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
        coroa: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
        equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
        passar: '<path d="M4 12h14M13 6l6 6-6 6"/>'
    };

    const elementos = {
        pagina: document.getElementById("paginaAdmins"),
        btnAdicionar: document.getElementById("btnAdicionarAdmin"),
        avisoMigracao: document.getElementById("avisoMigracaoAdmins"),
        contagem: document.getElementById("contagemAdmins"),
        filtros: document.getElementById("filtrosAdmins"),
        lista: document.getElementById("listaAdmins"),
        paginacao: document.getElementById("paginacaoAdmins"),
        regras: document.getElementById("regrasAdmins"),
        historico: document.getElementById("historicoAdmins")
    };

    // Lista paginada: 7 por página no computador/notebook e 5 no
    // celular/tablet. Mesmo padrão e ponto de corte de "Meus pontos".
    const TELA_COMPUTADOR = window.matchMedia("(min-width: 1025px)");
    const POR_PAGINA_COMPUTADOR = 7;
    const POR_PAGINA_CELULAR = 5;

    const estado = {
        dados: null,
        filtro: "todos",
        pagina: 1
    };

    function limitePorPagina() {
        return TELA_COMPUTADOR.matches ? POR_PAGINA_COMPUTADOR : POR_PAGINA_CELULAR;
    }


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

    function icone(nome, tamanho = 18) {
        return ICONES_EXTRA[nome]
            ? C.svg(ICONES_EXTRA[nome], tamanho)
            : C.icone(nome, tamanho);
    }

    function obterToken() {
        return (
            localStorage.getItem("cidade360_token") ||
            sessionStorage.getItem("cidade360_token")
        );
    }

    function obterUsuario() {
        const valor =
            localStorage.getItem("cidade360_usuario") ||
            sessionStorage.getItem("cidade360_usuario");

        try {
            return window.usuarioLogado || (valor ? JSON.parse(valor) : null);
        } catch (error) {
            return null;
        }
    }

    // Só quem tem a permissão "Equipe" usa esta página (sem a informação, o servidor decide).
    function podeAbrirPagina() {
        const usuario = obterUsuario();
        const permissoes = usuario?.permissoes;

        return String(usuario?.tipo_usuario || "").trim().toUpperCase() === "ADMIN"
            && (!permissoes || permissoes.principal === true || permissoes.equipe === true);
    }

    function nomePermissao(chave) {
        return PERMISSOES.find((permissao) => permissao.chave === chave)?.nome || chave;
    }

    function primeiroNome(nome) {
        return String(nome || "").trim().split(/\s+/)[0] || "";
    }

    function data(valor) {
        const momento = new Date(valor);
        return Number.isNaN(momento.getTime()) ? "" : momento.toLocaleDateString("pt-BR");
    }

    function dataHora(valor) {
        const momento = new Date(valor);

        if (Number.isNaN(momento.getTime())) {
            return "";
        }

        return `${momento.toLocaleDateString("pt-BR")} às ${momento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }

    // Sempre devolve { ok, status, dados }. Sem acesso à página: volta para o painel.
    // (Um 403 com outro código, como "não pode mexer nessa pessoa", aparece na tela.)
    async function api(caminho, opcoes = {}) {
        const resposta = await fetch(`${API_ADMINS}${caminho}`, {
            method: opcoes.metodo || "GET",
            headers: {
                Authorization: `Bearer ${obterToken()}`,
                ...(opcoes.corpo ? { "Content-Type": "application/json" } : {})
            },
            body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
            cache: "no-store"
        });

        const dados = await resposta.json().catch(() => null);

        if (resposta.status === 403 && (!dados?.codigo || dados.codigo === "SEM_PERMISSAO")) {
            window.location.replace("/");
        }

        return { ok: resposta.ok, status: resposta.status, dados: dados || {} };
    }


    /*---------------------------------------------------------------
      TOAST
    ---------------------------------------------------------------*/

    function toast(mensagem, tipo = "ok") {
        let pilha = document.querySelector(".toasts");

        if (!pilha) {
            pilha = document.createElement("div");
            pilha.className = "toasts";
            document.body.appendChild(pilha);
        }

        const item = document.createElement("div");
        item.className = "toast";
        item.setAttribute("role", tipo === "erro" ? "alert" : "status");
        item.innerHTML = `
            <span class="ok" ${tipo === "erro" ? 'style="background:var(--danger)"' : ""}>${C.icone(tipo === "erro" ? "x" : "check", 14)}</span>
            <span>${escaparHtml(mensagem)}</span>
        `;

        pilha.appendChild(item);

        setTimeout(() => {
            item.classList.add("saindo");
            setTimeout(() => item.remove(), 300);
        }, tipo === "erro" ? 5000 : 3600);
    }


    /*---------------------------------------------------------------
      CARREGAR
    ---------------------------------------------------------------*/

    async function carregar() {
        try {
            const { ok, dados } = await api("");

            if (!ok || !dados.sucesso) {
                throw new Error(dados.mensagem);
            }

            estado.dados = adaptarResposta(dados);
            renderizarTudo();

        } catch (error) {
            elementos.contagem.textContent = "";
            elementos.lista.innerHTML = `
                <li class="vazio-admins">
                    <p>Não foi possível carregar os administradores.</p>
                    <button class="btn-secundario" type="button" data-acao="tentar">Tentar de novo</button>
                </li>
            `;

        } finally {
            elementos.pagina.setAttribute("aria-busy", "false");
        }
    }

    /*
      O servidor manda as permissões de cada administrador como objeto
      ({ principal, ocorrencias, avisos, equipe }) e não manda se dá para mexer
      em cada convite. A tela trabalha com lista de chaves e principal no topo.
    */
    function listaDePermissoes(permissoes) {
        if (Array.isArray(permissoes)) {
            return permissoes;
        }

        return PERMISSOES
            .map((permissao) => permissao.chave)
            .filter((chave) => permissoes?.[chave] === true);
    }

    function adaptarResposta(dados) {
        const eu = dados.eu || {};
        const tenhoEquipe = !dados.migracao_pendente && (eu.principal || (eu.pode_dar || []).length > 0);

        return {
            ...dados,
            administradores: (dados.administradores || []).map((admin) => ({
                ...admin,
                principal: Boolean(admin.principal ?? admin.permissoes?.principal),
                permissoes: listaDePermissoes(admin.permissoes)
            })),
            // Convite que dá "Equipe": só o principal reenvia ou cancela (o servidor confere)
            convites: (dados.convites || []).map((convite) => {
                const permissoes = listaDePermissoes(convite.permissoes);

                return {
                    ...convite,
                    permissoes,
                    pode_gerenciar: convite.pode_gerenciar
                        ?? (tenhoEquipe && (eu.principal || !permissoes.includes("equipe")))
                };
            })
        };
    }

    function renderizarTudo() {
        const pendente = estado.dados.migracao_pendente;

        elementos.btnAdicionar.disabled = pendente || !(estado.dados.eu?.pode_dar || []).length;

        elementos.avisoMigracao.hidden = !pendente;
        elementos.avisoMigracao.innerHTML = `
            ${C.icone("alerta", 18)}
            <span>As permissões, o histórico e os convites ainda estão sendo preparados no banco de dados. Por enquanto, a equipe fica só para consulta.</span>
        `;

        renderizarFiltros();
        renderizarLista();
        renderizarRegras();
        renderizarHistorico();
    }


    /*---------------------------------------------------------------
      EQUIPE (administradores + convites pendentes)
    ---------------------------------------------------------------*/

    function itensDoFiltro() {
        const { administradores, convites } = estado.dados;

        if (estado.filtro === "ativos") return administradores.map((a) => ({ tipo: "admin", ...a }));
        if (estado.filtro === "convites") return convites.map((c) => ({ tipo: "convite", ...c }));

        return [
            ...administradores.map((a) => ({ tipo: "admin", ...a })),
            ...convites.map((c) => ({ tipo: "convite", ...c }))
        ];
    }

    function renderizarFiltros() {
        const { administradores, convites } = estado.dados;

        const contagens = {
            todos: administradores.length + convites.length,
            ativos: administradores.length,
            convites: convites.length
        };

        const ativos = administradores.length;
        const pendentes = convites.length;

        elementos.contagem.textContent =
            `${ativos} ${ativos === 1 ? "ativo" : "ativos"}` +
            (pendentes ? ` · ${pendentes} ${pendentes === 1 ? "convite pendente" : "convites pendentes"}` : "");

        elementos.filtros.innerHTML = FILTROS.map((filtro) => `
            <button type="button" class="filtro-admins" data-filtro="${filtro.chave}" aria-pressed="${estado.filtro === filtro.chave}">
                ${filtro.nome}
                <span>${contagens[filtro.chave]}</span>
            </button>
        `).join("");
    }

    function chipsPermissoes(item) {
        if (item.principal) {
            return `<span class="chips-permissao"><span class="chip-permissao total">${icone("coroa", 13)}Acesso total</span></span>`;
        }

        if (!item.permissoes?.length) {
            return estado.dados.migracao_pendente ? "" : '<span class="chips-permissao"><span class="chip-permissao vazio">Sem permissões</span></span>';
        }

        return `<span class="chips-permissao">${item.permissoes.map((chave) => {
            const permissao = PERMISSOES.find((p) => p.chave === chave);
            return `<span class="chip-permissao">${icone(permissao.icone, 13)}${permissao.nome}</span>`;
        }).join("")}</span>`;
    }

    function travaHtml(texto) {
        return `<small class="nota-admin trava-admin">${C.icone("cadeado", 14)}<span>${texto}</span></small>`;
    }

    function acoesAdministrador(admin) {
        if (estado.dados.migracao_pendente) {
            return "";
        }

        if (admin.voce) {
            return admin.principal
                ? `<button type="button" class="botao-linha" data-acao="passar">${icone("passar", 15)}Passar o cargo</button>`
                : '<small class="nota-admin">Peça ao administrador principal se precisar sair.</small>';
        }

        if (!admin.pode_gerenciar) {
            return travaHtml(admin.principal
                ? "Administrador principal: ninguém pode remover nem mudar"
                : "Tem a permissão Equipe: só o principal pode mexer");
        }

        return `
            <button type="button" class="botao-linha" data-acao="permissoes" data-id="${admin.id}">Permissões</button>
            <button type="button" class="botao-linha perigo" data-acao="remover" data-id="${admin.id}">Remover acesso</button>
        `;
    }

    function linhaAdministrador(admin) {
        const origem = admin.origem === "promovido"
            ? "Promovido de cidadão"
            : admin.origem === "convite"
                ? "Entrou por convite"
                : "Administrador";

        const detalhes = [
            origem,
            admin.adicionado_por ? `por ${escaparHtml(admin.adicionado_por)}` : "",
            `desde ${data(admin.admin_desde)}`
        ].filter(Boolean).join(" · ");

        return `
            <li class="linha-admin">
                <span class="avatar-admin" aria-hidden="true">${escaparHtml(C.iniciais(admin.nome))}</span>

                <div class="dados-admin">
                    <strong>${escaparHtml(admin.nome)} ${admin.principal ? `<em class="selo-principal">${icone("coroa", 13)}Principal</em>` : ""} ${admin.voce ? '<em class="selo-voce">Você</em>' : ""}</strong>
                    <span>${escaparHtml(admin.email)}</span>
                    <small>${detalhes}</small>
                    ${chipsPermissoes(admin)}
                </div>

                <span class="situacao-admin ativo">Ativo</span>

                <div class="acoes-admin">${acoesAdministrador(admin)}</div>
            </li>
        `;
    }

    function linhaConvite(convite) {
        const detalhes = [
            convite.convidado_por ? `Convidado por ${escaparHtml(convite.convidado_por)}` : "Convite",
            `enviado em ${data(convite.enviado_em)}`,
            convite.expirado ? "venceu" : `vale até ${data(convite.expira_em)}`
        ].join(" · ");

        return `
            <li class="linha-admin convite">
                <span class="avatar-admin" aria-hidden="true">${icone("envelope", 18)}</span>

                <div class="dados-admin">
                    <strong>${escaparHtml(convite.nome)}</strong>
                    <span>${escaparHtml(convite.email)}</span>
                    <small>${detalhes}</small>
                    ${chipsPermissoes(convite)}
                </div>

                <span class="situacao-admin ${convite.expirado ? "vencido" : "pendente"}">${convite.expirado ? "Convite vencido" : "Convite pendente"}</span>

                <div class="acoes-admin">${convite.pode_gerenciar ? `
                    <button type="button" class="botao-linha" data-acao="reenviar" data-id="${convite.id}">Reenviar</button>
                    <button type="button" class="botao-linha perigo" data-acao="cancelar" data-id="${convite.id}">Cancelar convite</button>`
                    : travaHtml("Convite com a permissão Equipe: só o principal pode mexer")}
                </div>
            </li>
        `;
    }

    function renderizarLista() {
        const itens = itensDoFiltro();

        elementos.paginacao.innerHTML = "";

        if (itens.length === 0) {
            elementos.lista.innerHTML = `
                <li class="vazio-admins">
                    <p>${estado.filtro === "convites" ? "Nenhum convite esperando resposta." : "Nenhum administrador neste filtro."}</p>
                </li>
            `;
            return;
        }

        const limite = limitePorPagina();
        const totalPaginas = Math.max(1, Math.ceil(itens.length / limite));

        // Se alguém foi removido e a última página ficou vazia, volta uma.
        estado.pagina = Math.min(Math.max(1, estado.pagina), totalPaginas);

        const inicio = (estado.pagina - 1) * limite;
        const daPagina = itens.slice(inicio, inicio + limite);

        elementos.lista.innerHTML = daPagina
            .map((item) => item.tipo === "admin" ? linhaAdministrador(item) : linhaConvite(item))
            .join("");

        if (totalPaginas > 1) {
            elementos.paginacao.innerHTML = montarPaginacao(inicio, daPagina.length, itens.length, totalPaginas);
        }
    }

    function montarPaginacao(inicio, quantidade, total, totalPaginas) {
        const pagina = estado.pagina;

        return `
            <nav class="paginacao-admins" aria-label="Páginas da equipe">
                <span class="paginacao-informacao">
                    Exibindo ${inicio + 1}-${inicio + quantidade} de ${total}
                </span>

                <div class="paginacao-botoes">
                    <button class="btn-icone" data-pagina="anterior" type="button"
                        aria-label="Página anterior" ${pagina <= 1 ? "disabled" : ""}>
                        ${C.icone("voltar", 16)}
                    </button>

                    <span>Página ${pagina} de ${totalPaginas}</span>

                    <button class="btn-icone" data-pagina="proxima" type="button"
                        aria-label="Próxima página" ${pagina >= totalPaginas ? "disabled" : ""}>
                        ${C.icone("direita", 16)}
                    </button>
                </div>
            </nav>
        `;
    }

    function irParaPagina(pagina) {
        estado.pagina = pagina;
        renderizarLista();

        // Volta para o começo da lista, senão a pessoa fica no fim da página.
        elementos.lista.closest("section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }


    /*---------------------------------------------------------------
      REGRAS E HISTÓRICO
    ---------------------------------------------------------------*/

    function renderizarRegras() {
        elementos.regras.innerHTML = REGRAS.map(([nome, texto]) => `
            <li>
                <span class="icone-regra-admin">${icone(nome, 16)}</span>
                <span>${texto}</span>
            </li>
        `).join("");
    }

    function fraseHistorico(item) {
        const quem = escaparHtml(item.nome_feito_por || "Um administrador");
        const pessoa = escaparHtml(item.nome_usuario);

        const detalhe = item.detalhe ? escaparHtml(item.detalhe) : "";

        switch (item.acao) {
            case "PROMOVIDO": return `${quem} promoveu <b>${pessoa}</b> (era cidadão)${detalhe ? `: ${detalhe}` : ""}`;
            case "REMOVIDO": return `${quem} removeu o acesso de <b>${pessoa}</b> (voltou a ser cidadão)`;
            case "CONVITE_ENVIADO": return `${quem} convidou <b>${pessoa}</b>${detalhe ? `: ${detalhe}` : ""}`;
            case "PERMISSOES_ALTERADAS": return `${quem} mudou as permissões de <b>${pessoa}</b>${detalhe ? `: ${detalhe}` : ""}`;
            case "PRINCIPAL_TRANSFERIDO": return `${quem} passou o cargo de principal para <b>${pessoa}</b>`;
            case "CONVITE_REENVIADO": return `${quem} reenviou o convite de <b>${pessoa}</b>`;
            case "CONVITE_CANCELADO": return `${quem} cancelou o convite de <b>${pessoa}</b>`;
            case "CONVITE_ACEITO": return `<b>${pessoa}</b> aceitou o convite`;
            default: return pessoa;
        }
    }

    function renderizarHistorico() {
        const { historico, migracao_pendente: pendente } = estado.dados;

        if (pendente || historico.length === 0) {
            elementos.historico.innerHTML = `
                <li class="vazio-historico">${pendente
                    ? "O histórico começa a ser registrado assim que o banco de dados for atualizado."
                    : "Nenhuma mudança registrada ainda."}</li>
            `;
            return;
        }

        const negativas = ["REMOVIDO", "CONVITE_CANCELADO"];

        elementos.historico.innerHTML = historico.map((item) => `
            <li class="${negativas.includes(item.acao) ? "negativo" : ""}">
                <span>${fraseHistorico(item)}</span>
                <time datetime="${escaparHtml(item.data_acao)}">${dataHora(item.data_acao)}</time>
            </li>
        `).join("");
    }


    /*---------------------------------------------------------------
      DIÁLOGO (base)
      Usa .fundo e .dialogo do global.css.
    ---------------------------------------------------------------*/

    let dialogoAtual = null;

    function abrirDialogo(classeExtra = "") {
        fecharDialogo(true);

        const fundo = document.createElement("div");
        fundo.className = "fundo";

        const caixa = document.createElement("div");
        caixa.className = `dialogo dialogo-admins ${classeExtra}`;
        caixa.setAttribute("role", "dialog");
        caixa.setAttribute("aria-modal", "true");
        caixa.setAttribute("aria-labelledby", "tituloDialogoAdmins");

        const tecla = (event) => {
            if (event.key === "Escape") fecharDialogo();
        };

        fundo.addEventListener("click", () => fecharDialogo());
        document.addEventListener("keydown", tecla);
        document.body.append(fundo, caixa);
        document.body.classList.add("dialogo-aberto");

        dialogoAtual = { fundo, caixa, tecla, focoAnterior: document.activeElement };
        return caixa;
    }

    function fecharDialogo(semAnimacao = false) {
        if (!dialogoAtual) {
            return;
        }

        const { fundo, caixa, tecla, focoAnterior } = dialogoAtual;
        dialogoAtual = null;

        document.removeEventListener("keydown", tecla);
        document.body.classList.remove("dialogo-aberto");
        caixa.remove();

        if (semAnimacao) {
            fundo.remove();
        } else {
            fundo.classList.add("fechando");
            setTimeout(() => fundo.remove(), 250);
            focoAnterior?.focus?.();
        }
    }

    function focar(seletor) {
        setTimeout(() => dialogoAtual?.caixa.querySelector(seletor)?.focus(), 40);
    }

    function campoSenhaHtml() {
        return `
            <div class="campo">
                <label for="senhaConfirmacaoAdmin">Digite a sua senha para confirmar</label>
                <div class="entrada-admin">
                    ${C.icone("cadeado", 16)}
                    <input type="password" id="senhaConfirmacaoAdmin" maxlength="72" autocomplete="current-password" placeholder="A senha que você usa para entrar">
                </div>
                <span class="erro" id="erroDialogoAdmin" role="alert" hidden></span>
            </div>
        `;
    }

    function mostrarErroDialogo(mensagem) {
        const erro = dialogoAtual?.caixa.querySelector("#erroDialogoAdmin");

        if (erro) {
            erro.textContent = mensagem;
            erro.hidden = !mensagem;
        }
    }

    function botaoCarregando(botao, carregando, texto) {
        botao.disabled = carregando;
        botao.innerHTML = carregando ? '<span class="girando" aria-hidden="true"></span> Aguarde...' : texto;
    }

    // Senha digitada libera o botão de confirmar; Enter confirma.
    function ligarSenha(caixa, botao) {
        const senha = caixa.querySelector("#senhaConfirmacaoAdmin");

        senha.addEventListener("input", () => {
            botao.disabled = senha.value.length === 0;
            mostrarErroDialogo("");
        });

        senha.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !botao.disabled) {
                botao.click();
            }
        });

        return senha;
    }


    /*---------------------------------------------------------------
      ADICIONAR ADMINISTRADOR
    ---------------------------------------------------------------*/

    const adicionar = {
        aba: "promover",
        busca: "",
        resultados: [],
        buscando: false,
        selecionado: null,
        convite: { nome: "", email: "" },
        aviso: null,
        temporizador: null
    };

    function abrirAdicionar(aba = "promover") {
        Object.assign(adicionar, {
            aba,
            busca: "",
            resultados: [],
            selecionado: null,
            convite: { nome: "", email: "" },
            aviso: null
        });

        const caixa = abrirDialogo("extra-largo");

        caixa.addEventListener("click", cliqueAdicionar);
        caixa.addEventListener("input", digitarAdicionar);

        renderizarAdicionar();
        focar(adicionar.aba === "promover" ? "#buscaCidadaoAdmin" : "#nomeConviteAdmin");
    }

    function renderizarAdicionar() {
        const caixa = dialogoAtual?.caixa;

        if (!caixa) {
            return;
        }

        const promover = adicionar.aba === "promover";

        caixa.innerHTML = `
            <button class="btn-icone fechar-dialogo" type="button" data-acao="fechar" aria-label="Fechar">${C.icone("x", 18)}</button>

            <h3 id="tituloDialogoAdmins">Adicionar administrador</h3>
            <p>Escolha se a pessoa já usa o Cidade360 ou se ainda não tem conta.</p>

            <div class="abas-admin" role="tablist">
                <button type="button" class="aba-admin" role="tab" data-aba="promover" aria-selected="${promover}">
                    ${C.icone("usuario", 18)}
                    <span><b>Já tem conta</b><small>Promover um cidadão cadastrado</small></span>
                </button>
                <button type="button" class="aba-admin" role="tab" data-aba="convidar" aria-selected="${!promover}">
                    ${icone("envelope", 18)}
                    <span><b>Ainda não tem conta</b><small>Convidar por e-mail</small></span>
                </button>
            </div>

            <div class="corpo-dialogo-admin">
                ${promover ? corpoPromover() : corpoConvidar()}
            </div>

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="fechar">Cancelar</button>
                <button class="btn-primario" type="button" data-acao="continuar" ${podeContinuar() ? "" : "disabled"}>Continuar</button>
            </div>
        `;
    }

    function corpoPromover() {
        return `
            <div class="campo">
                <label for="buscaCidadaoAdmin">Buscar cidadão</label>
                <div class="entrada-admin">
                    ${C.icone("lupa", 16)}
                    <input type="search" id="buscaCidadaoAdmin" maxlength="100" autocomplete="off" placeholder="Nome, e-mail ou CPF completo" value="${escaparHtml(adicionar.busca)}">
                </div>
                <span class="dica-campo">Digite pelo menos 3 letras. O CPF aparece pela metade de propósito (LGPD).</span>
            </div>

            <ul class="resultados-cidadaos" id="resultadosCidadaos" aria-live="polite">${listaResultados()}</ul>
        `;
    }

    function listaResultados() {
        if (adicionar.busca.trim().length < 3) {
            return '<li class="vazio-busca">Comece a digitar para buscar.</li>';
        }

        if (adicionar.buscando && adicionar.resultados.length === 0) {
            return '<li class="vazio-busca">Buscando...</li>';
        }

        if (adicionar.resultados.length === 0) {
            return `<li class="vazio-busca">Nenhum cidadão encontrado. Se a pessoa ainda não tem conta, use <button type="button" class="link-admin" data-aba="convidar">Ainda não tem conta</button>.</li>`;
        }

        return adicionar.resultados.map((cidadao) => {
            const selecionado = adicionar.selecionado?.id === cidadao.id;
            const ocorrencias = cidadao.total_ocorrencias;

            return `
                <li class="${selecionado ? "selecionado" : ""}">
                    <span class="avatar-admin pequeno" aria-hidden="true">${escaparHtml(C.iniciais(cidadao.nome))}</span>
                    <div class="dados-admin">
                        <strong>${escaparHtml(cidadao.nome)}</strong>
                        <span>${escaparHtml(cidadao.email)}${cidadao.cpf ? ` · CPF ${escaparHtml(cidadao.cpf)}` : ""}</span>
                        <small>Cidadão desde ${data(cidadao.cidadao_desde)} · ${ocorrencias} ${ocorrencias === 1 ? "ocorrência" : "ocorrências"}</small>
                    </div>
                    <button type="button" class="botao-linha ${selecionado ? "ativo" : ""}" data-selecionar="${cidadao.id}" aria-pressed="${selecionado}">
                        ${selecionado ? "Selecionado" : "Selecionar"}
                    </button>
                </li>
            `;
        }).join("");
    }

    function corpoConvidar() {
        const aviso = adicionar.aviso;

        return `
            <div class="campo">
                <label for="nomeConviteAdmin">Nome completo</label>
                <div class="entrada-admin">
                    ${C.icone("usuario", 16)}
                    <input type="text" id="nomeConviteAdmin" maxlength="150" autocomplete="off" placeholder="Ex.: Carla Mendes" value="${escaparHtml(adicionar.convite.nome)}">
                </div>
            </div>

            <div class="campo">
                <label for="emailConviteAdmin">E-mail</label>
                <div class="entrada-admin">
                    ${icone("envelope", 16)}
                    <input type="email" id="emailConviteAdmin" maxlength="150" autocomplete="off" placeholder="nome@jaborandi.sp.gov.br" value="${escaparHtml(adicionar.convite.email)}">
                </div>
                <span class="dica-campo">A pessoa recebe um link para criar a própria senha e completar CPF e telefone. O convite vale ${estado.dados?.dias_validade_convite || 7} dias.</span>
            </div>

            <div id="avisoConviteAdmin">${aviso ? avisoConviteHtml(aviso) : ""}</div>
        `;
    }

    function avisoConviteHtml(aviso) {
        if (aviso.cidadao) {
            return `
                <div class="aviso-admin alerta">
                    ${C.icone("alerta", 18)}
                    <span>Esse e-mail já tem conta de cidadão (${escaparHtml(aviso.cidadao.nome)}).
                    <button type="button" class="link-admin" data-promover-cidadao="1">Promover essa conta</button> em vez de convidar.</span>
                </div>
            `;
        }

        return `
            <div class="aviso-admin erro-aviso">
                ${C.icone("alerta", 18)}
                <span>${escaparHtml(aviso.mensagem)}</span>
            </div>
        `;
    }

    function emailValido(email) {
        return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(email).trim());
    }

    function podeContinuar() {
        if (adicionar.aba === "promover") {
            return Boolean(adicionar.selecionado);
        }

        return (
            adicionar.convite.nome.trim().length >= 3 &&
            emailValido(adicionar.convite.email) &&
            !adicionar.aviso
        );
    }

    function atualizarBotaoContinuar() {
        const botao = dialogoAtual?.caixa.querySelector('[data-acao="continuar"]');

        if (botao) {
            botao.disabled = !podeContinuar();
        }
    }

    function buscarCidadaos() {
        clearTimeout(adicionar.temporizador);

        const termo = adicionar.busca.trim();

        if (termo.length < 3) {
            adicionar.resultados = [];
            atualizarResultados();
            return;
        }

        adicionar.buscando = true;

        adicionar.temporizador = setTimeout(async () => {
            const { ok, dados } = await api(`/cidadaos?busca=${encodeURIComponent(termo)}`).catch(() => ({ ok: false, dados: {} }));

            // Chegou a resposta de uma busca antiga: ignora.
            if (termo !== adicionar.busca.trim()) {
                return;
            }

            adicionar.buscando = false;
            adicionar.resultados = ok ? dados.cidadaos || [] : [];
            atualizarResultados();

            if (!ok) {
                toast(dados.mensagem || "Não foi possível buscar os cidadãos.", "erro");
            }
        }, 300);
    }

    function atualizarResultados() {
        const lista = dialogoAtual?.caixa.querySelector("#resultadosCidadaos");

        if (lista) {
            lista.innerHTML = listaResultados();
        }

        atualizarBotaoContinuar();
    }

    function digitarAdicionar(event) {
        const alvo = event.target;

        if (alvo.id === "buscaCidadaoAdmin") {
            adicionar.busca = alvo.value;
            adicionar.selecionado = null;
            buscarCidadaos();
            atualizarResultados();
        }

        if (alvo.id === "nomeConviteAdmin" || alvo.id === "emailConviteAdmin") {
            adicionar.convite[alvo.id === "nomeConviteAdmin" ? "nome" : "email"] = alvo.value;

            if (alvo.id === "emailConviteAdmin" && adicionar.aviso) {
                adicionar.aviso = null;
                dialogoAtual.caixa.querySelector("#avisoConviteAdmin").innerHTML = "";
            }

            atualizarBotaoContinuar();
        }
    }

    async function cliqueAdicionar(event) {
        const alvo = event.target.closest("button");

        if (!alvo) {
            return;
        }

        if (alvo.dataset.acao === "fechar") {
            fecharDialogo();
            return;
        }

        if (alvo.dataset.aba) {
            adicionar.aba = alvo.dataset.aba;
            renderizarAdicionar();
            focar(adicionar.aba === "promover" ? "#buscaCidadaoAdmin" : "#nomeConviteAdmin");
            return;
        }

        if (alvo.dataset.selecionar) {
            const id = Number(alvo.dataset.selecionar);
            adicionar.selecionado = adicionar.resultados.find((cidadao) => cidadao.id === id) || null;
            atualizarResultados();
            return;
        }

        if (alvo.dataset.promoverCidadao) {
            const cidadao = adicionar.aviso.cidadao;
            adicionar.aba = "promover";
            adicionar.busca = cidadao.email;
            adicionar.aviso = null;
            renderizarAdicionar();
            buscarCidadaos();
            return;
        }

        if (alvo.dataset.acao === "continuar" && podeContinuar()) {
            if (adicionar.aba === "promover") {
                confirmarPromocao(adicionar.selecionado);
            } else {
                await conferirConvite(alvo);
            }
        }
    }

    // Antes de pedir a senha, o servidor já diz se o e-mail tem conta (sugere promover).
    async function conferirConvite(botao) {
        const nome = adicionar.convite.nome.trim();
        const email = adicionar.convite.email.trim().toLowerCase();

        botaoCarregando(botao, true, "Continuar");

        // Vai sem senha: o servidor confere o e-mail e para antes de criar o convite.
        const umaPermissao = (estado.dados?.eu?.pode_dar || []).slice(0, 1);

        const { status, dados } = await api("/convites", {
            metodo: "POST",
            corpo: { nome, email, permissoes: umaPermissao }
        }).catch(() => ({ status: 0, dados: {} }));

        botaoCarregando(botao, false, "Continuar");

        // E-mail livre: o servidor só reclamou da senha (ou das permissões). Pode seguir.
        if (
            (status === 400 && (dados.campo === "permissoes" || dados.codigo === "PERMISSOES_INVALIDAS")) ||
            (status === 401 && dados.codigo === "SENHA_INCORRETA")
        ) {
            confirmarConvite({ nome, email });
            return;
        }

        if (dados.codigo === "EMAIL_JA_CIDADAO") {
            adicionar.aviso = { cidadao: dados.cidadao };
        } else {
            adicionar.aviso = { mensagem: dados.mensagem || "Não foi possível conferir esse e-mail. Tente de novo." };
        }

        dialogoAtual.caixa.querySelector("#avisoConviteAdmin").innerHTML = avisoConviteHtml(adicionar.aviso);
        atualizarBotaoContinuar();
    }


    /*---------------------------------------------------------------
      CONFIRMAÇÕES (com senha)
    ---------------------------------------------------------------*/

    // Cartões de permissão. Os que eu não posso dar ficam travados.
    function cartoesPermissoesHtml(marcadas) {
        const podeDar = estado.dados?.eu?.pode_dar || [];

        return `
            <fieldset class="permissoes-admin">
                <legend>Permissões</legend>
                ${PERMISSOES.map((permissao) => {
                    const pode = podeDar.includes(permissao.chave);
                    const marcada = marcadas.includes(permissao.chave);
                    const motivo = permissao.chave === "equipe"
                        ? "Só o administrador principal pode dar"
                        : "Você não tem essa permissão";

                    return `
                        <label class="opcao-permissao ${pode ? "" : "travada"}">
                            <input type="checkbox" name="permissaoAdmin" value="${permissao.chave}" ${marcada ? "checked" : ""} ${pode ? "" : "disabled"}>
                            <span class="icone-permissao" aria-hidden="true">${icone(permissao.icone, 18)}</span>
                            <span class="texto-permissao">
                                <b>${permissao.nome}</b>
                                <small>${permissao.descricao}</small>
                                ${pode ? "" : `<em>${C.icone("cadeado", 12)}${motivo}</em>`}
                            </span>
                        </label>
                    `;
                }).join("")}
            </fieldset>
            <p class="dica-permissoes" id="dicaPermissoesAdmin" hidden>Marque pelo menos uma permissão.</p>
        `;
    }

    function permissoesMarcadas(caixa) {
        return [...caixa.querySelectorAll('input[name="permissaoAdmin"]:checked')].map((entrada) => entrada.value);
    }

    // Senha digitada + pelo menos uma permissão marcada liberam o botão.
    function ligarSenhaEPermissoes(caixa, botao) {
        const senha = ligarSenha(caixa, botao);
        const dica = caixa.querySelector("#dicaPermissoesAdmin");

        const atualizar = () => {
            const temPermissao = permissoesMarcadas(caixa).length > 0;
            dica.hidden = temPermissao;
            botao.disabled = senha.value.length === 0 || !temPermissao;
        };

        caixa.addEventListener("change", atualizar);
        senha.addEventListener("input", atualizar);
        atualizar();

        return senha;
    }

    function confirmarPromocao(cidadao) {
        const caixa = abrirDialogo("largo");
        const nome = primeiroNome(cidadao.nome);

        caixa.innerHTML = `
            <div class="icone-dialogo-admin">${icone("escudo", 22)}</div>
            <h3 id="tituloDialogoAdmins">O que ${escaparHtml(nome)} vai poder fazer?</h3>
            <p>${escaparHtml(cidadao.nome)} · ${escaparHtml(cidadao.email)}. Marque só o que a pessoa precisa para o trabalho dela. Dá para mudar depois.</p>

            ${cartoesPermissoesHtml([])}

            <div class="aviso-admin info">
                ${C.icone("alerta", 18)}
                <span>As ocorrências que ${escaparHtml(nome)} abriu como cidadão continuam na conta. Os pontos ficam guardados e voltam a aparecer se o acesso for removido.</span>
            </div>

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="voltar">Voltar</button>
                <button class="btn-primario" type="button" data-acao="confirmar" disabled>Promover a administrador</button>
            </div>
        `;

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenhaEPermissoes(caixa, botao);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "voltar") {
                reabrirAdicionar();
            }

            if (acao !== "confirmar") {
                return;
            }

            botaoCarregando(botao, true, "Promover a administrador");

            const { ok, dados } = await api("/promover", {
                metodo: "POST",
                corpo: { usuario_id: cidadao.id, permissoes: permissoesMarcadas(caixa), senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Promover a administrador");
                mostrarErroDialogo(dados.mensagem || "Não foi possível promover agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast(`${nome} agora é administrador. Enviamos um e-mail avisando.`);
            carregar();
        });

        focar('input[name="permissaoAdmin"]:not(:disabled)');
    }

    function confirmarConvite({ nome, email }) {
        const caixa = abrirDialogo("largo");
        const primeiro = primeiroNome(nome);

        caixa.innerHTML = `
            <div class="icone-dialogo-admin">${icone("envelope", 22)}</div>
            <h3 id="tituloDialogoAdmins">Convidar ${escaparHtml(primeiro)}</h3>
            <p>${escaparHtml(email)} vira administrador só depois de aceitar o convite, já com as permissões que você marcar.</p>

            ${cartoesPermissoesHtml([])}

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="voltar">Voltar</button>
                <button class="btn-primario" type="button" data-acao="confirmar" disabled>Enviar convite</button>
            </div>
        `;

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenhaEPermissoes(caixa, botao);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "voltar") {
                reabrirAdicionar();
            }

            if (acao !== "confirmar") {
                return;
            }

            botaoCarregando(botao, true, "Enviar convite");

            const { ok, dados } = await api("/convites", {
                metodo: "POST",
                corpo: { nome, email, permissoes: permissoesMarcadas(caixa), senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Enviar convite");
                mostrarErroDialogo(dados.mensagem || "Não foi possível enviar o convite agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast(dados.mensagem || `Convite enviado para ${email}.`);
            carregar();
        });

        focar('input[name="permissaoAdmin"]:not(:disabled)');
    }

    function editarPermissoes(admin) {
        const caixa = abrirDialogo("largo");
        const nome = primeiroNome(admin.nome);

        // O servidor só aceita salvar permissões que eu posso dar. Se a pessoa tem
        // alguma que eu não tenho, só o principal consegue mudar o acesso dela.
        const podeDar = estado.dados?.eu?.pode_dar || [];
        const queNaoPossoDar = admin.permissoes.filter((chave) => !podeDar.includes(chave));

        if (queNaoPossoDar.length) {
            const nomes = PERMISSOES
                .filter((permissao) => queNaoPossoDar.includes(permissao.chave))
                .map((permissao) => permissao.nome)
                .join(" e ");

            caixa.innerHTML = `
                <div class="icone-dialogo-admin">${icone("escudo", 22)}</div>
                <h3 id="tituloDialogoAdmins">Permissões de ${escaparHtml(nome)}</h3>
                <p>${escaparHtml(admin.nome)} tem ${escaparHtml(nomes)}, que você não pode dar. Por isso, só o administrador principal pode mudar as permissões dessa pessoa.</p>

                ${cartoesPermissoesHtml(admin.permissoes).replace(/<input /g, "<input disabled ")}

                <div class="acoes">
                    <button class="btn-primario" type="button" data-acao="fechar">Entendi</button>
                </div>
            `;

            caixa.querySelector("#dicaPermissoesAdmin")?.remove();
            caixa.addEventListener("click", (event) => {
                if (event.target.closest('[data-acao="fechar"]')) {
                    fecharDialogo();
                }
            });

            focar('[data-acao="fechar"]');
            return;
        }

        caixa.innerHTML = `
            <div class="icone-dialogo-admin">${icone("escudo", 22)}</div>
            <h3 id="tituloDialogoAdmins">Permissões de ${escaparHtml(nome)}</h3>
            <p>${escaparHtml(admin.nome)} · ${escaparHtml(admin.email)}. A mudança vale na hora, no próximo clique da pessoa.</p>

            ${cartoesPermissoesHtml(admin.permissoes)}

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="fechar">Cancelar</button>
                <button class="btn-primario" type="button" data-acao="confirmar" disabled>Salvar permissões</button>
            </div>
        `;

        caixa.querySelector("#dicaPermissoesAdmin").textContent =
            "Precisa ficar pelo menos uma. Para tirar tudo, use \"Remover acesso\".";

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenhaEPermissoes(caixa, botao);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "fechar") {
                fecharDialogo();
            }

            if (acao !== "confirmar") {
                return;
            }

            botaoCarregando(botao, true, "Salvar permissões");

            const { ok, dados } = await api(`/${admin.id}/permissoes`, {
                metodo: "POST",
                corpo: { permissoes: permissoesMarcadas(caixa), senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Salvar permissões");
                mostrarErroDialogo(dados.mensagem || "Não foi possível salvar agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast(dados.mensagem || "Permissões salvas.");
            carregar();
        });

        focar('input[name="permissaoAdmin"]:not(:disabled)');
    }

    function passarCargo() {
        const candidatos = estado.dados.administradores.filter((admin) => !admin.voce);

        if (!candidatos.length) {
            toast("Adicione outro administrador antes de passar o cargo.", "erro");
            return;
        }

        const caixa = abrirDialogo("largo");

        caixa.innerHTML = `
            <div class="icone-dialogo-admin">${icone("coroa", 22)}</div>
            <h3 id="tituloDialogoAdmins">Passar o cargo de administrador principal</h3>
            <p>Use quando você for sair da prefeitura ou trocar de função.</p>

            <fieldset class="escolha-principal">
                <legend>Quem vai ser o novo principal?</legend>
                ${candidatos.map((admin) => `
                    <label>
                        <input type="radio" name="novoPrincipal" value="${admin.id}">
                        <span class="avatar-admin pequeno" aria-hidden="true">${escaparHtml(C.iniciais(admin.nome))}</span>
                        <span class="dados-admin">
                            <strong>${escaparHtml(admin.nome)}</strong>
                            ${chipsPermissoes(admin)}
                        </span>
                    </label>
                `).join("")}
            </fieldset>

            <div class="poderes-admin">
                <b>O que acontece</b>
                <ul>
                    <li>A pessoa escolhida ganha acesso total e vira a principal.</li>
                    <li>Você continua administrador, com as três permissões, mas o novo principal passa a poder mudar ou remover o seu acesso.</li>
                    <li>Só existe um principal por vez.</li>
                </ul>
            </div>

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="fechar">Cancelar</button>
                <button class="btn-primario" type="button" data-acao="confirmar" disabled>Passar o cargo</button>
            </div>
        `;

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenha(caixa, botao);
        const escolhido = () => caixa.querySelector('input[name="novoPrincipal"]:checked');
        const atualizar = () => { botao.disabled = senha.value.length === 0 || !escolhido(); };

        caixa.addEventListener("change", atualizar);
        senha.addEventListener("input", atualizar);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "fechar") {
                fecharDialogo();
            }

            if (acao !== "confirmar" || !escolhido()) {
                return;
            }

            botaoCarregando(botao, true, "Passar o cargo");

            const { ok, dados } = await api(`/${escolhido().value}/principal`, {
                metodo: "POST",
                corpo: { senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Passar o cargo");
                mostrarErroDialogo(dados.mensagem || "Não foi possível passar o cargo agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast(dados.mensagem || "Cargo passado.");

            // Meu acesso mudou: atualiza o usuário guardado (menu da conta) e recarrega a página.
            try {
                const usuario = obterUsuario();

                if (usuario?.permissoes) {
                    usuario.permissoes.principal = false;
                    const onde = localStorage.getItem("cidade360_usuario") ? localStorage : sessionStorage;
                    onde.setItem("cidade360_usuario", JSON.stringify(usuario));
                }
            } catch (error) {
                // Sem armazenamento, o próximo carregamento busca do servidor.
            }

            carregar();
        });

        focar('input[name="novoPrincipal"]');
    }

    // Volta para "Adicionar administrador" sem perder o que já foi digitado.
    function reabrirAdicionar() {
        const salvo = { ...adicionar, convite: { ...adicionar.convite } };

        abrirAdicionar(salvo.aba);
        Object.assign(adicionar, salvo);
        renderizarAdicionar();
    }

    function confirmarRemocao(admin) {
        const caixa = abrirDialogo("largo");
        const nome = primeiroNome(admin.nome);

        caixa.innerHTML = `
            <div class="icone-perigo">${C.icone("bloqueio", 22)}</div>
            <h3 id="tituloDialogoAdmins">Remover o acesso de ${escaparHtml(nome)}?</h3>
            <p>A conta não é apagada. ${escaparHtml(nome)} volta a ser cidadão e recebe um e-mail avisando.</p>

            <div class="poderes-admin">
                <b>O que acontece</b>
                <ul>
                    <li>Perde o acesso a todas as ocorrências, status e avisos na hora</li>
                    <li>Continua entrando com o mesmo e-mail e senha, como cidadão</li>
                    <li>O que fez como administrador continua registrado</li>
                </ul>
            </div>

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="fechar">Voltar</button>
                <button class="btn-perigo" type="button" data-acao="confirmar" disabled>Remover acesso</button>
            </div>
        `;

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenha(caixa, botao);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "fechar") {
                fecharDialogo();
            }

            if (acao !== "confirmar") {
                return;
            }

            botaoCarregando(botao, true, "Remover acesso");

            const { ok, dados } = await api(`/${admin.id}/remover`, {
                metodo: "POST",
                corpo: { senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Remover acesso");
                mostrarErroDialogo(dados.mensagem || "Não foi possível remover agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast(`${nome} voltou a ser cidadão.`);
            carregar();
        });

        focar("#senhaConfirmacaoAdmin");
    }

    function confirmarCancelamento(convite) {
        const caixa = abrirDialogo("largo");

        caixa.innerHTML = `
            <div class="icone-perigo">${C.icone("x", 22)}</div>
            <h3 id="tituloDialogoAdmins">Cancelar o convite de ${escaparHtml(primeiroNome(convite.nome))}?</h3>
            <p>O link enviado para ${escaparHtml(convite.email)} para de funcionar.</p>

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="fechar">Voltar</button>
                <button class="btn-perigo" type="button" data-acao="confirmar" disabled>Cancelar convite</button>
            </div>
        `;

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenha(caixa, botao);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "fechar") {
                fecharDialogo();
            }

            if (acao !== "confirmar") {
                return;
            }

            botaoCarregando(botao, true, "Cancelar convite");

            const { ok, dados } = await api(`/convites/${convite.id}/cancelar`, {
                metodo: "POST",
                corpo: { senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Cancelar convite");
                mostrarErroDialogo(dados.mensagem || "Não foi possível cancelar agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast("Convite cancelado.");
            carregar();
        });

        focar("#senhaConfirmacaoAdmin");
    }

    function reenviarConvite(convite) {
        const caixa = abrirDialogo("largo");

        caixa.innerHTML = `
            <div class="icone-dialogo-admin">${icone("passar", 22)}</div>
            <h3 id="tituloDialogoAdmins">Reenviar o convite de ${escaparHtml(primeiroNome(convite.nome))}?</h3>
            <p>Um link novo vai para ${escaparHtml(convite.email)} e vale por mais ${Number(estado.dados.dias_validade_convite) || 7} dias. O link antigo para de funcionar.</p>

            ${campoSenhaHtml()}

            <div class="acoes">
                <button class="btn-secundario" type="button" data-acao="fechar">Voltar</button>
                <button class="btn-primario" type="button" data-acao="confirmar" disabled>Reenviar convite</button>
            </div>
        `;

        const botao = caixa.querySelector('[data-acao="confirmar"]');
        const senha = ligarSenha(caixa, botao);

        caixa.addEventListener("click", async (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "fechar") {
                fecharDialogo();
            }

            if (acao !== "confirmar") {
                return;
            }

            botaoCarregando(botao, true, "Reenviar convite");

            const { ok, dados } = await api(`/convites/${convite.id}/reenviar`, {
                metodo: "POST",
                corpo: { senha_confirmacao: senha.value }
            }).catch(() => ({ ok: false, dados: {} }));

            if (!ok) {
                botaoCarregando(botao, false, "Reenviar convite");
                mostrarErroDialogo(dados.mensagem || "Não foi possível reenviar agora. Tente de novo.");
                senha.select();
                return;
            }

            fecharDialogo();
            toast(dados.mensagem || "Convite reenviado.");
            carregar();
        });

        focar("#senhaConfirmacaoAdmin");
    }


    /*---------------------------------------------------------------
      EVENTOS
    ---------------------------------------------------------------*/

    elementos.btnAdicionar.addEventListener("click", () => abrirAdicionar("promover"));

    elementos.filtros.addEventListener("click", (event) => {
        const botao = event.target.closest("[data-filtro]");

        if (!botao || !estado.dados) {
            return;
        }

        estado.filtro = botao.dataset.filtro;
        estado.pagina = 1;
        renderizarFiltros();
        renderizarLista();
    });

    elementos.paginacao.addEventListener("click", (event) => {
        const botao = event.target.closest("[data-pagina]");

        if (!botao || botao.disabled) {
            return;
        }

        irParaPagina(estado.pagina + (botao.dataset.pagina === "proxima" ? 1 : -1));
    });

    // Girou o celular ou mudou o tamanho da janela: troca 7 por 5 (ou o
    // contrário) mantendo na tela quem estava primeiro.
    TELA_COMPUTADOR.addEventListener("change", (event) => {
        if (!estado.dados) {
            return;
        }

        const limiteAnterior = event.matches ? POR_PAGINA_CELULAR : POR_PAGINA_COMPUTADOR;
        const primeiroItem = (estado.pagina - 1) * limiteAnterior;

        estado.pagina = Math.floor(primeiroItem / limitePorPagina()) + 1;
        renderizarLista();
    });

    elementos.lista.addEventListener("click", (event) => {
        const botao = event.target.closest("[data-acao]");

        if (!botao) {
            return;
        }

        if (botao.dataset.acao === "tentar") {
            elementos.lista.innerHTML = '<li class="esqueleto"></li><li class="esqueleto"></li>';
            carregar();
            return;
        }

        const id = Number(botao.dataset.id);

        if (botao.dataset.acao === "remover") {
            confirmarRemocao(estado.dados.administradores.find((admin) => admin.id === id));
        }

        if (botao.dataset.acao === "permissoes") {
            editarPermissoes(estado.dados.administradores.find((admin) => admin.id === id));
        }

        if (botao.dataset.acao === "passar") {
            passarCargo();
        }

        if (botao.dataset.acao === "reenviar") {
            reenviarConvite(estado.dados.convites.find((convite) => convite.id === id));
        }

        if (botao.dataset.acao === "cancelar") {
            confirmarCancelamento(estado.dados.convites.find((convite) => convite.id === id));
        }
    });


    /*---------------------------------------------------------------
      INÍCIO
      Quem não tem a permissão "Equipe" volta para o painel (o servidor também bloqueia).
    ---------------------------------------------------------------*/

    if (!podeAbrirPagina()) {
        window.location.replace("/");
        return;
    }

    carregar();

})();
