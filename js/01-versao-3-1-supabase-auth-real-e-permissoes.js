let baseAtual = "ILR";

/* =========================
VERSÃO 3.1 - SUPABASE AUTH REAL E PERMISSÕES
========================= */
const PERFIS_NOME = {
    administrador:"Administrador",
    supervisor:"Supervisor",
    consulta:"Consulta"
};

let usuarioLogado = null;

function perfilAtual(){
    return usuarioLogado ? usuarioLogado.perfil : null;
}

function temPermissao(perfis){
    if(!usuarioLogado) return false;
    if(!Array.isArray(perfis)) perfis = [perfis];
    return perfis.includes(usuarioLogado.perfil);
}

function exigirLogin(){
    if(usuarioLogado) return true;
    mostrarLogin();
    return false;
}

function exigirPermissao(perfis, modulo){
    if(!exigirLogin()) return false;
    if(temPermissao(perfis)) return true;
    alert("Acesso negado. Seu perfil não tem permissão para acessar: " + (modulo || "este módulo"));
    return false;
}

function mostrarLogin(){
    const tela = document.getElementById("telaLogin");
    if(tela) tela.style.display = "flex";
    document.body.classList.add("sem-login");
}

function ocultarLogin(){
    const tela = document.getElementById("telaLogin");
    if(tela) tela.style.display = "none";
    document.body.classList.remove("sem-login");
}

async function fazerLogin(){
    const email = (document.getElementById("loginUsuario")?.value || "").trim();
    const senha = document.getElementById("loginSenha")?.value || "";
    const msg = document.getElementById("loginMensagem");

    if(msg) msg.innerHTML = "Entrando...";

    if(!email || !senha){
        if(msg) msg.innerHTML = "Digite e-mail e senha.";
        return;
    }

    try{
        const supabase = obterSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if(error) throw error;

        const usuarioAuth = data?.user;
        if(!usuarioAuth){
            throw new Error("Login não retornou usuário.");
        }

        await carregarPerfilUsuario(usuarioAuth);

        if(!usuarioLogado){
            throw new Error("Perfil não encontrado na tabela usuarios.");
        }

        if(usuarioLogado.status_aprovacao && usuarioLogado.status_aprovacao !== "aprovado"){
            const situacao = usuarioLogado.status_aprovacao === "negado"
                ? "Sua solicitação de conta foi negada pelo administrador."
                : "Sua conta ainda está aguardando aprovação do administrador.";
            await supabase.auth.signOut();
            usuarioLogado = null;
            throw new Error(situacao);
        }

        if(usuarioLogado.ativo === false){
            await supabase.auth.signOut();
            usuarioLogado = null;
            throw new Error("Usuário bloqueado. Procure o administrador.");
        }

        atualizarUsuarioTopo();
        aplicarPermissoesVisuais();
        ocultarLogin();
        voltarInicio();
        registrarAuditoria("login", "Login realizado com sucesso.", { email: email, perfil: usuarioLogado?.perfil || "" });

        if(msg) msg.innerHTML = "";
    }catch(e){
        if(msg) msg.innerHTML = "Erro no login: " + (e.message || e);
    }
}

async function sairSistema(){
    try{
        if(typeof limparChatAoSairV57==="function") limparChatAoSairV57();
        if(typeof marcarOfflinePresencaV56==="function") await marcarOfflinePresencaV56();
        clearInterval(presencaHeartbeatTimerV56);
        await registrarAuditoria("logout", "Logout realizado.", { perfil: usuarioLogado?.perfil || "" });
        const supabase = obterSupabaseClient();
        await supabase.auth.signOut();
    }catch(e){}

    usuarioLogado = null;
    atualizarUsuarioTopo();
    mostrarLogin();
}

async function recuperarSessao(){
    try{
        const supabase = obterSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if(error) throw error;

        const usuarioAuth = data?.session?.user;
        if(usuarioAuth){
            await carregarPerfilUsuario(usuarioAuth);
            if(usuarioLogado && usuarioLogado.ativo !== false && (!usuarioLogado.status_aprovacao || usuarioLogado.status_aprovacao === "aprovado")){
                atualizarUsuarioTopo();
                aplicarPermissoesVisuais();
                ocultarLogin();
                voltarInicio();
                setTimeout(function(){
                    if(typeof carregarHomeIntegradaV502==="function") carregarHomeIntegradaV502(false);
                },300);
                return;
            }
        }
    }catch(e){
        console.warn("Sessão não carregada:", e);
    }
    mostrarLogin();
}

async function carregarPerfilUsuario(usuarioAuth){
    const supabase = obterSupabaseClient();

    let data = null;
    let error = null;

    ({ data, error } = await supabase
        .from("usuarios")
        .select("id,nome,cargo,perfil,ativo,status_aprovacao,avatar_url,status_perfil,recado,ramal,aniversario")
        .eq("id", usuarioAuth.id)
        .maybeSingle());

    // Compatibilidade com bancos antigos onde a coluna ainda não foi criada.
    if(error && (
        error.code === "42703" ||
        String(error.message || "").includes("status_aprovacao")
    )){
        ({ data, error } = await supabase
            .from("usuarios")
            .select("id,nome,cargo,perfil,ativo,avatar_url,status_perfil,recado,ramal,aniversario")
            .eq("id", usuarioAuth.id)
            .maybeSingle());
    }

    if(error) throw error;

    if(!data){
        usuarioLogado = null;
        return;
    }

    usuarioLogado = {
        id: usuarioAuth.id,
        email: usuarioAuth.email,
        nome: data.nome || usuarioAuth.email,
        cargo: data.cargo || "",
        perfil: data.perfil || "consulta",
        ativo: data.ativo !== false,
        status_aprovacao: data.status_aprovacao || "aprovado",
        avatar_url: data.avatar_url || "",
        status_perfil: data.status_perfil || "online",
        recado: data.recado || "",
        ramal: data.ramal || "",
        aniversario: data.aniversario || "",
        email: usuarioAuth?.email || usuarioLogado?.email || ""
    };
}

function atualizarUsuarioTopo(){
    const box=document.getElementById("usuarioTopo");
    const nome=document.getElementById("usuarioNomeTopo");
    const perfil=document.getElementById("usuarioPerfilTopo");
    if(!box)return;

    if(!usuarioLogado){
        box.style.display="none";
        return;
    }

    box.style.display="flex";
    if(nome)nome.textContent=usuarioLogado.nome||usuarioLogado.email;
    if(perfil)perfil.textContent=PERFIS_NOME[usuarioLogado.perfil]||usuarioLogado.perfil;

    atualizarElementosAvatarV610(
        usuarioLogado.avatar_url,
        usuarioLogado.nome||usuarioLogado.email,
        ["usuarioAvatarTopoV610","usuarioMenuAvatarV610"],
        ["usuarioAvatarFallbackV610","usuarioMenuFallbackV610"]
    );

    const menuNome=document.getElementById("usuarioMenuNomeV610");
    const menuCargo=document.getElementById("usuarioMenuCargoV610");
    if(menuNome)menuNome.textContent=usuarioLogado.nome||usuarioLogado.email;
    if(menuCargo)menuCargo.textContent=usuarioLogado.cargo||PERFIS_NOME[usuarioLogado.perfil]||"Usuário";

    if(typeof iniciarPresencaV56==="function")iniciarPresencaV56();
    if(typeof inicializarChatV57==="function")setTimeout(inicializarChatV57,500);
}

function aplicarPermissoesVisuais(){
    const perfil = perfilAtual();
    const menus = document.querySelectorAll(".menu");
    menus.forEach(function(m){
        const txt = (m.innerText || "").toLowerCase();
        if(perfil === "consulta" && (txt.includes("administração") || txt.includes("c.i") || txt.includes("relatórios"))){
            m.style.opacity = ".45";
        }else if(perfil === "supervisor" && txt.includes("administração")){
            m.style.opacity = ".45";
        }else{
            m.style.opacity = "1";
        }
    });
}


/* CONFIGURAÇÃO SUPABASE - CHAVE PÚBLICA DO PROJETO */
const SUPABASE_URL_PADRAO = "https://gtggqsnqayvhekrffibp.supabase.co";
const SUPABASE_ANON_KEY_PADRAO = "sb_publishable_LeGVTf_ktaJ3r6GdO8NBVQ_sMT2Wv0c";
let supabaseClienteCache = null;

const urlILR =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTIeFcwq3BjMqk_93QTashFFBor9bueaWFVzbLdU8utIzm4aShhwjgskdOv_LG4wgLlpRDq_VvQwEXw/pub?gid=868143536&single=true&output=csv";

const urlIMP =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTgCtE4QozXivh1D1NiJa5ogr9kimTwlgJ_E2kaexyj1CZFazTs5ep6BYVI3zQ1sdkHK9FQcFRyAqCD/pub?gid=885845663&single=true&output=csv";

/* ID CORRETO DA PLANILHA C.I */
const idPlanilhaCI = "1f_PHzoITB018EQi6Ho5Xh0pI23NU7STVmDuF-7fpXYE";

/* URL BASE CORRIGIDA */
const linksCIEdit = {
    regiao:"https://docs.google.com/spreadsheets/d/" + idPlanilhaCI + "/edit#gid=546284772",
    teresina:"https://docs.google.com/spreadsheets/d/" + idPlanilhaCI + "/edit#gid=2077587325",
    pmr:"https://docs.google.com/spreadsheets/d/" + idPlanilhaCI + "/edit#gid=324543846",
    geit:"https://docs.google.com/spreadsheets/d/" + idPlanilhaCI + "/edit#gid=2126848667",
    assurant:"https://docs.google.com/spreadsheets/d/" + idPlanilhaCI + "/edit#gid=1058368228",
    outros:"https://docs.google.com/spreadsheets/d/" + idPlanilhaCI + "/edit#gid=1457022937"
};

/* ABA REXPEDLR COMO BANCO DE DADOS */
const urlBancoREXPEDLR =
"https://docs.google.com/spreadsheets/d/1f_PHzoITB018EQi6Ho5Xh0pI23NU7STVmDuF-7fpXYE/gviz/tq?tqx=out:csv&gid=885845663";

let bancoREXPEDLR = [];
let bancoCarregado = false;

/* Bancos opcionais para a C.I REGIÃO.
   Se depois você publicar as abas CADASTRO e LOJAS em CSV, basta colocar os links abaixo.
   Sem esses links, o app mantém os campos editáveis e usa a própria sigla da loja como destino. */
const urlBancoCadastroCI = "";
const urlBancoLojasCI = "";
let bancoCadastroCI = [];
let bancoLojasCI = [];
let bancoCadastroCarregado = false;
let bancoLojasCarregado = false;

let planilhaCI = null;
let preenchendoCI = false;

let cacheCSV = "";
let linhasPlanilha = [];
let cabecalhoPlanilha = [];

let ciAtual = "";
let ciClientesDestinoPrimeiraOS = "";

const nomesCI = {
    regiao: "C.I REGIÃO",
    teresina: "C.I TEREZINA",
    pmr: "C.I PMR",
    geit: "C.I GEIT",
    assurant: "C.I ASSURANT",
    outros: "C.I OUTROS"
};

function atualizarHora(){
    const agora = new Date();
    document.getElementById("dataHoje").innerHTML =
        "▣ " + agora.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
    document.getElementById("horaAtual").innerHTML =
        "◷ " + agora.toLocaleTimeString("pt-BR");
}

setInterval(atualizarHora,1000);
atualizarHora();

function toggleMenu(){
    document.getElementById("sidebar").classList.toggle("mobile-open");
}

function abrirListaBase(){
    const lista = document.getElementById("listaBase");
    lista.style.display = lista.style.display === "block" ? "none" : "block";
}

function esconderTelas(){
    [
        "telaInicio","telaColeta","telaCI","telaBusca","telaFicha","telaGerarCI","telaPlanilhaCI",
        "telaAdmin","telaAdminAtualizar","telaAdminUsuarios","telaAdminPresenca","telaAdminLojas",
        "telaAdminHistorico","telaAdminHistoricoCI","telaAdminAuditoria","telaAdminConfig","telaAdminBackup","telaRelatorios","telaInteligencia","telaMonitoramentoCPP","telaClientes"
    ].forEach(function(id){
        const el = document.getElementById(id);
        if(el) el.style.display = "none";
    });
}

function definirMenuAtivo(chave){
    document.querySelectorAll("#sidebar .menu").forEach(function(item){
        item.classList.toggle("active", item.dataset.menu === chave);
    });
}

function voltarInicio(){
    esconderTelas();
    definirMenuAtivo("inicio");
    document.getElementById("telaInicio").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
    setTimeout(function(){
        if(typeof carregarHomeIntegradaV502==="function") carregarHomeIntegradaV502(false);
    },50);
}

function abrirTelaCI(){
    if(!exigirPermissao(["administrador","supervisor"], "C.I Devoluções")) return;
    esconderTelas();
    definirMenuAtivo("ci");
    document.getElementById("telaCI").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
}

function abrirCI(nome){
    if(!linksCIEdit[nome]) return;

    document.querySelectorAll("#telaPlanilhaCI .ci-edit-actions .btn-voltar").forEach(function(btn){
        if((btn.textContent || "").trim() === "Voltar para CLIENTES"){
            btn.onclick = abrirTelaCI;
            btn.textContent = "Voltar para C.I";
        }
        if((btn.textContent || "").trim() === "Área de Clientes"){
            btn.onclick = voltarInicio;
            btn.textContent = "Página inicial";
        }
    });

    ciAtual = nome;

    esconderTelas();
    definirMenuAtivo("ci");

    document.getElementById("tituloCIEditavel").innerHTML =
        nomesCI[nome] || "C.I DEVOLUÇÕES";

    aplicarModeloCIVisual();

    if(nome === "outros"){
        document.getElementById("ciEditMensagem").innerHTML =
            "C.I OUTROS livre para edição. Este modelo não usa dropdowns, tabela ou busca automática.";
        montarCIOutrosEditavel();
        document.getElementById("telaPlanilhaCI").style.display = "block";
        document.getElementById("sidebar").classList.remove("mobile-open");
        return;
    }

    document.getElementById("ciEditMensagem").innerHTML =
        "Digite a O.S na coluna O.S. Os dados serão puxados da aba REXPEDLR.";

    montarGradeCIEditavel();

    document.getElementById("telaPlanilhaCI").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");

    carregarBancoREXPEDLR().then(function(){
        document.getElementById("ciEditMensagem").innerHTML =
            "Banco REXPEDLR carregado. Pode digitar as O.S.";
    }).catch(function(e){
        document.getElementById("ciEditMensagem").innerHTML =
            "Erro ao carregar REXPEDLR: " + e.message;
    });
}

function aplicarModeloCIVisual(){
    document.body.classList.remove("ci-geit", "ci-outros", "ci-regiao-clientes");
    const topoPadraoCI = document.querySelector(".ci-edit-top div:first-child");
    if(topoPadraoCI) topoPadraoCI.innerHTML = "IDB - Logística Reversa";
    const destino = document.getElementById("ciDestinoTitulo");
    const ac = document.querySelector(".ci-edit-ac");
    const msg = document.getElementById("ciTextoMensagem");
    const danfe = document.getElementById("ciTextoDanfe");

    if(!destino || !ac || !msg || !danfe) return;

    ac.style.height = "";
    ac.style.lineHeight = "";
    ac.style.margin = "";
    ac.style.overflow = "";
    ac.setAttribute("contenteditable", "true");

    if(ciAtual === "regiao_clientes"){
        document.body.classList.add("ci-regiao-clientes");
        ciClientesDestinoPrimeiraOS = "";
        const topoTitulo = document.querySelector(".ci-edit-top div:first-child");
        if(topoTitulo) topoTitulo.innerHTML = "IDC";
        destino.innerHTML = "AUG";
        ac.innerHTML = "";
        ac.style.height = "0";
        ac.style.lineHeight = "0";
        ac.style.margin = "0";
        ac.style.overflow = "hidden";
        ac.removeAttribute("contenteditable");
        msg.innerHTML = `
            <option>ESTAMOS ENVIANDO MERCADORIA(S) DEVIDAMENTE CONSERTADA(S) ACOBERTADA(S)</option>
            <option>ESTAMOS ENVIANDO MERCADORIA(S) SEM CONSERTO ACOBERTADA(S)</option>
            <option>ESTAMOS ENVIANDO MERCADORIA(S) TROCADA(S) PELO FABRICANTE ACOBERTADA(S)</option>
            <option>ESTAMOS ENVIANDO MERCADORIA(S) SEM DEFEITO ACOBERTADA(S)</option>
            <option>ESTAMOS ENVIANDO MERCADORIA(S) PARA CONSERTO ACOBERTADA(S)</option>
            <option>ESTAMOS ENVIANDO SOMENTE PEÇA(S) DE REPOSIÇÃO ACOBERTADA(S)</option>
            <option>ESTAMOS DEVOLVENDO SALDO 99, TROCA OU DEVOLUÇÃO COMERCIAL</option>
        `;
        danfe.innerHTML = `
            <option>PELO(S) DANFE(S) :____________________</option>
            <option>PELO(S) DANFE(S):____________________</option>
            <option>PELO(S) DANFE(S) INFORMADO(S) ABAIXO</option>
            <option>.</option>
        `;

        const obs = document.querySelector(".ci-edit-obs");
        if(obs) obs.innerHTML = `
            <div style="background:#3a3838;color:white;display:inline-block;padding:2px 6px;font-weight:bold;">Observações:</div>
            <div contenteditable="true">1. Favor confirmar o recebimento, devolvendo a 2ª via devidamente assinada e citando número de N.F.<br>ao dar baixa em estoque.<br>2. Como medida preventiva e evitar transtornos futuros, solicitamos manter em vossa loja, documento<br>assinado e datado pelo recebedor, comprovando a devolução do produto consertado. <b>(ficha entrega)</b></div>
        `;

        atualizarTextoMensagemCI();

        const assinatura = document.querySelector(".ci-edit-assinatura");
        if(assinatura) assinatura.innerHTML = `
            <div>
                <div style="display:flex;align-items:center;margin-bottom:4px;">
                    <div class="ci-edit-logo"></div>
                    <b><i>Confirmo Embarque - IDC</i></b>
                </div>
                <div class="ci-edit-small">
                    <b><i>VOL:</i></b>_______<b><i>Em</i></b>_______/_______/_______<br>
                    <b><i>Visto:</i></b>_____________________________<br>
                    <b>TOTAL DE VOLUME:</b> &nbsp;&nbsp; <span id="ciTotalVolumes">1</span>
                </div>
            </div>
            <div class="ci-edit-small">
                <b>PESO TOTAL:</b> ______ <span contenteditable="true">11,900</span> ______ kg<br>
                <b>CUBAGEM TOTAL:</b> ____ <span contenteditable="true">0,1152</span> ____ m3
            </div>
            <div class="ci-edit-nome" contenteditable="true">Marcos Silva</div>
        `;
    }else if(ciAtual === "regiao"){
        const topoTitulo = document.querySelector(".ci-edit-top div:first-child");
        if(topoTitulo) topoTitulo.innerHTML = "IDB - Logística Reversa";
        destino.innerHTML = "RDP";
        ac.innerHTML = "A/C.: GERÊNCIA";
        msg.innerHTML = `
            <option>ESTAMOS ENVIANDO MERCADORIA(S) DEVIDAMENTE CONSERTADA(S) ACOBERTADA(S)</option>
            <option>ESTAMOS ENVIANDO MERCADORIA(S) PARA DEVOLUÇÃO AO DESTINO INFORMADO</option>
            <option>ESTAMOS ENVIANDO MERCADORIA(S) CONFORME RELAÇÃO ABAIXO</option>
        `;
        danfe.innerHTML = `
            <option>PELO(S) DANFE(S) :_________</option>
            <option>PELO(S) DANFE(S):____________________</option>
            <option>.</option>
        `;
    }else if(ciAtual === "pmr"){
        destino.innerHTML = "ATT";
        ac.innerHTML = "A/C.: MENDES / EDIVAN / ALEXANDRE";
        msg.innerHTML = `
            <option>Estamos enviando produtos abaixo com Defeito, os mesmos não possuem Notas de Compras em nosso</option>
            <option>Estamos enviando produtos abaixo com Defeito, o mesmo retornou da Autorizada sem Garantia,</option>
            <option>Estamos enviando produtos abaixo com Defeito, conforme autorização de envio pelo Srº Mendes</option>
        `;
        danfe.innerHTML = `
            <option>posto, conforme orientações do Sr. Alexandre, seguem todas com O.S TTR geradas e acobertadas pelas</option>
            <option>conforme orientações do Sr. Alexandre, seguem todas com O.S TTR geradas e acobertadas pelas</option>
            <option>Regional RM4, seguem todas com O.S TTR geradas e acobertadas pelas</option>
        `;
    }else if(ciAtual === "teresina" || ciAtual === "assurant"){
        destino.innerHTML = "ATT";
        ac.innerHTML = "A/C.: Srs. Mendes/Edivan";
        msg.innerHTML = `
            <option>Estamos enviando mercadorias abaixo com Defeito e Não Autorizados reparo por nossa Unidade, Regional RM1</option>
            <option>Estamos enviando mercadorias abaixo com LCD Quebrado, em Anexo tratativas via Email com Lojas de Origem,</option>
            <option>Estamos enviando mercadorias de Devolução Comercial, tratam-se de produtos impossibilitados de</option>
            <option>Estamos enviando mercadorias abaixo Fora de Garantia e sem Condições de Conserto</option>
            <option>Estamos enviando mercadorias de troca da seguradora Assurant para Descarte e/ou Reaproveitamento</option>
            <option>Estamos enviando mercadorias abaixo de USO e Sem Condições de Conserto</option>
            <option>Estamos enviando mercadorias abaixo, solicitado pelo SCO, Tratam-se de produtos DC2</option>
            <option>Estamos enviando mercadorias do fornecedor ARNO conforme solicitadas pelo Sr. Mendes</option>
            <option>Estamos enviando produtos Trocados pelo Fabricante, seguem todas acobertadas pelo DANFE:_____</option>
        `;
        danfe.innerHTML = `
            <option>seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____________________</option>
            <option>de Origem, Regional RM4, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____</option>
            <option>de Origem, Regional RM1, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____</option>
            <option>interno e Fora de Garantia, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____</option>
            <option>em TDC, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____</option>
            <option>devolver por nosso Posto, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____</option>
            <option>.</option>
        `;
    }else if(ciAtual === "geit"){
        document.body.classList.add("ci-geit");
        destino.innerHTML = "ATT";
        ac.innerHTML = "A/C.: MENDES / EDIVAN";
        msg.innerHTML = `
            <option>Estamos enviando mercadorias de troca da seguradora Assurant para Descarte e/ou Reaproveitamento</option>
            <option>Estamos enviando CHIP's para Descarte ou Reaproveitamento em TDC, seguem todas com O.S TTR geradas</option>
            <option>Estamos enviando produtos Trocados pelo Fabricante, segue acobertadas pelo(S) DANFE(S):</option>
            <option>Estamos enviando produtos de uso que foram substituidos em ARG para reaproveitamento</option>
        `;
        danfe.innerHTML = `
            <option>em TDC, segue acobertadas pelo(S) DANFE(S):____________</option>
            <option>e acobertadas pelo(S) DANFE(S):______Caixas Coletoras Nº:____________, Lacres Nº:________________.</option>
            <option>.</option>
        `;
    }else if(ciAtual === "assurant"){
        destino.innerHTML = "ATT";
        ac.innerHTML = "A/C: MENDES / EDIVAN";
        msg.innerHTML = `
            <option>Estamos enviando mercadorias abaixo Fora de Garantia e sem Condições de Conserto</option>
            <option>Estamos enviando mercadorias abaixo com LCD Quebrado, em Anexo tratativas via Email com Lojas de Origem,</option>
            <option>Estamos enviando mercadorias abaixo com Defeito e Não Autorizados reparo por nossa Unidade,</option>
            <option>Estamos enviando mercadorias abaixo com Defeito, tratam-se de Refrigeradores com vazamentos</option>
            <option>Estamos enviando uma lavadora de cliente, a mesma recusou o produto consertado</option>
            <option>Estamos enviando mercadorias de troca da seguradora Assurant para Descarte e/ou Reaproveitamento</option>
        `;
        danfe.innerHTML = `
            <option>em TDC, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):______________</option>
            <option>de Origem, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):______________</option>
            <option>seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):______________</option>
            <option>interno e Fora de Garantia, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):</option>
            <option>em TDC, seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):______________</option>
        `;
    }else if(ciAtual === "outros"){
        document.body.classList.add("ci-outros");
        destino.innerHTML = "ATT";
        ac.innerHTML = "A/C: Srs. Mendes/Edivan";
        msg.innerHTML = "";
        danfe.innerHTML = "";
    }else{
        destino.innerHTML = "RDP";
        ac.innerHTML = "A/C.: GERÊNCIA";
    }
}

async function carregarBancoREXPEDLR(){
    if(bancoCarregado) return;

    const resp = await fetch(urlBancoREXPEDLR);

    if(!resp.ok){
        throw new Error("Não foi possível carregar a aba REXPEDLR. Verifique se a planilha está publicada/compartilhada.");
    }

    const csv = await resp.text();
    const linhas = csv.split(/\r?\n/).filter(l => l.trim() !== "");

    bancoREXPEDLR = linhas.map(linha => parseCSVLine(linha));
    bancoCarregado = true;
}

async function carregarBancoCadastroCI(){
    if(bancoCadastroCarregado) return;
    bancoCadastroCarregado = true;
    if(!urlBancoCadastroCI) return;

    const resp = await fetch(urlBancoCadastroCI);
    if(!resp.ok) return;
    const csv = await resp.text();
    bancoCadastroCI = csv.split(/\r?\n/).filter(l => l.trim() !== "").map(linha => parseCSVLine(linha));
}

async function carregarBancoLojasCI(){
    if(bancoLojasCarregado) return;
    bancoLojasCarregado = true;
    if(!urlBancoLojasCI) return;

    const resp = await fetch(urlBancoLojasCI);
    if(!resp.ok) return;
    const csv = await resp.text();
    bancoLojasCI = csv.split(/\r?\n/).filter(l => l.trim() !== "").map(linha => parseCSVLine(linha));
}

function buscarCadastroCI(os){
    const chave = somenteNumeros(os);
    for(let i = 1; i < bancoCadastroCI.length; i++){
        const linha = bancoCadastroCI[i];
        if(somenteNumeros(linha[0] || "") === chave){
            return linha[1] || "";
        }
    }
    return "";
}

function buscarLojaDestinoCI(lojaOrigem){
    const chave = normalizarTexto(lojaOrigem);
    for(let i = 1; i < bancoLojasCI.length; i++){
        const linha = bancoLojasCI[i];
        if(normalizarTexto(linha[0] || "") === chave){
            return linha[1] || "";
        }
    }
    return lojaOrigem || "";
}

function atualizarDestinoTopoRegiao(){
    if(ciAtual !== "regiao" || !planilhaCI) return;

    let destino = "";
    for(let i = 0; i < configCIAtual().rows; i++){
        destino = planilhaCI.getValueFromCoords(9, i);
        if(String(destino || "").trim() !== "") break;
    }

    document.getElementById("ciDestinoTitulo").innerHTML = destino || "RDP";
}

function separarLista(texto){
    return String(texto || "")
        .split(/[\n,;]+/)
        .map(x => x.trim())
        .filter(x => x !== "");
}

function buscarOSBanco(os){
    const osLimpa = somenteNumeros(os);

    for(let i = 1; i < bancoREXPEDLR.length; i++){
        const linha = bancoREXPEDLR[i];
        const osBanco = somenteNumeros(linha[0] || "");

        if(osBanco === osLimpa){
            return {
                os: linha[0] || os,
                data: linha[1] || "",
                loja: linha[2] || "",
                gr: linha[5] || "",
                nce: linha[6] || "",
                descricao: linha[7] || "",
                cor: linha[8] || "",
                serie: linha[9] || "",
                valorTrans: linha[10] || "",
                tecnico: linha[11] || "",
                rack: linha[12] || "",
                status: linha[13] || "",
                usuario: linha[14] || ""
            };
        }
    }

    return null;
}



function atualizarTextoMensagemCI(){
    ["ciTextoMensagem", "ciTextoDanfe"].forEach(function(id){
        const select = document.getElementById(id);
        if(select){
            select.setAttribute("data-print-text", select.value);
        }
    });
}


function configCIAtual(){
    if(ciAtual === "regiao_clientes"){
        return {
            osCol:8,
            rowLength:10,
            rows:6,
            columns:[
                { title:"AL", width:24, readOnly:true },
                { title:"GR", width:24, readOnly:true },
                { title:"NCE", width:48, readOnly:true },
                { title:"DESCRIÇÃO", width:250, readOnly:true, wordWrap:false },
                { title:"COR", width:40, readOnly:true },
                { title:"VOL", width:34, readOnly:false },
                { title:"NF.\nORIGEM", width:62, readOnly:false },
                { title:"C.I.\nORIGEM", width:62, readOnly:false },
                { title:"O.S", width:58 },
                { title:"CLIENTE", width:118, readOnly:true }
            ]
        };
    }
    if(ciAtual === "teresina" || ciAtual === "assurant"){
        return {
            osCol:5,
            rowLength:8,
            rows:10,
            columns:[
                { title:"AL", width:20, readOnly:true },
                { title:"GR", width:19, readOnly:true },
                { title:"NCE", width:42, readOnly:true },
                { title:"DESCRIÇÃO", width:294, readOnly:true, wordWrap:false },
                { title:"COR", width:115, readOnly:true },
                { title:"O.S", width:57 },
                { title:"OS TTR", width:83 },
                { title:"LOJA DE\nORIGEM", width:83, readOnly:true }
            ]
        };
    }

    if(ciAtual === "regiao"){
        return {
            osCol:7,
            rowLength:10,
            rows:8,
            columns:[
                { title:"AL", width:20, readOnly:true },
                { title:"GR", width:19, readOnly:true },
                { title:"NCE", width:42, readOnly:true },
                { title:"DESCRIÇÃO", width:239, readOnly:true, wordWrap:false },
                { title:"COR", width:55, readOnly:true },
                { title:"NF.\nORIGEM", width:66, readOnly:false },
                { title:"CI.\nORIGEM", width:49, readOnly:false },
                { title:"O.S", width:47 },
                { title:"LOJA DE\nORIGEM", width:83, readOnly:true },
                { title:"LOJA DE\nDESTINO", width:83, readOnly:true }
            ]
        };
    }

    if(ciAtual === "geit"){
        return {
            osCol:6,
            rowLength:7,
            rows:12,
            headerRow:true,
            columns:[
                { title:"", width:20 },
                { title:"", width:19 },
                { title:"", width:57 },
                { title:"", width:390, wordWrap:false },
                { title:"", width:115 },
                { title:"", width:30 },
                { title:"", width:76 }
            ]
        };
    }

    return {
        osCol:7,
        rowLength:10,
        rows:8,
        columns:[
            { title:"AL", width:20, readOnly:true },
            { title:"GR", width:19, readOnly:true },
            { title:"NCE", width:42, readOnly:true },
            { title:"DESCRIÇÃO", width:239, readOnly:true, wordWrap:false },
            { title:"COR", width:55, readOnly:true },
            { title:"NF.\nORIGEM", width:66, readOnly:false },
            { title:"CI.\nORIGEM", width:49, readOnly:false },
            { title:"O.S", width:47 },
            { title:"LOJA DE\nORIGEM", width:83, readOnly:true },
            { title:"LOJA DE\nDESTINO", width:83, readOnly:true }
        ]
    };
}

