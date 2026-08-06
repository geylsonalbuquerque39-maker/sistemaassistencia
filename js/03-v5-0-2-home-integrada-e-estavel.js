/* =========================================================
   V5.0.2 - HOME INTEGRADA E ESTÁVEL
   ========================================================= */
let homeV502Tentativa=0;
let homeV502Timer=null;

function homeV502Set(id,valor){
    const el=document.getElementById(id);
    if(el)el.textContent=valor;
}
function homeV502Saudacao(){
    const hora=new Date().getHours();
    const periodo=hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
    const nome=(typeof usuarioLogado!=="undefined"&&usuarioLogado&&(usuarioLogado.nome||usuarioLogado.email))||"";
    homeV502Set("homeIntegradaSaudacao",periodo+(nome?", "+nome.split(" ")[0]:"")+"!");
}
function homeV502Status(texto,tipo){
    const el=document.getElementById("homeIntegradaStatus");
    if(!el)return;
    el.className="home-integrada-status"+(tipo?" "+tipo:"");
    el.textContent=texto;
}
function renderHomeIntegradaV502(){
    const a=(typeof intelAnalise!=="undefined")?intelAnalise:null;
    const regs=(typeof intelRegistros!=="undefined"&&Array.isArray(intelRegistros))?intelRegistros:[];
    if(!a||!Array.isArray(regs)||!regs.length)return false;

    homeV502Set("hiAbertas",(a.abertas||[]).length.toLocaleString("pt-BR"));
    homeV502Set("hiProntas",(a.prontasAbertas||a.prontas||[]).length.toLocaleString("pt-BR"));
    homeV502Set("hiRack500",(a.rack500Abertas||[]).length.toLocaleString("pt-BR"));
    homeV502Set("hiSemTecnico",(a.semTecnico||[]).length.toLocaleString("pt-BR"));
    homeV502Set("hiSemRack",(a.semRack||[]).length.toLocaleString("pt-BR"));
    homeV502Set("hiExpHoje",(a.expHoje||[]).length.toLocaleString("pt-BR"));
    homeV502Set("homeIntegradaBase","Base: "+regs.length.toLocaleString("pt-BR")+" O.S.");
    homeV502Set("homeIntegradaAtualizacao","Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}));
    homeV502Set("homeIntegradaSistema","Sistema online");

    const alertas=[
        ["Rack 500 aberto",a.rack500Abertas||[],"rack500Abertas","O.S. abertas no Rack 500"],
        ["Grupos 13 e 14 abertos",a.grupo1314Abertos||[],"grupo1314Abertos","O.S. abertas dos grupos 13 e 14"],
        ["Grupos 5, 21 e 22 abertos",a.grupo52122Abertos||[],"grupo52122Abertos","O.S. abertas dos grupos 5, 21 e 22"],
        ["Prontas aguardando",a.prontasAbertas||a.prontas||[],"prontasAbertas","Prontas sem expedição"],
        ["CPP pendente",a.cpp||[],"cpp","Pendências de CPP"],
        ["Oficina +20 dias",a.oficina20||[],"oficina20","Tempo acima do limite"],
        ["Sem técnico",a.semTecnico||[],"semTecnico","O.S. aberta sem técnico"],
        ["Sem rack",a.semRack||[],"semRack","O.S. aberta sem localização"]
    ];
    const area=document.getElementById("homeIntegradaAlertas");
    if(area){
        const relevantes=alertas.filter(x=>x[1].length>0);
        area.innerHTML=relevantes.length
            ? relevantes.map(x=>"<div class='home-integrada-alerta' onclick=\"abrirListaHomeV502('"+x[2]+"')\"><div><b>"+escaparHTML(x[0])+"</b><small>"+escaparHTML(x[3])+"</small></div><strong>"+x[1].length+"</strong></div>").join("")
            : "<div class='home-integrada-status ok'>Nenhuma inconsistência crítica encontrada.</div>";
    }

    homeV502Set("hiImportData",localStorage.getItem("ULTIMA_IMPORTACAO_REXPEDLR")||"--");
    homeV502Set("hiImportQtd",localStorage.getItem("ULTIMA_IMPORTACAO_REXPEDLR_QTD")||"--");
    homeV502Set("hiImportDup",localStorage.getItem("ULTIMA_IMPORTACAO_REXPEDLR_DUP")||"--");
    homeV502Set("hiImportStatus","Concluída");
    homeV502Status("Indicadores atualizados usando a análise já existente do ERP.","ok");
    return true;
}
function aguardarAnaliseHomeV502(){
    clearTimeout(homeV502Timer);
    if(renderHomeIntegradaV502()){
        homeV502Tentativa=0;
        return;
    }
    homeV502Tentativa++;
    if(homeV502Tentativa>=40){
        homeV502Status("A análise não respondeu dentro de 20 segundos. Clique em “Atualizar indicadores” para tentar novamente.","erro");
        homeV502Set("homeIntegradaAtualizacao","Análise indisponível");
        homeV502Tentativa=0;
        return;
    }
    const segundos=Math.ceil((40-homeV502Tentativa)/2);
    homeV502Status("Analisando a base em segundo plano... limite de espera: "+segundos+" s.");
    homeV502Timer=setTimeout(aguardarAnaliseHomeV502,500);
}
async function carregarHomeIntegradaV502(forcar){
    homeV502Saudacao();
    homeV502Tentativa=0;
    if(renderHomeIntegradaV502()&&!forcar)return;

    homeV502Status(forcar?"Reanalisando a base...":"Preparando indicadores em segundo plano...");
    try{
        if(typeof carregarInteligencia!=="function"){
            throw new Error("Módulo de inteligência não encontrado.");
        }
        if(forcar || !(typeof intelRegistros!=="undefined"&&Array.isArray(intelRegistros)&&intelRegistros.length)){
            await carregarInteligencia(!!forcar);
        }
        if(!renderHomeIntegradaV502()){
            aguardarAnaliseHomeV502();
        }
    }catch(e){
        homeV502Status("Não foi possível carregar os indicadores: "+(e.message||e),"erro");
        homeV502Set("homeIntegradaAtualizacao","Falha na análise");
    }
}
function abrirListaHomeV502(chave){
    const a=(typeof intelAnalise!=="undefined")?intelAnalise:null;
    if(!a){
        homeV502Status("A análise ainda não está pronta. Atualize os indicadores.","erro");
        return;
    }
    if(typeof abrirListaIntel==="function"){
        abrirListaIntel(chave);
        return;
    }
    abrirInteligencia();
}
document.addEventListener("DOMContentLoaded",function(){
    setTimeout(function(){
        if(window.usuarioLogado)carregarHomeIntegradaV502(false);
    },500);
});
