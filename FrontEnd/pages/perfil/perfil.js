/*===================================================================

 MEU PERFIL

 O usuário logado (cidadão ou administrador) vê e altera:
 - Dados pessoais: nome, telefone, estado e cidade (PUT /api/perfil/dados)
 - E-mail: código de 6 dígitos enviado ao e-mail novo
   (POST /api/perfil/email/enviar-codigo e /api/perfil/email/confirmar).
   A etapa 1 devolve um "bilhete" que volta junto com o código na etapa 2.
 - Senha: senha atual + senha nova (PUT /api/perfil/senha)

 O CPF só aparece mascarado e não pode ser trocado por aqui.
 Administrador não tem o campo Cidade (a trava de cidade é só do cidadão).
 Toda regra (senha forte, cidade atendida, e-mail repetido) também
 é conferida no servidor: a tela só ajuda o usuário a acertar antes.

===================================================================*/

(() => {

    "use strict";

    const API = "/api";
    const PAGINA_PONTOS = "/FrontEnd/pages/pontos/pontos.html";
    const LISTA_MUNICIPIOS = "/assets/data/municipios-brasil.json?v=1";
    const ESPERA_REENVIO_SEGUNDOS = 60;
    const MAXIMO_CIDADES_LISTA = 8;

    const C = window.Cidade360;

    const ESTADOS_BRASIL = [
        ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"],
        ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"],
        ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"],
        ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
        ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
        ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
        ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]
    ];

    const REGRAS_SENHA = [
        { chave: "tamanho", texto: "8 caracteres ou mais", teste: (s) => s.length >= 8 && s.length <= 72 },
        { chave: "maiuscula", texto: "Uma letra maiúscula", teste: (s) => /[A-Z]/.test(s) },
        { chave: "minuscula", texto: "Uma letra minúscula", teste: (s) => /[a-z]/.test(s) },
        { chave: "numero", texto: "Um número", teste: (s) => /[0-9]/.test(s) },
        { chave: "simbolo", texto: "Um símbolo (!@#$%&*...)", teste: (s) => /[!@#$%&*()_\-+=?.,:;{}[\]^~]/.test(s) }
    ];

    // Mesma lista do servidor (validacoesUsuario.js)
    const SENHAS_BLOQUEADAS = ["123456", "12345678", "abcdef", "qwerty", "senha", "password", "admin", "cidade360", "usuario", "teste"];

    const ICONES = {
        usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        email: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/>',
        cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
        mapa: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        predio: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>',
        cpf: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><path d="M13 10h5M13 14h3"/>',
        olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        olhoFechado: '<path d="M9.9 4.2A9.6 9.6 0 0 1 12 4c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 11s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/>',
        escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        seta: '<path d="m6 9 6 6 6-6"/>',
        voltar: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
        calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        medalha: '<circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-1.5 8.5 5-3 5 3-1.5-8.5"/>',
        alerta: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
        direita: '<path d="M5 12h14M13 6l6 6-6 6"/>'
    };

    function icone(nome, tamanho = 18) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
    }

    const elementos = {
        pagina: document.getElementById("paginaPerfil"),
        resumo: document.getElementById("resumoPerfil"),
        formDados: document.getElementById("formDados"),
        corpoEmail: document.getElementById("corpoEmail"),
        corpoSenha: document.getElementById("corpoSenha")
    };

    const estado = {
        usuario: null,
        resumoPontos: null,
        cidadesAtendidas: [{ nome: "Jaborandi", uf: "SP" }],
        mensagemCidadeIndisponivel: "Essa cidade ainda não está disponível no Cidade360. No momento, atendemos somente Jaborandi-SP.",
        municipios: null,
        dados: { nome: "", telefone: "", uf: "SP", cidade: "" },
        salvandoDados: false,
        focoSemLista: false,
        email: { etapa: "ver", novo: "", enviando: false, reenviarEm: 0, timer: null },
        senha: { etapa: "ver", salvando: false }
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

    function obterToken() {
        return (
            localStorage.getItem("cidade360_token") ||
            sessionStorage.getItem("cidade360_token")
        );
    }

    // Depois de trocar o e-mail o servidor devolve um token novo (o token guarda o e-mail).
    function salvarToken(token) {
        const armazenamento = localStorage.getItem("cidade360_token") ? localStorage : sessionStorage;
        armazenamento.setItem("cidade360_token", token);
    }

    async function chamarApi(caminho, opcoes = {}) {
        const resposta = await fetch(`${API}${caminho}`, {
            method: opcoes.metodo || "GET",
            headers: {
                "Authorization": `Bearer ${obterToken()}`,
                ...(opcoes.corpo ? { "Content-Type": "application/json" } : {})
            },
            body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
            cache: "no-store"
        });

        let dados = null;

        try {
            dados = await resposta.json();
        } catch (error) {
            dados = null;
        }

        return { ok: resposta.ok && dados?.sucesso !== false, status: resposta.status, dados: dados || {} };
    }

    function apenasNumeros(valor) {
        return String(valor || "").replace(/\D/g, "");
    }

    function normalizarNome(valor) {
        return String(valor || "").replace(/\s+/g, " ").trim();
    }

    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function formatarTelefone(valor) {
        const n = apenasNumeros(valor).slice(0, 11);
        if (n.length <= 2) return n ? `(${n}` : "";
        if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
        if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
        return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    }

    function mascararCpf(cpf) {
        const n = apenasNumeros(cpf);
        if (n.length !== 11) return "Não informado";
        return `***.${n.slice(3, 6)}.${n.slice(6, 9)}-**`;
    }

    function iniciais(nome) {
        const partes = normalizarNome(nome).split(" ").filter(Boolean);
        if (!partes.length) return "U";
        const primeira = partes[0][0];
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
        return (primeira + ultima).toUpperCase();
    }

    function mesAno(data) {
        const d = new Date(data);
        if (Number.isNaN(d.getTime())) return "";
        const texto = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function ehAdmin() {
        return estado.usuario?.tipo_usuario === "ADMIN";
    }

    function validarEmail(email) {
        const valor = String(email || "").trim().toLowerCase();
        return valor.length <= 150 && !/\s/.test(valor) && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(valor);
    }

    function senhaBloqueada(senha) {
        const valor = senha.toLowerCase();
        return SENHAS_BLOQUEADAS.some((item) => valor.includes(item));
    }

    function senhaForte(senha) {
        return !/\s/.test(senha) && REGRAS_SENHA.every((regra) => regra.teste(senha)) && !senhaBloqueada(senha);
    }

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
            <span class="ok" ${tipo === "erro" ? 'style="background:var(--danger)"' : ""}>${icone(tipo === "erro" ? "x" : "check", 14)}</span>
            <span>${escaparHtml(mensagem)}</span>
        `;

        pilha.appendChild(item);

        setTimeout(() => {
            item.classList.add("saindo");
            setTimeout(() => item.remove(), 300);
        }, tipo === "erro" ? 5000 : 3600);
    }

    // Topo, menu do perfil e armazenamento local ficam com os dados novos.
    function atualizarUsuarioNaPagina(usuario) {
        estado.usuario = { ...estado.usuario, ...usuario };
        window.usuarioLogado = { ...(window.usuarioLogado || {}), ...usuario };

        if (typeof window.salvarUsuarioAtual === "function") {
            window.salvarUsuarioAtual(window.usuarioLogado);
        }

        if (typeof window.atualizarUsuarioNoTopo === "function") {
            window.atualizarUsuarioNoTopo(window.usuarioLogado);
        }

        window.dispatchEvent(new CustomEvent("cidade360:usuario-carregado", { detail: window.usuarioLogado }));
    }

    function mostrarErroCampo(id, mensagem) {
        const campo = document.getElementById(id);
        const erro = document.getElementById(`${id}Erro`);

        if (campo) {
            campo.classList.toggle("com-erro", Boolean(mensagem));
            campo.setAttribute("aria-invalid", mensagem ? "true" : "false");
        }

        if (erro) {
            erro.textContent = mensagem || "";
            erro.hidden = !mensagem;
        }
    }

    function limparErros(container) {
        container.querySelectorAll(".com-erro").forEach((campo) => {
            campo.classList.remove("com-erro");
            campo.setAttribute("aria-invalid", "false");
        });

        container.querySelectorAll(".erro-campo").forEach((erro) => {
            erro.textContent = "";
            erro.hidden = true;
        });
    }

    function botaoCarregando(botao, carregando, texto) {
        if (!botao) return;
        botao.disabled = carregando;
        if (carregando) {
            botao.dataset.textoOriginal = botao.innerHTML;
            botao.innerHTML = `<span class="rodinha" aria-hidden="true"></span>${escaparHtml(texto)}`;
        } else if (botao.dataset.textoOriginal) {
            botao.innerHTML = botao.dataset.textoOriginal;
        }
    }

    function campoHtml({ id, rotulo, iconeNome, tipo = "text", valor = "", placeholder = "", max = 150, extra = "", senha = false, dica = "" }) {
        return `
            <div class="campo-perfil">
                <label for="${id}">${escaparHtml(rotulo)}</label>
                <div class="entrada-perfil">
                    ${icone(iconeNome)}
                    <input type="${tipo}" id="${id}" value="${escaparHtml(valor)}" placeholder="${escaparHtml(placeholder)}" maxlength="${max}" aria-describedby="${id}Erro" ${extra}>
                    ${senha ? `<button type="button" class="btn-olho" data-olho="${id}" aria-label="Mostrar senha">${icone("olho")}</button>` : ""}
                </div>
                ${dica ? `<small class="dica-perfil">${dica}</small>` : ""}
                <small class="erro-campo" id="${id}Erro" role="alert" hidden></small>
            </div>
        `;
    }


    /*---------------------------------------------------------------
      CIDADES
    ---------------------------------------------------------------*/

    async function carregarCidadesAtendidas() {
        try {
            const resposta = await fetch(`${API}/cidade-atendida`);
            const dados = await resposta.json();

            if (resposta.ok && dados.sucesso && Array.isArray(dados.cidades) && dados.cidades.length) {
                estado.cidadesAtendidas = dados.cidades.map((cidade) => ({ nome: cidade.nome, uf: cidade.uf }));

                if (dados.mensagem_indisponivel) {
                    estado.mensagemCidadeIndisponivel = dados.mensagem_indisponivel;
                }
            }
        } catch (error) {
            console.warn("Não foi possível carregar as cidades atendidas:", error);
        }
    }

    async function carregarMunicipios() {
        if (estado.municipios) return estado.municipios;

        try {
            const resposta = await fetch(LISTA_MUNICIPIOS);
            if (!resposta.ok) throw new Error("Lista de cidades indisponível");
            estado.municipios = await resposta.json();
        } catch (error) {
            console.warn("Não foi possível carregar a lista de cidades:", error);
        }

        return estado.municipios;
    }

    function cidadesDoEstado(uf) {
        if (estado.municipios && Array.isArray(estado.municipios[uf])) {
            return estado.municipios[uf];
        }

        return estado.cidadesAtendidas.filter((cidade) => cidade.uf === uf).map((cidade) => cidade.nome);
    }

    function cidadeEhAtendida(nome, uf) {
        return estado.cidadesAtendidas.some((cidade) => cidade.uf === uf && normalizarTexto(cidade.nome) === normalizarTexto(nome));
    }

    function nomeOficialCidade(nome, uf) {
        return cidadesDoEstado(uf).find((cidade) => normalizarTexto(cidade) === normalizarTexto(nome)) || "";
    }


    /*---------------------------------------------------------------
      RESUMO (faixa colorida no topo)
    ---------------------------------------------------------------*/

    function renderizarResumo() {
        const u = estado.usuario;
        const nome = normalizarNome(u.nome) || "Usuário";
        const cidade = !ehAdmin() && u.cidade ? `${u.cidade}-${u.uf}` : "";
        const desde = mesAno(u.data_cadastro);
        const titulo = estado.resumoPontos?.titulo;

        elementos.resumo.innerHTML = `
            <div class="resumo-identidade">
                <div class="avatar-perfil" aria-hidden="true">${escaparHtml(iniciais(nome))}</div>

                <div class="resumo-textos">
                    <span class="rotulo">${ehAdmin() ? "Administrador da prefeitura" : "Cidadão"}</span>
                    <strong class="nome-resumo">${escaparHtml(nome)}</strong>
                    <span class="email-resumo">${escaparHtml(u.email || "")}</span>

                    <div class="chips-resumo">
                        ${cidade ? `<span class="chip-resumo">${icone("mapa", 14)}${escaparHtml(cidade)}</span>` : ""}
                        ${desde ? `<span class="chip-resumo">${icone("calendario", 14)}Desde ${escaparHtml(desde)}</span>` : ""}
                    </div>
                </div>
            </div>

            ${!ehAdmin() && estado.resumoPontos ? `
            <a class="resumo-pontos" href="${PAGINA_PONTOS}">
                <span class="medalha-perfil ${titulo ? "" : "vazia"}">${icone("medalha", 26)}</span>
                <span class="dados-pontos">
                    <small>${titulo ? "Seu título" : "Seus pontos"}</small>
                    <strong>${escaparHtml(titulo?.nome || `${estado.resumoPontos.saldo || 0} pontos`)}</strong>
                    <em>${titulo ? `${estado.resumoPontos.saldo} pontos · ` : ""}Ver meus pontos ${icone("direita", 14)}</em>
                </span>
            </a>` : ""}
        `;
    }


    /*---------------------------------------------------------------
      DADOS PESSOAIS
    ---------------------------------------------------------------*/

    function dadosOriginais() {
        const u = estado.usuario;
        return {
            nome: normalizarNome(u.nome),
            telefone: apenasNumeros(u.telefone),
            uf: u.uf || "SP",
            cidade: u.cidade || ""
        };
    }

    function dadosMudaram() {
        const original = dadosOriginais();
        const atual = estado.dados;

        return (
            normalizarNome(atual.nome) !== original.nome ||
            apenasNumeros(atual.telefone) !== original.telefone ||
            (!ehAdmin() && (
                atual.uf !== original.uf ||
                normalizarTexto(atual.cidade) !== normalizarTexto(original.cidade)
            ))
        );
    }

    function renderizarDados() {
        const d = estado.dados;

        const legenda = document.getElementById("legendaDados");
        if (legenda) {
            legenda.textContent = ehAdmin() ? "Como você aparece para a equipe e para os cidadãos." : "Como você aparece no Cidade360 e onde mora.";
        }

        elementos.formDados.innerHTML = `
            ${campoHtml({ id: "nomePerfil", rotulo: "Nome completo", iconeNome: "usuario", valor: d.nome, placeholder: "Digite seu nome completo", max: 80, extra: 'autocomplete="name"' })}

            ${campoHtml({ id: "telefonePerfil", rotulo: "Telefone", iconeNome: "telefone", valor: formatarTelefone(d.telefone), placeholder: "(16) 99999-9999", max: 15, extra: 'inputmode="tel" autocomplete="tel"' })}

            ${ehAdmin() ? "" : `
            <div class="linha-cidade">
                <div class="campo-perfil campo-uf">
                    <label for="ufPerfil">Estado</label>
                    <div class="entrada-perfil">
                        ${icone("mapa")}
                        <select id="ufPerfil" autocomplete="address-level1">
                            ${ESTADOS_BRASIL.map(([uf, nome]) => `<option value="${uf}" title="${nome}" ${uf === d.uf ? "selected" : ""}>${uf}</option>`).join("")}
                        </select>
                        <span class="seta-select">${icone("seta", 16)}</span>
                    </div>
                </div>

                <div class="campo-perfil campo-cidade">
                    <label for="cidadePerfil">Cidade</label>
                    <div class="entrada-perfil">
                        ${icone("predio")}
                        <input type="text" id="cidadePerfil" value="${escaparHtml(d.cidade)}" placeholder="Digite sua cidade" maxlength="80" autocomplete="off"
                            role="combobox" aria-expanded="false" aria-controls="listaCidadesPerfil" aria-autocomplete="list" aria-describedby="cidadePerfilErro">
                    </div>
                    <ul class="lista-cidades-perfil" id="listaCidadesPerfil" role="listbox" hidden></ul>
                    <small class="erro-campo" id="cidadePerfilErro" role="alert" hidden></small>
                </div>
            </div>

            <div class="aviso-cidade-perfil" id="avisoCidadePerfil" hidden></div>`}

            <div class="campo-perfil">
                <label for="cpfPerfil">CPF</label>
                <div class="entrada-perfil bloqueada">
                    ${icone("cpf")}
                    <input type="text" id="cpfPerfil" value="${escaparHtml(estado.usuario.cpf_mascarado || mascararCpf(estado.usuario.cpf))}" readonly aria-describedby="cpfPerfilDica">
                    <span class="cadeado-campo" title="Não pode ser alterado">${icone("cadeado", 16)}</span>
                </div>
                <small class="dica-perfil" id="cpfPerfilDica">O CPF identifica sua conta e não pode ser alterado. Se estiver errado, procure a prefeitura.</small>
            </div>

            <div class="rodape-form">
                <span class="status-form" id="statusDados" aria-live="polite"></span>
                <div class="botoes-form">
                    <button type="button" class="btn-secundario" id="btnDesfazerDados" disabled>Desfazer</button>
                    <button type="submit" class="btn-primario" id="btnSalvarDados" disabled>${icone("check", 18)}Salvar alterações</button>
                </div>
            </div>
        `;

        atualizarAvisoCidade();
        atualizarBotoesDados();
    }

    function atualizarBotoesDados() {
        const mudou = dadosMudaram();
        const salvar = document.getElementById("btnSalvarDados");
        const desfazer = document.getElementById("btnDesfazerDados");
        const status = document.getElementById("statusDados");

        if (salvar && !estado.salvandoDados) salvar.disabled = !mudou;
        if (desfazer) desfazer.disabled = !mudou || estado.salvandoDados;
        if (status) status.textContent = mudou ? "Você tem alterações não salvas." : "";
    }

    function atualizarAvisoCidade() {
        const aviso = document.getElementById("avisoCidadePerfil");
        if (!aviso) return;

        const { cidade, uf } = estado.dados;
        const oficial = nomeOficialCidade(cidade, uf);

        if (!normalizarNome(cidade) || !oficial) {
            aviso.hidden = true;
            return;
        }

        const atendida = cidadeEhAtendida(oficial, uf);
        aviso.hidden = false;
        aviso.dataset.tipo = atendida ? "ok" : "erro";
        aviso.innerHTML = atendida
            ? `${icone("check", 16)}<span>${escaparHtml(oficial)}-${uf} é atendida pelo Cidade360.</span>`
            : `${icone("alerta", 16)}<span>${escaparHtml(estado.mensagemCidadeIndisponivel)} Sua conta continua em ${escaparHtml(estado.usuario.cidade || "Jaborandi")}-${escaparHtml(estado.usuario.uf || "SP")}.</span>`;
    }

    function renderizarListaCidades() {
        const lista = document.getElementById("listaCidadesPerfil");
        const input = document.getElementById("cidadePerfil");
        if (!lista || !input) return;

        const termo = normalizarTexto(input.value);
        const uf = estado.dados.uf;
        const atendidas = estado.cidadesAtendidas.filter((cidade) => cidade.uf === uf).map((cidade) => cidade.nome);

        let cidades = cidadesDoEstado(uf).filter((nome) => !termo || normalizarTexto(nome).includes(termo));

        // Cidades atendidas sempre aparecem primeiro.
        cidades.sort((a, b) => {
            const aAtendida = atendidas.includes(a) ? 0 : 1;
            const bAtendida = atendidas.includes(b) ? 0 : 1;
            if (aAtendida !== bAtendida) return aAtendida - bAtendida;
            const aComeca = normalizarTexto(a).startsWith(termo) ? 0 : 1;
            const bComeca = normalizarTexto(b).startsWith(termo) ? 0 : 1;
            return aComeca - bComeca || a.localeCompare(b, "pt-BR");
        });

        cidades = cidades.slice(0, MAXIMO_CIDADES_LISTA);

        lista.innerHTML = cidades.length
            ? cidades.map((nome, indice) => `
                <li role="option" id="opcaoCidade${indice}" data-cidade="${escaparHtml(nome)}" aria-selected="false">
                    <span>${escaparHtml(nome)}</span>
                    ${atendidas.includes(nome) ? '<small class="atendida">Atendida</small>' : "<small>Ainda não atendida</small>"}
                </li>`).join("")
            : `<li class="vazio">Nenhuma cidade encontrada em ${uf}</li>`;

        lista.hidden = false;
        input.setAttribute("aria-expanded", "true");
    }

    function fecharListaCidades() {
        const lista = document.getElementById("listaCidadesPerfil");
        const input = document.getElementById("cidadePerfil");
        if (lista) lista.hidden = true;
        if (input) input.setAttribute("aria-expanded", "false");
    }

    function escolherCidade(nome) {
        const input = document.getElementById("cidadePerfil");
        estado.dados.cidade = nome;
        if (input) input.value = nome;
        fecharListaCidades();
        mostrarErroCampo("cidadePerfil", "");
        atualizarAvisoCidade();
        atualizarBotoesDados();
    }

    function validarDados() {
        const d = estado.dados;
        let valido = true;

        limparErros(elementos.formDados);

        const nome = normalizarNome(d.nome);
        if (nome.length < 3 || nome.length > 80) {
            mostrarErroCampo("nomePerfil", "Digite seu nome completo (pelo menos 3 letras).");
            valido = false;
        }

        const telefone = apenasNumeros(d.telefone);
        if (telefone.length !== 10 && telefone.length !== 11) {
            mostrarErroCampo("telefonePerfil", "Digite o telefone com DDD. Ex.: (16) 99999-9999.");
            valido = false;
        }

        // Administrador não tem cidade no perfil (a trava de cidade é só para o cidadão).
        if (ehAdmin()) {
            return valido;
        }

        const oficial = nomeOficialCidade(d.cidade, d.uf);
        if (!oficial) {
            mostrarErroCampo("cidadePerfil", "Escolha a cidade na lista.");
            valido = false;
        } else if (!cidadeEhAtendida(oficial, d.uf)) {
            mostrarErroCampo("cidadePerfil", "Escolha uma cidade atendida pelo Cidade360.");
            valido = false;
        }

        return valido;
    }

    async function salvarDados(event) {
        event.preventDefault();

        if (!dadosMudaram() || estado.salvandoDados || !validarDados()) {
            estado.focoSemLista = true;
            elementos.formDados.querySelector(".com-erro")?.focus();
            estado.focoSemLista = false;
            return;
        }

        const botao = document.getElementById("btnSalvarDados");
        const d = estado.dados;

        estado.salvandoDados = true;
        botaoCarregando(botao, true, "Salvando...");
        atualizarBotoesDados();

        try {
            const { ok, dados } = await chamarApi("/perfil/dados", {
                metodo: "PUT",
                corpo: {
                    nome: normalizarNome(d.nome),
                    telefone: apenasNumeros(d.telefone),
                    ...(ehAdmin() ? {} : { uf: d.uf, cidade: nomeOficialCidade(d.cidade, d.uf) })
                }
            });

            if (!ok) {
                if (dados.campo) {
                    mostrarErroCampo(`${dados.campo}Perfil`, dados.mensagem);
                }
                toast(dados.mensagem || "Não foi possível salvar. Tente de novo.", "erro");
                return;
            }

            atualizarUsuarioNaPagina(dados.usuario);
            estado.dados = dadosOriginais();
            renderizarResumo();
            renderizarDados();
            toast(dados.mensagem || "Dados atualizados.");
        } catch (error) {
            toast("Sem conexão com o servidor. Tente de novo.", "erro");
        } finally {
            estado.salvandoDados = false;
            botaoCarregando(document.getElementById("btnSalvarDados"), false);
            atualizarBotoesDados();
        }
    }

    function ligarEventosDados() {
        const form = elementos.formDados;

        form.addEventListener("submit", salvarDados);

        form.addEventListener("input", (event) => {
            const alvo = event.target;

            if (alvo.id === "nomePerfil") {
                estado.dados.nome = alvo.value;
            }

            if (alvo.id === "telefonePerfil") {
                alvo.value = formatarTelefone(alvo.value);
                estado.dados.telefone = apenasNumeros(alvo.value);
            }

            if (alvo.id === "cidadePerfil") {
                estado.dados.cidade = alvo.value;
                renderizarListaCidades();
                atualizarAvisoCidade();
            }

            mostrarErroCampo(alvo.id, "");
            atualizarBotoesDados();
        });

        form.addEventListener("change", (event) => {
            if (event.target.id === "ufPerfil") {
                estado.dados.uf = event.target.value;
                estado.dados.cidade = "";
                const input = document.getElementById("cidadePerfil");
                if (input) {
                    input.value = "";
                    input.focus();
                }
                renderizarListaCidades();
                atualizarAvisoCidade();
                atualizarBotoesDados();
            }
        });

        form.addEventListener("focusin", (event) => {
            if (event.target.id === "cidadePerfil" && !estado.focoSemLista) {
                carregarMunicipios().then(renderizarListaCidades);
            }
        });

        form.addEventListener("focusout", (event) => {
            if (event.target.id === "cidadePerfil") {
                // Espera o clique na lista acontecer antes de fechar.
                setTimeout(() => {
                    fecharListaCidades();
                    const oficial = nomeOficialCidade(estado.dados.cidade, estado.dados.uf);
                    if (oficial) escolherCidade(oficial);
                }, 150);
            }
        });

        form.addEventListener("mousedown", (event) => {
            const opcao = event.target.closest("[data-cidade]");
            if (opcao) {
                event.preventDefault();
                escolherCidade(opcao.dataset.cidade);
            }
        });

        form.addEventListener("keydown", (event) => {
            if (event.target.id !== "cidadePerfil") return;

            const lista = document.getElementById("listaCidadesPerfil");
            const opcoes = [...lista.querySelectorAll("[data-cidade]")];
            if (lista.hidden || !opcoes.length) return;

            const atual = opcoes.findIndex((opcao) => opcao.getAttribute("aria-selected") === "true");

            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const proxima = event.key === "ArrowDown"
                    ? Math.min(atual + 1, opcoes.length - 1)
                    : Math.max(atual - 1, 0);
                opcoes.forEach((opcao, i) => opcao.setAttribute("aria-selected", String(i === proxima)));
                event.target.setAttribute("aria-activedescendant", opcoes[proxima].id);
                opcoes[proxima].scrollIntoView({ block: "nearest" });
            }

            if (event.key === "Enter" && atual >= 0) {
                event.preventDefault();
                escolherCidade(opcoes[atual].dataset.cidade);
            }

            if (event.key === "Escape") {
                fecharListaCidades();
            }
        });

        form.addEventListener("click", (event) => {
            if (event.target.closest("#btnDesfazerDados")) {
                estado.dados = dadosOriginais();
                renderizarDados();
            }
        });
    }


    /*---------------------------------------------------------------
      E-MAIL
    ---------------------------------------------------------------*/

    function renderizarEmail() {
        const e = estado.email;
        const corpo = elementos.corpoEmail;

        if (e.etapa === "ver") {
            corpo.innerHTML = `
                <div class="linha-valor">
                    <div class="valor-atual">
                        <strong>${escaparHtml(estado.usuario.email)}</strong>
                        <span class="selo-ok">${icone("escudo", 14)}Confirmado</span>
                    </div>
                    <button type="button" class="btn-secundario btn-pequeno" data-acao="email-abrir">Trocar e-mail</button>
                </div>
            `;
            return;
        }

        if (e.etapa === "novo") {
            corpo.innerHTML = `
                <form class="form-seguranca" id="formEmail" novalidate>
                    ${campoHtml({ id: "novoEmailPerfil", rotulo: "Novo e-mail", iconeNome: "email", tipo: "email", valor: e.novo, placeholder: "seuemail@exemplo.com", max: 150, extra: 'autocomplete="email" inputmode="email"' })}
                    ${campoHtml({ id: "senhaEmailPerfil", rotulo: "Sua senha atual", iconeNome: "cadeado", tipo: "password", placeholder: "Para confirmar que é você", max: 72, senha: true, extra: 'autocomplete="current-password"' })}

                    <p class="explicacao">Vamos mandar um código de 6 dígitos para o e-mail novo. A troca só vale depois que você digitar o código.</p>

                    <div class="botoes-form">
                        <button type="button" class="btn-secundario" data-acao="email-cancelar">Cancelar</button>
                        <button type="submit" class="btn-primario">Enviar código</button>
                    </div>
                </form>
            `;
            document.getElementById("novoEmailPerfil")?.focus();
            return;
        }

        if (e.etapa === "codigo") {
            corpo.innerHTML = `
                <form class="form-seguranca" id="formCodigoEmail" novalidate>
                    <div class="passo-codigo">
                        <span class="icone-envio">${icone("email", 22)}</span>
                        <p>Enviamos um código para <b>${escaparHtml(e.novo)}</b>. Ele vale por 15 minutos.</p>
                    </div>

                    <div class="campo-perfil">
                        <label for="codigoEmailPerfil">Código de 6 dígitos</label>
                        <input class="entrada-codigo" type="text" id="codigoEmailPerfil" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-describedby="codigoEmailPerfilErro">
                        <small class="erro-campo" id="codigoEmailPerfilErro" role="alert" hidden></small>
                    </div>

                    <p class="explicacao">Não chegou? Olhe a caixa de spam ou
                        <button type="button" class="link-perfil" data-acao="email-reenviar" id="btnReenviarCodigo">reenvie o código</button>.
                    </p>

                    <div class="botoes-form">
                        <button type="button" class="btn-secundario" data-acao="email-voltar">${icone("voltar", 16)}Voltar</button>
                        <button type="submit" class="btn-primario">Confirmar troca</button>
                    </div>
                </form>
            `;
            atualizarReenvio();
            document.getElementById("codigoEmailPerfil")?.focus();
        }
    }

    function iniciarContagemReenvio() {
        clearInterval(estado.email.timer);
        estado.email.reenviarEm = ESPERA_REENVIO_SEGUNDOS;
        atualizarReenvio();

        estado.email.timer = setInterval(() => {
            estado.email.reenviarEm -= 1;
            atualizarReenvio();
            if (estado.email.reenviarEm <= 0) clearInterval(estado.email.timer);
        }, 1000);
    }

    function atualizarReenvio() {
        const botao = document.getElementById("btnReenviarCodigo");
        if (!botao) return;
        const espera = estado.email.reenviarEm;
        botao.disabled = espera > 0;
        botao.textContent = espera > 0 ? `reenvie em ${espera}s` : "reenvie o código";
    }

    async function enviarCodigoEmail({ reenvio = false } = {}) {
        const e = estado.email;
        const form = document.getElementById(reenvio ? "formCodigoEmail" : "formEmail");
        const senhaInput = document.getElementById("senhaEmailPerfil");

        if (!reenvio) {
            limparErros(form);
            e.novo = String(document.getElementById("novoEmailPerfil").value || "").trim().toLowerCase();
            e.senhaAtual = senhaInput.value;

            let valido = true;

            if (!validarEmail(e.novo)) {
                mostrarErroCampo("novoEmailPerfil", "Digite um e-mail válido.");
                valido = false;
            } else if (e.novo === String(estado.usuario.email).toLowerCase()) {
                mostrarErroCampo("novoEmailPerfil", "Esse já é o seu e-mail atual.");
                valido = false;
            }

            if (!e.senhaAtual) {
                mostrarErroCampo("senhaEmailPerfil", "Digite sua senha atual.");
                valido = false;
            }

            if (!valido) {
                form.querySelector(".com-erro")?.focus();
                return;
            }
        }

        if (e.enviando) return;
        e.enviando = true;

        const botao = reenvio ? document.getElementById("btnReenviarCodigo") : form.querySelector('button[type="submit"]');
        botaoCarregando(botao, true, "Enviando...");

        try {
            const { ok, dados } = await chamarApi("/perfil/email/enviar-codigo", {
                metodo: "POST",
                corpo: { email: e.novo, senha_atual: e.senhaAtual }
            });

            if (!ok) {
                if (!reenvio && dados.campo === "senha_atual") {
                    mostrarErroCampo("senhaEmailPerfil", dados.mensagem);
                } else if (!reenvio && dados.campo === "email") {
                    mostrarErroCampo("novoEmailPerfil", dados.mensagem);
                } else {
                    toast(dados.mensagem || "Não foi possível enviar o código.", "erro");
                }
                return;
            }

            e.bilhete = dados.bilhete;

            if (reenvio) {
                toast("Código reenviado.");
            } else {
                e.etapa = "codigo";
                renderizarEmail();
            }

            iniciarContagemReenvio();
        } catch (error) {
            toast("Sem conexão com o servidor. Tente de novo.", "erro");
        } finally {
            e.enviando = false;
            botaoCarregando(botao, false);
            atualizarReenvio();
        }
    }

    async function confirmarCodigoEmail() {
        const e = estado.email;
        const form = document.getElementById("formCodigoEmail");
        const codigo = apenasNumeros(document.getElementById("codigoEmailPerfil").value);

        limparErros(form);

        if (codigo.length !== 6) {
            mostrarErroCampo("codigoEmailPerfil", "O código tem 6 números.");
            document.getElementById("codigoEmailPerfil").focus();
            return;
        }

        if (e.enviando) return;
        e.enviando = true;

        const botao = form.querySelector('button[type="submit"]');
        botaoCarregando(botao, true, "Confirmando...");

        try {
            const { ok, dados } = await chamarApi("/perfil/email/confirmar", {
                metodo: "POST",
                corpo: { email: e.novo, codigo, bilhete: e.bilhete }
            });

            if (!ok) {
                if (dados.campo === "codigo" || !dados.campo) {
                    mostrarErroCampo("codigoEmailPerfil", dados.mensagem || "Código inválido ou expirado.");
                } else {
                    toast(dados.mensagem || "Não foi possível trocar o e-mail.", "erro");
                }
                return;
            }

            if (dados.token) salvarToken(dados.token);

            atualizarUsuarioNaPagina(dados.usuario || { email: e.novo });
            fecharEmail();
            renderizarResumo();
            toast(dados.mensagem || "E-mail trocado. Avisamos o e-mail antigo também.");
        } catch (error) {
            toast("Sem conexão com o servidor. Tente de novo.", "erro");
        } finally {
            e.enviando = false;
            botaoCarregando(botao, false);
        }
    }

    function fecharEmail() {
        clearInterval(estado.email.timer);
        estado.email = { etapa: "ver", novo: "", enviando: false, reenviarEm: 0, timer: null };
        renderizarEmail();
    }

    function ligarEventosEmail() {
        const corpo = elementos.corpoEmail;

        corpo.addEventListener("click", (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "email-abrir") {
                estado.email.etapa = "novo";
                renderizarEmail();
            }

            if (acao === "email-cancelar") fecharEmail();

            if (acao === "email-voltar") {
                clearInterval(estado.email.timer);
                estado.email.etapa = "novo";
                renderizarEmail();
            }

            if (acao === "email-reenviar") enviarCodigoEmail({ reenvio: true });
        });

        corpo.addEventListener("submit", (event) => {
            event.preventDefault();
            if (event.target.id === "formEmail") enviarCodigoEmail();
            if (event.target.id === "formCodigoEmail") confirmarCodigoEmail();
        });

        corpo.addEventListener("input", (event) => {
            if (event.target.id === "codigoEmailPerfil") {
                event.target.value = apenasNumeros(event.target.value).slice(0, 6);
            }
            mostrarErroCampo(event.target.id, "");
        });
    }


    /*---------------------------------------------------------------
      SENHA
    ---------------------------------------------------------------*/

    function renderizarSenha() {
        const corpo = elementos.corpoSenha;

        if (estado.senha.etapa === "ver") {
            corpo.innerHTML = `
                <div class="linha-valor">
                    <div class="valor-atual">
                        <strong class="senha-oculta" aria-label="Senha escondida">••••••••••</strong>
                    </div>
                    <button type="button" class="btn-secundario btn-pequeno" data-acao="senha-abrir">Trocar senha</button>
                </div>
            `;
            return;
        }

        corpo.innerHTML = `
            <form class="form-seguranca" id="formSenha" novalidate>
                ${campoHtml({ id: "senhaAtualPerfil", rotulo: "Senha atual", iconeNome: "cadeado", tipo: "password", placeholder: "Digite sua senha atual", max: 72, senha: true, extra: 'autocomplete="current-password"' })}
                ${campoHtml({ id: "novaSenhaPerfil", rotulo: "Nova senha", iconeNome: "cadeado", tipo: "password", placeholder: "Crie uma senha forte", max: 72, senha: true, extra: 'autocomplete="new-password"' })}

                <ul class="regras-senha" id="regrasSenhaPerfil" aria-label="A senha precisa ter">
                    ${REGRAS_SENHA.map((regra) => `<li data-regra="${regra.chave}">${icone("check", 13)}${regra.texto}</li>`).join("")}
                </ul>

                ${campoHtml({ id: "confirmarSenhaPerfil", rotulo: "Confirme a nova senha", iconeNome: "cadeado", tipo: "password", placeholder: "Digite a nova senha de novo", max: 72, senha: true, extra: 'autocomplete="new-password"' })}

                <div class="botoes-form">
                    <button type="button" class="btn-secundario" data-acao="senha-cancelar">Cancelar</button>
                    <button type="submit" class="btn-primario">Salvar nova senha</button>
                </div>
            </form>
        `;

        document.getElementById("senhaAtualPerfil")?.focus();
    }

    function atualizarRegrasSenha() {
        const senha = document.getElementById("novaSenhaPerfil")?.value || "";
        REGRAS_SENHA.forEach((regra) => {
            document.querySelector(`#regrasSenhaPerfil [data-regra="${regra.chave}"]`)
                ?.classList.toggle("cumprida", regra.teste(senha));
        });
    }

    async function salvarSenha() {
        const form = document.getElementById("formSenha");
        const atual = document.getElementById("senhaAtualPerfil").value;
        const nova = document.getElementById("novaSenhaPerfil").value;
        const confirmar = document.getElementById("confirmarSenhaPerfil").value;
        let valido = true;

        limparErros(form);

        if (!atual) {
            mostrarErroCampo("senhaAtualPerfil", "Digite sua senha atual.");
            valido = false;
        }

        if (!senhaForte(nova)) {
            mostrarErroCampo("novaSenhaPerfil", senhaBloqueada(nova)
                ? "Essa senha é fácil de adivinhar. Evite palavras como \"senha\" ou \"123456\"."
                : "A senha ainda não cumpre todas as regras abaixo.");
            valido = false;
        } else if (nova === atual) {
            mostrarErroCampo("novaSenhaPerfil", "A nova senha precisa ser diferente da atual.");
            valido = false;
        }

        if (confirmar !== nova) {
            mostrarErroCampo("confirmarSenhaPerfil", "As senhas não são iguais.");
            valido = false;
        }

        if (!valido || estado.senha.salvando) {
            form.querySelector(".com-erro")?.focus();
            return;
        }

        estado.senha.salvando = true;
        const botao = form.querySelector('button[type="submit"]');
        botaoCarregando(botao, true, "Salvando...");

        try {
            const { ok, dados } = await chamarApi("/perfil/senha", {
                metodo: "PUT",
                corpo: { senha_atual: atual, nova_senha: nova, confirmar_senha: confirmar }
            });

            if (!ok) {
                const campo = { senha_atual: "senhaAtualPerfil", nova_senha: "novaSenhaPerfil", confirmar_senha: "confirmarSenhaPerfil" }[dados.campo];
                if (campo) mostrarErroCampo(campo, dados.mensagem);
                else toast(dados.mensagem || "Não foi possível trocar a senha.", "erro");
                return;
            }

            estado.senha.etapa = "ver";
            renderizarSenha();
            toast(dados.mensagem || "Senha alterada. Mandamos um aviso para o seu e-mail.");
        } catch (error) {
            toast("Sem conexão com o servidor. Tente de novo.", "erro");
        } finally {
            estado.senha.salvando = false;
            botaoCarregando(botao, false);
        }
    }

    function ligarEventosSenha() {
        const corpo = elementos.corpoSenha;

        corpo.addEventListener("click", (event) => {
            const acao = event.target.closest("[data-acao]")?.dataset.acao;

            if (acao === "senha-abrir") {
                estado.senha.etapa = "editar";
                renderizarSenha();
            }

            if (acao === "senha-cancelar") {
                estado.senha.etapa = "ver";
                renderizarSenha();
            }
        });

        corpo.addEventListener("submit", (event) => {
            event.preventDefault();
            salvarSenha();
        });

        corpo.addEventListener("input", (event) => {
            if (event.target.id === "novaSenhaPerfil") atualizarRegrasSenha();
            mostrarErroCampo(event.target.id, "");
        });
    }

    // Olho de mostrar/esconder senha (vale para todos os campos de senha da página).
    function ligarOlhos() {
        elementos.pagina.addEventListener("click", (event) => {
            const botao = event.target.closest("[data-olho]");
            if (!botao) return;

            const input = document.getElementById(botao.dataset.olho);
            const mostrar = input.type === "password";
            input.type = mostrar ? "text" : "password";
            botao.innerHTML = icone(mostrar ? "olhoFechado" : "olho");
            botao.setAttribute("aria-label", mostrar ? "Esconder senha" : "Mostrar senha");
        });
    }


    /*---------------------------------------------------------------
      CARREGAMENTO
    ---------------------------------------------------------------*/

    function renderizarErroCarregamento() {
        elementos.resumo.innerHTML = `
            <div class="erro-carregar">
                ${icone("alerta", 26)}
                <strong>Não foi possível carregar seu perfil</strong>
                <span>Verifique sua conexão e <button type="button" class="link-perfil claro" id="btnTentarPerfil">tente de novo</button>.</span>
            </div>
        `;
        document.querySelector(".perfil-grade").hidden = true;
        document.getElementById("btnTentarPerfil")?.addEventListener("click", carregarPerfil);
    }

    async function carregarResumoPontos() {
        if (ehAdmin()) return;

        try {
            const { ok, dados } = await chamarApi("/pontos/resumo");
            if (ok) {
                estado.resumoPontos = dados;
                renderizarResumo();
            }
        } catch (error) {
            // Sem pontos o perfil funciona normalmente.
        }
    }

    async function carregarPerfil() {
        elementos.pagina.setAttribute("aria-busy", "true");

        try {
            const [{ ok, dados }] = await Promise.all([
                chamarApi("/perfil"),
                carregarCidadesAtendidas()
            ]);

            if (!ok || !dados.usuario) {
                renderizarErroCarregamento();
                return;
            }

            estado.usuario = dados.usuario;
            estado.dados = dadosOriginais();

            document.querySelector(".perfil-grade").hidden = false;
            renderizarResumo();
            renderizarDados();
            renderizarEmail();
            renderizarSenha();
            carregarResumoPontos();
        } catch (error) {
            renderizarErroCarregamento();
        } finally {
            elementos.pagina.setAttribute("aria-busy", "false");
        }
    }

    function iniciar() {
        if (!elementos.pagina) return;

        document.querySelectorAll("[data-icone]").forEach((span) => {
            span.innerHTML = icone(span.dataset.icone, 20);
        });

        ligarEventosDados();
        ligarEventosEmail();
        ligarEventosSenha();
        ligarOlhos();

        // Sair da página com dados não salvos: o navegador pergunta antes.
        window.addEventListener("beforeunload", (event) => {
            if (estado.usuario && dadosMudaram()) {
                event.preventDefault();
                event.returnValue = "";
            }
        });

        carregarPerfil();
    }

    iniciar();

})();
