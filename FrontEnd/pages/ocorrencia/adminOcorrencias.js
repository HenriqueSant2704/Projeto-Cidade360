/*===================================================================

 Cidade360 - Modo Administrador (Prefeitura)
 Arquivo: FrontEnd/pages/ocorrencia/adminOcorrencias.js

 O que este arquivo faz:
 - Detecta se quem está logado é administrador.
 - Adiciona a lixeira (cancelar) em cada card de ocorrência.
 - Troca o botão "Detalhes" por um modal de análise, só para o admin.
 - Permite avançar o status: Recebido > Em Análise > Em Andamento > Resolvido.
 - Permite cancelar a ocorrência com motivo e justificativa.

 Não altera o fluxo do cidadão: se o usuário não for admin,
 o arquivo não faz nada.

 IMPORTANTE: por enquanto os dados vêm de um banco FALSO (BANCO_MOCK).
 Quando o backend existir, só o objeto ServicoAdminOcorrencias
 precisa ser trocado por chamadas fetch reais.

 ===================================================================*/

(function () {
    'use strict';


    /*===================================================================
     1. Configuração
     ===================================================================*/

    // Enquanto for true, abrir a página com ?perfil=admin ativa o modo admin.
    // Coloque false antes de ir para produção.
    const MODO_TESTE = true;

    const STATUS = {
        recebido: {
            rotulo: 'Recebido',
            etiqueta: 'status-recebidos',
            icone: 'icone-recebidos',
            contador: 'recebidos',
            etapa: 0
        },
        em_analise: {
            rotulo: 'Em Análise',
            etiqueta: 'status-emanalise',
            icone: 'icone-emanalise',
            contador: 'emanalise',
            etapa: 1
        },
        em_andamento: {
            rotulo: 'Em Andamento',
            etiqueta: 'status-andamento',
            icone: 'icone-andamento',
            contador: 'andamento',
            etapa: 2
        },
        resolvido: {
            rotulo: 'Resolvido',
            etiqueta: 'status-resolvido',
            icone: 'icone-resolvido',
            contador: 'resolvido',
            etapa: 3
        },
        cancelado: {
            rotulo: 'Cancelado',
            etiqueta: 'status-cancelado-acompanhamento',
            icone: 'icone-cancelado-acompanhamento',
            contador: null,
            etapa: -1
        }
    };

    const FLUXO = ['recebido', 'em_analise', 'em_andamento', 'resolvido'];

    // Para cada status, qual é o próximo passo que o admin pode dar.
    const PROXIMA_ETAPA = {
        recebido: {
            status: 'em_analise',
            botao: 'Aceitar ocorrência',
            sucesso: 'Ocorrência aceita',
            tituloHistorico: 'Ocorrência aceita pela prefeitura',
            mensagemPadrao: 'A prefeitura aceitou sua ocorrência e está analisando o problema.',
            ajuda: 'Revise as informações acima. Ao aceitar, o cidadão é avisado de que a prefeitura está analisando o problema.'
        },
        em_analise: {
            status: 'em_andamento',
            botao: 'Iniciar atendimento',
            sucesso: 'Atendimento iniciado',
            tituloHistorico: 'Atendimento iniciado',
            mensagemPadrao: 'Uma equipe foi designada e o atendimento já está em andamento.',
            ajuda: 'Use quando uma equipe for designada para resolver o problema no local.'
        },
        em_andamento: {
            status: 'resolvido',
            botao: 'Marcar como resolvida',
            sucesso: 'Ocorrência resolvida',
            tituloHistorico: 'Ocorrência resolvida',
            mensagemPadrao: 'O problema foi resolvido pela prefeitura. Obrigado por ajudar a cuidar da cidade!',
            ajuda: 'Use quando o serviço for concluído. Depois disso o status não pode mais ser alterado.'
        }
    };

    const MOTIVOS_CANCELAMENTO = {
        trote: 'Trote ou sem fundamento',
        duplicada: 'Ocorrência duplicada',
        fora_competencia: 'Fora da competência da prefeitura',
        outro: 'Outro motivo'
    };


    /*===================================================================
     2. Banco FALSO (somente para o protótipo do front-end)
     ===================================================================*/

    const BANCO_MOCK = {
        'OC-2026-001': {
            codigo: 'OC-2026-001',
            titulo: 'Lâmpada queimada no poste',
            categoria: 'Iluminação Pública',
            descricao: 'A lâmpada do poste em frente ao número 456 está queimada há 3 dias, deixando a rua muito escura à noite.',
            endereco: 'Av. Jaime, 456 - Centro',
            latitude: null,
            longitude: null,
            dataRegistro: '08/07/2026 19:42',
            ultimaAtualizacao: '08/07/2026 19:42',
            status: 'recebido',
            motivoCancelamento: null,
            justificativaCancelamento: '',
            cidadao: {
                nome: 'Ana Paula Ribeiro',
                email: 'ana.ribeiro@email.com',
                telefone: '(11) 98765-4321'
            },
            fotos: [],
            historico: [
                {
                    status: 'recebido',
                    titulo: 'Ocorrência registrada',
                    descricao: 'Sua solicitação foi recebida pelo sistema e aguarda triagem.',
                    data: '08/07/2026 19:42',
                    responsavel: 'Sistema'
                }
            ]
        },

        'OC-2026-002': {
            codigo: 'OC-2026-002',
            titulo: 'Buraco na via principal',
            categoria: 'Infraestrutura',
            descricao: 'Buraco grande na faixa da direita, perto da faixa de pedestres. Já vi dois carros danificando o pneu.',
            endereco: 'Rua Ausonia, 123 - Centro',
            latitude: -23.5505,
            longitude: -46.6333,
            dataRegistro: '05/07/2026 08:15',
            ultimaAtualizacao: '07/07/2026 10:30',
            status: 'em_andamento',
            motivoCancelamento: null,
            justificativaCancelamento: '',
            cidadao: {
                nome: 'Carlos Henrique Souza',
                email: 'carlos.souza@email.com',
                telefone: '(11) 91234-5678'
            },
            fotos: [],
            historico: [
                {
                    status: 'recebido',
                    titulo: 'Ocorrência registrada',
                    descricao: 'Sua solicitação foi recebida pelo sistema e aguarda triagem.',
                    data: '05/07/2026 08:15',
                    responsavel: 'Sistema'
                },
                {
                    status: 'em_analise',
                    titulo: 'Ocorrência aceita pela prefeitura',
                    descricao: 'A prefeitura aceitou sua ocorrência e está analisando o problema.',
                    data: '05/07/2026 14:02',
                    responsavel: 'Prefeitura'
                },
                {
                    status: 'em_andamento',
                    titulo: 'Atendimento iniciado',
                    descricao: 'Equipe de manutenção viária agendada para esta semana.',
                    data: '07/07/2026 10:30',
                    responsavel: 'Prefeitura'
                }
            ]
        },

        'OC-2026-003': {
            codigo: 'OC-2026-003',
            titulo: 'Coleta de lixo atrasada',
            categoria: 'Lixo Urbano',
            descricao: 'O caminhão de coleta não passa há uma semana e o lixo está acumulando na calçada.',
            endereco: 'Rua Netuno, 789 - Centro',
            latitude: null,
            longitude: null,
            dataRegistro: '10/07/2026 07:50',
            ultimaAtualizacao: '12/07/2026 16:10',
            status: 'resolvido',
            motivoCancelamento: null,
            justificativaCancelamento: '',
            cidadao: {
                nome: 'Juliana Martins',
                email: 'juliana.martins@email.com',
                telefone: ''
            },
            fotos: [],
            historico: [
                {
                    status: 'recebido',
                    titulo: 'Ocorrência registrada',
                    descricao: 'Sua solicitação foi recebida pelo sistema e aguarda triagem.',
                    data: '10/07/2026 07:50',
                    responsavel: 'Sistema'
                },
                {
                    status: 'em_analise',
                    titulo: 'Ocorrência aceita pela prefeitura',
                    descricao: 'A prefeitura aceitou sua ocorrência e está analisando o problema.',
                    data: '10/07/2026 11:20',
                    responsavel: 'Prefeitura'
                },
                {
                    status: 'em_andamento',
                    titulo: 'Atendimento iniciado',
                    descricao: 'Coleta extra programada para a região.',
                    data: '11/07/2026 09:00',
                    responsavel: 'Prefeitura'
                },
                {
                    status: 'resolvido',
                    titulo: 'Ocorrência resolvida',
                    descricao: 'Coleta realizada e rota normalizada.',
                    data: '12/07/2026 16:10',
                    responsavel: 'Prefeitura'
                }
            ]
        }
    };


    /*===================================================================
     3. Serviço (camada que vai conversar com o backend no futuro)

     Hoje ele só simula a demora da rede e altera o BANCO_MOCK.
     Quando o backend existir, troque o conteúdo de cada função
     por um fetch para o endpoint que vocês criarem.
     A tela inteira continua funcionando sem mudar mais nada.
     ===================================================================*/

    const ServicoAdminOcorrencias = {

        async buscarPorCodigo(codigo) {
            // BACKEND: buscar a ocorrência completa (com cidadão, fotos e histórico)
            await esperar(350);
            return BANCO_MOCK[codigo] ? clonar(BANCO_MOCK[codigo]) : null;
        },

        async avancarStatus(codigo, novoStatus, mensagem) {
            // BACKEND: enviar { status: novoStatus, mensagem } e receber a ocorrência atualizada
            await esperar(700);

            const registro = BANCO_MOCK[codigo];

            if (!registro) {
                throw new Error('Não encontramos essa ocorrência. Atualize a página e tente de novo.');
            }

            const proxima = PROXIMA_ETAPA[registro.status];

            if (!proxima || proxima.status !== novoStatus) {
                throw new Error('Essa mudança de status não é permitida a partir do status atual.');
            }

            const agora = dataHoraAgora();

            registro.status = novoStatus;
            registro.ultimaAtualizacao = agora;
            registro.historico.push({
                status: novoStatus,
                titulo: proxima.tituloHistorico,
                descricao: mensagem || proxima.mensagemPadrao,
                data: agora,
                responsavel: 'Prefeitura'
            });

            return clonar(registro);
        },

        async cancelar(codigo, motivo, justificativa) {
            // BACKEND: enviar { motivo, justificativa } e receber a ocorrência atualizada
            await esperar(700);

            const registro = BANCO_MOCK[codigo];

            if (!registro) {
                throw new Error('Não encontramos essa ocorrência. Atualize a página e tente de novo.');
            }

            if (!podeCancelar(registro.status)) {
                throw new Error('Ocorrências resolvidas ou já canceladas não podem ser canceladas.');
            }

            const agora = dataHoraAgora();
            const rotuloMotivo = MOTIVOS_CANCELAMENTO[motivo] || 'Motivo não informado';

            registro.status = 'cancelado';
            registro.ultimaAtualizacao = agora;
            registro.motivoCancelamento = motivo;
            registro.justificativaCancelamento = justificativa;
            registro.historico.push({
                status: 'cancelado',
                titulo: 'Ocorrência cancelada',
                descricao: justificativa ? `${rotuloMotivo}. ${justificativa}` : `${rotuloMotivo}.`,
                data: agora,
                responsavel: 'Prefeitura'
            });

            return clonar(registro);
        }
    };


    /*===================================================================
     4. Estado da tela
     ===================================================================*/

    const estado = {
        ehAdmin: false,
        ocorrencias: new Map(),   // codigo -> dados completos
        modalCodigo: null,        // código da ocorrência aberta no modal
        focoAntesModal: null,
        dialogoAberto: false,
        dialogoOcupado: false,
        focoAntesDialogo: null,
        aoConfirmarCancelamento: null,
        mapa: null
    };

    let modalEl = null;
    let conteudoModal = null;
    let dialogoEl = null;
    let areaToast = null;


    /*===================================================================
     5. Utilitários
     ===================================================================*/

    function esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function clonar(objeto) {
        return JSON.parse(JSON.stringify(objeto));
    }

    // Evita que um texto digitado pelo cidadão vire HTML na tela do admin.
    function esc(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[caractere]));
    }

    function normalizar(texto) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function dataHoraAgora() {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    function podeCancelar(status) {
        return status === 'recebido' || status === 'em_analise' || status === 'em_andamento';
    }

    function icone(caminhos, tamanho = 18, espessura = 2) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${espessura}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos}</svg>`;
    }

    const ICONES = {
        lixeira: icone('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
        lixeiraGrande: icone('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>', 24),
        fechar: icone('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 20),
        check: icone('<path d="M20 6 9 17l-5-5"/>', 18, 2.6),
        checkPequeno: icone('<path d="M20 6 9 17l-5-5"/>', 15, 3),
        usuario: icone('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', 16),
        escudo: icone('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', 14, 2.2),
        alerta: icone('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', 22)
    };


    /*===================================================================
     6. Perfil do usuário

     SUPOSIÇÃO: não sei como o seu authGuard.js guarda o usuário logado.
     Ajuste esta função para ler o perfil do jeito que o seu login salva.
     ===================================================================*/

    function usuarioEhAdmin() {
        if (MODO_TESTE) {
            const parametros = new URLSearchParams(window.location.search);

            if (parametros.get('perfil') === 'admin') {
                return true;
            }
        }

        // AJUSTE AQUI: chave e propriedade usadas pelo seu login
        const bruto = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');

        if (!bruto) {
            return false;
        }

        try {
            const usuario = JSON.parse(bruto);
            const perfil = normalizar(usuario.perfil || usuario.tipo || '');
            return perfil === 'admin' || perfil === 'administrador';
        } catch (erro) {
            return false;
        }
    }


    /*===================================================================
     7. Cards da listagem
     ===================================================================*/

    function obterCodigoDoCard(card) {
        if (card.dataset.codigo) {
            return card.dataset.codigo;
        }

        const codigo = card.querySelector('.codigo');
        return codigo ? codigo.textContent.trim() : null;
    }

    function encontrarCards(codigo) {
        return Array
            .from(document.querySelectorAll('.container-cards-ocorrencia .card-ocorrencias'))
            .filter(card => obterCodigoDoCard(card) === codigo);
    }

    function lerStatusDoCard(card) {
        const etiqueta = card.querySelector('.etiqueta-status');

        if (!etiqueta) {
            return 'recebido';
        }

        for (const [chave, config] of Object.entries(STATUS)) {
            if (etiqueta.classList.contains(config.etiqueta)) {
                return chave;
            }
        }

        const texto = normalizar(etiqueta.textContent);

        if (texto.includes('analise')) return 'em_analise';
        if (texto.includes('andamento')) return 'em_andamento';
        if (texto.includes('resolvid')) return 'resolvido';
        if (texto.includes('cancelad')) return 'cancelado';

        return 'recebido';
    }

    function obterIconeDoCard(card) {
        const mascara = card.querySelector('.caixa-icone .icone-mascara');

        if (!mascara) {
            return '';
        }

        return mascara.style.webkitMaskImage || mascara.style.maskImage || '';
    }

    // Usado quando a ocorrência não existe no BANCO_MOCK (ex.: cards criados pelo seu JS).
    function extrairDadosDoCard(card) {
        const infos = card.querySelectorAll('.item-info:not(.item-info-cidadao) span');
        const data = card.querySelector('.data') ? card.querySelector('.data').textContent.trim() : '';
        const titulo = card.querySelector('.titulo-card');

        return {
            codigo: obterCodigoDoCard(card),
            titulo: titulo ? titulo.textContent.trim() : 'Ocorrência sem título',
            categoria: infos[0] ? infos[0].textContent.trim() : 'Não informada',
            endereco: infos[1] ? infos[1].textContent.trim() : 'Endereço não informado',
            descricao: '',
            latitude: null,
            longitude: null,
            dataRegistro: data,
            ultimaAtualizacao: data,
            status: lerStatusDoCard(card),
            motivoCancelamento: null,
            justificativaCancelamento: '',
            cidadao: null,
            fotos: [],
            historico: [
                {
                    status: 'recebido',
                    titulo: 'Ocorrência registrada',
                    descricao: 'Sua solicitação foi recebida pelo sistema e aguarda triagem.',
                    data,
                    responsavel: 'Sistema'
                }
            ]
        };
    }

    function aplicarStatusNoCard(card, status) {
        const config = STATUS[status];

        if (!config) {
            return;
        }

        const etiqueta = card.querySelector('.etiqueta-status');

        if (etiqueta) {
            Object.values(STATUS).forEach(s => etiqueta.classList.remove(s.etiqueta));
            etiqueta.classList.add(config.etiqueta);

            if (etiqueta.textContent.trim() !== config.rotulo) {
                etiqueta.textContent = config.rotulo;
            }
        }

        const caixaIcone = card.querySelector('.topo-card .caixa-icone');

        if (caixaIcone) {
            Object.values(STATUS).forEach(s => caixaIcone.classList.remove(s.icone));
            caixaIcone.classList.add(config.icone);
        }

        card.dataset.status = status;
        card.classList.toggle('card-cancelado-admin', status === 'cancelado');

        const lixeira = card.querySelector('.btn-lixeira-admin');

        if (lixeira) {
            lixeira.hidden = !podeCancelar(status);
        }
    }

    function inserirInfoCidadao(card, nome) {
        const lista = card.querySelector('.lista-infos');

        if (!lista || lista.querySelector('.item-info-cidadao')) {
            return;
        }

        lista.insertAdjacentHTML('beforeend', `
            <div class="item-info item-info-cidadao">
                <div class="icone-info">${ICONES.usuario}</div>
                <span>${esc(nome)}</span>
            </div>
        `);
    }

    function decorarCard(card) {
        if (card.dataset.adminDecorado === 'true') {
            return;
        }

        const codigo = obterCodigoDoCard(card);

        if (!codigo) {
            return;
        }

        card.dataset.adminDecorado = 'true';
        card.dataset.codigo = codigo;

        // Lixeira ao lado do botão Detalhes
        const rodape = card.querySelector('.rodape-card');
        const btnDetalhes = card.querySelector('.btn-detalhes');

        if (rodape && btnDetalhes && !card.querySelector('.btn-lixeira-admin')) {
            const grupo = document.createElement('div');
            grupo.className = 'acoes-card-admin';

            const lixeira = document.createElement('button');
            lixeira.type = 'button';
            lixeira.className = 'btn-lixeira-admin';
            lixeira.dataset.codigo = codigo;
            lixeira.title = 'Cancelar ocorrência';
            lixeira.setAttribute('aria-label', `Cancelar ocorrência ${codigo}`);
            lixeira.innerHTML = ICONES.lixeira;

            rodape.insertBefore(grupo, btnDetalhes);
            grupo.append(lixeira, btnDetalhes);
        }

        // Nome de quem registrou (o admin vê ocorrências de todos)
        const dados = estado.ocorrencias.get(codigo) || BANCO_MOCK[codigo];

        if (dados && dados.cidadao && dados.cidadao.nome) {
            inserirInfoCidadao(card, dados.cidadao.nome);
        }

        // Se o admin já mudou o status nesta sessão, mantém a mudança
        // mesmo que a listagem seja desenhada de novo.
        const local = estado.ocorrencias.get(codigo);
        aplicarStatusNoCard(card, local ? local.status : lerStatusDoCard(card));
    }

    function decorarTodosOsCards() {
        document
            .querySelectorAll('.container-cards-ocorrencia .card-ocorrencias')
            .forEach(decorarCard);
    }

    // Seu JS pode redesenhar a lista (filtro, busca, paginação).
    // O observer percebe os cards novos e coloca a lixeira neles também.
    function observarCards() {
        decorarTodosOsCards();

        const container = document.querySelector('.container-cards-ocorrencia');

        if (!container) {
            return;
        }

        let agendado = false;

        const observer = new MutationObserver(() => {
            if (agendado) {
                return;
            }

            agendado = true;

            requestAnimationFrame(() => {
                agendado = false;
                decorarTodosOsCards();
            });
        });

        observer.observe(container, { childList: true, subtree: true });
    }

    function ajustarContador(status, diferenca) {
        const config = STATUS[status];

        if (!config || !config.contador) {
            return;
        }

        const numero = document.querySelector(`.caixa-qtn-ocorrencias .numero.${config.contador}`);

        if (!numero) {
            return;
        }

        const atual = parseInt(numero.textContent, 10) || 0;
        numero.textContent = Math.max(0, atual + diferenca);
    }


    /*===================================================================
     8. Dados da ocorrência
     ===================================================================*/

    async function garantirDados(codigo) {
        if (estado.ocorrencias.has(codigo)) {
            return estado.ocorrencias.get(codigo);
        }

        const card = encontrarCards(codigo)[0];
        let dados = await ServicoAdminOcorrencias.buscarPorCodigo(codigo);

        if (!dados) {
            if (!card) {
                throw new Error('Não encontramos os dados dessa ocorrência.');
            }

            dados = extrairDadosDoCard(card);

            // Somente no protótipo: registra no banco falso para permitir alterar o status.
            BANCO_MOCK[codigo] = clonar(dados);
        }

        dados.icone = card ? obterIconeDoCard(card) : '';
        estado.ocorrencias.set(codigo, dados);

        return dados;
    }

    function aplicarAtualizacao(novosDados, statusAnterior) {
        const anterior = estado.ocorrencias.get(novosDados.codigo);
        novosDados.icone = anterior ? anterior.icone : '';

        estado.ocorrencias.set(novosDados.codigo, novosDados);

        encontrarCards(novosDados.codigo).forEach(card => aplicarStatusNoCard(card, novosDados.status));

        if (statusAnterior !== novosDados.status) {
            ajustarContador(statusAnterior, -1);
            ajustarContador(novosDados.status, 1);
        }

        if (estado.modalCodigo === novosDados.codigo) {
            renderizarModal(novosDados);
        }
    }


    /*===================================================================
     9. Visual do cabeçalho no modo admin
     ===================================================================*/

    function aplicarVisualAdmin() {
        document.body.classList.add('modo-admin');

        const titulo = document.querySelector('.caixa-titulo .titulo');
        const h2 = titulo ? titulo.querySelector('h2') : null;

        if (h2) {
            h2.textContent = 'Todas as Ocorrências';
        }

        if (titulo && !titulo.querySelector('.selo-admin')) {
            titulo.insertAdjacentHTML('beforeend', `<span class="selo-admin">${ICONES.escudo}Prefeitura</span>`);
        }

        const descricao = document.querySelector('.caixa-titulo p');

        if (descricao) {
            descricao.textContent = 'Analise as ocorrências registradas pelos cidadãos, aceite as válidas e acompanhe cada uma até a resolução.';
        }

        const perfil = document.querySelector('.perfil-usuario .usuario p');

        if (perfil) {
            perfil.textContent = 'Administrador';
        }
    }


    /*===================================================================
     10. Overlays (abrir / fechar com animação)
     ===================================================================*/

    function mostrarOverlay(elemento) {
        clearTimeout(elemento._timerFechar);
        elemento.hidden = false;

        requestAnimationFrame(() => {
            elemento.classList.add('visivel');
        });
    }

    function esconderOverlay(elemento) {
        elemento.classList.remove('visivel');

        elemento._timerFechar = setTimeout(() => {
            elemento.hidden = true;
        }, 220);
    }

    function atualizarTravaDeRolagem() {
        const algumAberto = estado.modalCodigo !== null || estado.dialogoAberto;
        document.body.classList.toggle('modal-admin-aberto', algumAberto);
    }


    /*===================================================================
     11. Modal de detalhes
     ===================================================================*/

    function criarModal() {
        modalEl = document.createElement('div');
        modalEl.className = 'modal-admin-overlay';
        modalEl.id = 'modal-admin-ocorrencia';
        modalEl.hidden = true;
        modalEl.innerHTML = `
            <div class="modal-admin" role="dialog" aria-modal="true" aria-labelledby="modal-admin-titulo">
                <div class="modal-admin-conteudo" id="modal-admin-conteudo"></div>
            </div>
        `;

        document.body.appendChild(modalEl);
        conteudoModal = modalEl.querySelector('#modal-admin-conteudo');

        modalEl.addEventListener('click', evento => {
            // Clique fora do modal fecha, a não ser que o admin tenha digitado algo.
            if (evento.target === modalEl) {
                const mensagem = conteudoModal.querySelector('#admin-mensagem');

                if (!mensagem || !mensagem.value.trim()) {
                    fecharModal();
                }

                return;
            }

            const alvo = evento.target.closest('[data-acao]');

            if (!alvo) {
                return;
            }

            switch (alvo.dataset.acao) {
                case 'fechar':
                    fecharModal();
                    break;
                case 'avancar':
                    avancarStatus(alvo);
                    break;
                case 'cancelar':
                    iniciarCancelamento(estado.modalCodigo);
                    break;
                case 'ver-foto':
                    abrirFoto(alvo.dataset.src);
                    break;
                case 'tentar-novamente':
                    abrirModal(estado.modalCodigo);
                    break;
            }
        });

        modalEl.addEventListener('input', evento => {
            if (evento.target.id === 'admin-mensagem') {
                const contador = conteudoModal.querySelector('[data-contador="admin-mensagem"]');

                if (contador) {
                    contador.textContent = `${evento.target.value.length}/500`;
                }
            }
        });
    }

    async function abrirModal(codigo) {
        if (!codigo) {
            return;
        }

        if (estado.modalCodigo === null) {
            estado.focoAntesModal = document.activeElement;
        }

        estado.modalCodigo = codigo;
        atualizarTravaDeRolagem();
        destruirMapa();

        conteudoModal.innerHTML = renderCarregando(codigo);
        mostrarOverlay(modalEl);

        try {
            const dados = await garantirDados(codigo);

            if (estado.modalCodigo !== codigo) {
                return;
            }

            renderizarModal(dados);

            const fechar = conteudoModal.querySelector('.btn-fechar-modal-admin');

            if (fechar) {
                fechar.focus();
            }
        } catch (erro) {
            if (estado.modalCodigo !== codigo) {
                return;
            }

            conteudoModal.innerHTML = renderErro(erro.message);
        }
    }

    function fecharModal() {
        if (estado.modalCodigo === null) {
            return;
        }

        destruirMapa();
        estado.modalCodigo = null;
        esconderOverlay(modalEl);
        atualizarTravaDeRolagem();

        if (estado.focoAntesModal && document.contains(estado.focoAntesModal)) {
            estado.focoAntesModal.focus();
        }
    }

    function renderCarregando(codigo) {
        return `
            <div class="modal-admin-estado">
                <button type="button" class="btn-fechar-modal-admin modal-admin-fechar-flutuante" data-acao="fechar" aria-label="Fechar detalhes">${ICONES.fechar}</button>
                <div class="spinner-admin" aria-hidden="true"></div>
                <h2 id="modal-admin-titulo">Carregando ${esc(codigo)}</h2>
                <span>Buscando descrição, localização e histórico.</span>
            </div>
        `;
    }

    function renderErro(mensagem) {
        return `
            <div class="modal-admin-estado modal-admin-estado-erro">
                <button type="button" class="btn-fechar-modal-admin modal-admin-fechar-flutuante" data-acao="fechar" aria-label="Fechar detalhes">${ICONES.fechar}</button>
                <div class="modal-admin-estado-icone">${ICONES.alerta}</div>
                <h2 id="modal-admin-titulo">Não foi possível abrir a ocorrência</h2>
                <span>${esc(mensagem)}</span>
                <button type="button" class="btn-tentar-novamente-ocorrencias" data-acao="tentar-novamente">Tentar novamente</button>
            </div>
        `;
    }

    function renderizarModal(dados) {
        destruirMapa();

        const config = STATUS[dados.status] || STATUS.recebido;
        const quantidadeFotos = Array.isArray(dados.fotos) ? dados.fotos.length : 0;

        conteudoModal.innerHTML = `
            <header class="modal-admin-cabecalho">
                <div class="modal-admin-identidade">
                    <div class="caixa-icone ${config.icone}">
                        <div class="icone-mascara img-icone-grande" data-icone-modal></div>
                    </div>
                    <div class="modal-admin-titulos">
                        <span class="modal-admin-codigo">${esc(dados.codigo)}</span>
                        <h2 id="modal-admin-titulo">${esc(dados.titulo)}</h2>
                    </div>
                </div>

                <div class="modal-admin-cabecalho-acoes">
                    <div class="etiqueta-status ${config.etiqueta}">${config.rotulo}</div>
                    <button type="button" class="btn-fechar-modal-admin" data-acao="fechar" aria-label="Fechar detalhes">${ICONES.fechar}</button>
                </div>
            </header>

            <div class="modal-admin-corpo">
                ${renderProgresso(dados)}

                <div class="modal-admin-grade">
                    <div class="modal-admin-coluna">
                        <section class="cartao-detalhe">
                            <div class="caixa-descricao">
                                <h4 class="titulo-sessao-pequeno">Descrição do problema</h4>
                                <p class="texto-descricao">${dados.descricao ? esc(dados.descricao) : 'O cidadão não informou uma descrição.'}</p>
                            </div>

                            <div class="metadados-ocorrencia">
                                <div><span>Categoria</span><strong>${esc(dados.categoria)}</strong></div>
                                <div><span>Registrada em</span><strong>${esc(dados.dataRegistro || '-')}</strong></div>
                                <div><span>Última atualização</span><strong>${esc(dados.ultimaAtualizacao || '-')}</strong></div>
                                <div><span>Fotos anexadas</span><strong>${quantidadeFotos}</strong></div>
                            </div>
                        </section>

                        <section class="cartao-detalhe">
                            <h3 class="titulo-sessao">Histórico da solicitação</h3>
                            ${renderHistorico(dados.historico)}
                        </section>
                    </div>

                    <div class="modal-admin-coluna">
                        <section class="cartao-detalhe">
                            <h3 class="titulo-sessao">Registrada por</h3>
                            ${renderCidadao(dados.cidadao)}
                        </section>

                        <section class="cartao-detalhe">
                            <h3 class="titulo-sessao">Localização</h3>
                            <div class="caixa-endereco">${esc(dados.endereco || 'Endereço não informado')}</div>
                            ${renderMapa(dados)}
                        </section>

                        <section class="cartao-detalhe">
                            <h3 class="titulo-sessao">Evidências</h3>
                            ${renderFotos(dados.fotos)}
                        </section>
                    </div>
                </div>

                ${renderPainelAcoes(dados)}
            </div>
        `;

        // O ícone da categoria vem do card (mesma máscara usada na lista)
        const iconeModal = conteudoModal.querySelector('[data-icone-modal]');

        if (iconeModal) {
            if (dados.icone) {
                iconeModal.style.webkitMaskImage = dados.icone;
                iconeModal.style.maskImage = dados.icone;
            } else {
                iconeModal.outerHTML = ICONES.alerta;
            }
        }

        iniciarMapa(dados);
    }

    function renderProgresso(dados) {
        if (dados.status === 'cancelado') {
            const motivo = MOTIVOS_CANCELAMENTO[dados.motivoCancelamento] || 'Motivo não informado';
            const justificativa = dados.justificativaCancelamento ? ` ${esc(dados.justificativaCancelamento)}` : '';

            return `
                <div class="progresso-status-ocorrencia">
                    <div class="status-cancelado-progresso">
                        <strong>Ocorrência cancelada</strong>
                        <span>${esc(motivo)}.${justificativa}</span>
                    </div>
                </div>
            `;
        }

        const etapaAtual = STATUS[dados.status] ? STATUS[dados.status].etapa : 0;

        const etapas = FLUXO.map((chave, indice) => {
            const concluida = indice <= etapaAtual;
            const atual = indice === etapaAtual;
            const conteudo = indice < etapaAtual ? ICONES.checkPequeno : indice + 1;

            const etapa = `
                <div class="etapa-status ${concluida ? 'concluida' : ''} ${atual ? 'atual' : ''}" ${atual ? 'aria-current="step"' : ''}>
                    <div class="bolinha-status">${conteudo}</div>
                    <span>${STATUS[chave].rotulo}</span>
                </div>
            `;

            const linha = indice < FLUXO.length - 1
                ? `<div class="linha-status ${indice < etapaAtual ? 'concluida' : ''}"></div>`
                : '';

            return etapa + linha;
        }).join('');

        return `<div class="progresso-status-ocorrencia">${etapas}</div>`;
    }

    function renderHistorico(historico) {
        if (!Array.isArray(historico) || historico.length === 0) {
            return '<p class="aviso-status-final">Nenhuma movimentação registrada.</p>';
        }

        // Mais recente primeiro: o admin vê logo o que aconteceu por último.
        const itens = historico.slice().reverse().map(item => `
            <li class="historico-admin-item" data-status="${esc(item.status)}">
                <span class="historico-admin-marcador" aria-hidden="true"></span>
                <div class="historico-admin-cartao">
                    <div class="historico-admin-topo">
                        <strong>${esc(item.titulo)}</strong>
                        <time>${esc(item.data)}</time>
                    </div>
                    <p>${esc(item.descricao)}</p>
                    <span class="responsavel-historico">${esc(item.responsavel)}</span>
                </div>
            </li>
        `).join('');

        return `<ol class="historico-admin">${itens}</ol>`;
    }

    function renderCidadao(cidadao) {
        if (!cidadao || !cidadao.nome) {
            return '<p class="aviso-status-final">Os dados de quem registrou ainda não estão disponíveis nesta tela.</p>';
        }

        return `
            <div class="caixa-dados-cidadao">
                <strong>${esc(cidadao.nome)}</strong>
                ${cidadao.email ? `<span>${esc(cidadao.email)}</span>` : ''}
                ${cidadao.telefone ? `<span>${esc(cidadao.telefone)}</span>` : ''}
            </div>
        `;
    }

    function temCoordenadas(dados) {
        return Number.isFinite(dados.latitude) && Number.isFinite(dados.longitude);
    }

    function renderMapa(dados) {
        if (temCoordenadas(dados) && typeof window.L !== 'undefined') {
            return '<div class="caixa-mapa caixa-mapa-real" id="mapa-admin-ocorrencia"></div>';
        }

        return `
            <div class="caixa-mapa">
                <span class="mapa-sem-gps">O cidadão não registrou a localização por GPS.</span>
            </div>
        `;
    }

    function renderFotos(fotos) {
        if (!Array.isArray(fotos) || fotos.length === 0) {
            return `
                <div class="caixa-foto-vazia">
                    <span class="texto-foto-vazia">Nenhuma foto anexada</span>
                </div>
            `;
        }

        const itens = fotos.map((src, indice) => `
            <button type="button" class="foto-evidencia" data-acao="ver-foto" data-src="${esc(src)}" aria-label="Ampliar foto ${indice + 1}">
                <img src="${esc(src)}" alt="Foto ${indice + 1} da ocorrência" loading="lazy">
            </button>
        `).join('');

        return `<div class="galeria-evidencias">${itens}</div>`;
    }

    function renderPainelAcoes(dados) {
        if (dados.status === 'resolvido') {
            return `
                <section class="cartao-detalhe painel-admin-status painel-admin-final">
                    <h3 class="titulo-sessao">Status final</h3>
                    <p class="aviso-status-final">Esta ocorrência foi resolvida. O status não pode mais ser alterado.</p>
                </section>
            `;
        }

        if (dados.status === 'cancelado') {
            return `
                <section class="cartao-detalhe painel-admin-status painel-admin-final">
                    <h3 class="titulo-sessao">Status final</h3>
                    <p class="aviso-status-final">Esta ocorrência foi cancelada. Ela não aparece para outros cidadãos, só para quem a registrou.</p>
                </section>
            `;
        }

        const proxima = PROXIMA_ETAPA[dados.status];

        return `
            <section class="cartao-detalhe painel-admin-status">
                <div class="painel-admin-cabecalho">
                    <h3 class="titulo-sessao">Próximo passo</h3>
                    <div class="transicao-status">
                        <span class="etiqueta-status ${STATUS[dados.status].etiqueta}">${STATUS[dados.status].rotulo}</span>
                        <span class="seta-transicao" aria-hidden="true">${icone('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', 16)}</span>
                        <span class="etiqueta-status ${STATUS[proxima.status].etiqueta}">${STATUS[proxima.status].rotulo}</span>
                    </div>
                </div>

                <p class="texto-admin-status">${proxima.ajuda} Se a mensagem ficar em branco, o cidadão recebe o texto de exemplo do campo.</p>

                <div class="painel-admin-linha">
                    <div class="grupo-admin-status">
                        <label for="admin-mensagem">Mensagem para o cidadão (opcional)</label>
                        <textarea id="admin-mensagem" maxlength="500" placeholder="${esc(proxima.mensagemPadrao)}"></textarea>
                        <span class="contador-caracteres" data-contador="admin-mensagem">0/500</span>
                    </div>

                    <div class="painel-admin-botoes">
                        <button type="button" class="btn-atualizar-status" data-acao="avancar">
                            ${ICONES.check}<span>${proxima.botao}</span>
                        </button>
                        <button type="button" class="btn-cancelar-ocorrencia-admin" data-acao="cancelar">
                            ${ICONES.lixeira}<span>Cancelar ocorrência</span>
                        </button>
                    </div>
                </div>

                <div class="mensagem-admin-status erro" role="alert" hidden></div>
            </section>
        `;
    }

    function iniciarMapa(dados) {
        const elemento = conteudoModal.querySelector('#mapa-admin-ocorrencia');

        if (!elemento || typeof window.L === 'undefined' || !temCoordenadas(dados)) {
            return;
        }

        const posicao = [dados.latitude, dados.longitude];

        estado.mapa = window.L.map(elemento, { scrollWheelZoom: false }).setView(posicao, 16);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(estado.mapa);

        window.L.marker(posicao).addTo(estado.mapa);

        // O Leaflet precisa recalcular o tamanho depois que o modal termina de abrir.
        setTimeout(() => {
            if (estado.mapa) {
                estado.mapa.invalidateSize();
            }
        }, 280);
    }

    function destruirMapa() {
        if (estado.mapa) {
            estado.mapa.remove();
            estado.mapa = null;
        }
    }

    function abrirFoto(src) {
        if (!src) {
            return;
        }

        const visualizador = document.createElement('div');
        visualizador.className = 'visualizador-foto-ocorrencia';
        visualizador.innerHTML = `
            <button type="button" class="fechar-visualizador-foto" aria-label="Fechar foto">&times;</button>
            <img src="${esc(src)}" alt="Foto anexada à ocorrência">
        `;

        visualizador.addEventListener('click', evento => {
            if (evento.target === visualizador || evento.target.closest('.fechar-visualizador-foto')) {
                visualizador.remove();
            }
        });

        document.body.appendChild(visualizador);
        visualizador.querySelector('.fechar-visualizador-foto').focus();
    }


    /*===================================================================
     12. Avançar status
     ===================================================================*/

    function definirCarregando(botao, carregando, texto) {
        if (!botao) {
            return;
        }

        if (carregando) {
            botao.dataset.htmlOriginal = botao.innerHTML;
            botao.disabled = true;
            botao.innerHTML = `<span class="spinner-botao" aria-hidden="true"></span><span>${esc(texto)}</span>`;
        } else if (botao.dataset.htmlOriginal) {
            botao.disabled = false;
            botao.innerHTML = botao.dataset.htmlOriginal;
            delete botao.dataset.htmlOriginal;
        }
    }

    async function avancarStatus(botao) {
        const codigo = estado.modalCodigo;
        const dados = estado.ocorrencias.get(codigo);

        if (!dados) {
            return;
        }

        const proxima = PROXIMA_ETAPA[dados.status];

        if (!proxima) {
            return;
        }

        const campoMensagem = conteudoModal.querySelector('#admin-mensagem');
        const mensagem = campoMensagem ? campoMensagem.value.trim() : '';
        const aviso = conteudoModal.querySelector('.mensagem-admin-status');
        const btnCancelar = conteudoModal.querySelector('[data-acao="cancelar"]');

        if (aviso) {
            aviso.hidden = true;
        }

        definirCarregando(botao, true, 'Salvando...');

        if (btnCancelar) {
            btnCancelar.disabled = true;
        }

        try {
            const atualizado = await ServicoAdminOcorrencias.avancarStatus(codigo, proxima.status, mensagem);

            // Re-renderiza o modal e o card com o novo status
            aplicarAtualizacao(atualizado, dados.status);

            mostrarToast(proxima.sucesso, `${codigo} agora está como "${STATUS[proxima.status].rotulo}".`);
        } catch (erro) {
            definirCarregando(botao, false);

            if (btnCancelar) {
                btnCancelar.disabled = false;
            }

            if (aviso) {
                aviso.textContent = erro.message;
                aviso.hidden = false;
            }
        }
    }


    /*===================================================================
     13. Cancelamento (diálogo de confirmação)
     ===================================================================*/

    function criarDialogo() {
        const opcoesMotivo = Object.entries(MOTIVOS_CANCELAMENTO).map(([valor, rotulo]) => `
            <label class="opcao-motivo">
                <input type="radio" name="motivo-cancelamento" value="${valor}">
                <span>${rotulo}</span>
            </label>
        `).join('');

        dialogoEl = document.createElement('div');
        dialogoEl.className = 'dialogo-admin-overlay';
        dialogoEl.hidden = true;
        dialogoEl.innerHTML = `
            <div class="dialogo-admin" role="alertdialog" aria-modal="true" aria-labelledby="dialogo-cancelamento-titulo" aria-describedby="dialogo-cancelamento-texto">
                <div class="dialogo-admin-icone">${ICONES.lixeiraGrande}</div>

                <h3 id="dialogo-cancelamento-titulo">Cancelar a ocorrência <span data-dialogo-codigo></span>?</h3>

                <p id="dialogo-cancelamento-texto">
                    Ela deixa de aparecer para os outros cidadãos. Quem registrou continua vendo a ocorrência,
                    com o status Cancelado e o motivo que você escolher abaixo.
                </p>

                <fieldset class="motivos-cancelamento">
                    <legend>Motivo do cancelamento</legend>
                    <div class="lista-motivos">${opcoesMotivo}</div>
                </fieldset>

                <div class="grupo-admin-status">
                    <label for="justificativa-cancelamento" data-rotulo-justificativa>Justificativa para o cidadão (opcional)</label>
                    <textarea id="justificativa-cancelamento" maxlength="300" placeholder="Ex: Já existe uma ocorrência aberta para este mesmo buraco (OC-2026-002)."></textarea>
                    <span class="contador-caracteres" data-contador="justificativa">0/300</span>
                </div>

                <div class="dialogo-admin-erro" role="alert" hidden></div>

                <div class="dialogo-admin-botoes">
                    <button type="button" class="btn-dialogo-voltar" data-acao="voltar">Voltar</button>
                    <button type="button" class="btn-dialogo-confirmar" data-acao="confirmar">Cancelar ocorrência</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialogoEl);

        dialogoEl.addEventListener('click', evento => {
            if (evento.target === dialogoEl) {
                if (!estado.dialogoOcupado) {
                    fecharDialogo();
                }
                return;
            }

            const alvo = evento.target.closest('[data-acao]');

            if (!alvo) {
                return;
            }

            if (alvo.dataset.acao === 'voltar' && !estado.dialogoOcupado) {
                fecharDialogo();
            }

            if (alvo.dataset.acao === 'confirmar') {
                confirmarCancelamento();
            }
        });

        dialogoEl.addEventListener('input', evento => {
            if (evento.target.id === 'justificativa-cancelamento') {
                dialogoEl.querySelector('[data-contador="justificativa"]').textContent = `${evento.target.value.length}/300`;
            }

            esconderErroDialogo();
        });

        dialogoEl.addEventListener('change', evento => {
            if (evento.target.name === 'motivo-cancelamento') {
                const rotulo = dialogoEl.querySelector('[data-rotulo-justificativa]');
                rotulo.textContent = evento.target.value === 'outro'
                    ? 'Justificativa para o cidadão (obrigatória)'
                    : 'Justificativa para o cidadão (opcional)';

                esconderErroDialogo();
            }
        });
    }

    function abrirDialogo(codigo, aoConfirmar) {
        estado.focoAntesDialogo = document.activeElement;
        estado.aoConfirmarCancelamento = aoConfirmar;
        estado.dialogoAberto = true;

        dialogoEl.querySelector('[data-dialogo-codigo]').textContent = codigo;
        dialogoEl.querySelectorAll('input[name="motivo-cancelamento"]').forEach(radio => {
            radio.checked = false;
        });
        dialogoEl.querySelector('#justificativa-cancelamento').value = '';
        dialogoEl.querySelector('[data-contador="justificativa"]').textContent = '0/300';
        dialogoEl.querySelector('[data-rotulo-justificativa]').textContent = 'Justificativa para o cidadão (opcional)';
        esconderErroDialogo();

        atualizarTravaDeRolagem();
        mostrarOverlay(dialogoEl);

        setTimeout(() => {
            const primeiro = dialogoEl.querySelector('input[name="motivo-cancelamento"]');

            if (primeiro) {
                primeiro.focus();
            }
        }, 60);
    }

    function fecharDialogo() {
        if (!estado.dialogoAberto) {
            return;
        }

        estado.dialogoAberto = false;
        estado.aoConfirmarCancelamento = null;
        esconderOverlay(dialogoEl);
        atualizarTravaDeRolagem();

        if (estado.focoAntesDialogo && document.contains(estado.focoAntesDialogo)) {
            estado.focoAntesDialogo.focus();
        }
    }

    function mostrarErroDialogo(mensagem) {
        const erro = dialogoEl.querySelector('.dialogo-admin-erro');
        erro.textContent = mensagem;
        erro.hidden = false;
    }

    function esconderErroDialogo() {
        const erro = dialogoEl.querySelector('.dialogo-admin-erro');

        if (erro) {
            erro.hidden = true;
        }
    }

    async function confirmarCancelamento() {
        if (estado.dialogoOcupado || !estado.aoConfirmarCancelamento) {
            return;
        }

        const selecionado = dialogoEl.querySelector('input[name="motivo-cancelamento"]:checked');
        const justificativa = dialogoEl.querySelector('#justificativa-cancelamento').value.trim();

        if (!selecionado) {
            mostrarErroDialogo('Escolha o motivo do cancelamento.');
            return;
        }

        if (selecionado.value === 'outro' && justificativa.length < 10) {
            mostrarErroDialogo('Explique o motivo para o cidadão com pelo menos 10 caracteres.');
            return;
        }

        const btnConfirmar = dialogoEl.querySelector('[data-acao="confirmar"]');
        const btnVoltar = dialogoEl.querySelector('[data-acao="voltar"]');

        estado.dialogoOcupado = true;
        definirCarregando(btnConfirmar, true, 'Cancelando...');
        btnVoltar.disabled = true;

        try {
            await estado.aoConfirmarCancelamento(selecionado.value, justificativa);
            estado.dialogoOcupado = false;
            fecharDialogo();
        } catch (erro) {
            mostrarErroDialogo(erro.message);
        } finally {
            estado.dialogoOcupado = false;
            definirCarregando(btnConfirmar, false);
            btnVoltar.disabled = false;
        }
    }

    function iniciarCancelamento(codigo) {
        if (!codigo) {
            return;
        }

        abrirDialogo(codigo, async (motivo, justificativa) => {
            const dados = await garantirDados(codigo);
            const statusAnterior = dados.status;

            const atualizado = await ServicoAdminOcorrencias.cancelar(codigo, motivo, justificativa);

            aplicarAtualizacao(atualizado, statusAnterior);
            mostrarToast('Ocorrência cancelada', `${codigo} não aparece mais para outros cidadãos.`);
        });
    }


    /*===================================================================
     14. Toast (aviso rápido no canto da tela)
     ===================================================================*/

    function criarAreaToast() {
        areaToast = document.createElement('div');
        areaToast.className = 'toast-admin-area';
        areaToast.setAttribute('aria-live', 'polite');
        document.body.appendChild(areaToast);
    }

    function mostrarToast(titulo, texto) {
        const toast = document.createElement('div');
        toast.className = 'toast-admin';
        toast.innerHTML = `
            <div class="toast-admin-icone">${ICONES.checkPequeno}</div>
            <div class="toast-admin-textos">
                <strong>${esc(titulo)}</strong>
                <span>${esc(texto)}</span>
            </div>
        `;

        areaToast.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('saindo');
            setTimeout(() => toast.remove(), 220);
        }, 4000);
    }


    /*===================================================================
     15. Eventos globais
     ===================================================================*/

    function registrarEventos() {
        // "true" = fase de captura: este listener roda ANTES dos listeners
        // que o seu JS colocou no botão Detalhes. Assim, para o admin,
        // abrimos o modal e o cidadão continua com a tela de detalhes normal.
        document.addEventListener('click', evento => {
            const lixeira = evento.target.closest('.btn-lixeira-admin');

            if (lixeira) {
                evento.preventDefault();
                evento.stopImmediatePropagation();
                iniciarCancelamento(lixeira.dataset.codigo);
                return;
            }

            const detalhes = evento.target.closest('.card-ocorrencias .btn-detalhes');

            if (detalhes) {
                evento.preventDefault();
                evento.stopImmediatePropagation();

                const card = detalhes.closest('.card-ocorrencias');
                abrirModal(obterCodigoDoCard(card));
            }
        }, true);

        document.addEventListener('keydown', evento => {
            if (evento.key !== 'Escape') {
                return;
            }

            const visualizador = document.querySelector('.visualizador-foto-ocorrencia');

            if (visualizador) {
                visualizador.remove();
                return;
            }

            if (estado.dialogoAberto) {
                if (!estado.dialogoOcupado) {
                    fecharDialogo();
                }
                return;
            }

            if (estado.modalCodigo !== null) {
                fecharModal();
            }
        });
    }


    /*===================================================================
     16. Inicialização
     ===================================================================*/

    function iniciar() {
        estado.ehAdmin = usuarioEhAdmin();

        // Cidadão: nada muda.
        if (!estado.ehAdmin) {
            return;
        }

        aplicarVisualAdmin();
        criarModal();
        criarDialogo();
        criarAreaToast();
        registrarEventos();
        observarCards();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

})();