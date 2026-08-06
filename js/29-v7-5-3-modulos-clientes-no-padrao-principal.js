/* V7.5.3 - MÓDULOS CLIENTES NO PADRÃO PRINCIPAL */
(function(){
const telasCliNovas=["telaClientesColetaPrincipal","telaClientesHistoricoColetaPrincipal","telaClientesCIRegiao","telaClientesInteligenciaPrincipal"];
function esconderCliNovas(){telasCliNovas.forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="none"})}
function esconderTodasParaCli(){if(typeof esconderTelas==="function")esconderTelas();esconderCliNovas();}
const abrirClientesOriginal=window.abrirClientes;
window.abrirClientes=function(){esconderCliNovas();if(typeof abrirClientesOriginal==="function")abrirClientesOriginal();const t=document.getElementById("telaClientes");if(t)t.style.display="block";setTimeout(()=>{document.getElementById("clientesFuncoesCards")?.scrollIntoView({behavior:"smooth",block:"start"});if(typeof renderConsultasSalvasClientes==="function")renderConsultasSalvasClientes();},40)};
window.abrirDashboardClientesModulo=function(){window.abrirClientes();setTimeout(()=>document.getElementById("clientesMensagem")?.scrollIntoView({behavior:"smooth",block:"start"}),80)};
window.abrirConsultaClientesModulo=function(){window.abrirClientes();setTimeout(()=>document.getElementById("cliContagemTabela")?.scrollIntoView({behavior:"smooth",block:"start"}),80)};
function abrirTelaCliNova(id){esconderTodasParaCli();const t=document.getElementById(id);if(t)t.style.display="block";window.scrollTo({top:0,behavior:"smooth"})}
window.garantirDadosClientes=async function(){if(!Array.isArray(window.clientesDadosCombinados)||!window.clientesDadosCombinados.length){await carregarDashboardClientes(false)};return window.clientesDadosCombinados||[]}
function osNorm(v){return String(v??"").trim().toUpperCase().replace(/^ILR\s*/,"").replace(/\.0$/,"").replace(/\s+/g,"")}
function money(v){let n=Number(String(v??"").replace(/\./g,"").replace(",","."));return Number.isFinite(n)?n:0}
function cub(v){let n=Number(String(v??"").replace(",","."));return Number.isFinite(n)?n:0}
function esc(v){return typeof escaparHTML==="function"?escaparHTML(String(v??"")):String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
let coletaCli=[];
window.abrirColetaClientesPrincipal=async function(){abrirTelaCliNova("telaClientesColetaPrincipal");await window.garantirDadosClientes();const salvo=localStorage.getItem("CLIENTES_COLETA_RASCUNHO_V753");if(salvo&&!coletaCli.length){try{coletaCli=JSON.parse(salvo)||[]}catch(_){}}renderColetaCli();setTimeout(()=>document.getElementById("cliColetaOSInput")?.focus(),60)};
window.adicionarOSColetaClientesPrincipal=function(){const inp=document.getElementById("cliColetaOSInput");const os=osNorm(inp?.value);if(!os)return;const r=(window.clientesDadosCombinados||[]).find(x=>osNorm(x.os)===os);const msg=document.getElementById("cliColetaMensagemPrincipal");if(!r){msg.textContent="O.S. não encontrada na Base de Clientes.";msg.style.color="#b00020";return}if(coletaCli.some(x=>osNorm(x.os)===os)){msg.textContent="Esta O.S. já está na coleta.";msg.style.color="#b36b00";return}coletaCli.push({...r});inp.value="";msg.textContent="O.S. adicionada com sucesso.";msg.style.color="#0b7a2a";renderColetaCli();inp.focus()};
window.removerOSColetaClientesPrincipal=function(os){coletaCli=coletaCli.filter(x=>osNorm(x.os)!==osNorm(os));renderColetaCli()};
function renderColetaCli(){const tb=document.getElementById("cliColetaTabelaCorpoPrincipal");if(!tb)return;document.getElementById("cliColetaQtdPrincipal").textContent=coletaCli.length;document.getElementById("cliColetaValorPrincipal").textContent=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(coletaCli.reduce((a,r)=>a+money(r.valor_transf||r.valor),0));document.getElementById("cliColetaCubagemPrincipal").textContent=coletaCli.reduce((a,r)=>a+cub(r.cubagem),0).toLocaleString("pt-BR");if(!coletaCli.length){tb.innerHTML='<tr><td colspan="18" class="clientes-vazio">Nenhuma O.S. adicionada.</td></tr>';return}const destino=esc(document.getElementById("cliColetaDestinoPrincipal")?.value||"");tb.innerHTML=coletaCli.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.os)}</b></td><td>${esc(r.dt_geracao||"")}</td><td>${destino}</td><td>${esc(r.pdv||"")}</td><td>${esc(r.alm||"")}</td><td>${esc(r.grupo||"")}</td><td>${esc(r.nce||"")}</td><td>${esc(r.desc_produto||"")}</td><td>${esc(r.cod_cor||r.codigo_cor||"")}</td><td>${esc(r.cor||"")}</td><td>${esc(r.n_serie||"")}</td><td>${esc(r.rack||"")}</td><td>${esc(r.status||r.status_da_os||"")}</td><td>${esc(r.nome_cliente||"Não identificado")}</td><td>${esc(r.valor_transf||r.valor||"")}</td><td>${esc(r.cubagem||"")}</td><td><button class="usuario-acao danger" onclick="removerOSColetaClientesPrincipal('${esc(r.os)}')">Excluir</button></td></tr>`).join("")};
window.salvarRascunhoColetaClientes=function(){localStorage.setItem("CLIENTES_COLETA_RASCUNHO_V753",JSON.stringify(coletaCli));const m=document.getElementById("cliColetaMensagemPrincipal");m.textContent="Rascunho salvo neste computador.";m.style.color="#0b7a2a"};
window.limparColetaClientesPrincipal=function(){if(coletaCli.length&&!confirm("Limpar toda a coleta atual?"))return;coletaCli=[];localStorage.removeItem("CLIENTES_COLETA_RASCUNHO_V753");renderColetaCli()};
window.finalizarColetaClientesPrincipal=async function(){if(!coletaCli.length){alert("Adicione pelo menos uma O.S.");return}const destino=String(document.getElementById("cliColetaDestinoPrincipal")?.value||"").trim();const lote="CLI-"+Date.now();const usuario=window.usuarioLogado?.nome||window.usuarioLogado?.email||"";const rows=coletaCli.map(r=>({lote_id:lote,os:osNorm(r.os),nome_cliente:r.nome_cliente||"",pdv:r.pdv||"",grupo:r.grupo||"",produto:r.desc_produto||"",destino,usuario}));const m=document.getElementById("cliColetaMensagemPrincipal");try{m.textContent="Finalizando coleta...";const {error}=await obterSupabaseClientes().from("coletas_clientes").insert(rows);if(error)throw error;m.textContent=`Coleta ${lote} finalizada com ${rows.length} O.S.`;m.style.color="#0b7a2a";coletaCli=[];localStorage.removeItem("CLIENTES_COLETA_RASCUNHO_V753");renderColetaCli()}catch(e){m.textContent="Erro ao finalizar: "+(e.message||e)+". Confirme a tabela coletas_clientes.";m.style.color="#b00020"}};
window.abrirHistoricoColetaClientesPrincipal=function(){abrirTelaCliNova("telaClientesHistoricoColetaPrincipal");carregarHistoricoColetaClientesPrincipal()};
window.carregarHistoricoColetaClientesPrincipal=async function(){const a=document.getElementById("cliHistoricoColetaPrincipal");a.innerHTML='<div class="dashboard-loading">Carregando...</div>';try{const {data,error}=await obterSupabaseClientes().from("coletas_clientes").select("*").order("criado_em",{ascending:false}).limit(3000);if(error)throw error;const rows=data||[];if(!rows.length){a.innerHTML='<div class="clientes-vazio">Nenhuma coleta registrada.</div>';return}a.innerHTML='<table class="historico-tabela"><thead><tr><th>Data</th><th>Lote</th><th>O.S.</th><th>Cliente</th><th>PDV</th><th>Grupo</th><th>Produto</th><th>Destino</th><th>Usuário</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${esc(new Date(r.criado_em).toLocaleString("pt-BR"))}</td><td>${esc(r.lote_id)}</td><td>${esc(r.os)}</td><td>${esc(r.nome_cliente)}</td><td>${esc(r.pdv)}</td><td>${esc(r.grupo)}</td><td>${esc(r.produto)}</td><td>${esc(r.destino)}</td><td>${esc(r.usuario)}</td></tr>`).join("")+'</tbody></table>'}catch(e){a.innerHTML='<div class="dashboard-erro">Erro: '+esc(e.message||e)+'</div>'}};
let ciLinhas=[];
window.abrirCIRegiaoClientes=async function(){
    ciAtual = "regiao_clientes";
    esconderTelas();
    definirMenuAtivo("clientes");

    document.getElementById("tituloCIEditavel").innerHTML = "C.I REGIÃO — CLIENTES";
    aplicarModeloCIVisual();
    montarGradeCIEditavel();

    document.getElementById("telaPlanilhaCI").style.display = "block";
    document.getElementById("sidebar").classList.remove("mobile-open");
    document.getElementById("ciEditMensagem").innerHTML =
        "Digite a O.S na coluna O.S. Os dados serão puxados de REXPEDLR Clientes e o nome do cliente do RATEC04.";

    document.querySelectorAll("#telaPlanilhaCI .ci-edit-actions .btn-voltar").forEach(function(btn){
        if((btn.textContent || "").trim() === "Voltar para C.I"){
            btn.onclick = function(){ abrirClientes(); };
            btn.textContent = "Voltar para CLIENTES";
        }
        if((btn.textContent || "").trim() === "Página inicial"){
            btn.onclick = function(){ abrirClientes(); };
            btn.textContent = "Área de Clientes";
        }
    });

    try{
        await window.garantirDadosClientes();
        document.getElementById("ciEditMensagem").innerHTML =
            "Base de Clientes carregada. Digite a O.S. na coluna O.S. e pressione Enter. Arraste as divisórias do cabeçalho para ajustar as larguras.";
    }catch(e){
        document.getElementById("ciEditMensagem").innerHTML = "Erro ao carregar Base de Clientes: " + (e.message || e);
    }
};

