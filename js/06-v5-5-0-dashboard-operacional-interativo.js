/* =========================================================
   V5.5.0 - DASHBOARD OPERACIONAL INTERATIVO
   ========================================================= */
let dashboardOperacionalIntervaloV55=null;

function renderDashboardOperacionalV55(){
    const a=typeof intelAnalise!=="undefined"?intelAnalise:null;
    if(!a)return;

    setIntel("opRack500",(a.rack500Abertas||[]).length);
    setIntel("opProntas",(a.prontasAbertas||[]).length);
    setIntel("opExpedidasHoje",(a.expHoje||[]).length);
    setIntel("opSemTecnico",(a.semTecnico||[]).length);

    const pendencias=[
        {tipo:"rack500Abertas",icone:"🔴",classe:"critica",total:(a.rack500Abertas||[]).length,
         titulo:"O.S. no Rack 500 ainda abertas",texto:"Itens que exigem acompanhamento operacional."},
        {tipo:"grupo1314Abertos",icone:"📦",classe:"",total:(a.grupo1314Abertos||[]).length,
         titulo:"Grupos 13 e 14 com O.S. abertas",texto:"O.S. abertas pertencentes aos grupos 13 e 14."},
        {tipo:"grupo52122Abertos",icone:"📦",classe:"",total:(a.grupo52122Abertos||[]).length,
         titulo:"Grupos 5, 21 e 22 com O.S. abertas",texto:"O.S. abertas pertencentes aos grupos 5, 21 e 22."},
        {tipo:"prontasAbertas",icone:"🟡",classe:"",total:(a.prontasAbertas||[]).length,
         titulo:"O.S. prontas aguardando expedição",texto:"Produtos prontos que ainda permanecem em aberto."},
        {tipo:"semTecnico",icone:"👨‍🔧",classe:"",total:(a.semTecnico||[]).length,
         titulo:"O.S. sem técnico responsável",texto:"Registros sem preenchimento no campo técnico."},
        {tipo:"semRack",icone:"📦",classe:"",total:(a.semRack||[]).length,
         titulo:"O.S. sem rack definido",texto:"Registros que precisam de localização física."},
        {tipo:"oficina20",icone:"🛠️",classe:"critica",total:(a.oficina20||[]).length,
         titulo:"O.S. em oficina há mais de 20 dias",texto:"Itens com permanência elevada em oficina."},
        {tipo:"cpp",icone:"📋",classe:"",total:(a.cpp||[]).length,
         titulo:"Pendências de CPP",texto:"CPP sem conclusão ou recebimento registrado."}
    ].filter(x=>x.total>0);

    const area=document.getElementById("pendenciasDashboardLista");
    if(area){
        if(!pendencias.length){
            area.innerHTML="<div class='pendencia-dashboard-item ok'><div class='icone'>✅</div><div><b>Nenhuma pendência crítica detectada</b><span>As regras operacionais atuais não encontraram itens que exijam ação.</span></div><strong>0</strong></div>";
        }else{
            area.innerHTML=pendencias.map(x=>
                "<div class='pendencia-dashboard-item "+x.classe+"' onclick=\"abrirListaIntel('"+x.tipo+"')\">"+
                "<div class='icone'>"+x.icone+"</div><div><b>"+escaparHTML(x.titulo)+"</b><span>"+escaparHTML(x.texto)+"</span></div><strong>"+x.total+"</strong></div>"
            ).join("");
        }
    }
    const hora=document.getElementById("pendenciasDashboardHora");
    if(hora)hora.textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

async function atualizarDashboardOperacional(forcar=false){
    const badge=document.getElementById("operacaoAtualizacaoAutomatica");
    try{
        if(badge)badge.textContent="Atualizando...";
        if(typeof carregarInteligencia==="function")await carregarInteligencia(!!forcar);
        renderDashboardOperacionalV55();
        if(badge)badge.textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    }catch(e){
        if(badge)badge.textContent="Falha na atualização";
        console.error("Dashboard operacional:",e);
    }
}

function iniciarAtualizacaoAutomaticaDashboardV55(){
    clearInterval(dashboardOperacionalIntervaloV55);
    dashboardOperacionalIntervaloV55=setInterval(()=>{
        const tela=document.getElementById("telaAdmin");
        if(tela&&getComputedStyle(tela).display!=="none")atualizarDashboardOperacional(true);
    },300000);
}

function abrirListaDashboardV55(tipo){
    if(!intelAnalise)return alert("A análise operacional ainda está carregando.");
    if(tipo==="todas"){
        document.getElementById("intelModalTitulo").textContent="Todas as O.S. ("+intelRegistros.length+")";
        document.getElementById("intelModalConteudo").innerHTML="<div class='intel-list'>"+intelRegistros.slice(0,1000).map(r=>"<div class='intel-row'><b>"+escaparHTML(r.os||"-")+"</b><span>"+escaparHTML(r.desc_produto||"")+"<br><small>"+escaparHTML(r.status||r.status_da_os||"")+"</small></span><span>"+escaparHTML(r.tecnico||"Sem técnico")+"</span><button onclick=\"abrirOSIntel('"+String(r.os||"").replace(/'/g,"\\'")+"')\">Abrir</button></div>").join("")+"</div>";
        document.getElementById("intelModal").style.display="flex";
    }
}

function abrirRankingDashboardV55(tipo){
    if(!intelAnalise)return alert("A análise operacional ainda está carregando.");
    const mapa={pdv:{titulo:"O.S. por PDV",lista:intelAnalise.pdvs},tecnico:{titulo:"O.S. por Técnico",lista:intelAnalise.tecnicos},status:{titulo:"O.S. por Status",lista:intelAnalise.status}};
    const item=mapa[tipo];if(!item)return;
    document.getElementById("intelModalTitulo").textContent=item.titulo;
    document.getElementById("intelModalConteudo").innerHTML="<div class='dashboard-card'>"+renderTabelaResumo(item.lista,1000)+"</div>";
    document.getElementById("intelModal").style.display="flex";
}

document.addEventListener("DOMContentLoaded",iniciarAtualizacaoAutomaticaDashboardV55);
