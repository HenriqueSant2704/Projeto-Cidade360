const telaOcorrencias = document.getElementById("tela-ocorrencias");
const telaFormulario = document.getElementById("tela-formulario");

const btnNovaOcorrencia = document.getElementById("btn-nova-ocorrencia");
const btnVoltar = document.getElementById("btn-voltar");
const btnCancelar = document.getElementById("btn-cancelar");

function abrirFormulario() {

    telaOcorrencias.classList.remove("animar-entrada");
    telaOcorrencias.classList.add("animar-saida");

    setTimeout(() => {

        telaOcorrencias.classList.add("oculto");
        telaOcorrencias.classList.remove("animar-saida");

        telaFormulario.classList.remove("oculto");
        telaFormulario.classList.add("animar-entrada");

    }, 350);

}

function voltarOcorrencias() {

    telaFormulario.classList.remove("animar-entrada");
    telaFormulario.classList.add("animar-saida");

    setTimeout(() => {

        telaFormulario.classList.add("oculto");
        telaFormulario.classList.remove("animar-saida");

        telaOcorrencias.classList.remove("oculto");
        telaOcorrencias.classList.add("animar-entrada");

    }, 350);

}

btnNovaOcorrencia.addEventListener("click", abrirFormulario);

btnVoltar.addEventListener("click", voltarOcorrencias);

btnCancelar.addEventListener("click", voltarOcorrencias);