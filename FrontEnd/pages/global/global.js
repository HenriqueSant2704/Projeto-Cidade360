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
         * Computador começa aberto.
         */

        menuLateral.classList.remove(

            "menu-recolhido"

        );

        menuLateral.classList.remove(

            "menu-aberto"

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
                     * menu começa aberto.
                     */

                    menuLateral.classList.remove(
                        "menu-aberto"
                    );

                    menuLateral.classList.remove(
                        "menu-recolhido"
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