window.carregarInteligenciaClientesPrincipal=async function(forcar){const m=document.getElementById("cliIntelMensagem");m.className="dashboard-loading";m.textContent="Analisando Base de Clientes...";try{await window.garantirDadosClientes();const d=window.clientesDadosCombinados||[];const semTec=d.filter(r=>!String(r.tecnico||"").trim());const semCli=d.filter(r=>!String(r.nome_cliente||"").trim());const prontas=d.filter(r=>/PRONT|CONSERT|CONCLU|FINALIZ/i.test(String(r.status||r.status_da_os||"")));document.getElementById("cliIntelTotal").textContent=d.length;document.getElementById("cliIntelSemTecnico").textContent=semTec.length;document.getElementById("cliIntelSemCliente").textContent=semCli.length;document.getElementById("cliIntelProntas").textContent=prontas.length;document.getElementById("cliIntelPendencias").innerHTML=[[`O.S. sem técnico`,semTec.length,`Registros que ainda precisam de responsável.`],[`O.S. sem cliente`,semCli.length,`Sem correspondência na tabela RATEC04.`],[`O.S. prontas`,prontas.length,`Possivelmente aguardando coleta ou expedição.`]].map(x=>`<div class="cli-pendencia"><b>${esc(x[0])}: ${x[1]}</b><span>${esc(x[2])}</span></div>`).join("");const mapa={};d.forEach(r=>{const k=String(r.tecnico||"Sem técnico").trim()||"Sem técnico";mapa[k]=(mapa[k]||0)+1});const rank=Object.entries(mapa).sort((a,b)=>b[1]-a[1]).slice(0,12);const max=rank[0]?.[1]||1;document.getElementById("cliIntelTecnicos").innerHTML=rank.map(([k,v])=>`<div class="cli-intel-bar"><span>${esc(k)}</span><div class="cli-intel-track"><div class="cli-intel-fill" style="width:${Math.round(v/max*100)}%"></div></div><b>${v}</b></div>`).join("");m.className="dashboard-ok";m.textContent=`Análise concluída sobre ${d.length} O.S.`}catch(e){m.className="dashboard-erro";m.textContent="Erro: "+(e.message||e)}};
})();
