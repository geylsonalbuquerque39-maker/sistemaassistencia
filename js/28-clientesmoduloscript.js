/* =========================
   VERSÃO 7.4.0 - BASE CLIENTES
========================= */
const SUPABASE_CLIENTES_URL = "https://hfzbcivskqvrnzimcfvm.supabase.co";
const SUPABASE_CLIENTES_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmemJjaXZza3F2cm56aW1jZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzE3MDMsImV4cCI6MjEwMTQ0NzcwM30.dxyQDhvxd9N4X5f44XK29-fRxulJACJfUvwNROM_U3E";
let supabaseClientesCache = null;
let clientesRexpedlrPreview = [];
let clientesRatec04Preview = [];
let clientesDadosCombinados = [];
let clientesCharts = {};

function obterSupabaseClientes(){
    if(!window.supabase) throw new Error("Biblioteca do Supabase não carregou. Verifique a internet.");
    if(!supabaseClientesCache){
        supabaseClientesCache = window.supabase.createClient(SUPABASE_CLIENTES_URL, SUPABASE_CLIENTES_ANON_KEY, {
            auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
        });
    }
    return supabaseClientesCache;
}
function abrirClientes(){
    esconderTelas();
    definirMenuAtivo("clientes");
    const tela=document.getElementById("telaClientes");
    if(tela) tela.style.display="block";
    const sidebar=document.getElementById("sidebar"); if(sidebar) sidebar.classList.remove("mobile-open");
    carregarDashboardClientes(false);
}
function alternarImportadoresClientes(){
    const el=document.getElementById("clientesImportadores");
    if(el) el.style.display=el.style.display==="none"?"block":"none";
}
function arquivoClientesSelecionado(tipo,input){
    const ehRexpedlr=tipo==="rexpedlr";
    if(ehRexpedlr) clientesRexpedlrPreview=[]; else clientesRatec04Preview=[];
    const msg=document.getElementById(ehRexpedlr?"msgImportRexpedlrClientes":"msgImportRatec04Clientes");
    const preview=document.getElementById(ehRexpedlr?"previewRexpedlrClientes":"previewRatec04Clientes");
    if(preview){preview.innerHTML="";preview.style.display="none";}
    if(msg){
      msg.className="clientes-status";
      msg.textContent=input?.files?.[0]?`Arquivo selecionado: ${input.files[0].name}`:"Selecione um arquivo.";
    }
}
function normalizarOSClientes(v){
    return String(v??"").trim().toUpperCase().replace(/^ILR\s*/i,"").replace(/\.0+$/,"").replace(/[^0-9A-Z]/g,"");
}
function normalizarCabecalhoClientes(v){
    return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[.\-_/]+/g," ").replace(/\s+/g," ").trim();
}
function valorTextoCliente(v){
    if(v===null||v===undefined) return "";
    if(v instanceof Date) return v.toLocaleDateString("pt-BR");
    return String(v).trim();
}
async function lerPlanilhaClientes(file, headerMode){
    if(!file) throw new Error("Selecione um arquivo.");
    if(!window.XLSX) throw new Error("Biblioteca de planilhas não carregou. Verifique a internet/CDN.");
    const buffer=await file.arrayBuffer();
    const wb=XLSX.read(buffer,{type:"array",cellDates:false,raw:false});
    const ws=wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws,{header:headerMode===false?1:1,defval:"",raw:false,blankrows:false});
}
const CAMPOS_REXPEDLR_CLIENTES = {
    os:["os","o s"],dt_geracao:["dt geracao","data geracao"],pdv:["pdv"],nf:["nf"],alm:["alm"],grupo:["grupo"],nce:["nce"],desc_produto:["desc produto","descricao produto"],cor:["cor"],n_serie:["n serie","numero serie"],valor_transf:["valor transf"],tecnico:["tecnico"],rack:["rack"],status:["status"],usuario:["usuario"],depreciacao_percentual:["depreciacao","depreciacao percentual"],obs_expedicao:["obs expedicao"],dt_expedicao:["dt expedicao"],pdv_expedicao:["pdv expedicao"],feirao:["feirao"],analise_defeito:["analise do defeito","analise defeito"],dt_conserto:["dt conserto"],obs_status:["obs status"],obs_ordem_servico:["obs ordem de servico","observacao ordem servico"],solicitante_cpp:["solicitante cpp"],data_cpp:["data cpp"],nr_cpp:["nr cpp"],sit_cpp:["sit cpp"],obs_cpp:["obs cpp"],recebedor_cpp:["recebedor cpp"],data_recebedor:["data recebedor"],dt_ult_entrada:["dt ult entrada"],dt_saida_oficina:["dt saida oficina"],dt_recb_at:["dt recb at"],status_da_os:["status da os"],tipo_garantia:["tipo garantia"]
};
function localizarCabecalhoRexpedlrClientes(linhas){
    for(let l=0;l<Math.min(linhas.length,30);l++){
        const norm=linhas[l].map(normalizarCabecalhoClientes); const indices={};
        Object.entries(CAMPOS_REXPEDLR_CLIENTES).forEach(([campo,aliases])=>{indices[campo]=norm.findIndex(x=>aliases.includes(x));});
        if(indices.os>=0 && (indices.status>=0 || indices.status_da_os>=0) && indices.pdv>=0) return {linha:l,indices};
    }
    throw new Error("Cabeçalho do REXPEDLR não identificado. Confirme as colunas O.S., PDV e STATUS.");
}
function mapearRexpedlrClientes(linha,indices){
    const obj={};
    Object.keys(CAMPOS_REXPEDLR_CLIENTES).forEach(c=>obj[c]=indices[c]>=0?valorTextoCliente(linha[indices[c]]):"");
    obj.os=normalizarOSClientes(obj.os);
    return obj;
}
function deduplicarPorOS(lista){
    const mapa=new Map(); let duplicadas=0;
    lista.forEach(r=>{const os=normalizarOSClientes(r.os);if(!os)return;if(mapa.has(os))duplicadas++;r.os=os;mapa.set(os,r);});
    return {registros:[...mapa.values()],duplicadas};
}
function renderPreviewClientes(id,registros,colunas){
    const area=document.getElementById(id); if(!area)return;
    const dados=registros.slice(0,20);
    if(!dados.length){area.style.display="none";return;}
    let html="<table><thead><tr>"+colunas.map(c=>"<th>"+escaparHTML(c[0])+"</th>").join("")+"</tr></thead><tbody>";
    dados.forEach(r=>{html+="<tr>"+colunas.map(c=>"<td>"+escaparHTML(r[c[1]]??"")+"</td>").join("")+"</tr>";});
    area.innerHTML=html+"</tbody></table>"; area.style.display="block";
}
async function preVisualizarRexpedlrClientes(){
    const msg=document.getElementById("msgImportRexpedlrClientes");
    try{
        msg.className="clientes-status";msg.textContent="Lendo planilha...";
        const file=document.getElementById("arquivoRexpedlrClientes").files[0];
        const linhas=await lerPlanilhaClientes(file,true); const cab=localizarCabecalhoRexpedlrClientes(linhas);
        const lista=linhas.slice(cab.linha+1).map(l=>mapearRexpedlrClientes(l,cab.indices)).filter(r=>r.os);
        const dedup=deduplicarPorOS(lista); clientesRexpedlrPreview=dedup.registros;
        renderPreviewClientes("previewRexpedlrClientes",clientesRexpedlrPreview,[["O.S.","os"],["PDV","pdv"],["Status","status"],["Técnico","tecnico"],["Produto","desc_produto"]]);
        msg.className="clientes-status ok";msg.textContent=`${clientesRexpedlrPreview.length} O.S. únicas prontas. ${dedup.duplicadas} duplicata(s) removida(s).`;
    }catch(e){clientesRexpedlrPreview=[];msg.className="clientes-status erro";msg.textContent="Erro: "+(e.message||e);}
}
async function preVisualizarRatec04Clientes(){
    const msg=document.getElementById("msgImportRatec04Clientes");
    try{
        msg.className="clientes-status";msg.textContent="Lendo RATEC04...";
        const file=document.getElementById("arquivoRatec04Clientes").files[0];
        const linhas=await lerPlanilhaClientes(file,false);
        const lista=linhas.map(l=>({os:normalizarOSClientes(l[0]),nome_cliente:valorTextoCliente(l[2])})).filter(r=>r.os&&r.nome_cliente);
        const dedup=deduplicarPorOS(lista); clientesRatec04Preview=dedup.registros;
        renderPreviewClientes("previewRatec04Clientes",clientesRatec04Preview,[["O.S.","os"],["Nome do cliente","nome_cliente"]]);
        msg.className="clientes-status ok";msg.textContent=`${clientesRatec04Preview.length} O.S. com cliente prontas. ${dedup.duplicadas} duplicata(s) removida(s).`;
    }catch(e){clientesRatec04Preview=[];msg.className="clientes-status erro";msg.textContent="Erro: "+(e.message||e);}
}
const COLUNAS_REXPEDLR_CLIENTES_PERMITIDAS = new Set([
    "os","dt_geracao","pdv","nf","alm","grupo","nce","desc_produto","cor","n_serie",
    "valor_transf","tecnico","rack","status","usuario","depreciacao_percentual",
    "obs_expedicao","dt_expedicao","pdv_expedicao","feirao","analise_defeito",
    "dt_conserto","obs_status","obs_ordem_servico","solicitante_cpp","data_cpp",
    "nr_cpp","sit_cpp","obs_cpp","recebedor_cpp","data_recebedor","dt_ult_entrada",
    "dt_saida_oficina","dt_recb_at","status_da_os","tipo_garantia"
]);
function sanitizarRegistroRexpedlrClientes(registro){
    const limpo={};
    Object.entries(registro||{}).forEach(([chave,valor])=>{
        if(COLUNAS_REXPEDLR_CLIENTES_PERMITIDAS.has(chave)) limpo[chave]=valor;
    });
    return limpo;
}
async function upsertEmLotesClientes(tabela,registros,tamanho=400){
    const supa=obterSupabaseClientes();
    if(tabela==="rexpedlr_clientes") registros=registros.map(sanitizarRegistroRexpedlrClientes);
    for(let i=0;i<registros.length;i+=tamanho){
        const lote=registros.slice(i,i+tamanho);
        const {error}=await supa.from(tabela).upsert(lote,{onConflict:"os"});
        if(error) throw error;
    }
}
async function importarRexpedlrClientes(){
    const msg=document.getElementById("msgImportRexpedlrClientes");
    try{
        if(!clientesRexpedlrPreview.length) await preVisualizarRexpedlrClientes();
        if(!clientesRexpedlrPreview.length) throw new Error("Nenhum registro válido.");
        if(!confirm(`Importar/atualizar ${clientesRexpedlrPreview.length} O.S. no banco de clientes?`)) return;
        msg.className="clientes-status";msg.textContent="Enviando registros em lotes...";
        await upsertEmLotesClientes("rexpedlr_clientes",clientesRexpedlrPreview);
        localStorage.setItem("CLIENTES_ULTIMA_IMPORTACAO_REXPEDLR",new Date().toLocaleString("pt-BR"));
        msg.className="clientes-status ok";msg.textContent=`Importação concluída: ${clientesRexpedlrPreview.length} O.S. inseridas ou atualizadas.`;
        await carregarDashboardClientes(true);
    }catch(e){msg.className="clientes-status erro";msg.textContent="Erro na importação: "+(e.message||e);}
}
async function importarRatec04Clientes(){
    const msg=document.getElementById("msgImportRatec04Clientes");
    try{
        if(!clientesRatec04Preview.length) await preVisualizarRatec04Clientes();
        if(!clientesRatec04Preview.length) throw new Error("Nenhum registro válido.");
        if(!confirm(`Importar/atualizar ${clientesRatec04Preview.length} nomes de clientes?`)) return;
        msg.className="clientes-status";msg.textContent="Enviando registros em lotes...";
        await upsertEmLotesClientes("ratec04_clientes",clientesRatec04Preview);
        localStorage.setItem("CLIENTES_ULTIMA_IMPORTACAO_RATEC04",new Date().toLocaleString("pt-BR"));
        msg.className="clientes-status ok";msg.textContent=`RATEC04 concluído: ${clientesRatec04Preview.length} nomes inseridos ou atualizados.`;
        await carregarDashboardClientes(true);
    }catch(e){msg.className="clientes-status erro";msg.textContent="Erro na importação: "+(e.message||e);}
}
async function carregarTabelaCompletaClientes(tabela,campos="*"){
    const supa=obterSupabaseClientes(),todos=[]; let ini=0; const lote=1000;
    while(true){
        const {data,error}=await supa.from(tabela).select(campos).range(ini,ini+lote-1);
        if(error) throw error; const pag=data||[]; todos.push(...pag); if(pag.length<lote)break; ini+=lote;if(ini>=200000)break;
    }
    return todos;
}
function destruirChartClientes(id){if(clientesCharts[id]){clientesCharts[id].destroy();delete clientesCharts[id];}}
function criarChartClientes(id,tipo,pares){
    const el=document.getElementById(id);if(!el||!window.Chart)return;destruirChartClientes(id);
    const p=(pares||[]).slice(0,12);clientesCharts[id]=new Chart(el,{type:tipo,data:{labels:p.map(x=>x[0]),datasets:[{label:"O.S.",data:p.map(x=>x[1])}]},options:{responsive:true,plugins:{legend:{display:tipo!=="bar"}},scales:tipo==="bar"?{y:{beginAtZero:true}}:{}}});
}
function preencherSelectClientes(id,valores){
    const el=document.getElementById(id);if(!el)return;const atual=el.value;el.innerHTML='<option value="">Todos</option>'+valores.filter(v=>v&&v!=="(vazio)").map(v=>`<option value="${escaparHTML(v)}">${escaparHTML(v)}</option>`).join("");el.value=atual;
}
async function carregarDashboardClientes(forcar){
    const msg=document.getElementById("clientesMensagem");if(!msg)return;
    msg.className="dashboard-loading";msg.textContent="Carregando REXPEDLR Clientes e RATEC04...";
    try{
        const [rex,ratec]=await Promise.all([
            carregarTabelaCompletaClientes("rexpedlr_clientes","*"),
            carregarTabelaCompletaClientes("ratec04_clientes","os,nome_cliente")
        ]);
        const nomes=new Map(ratec.map(r=>[normalizarOSClientes(r.os),r.nome_cliente]));
        clientesDadosCombinados=rex.map(r=>({...r,nome_cliente:nomes.get(normalizarOSClientes(r.os))||"",categoria:classificarCategoriaProduto(r.desc_produto,r.grupo)}));
        window.clientesDadosCombinados=clientesDadosCombinados;
        const identificados=clientesDadosCombinados.filter(r=>String(r.nome_cliente||"").trim()).length;
        setDash("cliTotalOS",clientesDadosCombinados.length);setDash("cliTotalIdentificados",identificados);setDash("cliSemNome",clientesDadosCombinados.length-identificados);setDash("cliBancoStatus","🟢 Online");
        const porStatus=contarPorCampo(clientesDadosCombinados,"status");const porTec=contarPorCampo(clientesDadosCombinados,"tecnico");const porPDV=contarPorCampo(clientesDadosCombinados,"pdv");
        criarChartClientes("cliGraficoStatus","doughnut",porStatus);criarChartClientes("cliGraficoTecnicos","bar",porTec);criarChartClientes("cliGraficoPDV","bar",porPDV);criarChartClientes("cliGraficoIdentificacao","doughnut",[["Identificados",identificados],["Sem nome",clientesDadosCombinados.length-identificados]]);
        document.getElementById("cliTabelaStatus").innerHTML=renderTabelaResumo(porStatus,12);document.getElementById("cliTabelaTecnicos").innerHTML=renderTabelaResumo(porTec,12);document.getElementById("cliTabelaPDV").innerHTML=renderTabelaResumo(porPDV,12);
        document.getElementById("cliResumoIntegracao").innerHTML=`<b>${identificados}</b> O.S. encontraram nome no RATEC04 e <b>${clientesDadosCombinados.length-identificados}</b> ainda estão sem identificação.<br>Último REXPEDLR: ${escaparHTML(localStorage.getItem("CLIENTES_ULTIMA_IMPORTACAO_REXPEDLR")||"--")}<br>Último RATEC04: ${escaparHTML(localStorage.getItem("CLIENTES_ULTIMA_IMPORTACAO_RATEC04")||"--")}`;
        preencherSelectClientes("cliFiltroStatus",porStatus.map(x=>x[0]));
        preencherSelectClientes("cliFiltroTecnico",porTec.map(x=>x[0]));
        preencherSelectClientes("cliFiltroRack",[...new Set(clientesDadosCombinados.map(r=>String(r.rack??"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true})));
        preencherSelectClientes("cliFiltroSituacao",[...new Set(clientesDadosCombinados.map(r=>String(r.status_da_os??"").trim()).filter(Boolean))].sort());
        preencherSelectClientes("cliFiltroGarantia",[...new Set(clientesDadosCombinados.map(r=>String(r.tipo_garantia??"").trim()).filter(Boolean))].sort());
        filtrarTabelaClientes();msg.className="dashboard-ok";msg.textContent=`Dashboard atualizado: ${clientesDadosCombinados.length} O.S. e ${ratec.length} registros no RATEC04.`;
    }catch(e){setDash("cliBancoStatus","🔴 Erro");msg.className="dashboard-erro";msg.textContent="Erro ao carregar Base de Clientes: "+(e.message||e)+". Confirme as tabelas e as políticas RLS no terceiro Supabase.";}
}
let clientesPesquisaAtual=[];
function normalizarPesquisaClientes(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim()}
function contemPesquisaClientes(valor,filtro){const f=normalizarPesquisaClientes(filtro);return !f||normalizarPesquisaClientes(valor).includes(f)}
function filtrarTabelaClientes(){
    const valor=id=>document.getElementById(id)?.value||"";
    const filtros={geral:valor("cliBusca"),nome:valor("cliFiltroNome"),os:valor("cliFiltroOS"),serie:valor("cliFiltroSerie"),nf:valor("cliFiltroNF"),produto:valor("cliFiltroProduto"),grupo:valor("cliFiltroGrupo"),nce:valor("cliFiltroNCE"),status:valor("cliFiltroStatus"),tecnico:valor("cliFiltroTecnico"),pdv:valor("cliFiltroPDV"),rack:valor("cliFiltroRack"),situacao:valor("cliFiltroSituacao"),garantia:valor("cliFiltroGarantia"),categoria:valor("cliFiltroCategoria")};
    const base=Array.isArray(clientesDadosCombinados)?clientesDadosCombinados:[];
    const lista=base.filter(r=>{
        const categoria=r.categoria||classificarCategoriaProduto(r.desc_produto,r.grupo);
        const geral=[r.os,r.nome_cliente,r.n_serie,r.nf,r.desc_produto,r.tecnico,r.pdv,r.status,r.nce,r.grupo,r.rack,r.status_da_os,r.tipo_garantia].join(" ");
        return contemPesquisaClientes(geral,filtros.geral)
          && contemPesquisaClientes(r.nome_cliente,filtros.nome)
          && contemPesquisaClientes(r.os,filtros.os)
          && contemPesquisaClientes(r.n_serie,filtros.serie)
          && contemPesquisaClientes(r.nf,filtros.nf)
          && contemPesquisaClientes(r.desc_produto,filtros.produto)
          && contemPesquisaClientes(r.grupo,filtros.grupo)
          && contemPesquisaClientes(r.nce,filtros.nce)
          && (!filtros.status||String(r.status||"")===filtros.status)
          && (!filtros.tecnico||String(r.tecnico||"")===filtros.tecnico)
          && (!filtros.pdv||String(r.pdv||"")===filtros.pdv)
          && contemPesquisaClientes(r.rack,filtros.rack)
          && contemPesquisaClientes(r.status_da_os,filtros.situacao)
          && contemPesquisaClientes(r.tipo_garantia,filtros.garantia)
          && (!filtros.categoria||categoria===filtros.categoria);
    });
    clientesPesquisaAtual=lista;window.clientesPesquisaAtual=lista;
    renderTabelaPrincipalClientes(lista);const c=document.getElementById("cliContagemTabela");if(c)c.textContent=`Exibindo ${lista.length} de ${base.length} O.S.`;
}
function renderTabelaPrincipalClientes(lista){
    const area=document.getElementById("cliTabelaPrincipal");if(!area)return;if(!lista.length){area.innerHTML='<div class="clientes-vazio">Nenhuma O.S. encontrada.</div>';return;}
    let h='<table class="clientes-table"><thead><tr><th>O.S.</th><th>Cliente</th><th>PDV</th><th>Grupo</th><th>Produto</th><th>Categoria</th><th>Status</th><th>Status da O.S.</th><th>Técnico</th><th>Rack</th><th>Data geração</th></tr></thead><tbody>';
    lista.slice(0,5000).forEach(r=>{h+=`<tr><td><b>${escaparHTML(r.os||"")}</b></td><td>${escaparHTML(r.nome_cliente||"Não identificado")}</td><td>${escaparHTML(r.pdv||"")}</td><td>${escaparHTML(r.grupo||"")}</td><td>${escaparHTML(r.desc_produto||"")}</td><td>${escaparHTML(r.categoria||classificarCategoriaProduto(r.desc_produto,r.grupo))}</td><td>${escaparHTML(r.status||"")}</td><td>${escaparHTML(r.status_da_os||"")}</td><td>${escaparHTML(r.tecnico||"")}</td><td>${escaparHTML(r.rack||"")}</td><td>${escaparHTML(r.dt_geracao||"")}</td></tr>`;});
    area.innerHTML=h+'</tbody></table>';
}
function limparFiltrosClientes(){["cliBusca","cliFiltroNome","cliFiltroOS","cliFiltroSerie","cliFiltroNF","cliFiltroProduto","cliFiltroGrupo","cliFiltroNCE","cliFiltroStatus","cliFiltroTecnico","cliFiltroPDV","cliFiltroRack","cliFiltroSituacao","cliFiltroGarantia","cliFiltroCategoria"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});filtrarTabelaClientes();}
function exportarPesquisaClientes(){
    const lista=Array.isArray(clientesPesquisaAtual)?clientesPesquisaAtual:[];
    if(!lista.length){alert("Não há resultados para exportar.");return}
    const formato=(prompt("Formato do arquivo: CSV, XLS ou XLT","CSV")||"CSV").trim().toUpperCase();
    if(!["CSV","XLS","XLT"].includes(formato)){alert("Formato inválido. Use CSV, XLS ou XLT.");return}
    const cab=["O.S.","GR","N.C.E","PRODUTO","CLIENTE","CATEGORIA","Nº SÉRIE","NF","TÉCNICO","PDV","RACK","STATUS","SITUAÇÃO O.S.","TIPO GARANTIA"];
    const linhas=lista.map(r=>[r.os,r.grupo,r.nce,r.desc_produto,r.nome_cliente,r.categoria||classificarCategoriaProduto(r.desc_produto,r.grupo),r.n_serie,r.nf,r.tecnico,r.pdv,r.rack,r.status,r.status_da_os,r.tipo_garantia]);
    const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    if(formato==='CSV'){const txt='\uFEFF'+[cab,...linhas].map(l=>l.map(esc).join(';')).join('\r\n');const b=new Blob([txt],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='pesquisa_clientes_'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(u);return}
    if(typeof XLSX==='undefined'){alert('Biblioteca XLSX não carregada.');return}
    const ws=XLSX.utils.aoa_to_sheet([cab,...linhas]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Clientes');XLSX.writeFile(wb,'pesquisa_clientes_'+new Date().toISOString().slice(0,10)+(formato==='XLT'?'.xlt':'.xls'),{bookType:'biff8'});
}
window.exportarPesquisaClientes=exportarPesquisaClientes;

function obterFiltrosConsultaClientes(){
    const valor=id=>document.getElementById(id)?.value||"";
    return {
        busca:valor("cliBusca"),nome:valor("cliFiltroNome"),rack:valor("cliFiltroRack"),
        situacao:valor("cliFiltroSituacao"),status:valor("cliFiltroStatus"),
        tecnico:valor("cliFiltroTecnico"),garantia:valor("cliFiltroGarantia"),
        categoria:valor("cliFiltroCategoria")
    };
}
function aplicarFiltrosSalvosClientes(f){
    Object.entries({cliBusca:f.busca,cliFiltroNome:f.nome,cliFiltroRack:f.rack,cliFiltroSituacao:f.situacao,cliFiltroStatus:f.status,cliFiltroTecnico:f.tecnico,cliFiltroGarantia:f.garantia,cliFiltroCategoria:f.categoria}).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v||"";});
    filtrarTabelaClientes();
}
function renderConsultasSalvasClientes(){
    const area=document.getElementById("clientesConsultasSalvas");if(!area)return;
    let salvas=[];try{salvas=JSON.parse(localStorage.getItem("CLIENTES_CONSULTAS_SALVAS_V7519")||"[]")}catch{}
    area.innerHTML=salvas.map((item,i)=>`<button class="intel-salva-chip" onclick="carregarConsultaSalvaClientes(${i})">${escaparHTML(item.nome||("Consulta "+(i+1)))}</button>`).join("");
}
function salvarConsultaClientes(){
    const nome=prompt("Nome para esta consulta:");if(!nome)return;
    let salvas=[];try{salvas=JSON.parse(localStorage.getItem("CLIENTES_CONSULTAS_SALVAS_V7519")||"[]")}catch{}
    salvas.push({nome,filtros:obterFiltrosConsultaClientes()});
    localStorage.setItem("CLIENTES_CONSULTAS_SALVAS_V7519",JSON.stringify(salvas.slice(-20)));
    renderConsultasSalvasClientes();
}
function carregarConsultaSalvaClientes(i){
    let salvas=[];try{salvas=JSON.parse(localStorage.getItem("CLIENTES_CONSULTAS_SALVAS_V7519")||"[]")}catch{}
    if(salvas[i])aplicarFiltrosSalvosClientes(salvas[i].filtros||{});
}
function imprimirPesquisaClientes(){
    const lista=Array.isArray(clientesPesquisaAtual)?clientesPesquisaAtual:[];
    if(!lista.length){alert("Não há dados para imprimir.");return;}
    const conteudo=document.getElementById("cliTabelaPrincipal")?.innerHTML||"";
    const w=window.open("","_blank");if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Consulta avançada de clientes</title><style>body{font-family:Arial;padding:18px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #000;padding:4px;text-align:left}h2{margin-bottom:6px}</style></head><body><h2>Consulta avançada de clientes</h2><p>${lista.length} registro(s) • ${new Date().toLocaleString("pt-BR")}</p>${conteudo}<script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
}
window.salvarConsultaClientes=salvarConsultaClientes;
window.carregarConsultaSalvaClientes=carregarConsultaSalvaClientes;
window.imprimirPesquisaClientes=imprimirPesquisaClientes;
window.renderConsultasSalvasClientes=renderConsultasSalvasClientes;

/* Exportação explícita para os onclicks funcionarem em qualquer navegador */
Object.assign(window,{
  abrirClientes,alternarImportadoresClientes,arquivoClientesSelecionado,
  preVisualizarRexpedlrClientes,preVisualizarRatec04Clientes,
  importarRexpedlrClientes,importarRatec04Clientes,
  carregarDashboardClientes,filtrarTabelaClientes,limparFiltrosClientes
});
