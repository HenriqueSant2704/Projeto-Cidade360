/*========================================================================================================

ATIVAR CONVITE DE ADMINISTRADOR

A pessoa recebe o link por e-mail (convite.html?token=...), confere nome e e-mail,
informa CPF e telefone, cria a própria senha e já entra no sistema como administradora.

API pública (a pessoa ainda não tem login; o token do link é a autorização):
- GET  /api/convites-admin/:token
- POST /api/convites-admin/:token/aceitar

=========================================================================================================*/

(() => {

    "use strict";

    const API_CONVITE = "/api/convites-admin";

    const ICONES = {
        cpf: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h3"/></svg>',
        telefone: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
        senha: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
        olho: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
        olhoFechado: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
        erro: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
        ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>'
    };

    const elementos = {
        formulario: document.getElementById("formularioConvite"),
        titulo: document.getElementById("tituloConvite"),
        subtitulo: document.getElementById("subtituloConvite"),
        campos: document.getElementById("camposConvite"),
        mensagem: document.getElementById("mensagemConvite"),
        botoes: document.getElementById("botoesConvite"),
        botao: document.getElementById("btnAtivarConvite"),
        linkLogin: document.getElementById("linkLoginConvite")
    };

    const token =
        new URLSearchParams(window.location.search).get("token") || "";


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

    function apenasNumeros(valor) {
        return String(valor || "").replace(/\D/g, "");
    }

    function formatarCpf(valor) {
        const n = apenasNumeros(valor).slice(0, 11);

        if (n.length <= 3) return n;
        if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
        if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
        return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
    }

    function formatarTelefone(valor) {
        const n = apenasNumeros(valor).slice(0, 11);

        if (n.length <= 2) return n;
        if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
        if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
        return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    }

    function cpfValido(valor) {
        const n = apenasNumeros(valor);

        if (!/^\d{11}$/.test(n) || /^(\d)\1{10}$/.test(n)) {
            return false;
        }

        const digito = (base, peso) => {
            const soma = [...base].reduce((total, numero, i) => total + Number(numero) * (peso - i), 0);
            const resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        };

        return digito(n.slice(0, 9), 10) === Number(n[9]) && digito(n.slice(0, 10), 11) === Number(n[10]);
    }

    // Mesmas regras do cadastro (o servidor confere de novo).
    function problemaNaSenha(senha) {
        if (senha.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
        if (senha.length > 72) return "A senha deve ter no máximo 72 caracteres.";
        if (/\s/.test(senha)) return "A senha não deve conter espaços.";
        if (!/[A-Z]/.test(senha)) return "Use pelo menos uma letra maiúscula na senha.";
        if (!/[a-z]/.test(senha)) return "Use pelo menos uma letra minúscula na senha.";
        if (!/[0-9]/.test(senha)) return "Use pelo menos um número na senha.";
        if (!/[!@#$%&*()_\-+=?.,:;{}[\]^~]/.test(senha)) return "Use pelo menos um caractere especial, como @, # ou !.";

        const bloqueadas = ["123456", "abcdef", "qwerty", "senha", "password", "admin", "cidade360", "usuario", "teste"];

        if (bloqueadas.some((item) => senha.toLowerCase().includes(item))) {
            return "Essa senha é fácil de adivinhar. Evite palavras como \"senha\" ou \"admin\".";
        }

        return "";
    }

    function mostrarMensagem(texto, tipo = "erro") {
        elementos.mensagem.hidden = !texto;
        elementos.mensagem.dataset.tipo = tipo;
        elementos.mensagem.innerHTML = texto
            ? `${tipo === "erro" ? ICONES.erro : ICONES.ok}<span>${escaparHtml(texto)}</span>`
            : "";
    }

    function erroNoCampo(id, texto) {
        const erro = document.getElementById(`erro-${id}`);
        const campo = document.getElementById(id);

        if (erro) {
            erro.textContent = texto;
            erro.hidden = !texto;
        }

        campo?.setAttribute("aria-invalid", texto ? "true" : "false");
    }

    function campoHtml({ id, rotulo, icone, tipo = "text", placeholder = "", extra = "", senha = false }) {
        return `
            <div class="caixa-input">
                <label for="${id}">${rotulo}</label>
                <div class="campo">
                    ${icone}
                    <input type="${tipo}" id="${id}" placeholder="${placeholder}" ${extra} aria-describedby="erro-${id}">
                    ${senha ? `<button type="button" class="olho" data-alvo="${id}" aria-label="Mostrar senha">${ICONES.olho}</button>` : ""}
                </div>
                <span class="erro-input" id="erro-${id}" hidden></span>
            </div>
        `;
    }


    /*---------------------------------------------------------------
      CONVITE INVÁLIDO, VENCIDO OU JÁ USADO
    ---------------------------------------------------------------*/

    function mostrarConviteIndisponivel(mensagem, codigo) {
        elementos.titulo.textContent = codigo === "CONVITE_USADO" ? "Convite já usado" : "Convite indisponível";
        elementos.subtitulo.textContent = "";
        elementos.campos.hidden = true;
        elementos.botoes.hidden = true;
        elementos.linkLogin.hidden = false;
        mostrarMensagem(mensagem || "Esse convite não vale mais. Peça um novo para o administrador.");
    }


    /*---------------------------------------------------------------
      CARREGAR CONVITE
    ---------------------------------------------------------------*/

    async function carregar() {
        if (!/^[a-f0-9]{64}$/.test(token)) {
            mostrarConviteIndisponivel("Convite não encontrado. Confira se abriu o link inteiro do e-mail.");
            return;
        }

        try {
            const resposta = await fetch(`${API_CONVITE}/${token}`, { cache: "no-store" });
            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok || !dados.sucesso) {
                mostrarConviteIndisponivel(dados.mensagem, dados.codigo);
                return;
            }

            mostrarFormulario(dados.convite);

        } catch (error) {
            mostrarConviteIndisponivel("Não foi possível abrir o convite agora. Confira sua internet e tente de novo.");
        }
    }

    function mostrarFormulario(convite) {
        const primeiroNome = String(convite.nome || "").trim().split(/\s+/)[0];

        elementos.titulo.textContent = `Olá, ${primeiroNome}!`;
        elementos.subtitulo.textContent = convite.convidado_por
            ? `${convite.convidado_por} convidou você para administrar o Cidade360. Complete os dados e crie sua senha.`
            : "Você foi convidado para administrar o Cidade360. Complete os dados e crie sua senha.";

        elementos.campos.innerHTML = `
            <div class="dados-convite">
                <div><span>Nome</span><b>${escaparHtml(convite.nome)}</b></div>
                <div><span>E-mail</span><b>${escaparHtml(convite.email)}</b></div>
            </div>

            <div class="linha-convite">
                ${campoHtml({ id: "cpfConvite", rotulo: "CPF", icone: ICONES.cpf, placeholder: "000.000.000-00", extra: 'inputmode="numeric" maxlength="14" autocomplete="off"' })}
                ${campoHtml({ id: "telefoneConvite", rotulo: "Telefone", icone: ICONES.telefone, placeholder: "(16) 90000-0000", extra: 'inputmode="tel" maxlength="15" autocomplete="tel"' })}
            </div>

            ${campoHtml({ id: "senhaConvite", rotulo: "Crie uma senha", icone: ICONES.senha, tipo: "password", placeholder: "Mínimo de 8 caracteres", extra: 'maxlength="72" autocomplete="new-password"', senha: true })}
            ${campoHtml({ id: "confirmarSenhaConvite", rotulo: "Repita a senha", icone: ICONES.senha, tipo: "password", placeholder: "Digite a senha de novo", extra: 'maxlength="72" autocomplete="new-password"', senha: true })}
        `;

        elementos.campos.hidden = false;
        elementos.botoes.hidden = false;

        const cpf = document.getElementById("cpfConvite");
        const telefone = document.getElementById("telefoneConvite");

        cpf.addEventListener("input", () => { cpf.value = formatarCpf(cpf.value); erroNoCampo("cpfConvite", ""); });
        telefone.addEventListener("input", () => { telefone.value = formatarTelefone(telefone.value); erroNoCampo("telefoneConvite", ""); });

        ["senhaConvite", "confirmarSenhaConvite"].forEach((id) => {
            document.getElementById(id).addEventListener("input", () => erroNoCampo(id, ""));
        });

        elementos.campos.querySelectorAll(".olho").forEach((botao) => {
            botao.addEventListener("click", () => {
                const campo = document.getElementById(botao.dataset.alvo);
                const mostrar = campo.type === "password";

                campo.type = mostrar ? "text" : "password";
                botao.innerHTML = mostrar ? ICONES.olhoFechado : ICONES.olho;
                botao.setAttribute("aria-label", mostrar ? "Esconder senha" : "Mostrar senha");
            });
        });

        cpf.focus();
    }


    /*---------------------------------------------------------------
      ATIVAR
    ---------------------------------------------------------------*/

    function validar() {
        const valores = {
            cpf: document.getElementById("cpfConvite").value,
            telefone: document.getElementById("telefoneConvite").value,
            senha: document.getElementById("senhaConvite").value,
            confirmar: document.getElementById("confirmarSenhaConvite").value
        };

        const erros = {
            cpfConvite: cpfValido(valores.cpf) ? "" : "CPF inválido. Confira os números.",
            telefoneConvite: [10, 11].includes(apenasNumeros(valores.telefone).length) ? "" : "Digite o telefone com DDD.",
            senhaConvite: problemaNaSenha(valores.senha),
            confirmarSenhaConvite: valores.confirmar && valores.confirmar === valores.senha ? "" : "As senhas não são iguais."
        };

        Object.entries(erros).forEach(([id, texto]) => erroNoCampo(id, texto));

        const primeiroErro = Object.keys(erros).find((id) => erros[id]);

        if (primeiroErro) {
            document.getElementById(primeiroErro).focus();
            return null;
        }

        return valores;
    }

    function salvarLogin(tokenLogin, usuario) {
        sessionStorage.setItem("cidade360_token", tokenLogin);
        sessionStorage.setItem("cidade360_usuario", JSON.stringify(usuario));

        localStorage.removeItem("cidade360_token");
        localStorage.removeItem("cidade360_usuario");
    }

    elementos.formulario.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (elementos.campos.hidden) {
            return;
        }

        mostrarMensagem("");

        const valores = validar();

        if (!valores) {
            return;
        }

        elementos.botao.disabled = true;
        elementos.botao.textContent = "Ativando...";

        try {
            const resposta = await fetch(`${API_CONVITE}/${token}/aceitar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cpf: valores.cpf,
                    telefone: valores.telefone,
                    senha: valores.senha,
                    confirmar_senha: valores.confirmar
                })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (resposta.status === 404 || resposta.status === 410) {
                mostrarConviteIndisponivel(dados.mensagem, dados.codigo);
                return;
            }

            if (!resposta.ok || !dados.sucesso) {
                const campos = { cpf: "cpfConvite", telefone: "telefoneConvite", senha: "senhaConvite", confirmar_senha: "confirmarSenhaConvite" };

                if (campos[dados.campo]) {
                    erroNoCampo(campos[dados.campo], dados.mensagem);
                    document.getElementById(campos[dados.campo]).focus();
                } else {
                    mostrarMensagem(dados.mensagem || "Não foi possível ativar o acesso agora. Tente de novo.");
                }

                elementos.botao.disabled = false;
                elementos.botao.textContent = "Ativar e entrar";
                return;
            }

            salvarLogin(dados.token, dados.usuario);
            mostrarMensagem("Acesso ativado! Abrindo o Cidade360...", "sucesso");

            setTimeout(() => window.location.replace("/"), 1200);

        } catch (error) {
            mostrarMensagem("Não foi possível ativar o acesso agora. Confira sua internet e tente de novo.");
            elementos.botao.disabled = false;
            elementos.botao.textContent = "Ativar e entrar";
        }
    });

    carregar();

})();
