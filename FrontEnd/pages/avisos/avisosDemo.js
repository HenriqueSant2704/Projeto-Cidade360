/*========================================================================================================

AVISOS: MODO DEMONSTRAÇÃO (PROVISÓRIO)

Usado só enquanto o banco ainda não tem as tabelas da migração 006_avisos.sql
(a API responde 404 ou 503 com codigo "AVISOS_INDISPONIVEL").
Os dados ficam apenas neste navegador. Quando a API estiver no ar, este arquivo
e a linha que o carrega no avisos.html podem ser apagados.

=========================================================================================================*/

(() => {

    "use strict";

    const CHAVE_DEMO = "avisos_demo_cidade360";

    // Ilustrações no lugar das fotos reais.
    const CENAS = {
        parque: `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustração de um parque com lago e árvores"><defs><linearGradient id="ceuP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient><linearGradient id="lagoP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs><rect width="800" height="450" fill="url(#ceuP)"/><circle cx="640" cy="90" r="46" fill="#fde68a"/><circle cx="640" cy="90" r="70" fill="#fde68a" opacity=".25"/><path d="M0 250 Q160 190 320 240 T640 220 T800 230 V450 H0z" fill="#86efac"/><path d="M0 300 Q200 250 420 300 T800 290 V450 H0z" fill="#4ade80"/><ellipse cx="420" cy="360" rx="230" ry="42" fill="url(#lagoP)"/><path d="M60 450 C220 380 300 340 420 318 S640 330 800 300" stroke="#fef3c7" stroke-width="22" fill="none" opacity=".9"/><g fill="#166534"><circle cx="110" cy="230" r="44"/><circle cx="150" cy="205" r="38"/><circle cx="700" cy="235" r="40"/><circle cx="735" cy="250" r="30"/><circle cx="250" cy="250" r="26"/></g><g fill="#15803d"><circle cx="85" cy="250" r="30"/><circle cx="672" cy="258" r="28"/></g><g fill="#78350f"><rect x="125" y="260" width="8" height="44"/><rect x="705" y="268" width="7" height="38"/><rect x="247" y="270" width="6" height="28"/></g><g fill="#f472b6"><circle cx="300" cy="300" r="5"/><circle cx="318" cy="306" r="4"/><circle cx="560" cy="296" r="5"/><circle cx="580" cy="302" r="4"/></g><g fill="#fff" opacity=".85"><ellipse cx="200" cy="80" rx="60" ry="16"/><ellipse cx="240" cy="70" rx="40" ry="16"/><ellipse cx="460" cy="120" rx="50" ry="12"/></g></svg>`,
        obras: `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustração de uma avenida com cones e máquina de obra"><defs><linearGradient id="ceuO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdba74"/><stop offset="1" stop-color="#fef3c7"/></linearGradient></defs><rect width="800" height="450" fill="url(#ceuO)"/><g fill="#94a3b8" opacity=".55"><rect x="40" y="120" width="80" height="150"/><rect x="130" y="80" width="70" height="190"/><rect x="560" y="100" width="90" height="170"/><rect x="660" y="140" width="80" height="130"/></g><g fill="#fff" opacity=".5"><rect x="150" y="100" width="12" height="16"/><rect x="172" y="100" width="12" height="16"/><rect x="150" y="130" width="12" height="16"/><rect x="580" y="120" width="14" height="16"/><rect x="606" y="120" width="14" height="16"/><rect x="580" y="150" width="14" height="16"/></g><path d="M0 270 H800 V450 H0z" fill="#334155"/><path d="M330 270 L470 270 L800 450 L0 450z" fill="#475569"/><g fill="#f8fafc"><path d="M392 280 h16 l4 26 h-24z"/><path d="M386 330 h28 l6 40 h-40z"/><path d="M378 400 h44 l8 50 h-60z"/></g><g><path d="M180 410 l22 -70 l22 70z" fill="#f97316"/><rect x="170" y="408" width="64" height="10" rx="3" fill="#1e293b"/><rect x="190" y="365" width="24" height="9" fill="#fff"/><path d="M590 410 l22 -70 l22 70z" fill="#f97316"/><rect x="580" y="408" width="64" height="10" rx="3" fill="#1e293b"/><rect x="600" y="365" width="24" height="9" fill="#fff"/><path d="M290 340 l15 -46 l15 46z" fill="#f97316"/><rect x="284" y="338" width="42" height="7" rx="2" fill="#1e293b"/><path d="M480 340 l15 -46 l15 46z" fill="#f97316"/><rect x="474" y="338" width="42" height="7" rx="2" fill="#1e293b"/></g><g transform="translate(470 196)"><rect x="0" y="40" width="150" height="46" rx="8" fill="#facc15"/><rect x="90" y="0" width="56" height="48" rx="6" fill="#eab308"/><rect x="100" y="8" width="36" height="24" rx="3" fill="#bae6fd"/><circle cx="30" cy="90" r="18" fill="#1e293b"/><circle cx="120" cy="90" r="18" fill="#1e293b"/><circle cx="30" cy="90" r="7" fill="#94a3b8"/><circle cx="120" cy="90" r="7" fill="#94a3b8"/><path d="M0 50 L-60 20 L-80 60" stroke="#eab308" stroke-width="12" fill="none" stroke-linecap="round"/></g></svg>`,
        festival: `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustração de uma praça à noite com palco e varal de luzes"><defs><linearGradient id="ceuF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#6d28d9"/></linearGradient><radialGradient id="luzF" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fde68a" stop-opacity=".9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs><rect width="800" height="450" fill="url(#ceuF)"/><g fill="#fff"><circle cx="90" cy="60" r="1.6"/><circle cx="220" cy="40" r="1.2"/><circle cx="340" cy="80" r="1.4"/><circle cx="520" cy="50" r="1.2"/><circle cx="700" cy="70" r="1.6"/><circle cx="610" cy="30" r="1"/></g><circle cx="400" cy="250" r="190" fill="url(#luzF)" opacity=".45"/><path d="M220 210 h360 v120 h-360z" fill="#312e81"/><path d="M200 200 h400 l-30 -50 h-340z" fill="#4c1d95"/><path d="M230 160 q40 30 80 0 q40 30 80 0 q40 30 80 0 q40 30 80 0 q40 30 80 0" fill="none" stroke="#a78bfa" stroke-width="4"/><g fill="#fde68a"><rect x="300" y="260" width="10" height="44" rx="5"/><circle cx="305" cy="250" r="12"/><rect x="390" y="250" width="10" height="54" rx="5"/><circle cx="395" cy="240" r="12"/><rect x="480" y="262" width="10" height="42" rx="5"/><circle cx="485" cy="252" r="12"/></g><path d="M0 330 H800 V450 H0z" fill="#1e1b4b"/><path d="M0 110 Q200 170 400 120 T800 110" fill="none" stroke="#fde68a" stroke-width="2" opacity=".7"/><g>${Array.from({ length: 16 }, (_, i) => { const x = 25 + i * 50; const y = 110 + Math.sin(i * 0.78 + 0.6) * 22 + 10; const c = ["#fde68a", "#f472b6", "#67e8f9", "#86efac"][i % 4]; return `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/><circle cx="${x}" cy="${y}" r="16" fill="${c}" opacity=".25"/>`; }).join("")}</g><g fill="#0f0a2e">${Array.from({ length: 22 }, (_, i) => { const x = 10 + i * 37; const h = 30 + ((i * 37) % 23); return `<circle cx="${x}" cy="${450 - h - 26}" r="13"/><rect x="${x - 15}" y="${450 - h - 14}" width="30" height="${h + 14}" rx="12"/>`; }).join("")}</g></svg>`,
        vacina: `<svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustração de unidade de saúde"><rect width="800" height="450" fill="#ffe4ea"/><circle cx="660" cy="80" r="140" fill="#fecdd6"/><rect x="200" y="140" width="400" height="230" rx="12" fill="#fff"/><rect x="200" y="140" width="400" height="44" rx="12" fill="#e11d48"/><path d="M380 230 h40 v-40 h40 v40 h40 v40 h-40 v40 h-40 v-40 h-40z" fill="#e11d48" transform="translate(-40 10) scale(1)"/><rect x="250" y="300" width="60" height="70" fill="#fecdd6"/><rect x="490" y="300" width="60" height="70" fill="#fecdd6"/><path d="M0 370 H800 V450 H0z" fill="#fda4b6"/></svg>`
    };

    const H = 3600e3;
    const D = 24 * H;

    function daqui(dias, hora, minuto = 0) {
        const data = new Date(Date.now() + dias * D);
        data.setHours(hora, minuto, 0, 0);

        const doisDigitos = (n) => String(n).padStart(2, "0");

        return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}:00`;
    }

    const atras = (ms) => new Date(Date.now() - ms).toISOString();

    function dadosIniciais() {
        return [
            {
                id: 1, categoria: "inauguracao", fixado: true, data_criacao: atras(3 * H),
                titulo: "Inauguração do Parque Linear do Ribeirão",
                texto: "O novo Parque Linear do Ribeirão será inaugurado com uma manhã de atividades para toda a família. São 2,4 km de pista de caminhada e ciclovia, parquinho acessível, academia ao ar livre e um lago com área de descanso.\n\nA programação começa às 9h com o plantio simbólico de mudas nativas, seguida de apresentações da banda municipal e oficinas para crianças. A entrada é gratuita.",
                data_evento: daqui(8, 9), local_evento: "Av. das Palmeiras, entrada pela Rua do Ribeirão",
                foto_cena: "parque",
                reacoes: { palmas: 214, amei: 162, comemorar: 98, feliz: 41, uau: 12, obrigado: 57 }, minha_reacao: null
            },
            {
                id: 2, categoria: "saude", fixado: false, data_criacao: atras(20 * H),
                titulo: "Campanha de vacinação contra a gripe nas UBSs",
                texto: "A partir de segunda-feira, todas as Unidades Básicas de Saúde aplicam a vacina contra a gripe para idosos, gestantes, crianças de 6 meses a 5 anos e profissionais da educação. Leve documento com foto e a carteira de vacinação. O atendimento vai das 8h às 16h30, sem necessidade de agendamento.",
                data_evento: daqui(3, 8), local_evento: "Todas as UBSs do município",
                reacoes: { palmas: 88, amei: 31, obrigado: 64, feliz: 9 }, minha_reacao: null
            },
            {
                id: 3, categoria: "obras", fixado: false, data_criacao: atras(1.6 * D),
                titulo: "Interdição parcial da Av. Brasil para recapeamento",
                texto: "Entre os dias 27 e 31, a Av. Brasil terá uma faixa interditada no trecho entre a Rua XV de Novembro e a Praça da Matriz, das 7h às 18h. As linhas de ônibus 102 e 115 terão o ponto provisoriamente transferido para a Rua Sete de Setembro. Pedimos atenção à sinalização e paciência durante a obra.",
                foto_cena: "obras",
                reacoes: { palmas: 46, uau: 22, obrigado: 18 }, minha_reacao: null
            },
            {
                id: 4, categoria: "evento", fixado: false, data_criacao: atras(3 * D),
                titulo: "Festival de Primavera na Praça Central",
                texto: "Três noites de música, feira de artesanato e food trucks com produtores locais. Na sexta, apresentação da Orquestra Jovem Municipal; no sábado, shows de artistas da cidade; e no domingo, cinema ao ar livre com sessão infantil às 18h.",
                data_evento: daqui(15, 18), local_evento: "Praça Central",
                foto_cena: "festival",
                reacoes: { comemorar: 176, amei: 120, feliz: 74, palmas: 63 }, minha_reacao: null
            },
            {
                id: 5, categoria: "servicos", fixado: false, data_criacao: atras(5 * D),
                titulo: "Feriado de Finados: horário dos serviços municipais",
                texto: "No dia 2 de novembro, as repartições públicas estarão fechadas. Coleta de lixo e transporte coletivo funcionam normalmente, com horário de domingo nos ônibus. O Pronto Atendimento e o SAMU seguem 24 horas. Os cemitérios municipais abrem das 6h às 18h.",
                reacoes: { obrigado: 39, palmas: 12 }, minha_reacao: null
            }
        ];
    }

    function carregar() {
        try {
            const salvos = JSON.parse(localStorage.getItem(CHAVE_DEMO) || "null");
            if (Array.isArray(salvos)) return salvos;
        } catch (error) {
            // Sem acesso ao armazenamento: segue com os dados iniciais.
        }
        return dadosIniciais();
    }

    let avisos = carregar();

    function salvar() {
        try {
            localStorage.setItem(CHAVE_DEMO, JSON.stringify(avisos));
        } catch (error) {
            // Foto grande demais para o armazenamento do navegador: os dados ficam só na memória.
        }
    }

    const copia = (valor) => JSON.parse(JSON.stringify(valor));
    const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

    function lerArquivo(arquivo) {
        return new Promise((resolver, rejeitar) => {
            const leitor = new FileReader();
            leitor.onload = () => resolver(leitor.result);
            leitor.onerror = rejeitar;
            leitor.readAsDataURL(arquivo);
        });
    }

    function buscar(id) {
        const aviso = avisos.find((item) => item.id === id && item.ativo !== false);
        if (!aviso) throw new Error("Aviso não encontrado.");
        return aviso;
    }

    async function aplicarCampos(aviso, campos) {
        Object.assign(aviso, {
            categoria: campos.categoria,
            titulo: campos.titulo,
            texto: campos.texto,
            data_evento: campos.data_evento ? `${campos.data_evento}:00`.slice(0, 19) : null,
            local_evento: campos.local_evento || null,
            fixado: Boolean(campos.fixado)
        });

        if (campos.foto) {
            aviso.foto_url = await lerArquivo(campos.foto);
            aviso.foto_cena = null;
        } else if (campos.foto_cena) {
            aviso.foto_cena = campos.foto_cena;
            aviso.foto_url = null;
        } else if (campos.remover_foto) {
            aviso.foto_url = null;
            aviso.foto_cena = null;
        }
    }

    window.AvisosDemo = {
        CENAS,

        async listar() {
            await esperar(250);
            return copia(avisos.filter((aviso) => aviso.ativo !== false));
        },

        async criar(campos) {
            await esperar(600);
            const aviso = {
                id: Math.max(0, ...avisos.map((item) => item.id)) + 1,
                data_criacao: new Date().toISOString(),
                reacoes: {},
                minha_reacao: null
            };
            await aplicarCampos(aviso, campos);
            avisos.push(aviso);
            salvar();
            return copia(aviso);
        },

        async atualizar(id, campos) {
            await esperar(600);
            const aviso = buscar(id);
            await aplicarCampos(aviso, campos);
            salvar();
            return copia(aviso);
        },

        async fixar(id, fixado) {
            const aviso = buscar(id);
            aviso.fixado = fixado;
            salvar();
            return copia(aviso);
        },

        async remover(id) {
            buscar(id).ativo = false;
            salvar();
        },

        async restaurar(id) {
            const aviso = avisos.find((item) => item.id === id);
            if (aviso) aviso.ativo = true;
            salvar();
            return copia(aviso);
        },

        async reagir(id, reacao) {
            const aviso = buscar(id);
            if (aviso.minha_reacao) aviso.reacoes[aviso.minha_reacao] = Math.max(0, (aviso.reacoes[aviso.minha_reacao] || 1) - 1);
            aviso.reacoes[reacao] = (aviso.reacoes[reacao] || 0) + 1;
            aviso.minha_reacao = reacao;
            salvar();
            return { reacoes: copia(aviso.reacoes), minha_reacao: reacao };
        },

        async removerReacao(id) {
            const aviso = buscar(id);
            if (aviso.minha_reacao) aviso.reacoes[aviso.minha_reacao] = Math.max(0, (aviso.reacoes[aviso.minha_reacao] || 1) - 1);
            aviso.minha_reacao = null;
            salvar();
            return { reacoes: copia(aviso.reacoes), minha_reacao: null };
        },

        // Volta para os avisos de exemplo originais.
        reiniciar() {
            avisos = dadosIniciais();
            salvar();
        }
    };

})();
