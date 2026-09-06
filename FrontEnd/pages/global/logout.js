/*========================================================================================================

LOGOUT DO SISTEMA

Remove todos os dados do login, limpa o "Lembrar-me"
e manda o usuário para a tela de login.

Caso a página ainda não possua o botão de sair,
ele é adicionado automaticamente no mesmo padrão
dos outros botões do menu superior.

=========================================================================================================*/

const LOGIN_PAGE_LOGOUT =
    "/FrontEnd/pages/login/login.html";


document.addEventListener(
    "DOMContentLoaded",
    () => {
        const btnSair =
            garantirBotaoSair();

        if (!btnSair) {
            console.warn(
                "Menu superior não encontrado para adicionar o botão sair."
            );

            return;
        }

        btnSair.addEventListener(
            "click",
            sairDoSistema
        );
    }
);


/*========================================================================================================

GARANTE BOTÃO DE SAIR

=========================================================================================================*/

function garantirBotaoSair() {
    const botaoExistente =
        document.getElementById(
            "btnSair"
        );

    if (botaoExistente) {
        botaoExistente.type =
            "button";

        botaoExistente.title =
            "Sair";

        botaoExistente.setAttribute(
            "aria-label",
            "Sair"
        );

        return botaoExistente;
    }

    const menuTopo =
        document.querySelector(
            ".opcoes-menu-topo"
        );

    if (!menuTopo) {
        return null;
    }

    const containerSair =
        document.createElement(
            "div"
        );

    containerSair.className =
        "menu-acoes";

    const botaoSair =
        document.createElement(
            "button"
        );

    botaoSair.id =
        "btnSair";

    botaoSair.className =
        "btn-sair";

    botaoSair.type =
        "button";

    botaoSair.title =
        "Sair";

    botaoSair.setAttribute(
        "aria-label",
        "Sair"
    );

    const iconeSair =
        document.createElement(
            "img"
        );

    iconeSair.src =
        "/assets/icons/global/sair.png";

    iconeSair.alt =
        "sair";

    botaoSair.appendChild(
        iconeSair
    );

    containerSair.appendChild(
        botaoSair
    );

    const primeiraAcao =
        menuTopo.querySelector(
            ".menu-acoes"
        );

    if (primeiraAcao) {
        menuTopo.insertBefore(
            containerSair,
            primeiraAcao
        );
    } else {
        const perfilUsuario =
            menuTopo.querySelector(
                ".perfil-usuario"
            );

        if (perfilUsuario) {
            menuTopo.insertBefore(
                containerSair,
                perfilUsuario
            );
        } else {
            menuTopo.appendChild(
                containerSair
            );
        }
    }

    return botaoSair;
}


/*========================================================================================================

SAIR DO SISTEMA

=========================================================================================================*/

function sairDoSistema() {
    limparDadosLogout();

    window.location.replace(
        LOGIN_PAGE_LOGOUT
    );
}


/*========================================================================================================

LIMPEZA DA SESSÃO

=========================================================================================================*/

function limparDadosLogout() {
    localStorage.removeItem(
        "cidade360_token"
    );

    localStorage.removeItem(
        "cidade360_usuario"
    );

    localStorage.removeItem(
        "cidade360_id"
    );

    localStorage.removeItem(
        "cidade360_lembrar"
    );

    localStorage.removeItem(
        "cidade360_email_lembrado"
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

    Object.keys(
        localStorage
    ).forEach((chave) => {
        if (
            chave.startsWith(
                "cidade360_"
            )
        ) {
            localStorage.removeItem(
                chave
            );
        }
    });

    
    Object.keys(
        sessionStorage
    ).forEach((chave) => {
        if (
            chave.startsWith(
                "cidade360_"
            )
        ) {
            sessionStorage.removeItem(
                chave
            );
        }
    });
}