function osColCI(){ return configCIAtual().osCol; }

function habilitarRedimensionamentoColunasCIClientes(){
    if(ciAtual !== "regiao_clientes" || !planilhaCI) return;
    const tabela = document.querySelector("#planilhaCI table.jexcel, #planilhaCI table");
    if(!tabela) return;
    const headers = tabela.querySelectorAll("thead tr td[data-x], thead tr td");
    const chave = "CI_CLIENTES_LARGURAS_V756";
    let salvas = [];
    try{ salvas = JSON.parse(localStorage.getItem(chave) || "[]"); }catch(_){ salvas=[]; }

    function aplicarLargura(indice, largura){
        largura = Math.max(20, Math.round(Number(largura) || 20));
        try{
            if(planilhaCI && typeof planilhaCI.setWidth === "function") planilhaCI.setWidth(indice, largura);
        }catch(_){ }
        tabela.querySelectorAll('[data-x="'+indice+'"]').forEach(function(c){
            c.style.width = largura + "px";
            c.style.minWidth = largura + "px";
            c.style.maxWidth = largura + "px";
        });
    }

    headers.forEach(function(th, pos){
        const indiceAttr = th.getAttribute("data-x");
        const indice = indiceAttr !== null ? Number(indiceAttr) : pos - (headers.length > configCIAtual().rowLength ? 1 : 0);
        if(indice < 0 || indice >= configCIAtual().rowLength) return;
        if(salvas[indice]) aplicarLargura(indice, salvas[indice]);
        if(th.querySelector(".cli-ci-resize-handle")) return;
        const handle = document.createElement("span");
        handle.className = "cli-ci-resize-handle";
        handle.title = "Arraste para alterar a largura desta coluna";
        handle.addEventListener("mousedown", function(ev){
            ev.preventDefault(); ev.stopPropagation();
            const inicioX = ev.clientX;
            const inicioW = th.getBoundingClientRect().width;
            function mover(e){ aplicarLargura(indice, inicioW + (e.clientX - inicioX)); }
            function soltar(){
                document.removeEventListener("mousemove", mover);
                document.removeEventListener("mouseup", soltar);
                const atuais=[];
                for(let i=0;i<configCIAtual().rowLength;i++){
                    const cel=tabela.querySelector('[data-x="'+i+'"]');
                    atuais[i]=cel ? Math.round(cel.getBoundingClientRect().width) : null;
                }
                localStorage.setItem(chave, JSON.stringify(atuais));
            }
            document.addEventListener("mousemove", mover);
            document.addEventListener("mouseup", soltar);
        });
        th.appendChild(handle);
    });
}

function montarGradeCIEditavel(){
    if(typeof window.jSuites==="undefined"){
        throw new Error("A biblioteca jSuites não foi carregada. Verifique se este computador consegue acessar cdn.jsdelivr.net.");
    }
    if(typeof window.jspreadsheet!=="function" && typeof window.jexcel!=="function"){
        throw new Error("A biblioteca JSpreadsheet não foi carregada. Verifique se este computador consegue acessar cdn.jsdelivr.net.");
    }

    const criarPlanilha = typeof window.jspreadsheet==="function" ? window.jspreadsheet : window.jexcel;
    const topoTitulo = document.querySelector(".ci-edit-top div:first-child");
    if(topoTitulo) topoTitulo.removeAttribute("contenteditable");
    document.getElementById("ciHoraAtual").removeAttribute("contenteditable");
    document.getElementById("ciDataAtual").removeAttribute("contenteditable");
    document.getElementById("ciDestinoTitulo").removeAttribute("contenteditable");

    document.getElementById("ciHoraAtual").innerHTML = horaAtualCI();
    document.getElementById("ciDataAtual").innerHTML = dataAtualCI();

    const cfg = configCIAtual();
    const dadosIniciais = [];
    for(let i = 0; i < cfg.rows; i++){
        const linha = Array(cfg.rowLength).fill("");

        if(ciAtual === "geit" && i === 0){
            linha[0] = "AL";
            linha[1] = "GR";
            linha[2] = "NCE";
            linha[3] = "DESCRIÇÃO";
            linha[4] = "COR";
            linha[5] = "";
            linha[6] = "O.S IMP";
        }else{
            if(ciAtual === "regiao_clientes"){
                linha[0] = "99";
                linha[5] = "1";
            }else{
                linha[0] = "1";
            }
        }

        dadosIniciais.push(linha);
    }

    const container = document.getElementById("planilhaCI");
    container.innerHTML = "";

    planilhaCI = criarPlanilha(container, {
        data: dadosIniciais,
        columns: cfg.columns,
        minDimensions:[cfg.rowLength,cfg.rows],
        tableOverflow:false,
        allowInsertColumn:false,
        allowDeleteColumn:false,
        allowRenameColumn:false,
        allowInsertRow:false,
        allowDeleteRow:false,
        columnDrag:false,
        rowDrag:false,
        contextMenu:false,
        onchange:function(instance, cell, x, y, value){
            if(preenchendoCI) return;
            x = Number(x);
            y = Number(y);

            if(x === osColCI()){
                if(ciAtual === "geit"){
                    atualizarTotalVolumesCI();
                }else if(ciAtual !== "regiao_clientes"){
                    // Nas C.I. de clientes a busca ocorre no Enter/colar para evitar
                    // que a O.S. seja apagada enquanto o usuário ainda está digitando.
                    preencherLinhaCIEditavel(y, value);
                }
            }else if(ciAtual === "regiao" && x === 8){
                const destino = buscarLojaDestinoCI(value) || value;
                planilhaCI.setValueFromCoords(9, y, destino, true);
                atualizarDestinoTopoRegiao();
            }
        },
        onload:function(){
            configurarEnterJSpreadsheet();
            configurarTTRPorCI();
            atualizarTotalVolumesCI();
        }
    });

    setTimeout(function(){
        configurarEnterJSpreadsheet();
        configurarTTRPorCI();
        atualizarTotalVolumesCI();
        habilitarRedimensionamentoColunasCIClientes();
    }, 300);
}


function montarCIOutrosEditavel(){
    document.getElementById("ciHoraAtual").innerHTML = horaAtualCI();
    document.getElementById("ciDataAtual").innerHTML = dataAtualCI();

    const topoTitulo = document.querySelector(".ci-edit-top div:first-child");
    const hora = document.getElementById("ciHoraAtual");
    const data = document.getElementById("ciDataAtual");
    const destino = document.getElementById("ciDestinoTitulo");
    const ac = document.querySelector(".ci-edit-ac");

    if(topoTitulo) topoTitulo.setAttribute("contenteditable", "true");
    if(hora) hora.setAttribute("contenteditable", "true");
    if(data) data.setAttribute("contenteditable", "true");
    if(destino) destino.setAttribute("contenteditable", "true");
    if(ac) ac.setAttribute("contenteditable", "true");

    planilhaCI = null;

    const container = document.getElementById("planilhaCI");
    container.innerHTML = `
        <div class="ci-outros-doc">
            <div class="ci-outros-msg" contenteditable="true">Estamos UM volume contendo 02 hélices de Codensadores de Ar substituidos da Filial de IMP.</div>
            <div class="ci-outros-linha-editavel" contenteditable="true"></div>
            <div class="ci-outros-area-vazia" contenteditable="true"></div>

            <div class="ci-outros-observacoes">
                <div class="ci-outros-observacoes-titulo" contenteditable="true">Observações:</div>
                <div class="ci-outros-observacoes-texto" contenteditable="true"></div>
            </div>
            <div class="ci-outros-linha-editavel" contenteditable="true"></div>
            <div style="height:11px" contenteditable="true"></div>

            <div class="ci-outros-rodape">
                <div>
                    <div class="ci-outros-logo-linha">
                        <div class="ci-outros-logo" contenteditable="true"></div>
                        <div class="ci-outros-embarque" contenteditable="true">Confirmo Embarque - IDC</div>
                    </div>
                    <div class="ci-outros-campo" contenteditable="true">VOL:______Em______/______/______</div>
                    <div class="ci-outros-campo" contenteditable="true">Visto:___________________________</div>
                    <div class="ci-outros-total">
                        <div class="ci-outros-total-label" contenteditable="true">TOTAL DE VOLUME:</div>
                        <div contenteditable="true">1</div>
                    </div>
                </div>

                <div class="ci-outros-peso">
                    <div><span contenteditable="true">PESO TOTAL:</span> <span class="ci-outros-valor" contenteditable="true">20,000</span> <span contenteditable="true">kg</span></div>
                    <div><span contenteditable="true">CUBAGEM TOTAL:</span> <span class="ci-outros-valor" contenteditable="true">0,5000</span> <span contenteditable="true">m3</span></div>
                </div>

                <div class="ci-outros-nome" contenteditable="true">Allan Kevin</div>
            </div>
        </div>
    `;
}

function limparCIOutrosEditavel(){
    montarCIOutrosEditavel();
    document.getElementById("ciEditMensagem").innerHTML = "C.I OUTROS restaurada para o modelo original.";
}

function configurarTTRPorCI(){
    return;
}

function configurarEnterJSpreadsheet(){
    const area = document.getElementById("planilhaCI");
    if(!area) return;

    area.onkeydown = async function(e){
        if(e.key !== "Enter") return;

        const celulaAlvo = e.target && e.target.closest
            ? e.target.closest("td[data-x][data-y]")
            : null;
        const selecionada = celulaAlvo || document.querySelector("#planilhaCI td.highlight[data-x][data-y]");

        let x = selecionada ? Number(selecionada.getAttribute("data-x")) : osColCI();
        let y = selecionada ? Number(selecionada.getAttribute("data-y")) : 0;

        if(x !== osColCI()) return;
        e.preventDefault();
        e.stopPropagation();

        let valor = "";
        const alvo = e.target;
        if(alvo){
            if(typeof alvo.value !== "undefined") valor = alvo.value;
            else if(alvo.isContentEditable) valor = alvo.textContent;
        }
        if(!String(valor || "").trim() && planilhaCI){
            valor = planilhaCI.getValueFromCoords(x, y);
        }

        valor = String(valor || "").trim();
        if(planilhaCI && valor){
            try{ planilhaCI.setValueFromCoords(x, y, valor, true); }catch(_){ }
        }

        if(ciAtual === "geit"){
            atualizarTotalVolumesCI();
        }else{
            await preencherLinhaCIEditavel(y, valor);
        }

        if(planilhaCI){
            const proximaLinha = Math.min(y + 1, configCIAtual().rows - 1);
            try{ planilhaCI.updateSelectionFromCoords(osColCI(), proximaLinha, osColCI(), proximaLinha); }catch(_){ }
        }
        return false;
    };

    // Colar ou sair da célula também dispara a consulta, sem apagar o valor digitado.
    area.addEventListener("paste", function(e){
        const td = e.target && e.target.closest ? e.target.closest("td[data-x][data-y]") : null;
        if(!td || Number(td.getAttribute("data-x")) !== osColCI()) return;
        const y = Number(td.getAttribute("data-y") || 0);
        setTimeout(function(){
            const valor = planilhaCI ? planilhaCI.getValueFromCoords(osColCI(), y) : "";
            if(String(valor || "").trim()) preencherLinhaCIEditavel(y, valor);
        }, 80);
    });
}

function normalizarOSCIClientes(valor){
    if(typeof normalizarOSClientes === "function") return normalizarOSClientes(valor);
    return String(valor ?? "")
        .trim()
        .toUpperCase()
        .replace(/^ILR\s*/i, "")
        .replace(/\.0+$/, "")
        .replace(/[^0-9A-Z]/g, "");
}

async function buscarOSClientesDireto(os){
    const chave = normalizarOSCIClientes(os);
    if(!chave) return null;

    const memoriaLista = Array.isArray(window.clientesDadosCombinados)
        ? window.clientesDadosCombinados
        : (typeof clientesDadosCombinados !== "undefined" && Array.isArray(clientesDadosCombinados) ? clientesDadosCombinados : []);
    const memoria = memoriaLista.find(r => normalizarOSCIClientes(r.os) === chave);
    if(memoria) return memoria;

    const supa = obterSupabaseClientes();

    // A coluna é text, porém planilhas antigas podem ter espaços, prefixo ILR ou sufixo .0.
    const candidatos = Array.from(new Set([
        String(os ?? "").trim(),
        chave,
        "ILR " + chave,
        chave + ".0"
    ].filter(Boolean)));

    let item = null;
    for(const candidato of candidatos){
        const resp = await supa.from("rexpedlr_clientes").select("*").eq("os", candidato).limit(1);
        if(resp.error) throw resp.error;
        if(resp.data && resp.data.length){ item = resp.data[0]; break; }
    }

    // Último recurso: procura uma faixa curta e compara já normalizado.
    if(!item){
        const resp = await supa.from("rexpedlr_clientes").select("*").ilike("os", "%" + chave + "%").limit(100);
        if(resp.error) throw resp.error;
        item = (resp.data || []).find(r => normalizarOSCIClientes(r.os) === chave) || null;
    }
    if(!item) return null;

    let nome = "";
    for(const candidato of candidatos){
        const resp = await supa.from("ratec04_clientes").select("os,nome_cliente").eq("os", candidato).limit(1);
        if(resp.error) throw resp.error;
        if(resp.data && resp.data.length){ nome = resp.data[0].nome_cliente || ""; break; }
    }
    if(!nome){
        const resp = await supa.from("ratec04_clientes").select("os,nome_cliente").ilike("os", "%" + chave + "%").limit(100);
        if(!resp.error){
            const achado = (resp.data || []).find(r => normalizarOSCIClientes(r.os) === chave);
            nome = achado ? (achado.nome_cliente || "") : "";
        }
    }

    return { ...item, nome_cliente: nome };
}

function atualizarDestinoCIClientesPelaPrimeiraOS(){
    if(ciAtual !== "regiao_clientes" || !planilhaCI) return;
    let destino = "";
    for(let i=0;i<configCIAtual().rows;i++){
        const osLinha = String(planilhaCI.getValueFromCoords(configCIAtual().osCol, i) || "").trim();
        if(!osLinha) continue;
        const chave = normalizarOSCIClientes(osLinha);
        const lista = Array.isArray(window.clientesDadosCombinados) ? window.clientesDadosCombinados : [];
        const item = lista.find(r => normalizarOSCIClientes(r.os) === chave);
        if(item){
            destino = String(item.pdv || item.loja || item.loja_origem || "").trim();
            break;
        }
    }
    if(destino) ciClientesDestinoPrimeiraOS = destino;
    const el = document.getElementById("ciDestinoTitulo");
    if(el) el.innerHTML = ciClientesDestinoPrimeiraOS || "DESTINO";
}

async function preencherLinhaCIEditavel(indice, os){
    try{
        if(ciAtual === "regiao_clientes"){
            // A C.I. consulta diretamente o Supabase de Clientes; não depende do dashboard.
        }else{
            await carregarBancoREXPEDLR();
            if(ciAtual === "regiao"){
                await Promise.all([carregarBancoCadastroCI(), carregarBancoLojasCI()]);
            }
        }
    }catch(e){
        document.getElementById("ciEditMensagem").innerHTML =
            "Erro ao buscar O.S.: " + (e && e.message ? e.message : e);
        return;
    }

    if(!planilhaCI) return;
    if(preenchendoCI) return;

    preenchendoCI = true;

    try{
        if(!String(os || "").trim()){
            limparLinhaCISemEventos(indice);
            atualizarTotalVolumesCI();
            atualizarDestinoTopoRegiao();
            return;
        }

        const cfg = configCIAtual();

        if(ciAtual === "regiao_clientes"){
            const osDigitada = String(os || "").trim();
            const itemCliente = await buscarOSClientesDireto(osDigitada);

            if(!itemCliente){
                // Nunca apaga a O.S. digitada quando não encontra o registro.
                planilhaCI.setValueFromCoords(cfg.osCol, indice, osDigitada, true);
                planilhaCI.setValueFromCoords(3, indice, "O.S não encontrada", true);
                planilhaCI.setValueFromCoords(0, indice, "99", true);
                planilhaCI.setValueFromCoords(5, indice, "1", true);
                document.getElementById("ciEditMensagem").innerHTML =
                    "O.S. <b>" + osDigitada + "</b> não encontrada em rexpedlr_clientes.";
                atualizarTotalVolumesCI();
                return;
            }

            planilhaCI.setValueFromCoords(0, indice, "99", true);
            planilhaCI.setValueFromCoords(1, indice, itemCliente.grupo || "", true);
            planilhaCI.setValueFromCoords(2, indice, itemCliente.nce || "", true);
            planilhaCI.setValueFromCoords(3, indice, itemCliente.desc_produto || "", true);
            planilhaCI.setValueFromCoords(4, indice, itemCliente.cor || "", true);
            planilhaCI.setValueFromCoords(5, indice, "1", true);
            planilhaCI.setValueFromCoords(6, indice, itemCliente.nf_origem || "", true);
            planilhaCI.setValueFromCoords(7, indice, itemCliente.ci_origem || "", true);
            planilhaCI.setValueFromCoords(8, indice, itemCliente.os || os, true);
            planilhaCI.setValueFromCoords(9, indice, itemCliente.nome_cliente || "Não identificado", true);
            if(!ciClientesDestinoPrimeiraOS){
                ciClientesDestinoPrimeiraOS = String(itemCliente.pdv || itemCliente.loja || itemCliente.loja_origem || "").trim();
            }
            atualizarDestinoCIClientesPelaPrimeiraOS();
            document.getElementById("ciEditMensagem").innerHTML =
                "O.S. <b>" + (itemCliente.os || osDigitada) + "</b> carregada com sucesso.";
            atualizarTotalVolumesCI();
            return;
        }

        const item = buscarOSBanco(os);

        if(!item){
            limparLinhaCISemEventos(indice);
            planilhaCI.setValueFromCoords(0, indice, "1", true);
            planilhaCI.setValueFromCoords(3, indice, "O.S não encontrada", true);
            planilhaCI.setValueFromCoords(cfg.osCol, indice, os, true);
            atualizarTotalVolumesCI();
            atualizarDestinoTopoRegiao();
            return;
        }

        planilhaCI.setValueFromCoords(0, indice, "1", true);
        planilhaCI.setValueFromCoords(1, indice, item.gr, true);
        planilhaCI.setValueFromCoords(2, indice, item.nce, true);
        planilhaCI.setValueFromCoords(3, indice, item.descricao, true);
        planilhaCI.setValueFromCoords(4, indice, item.cor, true);
        planilhaCI.setValueFromCoords(cfg.osCol, indice, item.os || os, true);

        if(ciAtual === "teresina"){
            planilhaCI.setValueFromCoords(7, indice, item.loja, true);
        }else if(ciAtual === "geit"){
            // GEIT sem puxar dados automáticos
        }else if(ciAtual === "regiao"){
            const ciOrigemAtual = planilhaCI.getValueFromCoords(6, indice);
            const ciOrigem = buscarCadastroCI(item.os || os) || ciOrigemAtual || "";
            const lojaOrigem = item.loja || "";
            const lojaDestino = buscarLojaDestinoCI(lojaOrigem) || lojaOrigem;

            /* Fórmulas da planilha REGIÃO:
               GR = REXPEDLR coluna 6 | COR = REXPEDLR coluna 9
               CI ORIGEM = CADASTRO coluna 2 | LOJA ORIGEM = REXPEDLR coluna 3
               DESTINO = LOJAS coluna 2 por LOJA ORIGEM | topo = Q9 */
            planilhaCI.setValueFromCoords(6, indice, ciOrigem, true);
            planilhaCI.setValueFromCoords(8, indice, lojaOrigem, true);
            planilhaCI.setValueFromCoords(9, indice, lojaDestino, true);
        }else{
            planilhaCI.setValueFromCoords(8, indice, item.loja, true);
            planilhaCI.setValueFromCoords(9, indice, item.loja, true);
        }

        atualizarTotalVolumesCI();
        atualizarDestinoTopoRegiao();
    }finally{
        preenchendoCI = false;
    }
}

function limparLinhaCISemEventos(indice){
    if(!planilhaCI) return;
    const cfg = configCIAtual();
    if(ciAtual === "geit" && indice === 0){
        const cab = ["AL","GR","NCE","DESCRIÇÃO","COR","","O.S IMP"];
        for(let x = 0; x < cfg.rowLength; x++){
            planilhaCI.setValueFromCoords(x, indice, cab[x] || "", true);
        }
        return;
    }

    for(let x = 0; x < cfg.rowLength; x++){
        let valor = x === 0 ? "1" : "";
        if(ciAtual === "regiao_clientes"){
            valor = x === 0 ? "99" : (x === 5 ? "1" : "");
        }
        planilhaCI.setValueFromCoords(x, indice, valor, true);
    }
    if(ciAtual === "regiao_clientes") atualizarDestinoCIClientesPelaPrimeiraOS();
}

function limparLinhaCI(indice){
    if(!planilhaCI) return;
    const estavaPreenchendo = preenchendoCI;
    preenchendoCI = true;
    try{
        limparLinhaCISemEventos(indice);
    }finally{
        preenchendoCI = estavaPreenchendo;
    }
}

function atualizarTotalVolumesCI(){
    let total = 0;
    const osCol = osColCI();

    if(planilhaCI){
        const inicio = (ciAtual === "geit") ? 1 : 0;
        for(let i = inicio; i < configCIAtual().rows; i++){
            const os = planilhaCI.getValueFromCoords(osCol, i);
            if(String(os || "").trim() !== ""){
                total++;
            }
        }
    }

    document.getElementById("ciTotalVolumes").innerHTML = total;
}

function limparCIEditavel(){
    if(ciAtual === "outros"){
        limparCIOutrosEditavel();
        return;
    }

    if(planilhaCI){
        for(let i = 0; i < configCIAtual().rows; i++){
            limparLinhaCI(i);
        }
    }

    if(ciAtual === "regiao_clientes"){
        ciClientesDestinoPrimeiraOS = "";
        const elDestino = document.getElementById("ciDestinoTitulo");
        if(elDestino) elDestino.innerHTML = "DESTINO";
    }
    atualizarTotalVolumesCI();
    document.getElementById("ciEditMensagem").innerHTML = "C.I limpa.";
}

async function imprimirCIEditavel(){
    let numero = "";
    try{
        numero = await salvarHistoricoCI("editavel", {automatico:true, motivo:"impressao"});
        if(numero){
            const msg = document.getElementById("ciEditMensagem");
            if(msg) msg.innerHTML = "C.I. emitida e salva automaticamente no histórico como <b>" + escaparHTML(numero) + "</b>. Abrindo impressão...";
        }
    }catch(e){
        const continuar = confirm("Não foi possível salvar a C.I. no histórico: " + (e.message || e) + "\n\nDeseja imprimir mesmo assim?");
        if(!continuar) return;
    }
    try{
        await criarNotificacaoV39(
            "C.I. enviada para impressão",
            numero ? ("A C.I. " + numero + " foi salva no histórico e enviada para impressão.") : "A C.I. foi enviada para impressão.",
            "impressao_ci",
            {numero_ci: numero || null, tipo_ci: ciAtual || "editavel"}
        );
    }catch(e){
        console.warn("Não foi possível registrar a notificação da impressão da C.I.:", e?.message || e);
    }
    window.print();
}


async function gerarCIApp(){
    sincronizarNumeroCIInterno((document.getElementById("ciNumeroInterno")||{}).value);
    if(!ciAtual){
        alert("Selecione uma C.I primeiro.");
        return;
    }

    const listaOS = separarLista(document.getElementById("ciOS").value);
    const listaTTR = separarLista(document.getElementById("ciOSTTR").value);

    if(listaOS.length === 0){
        alert("Digite pelo menos uma O.S.");
        return;
    }

    if(listaOS.length > 8){
        alert("A C.I aceita no máximo 8 O.S por vez.");
        return;
    }

    const msg = document.getElementById("ciMensagem");
    msg.innerHTML = "Carregando dados da aba REXPEDLR...";

    try{
        await carregarBancoREXPEDLR();

        const itens = [];
        const naoEncontradas = [];

        listaOS.forEach(function(os, idx){
            const item = buscarOSBanco(os);

            if(item){
                item.osTTR = ciAtual === "teresina" ? (listaTTR[idx] || "") : "";
                itens.push(item);
            }else{
                naoEncontradas.push(os);
            }
        });

        if(itens.length === 0){
            msg.innerHTML = "Nenhuma O.S encontrada na aba REXPEDLR.";
            document.getElementById("ciPreview").style.display = "none";
            return;
        }

        renderizarCIDocumento(itens, naoEncontradas);

        msg.innerHTML =
            "C.I gerada como rascunho. Revise e edite antes de imprimir. Ela será salva automaticamente no histórico somente no momento da impressão." +
            (naoEncontradas.length ? " Não encontrada(s): " + naoEncontradas.join(", ") : "");

        registrarAuditoria("ci_rascunho", nomeCIAtual() + " gerada como rascunho.", { tipo: ciAtual, os: listaOS.join(", "), quantidade: itens.length, nao_encontradas: naoEncontradas.join(", ") });

    }catch(e){
        msg.innerHTML = "Erro: " + e.message;
    }
}

function nomeCIAtual(){
    return nomesCI[ciAtual] || "C.I DEVOLUÇÕES";
}

