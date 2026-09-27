/*========================================================================================================

LOGOUT DO SISTEMA

Remove todos os dados do login, limpa o "Lembrar-me"
e manda o usuário para a tela de login.

ALTERADO: o botão de sair que ficava solto no menu superior foi removido.
Agora o "Sair da conta" fica dentro do menu do perfil (global.js),
que chama a função sairDoSistema() deste arquivo.

=========================================================================================================*/

const LOGIN_PAGE_LOGOUT =
    "/FrontEnd/pages/login/login.html";


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

As preferências ("preferencias_cidade360") e as notificações lidas
("notificacoes_lidas_cidade360") não começam com "cidade360_",
por isso continuam salvas depois do logout.

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