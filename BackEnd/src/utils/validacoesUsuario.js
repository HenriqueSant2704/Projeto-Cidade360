/*========================================================================================================

VALIDAÇÕES DE DADOS DO USUÁRIO

Mesmas regras do cadastro público (authController.js), separadas aqui para a área de
administradores usar sem duplicar código dentro do controller.

Sugestão para depois: o authController.js também pode passar a importar daqui.

=========================================================================================================*/

function normalizarEmail(email) {
    return String(email || "")
        .trim()
        .toLowerCase();
}


function normalizarNome(nome) {
    return String(nome || "")
        .replace(/\0/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


function apenasNumeros(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}


function validarEmail(email) {
    const emailNormalizado =
        normalizarEmail(email);

    if (
        !emailNormalizado ||
        emailNormalizado.length > 150 ||
        /\s/.test(emailNormalizado)
    ) {
        return false;
    }

    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
        .test(emailNormalizado);
}


function validarNome(nome) {
    const nomeNormalizado =
        normalizarNome(nome);

    return (
        nomeNormalizado.length >= 3 &&
        nomeNormalizado.length <= 150
    );
}


function validarTelefone(telefone) {
    const numeros =
        apenasNumeros(telefone);

    return (
        numeros.length === 10 ||
        numeros.length === 11
    );
}


function validarCpf(cpf) {
    const numeros =
        apenasNumeros(cpf);

    if (!/^\d{11}$/.test(numeros)) {
        return false;
    }

    // 00000000000, 11111111111...
    if (/^(\d)\1{10}$/.test(numeros)) {
        return false;
    }

    function calcularDigito(base, pesoInicial) {
        let soma = 0;

        for (let i = 0; i < base.length; i += 1) {
            soma += Number(base[i]) * (pesoInicial - i);
        }

        const resto = soma % 11;

        return resto < 2 ? 0 : 11 - resto;
    }

    return (
        calcularDigito(numeros.slice(0, 9), 10) === Number(numeros[9]) &&
        calcularDigito(numeros.slice(0, 10), 11) === Number(numeros[10])
    );
}


function validarSenhaForte(senha) {
    const valor =
        String(senha || "");

    if (
        valor.length < 8 ||
        valor.length > 72 ||
        /\s/.test(valor) ||
        !/[A-Z]/.test(valor) ||
        !/[a-z]/.test(valor) ||
        !/[0-9]/.test(valor) ||
        !/[!@#$%&*()_\-+=?.,:;{}[\]^~]/.test(valor)
    ) {
        return false;
    }

    const senhaNormalizada =
        valor.toLowerCase();

    const bloqueadas = [
        "123456",
        "12345678",
        "abcdef",
        "qwerty",
        "senha",
        "password",
        "admin",
        "cidade360",
        "usuario",
        "teste"
    ];

    return !bloqueadas.some(
        item => senhaNormalizada.includes(item)
    );
}


function escaparHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// LGPD: o administrador vê só o meio do CPF (***.482.917-**).
function mascararCpf(cpf) {
    const numeros =
        apenasNumeros(cpf);

    if (numeros.length !== 11) {
        return "";
    }

    return `***.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-**`;
}


module.exports = {
    normalizarEmail,
    normalizarNome,
    apenasNumeros,
    validarEmail,
    validarNome,
    validarTelefone,
    validarCpf,
    validarSenhaForte,
    escaparHtml,
    mascararCpf
};