function dataAtualCI(){
    const hoje = new Date();
    return hoje.toLocaleDateString("pt-BR").replace(/\//g, " ");
}

function horaAtualCI(){
    return new Date().toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
}

function renderizarCIDocumento(itens, naoEncontradas){
    const preview = document.getElementById("ciPreview");

    let linhasTabela = "";

    for(let i = 0; i < 8; i++){
        const item = itens[i];

        if(item){
            linhasTabela += `
                <tr>
                    <td>1</td>
                    <td>${escaparHTML(item.gr)}</td>
                    <td>${escaparHTML(item.nce)}</td>
                    <td class="desc">${escaparHTML(item.descricao)}</td>
                    <td>${escaparHTML(item.cor)}</td>
                    <td>${escaparHTML(item.os)}</td>
                    <td>${escaparHTML(item.osTTR || "")}</td>
                    <td>${escaparHTML(item.loja)}</td>
                </tr>
            `;
        }else{
            linhasTabela += `
                <tr>
                    <td>&nbsp;</td>
                    <td></td>
                    <td></td>
                    <td class="desc"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
        }
    }

    const totalVolumes = itens.length;
    const pesoTotal = itens.length ? "32,500" : "";
    const cubagemTotal = itens.length ? "0,195" : "";

    const html = `
        <div class="ci-doc-acoes">
            <button class="btn-voltar" onclick="imprimirCI()">Imprimir C.I</button>
            <button class="btn-voltar" onclick="abrirTelaCI()">Voltar para C.I</button>
        </div>

        <div class="ci-documento" id="ciDocumentoImpressao">

            <div class="ci-doc-topo">
                <div>IDB - Logística Reversa</div>
                <div>${horaAtualCI()}</div>
                <div>${dataAtualCI()}</div>
            </div>

            <div class="ci-doc-centro">ATT</div>

            <div class="ci-doc-centro" style="font-size:14px;">
                A/C.: MENDES / EDIVAN
            </div>

            <div class="ci-doc-linha">
                <span class="ci-doc-msg">
                    Estamos enviando mercadorias abaixo com Defeito e Não Autorizados reparo por nossa Unidade, Regional RM1
                </span>
            </div>

            <div class="ci-doc-linha">
                <span class="ci-doc-msg">
                    seguem todas com O.S TTR geradas e acobertadas pelo(S) DANFE(S):____________________
                </span>
            </div>

            <table class="ci-doc-table">
                <thead>
                    <tr>
                        <th>AL</th>
                        <th>GR</th>
                        <th>NCE</th>
                        <th>DESCRIÇÃO</th>
                        <th>COR</th>
                        <th>O.S</th>
                        <th>OS TTR</th>
                        <th>LOJA DE<br>ORIGEM</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabela}
                </tbody>
            </table>

            <div class="ci-doc-obs">
                <div style="background:#222;color:white;display:inline-block;padding:2px 6px;font-weight:bold;">Observações:</div>
                <div>1. Favor confirmar o recebimento, devolvendo a 2ª via devidamente assinada.</div>
            </div>

            <div class="ci-doc-assinatura">
                <div>
                    <div style="display:flex;align-items:center;margin-bottom:4px;">
                        <div class="ci-doc-logo"></div>
                        <b><i>Confirmo Embarque - IDC</i></b>
                    </div>

                    <div class="ci-doc-small">
                        <b><i>VOL:</i></b>_______<b><i>Em</i></b>_______/_______/_______<br>
                        <b><i>Visto:</i></b>_____________________________<br>
                        <b>TOTAL DE VOLUMES:</b> &nbsp;&nbsp; ${totalVolumes}
                    </div>
                </div>

                <div class="ci-doc-small">
                    <b>PESO TOTAL:</b> ______ ${pesoTotal} ______ kg<br>
                    <b>CUBAGEM TOTAL:</b> ____ ${cubagemTotal} ____ m3
                </div>

                <div class="ci-doc-nome">
                    Allan Kevin
                </div>
            </div>

            ${naoEncontradas.length ? `<div style="margin-top:15px;color:#b00000;font-weight:bold;">Não encontrada(s): ${escaparHTML(naoEncontradas.join(", "))}</div>` : ""}

        </div>
    `;

    preview.innerHTML = html;
    preview.style.display = "block";
}

function escaparHTML(texto){
    return String(texto || "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

async function imprimirCI(){
    const preview = document.getElementById("ciPreview");

    if(preview.style.display === "none" || preview.innerHTML.trim() === ""){
        alert("Gere a C.I primeiro.");
        return;
    }

    let numero = "";
    try{
        numero = await salvarHistoricoCI("preview", {automatico:true, motivo:"impressao"});
    }catch(e){
        const continuar = confirm("Não foi possível salvar a C.I. no histórico: " + (e.message || e) + "\n\nDeseja imprimir mesmo assim?");
        if(!continuar) return;
    }

    try{
        await criarNotificacaoV39(
            "C.I. enviada para impressão",
            numero ? ("A C.I. " + numero + " foi salva no histórico e enviada para impressão.") : "A C.I. foi enviada para impressão.",
            "impressao_ci",
            {numero_ci: numero || null, tipo_ci: ciAtual || "preview"}
        );
    }catch(e){
        console.warn("Não foi possível registrar a notificação da impressão da C.I.:", e?.message || e);
    }

    window.print();
}

function abrirCIEditar(){
    if(ciAtual && linksCIEdit[ciAtual]){
        window.open(linksCIEdit[ciAtual], "_blank");
    }
}

async function trocarBase(base){
    baseAtual = base;
    document.getElementById("textoBase").innerHTML = baseAtual;
    document.getElementById("baseBusca").innerHTML = baseAtual;
    document.getElementById("listaBase").style.display = "none";

    cacheCSV = "";
    linhasPlanilha = [];
    cabecalhoPlanilha = [];

    document.getElementById("campoBusca").value = "";
    document.getElementById("resultadosBusca").innerHTML = "";
    document.getElementById("msgBusca").innerHTML = "Carregando base " + baseAtual + "...";

    await baixarCSV();
    document.getElementById("msgBusca").innerHTML = "Base " + baseAtual + " carregada. Digite para pesquisar.";
}

async function baixarCSV(){
    const url = baseAtual === "IMP" ? urlIMP : urlILR;
    const resp = await fetch(url);
    if(!resp.ok){throw new Error("Erro ao baixar CSV.");}
    cacheCSV = await resp.text();
    prepararLinhas();
}

async function garantirCSV(){
    if(cacheCSV !== "") return cacheCSV;
    await baixarCSV();
    return cacheCSV;
}


function abrirAdmin(){
    if(!exigirPermissao(["administrador"], "Administração")) return;
    esconderTelas();
    definirMenuAtivo("admin");
    document.getElementById("telaAdmin").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
    carregarDashboardAdmin();
}

function abrirAdminSecao(secao){
    if(secao === "atualizar" && !exigirPermissao(["administrador","supervisor"], "Atualizar Banco")) return;
    if(secao !== "atualizar" && !exigirPermissao(["administrador"], "Administração")) return;
    esconderTelas();
    definirMenuAtivo("admin");
    const mapa = {
        atualizar:"telaAdminAtualizar",
        usuarios:"telaAdminUsuarios",
        presenca:"telaAdminPresenca",
        lojas:"telaAdminLojas",
        historico:"telaAdminHistorico",
        historico_ci:"telaAdminHistoricoCI",
        auditoria:"telaAdminAuditoria",
        config:"telaAdminConfig",
        backup:"telaAdminBackup"
    };
    const id = mapa[secao] || "telaAdmin";
    document.getElementById(id).style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
    if(secao === "config") carregarConfigSupabaseLocal();
    if(secao === "historico") carregarHistoricoImportacoes();
    if(secao === "historico_ci") carregarHistoricoCI();
    if(secao === "auditoria") carregarAuditoria();
    if(secao === "usuarios") carregarUsuariosAdmin();
    if(secao === "presenca") carregarPresencasV56(true);
    if(typeof atualizarPresencaAgoraV56==="function") atualizarPresencaAgoraV56();
}

function atualizarDados(){
    abrirAdminSecao("atualizar");
}

let registrosNettermPreview = [];

function normalizarCabecalhoNetterm(txt){
    return normalizarTexto(String(txt || "")
        .replace(/[\.\-_/]+/g," ")
        .replace(/\s+/g," ")
        .trim());
}

const CAMPOS_NETTERM = {
    os: ["os", "o s"],
    dt_geracao: ["dt geracao", "data geracao"],
    pdv: ["pdv"],
    nf: ["nf", "nota fiscal"],
    alm: ["alm", "almoxarifado"],
    grupo: ["grupo", "gr"],
    nce: ["nce"],
    desc_produto: ["desc produto", "descricao produto", "descricao do produto"],
    cor: ["cor"],
    n_serie: ["n serie", "numero serie", "numero de serie"],
    valor_transf: ["valor transf", "valor transferencia"],
    tecnico: ["tecnico"],
    rack: ["rack"],
    status: ["status"],
    usuario: ["usuario"],
    depreciacao: ["depreciacao %", "depreciacao"],
    obs_expedicao: ["obs expedicao", "observacao expedicao"],
    dt_expedicao: ["dt expedicao", "data expedicao"],
    pdv_expedicao: ["pdv expedicao"],
    feirao: ["feirao"],
    analise_do_defeito: ["analise do defeito", "analise defeito"],
    dt_conserto: ["dt conserto", "data conserto"],
    obs_status: ["obs status", "observacao status"],
    obs_ordem_de_servico: ["obs ordem de servico", "observacao ordem de servico", "obs os"],
    solicitante_cpp: ["solicitante cpp"],
    data_cpp: ["data cpp", "dt cpp"],
    nr_cpp: ["nr cpp", "n cpp", "numero cpp"],
    sit_cpp: ["sit cpp", "situacao cpp"],
    obs_cpp: ["obs cpp", "observacao cpp"],
    recebedor_cpp: ["recebedor cpp"],
    data_recebedor: ["data recebedor", "dt recebedor"],
    dt_ult_entrada: ["dt ult entrada", "data ultima entrada"],
    dt_saida_oficina: ["dt saida oficina", "data saida oficina"],
    dt_recb_at: ["dt recb at", "data recb at", "dt receb at"],
    status_da_os: ["status da os", "situacao da os"],
    tipo_garantia: ["tipo garantia", "tipo de garantia"]
};

function localizarColunasNetterm(cabecalho){
    const normalizados = cabecalho.map(normalizarCabecalhoNetterm);
    const indices = {};

    Object.keys(CAMPOS_NETTERM).forEach(function(campo){
        const aliases = CAMPOS_NETTERM[campo];
        let idx = -1;
        for(let i = 0; i < normalizados.length; i++){
            if(aliases.includes(normalizados[i])){
                idx = i;
                break;
            }
        }
        indices[campo] = idx;
    });

    return {indices, normalizados};
}

function mapearLinhaNetterm(c, indices){
    const pegar = function(campo){
        const idx = indices[campo];
        return idx >= 0 ? String(c[idx] ?? "").trim() : "";
    };

    return {
        os: pegar("os"),
        dt_geracao: pegar("dt_geracao"),
        pdv: pegar("pdv"),
        nf: pegar("nf"),
        alm: pegar("alm"),
        grupo: pegar("grupo"),
        nce: pegar("nce"),
        desc_produto: pegar("desc_produto"),
        cor: pegar("cor"),
        n_serie: pegar("n_serie"),
        valor_transf: pegar("valor_transf"),
        tecnico: pegar("tecnico"),
        rack: pegar("rack"),
        status: pegar("status"),
        usuario: pegar("usuario"),
        depreciacao: pegar("depreciacao"),
        obs_expedicao: pegar("obs_expedicao"),
        dt_expedicao: pegar("dt_expedicao"),
        pdv_expedicao: pegar("pdv_expedicao"),
        feirao: pegar("feirao"),
        analise_do_defeito: pegar("analise_do_defeito"),
        dt_conserto: pegar("dt_conserto"),
        obs_status: pegar("obs_status"),
        obs_ordem_de_servico: pegar("obs_ordem_de_servico"),
        solicitante_cpp: pegar("solicitante_cpp"),
        data_cpp: pegar("data_cpp"),
        nr_cpp: pegar("nr_cpp"),
        sit_cpp: pegar("sit_cpp"),
        obs_cpp: pegar("obs_cpp"),
        recebedor_cpp: pegar("recebedor_cpp"),
        data_recebedor: pegar("data_recebedor"),
        dt_ult_entrada: pegar("dt_ult_entrada"),
        dt_saida_oficina: pegar("dt_saida_oficina"),
        dt_recb_at: pegar("dt_recb_at"),
        status_da_os: pegar("status_da_os"),
        tipo_garantia: pegar("tipo_garantia")
    };
}

async function lerArquivoNetterm(){
    const input = document.getElementById("arquivoNetterm");
    if(!input || !input.files || !input.files[0]){
        throw new Error("Selecione o arquivo gerado pelo NetTerm.");
    }

    const arquivo = input.files[0];
    const texto = await arquivo.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(texto, "text/html");
    const trs = Array.from(doc.querySelectorAll("tr"));

    if(trs.length === 0){
        throw new Error("Nenhuma tabela foi encontrada no arquivo.");
    }

    // IMPORTANTE: preserva células vazias. Removê-las deslocava todas as colunas seguintes.
    const linhas = trs.map(function(tr){
        return Array.from(tr.querySelectorAll("td,th")).map(function(td){
            return String(td.innerText || td.textContent || "")
                .replace(/\u00a0/g, " ")
                .replace(/[\r\n\t]+/g, " ")
                .replace(/\s+/g," ")
                .trim();
        });
    }).filter(function(linha){
        return linha.some(function(x){ return x !== ""; });
    });

    let cabecalhoIndex = -1;
    let mapaColunas = null;

    for(let i = 0; i < linhas.length; i++){
        const localizado = localizarColunasNetterm(linhas[i]);
        const idxOS = localizado.indices.os;
        const idxData = localizado.indices.dt_geracao;
        const idxStatusOS = localizado.indices.status_da_os;
        const idxTipoGarantia = localizado.indices.tipo_garantia;

        if(idxOS >= 0 && idxData >= 0 && idxStatusOS >= 0 && idxTipoGarantia >= 0){
            cabecalhoIndex = i;
            mapaColunas = localizado.indices;
            break;
        }
    }

    if(cabecalhoIndex < 0 || !mapaColunas){
        throw new Error("Cabeçalho da REXPEDLR não identificado. Confira se existem as colunas O.S, DT. GERAÇÃO, STATUS DA OS e TIPO GARANTIA.");
    }

    const obrigatorios = ["os","status","status_da_os","tipo_garantia","rack"];
    const faltantes = obrigatorios.filter(function(campo){ return mapaColunas[campo] < 0; });
    if(faltantes.length){
        throw new Error("Colunas obrigatórias ausentes no arquivo: " + faltantes.join(", "));
    }

    const registros = [];
    let ignorados = 0;
    const inicio = cabecalhoIndex + 1;

    for(let i = inicio; i < linhas.length; i++){
        const c = linhas[i];
        const obj = mapearLinhaNetterm(c, mapaColunas);
        const os = somenteNumeros(obj.os || "");
        if(!os){
            ignorados++;
            continue;
        }
        obj.os = os;
        registros.push(obj);
    }

    return {
        arquivo: arquivo.name,
        totalLinhas: linhas.length,
        registros: registros,
        ignorados: ignorados,
        cabecalho: linhas[cabecalhoIndex],
        mapaColunas: mapaColunas
    };
}

function renderPreviewNetterm(registros){
    const area = document.getElementById("adminPreviewImportacao");
    const primeiros = registros.slice(0, 25);
    let html = "<table><thead><tr>" +
        "<th>O.S</th><th>Data</th><th>PDV</th><th>Rack</th><th>Status</th><th>Status da O.S</th><th>Tipo Garantia</th><th>Produto</th>" +
        "</tr></thead><tbody>";

    primeiros.forEach(function(r){
        html += "<tr>" +
            "<td>" + escaparHTML(r.os||"") + "</td>" +
            "<td>" + escaparHTML(r.dt_geracao||"") + "</td>" +
            "<td>" + escaparHTML(r.pdv||"") + "</td>" +
            "<td>" + escaparHTML(r.rack||"") + "</td>" +
            "<td>" + escaparHTML(r.status||"") + "</td>" +
            "<td><b>" + escaparHTML(r.status_da_os||"") + "</b></td>" +
            "<td>" + escaparHTML(r.tipo_garantia||"") + "</td>" +
            "<td>" + escaparHTML(r.desc_produto||"") + "</td>" +
            "</tr>";
    });
    html += "</tbody></table>";
    area.innerHTML = html;
    area.style.display = "block";
}

async function preVisualizarArquivoNetterm(){
    const msg = document.getElementById("msgAdminImportacao");
    try{
        msg.innerHTML = "Lendo arquivo... aguarde.";
        const res = await lerArquivoNetterm();
        registrosNettermPreview = res.registros;
        document.getElementById("adminQtdRegistros").innerHTML = res.totalLinhas;
        document.getElementById("adminQtdValidos").innerHTML = res.registros.length;
        document.getElementById("adminQtdErros").innerHTML = res.ignorados;
        renderPreviewNetterm(res.registros);
        msg.innerHTML = "<span class='admin-status-ok'>Arquivo lido com sucesso:</span> " + res.registros.length + " O.S. prontas para importar.";
    }catch(e){
        msg.innerHTML = "<span class='admin-status-erro'>Erro:</span> " + e.message;
    }
}

function obterSupabaseClient(){
    const url = localStorage.getItem("SUPABASE_URL") || SUPABASE_URL_PADRAO;
    const key = localStorage.getItem("SUPABASE_ANON_KEY") || SUPABASE_ANON_KEY_PADRAO;
    if(!url || !key){
        throw new Error("Configure primeiro a SUPABASE_URL e a SUPABASE_ANON_KEY em Administração > Configurações.");
    }
    if(!window.supabase){
        throw new Error("Biblioteca do Supabase não carregou. Verifique a internet/CDN.");
    }
    if(!supabaseClienteCache){
        supabaseClienteCache = window.supabase.createClient(url, key);
    }
    return supabaseClienteCache;
}

function setDash(id, valor){
    const el = document.getElementById(id);
    if(el) el.innerHTML = valor;
}

function contarPorCampo(lista, campo){
    const mapa = new Map();
    lista.forEach(function(item){
        const chave = String(item[campo] || "").trim() || "(vazio)";
        mapa.set(chave, (mapa.get(chave) || 0) + 1);
    });
    return Array.from(mapa.entries()).sort(function(a,b){ return b[1] - a[1]; });
}

function renderTabelaResumo(pares, limite){
    if(!pares || pares.length === 0) return "<div class='admin-info'>Sem dados para exibir.</div>";
    let html = "<table><thead><tr><th>Descrição</th><th>Total</th></tr></thead><tbody>";
    pares.slice(0, limite || 10).forEach(function(p){
        html += "<tr><td>" + escaparHTML(p[0]) + "</td><td><b>" + p[1] + "</b></td></tr>";
    });
    html += "</tbody></table>";
    return html;
}

function renderTabelaRecentes(lista){
    if(!lista || lista.length === 0) return "<div class='admin-info'>Sem dados para exibir.</div>";
    let html = "<table><thead><tr><th>O.S</th><th>Data</th><th>PDV</th><th>Status</th></tr></thead><tbody>";
    lista.slice(0, 10).forEach(function(r){
        html += "<tr><td><b>" + escaparHTML(r.os || "") + "</b></td><td>" + escaparHTML(r.dt_geracao || "") + "</td><td>" + escaparHTML(r.pdv || "") + "</td><td>" + escaparHTML(r.status || "") + "</td></tr>";
    });
    html += "</tbody></table>";
    return html;
}

async function carregarDashboardAdmin(){
    const msg = document.getElementById("dashboardMensagem");
    if(!msg) return;

    setDash("dashUltimaImportacao", localStorage.getItem("ULTIMA_IMPORTACAO_REXPEDLR") || "--");
    setDash("dashUltimaQtd", localStorage.getItem("ULTIMA_IMPORTACAO_REXPEDLR_QTD") || "--");
    setDash("dashDuplicadas", localStorage.getItem("ULTIMA_IMPORTACAO_REXPEDLR_DUP") || "--");
    setDash("dashBancoStatus", "Conectando...");
    msg.className = "dashboard-loading";
    msg.innerHTML = "Carregando dados do Supabase...";

    try{
        const supa = obterSupabaseClient();

        const countResp = await supa
            .from("rexpedlr")
            .select("os", { count:"exact", head:true });

        if(countResp.error) throw countResp.error;
        setDash("dashTotalOS", countResp.count || 0);

        // O Supabase normalmente limita cada resposta a 1.000 linhas, mesmo quando
        // um limite maior é solicitado. Carrega a base em páginas para que os
        // gráficos e totais considerem TODAS as O.S.
        const registros = [];
        const tamanhoLote = 1000;
        let inicioLote = 0;

        while(true){
            const { data:lote, error } = await supa
                .from("rexpedlr")
                .select("os,dt_geracao,pdv,tecnico,status")
                .range(inicioLote, inicioLote + tamanhoLote - 1);

            if(error) throw error;

            const pagina = lote || [];
            registros.push(...pagina);

            if(pagina.length < tamanhoLote) break;
            inicioLote += tamanhoLote;

            // Proteção contra loop acidental em uma resposta anormal.
            if(inicioLote >= 100000) break;
        }
        const porStatus = contarPorCampo(registros, "status");
        const porTecnico = contarPorCampo(registros, "tecnico");
        const porPDV = contarPorCampo(registros, "pdv");
        renderGraficosDashboard(porStatus, porTecnico, porPDV);

        setDash("dashTotalStatus", porStatus.filter(function(x){ return x[0] !== "(vazio)"; }).length);
        setDash("dashTotalTecnicos", porTecnico.filter(function(x){ return x[0] !== "(vazio)"; }).length);
        setDash("dashTotalPDV", porPDV.filter(function(x){ return x[0] !== "(vazio)"; }).length);
        setDash("dashBancoStatus", "🟢 Online");

        document.getElementById("dashTabelaStatus").innerHTML = renderTabelaResumo(porStatus, 12);
        document.getElementById("dashTabelaTecnicos").innerHTML = renderTabelaResumo(porTecnico, 12);
        document.getElementById("dashTabelaPDV").innerHTML = renderTabelaResumo(porPDV, 12);
        document.getElementById("dashTabelaRecentes").innerHTML = renderTabelaRecentes(registros.slice().reverse());

        msg.className = "dashboard-ok";
        msg.innerHTML = "Dashboard atualizado com dados do Supabase.";
        carregarHistoricoImportacoes();
        atualizarDashboardOperacional(false);
    }catch(e){
        setDash("dashBancoStatus", "🔴 Erro");
        msg.className = "dashboard-erro";
        msg.innerHTML = "Não foi possível carregar o dashboard: " + (e.message || e) + ". Se o RLS bloquear leitura, crie uma política de SELECT para a tabela rexpedlr ou uma Edge Function de consulta.";
    }
}



function formatarDataHistorico(valor){
    if(!valor) return "--";
    try{
        return new Date(valor).toLocaleString("pt-BR");
    }catch(_){
        return String(valor);
    }
}

function renderTabelaHistoricoImportacoes(lista, compacto){
    if(!lista || lista.length === 0){
        return "<div class='admin-info'>Nenhuma importação registrada ainda.</div>";
    }
    let html = "<table class='historico-tabela'><thead><tr>" +
        "<th>Data/Hora</th><th>Arquivo</th><th>Recebidos</th><th>Únicos</th><th>Importados</th><th>Duplicadas</th><th>Status</th>";
    if(!compacto) html += "<th>Mensagem</th>";
    html += "</tr></thead><tbody>";

    lista.slice(0, compacto ? 5 : 50).forEach(function(item){
        const status = item.status || (item.erro ? "erro" : "sucesso");
        const cls = status === "sucesso" ? "historico-status-sucesso" : "historico-status-erro";
        html += "<tr>" +
            "<td>" + escaparHTML(formatarDataHistorico(item.criado_em || item.created_at || item.data_hora)) + "</td>" +
            "<td>" + escaparHTML(item.arquivo || "--") + "</td>" +
            "<td><b>" + escaparHTML(item.total_recebido ?? "--") + "</b></td>" +
            "<td>" + escaparHTML(item.total_unico ?? "--") + "</td>" +
            "<td><b>" + escaparHTML(item.total_importado ?? "--") + "</b></td>" +
            "<td>" + escaparHTML(item.duplicados_removidos ?? "--") + "</td>" +
            "<td class='" + cls + "'>" + escaparHTML(status) + "</td>";
        if(!compacto) html += "<td>" + escaparHTML(item.mensagem || "") + "</td>";
        html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
}

async function carregarHistoricoImportacoes(){
    const msg = document.getElementById("historicoMensagem");
    const area = document.getElementById("historicoImportacoesTabela");
    try{
        if(msg) msg.innerHTML = "Carregando histórico do Supabase...";
        const supa = obterSupabaseClient();
        const { data, error } = await supa
            .from("historico_importacoes")
            .select("*")
            .order("criado_em", { ascending:false })
            .limit(50);

        if(error) throw error;

        const lista = data || [];
        const totalRecebido = lista.reduce(function(acc, x){ return acc + Number(x.total_recebido || 0); }, 0);
        const totalImportado = lista.reduce(function(acc, x){ return acc + Number(x.total_importado || 0); }, 0);
        const totalDuplicadas = lista.reduce(function(acc, x){ return acc + Number(x.duplicados_removidos || 0); }, 0);

        setDash("histTotalImportacoes", lista.length);
        setDash("histTotalRecebido", totalRecebido);
        setDash("histTotalImportado", totalImportado);
        setDash("histTotalDuplicadas", totalDuplicadas);

        if(area){
            area.style.display = "block";
            area.innerHTML = renderTabelaHistoricoImportacoes(lista, false);
        }
        const dashHist = document.getElementById("dashHistoricoImportacoes");
        if(dashHist) dashHist.innerHTML = renderTabelaHistoricoImportacoes(lista, true);

        if(lista[0]){
            setDash("dashUltimaImportacao", formatarDataHistorico(lista[0].criado_em || lista[0].created_at || lista[0].data_hora));
            setDash("dashUltimaQtd", lista[0].total_importado ?? "--");
            setDash("dashDuplicadas", lista[0].duplicados_removidos ?? "--");
        }

        if(msg) msg.innerHTML = "<span class='admin-status-ok'>Histórico carregado com sucesso.</span>";
    }catch(e){
        if(msg) msg.innerHTML = "<span class='admin-status-erro'>Erro ao carregar histórico:</span> " + (e.message || e);
        const dashHist = document.getElementById("dashHistoricoImportacoes");
        if(dashHist) dashHist.innerHTML = "<div class='dashboard-erro'>Histórico não disponível: " + escaparHTML(e.message || e) + "</div>";
    }
}

async function importarNettermParaSupabase(){
    const msg = document.getElementById("msgAdminImportacao");
    let baseAntesImportacao = [];
    try{
        if(registrosNettermPreview.length === 0){
            await preVisualizarArquivoNetterm();
        }
        if(registrosNettermPreview.length === 0){
            throw new Error("Nenhum registro válido para importar.");
        }

        const confirmar = confirm(
            "Atualizar banco de O.S.?\n\n" +
            "O sistema vai enviar " + registrosNettermPreview.length + " registros para a API importar-rexpedlr.\n" +
            "As O.S. existentes serão atualizadas e as novas serão inseridas.\n\n" +
            "Confirme somente se o arquivo estiver correto."
        );
        if(!confirmar){
            msg.innerHTML = "<span class='admin-status-alerta'>Importação cancelada pelo usuário.</span>";
            return;
        }

        msg.innerHTML = "Preparando comparação da base antes da importação...";
        try{ baseAntesImportacao = await buscarTodaRexpedlr(); }
        catch(e){ console.warn("Não foi possível capturar a base anterior para comparação:", e); baseAntesImportacao = []; }

        const url = localStorage.getItem("SUPABASE_URL") || SUPABASE_URL_PADRAO;
        const key = localStorage.getItem("SUPABASE_ANON_KEY") || SUPABASE_ANON_KEY_PADRAO;
        const endpoint = url.replace(/\/$/, "") + "/functions/v1/importar-rexpedlr";

        msg.innerHTML = "Enviando registros para a API importar-rexpedlr... não feche a página.";

        const resp = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key,
                "apikey": key
            },
            body: JSON.stringify({
                arquivo: (document.getElementById("arquivoNetterm") && document.getElementById("arquivoNetterm").files[0]) ? document.getElementById("arquivoNetterm").files[0].name : "arquivo-netterm",
                registros: registrosNettermPreview
            })
        });

        let retorno = null;
        try{
            retorno = await resp.json();
        }catch(_){
            retorno = { mensagem: await resp.text() };
        }

        if(!resp.ok || (retorno && retorno.erro)){
            throw new Error((retorno && retorno.mensagem) ? retorno.mensagem : "Falha na Edge Function importar-rexpedlr.");
        }

        const importados = retorno.total_importado || retorno.totalImportado || registrosNettermPreview.length;
        const recebidos = retorno.total_recebido || registrosNettermPreview.length;
        const agora = new Date().toLocaleString("pt-BR");
        localStorage.setItem("ULTIMA_IMPORTACAO_REXPEDLR", agora);
        localStorage.setItem("ULTIMA_IMPORTACAO_REXPEDLR_QTD", String(importados));
        localStorage.setItem("ULTIMA_IMPORTACAO_REXPEDLR_DUP", String(retorno.duplicados_removidos || Math.max(0, recebidos - importados)));

        bancoREXPEDLR = [];
        bancoCarregado = false;

        msg.innerHTML = "<span class='admin-status-ok'>Banco atualizado com sucesso:</span> " + importados + " de " + recebidos + " O.S. enviadas para o Supabase em " + agora + ".";
        registrarAuditoria("importacao", "Banco REXPEDLR atualizado com sucesso.", { recebidos: recebidos, importados: importados, duplicados: retorno.duplicados_removidos || Math.max(0, recebidos - importados), arquivo: (document.getElementById("arquivoNetterm") && document.getElementById("arquivoNetterm").files[0]) ? document.getElementById("arquivoNetterm").files[0].name : "arquivo-netterm" });
        try{
            const baseDepoisImportacao = await buscarTodaRexpedlr();
            const comparacao = compararBasesImportacao(baseAntesImportacao, baseDepoisImportacao, {
                arquivo:(document.getElementById("arquivoNetterm") && document.getElementById("arquivoNetterm").files[0]) ? document.getElementById("arquivoNetterm").files[0].name : "arquivo-netterm",
                data:new Date().toISOString(), usuario:(usuarioLogado && (usuarioLogado.nome || usuarioLogado.email)) || "Usuário"
            });
            await salvarComparacaoImportacao(comparacao);
            abrirComparadorImportacao(comparacao);
        }catch(compErro){ console.warn("Importação concluída, mas o comparador não pôde ser gerado:", compErro); }
        carregarDashboardAdmin();
        carregarHistoricoImportacoes();
    }catch(e){
        msg.innerHTML = "<span class='admin-status-erro'>Erro na importação:</span> " + (e.message || e);
        registrarAuditoria("erro", "Erro na importação REXPEDLR.", { erro: e.message || String(e) });
    }
}

function salvarConfigSupabaseLocal(){
    const url = document.getElementById("supabaseUrlTela").value.trim();
    const key = document.getElementById("supabaseAnonTela").value.trim();
    localStorage.setItem("SUPABASE_URL", url || SUPABASE_URL_PADRAO);
    localStorage.setItem("SUPABASE_ANON_KEY", key || SUPABASE_ANON_KEY_PADRAO);
    supabaseClienteCache = null;
    document.getElementById("msgAdminConfig").innerHTML = "<span class='admin-status-ok'>Configuração salva nesta máquina.</span>";
}

function carregarConfigSupabaseLocal(){
    const urlEl = document.getElementById("supabaseUrlTela");
    const keyEl = document.getElementById("supabaseAnonTela");
    if(urlEl) urlEl.value = localStorage.getItem("SUPABASE_URL") || SUPABASE_URL_PADRAO;
    if(keyEl) keyEl.value = localStorage.getItem("SUPABASE_ANON_KEY") || SUPABASE_ANON_KEY_PADRAO;
}

async function testarConexaoSupabase(){
    const msg = document.getElementById("msgAdminConfig");
    try{
        salvarConfigSupabaseLocal();
        const supa = obterSupabaseClient();
        msg.innerHTML = "Testando conexão com a tabela rexpedlr...";
        const { error } = await supa.from("rexpedlr").select("os", { count: "exact", head: true });
        if(error) throw error;
        msg.innerHTML = "<span class='admin-status-ok'>Conexão OK.</span> Supabase acessível e tabela rexpedlr encontrada.";
    }catch(e){
        msg.innerHTML = "<span class='admin-status-erro'>Erro na conexão:</span> " + (e.message || e);
    }
}

function parseCSVLine(line){
    const result = [];
    let current = "";
    let insideQuotes = false;

    for(let i=0;i<line.length;i++){
        const char = line[i];
        if(char === '"'){
            if(line[i+1] === '"'){current += '"'; i++;}
            else{insideQuotes = !insideQuotes;}
        }else if(char === "," && !insideQuotes){
            result.push(current); current = "";
        }else{
            current += char;
        }
    }
    result.push(current);
    return result;
}

function prepararLinhas(){
    linhasPlanilha = [];
    cabecalhoPlanilha = [];
    const linhas = cacheCSV.split(/\r?\n/);

    if(linhas.length > 0){
        cabecalhoPlanilha = parseCSVLine(linhas[0]);
    }

    for(let i=1;i<linhas.length;i++){
        if(!linhas[i].trim()) continue;
        const colunas = parseCSVLine(linhas[i]);
        if(colunas.length > 1) linhasPlanilha.push(colunas);
    }
}

function normalizarTexto(texto){
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/[.\-/]/g," ")
        .replace(/\s+/g," ")
        .trim();
}

function somenteNumeros(texto){
    return String(texto || "").replace(/\D/g,"");
}

function valor(c,i){
    return c[i] || "";
}

function pegarPorColuna(linha, nomesPossiveis){
    for(let i=0;i<cabecalhoPlanilha.length;i++){
        const nomeAtual = normalizarTexto(cabecalhoPlanilha[i]);
        for(let j=0;j<nomesPossiveis.length;j++){
            if(nomeAtual === normalizarTexto(nomesPossiveis[j])){
                return linha[i] || "";
            }
        }
    }
    return "";
}

async function abrirBusca(){
    if(!exigirPermissao(["administrador","supervisor","consulta"], "Consultar O.S")) return;
    esconderTelas();
    definirMenuAtivo("consulta");
    document.getElementById("telaBusca").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
    document.getElementById("baseBusca").innerHTML = "SUPABASE";
    document.getElementById("msgBusca").innerHTML = "Busca conectada ao banco Supabase. Digite O.S, série, NF, produto, técnico, PDV ou status.";
}

function textoFicha(valor){
    return escaparHTML(valor || "-");
}

function abrirFichaRegistro(registro){
    document.getElementById("fOS").innerHTML = textoFicha(registro.os);
    document.getElementById("fData").innerHTML = textoFicha(registro.dt_geracao);
    document.getElementById("fPDV").innerHTML = textoFicha(registro.pdv);
    document.getElementById("fCliente").innerHTML = textoFicha(registro.nf);
    document.getElementById("fProduto").innerHTML = textoFicha(registro.desc_produto);
    document.getElementById("fCor").innerHTML = textoFicha(registro.cor);
    document.getElementById("fSerie").innerHTML = textoFicha(registro.n_serie);
    document.getElementById("fTecnico").innerHTML = textoFicha(registro.tecnico);
    document.getElementById("fRack").innerHTML = textoFicha(registro.rack);
    document.getElementById("fStatus").innerHTML = textoFicha(registro.status);

    document.getElementById("fAnaliseDefeito").innerHTML = textoFicha(registro.analise_do_defeito);
    document.getElementById("fObsStatus").innerHTML = textoFicha(registro.obs_status);
    document.getElementById("fObsOS").innerHTML = textoFicha(registro.obs_ordem_de_servico);
    document.getElementById("fStatusOS").innerHTML = textoFicha(registro.status_da_os);
    document.getElementById("fDtRecbAT").innerHTML = textoFicha(registro.dt_recb_at);

    const box = document.getElementById("fichaBoxDetalhes");
    if(box){
        box.innerHTML = `
            <b>Dados completos da O.S</b><br><br>
            <b>GR:</b> ${textoFicha(registro.grupo)}<br>
            <b>NCE:</b> ${textoFicha(registro.nce)}<br>
            <b>ALM:</b> ${textoFicha(registro.alm)}<br>
            <b>Valor transf.:</b> ${textoFicha(registro.valor_transf)}<br>
            <b>Usuário:</b> ${textoFicha(registro.usuario)}<br>
            <b>Depreciação:</b> ${textoFicha(registro.depreciacao)}<br>
            <b>Dt. Expedição:</b> ${textoFicha(registro.dt_expedicao)}<br>
            <b>PDV Expedição:</b> ${textoFicha(registro.pdv_expedicao)}<br>
            <b>Feirão:</b> ${textoFicha(registro.feirao)}<br>
            <b>Dt. Conserto:</b> ${textoFicha(registro.dt_conserto)}<br>
            <b>Tipo Garantia:</b> ${textoFicha(registro.tipo_garantia)}<br>
            <b>CPP:</b> ${textoFicha(registro.nr_cpp)} / ${textoFicha(registro.sit_cpp)}<br>
            <b>Obs. Expedição:</b> ${textoFicha(registro.obs_expedicao)}<br>
            <b>Obs. CPP:</b> ${textoFicha(registro.obs_cpp)}
        `;
    }

    esconderTelas();
    document.getElementById("telaFicha").style.display = "block";
    carregarCentralOS(registro);
}

function montarCardResultadoSupabase(item){
    const div = document.createElement("div");
    div.className = "item-resultado";
    div.onclick = function(){ abrirFichaRegistro(item); };
    div.innerHTML =
        "<b>O.S:</b> " + escaparHTML(item.os || "") +
        "<br><b>Produto:</b> " + escaparHTML(item.desc_produto || "") +
        "<br><b>Série:</b> " + escaparHTML(item.n_serie || "") +
        "<br><b>PDV:</b> " + escaparHTML(item.pdv || "") +
        "<br><b>Técnico:</b> " + escaparHTML(item.tecnico || "") +
        "<br><b>Status:</b> " + escaparHTML(item.status || "");
    return div;
}

function limparTermoSupabase(termo){
    return String(termo || "").replace(/[,%]/g, " ").trim();
}

async function buscarAutomatico(){
    const termoOriginal = document.getElementById("campoBusca").value;
    const termo = limparTermoSupabase(termoOriginal);
    const area = document.getElementById("resultadosBusca");
    const msg = document.getElementById("msgBusca");

    area.innerHTML = "";

    if(termo.length < 2){
        msg.innerHTML = "Digite pelo menos 2 caracteres.";
        return;
    }

    try{
        const supa = obterSupabaseClient();
        msg.innerHTML = "Pesquisando no Supabase...";

        const filtro = [
            "os.ilike.%" + termo + "%",
            "n_serie.ilike.%" + termo + "%",
            "nf.ilike.%" + termo + "%",
            "desc_produto.ilike.%" + termo + "%",
            "tecnico.ilike.%" + termo + "%",
            "pdv.ilike.%" + termo + "%",
            "status.ilike.%" + termo + "%",
            "nce.ilike.%" + termo + "%"
        ].join(",");

        const { data, error } = await supa
            .from("rexpedlr")
            .select("os,dt_geracao,pdv,nf,alm,grupo,nce,desc_produto,cor,n_serie,valor_transf,tecnico,rack,status,usuario,depreciacao,obs_expedicao,dt_expedicao,pdv_expedicao,feirao,analise_do_defeito,dt_conserto,obs_status,obs_ordem_de_servico,solicitante_cpp,data_cpp,nr_cpp,sit_cpp,obs_cpp,recebedor_cpp,data_recebedor,dt_ult_entrada,dt_saida_oficina,dt_recb_at,status_da_os,tipo_garantia")
            .or(filtro)
            .limit(50);

        if(error) throw error;

        const resultados = data || [];

        if(resultados.length === 0){
            msg.innerHTML = "Nenhum resultado encontrado no Supabase.";
            return;
        }

        msg.innerHTML = resultados.length + " resultado(s) encontrado(s) no Supabase.";

        resultados.forEach(function(item){
            area.appendChild(montarCardResultadoSupabase(item));
        });
    }catch(e){
        msg.innerHTML = "Erro ao pesquisar no Supabase: " + (e.message || e);
    }
}


/* =========================
VERSÃO 2.0 - GRÁFICOS, RELATÓRIOS E MODO ESCURO
========================= */
let dashboardCharts = {};
let relatorioAtual = [];

function alternarModoEscuro(){
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("MODO_ESCURO_AT", document.body.classList.contains("dark-mode") ? "1" : "0");
}

(function aplicarModoEscuroSalvo(){
    if(localStorage.getItem("MODO_ESCURO_AT") === "1") document.body.classList.add("dark-mode");
})();

function abrirRelatorios(){
    if(!exigirPermissao(["administrador","supervisor"], "Relatórios")) return;
    esconderTelas();
    definirMenuAtivo("relatorios");
    document.getElementById("telaRelatorios").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
}

function destruirChart(id){
    if(dashboardCharts[id]){
        dashboardCharts[id].destroy();
        delete dashboardCharts[id];
    }
}

function criarChart(id, tipo, pares, titulo){
    const canvas = document.getElementById(id);
    if(!canvas || !window.Chart) return;
    destruirChart(id);
    const dados = (pares || []).filter(p => p[0] !== "(vazio)").slice(0, 10);
    dashboardCharts[id] = new Chart(canvas, {
        type: tipo,
        data: {
            labels: dados.map(p => p[0]),
            datasets: [{ label: titulo, data: dados.map(p => p[1]) }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: tipo === "doughnut" }, title: { display: false } },
            scales: tipo === "doughnut" ? {} : { y: { beginAtZero: true } }
        }
    });
}

function renderGraficosDashboard(porStatus, porTecnico, porPDV){
    criarChart("chartStatus", "doughnut", porStatus, "O.S por Status");
    criarChart("chartTecnicos", "bar", porTecnico, "O.S por Técnico");
    criarChart("chartPDV", "bar", porPDV, "O.S por PDV");
}

async function gerarRelatorioOS(){
    const msg = document.getElementById("relMensagem");
    const area = document.getElementById("relatorioTabela");
    try{
        msg.innerHTML = "Consultando Supabase...";
        const termo = limparTermoSupabase(document.getElementById("relTermo").value || "");
        const status = (document.getElementById("relStatus").value || "").trim();
        const tecnico = (document.getElementById("relTecnico").value || "").trim();
        const pdv = (document.getElementById("relPDV").value || "").trim();
        const supa = obterSupabaseClient();
        let q = supa.from("rexpedlr")
            .select("os,grupo,dt_geracao,pdv,nf,nce,desc_produto,cor,n_serie,tecnico,rack,status,status_da_os,dt_recb_at")
            .limit(1000);
        if(status) q = q.ilike("status", "%" + status + "%");
        if(tecnico) q = q.ilike("tecnico", "%" + tecnico + "%");
        if(pdv) q = q.ilike("pdv", "%" + pdv + "%");
        if(termo.length >= 2){
            const filtro = [
                "os.ilike.%" + termo + "%",
                "n_serie.ilike.%" + termo + "%",
                "nf.ilike.%" + termo + "%",
                "desc_produto.ilike.%" + termo + "%",
                "tecnico.ilike.%" + termo + "%",
                "pdv.ilike.%" + termo + "%",
                "status.ilike.%" + termo + "%",
                "nce.ilike.%" + termo + "%"
            ].join(",");
            q = q.or(filtro);
        }
        const { data, error } = await q;
        if(error) throw error;
        const categoria = (document.getElementById("relCategoria")?.value || "").trim();
        relatorioAtual = (data || []).map(r=>({...r,categoria:classificarCategoriaProduto(r.desc_produto,r.grupo)}));
        if(categoria) relatorioAtual = relatorioAtual.filter(r=>r.categoria===categoria);
        document.getElementById("relTotal").innerHTML = relatorioAtual.length;
        document.getElementById("relQtdStatus").innerHTML = contarPorCampo(relatorioAtual, "status").filter(x=>x[0]!=="(vazio)").length;
        document.getElementById("relQtdTecnicos").innerHTML = contarPorCampo(relatorioAtual, "tecnico").filter(x=>x[0]!=="(vazio)").length;
        document.getElementById("relQtdPDV").innerHTML = contarPorCampo(relatorioAtual, "pdv").filter(x=>x[0]!=="(vazio)").length;
        area.style.display = "block";
        area.innerHTML = renderTabelaRelatorio(relatorioAtual);
        msg.innerHTML = "<span class='admin-status-ok'>Relatório gerado:</span> " + relatorioAtual.length + " registro(s).";
    }catch(e){
        msg.innerHTML = "<span class='admin-status-erro'>Erro no relatório:</span> " + (e.message || e);
    }
}

function renderTabelaRelatorio(lista){
    if(!lista || lista.length === 0) return "<div class='admin-info'>Nenhum registro encontrado.</div>";
    let html = "<table><thead><tr><th>O.S</th><th>GR</th><th>NCE</th><th>Produto</th><th>Categoria</th><th>Data</th><th>PDV</th><th>NF</th><th>Cor</th><th>Série</th><th>Técnico</th><th>Status</th><th>Dt. Recb/AT</th></tr></thead><tbody>";
    lista.forEach(function(r){
        html += "<tr><td><b>" + escaparHTML(r.os||"") + "</b></td><td>" + escaparHTML(r.grupo||"") + "</td><td>" + escaparHTML(r.nce||"") + "</td><td>" + escaparHTML(r.desc_produto||"") + "</td><td>" + escaparHTML(r.categoria||classificarCategoriaProduto(r.desc_produto,r.grupo)) + "</td><td>" + escaparHTML(r.dt_geracao||"") + "</td><td>" + escaparHTML(r.pdv||"") + "</td><td>" + escaparHTML(r.nf||"") + "</td><td>" + escaparHTML(r.cor||"") + "</td><td>" + escaparHTML(r.n_serie||"") + "</td><td>" + escaparHTML(r.tecnico||"") + "</td><td>" + escaparHTML(r.status||"") + "</td><td>" + escaparHTML(r.dt_recb_at||"") + "</td></tr>";
    });
    html += "</tbody></table>";
    return html;
}

function exportarRelatorioCSV(){
    if(!relatorioAtual || relatorioAtual.length === 0){
        alert("Gere um relatório antes de exportar.");
        return;
    }
    const colunas = [
        ["O.S.", "os"],
        ["GR", "grupo"],
        ["N.C.E", "nce"],
        ["PRODUTO", "desc_produto"],
        ["CATEGORIA", "categoria"],
        ["DATA GERAÇÃO", "dt_geracao"],
        ["PDV", "pdv"],
        ["NF", "nf"],
        ["COR", "cor"],
        ["N. SÉRIE", "n_serie"],
        ["TÉCNICO", "tecnico"],
        ["RACK", "rack"],
        ["STATUS", "status"],
        ["STATUS DA O.S.", "status_da_os"],
        ["DATA RECEBIMENTO A.T.", "dt_recb_at"]
    ];
    const escaparCSV = function(valor){
        return '"' + String(valor ?? "").replace(/"/g,'""') + '"';
    };
    const linhas = [colunas.map(function(c){ return escaparCSV(c[0]); }).join(";")].concat(relatorioAtual.map(function(r){
        return colunas.map(function(c){ return escaparCSV(r[c[1]]); }).join(";");
    }));
    const blob = new Blob(["\ufeff" + linhas.join("\n")], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio_os_" + new Date().toISOString().slice(0,10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


/* =========================
VERSÃO 3.2 - GERENCIAMENTO DE USUÁRIOS
========================= */
let usuariosAdminLista = [];

function nomePerfilUsuario(perfil){
    return PERFIS_NOME[perfil] || perfil || "-";
}

async function carregarUsuariosAdmin(){
    if(!exigirPermissao(["administrador"], "Usuários")) return;
    const msg = document.getElementById("usuariosMensagem");
    const tabela = document.getElementById("usuariosTabela");
    if(msg) msg.innerHTML = "Carregando usuários...";
    if(tabela) tabela.style.display = "none";

    try{
        const supabase = obterSupabaseClient();
        const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .order("nome", { ascending:true });

        if(error) throw error;
        usuariosAdminLista = data || [];
        renderizarUsuariosAdmin(usuariosAdminLista);
        await carregarSolicitacoesCadastroV580();
        if(msg) msg.innerHTML = "<span class='admin-status-ok'>" + usuariosAdminLista.length + " usuário(s) carregado(s).</span>";
    }catch(e){
        if(msg) msg.innerHTML = "<span class='admin-status-erro'>Erro ao carregar usuários:</span> " + (e.message || e);
    }
}

function filtrarUsuariosAdmin(){
    const termo = (document.getElementById("usuariosBusca")?.value || "").toLowerCase().trim();
    if(!termo){
        renderizarUsuariosAdmin(usuariosAdminLista);
        return;
    }
    const filtrados = usuariosAdminLista.filter(function(u){
        return [u.id,u.nome,u.email,u.cargo,u.perfil,(u.ativo ? "ativo" : "inativo")]
            .join(" ").toLowerCase().includes(termo);
    });
    renderizarUsuariosAdmin(filtrados);
}

function renderizarUsuariosAdmin(lista){
    const tabela = document.getElementById("usuariosTabela");
    if(!tabela) return;

    if(!lista || lista.length === 0){
        tabela.style.display = "block";
        tabela.innerHTML = "<div class='admin-info'>Nenhum usuário encontrado.</div>";
        return;
    }

    let html = "<table class='usuarios-tabela'><thead><tr>" +
        "<th>Nome</th><th>E-mail</th><th>Cargo</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>UID</th><th>Ações</th>" +
        "</tr></thead><tbody>";

    lista.forEach(function(u){
        const ativo = u.ativo !== false;
        html += "<tr>" +
            "<td><b>" + escaparHTML(u.nome || "-") + "</b></td>" +
            "<td>" + escaparHTML(u.email || "-") + "</td>" +
            "<td>" + escaparHTML(u.cargo || "-") + "</td>" +
            "<td>" + escaparHTML(nomePerfilUsuario(u.perfil)) + "</td>" +
            "<td>" + (ativo ? "<span class='usuario-status-ativo'>🟢 Ativo</span>" : "<span class='usuario-status-inativo'>🔴 Inativo</span>") + "</td>" +
            "<td>" + escaparHTML(formatarDataHora(u.criado_em)) + "</td>" +
            "<td style='font-size:11px'>" + escaparHTML(u.id || "") + "</td>" +
            "<td>" +
                "<button class='usuario-acao' onclick=\"editarUsuarioAdmin('" + escaparHTML(u.id) + "')\">✏ Editar</button>" +
                "<button class='usuario-acao warn' onclick=\"alternarStatusUsuarioAdmin('" + escaparHTML(u.id) + "')\">" + (ativo ? "Bloquear" : "Ativar") + "</button>" +
                "<button class='usuario-acao danger' onclick=\"excluirUsuarioAdmin('" + escaparHTML(u.id) + "')\">Excluir</button>" +
            "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    tabela.style.display = "block";
    tabela.innerHTML = html;
}

function abrirModalUsuario(usuario){
    if(!exigirPermissao(["administrador"], "Usuários")) return;
    const editando = !!usuario;
    document.getElementById("modalUsuarioTitulo").innerHTML = editando ? "Editar Usuário" : "Novo Usuário";
    document.getElementById("usuarioModalInfo").innerHTML = editando
        ? "Edite o nome, cargo, perfil e situação. O e-mail e a senha do Supabase Authentication não são alterados por esta tela."
        : "Informe os dados do novo acesso. A conta será criada no Supabase Authentication e vinculada automaticamente ao perfil do ERP.";
    document.getElementById("usuarioEditandoIdOriginal").value = usuario?.id || "";
    document.getElementById("usuarioFormId").value = usuario?.id || "";
    document.getElementById("usuarioFormNome").value = usuario?.nome || "";
    document.getElementById("usuarioFormEmail").value = usuario?.email || "";
    document.getElementById("usuarioFormEmail").disabled = editando;
    document.getElementById("usuarioFormSenha").value = "";
    document.getElementById("usuarioFormConfirmarSenha").value = "";
    document.querySelectorAll(".usuario-senha-novo").forEach(el => el.style.display = editando ? "none" : "");
    document.getElementById("usuarioFormCargo").value = usuario?.cargo || "";
    document.getElementById("usuarioFormPerfil").value = usuario?.perfil || "consulta";
    document.getElementById("usuarioFormAtivo").value = (usuario?.ativo === false) ? "false" : "true";
    document.getElementById("btnSalvarUsuarioAdmin").textContent = editando ? "Salvar alterações" : "Criar usuário";
    document.getElementById("modalUsuarioMensagem").innerHTML = "";
    document.getElementById("modalUsuario").style.display = "flex";
}

function fecharModalUsuario(){
    const modal = document.getElementById("modalUsuario");
    if(modal) modal.style.display = "none";
}

function editarUsuarioAdmin(id){
    const usuario = usuariosAdminLista.find(function(u){ return u.id === id; });
    if(!usuario){
        alert("Usuário não encontrado na lista carregada.");
        return;
    }
    abrirModalUsuario(usuario);
}

async function salvarUsuarioAdmin(){
    if(!exigirPermissao(["administrador"], "Usuários")) return;

    const msg = document.getElementById("modalUsuarioMensagem");
    const botao = document.getElementById("btnSalvarUsuarioAdmin");
    const idOriginal = document.getElementById("usuarioEditandoIdOriginal").value;
    const editando = !!idOriginal;
    const nome = document.getElementById("usuarioFormNome").value.trim();
    const email = document.getElementById("usuarioFormEmail").value.trim().toLowerCase();
    const senha = document.getElementById("usuarioFormSenha").value;
    const confirmarSenha = document.getElementById("usuarioFormConfirmarSenha").value;
    const cargo = document.getElementById("usuarioFormCargo").value.trim();
    const perfil = document.getElementById("usuarioFormPerfil").value;
    const ativo = document.getElementById("usuarioFormAtivo").value === "true";

    if(!nome || !perfil){
        msg.innerHTML = "<span class='admin-status-erro'>Preencha nome e perfil.</span>";
        return;
    }

    if(!editando){
        if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
            msg.innerHTML = "<span class='admin-status-erro'>Informe um e-mail válido.</span>";
            return;
        }
        if(senha.length < 6){
            msg.innerHTML = "<span class='admin-status-erro'>A senha precisa ter pelo menos 6 caracteres.</span>";
            return;
        }
        if(senha !== confirmarSenha){
            msg.innerHTML = "<span class='admin-status-erro'>As senhas não conferem.</span>";
            return;
        }
    }

    try{
        botao.disabled = true;
        msg.innerHTML = editando ? "Salvando alterações..." : "Criando conta no Supabase Authentication...";

        const supabasePrincipal = obterSupabaseClient();

        if(editando){
            const { error } = await supabasePrincipal
                .from("usuarios")
                .update({ nome, cargo, perfil, ativo })
                .eq("id", idOriginal);

            if(error) throw error;

            await registrarAuditoria("usuario", "Perfil de usuário atualizado.", {
                id:idOriginal, nome, cargo, perfil, ativo
            });
            if(typeof criarNotificacaoV39 === "function"){
                await criarNotificacaoV39(
                    "Usuário atualizado",
                    nome + " teve o perfil atualizado com sucesso.",
                    "usuario",
                    { id:idOriginal, nome, perfil, ativo }
                );
            }

            msg.innerHTML = "<span class='admin-status-ok'>Alterações salvas com sucesso.</span>";
        }else{
            const url = localStorage.getItem("SUPABASE_URL") || SUPABASE_URL_PADRAO;
            const key = localStorage.getItem("SUPABASE_ANON_KEY") || SUPABASE_ANON_KEY_PADRAO;

            // Cliente separado para criar a conta sem substituir/desconectar a sessão do administrador.
            const clienteCadastro = window.supabase.createClient(url, key, {
                auth:{
                    persistSession:false,
                    autoRefreshToken:false,
                    detectSessionInUrl:false
                }
            });

            const { data:authData, error:authError } = await clienteCadastro.auth.signUp({
                email,
                password:senha,
                options:{
                    data:{ nome, cargo, perfil }
                }
            });

            if(authError) throw authError;
            const novoId = authData?.user?.id;
            if(!novoId) throw new Error("O Supabase não retornou o UID do novo usuário.");

            msg.innerHTML = "Conta criada. Gravando perfil no ERP...";

            const payloadBase = { id:novoId, nome, cargo, perfil, ativo };
            let perfilError = null;

            // Tenta salvar também o e-mail caso a tabela possua essa coluna.
            let resposta = await supabasePrincipal
                .from("usuarios")
                .insert({ ...payloadBase, email });

            if(resposta.error && /email|column/i.test(resposta.error.message || "")){
                resposta = await supabasePrincipal.from("usuarios").insert(payloadBase);
            }
            perfilError = resposta.error;

            if(perfilError){
                throw new Error(
                    "A conta foi criada no Authentication, mas o perfil não pôde ser salvo na tabela usuarios: " +
                    (perfilError.message || perfilError)
                );
            }

            await registrarAuditoria("usuario", "Novo usuário criado pelo ERP.", {
                id:novoId, nome, email, cargo, perfil, ativo
            });
            if(typeof criarNotificacaoV39 === "function"){
                await criarNotificacaoV39(
                    "Novo usuário criado",
                    nome + " foi cadastrado com o perfil " + nomePerfilUsuario(perfil) + ".",
                    "usuario",
                    { id:novoId, nome, email, perfil, ativo }
                );
            }

            const confirmacao = authData?.session
                ? "O usuário já pode entrar com o e-mail e a senha cadastrados."
                : "A conta foi criada. Caso a confirmação de e-mail esteja ativa no Supabase, o usuário deverá confirmar o e-mail antes do primeiro acesso.";

            msg.innerHTML = "<span class='admin-status-ok'>Usuário criado com sucesso.</span><br>" + escaparHTML(confirmacao);
        }

        await carregarUsuariosAdmin();
        setTimeout(fecharModalUsuario, editando ? 700 : 1800);
    }catch(e){
        msg.innerHTML = "<span class='admin-status-erro'>Erro ao salvar:</span> " + escaparHTML(e.message || String(e));
    }finally{
        botao.disabled = false;
    }
}

document.addEventListener("keydown",function(event){
    if(event.key==="Escape"){
        const modal=document.getElementById("modalUsuario");
        if(modal&&getComputedStyle(modal).display!=="none")fecharModalUsuario();
    }
});

async function alternarStatusUsuarioAdmin(id){
    if(!exigirPermissao(["administrador"], "Usuários")) return;
    const usuario = usuariosAdminLista.find(function(u){ return u.id === id; });
    if(!usuario) return;

    const novoStatus = usuario.ativo === false;
    const texto = novoStatus ? "ativar" : "bloquear";
    if(!confirm("Deseja " + texto + " este usuário?")) return;

    try{
        const supabase = obterSupabaseClient();
        const { error } = await supabase.from("usuarios").update({ ativo: novoStatus }).eq("id", id);
        if(error) throw error;
        registrarAuditoria("usuario", novoStatus ? "Usuário ativado." : "Usuário bloqueado.", { id: id, nome: usuario.nome || "", ativo: novoStatus });
        await carregarUsuariosAdmin();
    }catch(e){
        alert("Erro ao alterar status: " + (e.message || e));
    }
}

async function excluirUsuarioAdmin(id){
    if(!exigirPermissao(["administrador"], "Usuários")) return;
    if(id === usuarioLogado?.id){
        alert("Você não pode excluir o próprio perfil enquanto está logado.");
        return;
    }
    if(!confirm("Deseja excluir este perfil da tabela usuarios? O usuário do Authentication não será apagado.")) return;

    try{
        const supabase = obterSupabaseClient();
        const { error } = await supabase.from("usuarios").delete().eq("id", id);
        if(error) throw error;
        registrarAuditoria("usuario", "Perfil de usuário excluído.", { id: id });
        await carregarUsuariosAdmin();
    }catch(e){
        alert("Erro ao excluir perfil: " + (e.message || e));
    }
}


/* =========================
VERSÃO 3.3 - CENTRAL DE AUDITORIA
========================= */
let auditoriaLista = [];

function montarDetalheAuditoria(detalhes){
    if(!detalhes) return "";
    if(typeof detalhes === "string") return detalhes;
    try{
        return Object.entries(detalhes).map(function(par){
            return par[0] + ": " + par[1];
        }).join(" | ");
    }catch(e){
        return String(detalhes);
    }
}

async function registrarAuditoria(acao, detalhes, extra){
    try{
        const supabase = obterSupabaseClient();
        const payload = {
            usuario: usuarioLogado?.id || null,
            usuario_nome: usuarioLogado?.nome || null,
            usuario_perfil: usuarioLogado?.perfil || null,
            acao: acao || "acao",
            detalhes: montarDetalheAuditoria(detalhes),
            extra: extra || null
        };
        await supabase.from("auditoria").insert(payload);
    }catch(e){
        console.warn("Auditoria não registrada:", e?.message || e);
    }
}

function classeAcaoAuditoria(acao){
    acao = String(acao || "").toLowerCase();
    if(acao.includes("login")) return "login";
    if(acao.includes("logout")) return "logout";
    if(acao.includes("import")) return "importacao";
    if(acao === "ci" || acao.includes("c.i")) return "ci";
    if(acao.includes("usuario")) return "usuario";
    return "";
}

async function carregarAuditoria(){
    if(!exigirPermissao(["administrador"], "Auditoria")) return;
    const msg = document.getElementById("auditoriaMensagem");
    const tabela = document.getElementById("auditoriaTabela");
    if(msg) msg.innerHTML = "Carregando auditoria...";
    if(tabela) tabela.style.display = "none";

    try{
        const supabase = obterSupabaseClient();
        let query = supabase
            .from("auditoria")
            .select("id,data_hora,criado_em,usuario,usuario_nome,usuario_perfil,acao,detalhes,extra")
            .order("data_hora", { ascending:false })
            .limit(300);

        const acao = document.getElementById("auditoriaAcao")?.value || "";
        const ini = document.getElementById("auditoriaDataIni")?.value || "";
        const fim = document.getElementById("auditoriaDataFim")?.value || "";

        if(acao) query = query.eq("acao", acao);
        if(ini) query = query.gte("data_hora", ini + "T00:00:00");
        if(fim) query = query.lte("data_hora", fim + "T23:59:59");

        const { data, error } = await query;
        if(error) throw error;

        auditoriaLista = data || [];
        renderizarAuditoria(auditoriaLista);
        atualizarResumoAuditoria(auditoriaLista);
        if(msg) msg.innerHTML = "<span class='admin-status-ok'>" + auditoriaLista.length + " registro(s) de auditoria carregado(s).</span>";
    }catch(e){
        if(msg) msg.innerHTML = "<span class='admin-status-erro'>Erro ao carregar auditoria:</span> " + (e.message || e);
    }
}

function atualizarResumoAuditoria(lista){
    lista = lista || [];
    setDash("audTotalLogs", lista.length);
    setDash("audTotalLogins", lista.filter(x => String(x.acao || "").toLowerCase() === "login").length);
    setDash("audTotalImportacoes", lista.filter(x => String(x.acao || "").toLowerCase() === "importacao").length);
    setDash("audTotalCI", lista.filter(x => String(x.acao || "").toLowerCase() === "ci").length);
}

function filtrarAuditoriaLocal(){
    const termo = (document.getElementById("auditoriaTermo")?.value || "").toLowerCase().trim();
    if(!termo){
        renderizarAuditoria(auditoriaLista);
        atualizarResumoAuditoria(auditoriaLista);
        return;
    }
    const filtrada = auditoriaLista.filter(function(a){
        return [a.usuario_nome,a.usuario_perfil,a.acao,a.detalhes,JSON.stringify(a.extra || {})].join(" ").toLowerCase().includes(termo);
    });
    renderizarAuditoria(filtrada);
    atualizarResumoAuditoria(filtrada);
}

function renderizarAuditoria(lista){
    const tabela = document.getElementById("auditoriaTabela");
    if(!tabela) return;
    if(!lista || lista.length === 0){
        tabela.style.display = "block";
        tabela.innerHTML = "<div class='admin-info'>Nenhum registro de auditoria encontrado.</div>";
        return;
    }
    let html = "<table class='auditoria-tabela'><thead><tr><th>Data/Hora</th><th>Usuário</th><th>Perfil</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody>";
    lista.forEach(function(a){
        const dataHora = a.data_hora || a.criado_em;
        const acao = escaparHTML(a.acao || "-");
        const cls = classeAcaoAuditoria(a.acao);
        html += "<tr>" +
            "<td>" + escaparHTML(formatarDataHora(dataHora)) + "</td>" +
            "<td><b>" + escaparHTML(a.usuario_nome || a.usuario || "-") + "</b></td>" +
            "<td>" + escaparHTML(nomePerfilUsuario(a.usuario_perfil || "")) + "</td>" +
            "<td><span class='auditoria-badge " + cls + "'>" + acao + "</span></td>" +
            "<td class='detalhes'>" + escaparHTML(a.detalhes || montarDetalheAuditoria(a.extra) || "-") + "</td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    tabela.style.display = "block";
    tabela.innerHTML = html;
}

function exportarAuditoriaCSV(){
    const lista = auditoriaLista || [];
    if(lista.length === 0){
        alert("Carregue a auditoria antes de exportar.");
        return;
    }
    const linhas = [["data_hora","usuario","perfil","acao","detalhes"].join(";")].concat(lista.map(function(a){
        return [
            formatarDataHora(a.data_hora || a.criado_em),
            a.usuario_nome || a.usuario || "",
            a.usuario_perfil || "",
            a.acao || "",
            a.detalhes || montarDetalheAuditoria(a.extra) || ""
        ].map(function(v){ return '"' + String(v).replace(/"/g,'""') + '"'; }).join(";");
    }));
    const blob = new Blob(["\ufeff" + linhas.join("\n")], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auditoria_" + new Date().toISOString().slice(0,10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


recuperarSessao();
if(usuarioLogado){
    baixarCSV();
}

/* =========================
CORREÇÃO V3.2.1 - FUNÇÃO GLOBAL DE DATA/HORA
========================= */
function formatarDataHora(valor) {
    if (!valor) return "-";

    const data = new Date(valor);

    if (isNaN(data.getTime())) {
        return valor;
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* =========================
VERSÃO 3.4 - HISTÓRICO DE C.I.
========================= */
let historicoCILista = [];
let historicoCIAtual = null;
let ultimoHistoricoCIHash = "";
let ultimoHistoricoCITempo = 0;

function limparNumeroCIInterno(valor){
    return String(valor||"").trim().replace(/\s+/g," ");
}
function obterNumeroCIInformado(){
    const editavel=document.getElementById("ciNumeroInternoEdit");
    const preview=document.getElementById("ciNumeroInterno");
    const telaEditavel=document.getElementById("telaPlanilhaCI");
    const usaEditavel=telaEditavel&&getComputedStyle(telaEditavel).display!=="none";
    return limparNumeroCIInterno(usaEditavel?(editavel?.value||""):(preview?.value||""));
}
function sincronizarNumeroCIInterno(valor){
    const numero=limparNumeroCIInterno(valor);
    const a=document.getElementById("ciNumeroInterno");
    const b=document.getElementById("ciNumeroInternoEdit");
    if(a)a.value=numero;
    if(b)b.value=numero;
}
function validarNumeroCIInterno(numero){
    if(!numero)return true;
    if(numero.length>80)throw new Error("O número interno da C.I. deve ter no máximo 80 caracteres.");
    if(/[<>]/.test(numero))throw new Error("O número interno contém caracteres inválidos.");
    return true;
}

function numeroCINovo(){
    const d = new Date();
    const p = n => String(n).padStart(2,"0");
    return "CI-" + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
}
function obterListaOSHistoricoCI(){
    const a = separarLista((document.getElementById("ciOS")||{}).value || "");
    if(a.length) return a;
    if(planilhaCI && typeof planilhaCI.getData === "function"){
        try{
            const cfg = configCIAtual();
            const idx = cfg && cfg.osIndex !== undefined ? cfg.osIndex : 5;
            return planilhaCI.getData().map(r=>String(r[idx]||"").trim()).filter(Boolean);
        }catch(e){}
    }
    return [];
}
function prepararHTMLHistoricoCI(origem){
    const fonte = origem === "preview" ? document.getElementById("ciPreview") : document.getElementById("ciEditDocumento");
    if(!fonte) return "";
    const clone = fonte.cloneNode(true);
    clone.querySelectorAll("select").forEach((sel,i)=>{
        const original = fonte.querySelectorAll("select")[i];
        if(original){
            [...sel.options].forEach(o=>o.removeAttribute("selected"));
            if(sel.options[original.selectedIndex]) sel.options[original.selectedIndex].setAttribute("selected","selected");
        }
    });
    clone.querySelectorAll("input,textarea").forEach((el,i)=>{
        const original = fonte.querySelectorAll("input,textarea")[i];
        if(original){ if(el.tagName==="TEXTAREA") el.textContent=original.value; else el.setAttribute("value",original.value); }
    });
    clone.querySelectorAll("script,.ci-edit-actions,.ci-doc-acoes").forEach(e=>e.remove());
    return clone.outerHTML;
}
async function salvarHistoricoCI(origem, opcoes = {}){
    if(!usuarioLogado || !ciAtual){
        throw new Error("Usuário ou modelo de C.I. não identificado.");
    }

    const html = prepararHTMLHistoricoCI(origem);
    if(!html) throw new Error("Não foi possível capturar o conteúdo da C.I.");

    const listaOS = obterListaOSHistoricoCI().map(x => String(x).trim()).filter(Boolean);
    const listaNormalizada = [...listaOS].sort().join(", ");
    const hash = ciAtual + "|" + listaNormalizada + "|" + html;

    // Proteção imediata contra clique duplo ou chamadas repetidas.
    if(hash === ultimoHistoricoCIHash && Date.now() - ultimoHistoricoCITempo < 30000){
        return historicoCIAtual && historicoCIAtual.numero_ci ? historicoCIAtual.numero_ci : null;
    }

    const sb = obterSupabaseClient();
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Evita duplicar uma C.I. idêntica gerada ou impressa novamente em até 5 minutos.
    const {data: recentes, error: erroConsulta} = await sb
        .from("ci_historico")
        .select("id,numero_ci,html_ci,lista_os,tipo_ci,data_emissao")
        .eq("usuario", usuarioLogado.id)
        .eq("tipo_ci", ciAtual)
        .gte("data_emissao", cincoMinutosAtras)
        .order("data_emissao", {ascending:false})
        .limit(10);

    if(erroConsulta) throw erroConsulta;

    const existente = (recentes || []).find(item =>
        String(item.lista_os || "").split(",").map(x=>x.trim()).filter(Boolean).sort().join(", ") === listaNormalizada &&
        String(item.html_ci || "") === html
    );

    if(existente){
        ultimoHistoricoCIHash = hash;
        ultimoHistoricoCITempo = Date.now();
        historicoCIAtual = existente;
        const msg = document.getElementById("ciEditMensagem") || document.getElementById("ciMensagem");
        if(msg) msg.innerHTML = "Esta C.I. já estava salva recentemente como <b>" + escaparHTML(existente.numero_ci) + "</b>. Nenhuma cópia duplicada foi criada.";
        sincronizarNumeroCIInterno(existente.numero_ci);
        return existente.numero_ci;
    }

    const numeroInformado = obterNumeroCIInformado();
    validarNumeroCIInterno(numeroInformado);
    const numero = numeroInformado || numeroCINovo();
    sincronizarNumeroCIInterno(numero);
    const obs = (document.querySelector(".ci-edit-obs [contenteditable='true']") || {}).innerText || "";
    const payload = {
        numero_ci: numero,
        tipo_ci: ciAtual,
        usuario: usuarioLogado.id,
        usuario_nome: usuarioLogado.nome || usuarioLogado.email || "Usuário",
        quantidade_os: listaOS.length,
        lista_os: listaOS.join(", "),
        observacoes: obs,
        html_ci: html,
        status: "Emitida"
    };

    const {data: inserido, error} = await sb
        .from("ci_historico")
        .insert(payload)
        .select()
        .single();

    if(error) throw error;

    ultimoHistoricoCIHash = hash;
    ultimoHistoricoCITempo = Date.now();
    historicoCIAtual = inserido || payload;

    registrarAuditoria("ci", numero + " emitida / " + nomeCIAtual(), {
        numero_ci: numero,
        tipo: ciAtual,
        quantidade: listaOS.length,
        os: listaOS.join(", "),
        salvamento: opcoes.automatico ? "automatico" : "manual",
        motivo: opcoes.motivo || "nao_informado"
    });

    const msg = document.getElementById("ciEditMensagem") || document.getElementById("ciMensagem");
    if(msg) msg.innerHTML = "C.I. salva automaticamente no histórico como <b>" + escaparHTML(numero) + "</b>.";
    return numero;
}
async function carregarHistoricoCI(){
    const msg=document.getElementById("cihMensagem"), tabela=document.getElementById("cihTabela");
    if(msg) msg.innerHTML="Carregando histórico...";
    try{
        const {data,error}=await obterSupabaseClient().from("ci_historico").select("*").order("data_emissao",{ascending:false}).limit(1000);
        if(error) throw error;
        historicoCILista=data||[];
        atualizarResumoHistoricoCI(); filtrarHistoricoCI();
        if(msg) msg.innerHTML="<span class='admin-status-ok'>Histórico carregado com sucesso.</span>";
    }catch(e){ if(msg) msg.innerHTML="<span class='admin-status-erro'>Erro ao carregar histórico: "+escaparHTML(e.message||String(e))+"</span>"; if(tabela)tabela.innerHTML=""; }
}
function atualizarResumoHistoricoCI(){
    const agora=new Date(), inicioHoje=new Date(agora.getFullYear(),agora.getMonth(),agora.getDate()), inicio30=new Date(agora.getTime()-30*86400000);
    const datas=historicoCILista.map(x=>new Date(x.data_emissao));
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
    set("cihTotal",historicoCILista.length.toLocaleString("pt-BR"));
    set("cihHoje",datas.filter(d=>!isNaN(d)&&d>=inicioHoje).length.toLocaleString("pt-BR"));
    set("cih30",datas.filter(d=>!isNaN(d)&&d>=inicio30).length.toLocaleString("pt-BR"));
    set("cihMaior",(Math.max(0,...historicoCILista.map(x=>Number(x.quantidade_os)||0))).toLocaleString("pt-BR")+" O.S.");
}
function nomeTipoCI(v){return ({regiao:"Região",teresina:"Teresina",pmr:"PMR",geit:"GEIT",assurant:"Assurant",outros:"Outros"})[v]||v||"-"}
function filtrarHistoricoCI(){
    const termo=normalizarTexto((document.getElementById("cihBusca")||{}).value||"");
    const tipo=(document.getElementById("cihTipo")||{}).value||"";
    const status=(document.getElementById("cihStatus")||{}).value||"";
    const lista=historicoCILista.filter(x=>(!tipo||x.tipo_ci===tipo)&&(!status||x.status===status)&&(!termo||normalizarTexto([x.numero_ci,x.lista_os,x.usuario_nome,x.tipo_ci].join(" ")).includes(termo)));
    renderizarHistoricoCI(lista);
}
function renderizarHistoricoCI(lista){
    const el=document.getElementById("cihTabela"); if(!el)return;
    if(!lista.length){el.innerHTML="<div class='admin-info'>Nenhuma C.I. encontrada.</div>";return;}
    let h="<table class='cih-tabela'><thead><tr><th>Número</th><th>Tipo</th><th>Data</th><th>Usuário</th><th>O.S.</th><th>Status</th><th>Ações</th></tr></thead><tbody>";
    lista.forEach(x=>{h+="<tr><td><b>"+escaparHTML(x.numero_ci||String(x.id))+"</b></td><td>"+escaparHTML(nomeTipoCI(x.tipo_ci))+"</td><td>"+escaparHTML(formatarDataHora(x.data_emissao))+"</td><td>"+escaparHTML(x.usuario_nome||"-")+"</td><td>"+(Number(x.quantidade_os)||0)+"</td><td>"+escaparHTML(x.status||"-")+"</td><td><button class='cih-acao' onclick='visualizarHistoricoCI("+Number(x.id)+")'>Visualizar / número</button><button class='cih-acao sec' onclick='imprimirHistoricoCIDireto("+Number(x.id)+")'>Reimprimir</button><button class='cih-acao warn' onclick='duplicarHistoricoCI("+Number(x.id)+")'>Duplicar</button></td></tr>"});
    el.innerHTML=h+"</tbody></table>";
}
function obterHistoricoCI(id){return historicoCILista.find(x=>Number(x.id)===Number(id))}
function visualizarHistoricoCI(id){
    const x=obterHistoricoCI(id);if(!x)return; historicoCIAtual=x;
    document.getElementById("cihModalTitulo").textContent=(x.numero_ci||("CI "+x.id))+" • "+nomeTipoCI(x.tipo_ci);
    document.getElementById("cihModalInfo").textContent=formatarDataHora(x.data_emissao)+" • "+(x.usuario_nome||"-")+" • "+(x.quantidade_os||0)+" O.S.";
    document.getElementById("cihNumeroInterno").value=x.numero_ci||"";
    document.getElementById("cihNumeroMensagem").innerHTML="";
    document.getElementById("cihModalConteudo").innerHTML=x.html_ci||"<div class='admin-info'>Documento sem cópia visual.</div>";
    document.getElementById("cihModal").style.display="flex";
}
async function atualizarNumeroHistoricoCI(){
    if(!historicoCIAtual)return;
    if(!exigirPermissao(["administrador","supervisor"],"Alterar número da C.I."))return;

    const msg=document.getElementById("cihNumeroMensagem");
    const novo=limparNumeroCIInterno((document.getElementById("cihNumeroInterno")||{}).value);
    try{
        validarNumeroCIInterno(novo);
        if(!novo)throw new Error("Informe o número interno da C.I.");

        const antigo=historicoCIAtual.numero_ci||"";
        if(novo===antigo){
            msg.innerHTML="<span class='admin-status-alerta'>O número informado já é o atual.</span>";
            return;
        }

        msg.innerHTML="Salvando numeração interna...";
        const {data,error}=await obterSupabaseClient()
            .from("ci_historico")
            .update({numero_ci:novo})
            .eq("id",historicoCIAtual.id)
            .select()
            .single();

        if(error)throw error;

        historicoCIAtual=data||{...historicoCIAtual,numero_ci:novo};
        const idx=historicoCILista.findIndex(x=>Number(x.id)===Number(historicoCIAtual.id));
        if(idx>=0)historicoCILista[idx]=historicoCIAtual;

        document.getElementById("cihModalTitulo").textContent=novo+" • "+nomeTipoCI(historicoCIAtual.tipo_ci);
        msg.innerHTML="<span class='admin-status-ok'>Número interno atualizado com sucesso.</span>";
        renderizarHistoricoCI(historicoCILista);

        await registrarAuditoria("ci","Número interno da C.I. alterado.",{
            id:historicoCIAtual.id,
            numero_anterior:antigo||null,
            numero_novo:novo,
            tipo:historicoCIAtual.tipo_ci
        });
        if(typeof criarNotificacaoV39==="function"){
            await criarNotificacaoV39(
                "Número da C.I. atualizado",
                "A C.I. "+(antigo||historicoCIAtual.id)+" passou a usar o número interno "+novo+".",
                "ci",
                {id:historicoCIAtual.id,numero_anterior:antigo||null,numero_ci:novo}
            );
        }
    }catch(e){
        msg.innerHTML="<span class='admin-status-erro'>Erro ao atualizar:</span> "+escaparHTML(e.message||String(e));
    }
}
function fecharModalHistoricoCI(){document.getElementById("cihModal").style.display="none";historicoCIAtual=null}
function documentoImpressaoHistoricoCI(x){
    const estilos=[...document.querySelectorAll("style,link[rel='stylesheet']")].map(e=>e.outerHTML).join("\n");
    return "<!doctype html><html><head><meta charset='utf-8'><title>"+escaparHTML(x.numero_ci||"C.I.")+"</title>"+estilos+"<style>body{background:#fff!important;margin:0}.segunda-via-cab{font:700 12px Arial;text-align:center;margin:4px 0}.cih-print{padding:0}</style></head><body><div class='segunda-via-cab'>SEGUNDA VIA • "+escaparHTML(x.numero_ci||"")+"</div><div class='cih-print'>"+(x.html_ci||"")+"</div><script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>";
}
async function imprimirHistoricoCIDireto(id){
    const x=obterHistoricoCI(id);
    if(!x)return;
    const w=window.open("","_blank");
    w.document.open();
    w.document.write(documentoImpressaoHistoricoCI(x));
    w.document.close();
    await registrarAuditoria("ci","Segunda via impressa: "+(x.numero_ci||x.id),{id:x.id,tipo:x.tipo_ci});
    try{
        await criarNotificacaoV39(
            "Segunda via enviada para impressão",
            "A segunda via da C.I. " + (x.numero_ci||x.id) + " foi enviada para impressão.",
            "impressao_ci_segunda_via",
            {id:x.id, numero_ci:x.numero_ci||null, tipo_ci:x.tipo_ci}
        );
    }catch(e){
        console.warn("Não foi possível registrar a notificação da segunda via:", e?.message || e);
    }
}
function imprimirHistoricoCIAtual(){if(historicoCIAtual)imprimirHistoricoCIDireto(historicoCIAtual.id)}
function duplicarHistoricoCI(id){
    const x=obterHistoricoCI(id);if(!x)return;
    fecharModalHistoricoCI(); abrirCI(x.tipo_ci); const os=String(x.lista_os||"").split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean);
    const campo=document.getElementById("ciOS");if(campo)campo.value=os.join("\n");
    const m=document.getElementById("ciEditMensagem")||document.getElementById("ciMensagem");if(m)m.innerHTML="C.I. duplicada a partir de <b>"+escaparHTML(x.numero_ci||String(x.id))+"</b>. Confira os dados antes de imprimir.";
    registrarAuditoria("ci","C.I. duplicada: "+(x.numero_ci||x.id),{id:x.id,tipo:x.tipo_ci,os:x.lista_os});
}

recuperarSessao();
if(usuarioLogado){
    baixarCSV();
}

/* =========================
CORREÇÃO V3.2.1 - FUNÇÃO GLOBAL DE DATA/HORA
========================= */
function formatarDataHora(valor) {
    if (!valor) return "-";

    const data = new Date(valor);

    if (isNaN(data.getTime())) {
        return valor;
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}




/* =========================
VERSÃO 3.5 ENTERPRISE - CENTRAL DE INTELIGÊNCIA OPERACIONAL
========================= */
let intelRegistros = [];
let intelAnalise = null;
let intelCarregando = false;

function abrirInteligencia(){
    if(!usuarioLogado){ mostrarBloqueioPermissao("Faça login para acessar a Central de Inteligência."); return; }
    esconderTelas();
    definirMenuAtivo("inteligencia");
    document.getElementById("telaInteligencia").style.display="block";
    document.getElementById("sidebar").classList.remove("mobile-open");
    carregarInteligencia(false);
}

async function buscarTodaRexpedlr(){
    const supa=obterSupabaseClient();
    const campos="os,dt_geracao,pdv,nf,grupo,nce,desc_produto,cor,n_serie,tecnico,rack,status,dt_expedicao,pdv_expedicao,analise_do_defeito,dt_conserto,obs_status,obs_ordem_de_servico,solicitante_cpp,data_cpp,nr_cpp,sit_cpp,recebedor_cpp,data_recebedor,dt_ult_entrada,dt_saida_oficina,dt_recb_at,status_da_os,tipo_garantia";
    let todos=[],inicio=0,tamanho=1000;
    while(true){
        const {data,error}=await supa.from("rexpedlr").select(campos).range(inicio,inicio+tamanho-1);
        if(error) throw error;
        const lote=data||[]; todos=todos.concat(lote);
        if(lote.length<tamanho || todos.length>=50000) break;
        inicio+=tamanho;
    }
    return todos;
}
function dataValidaIntel(v){ if(!v)return null; const d=new Date(v); return isNaN(d.getTime())?null:d; }
function diasDesdeIntel(v){const d=dataValidaIntel(v);if(!d)return null;return Math.floor((Date.now()-d.getTime())/86400000)}
function textoIntel(v){return String(v??"").trim()}
function grupoNumeroIntel(v){const n=parseInt(String(v??"").trim().replace(/[^0-9-]/g,""),10);return Number.isFinite(n)?n:null}
function contemIntel(v,p){return textoIntel(v).toUpperCase().includes(p)}
function ultimaDataIntel(r){return r.dt_expedicao||r.dt_saida_oficina||r.dt_conserto||r.data_recebedor||r.data_cpp||r.dt_ult_entrada||r.dt_recb_at||r.dt_geracao||null}
function contarIntel(lista,campo){const m={};lista.forEach(r=>{const k=textoIntel(r[campo])||"(vazio)";m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])}

function analisarIntel(registros){
    const prontas=registros.filter(r=>(contemIntel(r.status,"PRONT")||contemIntel(r.status_da_os,"PRONT"))&&!textoIntel(r.dt_expedicao));
    const paradas=registros.filter(r=>{const d=diasDesdeIntel(ultimaDataIntel(r));return d!==null&&d>30&&!textoIntel(r.dt_expedicao)});
    const cpp=registros.filter(r=>textoIntel(r.nr_cpp)||textoIntel(r.solicitante_cpp)||contemIntel(r.status,"CPP")).filter(r=>!contemIntel(r.sit_cpp,"CONCLU")&&!contemIntel(r.sit_cpp,"RECEB")&&!textoIntel(r.data_recebedor));
    const semTecnico=registros.filter(r=>!textoIntel(r.tecnico));
    const semRack=registros.filter(r=>!textoIntel(r.rack));
    const oficina=registros.filter(r=>!textoIntel(r.dt_saida_oficina)&&(textoIntel(r.dt_recb_at)||textoIntel(r.dt_conserto)||contemIntel(r.status,"OFIC")));
    const qualidade=registros.length?Math.round(registros.filter(r=>textoIntel(r.tecnico)&&textoIntel(r.rack)).length/registros.length*100):0;
    const prioridades=[];
    prontas.forEach(r=>prioridades.push({...r,_motivo:"Pronta aguardando expedição",_nivel:3,_dias:diasDesdeIntel(r.dt_conserto||r.dt_geracao)||0}));
    paradas.forEach(r=>prioridades.push({...r,_motivo:"Sem movimentação há mais de 30 dias",_nivel:4,_dias:diasDesdeIntel(ultimaDataIntel(r))||0}));
    cpp.forEach(r=>prioridades.push({...r,_motivo:"Pendência de CPP",_nivel:3,_dias:diasDesdeIntel(r.data_cpp||r.dt_geracao)||0}));
    const unicos=new Map();prioridades.sort((a,b)=>(b._nivel-a._nivel)||(b._dias-a._dias)).forEach(r=>{if(!unicos.has(r.os))unicos.set(r.os,r)});
    const rack500Abertas=registros.filter(r=>rackCorrespondeIntel(r.rack,"500")&&situacaoAbertaIntel(r));
    const prontasAbertas=registros.filter(r=>statusProntaIntel(r)&&situacaoAbertaIntel(r));
    const grupo1314Abertos=registros.filter(r=>situacaoAbertaIntel(r)&&[13,14].includes(grupoNumeroIntel(r.grupo)));
    const grupo52122Abertos=registros.filter(r=>situacaoAbertaIntel(r)&&[5,21,22].includes(grupoNumeroIntel(r.grupo)));
    const hojeIntel=new Date();hojeIntel.setHours(0,0,0,0);
    const expHoje=registros.filter(r=>{const d=parseDataIntel(r.dt_expedicao);return d&&d>=hojeIntel;});
    const abertas=registros.filter(r=>situacaoAbertaIntel(r));
    const fechadas=registros.filter(r=>!situacaoAbertaIntel(r));
    return {prontas,paradas,cpp,semTecnico,semRack,oficina,oficina20:oficina.filter(r=>(diasDesdeIntel(r.dt_recb_at||r.dt_conserto||r.dt_geracao)||0)>20),qualidade,rack500Abertas,prontasAbertas,grupo1314Abertos,grupo52122Abertos,expHoje,abertas,fechadas,prioridades:[...unicos.values()],tecnicos:contarIntel(registros,"tecnico"),pdvs:contarIntel(registros,"pdv"),status:contarIntel(registros,"status")};
}
function setIntel(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function barrasIntel(lista,max=8){if(!lista.length)return "<div class='admin-info'>Sem dados.</div>";const maior=lista[0][1]||1;return lista.slice(0,max).map(x=>"<div class='bar-row'><b>"+escaparHTML(x[0])+"</b><div class='bar-track'><div class='bar-fill' style='width:"+Math.max(3,Math.round(x[1]/maior*100))+"%'></div></div><strong>"+x[1]+"</strong></div>").join("")}
function renderIntel(){
    const a=intelAnalise; if(!a)return;
    setIntel("ikProntas",a.prontas.length);setIntel("ikParadas",a.paradas.length);setIntel("ikCpp",a.cpp.length);setIntel("ikQualidade",a.qualidade+"%");
    const alertas=[];
    if(a.paradas.length)alertas.push("<div class='intel-alert red' onclick=\"abrirListaIntel('paradas')\"><b>🔴 "+a.paradas.length+" O.S. sem movimentação há mais de 30 dias</b><span>Clique para abrir a lista ordenada por tempo parado.</span></div>");
    if(a.prontas.length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('prontas')\"><b>🟠 "+a.prontas.length+" produtos prontos aguardando expedição</b><span>Sem data de expedição preenchida.</span></div>");
    if(a.cpp.length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('cpp')\"><b>🟡 "+a.cpp.length+" pendências de CPP</b><span>CPP ainda sem conclusão ou recebimento.</span></div>");
    if(!alertas.length)alertas.push("<div class='intel-alert green'><b>🟢 Nenhuma prioridade crítica detectada</b><span>A base está sem alertas nas regras atuais.</span></div>");
    document.getElementById("intelAlertas").innerHTML=alertas.join("");
    document.getElementById("intelPrioridades").innerHTML=a.prioridades.slice(0,18).map(r=>"<div class='intel-row'><b>"+escaparHTML(r.os||"-")+"</b><span>"+escaparHTML(r._motivo)+"<br><small>"+escaparHTML(r.desc_produto||"")+"</small></span><span>"+(r._dias||0)+" dias</span><button onclick=\"abrirOSIntel('"+String(r.os).replace(/'/g,"\\'")+"')\">Abrir</button></div>").join("")||"<div class='admin-info'>Nenhuma prioridade.</div>";
    document.getElementById("intelPendencias").innerHTML=renderTabelaPendenciasIntel(a);
    document.getElementById("intelRankingTecnicos").innerHTML=barrasIntel(a.tecnicos.filter(x=>x[0]!=="(vazio)"),10);
    document.getElementById("intelRankingPDV").innerHTML=barrasIntel(a.pdvs.filter(x=>x[0]!=="(vazio)"),10);
    document.getElementById("intelMapa").innerHTML=barrasIntel(a.pdvs.filter(x=>x[0]!=="(vazio)"),12)+"<div class='admin-info' style='font-size:13px'>Distribuição baseada no campo PDV. Quando o cadastro de lojas tiver UF/região, este quadro passará a agrupar geograficamente.</div>";
    if(typeof renderDashboardOperacionalV55==="function")renderDashboardOperacionalV55();
}
async function carregarInteligencia(forcar){
    if(intelCarregando)return;if(intelRegistros.length&&!forcar){renderIntel();return}
    intelCarregando=true;const m=document.getElementById("intelMensagem");m.className="dashboard-loading";m.textContent="Analisando toda a base REXPEDLR...";
    try{
        intelRegistros=await buscarTodaRexpedlr();
        intelAnalise=analisarIntel(intelRegistros);
        renderIntel();
        if(typeof renderHomeIntegradaV502==="function") renderHomeIntegradaV502();
        if(typeof atualizarBadgeCopilotoERP==="function") atualizarBadgeCopilotoERP();
        if(typeof restaurarContextoCopiloto==="function") restaurarContextoCopiloto();
        m.className="dashboard-ok";
        m.textContent="Análise concluída: "+intelRegistros.length+" O.S. avaliadas em "+new Date().toLocaleTimeString("pt-BR")+".";
    }
    catch(e){m.className="dashboard-erro";m.textContent="Erro ao analisar a base: "+(e.message||e)}finally{intelCarregando=false}
}

function tabelaPendenciaHTML(titulo, chave, lista){
    const linhas=(lista||[]).slice(0,1000).map(r=>
        "<tr>"+
        "<td><button class='usuario-acao' onclick=\"abrirOSIntel('"+String(r.os||'').replace(/'/g,"\\'")+"')\">"+escaparHTML(r.os||'-')+"</button></td>"+
        "<td>"+escaparHTML(r.grupo||'-')+"</td>"+
        "<td>"+escaparHTML(r.desc_produto||'-')+"</td>"+
        "<td>"+escaparHTML(r.rack||'-')+"</td>"+
        "<td>"+escaparHTML(r.status||'-')+"</td>"+
        "<td>"+escaparHTML(r.status_da_os||'-')+"</td>"+
        "<td>"+escaparHTML(r.tecnico||'-')+"</td>"+
        "<td>"+escaparHTML(r.pdv||'-')+"</td>"+
        "</tr>"
    ).join("");
    return "<div class='intel-pend-bloco'>"+
      "<div class='intel-pend-topo'><h3>"+escaparHTML(titulo)+" <span class='contagem'>"+(lista||[]).length+"</span></h3>"+
      "<div class='intel-pend-acoes'><button class='intel-pend-btn' onclick=\"abrirListaIntel('"+chave+"')\">Ver relação</button>"+
      "<button class='intel-pend-btn exportar' onclick=\"exportarPendenciaIntelCSV('"+chave+"')\">Exportar arquivo ▾</button></div></div>"+
      ((lista||[]).length
        ? "<div class='intel-pend-tabela-wrap'><table class='intel-pend-tabela'><thead><tr><th>O.S.</th><th>Grupo</th><th>Produto</th><th>Rack</th><th>Status</th><th>Situação da O.S.</th><th>Técnico</th><th>PDV</th></tr></thead><tbody>"+linhas+"</tbody></table></div>"
        : "<div class='intel-pend-vazio'>Nenhuma O.S. encontrada nesta pendência.</div>")+
      "</div>";
}
function renderTabelaPendenciasIntel(a){
    return tabelaPendenciaHTML("Rack 500 e STATUS DA OS = ABE","rack500Abertas",a.rack500Abertas||[])+
           tabelaPendenciaHTML("STATUS = PRONTA e STATUS DA OS = ABE","prontasAbertas",a.prontasAbertas||[])+
           tabelaPendenciaHTML("GRUPOS 13 E 14 — O.S. ABERTAS","grupo1314Abertos",a.grupo1314Abertos||[])+
           tabelaPendenciaHTML("GRUPOS 5, 21 E 22 — O.S. ABERTAS","grupo52122Abertos",a.grupo52122Abertos||[]);
}
function exportarPendenciaIntelCSV(chave){
    if(!intelAnalise){alert("A análise ainda não foi carregada.");return;}
    const mapa={
      rack500Abertas:{titulo:"rack_500_abertas",lista:intelAnalise.rack500Abertas||[]},
      prontasAbertas:{titulo:"prontas_abertas",lista:intelAnalise.prontasAbertas||[]},
      grupo1314Abertos:{titulo:"grupos_13_14_abertos",lista:intelAnalise.grupo1314Abertos||[]},
      grupo52122Abertos:{titulo:"grupos_5_21_22_abertos",lista:intelAnalise.grupo52122Abertos||[]}
    };
    const item=mapa[chave];
    if(!item){alert("Relação inválida.");return;}
    if(!item.lista.length){alert("Não há O.S. nessa relação para exportar.");return;}
    const cab=["O.S.","Produto","Rack","Status","Situação da O.S.","Técnico","PDV","NF","NCE","Data geração"];
    const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const linhas=[cab.map(esc).join(';')].concat(item.lista.map(r=>[
      r.os,r.desc_produto,r.rack,r.status,r.status_da_os,r.tecnico,r.pdv,r.nf,r.nce,r.dt_geracao
    ].map(esc).join(';')));
    const blob=new Blob(["\uFEFF"+linhas.join("\r\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=item.titulo+"_"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

function abrirListaIntel(tipo){
    const a=intelAnalise;if(!a)return;
    const lista=a[tipo]||[];
    const titulos={rack500Abertas:"Rack 500 — O.S. abertas",prontasAbertas:"Prontas e abertas",grupo1314Abertos:"Grupos 13 e 14 — O.S. abertas",grupo52122Abertos:"Grupos 5, 21 e 22 — O.S. abertas",prontas:"Prontas aguardando expedição",paradas:"Sem movimentação +30 dias",cpp:"CPP pendente",semTecnico:"Sem técnico",semRack:"Sem rack",oficina20:"Oficina há mais de 20 dias",abertas:"O.S. abertas",fechadas:"O.S. fechadas",expHoje:"Expedidas hoje"};
    document.getElementById("intelModalTitulo").textContent=(titulos[tipo]||("Relação: "+tipo))+" ("+lista.length+")";document.getElementById("intelModalConteudo").innerHTML="<div class='intel-list'>"+lista.slice(0,1000).map(r=>"<div class='intel-row'><b>"+escaparHTML(r.os||"-")+"</b><span>"+escaparHTML(r.desc_produto||"")+"<br><small>"+escaparHTML(r.status||r.status_da_os||"")+"</small></span><span>"+escaparHTML(r.tecnico||"Sem técnico")+"</span><button onclick=\"abrirOSIntel('"+String(r.os).replace(/'/g,"\\'")+"')\">Abrir</button></div>").join("")+"</div>";document.getElementById("intelModal").style.display="flex"}
function fecharIntelModal(){document.getElementById("intelModal").style.display="none"}
function abrirOSIntel(os){const r=intelRegistros.find(x=>String(x.os)===String(os));if(!r)return;document.getElementById("intelModalTitulo").textContent="O.S. "+os;document.getElementById("intelModalConteudo").innerHTML=Object.entries(r).filter(x=>!x[0].startsWith("_")).map(x=>"<div class='ficha-linha'><span class='ficha-label'>"+escaparHTML(x[0].replaceAll("_"," "))+":</span>"+escaparHTML(x[1]??"-")+"</div>").join("");document.getElementById("intelModal").style.display="flex"}
function carregarTimelineOS(){
    const os=textoIntel(document.getElementById("intelOsTimeline").value);
    const r=intelRegistros.find(x=>String(x.os)===os);
    const el=document.getElementById("intelTimeline");
    if(!r){
        el.innerHTML="<div class='dashboard-erro'>O.S. não encontrada na análise atual.</div>";
        return;
    }
    const etapas=[
        ["O.S. gerada",r.dt_geracao],
        ["Recebido na A.T.",r.dt_recb_at],
        ["Conserto",r.dt_conserto],
        ["Saída da oficina",r.dt_saida_oficina],
        ["Expedição",r.dt_expedicao]
    ];
    let html="";
    etapas.forEach((e,i)=>{
        const done=!!e[1];
        html+="<div class='intel-step "+(done?'done':'')+"'><div class='intel-dot'>"+(done?'✓':i+1)+"</div><b>"+e[0]+"</b><small>"+(e[1]?escaparHTML(String(e[1])):'Pendente')+"</small></div>";
        if(i<etapas.length-1)html+="<div class='intel-line "+(done?'done':'')+"'></div>";
    });
    el.innerHTML=html;
}
let intelAssistenteUltimoResultado=[];
let intelAssistenteUltimoTitulo="Resultado da análise";
let copilotoContexto={
    ativo:false,
    criterios:[],
    lista:[],
    titulo:""
};

function salvarContextoCopiloto(lista,criterios,titulo){
    copilotoContexto={
        ativo:true,
        criterios:[...new Set((criterios||[]).filter(Boolean))],
        lista:Array.isArray(lista)?lista:[],
        titulo:titulo||"Consulta atual"
    };
    try{
        sessionStorage.setItem("ERP_COPILOTO_CONTEXTO",JSON.stringify({
            criterios:copilotoContexto.criterios,
            os:copilotoContexto.lista.map(r=>String(r.os||"")).filter(Boolean),
            titulo:copilotoContexto.titulo
        }));
    }catch(_){}
    renderContextoCopiloto();
}
function renderContextoCopiloto(){
    const box=document.getElementById("copilotoContexto");
    const chips=document.getElementById("copilotoContextoChips");
    if(!box||!chips)return;
    const criterios=copilotoContexto.criterios||[];
    box.classList.toggle("visivel",copilotoContexto.ativo&&criterios.length>0);
    chips.innerHTML=criterios.map(c=>"<span class='copiloto-contexto-chip'>"+escaparHTML(c)+"</span>").join("");
}
function limparContextoCopiloto(mostrarMensagem){
    copilotoContexto={ativo:false,criterios:[],lista:[],titulo:""};
    intelAssistenteUltimoResultado=[];
    intelAssistenteUltimoTitulo="Resultado da análise";
    try{sessionStorage.removeItem("ERP_COPILOTO_CONTEXTO")}catch(_){}
    renderContextoCopiloto();
    if(mostrarMensagem)addChatIntelHTML("Contexto limpo. A próxima pergunta começará usando toda a base.");
}
function restaurarContextoCopiloto(){
    if(typeof intelRegistros==="undefined"||!Array.isArray(intelRegistros)||!intelRegistros.length)return;
    try{
        const salvo=JSON.parse(sessionStorage.getItem("ERP_COPILOTO_CONTEXTO")||"null");
        if(!salvo||!Array.isArray(salvo.os)||!salvo.os.length)return;
        const ids=new Set(salvo.os.map(String));
        const lista=intelRegistros.filter(r=>ids.has(String(r.os||"")));
        if(!lista.length)return;
        copilotoContexto={
            ativo:true,
            criterios:Array.isArray(salvo.criterios)?salvo.criterios:[],
            lista,
            titulo:salvo.titulo||"Consulta restaurada"
        };
        intelAssistenteUltimoResultado=lista;
        intelAssistenteUltimoTitulo=copilotoContexto.titulo;
        renderContextoCopiloto();
    }catch(_){}
}
function perguntaContinuaContextoIntel(u){
    return /^(AGORA|SOMENTE|SO\b|APENAS|DESTES|DESTAS|DESSES|DESSAS|TAMBEM|AINDA|E\b|COM\b|NO\b|NA\b|DO\b|DA\b)/.test(u);
}
function executarComandoCopiloto(q){
    const bruto=String(q||"").trim();
    if(!bruto.startsWith("/"))return false;
    const partes=bruto.slice(1).trim().split(/\s+/);
    const cmd=(partes.shift()||"").toLowerCase();
    const arg=partes.join(" ").trim();

    if(cmd==="limpar"){
        limparContextoCopiloto(true);
        return true;
    }
    if(cmd==="ajuda"){
        addChatIntelHTML("<b>Comandos disponíveis</b><br>/limpar — limpa os filtros<br>/os 33061 — abre a O.S.<br>/rack 500 — consulta o rack<br>/ci 1542 — procura a C.I. no histórico<br>/importar — abre a importação<br>/usuarios — abre usuários<br>/historico — abre o histórico de importações<br>/relatorios — abre relatórios<br>/ci-teresina — carrega a relação atual na C.I. Teresina");
        return true;
    }
    if(cmd==="os"){
        const os=arg.replace(/\D/g,"");
        if(!os){addChatIntelHTML("Use o comando assim: <b>/os 33061</b>.");return true}
        const r=intelRegistros.find(x=>String(x.os||"").replace(/\D/g,"")===os);
        if(!r){addChatIntelHTML("Não encontrei a O.S. <b>"+escaparHTML(os)+"</b> na base atual.");return true}
        abrirOSIntel(r.os);
        return true;
    }
    if(cmd==="rack"){
        if(!arg){addChatIntelHTML("Use o comando assim: <b>/rack 500</b>.");return true}
        const inp=document.getElementById("intelPergunta");
        inp.value="mostre as O.S. do rack "+arg;
        responderAssistenteIntel();
        return true;
    }
    if(cmd==="ci"){
        if(!arg){addChatIntelHTML("Use o comando assim: <b>/ci 1542</b>.");return true}
        fecharCopilotoERP();
        abrirAdminSecao("historico_ci");
        setTimeout(()=>{
            const busca=document.getElementById("cihBusca");
            if(busca){busca.value=arg;if(typeof filtrarHistoricoCI==="function")filtrarHistoricoCI()}
        },350);
        return true;
    }
    if(cmd==="importar"){
        fecharCopilotoERP();
        abrirAdminSecao("atualizar");
        return true;
    }
    if(cmd==="usuarios"){
        fecharCopilotoERP();
        abrirAdminSecao("usuarios");
        return true;
    }
    if(cmd==="historico"){
        fecharCopilotoERP();
        abrirAdminSecao("historico");
        return true;
    }
    if(cmd==="relatorios"){
        fecharCopilotoERP();
        abrirRelatorios();
        return true;
    }
    if(cmd==="inteligencia"){
        fecharCopilotoERP();
        abrirInteligencia();
        return true;
    }
    if(["ci-teresina","ci-regiao","ci-pmr","ci-geit","ci-assurant","ci-outros"].includes(cmd)){
        const tipo=cmd.replace("ci-","");
        solicitarGeracaoCICopiloto(tipo);
        return true;
    }
    addChatIntelHTML("Comando desconhecido. Use <b>/ajuda</b> para ver os comandos disponíveis.");
    return true;
}

function addChatIntel(tipo,texto){
    const c=document.getElementById("intelChat");
    c.innerHTML+="<div class='intel-msg "+tipo+"'>"+escaparHTML(texto)+"</div>";
    c.scrollTop=c.scrollHeight;
}
function addChatIntelHTML(html){
    const c=document.getElementById("intelChat");
    c.innerHTML+="<div class='intel-msg bot intel-resposta'>"+html+"</div>";
    c.scrollTop=c.scrollHeight;
}
function perguntarIntelExemplo(pergunta){
    if(typeof abrirCopilotoERP==="function")abrirCopilotoERP();
    const inp=document.getElementById("intelPergunta");
    if(!inp)return;
    inp.value=pergunta;
    responderAssistenteIntel();
}
function normalizarPerguntaIntel(v){
    return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ").trim();
}
function correspondeIntel(valor,termo){
    return normalizarPerguntaIntel(valor).includes(normalizarPerguntaIntel(termo));
}
function normalizarRackIntel(valor){
    let v=normalizarPerguntaIntel(valor).replace(/^RACK\s*/,'').replace(/\s+/g,'').replace(/,0+$/,'').replace(/\.0+$/,'');
    if(/^0+\d+$/.test(v))v=String(parseInt(v,10));
    return v;
}
function rackCorrespondeIntel(valor,termo){
    const a=normalizarRackIntel(valor),b=normalizarRackIntel(termo);
    return !!a&&!!b&&(a===b||a.split(/[\/\-]/).includes(b));
}
function situacaoAbertaIntel(r){
    const n=normalizarPerguntaIntel(r.status_da_os);
    return n==='ABE'||n==='ABERTA'||n==='ABERTO'||n==='EM ABERTO';
}
function situacaoFechadaIntel(r){
    const n=normalizarPerguntaIntel(r.status_da_os);
    return ['FEC','FECHADA','FECHADO','ENCERRADA','ENCERRADO','CONCLUIDA','CONCLUIDO'].includes(n);
}
function statusProntaIntel(r){
    const n=normalizarPerguntaIntel(r.status);
    return n==='PRONTA'||n==='PRONTO'||n.startsWith('PRONT');
}
function dataHojeIntel(v){
    const d=dataValidaIntel(v);
    if(!d)return false;
    const h=new Date();
    return d.getFullYear()===h.getFullYear()&&d.getMonth()===h.getMonth()&&d.getDate()===h.getDate();
}
function campoPrimeiroIntel(r,campos){
    for(const c of campos){if(textoIntel(r[c]))return textoIntel(r[c])}
    return "";
}
function termoConhecidoIntel(pergunta,valores){
    const u=normalizarPerguntaIntel(pergunta);
    return [...new Set(valores.map(textoIntel).filter(Boolean))]
      .sort((a,b)=>b.length-a.length)
      .find(v=>u.includes(normalizarPerguntaIntel(v)))||"";
}
function contarListaIntel(lista,obter){
    const m=new Map();
    lista.forEach(r=>{
        const k=textoIntel(obter(r))||"(vazio)";
        m.set(k,(m.get(k)||0)+1);
    });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}
function escaparAtributoIntel(v){
    return String(v??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function rankingChatIntel(ranking,limite=10){
    return "<div class='intel-chat-ranking'>"+ranking.slice(0,limite).map((x,i)=>
      "<div><span>"+(i+1)+"º</span><b>"+escaparHTML(x[0])+"</b><strong>"+x[1]+"</strong></div>"
    ).join("")+"</div>";
}
function acoesChatIntel(temResultado=true){
    if(!temResultado)return "";
    return "<div class='intel-chat-actions'>"+
      "<button class='intel-chat-action' onclick='abrirUltimoResultadoIntel()'>📄 Abrir relação</button>"+
      "<button class='intel-chat-action' onclick='exportarUltimoResultadoIntel()'>⇩ Exportar arquivo ▾</button>"+
      "<button class='intel-chat-action' onclick=\"solicitarGeracaoCICopiloto('teresina')\">↩ Gerar C.I.</button>"+
      "</div>";
}
function abrirResultadoAssistenteIntel(titulo,lista){
    intelAssistenteUltimoResultado=lista||[];
    intelAssistenteUltimoTitulo=titulo||"Resultado da análise";
    abrirUltimoResultadoIntel();
}
function abrirUltimoResultadoIntel(){
    const lista=intelAssistenteUltimoResultado||[];
    document.getElementById("intelModalTitulo").textContent=intelAssistenteUltimoTitulo+" ("+lista.length+")";
    document.getElementById("intelModalConteudo").innerHTML=lista.length
      ?"<div class='intel-list'>"+lista.slice(0,2000).map(r=>"<div class='intel-row'><b>"+escaparHTML(r.os||"-")+"</b><span>"+escaparHTML(r.desc_produto||"")+"<br><small>Rack: "+escaparHTML(r.rack||"-")+" • O.S.: "+escaparHTML(r.status_da_os||"-")+" • Status: "+escaparHTML(r.status||"-")+" • PDV: "+escaparHTML(r.pdv||"-")+"</small></span><span>"+escaparHTML(r.tecnico||"Sem técnico")+"</span><button onclick=\"abrirOSIntel('"+String(r.os||"").replace(/'/g,"\\'")+"')\">Abrir</button></div>").join("")+"</div>"
      :"<div class='admin-info'>Nenhuma O.S. encontrada para esses critérios.</div>";
    document.getElementById("intelModal").style.display="flex";
}
function exportarUltimoResultadoIntel(){
    const lista=intelAssistenteUltimoResultado||[];
    if(!lista.length){alert("Não há relação para exportar.");return}
    const cab=["O.S.","Produto","Rack","Status","Situação da O.S.","Técnico","PDV","NF","NCE","Data geração","Data expedição"];
    const esc=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
    const linhas=[cab.map(esc).join(";")].concat(lista.map(r=>[
        r.os,r.desc_produto,r.rack,r.status,r.status_da_os,r.tecnico,r.pdv,r.nf,r.nce,r.dt_geracao,r.dt_expedicao
    ].map(esc).join(";")));
    const blob=new Blob(["\uFEFF"+linhas.join("\r\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;
    a.download=normalizarPerguntaIntel(intelAssistenteUltimoTitulo).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")+"_"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

function nomeCICopiloto(tipo){
    const mapa={teresina:"C.I. Teresina",regiao:"C.I. Região",pmr:"C.I. PMR",geit:"C.I. GEIT",assurant:"C.I. Assurant",outros:"C.I. Outros"};
    return mapa[tipo]||tipo;
}
function htmlAcaoCICopiloto(tipo,lista){
    const total=Array.isArray(lista)?lista.length:0;
    const usados=Math.min(total,8);
    const aviso=total>8
        ? "A C.I. aceita até 8 O.S. por vez. Serão carregadas as primeiras 8 da relação."
        : "Todas as O.S. da relação serão carregadas.";
    return "<div class='copiloto-acao-card'><b>"+escaparHTML(nomeCICopiloto(tipo))+"</b>"+
        "<small>"+total+" O.S. selecionadas. "+escaparHTML(aviso)+"</small>"+
        "<div class='copiloto-acao-botoes'>"+
        "<button class='copiloto-acao-confirmar' onclick=\"executarGeracaoCICopiloto('"+tipo+"')\">Carregar "+usados+" O.S.</button>"+
        "<button class='copiloto-acao-secundaria' onclick='abrirUltimoResultadoIntel()'>Revisar relação</button>"+
        "</div></div>";
}
function solicitarGeracaoCICopiloto(tipo){
    const permitidos=["teresina","regiao","pmr","geit","assurant","outros"];
    if(!permitidos.includes(tipo)){
        addChatIntelHTML("Não reconheci esse modelo de C.I.");
        return;
    }
    const lista=(copilotoContexto.ativo&&copilotoContexto.lista.length)
        ?copilotoContexto.lista
        :intelAssistenteUltimoResultado;
    if(!Array.isArray(lista)||!lista.length){
        addChatIntelHTML("Primeiro faça uma consulta que gere uma relação de O.S.; depois peça para gerar a C.I.");
        return;
    }
    addChatIntelHTML("Posso carregar a relação atual em uma C.I."+htmlAcaoCICopiloto(tipo,lista));
}
async function aguardarPlanilhaCICopiloto(limiteMs=8000){
    const inicio=Date.now();
    while(Date.now()-inicio<limiteMs){
        if(planilhaCI&&typeof planilhaCI.setValueFromCoords==="function")return true;
        await new Promise(r=>setTimeout(r,100));
    }
    return false;
}
async function executarGeracaoCICopiloto(tipo){
    const lista=(copilotoContexto.ativo&&copilotoContexto.lista.length)
        ?copilotoContexto.lista
        :intelAssistenteUltimoResultado;
    if(!Array.isArray(lista)||!lista.length){
        addChatIntelHTML("A relação não está mais disponível.");
        return;
    }
    if(tipo==="outros"){
        fecharCopilotoERP();
        abrirCI("outros");
        return;
    }
    const selecionadas=lista.slice(0,8);
    const numeros=selecionadas.map(r=>String(r.os||"").trim()).filter(Boolean);
    if(!numeros.length){
        addChatIntelHTML("A relação não possui números de O.S. válidos.");
        return;
    }
    const confirmar=confirm(
        "Carregar "+numeros.length+" O.S. em "+nomeCICopiloto(tipo)+"?"+
        (lista.length>8?"\n\nA relação possui "+lista.length+" O.S.; serão usadas somente as primeiras 8.":"")
    );
    if(!confirmar)return;

    fecharCopilotoERP();
    abrirCI(tipo);
    const pronta=await aguardarPlanilhaCICopiloto();
    if(!pronta){
        alert("A grade da C.I. não ficou pronta dentro do tempo esperado.");
        return;
    }

    const cfg=configCIAtual();
    for(let i=0;i<cfg.rows;i++){
        limparLinhaCISemEventos(i);
    }

    for(let i=0;i<numeros.length&&i<cfg.rows;i++){
        planilhaCI.setValueFromCoords(cfg.osCol,i,numeros[i],true);
        if(tipo!=="geit"){
            await preencherLinhaCIEditavel(i,numeros[i]);
        }
    }
    atualizarTotalVolumesCI();
    atualizarDestinoTopoRegiao();
    const msg=document.getElementById("ciEditMensagem");
    if(msg){
        msg.innerHTML="<span class='admin-status-ok'>"+numeros.length+" O.S. carregadas pelo Copiloto.</span>"+
            (lista.length>8?" As demais não foram incluídas porque este modelo aceita até 8 O.S. por vez.":"");
    }
}
function detectarPedidoCINaturalCopiloto(u){
    if(!/(GERAR|CRIAR|MONTAR|CARREGAR|FAZER)\s+(UMA\s+)?C\.?\s*I\.?/.test(u))return "";
    if(/TERESINA|TEREZINA/.test(u))return "teresina";
    if(/REGIAO/.test(u))return "regiao";
    if(/\bPMR\b/.test(u))return "pmr";
    if(/\bGEIT\b/.test(u))return "geit";
    if(/ASSURANT/.test(u))return "assurant";
    if(/OUTROS?/.test(u))return "outros";
    return "teresina";
}
function detectarNavegacaoNaturalCopiloto(u){
    if(/ABRIR|IR PARA|MOSTRAR TELA|ACESSAR/.test(u)){
        if(/IMPORTA/.test(u)){fecharCopilotoERP();abrirAdminSecao("atualizar");return true}
        if(/USUARIOS?/.test(u)){fecharCopilotoERP();abrirAdminSecao("usuarios");return true}
        if(/HISTORICO DE C\.?I|HISTORICO CI/.test(u)){fecharCopilotoERP();abrirAdminSecao("historico_ci");return true}
        if(/HISTORICO/.test(u)){fecharCopilotoERP();abrirAdminSecao("historico");return true}
        if(/RELATORIOS?/.test(u)){fecharCopilotoERP();abrirRelatorios();return true}
        if(/INTELIGENCIA/.test(u)){fecharCopilotoERP();abrirInteligencia();return true}
        if(/CONSULTA|CONSULTAR O\.?S/.test(u)){fecharCopilotoERP();abrirBusca();return true}
    }
    return false;
}

function responderAssistenteIntel(){
    const inp=document.getElementById("intelPergunta");
    const q=textoIntel(inp.value);
    if(!q)return;
    addChatIntel("user",q);
    inp.value="";

    if(executarComandoCopiloto(q))return;

    if(/^(LIMPAR|ZERAR|REINICIAR)\s+(O\s+)?CONTEXTO/i.test(q)){
        limparContextoCopiloto(true);
        return;
    }

    if(!intelAnalise||!Array.isArray(intelRegistros)||!intelRegistros.length){
        addChatIntelHTML("A análise ainda não está carregada. Aguarde a base terminar de carregar e tente novamente.");
        return;
    }

    const u=normalizarPerguntaIntel(q);

    if(detectarNavegacaoNaturalCopiloto(u))return;

    const tipoCIPedido=detectarPedidoCINaturalCopiloto(u);
    if(tipoCIPedido){
        solicitarGeracaoCICopiloto(tipoCIPedido);
        return;
    }

    const continuar=copilotoContexto.ativo&&copilotoContexto.lista.length&&perguntaContinuaContextoIntel(u);
    let lista=continuar?[...copilotoContexto.lista]:[...intelRegistros];
    const criterios=continuar?[...copilotoContexto.criterios]:[];
    if(continuar){
        addChatIntelHTML("Mantendo o contexto anterior: <b>"+escaparHTML(criterios.join(", "))+"</b>.");
    }
    const querLista=/MOSTR|LIST|QUAIS|RELACAO|ABRIR|TUDO|TODAS|TODOS/.test(u);
    const querRanking=/RANKING|MAIOR|MAIS CHEIO|MAIS CARREGADO|TEM MAIS|MAIS O\.?S/.test(u);
    const querMedia=/MEDIA|TEMPO MEDIO|DEMORA/.test(u);
    const limiteMatch=u.match(/\b(?:TOP|PRIMEIR[AO]S?|ULTIM[AO]S?|MOSTR[EA]?)\s*(\d{1,4})\b/);
    const limite=limiteMatch?Math.max(1,Math.min(2000,Number(limiteMatch[1]))):null;

    // O.S. exata.
    const osMatch=u.match(/\bO\.?\s*S\.?\s*(?:N[ºO]\s*)?[:#-]?\s*(\d{4,})\b/);
    if(osMatch){
        lista=lista.filter(r=>String(r.os||"").replace(/\D/g,"")===osMatch[1]);
        criterios.push("O.S. "+osMatch[1]);
    }

    // Situação/status.
    if(/\bABERT[AO]S?\b|\bABE\b/.test(u)){lista=lista.filter(situacaoAbertaIntel);criterios.push("abertas")}
    if(/\bFECHAD[AO]S?\b|\bFEC\b/.test(u)){lista=lista.filter(situacaoFechadaIntel);criterios.push("fechadas")}
    if(/\bPRONT[AO]S?\b/.test(u)){lista=lista.filter(statusProntaIntel);criterios.push("prontas")}
    if(/CHEGOU\s*PECA|CHEGARAM\s*PECAS?/.test(u)){lista=lista.filter(r=>correspondeIntel(r.status,"CHEGOU PECA"));criterios.push("chegou peça")}
    if(/\bCPP\b/.test(u)){lista=lista.filter(r=>textoIntel(r.nr_cpp)||textoIntel(r.solicitante_cpp)||correspondeIntel(r.status,"CPP"));criterios.push("CPP")}
    if(/SEM\s+TECNICO/.test(u)){lista=lista.filter(r=>!textoIntel(r.tecnico));criterios.push("sem técnico")}
    if(/SEM\s+RACK/.test(u)){lista=lista.filter(r=>!textoIntel(r.rack));criterios.push("sem rack")}
    if(/OFICINA/.test(u)){lista=lista.filter(r=>!textoIntel(r.dt_saida_oficina)&&(textoIntel(r.dt_recb_at)||textoIntel(r.dt_conserto)||correspondeIntel(r.status,"OFIC")));criterios.push("oficina")}
    if(/EXPEDID[AO]S?\s+HOJE|EXPEDICAO\s+HOJE/.test(u)){lista=lista.filter(r=>dataHojeIntel(r.dt_expedicao));criterios.push("expedidas hoje")}
    if(/FINALIZAD[AO]S?|EXPEDID[AO]S?/.test(u)&&!u.includes("HOJE")){lista=lista.filter(r=>textoIntel(r.dt_expedicao));criterios.push("finalizadas/expedidas")}

    // Dias parados.
    const diasMatch=u.match(/(?:MAIS DE|ACIMA DE|\+)\s*(\d{1,4})\s*DIAS?|PARAD[AO]S?\s*(?:HA|A)?\s*(\d{1,4})?/);
    if(diasMatch){
        const dias=Number(diasMatch[1]||diasMatch[2]||30);
        lista=lista.filter(r=>{const d=diasDesdeIntel(ultimaDataIntel(r));return d!==null&&d>dias&&!textoIntel(r.dt_expedicao)});
        lista.sort((a,b)=>(diasDesdeIntel(ultimaDataIntel(b))||0)-(diasDesdeIntel(ultimaDataIntel(a))||0));
        criterios.push("paradas há mais de "+dias+" dias");
    }

    // Rack explícito.
    const rackMatch=u.match(/\bRACK\s*[:#-]?\s*([A-Z0-9./-]+)/);
    if(rackMatch){
        lista=lista.filter(r=>rackCorrespondeIntel(r.rack,rackMatch[1]));
        criterios.push("rack "+rackMatch[1]);
    }

    // Entidades conhecidas na pergunta.
    const tecnico=termoConhecidoIntel(q,intelRegistros.map(r=>r.tecnico));
    const pdv=termoConhecidoIntel(q,intelRegistros.map(r=>r.pdv));
    if(tecnico && (u.includes("TECN")||u.includes("TUDO DO")||u.includes("TUDO DA"))){
        lista=lista.filter(r=>normalizarPerguntaIntel(r.tecnico)===normalizarPerguntaIntel(tecnico));
        criterios.push("técnico "+tecnico);
    }
    if(pdv && (u.includes("LOJA")||u.includes("PDV"))){
        lista=lista.filter(r=>normalizarPerguntaIntel(r.pdv)===normalizarPerguntaIntel(pdv));
        criterios.push("loja/PDV "+pdv);
    }

    // Valores explicitamente escritos após palavras-chave.
    const tecnicoMatch=u.match(/TECNIC[OA]\s+["']?([^,;.]+?)(?=\s+(?:NO|NA|COM|E|QUE|ABERT|PRONT|RACK|LOJA|PDV)\b|$)/);
    if(tecnicoMatch&&!tecnico){
        const termo=tecnicoMatch[1].trim();
        lista=lista.filter(r=>correspondeIntel(r.tecnico,termo));criterios.push("técnico "+termo);
    }
    const lojaMatch=u.match(/(?:LOJA|PDV)\s+["']?([^,;.]+?)(?=\s+(?:COM|E|QUE|ABERT|PRONT|RACK|TECNIC)\b|$)/);
    if(lojaMatch&&!pdv){
        const termo=lojaMatch[1].trim();
        lista=lista.filter(r=>correspondeIntel(r.pdv,termo));criterios.push("loja/PDV "+termo);
    }
    const produtoMatch=u.match(/(?:PRODUTO|MARCA|FABRICANTE)\s+["']?([^,;.]+?)(?=\s+(?:COM|E|QUE|ABERT|PRONT|RACK|LOJA|PDV|TECNIC)\b|$)/);
    if(produtoMatch){
        const termo=produtoMatch[1].trim();
        lista=lista.filter(r=>[r.desc_produto,r.marca,r.fabricante,r.descricao].some(v=>correspondeIntel(v,termo)));
        criterios.push("produto/marca "+termo);
    }else{
        // Reconhece marcas/fabricantes já existentes, mesmo sem a palavra "marca".
        const marca=termoConhecidoIntel(q,intelRegistros.map(r=>campoPrimeiroIntel(r,["marca","fabricante"])));
        if(marca){
            lista=lista.filter(r=>[r.marca,r.fabricante,r.desc_produto].some(v=>correspondeIntel(v,marca)));
            criterios.push(marca);
        }
    }

    // Rankings reais.
    if(querRanking){
        let titulo="Ranking";
        let ranking=[];
        if(/TECN/.test(u)){titulo="Ranking de técnicos";ranking=contarListaIntel(lista,r=>r.tecnico)}
        else if(/LOJA|PDV/.test(u)){titulo="Ranking de lojas/PDVs";ranking=contarListaIntel(lista,r=>r.pdv)}
        else if(/RACK/.test(u)){titulo="Ranking de racks";ranking=contarListaIntel(lista,r=>r.rack)}
        else if(/MARCA|FABRICANTE/.test(u)){titulo="Ranking de marcas/fabricantes";ranking=contarListaIntel(lista,r=>campoPrimeiroIntel(r,["marca","fabricante"])||textoIntel(r.desc_produto).split(/\s+/)[0])}
        else if(/PRODUTO/.test(u)){titulo="Ranking de produtos";ranking=contarListaIntel(lista,r=>r.desc_produto)}
        else if(/STATUS|SITUACAO/.test(u)){titulo="Ranking de status";ranking=contarListaIntel(lista,r=>r.status||r.status_da_os)}
        else {titulo="Ranking de técnicos";ranking=contarListaIntel(lista,r=>r.tecnico)}
        ranking=ranking.filter(x=>x[0]!=="(vazio)");
        const html="<b>"+escaparHTML(titulo)+"</b>"+(criterios.length?" para "+escaparHTML(criterios.join(", ")):"")+"."+rankingChatIntel(ranking,limite||10);
        salvarContextoCopiloto(lista,criterios,titulo);
        intelAssistenteUltimoResultado=lista;
        intelAssistenteUltimoTitulo=titulo;
        addChatIntelHTML(html+acoesChatIntel(lista.length>0));
        return;
    }

    // Médias verdadeiras calculadas da base.
    if(querMedia){
        let pares=[],rotulo="";
        if(/EXPEDI/.test(u)){pares=lista.map(r=>[r.dt_geracao,r.dt_expedicao]);rotulo="tempo médio entre geração e expedição"}
        else {pares=lista.map(r=>[r.dt_geracao,r.dt_expedicao]);rotulo="tempo médio até a expedição"}
        const media=mediaDiasV36(pares);
        salvarContextoCopiloto(lista,criterios,rotulo);
        intelAssistenteUltimoResultado=lista;
        intelAssistenteUltimoTitulo=rotulo;
        addChatIntelHTML((media===null?"Não há datas suficientes para calcular "+escaparHTML(rotulo)+".":"O "+escaparHTML(rotulo)+" é de <b>"+media+" dias</b>, considerando "+lista.length+" registros após os filtros.")+acoesChatIntel(lista.length>0));
        return;
    }

    if(limite){
        if(/ANTIG|MAIS TEMPO|PARAD/.test(u)){
            lista.sort((a,b)=>(diasDesdeIntel(ultimaDataIntel(b))||0)-(diasDesdeIntel(ultimaDataIntel(a))||0));
        }
        lista=lista.slice(0,limite);
    }

    intelAssistenteUltimoResultado=lista;
    intelAssistenteUltimoTitulo=criterios.length?"O.S. — "+criterios.join(" / "):"Resultado da consulta";
    const resumo=criterios.length
      ?"Encontrei <b>"+lista.length.toLocaleString("pt-BR")+" O.S.</b> com "+escaparHTML(criterios.join(", "))+"."
      :"A base atual possui <b>"+lista.length.toLocaleString("pt-BR")+" O.S.</b>.";

    salvarContextoCopiloto(lista,criterios,intelAssistenteUltimoTitulo);
    addChatIntelHTML(resumo+acoesChatIntel(true));
    if(querLista&&lista.length)abrirUltimoResultadoIntel();
}



/* =========================
VERSÃO 3.6 - GESTÃO OPERACIONAL INTEGRADA
========================= */
let intelConsultaAtual=[];
let intelFiltrosInicializados=false;
function normalizarV36(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim()}
function soDataV36(v){const d=dataValidaIntel(v);return d?d.toISOString().slice(0,10):''}
function mediaDiasV36(pares){const vals=pares.map(([a,b])=>{const da=dataValidaIntel(a),db=dataValidaIntel(b);return da&&db?Math.max(0,(db-da)/86400000):null}).filter(v=>v!==null&&isFinite(v));return vals.length?Math.round(vals.reduce((x,y)=>x+y,0)/vals.length):null}
function analisarIntel(registros){
 const abertas=registros.filter(situacaoAbertaIntel),fechadas=registros.filter(situacaoFechadaIntel);
 const prontas=registros.filter(r=>statusProntaIntel(r)&&!textoIntel(r.dt_expedicao));
 const paradas=registros.filter(r=>{const d=diasDesdeIntel(ultimaDataIntel(r));return d!==null&&d>30&&!textoIntel(r.dt_expedicao)});
 const cpp=registros.filter(r=>textoIntel(r.nr_cpp)||textoIntel(r.solicitante_cpp)||contemIntel(r.status,'CPP')).filter(r=>!contemIntel(r.sit_cpp,'CONCLU')&&!contemIntel(r.sit_cpp,'RECEB')&&!textoIntel(r.data_recebedor));
 const semTecnico=abertas.filter(r=>!textoIntel(r.tecnico)),semRack=abertas.filter(r=>!textoIntel(r.rack));
 const oficina=abertas.filter(r=>!textoIntel(r.dt_saida_oficina)&&(textoIntel(r.dt_recb_at)||textoIntel(r.dt_conserto)||contemIntel(r.status,'OFIC')));
 const oficina20=oficina.filter(r=>(diasDesdeIntel(r.dt_recb_at||r.dt_ult_entrada||r.dt_geracao)||0)>20);
 const qualidade=registros.length?Math.round(registros.filter(r=>textoIntel(r.tecnico)&&textoIntel(r.rack)).length/registros.length*100):0;
 const hoje=new Date().toISOString().slice(0,10),expHoje=registros.filter(r=>soDataV36(r.dt_expedicao)===hoje);
 const tempoExp=mediaDiasV36(registros.map(r=>[r.dt_geracao,r.dt_expedicao]));
 const prioridades=[];
 paradas.forEach(r=>prioridades.push({...r,_motivo:'Sem movimentação há mais de 30 dias',_nivel:4,_dias:diasDesdeIntel(ultimaDataIntel(r))||0}));
 prontas.forEach(r=>prioridades.push({...r,_motivo:'Pronta aguardando expedição',_nivel:3,_dias:diasDesdeIntel(r.dt_conserto||r.dt_geracao)||0}));
 cpp.forEach(r=>prioridades.push({...r,_motivo:'Pendência de CPP',_nivel:3,_dias:diasDesdeIntel(r.data_cpp||r.dt_geracao)||0}));
 semTecnico.forEach(r=>prioridades.push({...r,_motivo:'O.S. aberta sem técnico',_nivel:2,_dias:diasDesdeIntel(ultimaDataIntel(r))||0}));
 const unicos=new Map();prioridades.sort((a,b)=>(b._nivel-a._nivel)||(b._dias-a._dias)).forEach(r=>{if(!unicos.has(r.os))unicos.set(r.os,r)});
 const rack500Abertas=abertas.filter(r=>rackCorrespondeIntel(r.rack,'500')),prontasAbertas=abertas.filter(statusProntaIntel);
 const grupo1314Abertos=abertas.filter(r=>[13,14].includes(grupoNumeroIntel(r.grupo)));
 const grupo52122Abertos=abertas.filter(r=>[5,21,22].includes(grupoNumeroIntel(r.grupo)));
 const racksAbertos=contarIntel(abertas,'rack').filter(x=>x[0]!=='(vazio)');
 return {abertas,fechadas,expHoje,tempoExp,prontas,paradas,cpp,semTecnico,semRack,oficina,oficina20,qualidade,rack500Abertas,prontasAbertas,grupo1314Abertos,grupo52122Abertos,racksAbertos,prioridades:[...unicos.values()],tecnicos:contarIntel(registros,'tecnico'),pdvs:contarIntel(registros,'pdv'),status:contarIntel(registros,'status')};
}
function renderIntel(){
 const a=intelAnalise;if(!a)return;
 setIntel('ikProntas',a.prontas.length);setIntel('ikParadas',a.paradas.length);setIntel('ikCpp',a.cpp.length);setIntel('ikQualidade',a.qualidade+'%');
 setIntel('ieAbertas',a.abertas.length);setIntel('ieFechadas',a.fechadas.length);setIntel('ieExpHoje',a.expHoje.length);setIntel('ieTempoExp',a.tempoExp===null?'-':a.tempoExp+' d');setIntel('ieTotal',intelRegistros.length);
 const alertas=[];
 if(a.rack500Abertas.length)alertas.push("<div class='intel-alert red' onclick=\"abrirListaIntel('rack500Abertas')\"><b>📦 "+a.rack500Abertas.length+" O.S. abertas no Rack 500</b><span>Clique para abrir a relação.</span></div>");
 if((a.grupo1314Abertos||[]).length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('grupo1314Abertos')\"><b>📦 "+a.grupo1314Abertos.length+" O.S. abertas nos grupos 13 e 14</b><span>Clique para abrir a relação.</span></div>");
 if((a.grupo52122Abertos||[]).length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('grupo52122Abertos')\"><b>📦 "+a.grupo52122Abertos.length+" O.S. abertas nos grupos 5, 21 e 22</b><span>Clique para abrir a relação.</span></div>");
 if(a.prontasAbertas.length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('prontasAbertas')\"><b>🟢 "+a.prontasAbertas.length+" O.S. prontas e abertas</b><span>Aguardando próxima ação operacional.</span></div>");
 if(a.cpp.length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('cpp')\"><b>⚠ "+a.cpp.length+" pendências de CPP</b><span>CPP ainda sem conclusão ou recebimento.</span></div>");
 if(a.oficina20.length)alertas.push("<div class='intel-alert red' onclick=\"abrirListaIntel('oficina20')\"><b>🔧 "+a.oficina20.length+" O.S. na oficina há mais de 20 dias</b><span>Clique para priorizar.</span></div>");
 if(a.semTecnico.length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('semTecnico')\"><b>❌ "+a.semTecnico.length+" O.S. abertas sem técnico</b><span>Cadastro operacional incompleto.</span></div>");
 if(a.semRack.length)alertas.push("<div class='intel-alert orange' onclick=\"abrirListaIntel('semRack')\"><b>📍 "+a.semRack.length+" O.S. abertas sem rack</b><span>Localização não preenchida.</span></div>");
 if(!alertas.length)alertas.push("<div class='intel-alert green'><b>✔ Nenhuma inconsistência crítica encontrada</b><span>As regras atuais não detectaram pendências.</span></div>");
 document.getElementById('intelAlertas').innerHTML=alertas.join('');
 document.getElementById('intelCartoesDinamicos').innerHTML=renderCartoesDinamicosV36(a);
 document.getElementById('intelPrioridades').innerHTML=a.prioridades.slice(0,18).map(r=>"<div class='intel-row'><b>"+escaparHTML(r.os||'-')+"</b><span>"+escaparHTML(r._motivo)+"<br><small>"+escaparHTML(r.desc_produto||'')+"</small></span><span>"+(r._dias||0)+" dias</span><button onclick=\"abrirOSIntel('"+String(r.os).replace(/'/g,"\\'")+"')\">Abrir</button></div>").join('')||"<div class='admin-info'>Nenhuma prioridade.</div>";
 document.getElementById('intelPendencias').innerHTML=renderTabelaPendenciasIntel(a)+tabelaPendenciaHTML('Sem técnico','semTecnico',a.semTecnico)+tabelaPendenciaHTML('Sem rack','semRack',a.semRack)+tabelaPendenciaHTML('Oficina há mais de 20 dias','oficina20',a.oficina20)+tabelaPendenciaHTML('CPP pendente','cpp',a.cpp);
 document.getElementById('intelRankingTecnicos').innerHTML=barrasIntel(a.tecnicos.filter(x=>x[0]!=='(vazio)'),10);
 document.getElementById('intelRankingPDV').innerHTML=barrasIntel(a.pdvs.filter(x=>x[0]!=='(vazio)'),10);
 document.getElementById('intelMapa').innerHTML=barrasIntel(a.pdvs.filter(x=>x[0]!=='(vazio)'),12);
 inicializarFiltrosIntelV36();aplicarConsultaIntel();
}
function obterCartoesV36(a=intelAnalise){
 if(!a)return [];
 const fixos=[['O.S. abertas no geral',a.abertas,'green'],['Rack 500',a.rack500Abertas,'red'],['Grupos 13 e 14 abertos',a.grupo1314Abertos||[],'orange'],['Grupos 5, 21 e 22 abertos',a.grupo52122Abertos||[],'orange'],['Prontas',a.prontasAbertas,'green'],['CPP',a.cpp,'orange'],['Oficina +20 dias',a.oficina20,'red'],['Sem técnico',a.semTecnico,'orange'],['Sem rack',a.semRack,'orange']];
 const dinamicos=a.racksAbertos.filter(x=>normalizarRackIntel(x[0])!=='500').slice(0,6).map(x=>['Rack '+x[0],a.abertas.filter(r=>textoIntel(r.rack)===x[0]),'']);
 return fixos.concat(dinamicos);
}
function renderCartoesDinamicosV36(a){
 return obterCartoesV36(a).map((x,i)=>{
   const tituloSeguro=String(x[0]).replace(/'/g,"\\'");
   const descricao=x[0]==='O.S. abertas no geral'?'Todas as O.S. com situação ABE':'O.S. encontradas nesta relação';
   return `<div class="intel-dynamic-card ${x[2]}"><b>${escaparHTML(x[0])}</b><strong>${x[1].length}</strong><span>${descricao}</span><div class="intel-dynamic-actions"><button class="ver" onclick="abrirListaDiretaV36('${tituloSeguro}',${i})">Ver relação</button><button class="exportar" onclick="exportarCartaoV36(${i})">Exportar arquivo ▾</button><button class="imprimir" onclick="imprimirCartaoV36(${i})">Imprimir</button></div></div>`;
 }).join('');
}
function abrirListaDiretaV36(titulo,indice){const item=obterCartoesV36()[indice];abrirResultadoAssistenteIntel(titulo,item?item[1]:[])}
function nomeArquivoV36(v){return String(v||'relacao').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase()||'relacao'}
function exportarCartaoV36(indice){
 const item=obterCartoesV36()[indice];if(!item||!item[1].length){alert('Não há O.S. nessa relação para exportar.');return}
 const cab=['O.S.','Produto','Rack','Status','Situação da O.S.','Técnico','PDV','NF','NCE','Data geração'];const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const linhas=[cab.map(esc).join(';')].concat(item[1].map(r=>[r.os,r.desc_produto,r.rack,r.status,r.status_da_os,r.tecnico,r.pdv,r.nf,r.nce,r.dt_geracao].map(esc).join(';')));
 const blob=new Blob(['\uFEFF'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nomeArquivoV36(item[0])+'_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function imprimirCartaoV36(indice){
 const item=obterCartoesV36()[indice];if(!item||!item[1].length){alert('Não há O.S. nessa relação para imprimir.');return}
 const linhas=item[1].map(r=>'<tr><td>'+escaparHTML(r.os||'-')+'</td><td>'+escaparHTML(r.desc_produto||'-')+'</td><td>'+escaparHTML(r.rack||'-')+'</td><td>'+escaparHTML(r.status||'-')+'</td><td>'+escaparHTML(r.status_da_os||'-')+'</td><td>'+escaparHTML(r.tecnico||'-')+'</td><td>'+escaparHTML(r.pdv||'-')+'</td></tr>').join('');
 const w=window.open('','_blank');w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>"+escaparHTML(item[0])+"</title><style>body{font-family:Arial;padding:18px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #000;padding:4px;text-align:left}h2{margin-bottom:6px}</style></head><body><h2>"+escaparHTML(item[0])+"</h2><p>"+item[1].length+" registro(s) • "+new Date().toLocaleString('pt-BR')+"</p><table><thead><tr><th>O.S.</th><th>GR</th><th>N.C.E</th><th>Produto</th><th>Categoria</th><th>Rack</th><th>Status</th><th>Situação</th><th>Técnico</th><th>PDV</th></tr></thead><tbody>"+linhas+"</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>");w.document.close();
}
function valoresUnicosV36(campo){return [...new Set(intelRegistros.map(r=>textoIntel(r[campo])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}))}
function preencherSelectV36(id,valores,rotulo){const e=document.getElementById(id);if(!e)return;const atual=e.value;e.innerHTML='<option value="">'+rotulo+'</option>'+valores.map(v=>'<option>'+escaparHTML(v)+'</option>').join('');e.value=atual}
function inicializarFiltrosIntelV36(){if(!intelRegistros.length)return;preencherSelectV36('icRack',valoresUnicosV36('rack'),'Todos os racks');preencherSelectV36('icStatusOS',valoresUnicosV36('status_da_os'),'Todas as situações');preencherSelectV36('icStatus',valoresUnicosV36('status'),'Todos os status');preencherSelectV36('icTecnico',valoresUnicosV36('tecnico'),'Todos os técnicos');preencherSelectV36('icGarantia',valoresUnicosV36('tipo_garantia'),'Todas as garantias');renderConsultasSalvasV36();intelFiltrosInicializados=true}
function filtrosAtuaisV36(){return {busca:document.getElementById('icBusca').value,rack:document.getElementById('icRack').value,statusOS:document.getElementById('icStatusOS').value,status:document.getElementById('icStatus').value,tecnico:document.getElementById('icTecnico').value,garantia:document.getElementById('icGarantia').value,categoria:document.getElementById('icCategoria')?.value||''}}
function aplicarConsultaIntel(){if(!intelRegistros.length)return;const f=filtrosAtuaisV36(),q=normalizarV36(f.busca);intelConsultaAtual=intelRegistros.filter(r=>(!q||normalizarV36([r.os,r.desc_produto,r.nf,r.nce,r.n_serie,r.pdv,r.obs_status,r.obs_ordem_de_servico].join(' ')).includes(q))&&(!f.rack||textoIntel(r.rack)===f.rack)&&(!f.statusOS||textoIntel(r.status_da_os)===f.statusOS)&&(!f.status||textoIntel(r.status)===f.status)&&(!f.tecnico||textoIntel(r.tecnico)===f.tecnico)&&(!f.garantia||textoIntel(r.tipo_garantia)===f.garantia)&&(!f.categoria||classificarCategoriaProduto(r.desc_produto,r.grupo)===f.categoria));renderConsultaIntelV36()}
function renderConsultaIntelV36(){const l=intelConsultaAtual;document.getElementById('intelConsultaResumo').textContent=l.length.toLocaleString('pt-BR')+' O.S. encontrada(s).';document.getElementById('intelConsultaTabela').innerHTML=l.length?"<table><thead><tr><th>O.S.</th><th>GR</th><th>N.C.E</th><th>Produto</th><th>Categoria</th><th>Rack</th><th>Status</th><th>Situação</th><th>Técnico</th><th>PDV</th><th>Garantia</th><th>Ação</th></tr></thead><tbody>"+l.slice(0,2000).map(r=>"<tr><td><b>"+escaparHTML(r.os||'-')+"</b></td><td>"+escaparHTML(r.grupo||'-')+"</td><td>"+escaparHTML(r.nce||'-')+"</td><td>"+escaparHTML(r.desc_produto||'-')+"</td><td>"+escaparHTML(classificarCategoriaProduto(r.desc_produto,r.grupo))+"</td><td>"+escaparHTML(r.rack||'-')+"</td><td>"+escaparHTML(r.status||'-')+"</td><td>"+escaparHTML(r.status_da_os||'-')+"</td><td>"+escaparHTML(r.tecnico||'-')+"</td><td>"+escaparHTML(r.pdv||'-')+"</td><td>"+escaparHTML(r.tipo_garantia||'-')+"</td><td><button class='usuario-acao' onclick=\"abrirOSIntel('"+String(r.os).replace(/'/g,"\\'")+"')\">Abrir</button></td></tr>").join('')+"</tbody></table>":"<div class='admin-info'>Nenhuma O.S. encontrada.</div>"}
function limparConsultaIntel(){['icBusca','icRack','icStatusOS','icStatus','icTecnico','icGarantia'].forEach(id=>document.getElementById(id).value='');aplicarConsultaIntel()}
function salvarConsultaIntel(){const nome=prompt('Nome para esta consulta:');if(!nome)return;const salvas=JSON.parse(localStorage.getItem('erp_consultas_intel')||'[]');salvas.push({nome,filtros:filtrosAtuaisV36()});localStorage.setItem('erp_consultas_intel',JSON.stringify(salvas.slice(-20)));renderConsultasSalvasV36()}
function renderConsultasSalvasV36(){const e=document.getElementById('intelConsultasSalvas');if(!e)return;const salvas=JSON.parse(localStorage.getItem('erp_consultas_intel')||'[]');e.innerHTML=salvas.map((x,i)=>"<button class='intel-salva-chip' onclick='carregarConsultaSalvaV36("+i+")'>"+escaparHTML(x.nome)+"</button>").join('')}
function carregarConsultaSalvaV36(i){const x=JSON.parse(localStorage.getItem('erp_consultas_intel')||'[]')[i];if(!x)return;Object.entries({icBusca:x.filtros.busca,icRack:x.filtros.rack,icStatusOS:x.filtros.statusOS,icStatus:x.filtros.status,icTecnico:x.filtros.tecnico,icGarantia:x.filtros.garantia,icCategoria:x.filtros.categoria}).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v||''});aplicarConsultaIntel()}
function exportarConsultaIntelCSV(){if(!intelConsultaAtual.length){alert('Não há dados para exportar.');return}const cols=[['O.S.','os'],['GR','grupo'],['N.C.E','nce'],['PRODUTO','desc_produto'],['CATEGORIA','__categoria'],['Rack','rack'],['Status','status'],['Situação da O.S.','status_da_os'],['Técnico','tecnico'],['PDV','pdv'],['Garantia','tipo_garantia'],['NF','nf'],['Data geração','dt_geracao'],['Data expedição','dt_expedicao']];const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const linhas=[cols.map(c=>esc(c[0])).join(';')].concat(intelConsultaAtual.map(r=>cols.map(c=>esc(c[1]==='__categoria'?classificarCategoriaProduto(r.desc_produto,r.grupo):r[c[1]])).join(';')));const b=new Blob(['\uFEFF'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='consulta_avancada_'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(u)}
function imprimirConsultaIntel(){if(!intelConsultaAtual.length){alert('Não há dados para imprimir.');return}const conteudo=document.getElementById('intelConsultaTabela').innerHTML,w=window.open('','_blank');w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>Consulta avançada</title><style>body{font-family:Arial;padding:18px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #000;padding:4px;text-align:left}button{display:none}h2{margin-bottom:6px}</style></head><body><h2>Consulta avançada de O.S.</h2><p>"+intelConsultaAtual.length+" registro(s) • "+new Date().toLocaleString('pt-BR')+"</p>"+conteudo+"<script>window.onload=()=>window.print()<\/script></body></html>");w.document.close()}


/* ========================= MOTOR DE REGRAS 3.6.2 ========================= */
const MOTOR_REGRAS_KEY='erp_motor_regras_v362';
const MOTOR_CAMPOS={
 os:'O.S.',rack:'Rack',status:'Status operacional',status_da_os:'Situação da O.S.',tecnico:'Técnico',pdv:'PDV / Loja',tipo_garantia:'Tipo de garantia',desc_produto:'Produto',cpp:'CPP',dt_expedicao:'Data de expedição',dt_geracao:'Data de geração',dt_recb_at:'Data de recebimento',_dias:'Dias sem movimentação'
};
const MOTOR_OPERADORES={igual:'Igual a',diferente:'Diferente de',contem:'Contém',nao_contem:'Não contém',vazio:'Está vazio',preenchido:'Está preenchido',maior:'Maior que',menor:'Menor que'};
function regrasPadraoMotor(){return [
 {id:'padrao_rack500',nome:'Rack 500 aberto',icone:'📦',prioridade:'alta',cor:'red',ativa:true,condicoes:[{campo:'rack',operador:'igual',valor:'500'},{campo:'status_da_os',operador:'igual',valor:'ABE'}]},
 {id:'padrao_sem_tecnico',nome:'O.S. aberta sem técnico',icone:'❌',prioridade:'media',cor:'orange',ativa:true,condicoes:[{campo:'status_da_os',operador:'igual',valor:'ABE'},{campo:'tecnico',operador:'vazio',valor:''}]},
 {id:'padrao_sem_rack',nome:'O.S. aberta sem rack',icone:'📍',prioridade:'media',cor:'orange',ativa:true,condicoes:[{campo:'status_da_os',operador:'igual',valor:'ABE'},{campo:'rack',operador:'vazio',valor:''}]},
 {id:'padrao_oficina20',nome:'Oficina há mais de 20 dias',icone:'🔧',prioridade:'alta',cor:'red',ativa:true,condicoes:[{campo:'_dias',operador:'maior',valor:'20'},{campo:'dt_expedicao',operador:'vazio',valor:''}]}
]}
function carregarRegrasMotor(){try{const x=JSON.parse(localStorage.getItem(MOTOR_REGRAS_KEY)||'null');if(Array.isArray(x))return x}catch(e){}const p=regrasPadraoMotor();localStorage.setItem(MOTOR_REGRAS_KEY,JSON.stringify(p));return p}
function salvarRegrasMotorLista(l){localStorage.setItem(MOTOR_REGRAS_KEY,JSON.stringify(l));renderMotorRegras();if(typeof renderIntel==='function')renderIntel()}
function normalizarValorRegraMotor(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\u00A0/g,' ').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim().toUpperCase()}
function avaliarCondicaoMotor(r,c){const bruto=c.campo==='_dias'?(r._dias||0):r[c.campo],textoBruto=textoIntel(bruto),a=normalizarValorRegraMotor(bruto),b=normalizarValorRegraMotor(c.valor);switch(c.operador){case'igual':return a===b;case'diferente':return a!==b;case'contem':return a.includes(b);case'nao_contem':return !a.includes(b);case'vazio':return !textoBruto;case'preenchido':return !!textoBruto;case'maior':return Number(String(bruto).replace(',','.'))>Number(String(c.valor).replace(',','.'));case'menor':return Number(String(bruto).replace(',','.'))<Number(String(c.valor).replace(',','.'));default:return false}}
function resultadoRegraMotor(regra){return intelRegistros.filter(r=>(regra.condicoes||[]).every(c=>avaliarCondicaoMotor(r,c)))}
function descricaoRegraMotor(regra){return (regra.condicoes||[]).map(c=>`${MOTOR_CAMPOS[c.campo]||c.campo} ${MOTOR_OPERADORES[c.operador]||c.operador}${['vazio','preenchido'].includes(c.operador)?'':` “${c.valor}”`}`).join(' E ')}
function renderMotorRegras(){const e=document.getElementById('motorRegrasLista');if(!e)return;const regras=carregarRegrasMotor();e.innerHTML=regras.length?regras.map(r=>{const qtd=intelRegistros.length?resultadoRegraMotor(r).length:'--';return `<div class="regra-item ${r.cor||''} ${r.ativa?'':'inativa'}"><div><b>${escaparHTML(r.icone||'⚠')} ${escaparHTML(r.nome)}</b><small>${escaparHTML(descricaoRegraMotor(r))}</small></div><div><span class="regra-badge ${r.prioridade}">${escaparHTML(r.prioridade)}</span></div><div><b>${qtd}</b><small>O.S. encontradas</small></div><div class="regra-acoes"><button onclick="abrirResultadoRegraMotor('${r.id}')">Ver</button><button class="warn" onclick="editarRegraMotor('${r.id}')">Editar</button><button onclick="alternarRegraMotor('${r.id}')">${r.ativa?'Desativar':'Ativar'}</button><button class="danger" onclick="excluirRegraMotor('${r.id}')">Excluir</button></div></div>`}).join(''):'<div class="regra-vazio">Nenhuma regra cadastrada.</div>'}
function abrirModalRegra(id){document.getElementById('regraModal').style.display='flex';document.getElementById('regraId').value='';document.getElementById('regraNome').value='';document.getElementById('regraIcone').value='⚠';document.getElementById('regraPrioridade').value='alta';document.getElementById('regraCor').value='red';document.getElementById('regraCondicoes').innerHTML='';adicionarCondicaoRegra();document.getElementById('regraModalTitulo').textContent='Nova regra operacional'}
function fecharModalRegra(){document.getElementById('regraModal').style.display='none'}
function opcoesObj(obj,sel){return Object.entries(obj).map(([v,t])=>`<option value="${v}" ${v===sel?'selected':''}>${escaparHTML(t)}</option>`).join('')}
function adicionarCondicaoRegra(c={campo:'status_da_os',operador:'igual',valor:'ABE'}){const d=document.createElement('div');d.className='regra-condicao';d.innerHTML=`<select class="rc-campo">${opcoesObj(MOTOR_CAMPOS,c.campo)}</select><select class="rc-operador" onchange="ajustarValorCondicao(this)">${opcoesObj(MOTOR_OPERADORES,c.operador)}</select><input class="rc-valor" value="${escaparHTML(c.valor||'')}" placeholder="Valor"><button onclick="this.parentElement.remove()">×</button>`;document.getElementById('regraCondicoes').appendChild(d);ajustarValorCondicao(d.querySelector('.rc-operador'))}
function ajustarValorCondicao(sel){const i=sel.parentElement.querySelector('.rc-valor');i.disabled=['vazio','preenchido'].includes(sel.value);if(i.disabled)i.value=''}
function salvarRegraMotor(){const nome=document.getElementById('regraNome').value.trim();if(!nome){alert('Informe o nome da regra.');return}const cond=[...document.querySelectorAll('#regraCondicoes .regra-condicao')].map(d=>({campo:d.querySelector('.rc-campo').value,operador:d.querySelector('.rc-operador').value,valor:d.querySelector('.rc-valor').value.trim()}));if(!cond.length){alert('Adicione pelo menos uma condição.');return}const id=document.getElementById('regraId').value||('regra_'+Date.now());const regras=carregarRegrasMotor(),ant=regras.find(r=>r.id===id);const nova={id,nome,icone:document.getElementById('regraIcone').value||'⚠',prioridade:document.getElementById('regraPrioridade').value,cor:document.getElementById('regraCor').value,ativa:ant?ant.ativa:true,condicoes:cond};const idx=regras.findIndex(r=>r.id===id);if(idx>=0)regras[idx]=nova;else regras.push(nova);salvarRegrasMotorLista(regras);fecharModalRegra()}
function editarRegraMotor(id){const r=carregarRegrasMotor().find(x=>x.id===id);if(!r)return;abrirModalRegra();document.getElementById('regraModalTitulo').textContent='Editar regra operacional';document.getElementById('regraId').value=r.id;document.getElementById('regraNome').value=r.nome;document.getElementById('regraIcone').value=r.icone||'⚠';document.getElementById('regraPrioridade').value=r.prioridade;document.getElementById('regraCor').value=r.cor||'';document.getElementById('regraCondicoes').innerHTML='';r.condicoes.forEach(adicionarCondicaoRegra)}
function alternarRegraMotor(id){const r=carregarRegrasMotor();const x=r.find(v=>v.id===id);if(x)x.ativa=!x.ativa;salvarRegrasMotorLista(r)}
function excluirRegraMotor(id){if(!confirm('Excluir esta regra?'))return;salvarRegrasMotorLista(carregarRegrasMotor().filter(r=>r.id!==id))}
function abrirResultadoRegraMotor(id){const r=carregarRegrasMotor().find(x=>x.id===id);if(r)abrirResultadoAssistenteIntel((r.icone||'⚠')+' '+r.nome,resultadoRegraMotor(r))}
const obterCartoesV36Original=obterCartoesV36;
obterCartoesV36=function(a=intelAnalise){const base=obterCartoesV36Original(a);const regras=carregarRegrasMotor().filter(r=>r.ativa).map(r=>[(r.icone||'⚠')+' '+r.nome,resultadoRegraMotor(r),r.cor||'']);return base.concat(regras)};
function renderizarTudoIntel(){
    if(typeof renderIntel==='function')renderIntel();
    if(typeof renderMotorRegras==='function')renderMotorRegras();
}
document.addEventListener('DOMContentLoaded',()=>renderMotorRegras());


/* ========================= CENTRAL DA O.S. / COMPARADOR 3.7 ========================= */
let osAtualCentral=null;
let comparacaoAtual=null;
let comparacaoFiltroAtual='todas';
const CAMPOS_COMPARADOR={status:'Status',status_da_os:'Situação da O.S.',rack:'Rack',tecnico:'Técnico',dt_expedicao:'Data de expedição',dt_conserto:'Data de conserto',dt_saida_oficina:'Saída da oficina',sit_cpp:'Situação CPP'};
function abrirDBOperacional(){return new Promise((resolve,reject)=>{const req=indexedDB.open('erp_operacional_v37',1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('comparacoes'))db.createObjectStore('comparacoes',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function salvarComparacaoImportacao(c){const db=await abrirDBOperacional();return new Promise((resolve,reject)=>{const tx=db.transaction('comparacoes','readwrite');tx.objectStore('comparacoes').put(c);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function listarComparacoesImportacao(){const db=await abrirDBOperacional();return new Promise((resolve,reject)=>{const tx=db.transaction('comparacoes','readonly'),req=tx.objectStore('comparacoes').getAll();req.onsuccess=()=>{db.close();resolve((req.result||[]).sort((a,b)=>String(b.data).localeCompare(String(a.data))));};req.onerror=()=>{db.close();reject(req.error);};});}
function valorComp(v){return String(v??'').trim()}
function compararBasesImportacao(antes,depois,meta={}){
 const mapaAntes=new Map((antes||[]).filter(r=>valorComp(r.os)).map(r=>[valorComp(r.os),r]));
 const mapaDepois=new Map((depois||[]).filter(r=>valorComp(r.os)).map(r=>[valorComp(r.os),r]));
 const novas=[],mudancas=[],status=[],racks=[],tecnicos=[],finalizadas=[];
 mapaDepois.forEach((novo,os)=>{const antigo=mapaAntes.get(os);if(!antigo){const x={tipo:'nova',os,produto:novo.desc_produto||'',campo:'Nova O.S.',antes:'-',depois:'Incluída',registro:novo};novas.push(x);return}
  Object.keys(CAMPOS_COMPARADOR).forEach(c=>{const a=valorComp(antigo[c]),b=valorComp(novo[c]);if(a!==b){const x={tipo:'mudanca',os,produto:novo.desc_produto||'',campo:CAMPOS_COMPARADOR[c],campoChave:c,antes:a||'(vazio)',depois:b||'(vazio)',registro:novo};mudancas.push(x);if(c==='status'||c==='status_da_os')status.push(x);if(c==='rack')racks.push(x);if(c==='tecnico'&&!a&&b)tecnicos.push(x);if((c==='dt_expedicao'&&!a&&b)||(c==='status_da_os'&&!/FEC|FECH/i.test(a)&&/FEC|FECH/i.test(b)))finalizadas.push(x)}})});
 return {id:'imp_'+Date.now(),data:meta.data||new Date().toISOString(),arquivo:meta.arquivo||'arquivo',usuario:meta.usuario||'Usuário',totalAntes:mapaAntes.size,totalDepois:mapaDepois.size,novas,mudancas,status,racks,tecnicos,finalizadas,todas:novas.concat(mudancas)}
}
function abrirComparadorImportacao(c){comparacaoAtual=c;comparacaoFiltroAtual='todas';document.getElementById('comparadorModal').style.display='flex';document.getElementById('comparadorSubtitulo').textContent=(c.arquivo||'Arquivo')+' • '+new Date(c.data).toLocaleString('pt-BR');renderComparadorResumo();renderComparadorLista('todas')}
function fecharComparadorImportacao(){
    const modal=document.getElementById('comparadorModal');
    if(modal)modal.style.display='none';
}
document.addEventListener('keydown',function(event){
    if(event.key==='Escape'){
        const modal=document.getElementById('comparadorModal');
        if(modal&&getComputedStyle(modal).display!=='none')fecharComparadorImportacao();
    }
});
function renderComparadorResumo(){const c=comparacaoAtual;if(!c)return;const cards=[['novas','Novas O.S.',c.novas.length],['status','Mudaram de status',c.status.length],['racks','Trocaram de rack',c.racks.length],['tecnicos','Receberam técnico',c.tecnicos.length],['finalizadas','Finalizadas/expedidas',c.finalizadas.length]];document.getElementById('comparadorResumo').innerHTML=cards.map(x=>`<div class="comp-card ${x[0]}" onclick="renderComparadorLista('${x[0]}')"><strong>${x[2]}</strong><small>${x[1]}</small></div>`).join('')}
function listaComparador(tipo){const c=comparacaoAtual;if(!c)return[];return tipo==='todas'?c.todas:(c[tipo]||[])}
function renderComparadorLista(tipo='todas'){comparacaoFiltroAtual=tipo;const nomes={todas:'Todas as alterações',novas:'Novas O.S.',status:'Mudanças de status',racks:'Mudanças de rack',tecnicos:'O.S. que receberam técnico',finalizadas:'Finalizadas ou expedidas'};const l=listaComparador(tipo);document.getElementById('comparadorTituloLista').textContent=(nomes[tipo]||'Alterações')+' — '+l.length+' ocorrência(s)';document.getElementById('comparadorTabela').innerHTML=l.length?`<table><thead><tr><th>O.S.</th><th>Produto</th><th>Alteração</th><th>Antes</th><th>Depois</th><th>Ação</th></tr></thead><tbody>${l.map(x=>`<tr><td><b>${escaparHTML(x.os)}</b></td><td>${escaparHTML(x.produto||'-')}</td><td><span class="comp-tag">${escaparHTML(x.campo)}</span></td><td>${escaparHTML(x.antes)}</td><td>${escaparHTML(x.depois)}</td><td><button class="usuario-acao" onclick="abrirFichaRegistro(comparacaoAtual.todas.find(v=>v.os==='${String(x.os).replace(/'/g,"\\'")}').registro);fecharComparadorImportacao()">Abrir O.S.</button></td></tr>`).join('')}</tbody></table>`:'<div class="admin-info">Nenhuma ocorrência nesta categoria.</div>'}
function exportarComparadorCSV(){const l=listaComparador(comparacaoFiltroAtual);if(!l.length){alert('Não há alterações para exportar.');return}const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const linhas=[['O.S.','Produto','Alteração','Antes','Depois'].map(esc).join(';')].concat(l.map(x=>[x.os,x.produto,x.campo,x.antes,x.depois].map(esc).join(';')));const b=new Blob(['\uFEFF'+linhas.join('\r\n')],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='alteracoes_importacao_'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(u)}
function imprimirComparador(){const h=document.getElementById('comparadorTabela').innerHTML,w=window.open('','_blank');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:18px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #000;padding:5px}button{display:none}</style></head><body><h2>Alterações da importação</h2>${h}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}
function chaveNotasOS(os){return'erp_notas_os_'+String(os||'').trim()}
function carregarNotasOS(os){try{return JSON.parse(localStorage.getItem(chaveNotasOS(os))||'[]')}catch(e){return[]}}
function salvarObservacaoOS(){if(!osAtualCentral)return;const e=document.getElementById('osNotaTexto'),texto=e.value.trim();if(!texto){alert('Digite uma observação.');return}const notas=carregarNotasOS(osAtualCentral.os);notas.unshift({id:Date.now(),texto,data:new Date().toISOString(),autor:(usuarioLogado&&(usuarioLogado.nome||usuarioLogado.email))||'Usuário'});localStorage.setItem(chaveNotasOS(osAtualCentral.os),JSON.stringify(notas.slice(0,200)));e.value='';renderNotasOS();registrarAuditoria('os','Observação interna adicionada à O.S. '+osAtualCentral.os,{os:osAtualCentral.os})}
function renderNotasOS(){const e=document.getElementById('osNotas');if(!e||!osAtualCentral)return;const n=carregarNotasOS(osAtualCentral.os);e.innerHTML=n.length?n.map(x=>`<div class="os-nota"><b>${escaparHTML(x.autor)}</b><small>${new Date(x.data).toLocaleString('pt-BR')}</small><p>${escaparHTML(x.texto)}</p></div>`).join(''):'<div class="admin-info">Nenhuma observação interna.</div>'}
function eventosInferidosOS(r){
    const ev=[];
    const add=(data,titulo,detalhe)=>{if(data)ev.push({data,titulo,detalhe})};
    add(r.dt_geracao,'O.S. gerada','Registro inicial da ordem de serviço.');
    add(r.dt_recb_at,'Recebido na A.T.','Recebimento registrado na Assistência Técnica.');
    add(r.data_cpp,'CPP registrado',r.nr_cpp?('CPP '+r.nr_cpp):'Solicitação de CPP.');
    add(r.dt_conserto,'Conserto registrado',r.status||'Conserto concluído.');
    add(r.dt_saida_oficina,'Saída da oficina','Equipamento saiu da oficina.');
    add(r.dt_expedicao,'Expedição registrada',r.pdv_expedicao?('Destino: '+r.pdv_expedicao):'Produto expedido.');
    return ev;
}
async function eventosComparacoesOS(os){try{const cs=await listarComparacoesImportacao();const ev=[];cs.forEach(c=>(c.todas||[]).filter(x=>String(x.os)===String(os)).forEach(x=>ev.push({data:c.data,titulo:x.tipo==='nova'?'Importada como nova O.S.':x.campo+' alterado',detalhe:x.tipo==='nova'?'Incluída na base pela importação.':x.antes+' → '+x.depois})));return ev}catch(e){return[]}}
async function carregarCentralOS(r){osAtualCentral=r;renderNotasOS();const area=document.getElementById('osTimeline');if(!area)return;area.innerHTML='<div class="admin-info">Carregando linha do tempo...</div>';const ev=eventosInferidosOS(r).concat(await eventosComparacoesOS(r.os));ev.sort((a,b)=>{const da=new Date(a.data).getTime()||0,db=new Date(b.data).getTime()||0;return db-da});area.innerHTML=ev.length?ev.map(x=>`<div class="os-evento"><b>${escaparHTML(x.titulo)}</b><small>${formatarDataHora(x.data)}</small><span class="mudanca">${escaparHTML(x.detalhe||'')}</span></div>`).join(''):'<div class="admin-info">Ainda não há eventos registrados para esta O.S.</div>'}


/* =========================
VERSÃO 3.8 - DADOS OPERACIONAIS COMPARTILHADOS NO SUPABASE
Mantém contingência local quando as tabelas ainda não estiverem instaladas.
========================= */
const ERP_V38_TABELAS={observacoes:'observacoes_os',historico:'historico_os',importacoes:'historico_importacoes'};
let erpV38SupabaseDisponivel=null;

function erroTabelaAusenteV38(error){
    const codigo=String((error&&error.code)||'');
    const mensagem=String((error&&error.message)||'').toLowerCase();
    return codigo==='42P01'||codigo==='PGRST205'||mensagem.includes('could not find the table')||mensagem.includes('does not exist');
}
function usuarioOperacionalV38(){
    return {
        id:(usuarioLogado&&usuarioLogado.id)||null,
        nome:(usuarioLogado&&(usuarioLogado.nome||usuarioLogado.email))||'Usuário',
        email:(usuarioLogado&&usuarioLogado.email)||null
    };
}
function definirOrigemNotasV38(texto,ok){
    const e=document.getElementById('osNotasOrigem');
    if(e){e.textContent=texto;e.style.color=ok?'#0b7a2a':'#b36b00';}
}
async function verificarEstruturaSupabaseV38(silencioso=false){
    const msg=document.getElementById('msgAdminConfig');
    try{
        const sb=obterSupabaseClient();
        for(const tabela of Object.values(ERP_V38_TABELAS)){
            const {error}=await sb.from(tabela).select('*',{head:true,count:'exact'}).limit(1);
            if(error)throw error;
        }
        erpV38SupabaseDisponivel=true;
        if(msg&&!silencioso)msg.innerHTML="<span class='admin-status-ok'>Versão 3.8 pronta:</span> as tabelas compartilhadas estão disponíveis no Supabase.";
        return true;
    }catch(error){
        erpV38SupabaseDisponivel=false;
        if(msg&&!silencioso){
            const detalhe=erroTabelaAusenteV38(error)?'Execute o arquivo SQL da Versão 3.8 no Supabase.':'Falha ao consultar as tabelas: '+escaparHTML(error.message||String(error));
            msg.innerHTML="<span class='admin-status-alerta'>Estrutura 3.8 ainda não disponível.</span> "+detalhe;
        }
        return false;
    }
}
async function supabaseOperacionalDisponivelV38(){
    if(erpV38SupabaseDisponivel===true)return true;
    return verificarEstruturaSupabaseV38(true);
}

/* Comparações: grava localmente como contingência e também nas tabelas compartilhadas. */
const salvarComparacaoLocalV37=salvarComparacaoImportacao;
salvarComparacaoImportacao=async function(c){
    await salvarComparacaoLocalV37(c);
    if(!(await supabaseOperacionalDisponivelV38()))return {local:true,supabase:false};
    const sb=obterSupabaseClient(),u=usuarioOperacionalV38();
    const resumo={novas:c.novas.length,status:c.status.length,racks:c.racks.length,tecnicos:c.tecnicos.length,finalizadas:c.finalizadas.length,alteracoes:c.todas.length};
    const cabecalho={
        id:c.id,arquivo:c.arquivo||'arquivo',usuario_id:u.id,usuario_nome:c.usuario||u.nome,usuario_email:u.email,
        total_antes:c.totalAntes||0,total_depois:c.totalDepois||0,total_novas:resumo.novas,total_status:resumo.status,
        total_racks:resumo.racks,total_tecnicos:resumo.tecnicos,total_finalizadas:resumo.finalizadas,total_alteracoes:resumo.alteracoes,
        resumo,created_at:c.data||new Date().toISOString()
    };
    const {error:erroCab}=await sb.from(ERP_V38_TABELAS.importacoes).upsert(cabecalho,{onConflict:'id'});
    if(erroCab)throw erroCab;
    const linhas=(c.todas||[]).map(x=>({
        importacao_id:c.id,os:String(x.os||''),produto:x.produto||null,tipo:x.tipo||'mudanca',campo:x.campo||null,
        campo_chave:x.campoChave||null,valor_anterior:x.antes||null,valor_novo:x.depois||null,
        registro:x.registro||{},created_at:c.data||new Date().toISOString()
    }));
    if(linhas.length){
        await sb.from(ERP_V38_TABELAS.historico).delete().eq('importacao_id',c.id);
        for(let i=0;i<linhas.length;i+=500){
            const {error}=await sb.from(ERP_V38_TABELAS.historico).insert(linhas.slice(i,i+500));
            if(error)throw error;
        }
    }
    return {local:true,supabase:true};
};

/* Observações internas compartilhadas com contingência local. */
async function carregarNotasOSSupabaseV38(os){
    if(!(await supabaseOperacionalDisponivelV38()))return null;
    const sb=obterSupabaseClient();
    const {data,error}=await sb.from(ERP_V38_TABELAS.observacoes).select('id,os,texto,autor_nome,autor_email,created_at').eq('os',String(os)).order('created_at',{ascending:false}).limit(500);
    if(error){if(erroTabelaAusenteV38(error)){erpV38SupabaseDisponivel=false;return null;}throw error;}
    return (data||[]).map(x=>({id:x.id,texto:x.texto,data:x.created_at,autor:x.autor_nome||x.autor_email||'Usuário'}));
}
salvarObservacaoOS=async function(){
    if(!osAtualCentral)return;
    const e=document.getElementById('osNotaTexto'),texto=e.value.trim();
    if(!texto){alert('Digite uma observação.');return;}
    e.disabled=true;
    try{
        const u=usuarioOperacionalV38();
        let sincronizada=false;
        if(await supabaseOperacionalDisponivelV38()){
            const sb=obterSupabaseClient();
            const {error}=await sb.from(ERP_V38_TABELAS.observacoes).insert({os:String(osAtualCentral.os),texto,autor_id:u.id,autor_nome:u.nome,autor_email:u.email});
            if(error)throw error;
            sincronizada=true;
        }else{
            const notas=carregarNotasOS(osAtualCentral.os);
            notas.unshift({id:Date.now(),texto,data:new Date().toISOString(),autor:u.nome});
            localStorage.setItem(chaveNotasOS(osAtualCentral.os),JSON.stringify(notas.slice(0,200)));
        }
        e.value='';
        await renderNotasOS();
        registrarAuditoria('os','Observação interna adicionada à O.S. '+osAtualCentral.os,{os:osAtualCentral.os,sincronizada});
    }catch(error){
        alert('Não foi possível salvar a observação: '+(error.message||error));
    }finally{e.disabled=false;e.focus();}
};
function podeExcluirObservacaoOS(){
    if(!usuarioLogado)return false;
    return ['administrador','supervisor'].includes(String(usuarioLogado.perfil||'').toLowerCase());
}
function htmlObservacaoOS(x){
    const idSeguro=JSON.stringify(String(x.id??''));
    const botao=podeExcluirObservacaoOS()
        ?`<button class="os-nota-apagar" type="button" onclick='excluirObservacaoOS(${idSeguro},this)'>Apagar</button>`
        :'';
    return `<div class="os-nota" data-nota-id="${escaparHTML(String(x.id??''))}">
        ${botao}
        <b>${escaparHTML(x.autor)}</b>
        <small>${new Date(x.data).toLocaleString('pt-BR')}</small>
        <p>${escaparHTML(x.texto)}</p>
    </div>`;
}
async function excluirObservacaoOS(id,botao){
    if(!osAtualCentral)return;
    if(!exigirPermissao(["administrador","supervisor"],"Excluir observação interna"))return;

    const os=String(osAtualCentral.os);
    const idTexto=String(id??'');
    const confirmou=confirm(
        "Apagar esta observação interna da O.S. "+os+"?\n\n"+
        "Esta ação não poderá ser desfeita."
    );
    if(!confirmou)return;

    if(botao)botao.disabled=true;
    try{
        let sincronizada=false;
        let observacaoRemovida=null;

        if(await supabaseOperacionalDisponivelV38()){
            const sb=obterSupabaseClient();

            const {data:registro,error:erroBusca}=await sb
                .from(ERP_V38_TABELAS.observacoes)
                .select('id,os,texto,autor_nome,autor_email,created_at')
                .eq('id',id)
                .eq('os',os)
                .maybeSingle();

            if(erroBusca)throw erroBusca;
            if(!registro)throw new Error("A observação não foi encontrada ou já foi apagada.");

            observacaoRemovida=registro;

            // Exclusão segura pelo Supabase. A função valida o perfil do usuário
            // e confirma que exatamente uma observação foi removida.
            const {data:rpcResultado,error:rpcErro}=await sb.rpc(
                'excluir_observacao_os',
                {p_id:Number(id),p_os:os}
            );

            if(rpcErro){
                const mensagem=String(rpcErro.message||rpcErro);
                if(/function|excluir_observacao_os|schema cache|does not exist/i.test(mensagem)){
                    throw new Error(
                        "A função de exclusão ainda não foi instalada no Supabase. "+
                        "Execute o SQL fornecido junto com esta versão."
                    );
                }
                throw rpcErro;
            }

            if(rpcResultado!==true){
                throw new Error(
                    "O Supabase não removeu a observação. Ela pode já ter sido apagada "+
                    "ou seu usuário não possui permissão."
                );
            }

            // Confirma no banco para impedir falso sucesso.
            const {data:confirmacao,error:erroConfirmacao}=await sb
                .from(ERP_V38_TABELAS.observacoes)
                .select('id')
                .eq('id',id)
                .eq('os',os)
                .maybeSingle();

            if(erroConfirmacao)throw erroConfirmacao;
            if(confirmacao){
                throw new Error("A exclusão foi solicitada, mas a observação ainda existe no banco.");
            }

            sincronizada=true;
        }else{
            const notas=carregarNotasOS(os);
            const indice=notas.findIndex(x=>String(x.id)===idTexto);
            if(indice<0)throw new Error("A observação local não foi encontrada.");

            observacaoRemovida=notas[indice];
            notas.splice(indice,1);
            localStorage.setItem(chaveNotasOS(os),JSON.stringify(notas.slice(0,200)));
        }

        await renderNotasOS();

        const origem=document.getElementById('osNotasOrigem');
        if(origem){
            origem.textContent=sincronizada
                ?'• observação apagada e sincronizada'
                :'• observação local apagada';
        }

        await registrarAuditoria(
            'os',
            'Observação interna apagada da O.S. '+os,
            {
                os,
                observacao_id:idTexto,
                texto:observacaoRemovida?.texto||null,
                autor_original:observacaoRemovida?.autor_nome||observacaoRemovida?.autor||observacaoRemovida?.autor_email||null,
                sincronizada
            }
        );

        if(typeof criarNotificacaoV39==='function'){
            await criarNotificacaoV39(
                'Observação apagada',
                'Uma observação interna da O.S. '+os+' foi apagada.',
                'os',
                {os,observacao_id:idTexto,sincronizada}
            );
        }
    }catch(error){
        alert('Não foi possível apagar a observação: '+(error.message||error));
        if(botao)botao.disabled=false;
    }
}

renderNotasOS=async function(){
    const e=document.getElementById('osNotas');if(!e||!osAtualCentral)return;
    e.innerHTML='<div class="admin-info">Carregando observações...</div>';
    try{
        const remotas=await carregarNotasOSSupabaseV38(osAtualCentral.os);
        const n=remotas===null?carregarNotasOS(osAtualCentral.os):remotas;
        definirOrigemNotasV38(remotas===null?'• salvas neste computador':'• compartilhadas pela equipe',remotas!==null);
        e.innerHTML=n.length?n.map(htmlObservacaoOS).join(''):'<div class="admin-info">Nenhuma observação interna.</div>';
    }catch(error){
        definirOrigemNotasV38('• falha de sincronização',false);
        const n=carregarNotasOS(osAtualCentral.os);
        e.innerHTML=(n.length?n.map(htmlObservacaoOS).join(''):'<div class="admin-info">Nenhuma observação local.</div>')+`<div class="admin-info">Supabase indisponível: ${escaparHTML(error.message||String(error))}</div>`;
    }
};

/* Linha do tempo: primeiro consulta o histórico compartilhado; se não existir, usa IndexedDB local. */
eventosComparacoesOS=async function(os){
    try{
        if(await supabaseOperacionalDisponivelV38()){
            const sb=obterSupabaseClient();
            const {data,error}=await sb.from(ERP_V38_TABELAS.historico).select('tipo,campo,valor_anterior,valor_novo,created_at,importacao_id').eq('os',String(os)).order('created_at',{ascending:false}).limit(1000);
            if(error)throw error;
            return (data||[]).map(x=>({data:x.created_at,titulo:x.tipo==='nova'?'Importada como nova O.S.':(x.campo||'Campo')+' alterado',detalhe:x.tipo==='nova'?'Incluída na base pela importação.':String(x.valor_anterior||'(vazio)')+' → '+String(x.valor_novo||'(vazio)')}));
        }
    }catch(error){console.warn('Histórico compartilhado indisponível; usando histórico local.',error);}
    try{
        const cs=await listarComparacoesImportacao(),ev=[];
        cs.forEach(c=>(c.todas||[]).filter(x=>String(x.os)===String(os)).forEach(x=>ev.push({data:c.data,titulo:x.tipo==='nova'?'Importada como nova O.S.':x.campo+' alterado',detalhe:x.tipo==='nova'?'Incluída na base pela importação.':x.antes+' → '+x.depois})));
        return ev;
    }catch(e){return[];}
};

/* Histórico de comparações: combina Supabase com contingência local. */
const listarComparacoesLocalV37=listarComparacoesImportacao;
listarComparacoesImportacao=async function(){
    try{
        if(await supabaseOperacionalDisponivelV38()){
            const sb=obterSupabaseClient();
            const {data:imps,error}=await sb.from(ERP_V38_TABELAS.importacoes).select('*').order('created_at',{ascending:false}).limit(100);
            if(error)throw error;
            const resultado=[];
            for(const imp of (imps||[])){
                const {data:linhas,error:el}=await sb.from(ERP_V38_TABELAS.historico).select('*').eq('importacao_id',imp.id).order('id',{ascending:true});
                if(el)throw el;
                const todas=(linhas||[]).map(x=>({tipo:x.tipo,os:x.os,produto:x.produto||'',campo:x.campo||'',campoChave:x.campo_chave||'',antes:x.valor_anterior||'',depois:x.valor_novo||'',registro:x.registro||{}}));
                resultado.push({id:imp.id,data:imp.created_at,arquivo:imp.arquivo,usuario:imp.usuario_nome,totalAntes:imp.total_antes,totalDepois:imp.total_depois,novas:todas.filter(x=>x.tipo==='nova'),mudancas:todas.filter(x=>x.tipo!=='nova'),status:todas.filter(x=>['status','status_da_os'].includes(x.campoChave)),racks:todas.filter(x=>x.campoChave==='rack'),tecnicos:todas.filter(x=>x.campoChave==='tecnico'&&!x.antes&&x.depois),finalizadas:todas.filter(x=>(x.campoChave==='dt_expedicao'&&!x.antes&&x.depois)||(x.campoChave==='status_da_os'&&/FEC|FECH/i.test(x.depois))),todas});
            }
            return resultado;
        }
    }catch(error){console.warn('Histórico de importações compartilhado indisponível; usando local.',error);}
    return listarComparacoesLocalV37();
};

/* Garante que a Central aguarde as observações compartilhadas. */
carregarCentralOS=async function(r){
    osAtualCentral=r;
    await renderNotasOS();
    const area=document.getElementById('osTimeline');if(!area)return;
    area.innerHTML='<div class="admin-info">Carregando linha do tempo...</div>';
    const ev=eventosInferidosOS(r).concat(await eventosComparacoesOS(r.os));
    ev.sort((a,b)=>(new Date(b.data).getTime()||0)-(new Date(a.data).getTime()||0));
    area.innerHTML=ev.length?ev.map(x=>`<div class="os-evento"><b>${escaparHTML(x.titulo)}</b><small>${formatarDataHora(x.data)}</small><span class="mudanca">${escaparHTML(x.detalhe||'')}</span></div>`).join(''):'<div class="admin-info">Ainda não há eventos registrados para esta O.S.</div>';
};


/* ========================= VERSÃO 3.9 - CENTRAL DE NOTIFICAÇÕES ========================= */
const ERP_NOTIF_TABELA='notificacoes_erp';
const ERP_NOTIF_LOCAL_KEY='erp_notificacoes_v39';
var erpNotificacoes=[];
var erpNotifSupabaseDisponivel=null;
var erpNotifCanal=null;
var erpNotifCarregando=false;

function usuarioNotificacaoV39(){
    const u=typeof usuarioOperacionalV38==='function'?usuarioOperacionalV38():{};
    return {id:u.id||usuarioLogado?.id||null,nome:u.nome||usuarioLogado?.nome||usuarioLogado?.email||'Usuário',email:u.email||usuarioLogado?.email||null};
}
function normalizarNotifV39(x){return {id:x.id||('local_'+Date.now()+'_'+Math.random().toString(36).slice(2)),titulo:String(x.titulo||'Ação concluída'),mensagem:String(x.mensagem||''),tipo:String(x.tipo||'acao'),lida:!!x.lida,created_at:x.created_at||new Date().toISOString(),local:!!x.local};}
function lerNotifLocalV39(){try{return JSON.parse(localStorage.getItem(ERP_NOTIF_LOCAL_KEY)||'[]').map(normalizarNotifV39)}catch(e){return[]}}
function salvarNotifLocalV39(lista){localStorage.setItem(ERP_NOTIF_LOCAL_KEY,JSON.stringify((lista||[]).slice(0,300)))}
function tituloNotificacaoV39(acao,detalhes){
    const a=String(acao||'ação').toLowerCase();
    if(a.includes('import'))return 'Importação concluída';
    if(a.includes('observ')||String(detalhes||'').toLowerCase().includes('observação'))return 'Observação salva';
    if(a.includes('ci')||a.includes('c.i'))return 'C.I. concluída';
    if(a.includes('usuario'))return 'Ação de usuário concluída';
    if(a.includes('login'))return 'Login realizado';
    if(a.includes('logout'))return 'Sessão encerrada';
    if(a.includes('export'))return 'Exportação concluída';
    if(a.includes('relatorio'))return 'Relatório concluído';
    return 'Ação concluída';
}
async function verificarTabelaNotificacoesV39(){
    if(erpNotifSupabaseDisponivel!==null)return erpNotifSupabaseDisponivel;
    try{
        const sb=obterSupabaseClient();
        const {error}=await sb.from(ERP_NOTIF_TABELA).select('id').limit(1);
        if(error)throw error;
        erpNotifSupabaseDisponivel=true;
    }catch(e){erpNotifSupabaseDisponivel=false;console.warn('Notificações no Supabase indisponíveis:',e?.message||e)}
    return erpNotifSupabaseDisponivel;
}
async function criarNotificacaoV39(titulo,mensagem,tipo='acao',extra=null){
    const u=usuarioNotificacaoV39();
    const item=normalizarNotifV39({titulo,mensagem,tipo,lida:false,created_at:new Date().toISOString()});
    try{
        if(u.id&&await verificarTabelaNotificacoesV39()){
            const sb=obterSupabaseClient();
            const {data,error}=await sb.from(ERP_NOTIF_TABELA).insert({usuario_id:u.id,usuario_nome:u.nome,usuario_email:u.email,titulo:item.titulo,mensagem:item.mensagem,tipo:item.tipo,lida:false,extra:extra||{}}).select('*').single();
            if(error)throw error;
            item.id=data.id;item.created_at=data.created_at;item.local=false;
        }else{item.local=true;const l=lerNotifLocalV39();l.unshift(item);salvarNotifLocalV39(l)}
    }catch(e){item.local=true;const l=lerNotifLocalV39();l.unshift(item);salvarNotifLocalV39(l);console.warn('Notificação salva localmente:',e?.message||e)}
    if(!erpNotificacoes.some(x=>String(x.id)===String(item.id)))erpNotificacoes.unshift(item);
    renderCentralNotificacoesV39();
    return item;
}
async function carregarNotificacoesV39(){
    if(erpNotifCarregando)return;erpNotifCarregando=true;
    try{
        const u=usuarioNotificacaoV39();let remotas=[];let origem='Armazenamento local';
        if(u.id&&await verificarTabelaNotificacoesV39()){
            const sb=obterSupabaseClient();
            const {data,error}=await sb.from(ERP_NOTIF_TABELA).select('*').eq('usuario_id',u.id).order('created_at',{ascending:false}).limit(300);
            if(error)throw error;remotas=(data||[]).map(normalizarNotifV39);origem='Sincronizadas pelo Supabase';
        }
        const locais=lerNotifLocalV39();
        erpNotificacoes=[...remotas,...locais].filter((x,i,a)=>a.findIndex(y=>String(y.id)===String(x.id))===i).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,300);
        const o=document.getElementById('notifOrigem');if(o)o.textContent=origem+(locais.length?' • '+locais.length+' local(is)':'');
        renderCentralNotificacoesV39();
        iniciarRealtimeNotificacoesV39();
    }catch(e){erpNotificacoes=lerNotifLocalV39();const o=document.getElementById('notifOrigem');if(o)o.textContent='Modo local • '+(e?.message||e);renderCentralNotificacoesV39()}finally{erpNotifCarregando=false}
}
function renderCentralNotificacoesV39(){
    const list=document.getElementById('notifList'),count=document.getElementById('notifCount');if(!list||!count)return;
    const nao=erpNotificacoes.filter(x=>!x.lida).length;count.textContent=nao>99?'99+':nao;count.style.display=nao?'block':'none';
    list.innerHTML=erpNotificacoes.length?erpNotificacoes.map(x=>`<div class="notif-item ${x.lida?'':'nao-lida'}" onclick="marcarNotificacaoLidaV39('${String(x.id).replace(/'/g,"\\'")}')">${x.lida?'':'<span class="notif-dot"></span>'}<b>${escaparHTML(x.titulo)}</b><p>${escaparHTML(x.mensagem||'')}</p><small>${new Date(x.created_at).toLocaleString('pt-BR')}${x.local?' • local':''}</small></div>`).join(''):'<div class="notif-empty">Nenhuma notificação ainda.</div>';
}
function alternarCentralNotificacoes(ev){ev?.stopPropagation();const p=document.getElementById('notifPanel');p.classList.toggle('aberto');if(p.classList.contains('aberto'))carregarNotificacoesV39()}
async function marcarNotificacaoLidaV39(id){
    const n=erpNotificacoes.find(x=>String(x.id)===String(id));if(!n||n.lida)return;n.lida=true;renderCentralNotificacoesV39();
    try{if(!n.local&&await verificarTabelaNotificacoesV39()){const {error}=await obterSupabaseClient().from(ERP_NOTIF_TABELA).update({lida:true,lida_em:new Date().toISOString()}).eq('id',id);if(error)throw error}else{const l=lerNotifLocalV39();const x=l.find(y=>String(y.id)===String(id));if(x)x.lida=true;salvarNotifLocalV39(l)}}catch(e){console.warn(e)}
}
async function marcarTodasNotificacoesLidas(ev){ev?.stopPropagation();const u=usuarioNotificacaoV39();erpNotificacoes.forEach(x=>x.lida=true);renderCentralNotificacoesV39();try{if(u.id&&await verificarTabelaNotificacoesV39())await obterSupabaseClient().from(ERP_NOTIF_TABELA).update({lida:true,lida_em:new Date().toISOString()}).eq('usuario_id',u.id).eq('lida',false);const l=lerNotifLocalV39().map(x=>({...x,lida:true}));salvarNotifLocalV39(l)}catch(e){console.warn(e)}}
async function limparNotificacoes(ev){ev?.stopPropagation();if(!confirm('Limpar todas as suas notificações?'))return;const u=usuarioNotificacaoV39();try{if(u.id&&await verificarTabelaNotificacoesV39()){const {error}=await obterSupabaseClient().from(ERP_NOTIF_TABELA).delete().eq('usuario_id',u.id);if(error)throw error}salvarNotifLocalV39([]);erpNotificacoes=[];renderCentralNotificacoesV39()}catch(e){alert('Não foi possível limpar: '+(e?.message||e))}}
function iniciarRealtimeNotificacoesV39(){
    try{
        const u=usuarioNotificacaoV39();if(!u.id||!erpNotifSupabaseDisponivel||erpNotifCanal)return;
        const sb=obterSupabaseClient();
        erpNotifCanal=sb.channel('erp-notificacoes-'+u.id).on('postgres_changes',{event:'INSERT',schema:'public',table:ERP_NOTIF_TABELA,filter:'usuario_id=eq.'+u.id},payload=>{const n=normalizarNotifV39(payload.new);if(!erpNotificacoes.some(x=>String(x.id)===String(n.id)))erpNotificacoes.unshift(n);renderCentralNotificacoesV39()}).subscribe();
    }catch(e){console.warn('Realtime de notificações indisponível:',e?.message||e)}
}

document.addEventListener('click',ev=>{const w=document.getElementById('notifWrap'),p=document.getElementById('notifPanel');if(w&&p&&!w.contains(ev.target))p.classList.remove('aberto')});

/* Toda ação já registrada na auditoria também entra na Central após conclusão. */
const registrarAuditoriaBaseV39=registrarAuditoria;
registrarAuditoria=async function(acao,detalhes,extra){
    await registrarAuditoriaBaseV39(acao,detalhes,extra);
    const msg=typeof detalhes==='string'?detalhes:montarDetalheAuditoria(detalhes);
    if(!String(acao||'').toLowerCase().includes('logout'))await criarNotificacaoV39(tituloNotificacaoV39(acao,msg),msg||'Operação concluída com sucesso.',acao,extra);
};

/* Exportações e impressões dos cartões também geram confirmação. */
const exportarCartaoV36BaseV39=exportarCartaoV36;
exportarCartaoV36=function(indice){const item=obterCartoesV36()[indice];const r=exportarCartaoV36BaseV39(indice);if(item&&item[1]?.length)criarNotificacaoV39('Exportação concluída',item[0]+': '+item[1].length+' O.S. exportada(s).','exportacao',{cartao:item[0],total:item[1].length});return r};
const imprimirCartaoV36BaseV39=imprimirCartaoV36;
imprimirCartaoV36=function(indice){const item=obterCartoesV36()[indice];const r=imprimirCartaoV36BaseV39(indice);if(item&&item[1]?.length)criarNotificacaoV39('Impressão preparada',item[0]+': '+item[1].length+' O.S. enviada(s) para impressão.','impressao',{cartao:item[0],total:item[1].length});return r};

/* Inicialização após login e carregamento da página. */
window.addEventListener('load',()=>setTimeout(carregarNotificacoesV39,1200));
