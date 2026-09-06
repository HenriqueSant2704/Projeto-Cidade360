/*========================================================================================================

AUTH GUARD

Protege páginas privadas.
Se não tiver token ou se o token for inválido, manda para login.

Também atualiza automaticamente no topo:
- Nome do usuário logado
- Tipo do usuário

=========================================================================================================*/

const API_URL_AUTH = "/api";
const LOGIN_PAGE_AUTH = "/FrontEnd/pages/login/login.html";

document.documentElement.style.visibility = "hidden";

let verificacaoAcessoEmAndamento = false;

verificarAcesso();

window.addEventListener("pageshow", () => {
    verificarAcesso();
});


async function verificarAcesso() {
    if (verificacaoAcessoEmAndamento) {
        return;
    }

    verificacaoAcessoEmAndamento = true;

    const token =
        localStorage.getItem("cidade360_token") ||
        sessionStorage.getItem("cidade360_token");

    if (!token) {
        limparDadosLoginAuth();
        window.location.replace(LOGIN_PAGE_AUTH);
        return;
    }

    try {
        const resposta = await fetch(`${API_URL_AUTH}/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            cache: "no-store"
        });

        let dados = null;

        try {
            dados = await resposta.json();
        } catch (error) {
            dados = null;
        }

        if (
            !resposta.ok ||
            !dados?.sucesso ||
            !dados?.usuario
        ) {
            limparDadosLoginAuth();
            window.location.replace(LOGIN_PAGE_AUTH);
            return;
        }

        window.usuarioLogado = dados.usuario;

        salvarUsuarioAtual(dados.usuario);

        atualizarUsuarioNoTopo(dados.usuario);

        document.documentElement.style.visibility = "visible";

    } catch (error) {
        console.error(
            "Erro ao verificar login:",
            error
        );

        limparDadosLoginAuth();

        window.location.replace(
            LOGIN_PAGE_AUTH
        );
    } finally {
        verificacaoAcessoEmAndamento = false;
    }
}


/*========================================================================================================

ATUALIZA USUÁRIO NO TOPO

=========================================================================================================*/

function atualizarUsuarioNoTopo(usuario) {
    const nomeCompleto =
        String(
            usuario?.nome || ""
        )
            .replace(/\s+/g, " ")
            .trim();

    const nomeExibicao =
        formatarNomeTopo(
            nomeCompleto
        );

    const tipoExibicao =
        formatarTipoUsuario(
            usuario?.tipo_usuario
        );

    const usuariosTopo =
        document.querySelectorAll(
            ".usuario"
        );

    usuariosTopo.forEach((usuarioTopo) => {
        const nomeUsuario =
            usuarioTopo.querySelector(
                "span"
            );

        const tipoUsuario =
            usuarioTopo.querySelector(
                "p"
            );

        if (nomeUsuario) {
            nomeUsuario.textContent =
                nomeExibicao;

            nomeUsuario.title =
                nomeCompleto || nomeExibicao;
        }

        if (tipoUsuario) {
            tipoUsuario.textContent =
                tipoExibicao;
        }
    });
}


function formatarNomeTopo(nome) {
    if (!nome) {
        return "Usuário";
    }

    const partes =
        nome
            .split(" ")
            .filter(Boolean);

    if (partes.length <= 2) {
        return nome;
    }

    return `${partes[0]} ${partes[partes.length - 1]}`;
}


function formatarTipoUsuario(tipoUsuario) {
    const tipo =
        String(
            tipoUsuario || ""
        )
            .trim()
            .toUpperCase();

    switch (tipo) {
        case "ADMIN":
            return "Administrador";

        case "CIDADAO":
            return "Cidadão";

        default:
            return "Usuário";
    }
}


/*========================================================================================================

ARMAZENAMENTO DO USUÁRIO ATUAL

=========================================================================================================*/

function salvarUsuarioAtual(usuario) {
    const armazenamento =
        localStorage.getItem(
            "cidade360_token"
        )
            ? localStorage
            : sessionStorage;

    armazenamento.setItem(
        "cidade360_usuario",
        JSON.stringify({
            id:
                usuario.id,

            nome:
                usuario.nome,

            email:
                usuario.email,

            tipo_usuario:
                usuario.tipo_usuario
        })
    );

    armazenamento.setItem(
        "cidade360_id",
        String(
            usuario.id
        )
    );
}


/*========================================================================================================

LIMPA DADOS DE LOGIN

=========================================================================================================*/

function limparDadosLoginAuth() {
    localStorage.removeItem(
        "cidade360_token"
    );

    localStorage.removeItem(
        "cidade360_usuario"
    );

    localStorage.removeItem(
        "cidade360_id"
    );

    sessionStorage.removeItem(
        "cidade360_token"
    );

    sessionStorage.removeItem(
        "cidade360_usuario"
    );

    sessionStorage.removeItem(
        "cidade360_id"
    );
}