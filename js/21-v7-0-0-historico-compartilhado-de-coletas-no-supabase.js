/* =========================================================
   V7.0.0 - HISTÓRICO COMPARTILHADO DE COLETAS NO SUPABASE
   ========================================================= */
let coletasHistoricoCache=[];
let coletaHistoricoAtual=null;
let coletaHistoricoItensAtual=[];

function nomeTipoColetaHist(tipo){
    return tipo==="enderecamento"?"Endereçamento":tipo==="att"?"ATT":"Loja de Origem";
}
function dataColetaHist(v){
    try{return new Date(v).toLocaleString("pt-BR")}catch(_){return v||"—"}
}
function escColetaHist(v){
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function abrirHistoricoColetasSupabase(){
    coletaTipoAtual="";
    coletaOSItens=[];
    document.getElementById("coletaSelecaoTipos").style.display="none";
    document.getElementById("coletaOperacao").style.display="none";
    document.getElementById("rascunhosModulo").style.display="none";
    document.getElementById("coletasHistoricoModulo").style.display="block";
    carregarHistoricoColetasSupabase();
}
function voltarHistoricoColetas(){
    document.getElementById("coletasHistoricoModulo").style.display="none";
    document.getElementById("coletaOperacao").style.display="none";
    document.getElementById("rascunhosModulo").style.display="none";
    document.getElementById("coletaSelecaoTipos").style.display="block";
}
async function carregarHistoricoColetasSupabase(){
    const msg=document.getElementById("coletasHistMensagem");
    if(msg){msg.className="coleta-msg";msg.textContent="Carregando coletas do Supabase...";}
    try{
        const {data,error}=await obterSupabaseClient()
            .from("coletas_os")
            .select("id,tipo,titulo,usuario_id,usuario_nome,quantidade,status,criado_em")
            .order("criado_em",{ascending:false})
            .limit(500);
        if(error)throw error;
        coletasHistoricoCache=data||[];
        filtrarHistoricoColetas();
        if(msg){msg.className="coleta-msg ok";msg.textContent=coletasHistoricoCache.length+" coleta(s) carregada(s) do Supabase.";}
    }catch(e){
        if(msg){msg.className="coleta-msg erro";msg.textContent="Erro ao carregar histórico: "+(e?.message||e);}
    }
}
function filtrarHistoricoColetas(){
    const busca=String(document.getElementById("coletasHistBusca")?.value||"").trim().toUpperCase();
    const tipo=document.getElementById("coletasHistTipo")?.value||"";
    const lista=coletasHistoricoCache.filter(c=>{
        const texto=[c.id,c.usuario_nome,c.tipo,nomeTipoColetaHist(c.tipo)].join(" ").toUpperCase();
        return (!busca||texto.includes(busca))&&(!tipo||c.tipo===tipo);
    });
    renderizarHistoricoColetas(lista);
}
function renderizarHistoricoColetas(lista){
    const corpo=document.getElementById("coletasHistCorpo");
    if(!corpo)return;
    document.getElementById("coletasHistTotal").textContent=lista.length;
    document.getElementById("coletasHistTotalOS").textContent=lista.reduce((s,c)=>s+Number(c.quantidade||0),0);
    document.getElementById("coletasHistUltima").textContent=lista[0]?dataColetaHist(lista[0].criado_em):"—";

    if(!lista.length){
        corpo.innerHTML='<tr><td colspan="5">Nenhuma coleta encontrada.</td></tr>';
        return;
    }
    corpo.innerHTML=lista.map(c=>`
        <tr>
            <td>${escColetaHist(dataColetaHist(c.criado_em))}</td>
            <td>${escColetaHist(nomeTipoColetaHist(c.tipo))}</td>
            <td>${escColetaHist(c.usuario_nome||"Usuário")}</td>
            <td><b>${Number(c.quantidade||0)}</b></td>
            <td><div class="coletas-hist-acoes">
                <button onclick="abrirDetalheColetaSupabase(${Number(c.id)})">Ver relação</button>
                <button class="sec" onclick="exportarColetaHistoricoDireto(${Number(c.id)})">Exportar arquivo ▾</button>
                <button onclick="imprimirColetaHistoricoDireto(${Number(c.id)})">Imprimir</button>
            </div></td>
        </tr>
    `).join("");
}
async function carregarItensColetaHistorico(id){
    const {data,error}=await obterSupabaseClient()
        .from("coleta_os_itens")
        .select("*")
        .eq("coleta_id",id)
        .order("ordem",{ascending:true});
    if(error)throw error;
    return data||[];
}
async function abrirDetalheColetaSupabase(id){
    const coleta=coletasHistoricoCache.find(c=>Number(c.id)===Number(id));
    if(!coleta)return;
    coletaHistoricoAtual=coleta;
    const modal=document.getElementById("coletaHistDetalheModal");
    modal.classList.add("aberto");
    document.getElementById("coletaHistDetalheTitulo").textContent=
        "Coleta nº "+coleta.id+" — "+nomeTipoColetaHist(coleta.tipo);
    document.getElementById("coletaHistDetalheInfo").textContent=
        dataColetaHist(coleta.criado_em)+" • "+(coleta.usuario_nome||"Usuário")+" • "+coleta.quantidade+" O.S.";
    document.getElementById("coletaHistDetalheCorpo").innerHTML='<tr><td>Carregando relação...</td></tr>';
    try{
        coletaHistoricoItensAtual=await carregarItensColetaHistorico(id);
        renderizarDetalheColetaHistorico();
    }catch(e){
        document.getElementById("coletaHistDetalheCorpo").innerHTML=
            '<tr><td>Erro ao carregar: '+escColetaHist(e?.message||e)+'</td></tr>';
    }
}
function fecharDetalheColeta(){
    document.getElementById("coletaHistDetalheModal")?.classList.remove("aberto");
}
function colunasColetaHistorico(){
    const cols=[
        ["os","O.S."],["dt_geracao","Data da O.S."]
    ];
    if(coletaHistoricoAtual?.tipo!=="enderecamento")cols.push(["destino","Destino"]);
    cols.push(
        ["pdv","Loja de Origem"],["alm","ALM"],["grupo","Grupo"],["nce","N.C.E."],
        ["desc_produto","Produto"],["cod_cor","Cód. Cor"],["cor","Cor"],
        ["n_serie","Nº de Série"],["rack","Rack"],["status_os","Status"],
        ["valor","Valor"],["cubagem","Cubagem"]
    );
    return cols;
}
function renderizarDetalheColetaHistorico(){
    const cols=colunasColetaHistorico();
    document.getElementById("coletaHistDetalheCabecalho").innerHTML=
        "<tr>"+cols.map(c=>"<th>"+escColetaHist(c[1])+"</th>").join("")+"</tr>";
    document.getElementById("coletaHistDetalheCorpo").innerHTML=
        coletaHistoricoItensAtual.length
        ?coletaHistoricoItensAtual.map(i=>"<tr>"+cols.map(c=>"<td>"+escColetaHist(i[c[0]])+"</td>").join("")+"</tr>").join("")
        :'<tr><td colspan="'+cols.length+'">Coleta sem itens.</td></tr>';
}
function csvColetaHistorico(){
    const cols=colunasColetaHistorico();
    const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
    return "\ufeff"+cols.map(c=>q(c[1])).join(";")+"\r\n"+
        coletaHistoricoItensAtual.map(i=>cols.map(c=>q(i[c[0]])).join(";")).join("\r\n");
}
function baixarCSVColetaHistorico(){
    const blob=new Blob([csvColetaHistorico()],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="coleta_"+coletaHistoricoAtual.id+"_"+coletaHistoricoAtual.tipo+".csv";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportarColetaHistoricoAtual(){
    if(!coletaHistoricoAtual||!coletaHistoricoItensAtual.length)return;
    baixarCSVColetaHistorico();
}
async function exportarColetaHistoricoDireto(id){
    coletaHistoricoAtual=coletasHistoricoCache.find(c=>Number(c.id)===Number(id));
    coletaHistoricoItensAtual=await carregarItensColetaHistorico(id);
    baixarCSVColetaHistorico();
}
function htmlImpressaoColetaHistorico(){
    const cols=colunasColetaHistorico();
    return `<!doctype html><html><head><meta charset="utf-8"><title>Coleta ${coletaHistoricoAtual.id}</title>
    <style>body{font-family:Arial;padding:18px}h1{font-size:22px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #000;padding:4px}th{background:#eee}@page{size:landscape}</style>
    </head><body><h1>Coleta nº ${coletaHistoricoAtual.id} — ${escColetaHist(nomeTipoColetaHist(coletaHistoricoAtual.tipo))}</h1>
    <p>${escColetaHist(dataColetaHist(coletaHistoricoAtual.criado_em))} • ${escColetaHist(coletaHistoricoAtual.usuario_nome||"Usuário")} • ${coletaHistoricoItensAtual.length} O.S.</p>
    <table><thead><tr>${cols.map(c=>"<th>"+escColetaHist(c[1])+"</th>").join("")}</tr></thead>
    <tbody>${coletaHistoricoItensAtual.map(i=>"<tr>"+cols.map(c=>"<td>"+escColetaHist(i[c[0]])+"</td>").join("")+"</tr>").join("")}</tbody></table>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
}
function imprimirColetaHistoricoAtual(){
    if(!coletaHistoricoAtual||!coletaHistoricoItensAtual.length)return;
    const w=window.open("","_blank");
    w.document.write(htmlImpressaoColetaHistorico());
    w.document.close();
}
async function imprimirColetaHistoricoDireto(id){
    coletaHistoricoAtual=coletasHistoricoCache.find(c=>Number(c.id)===Number(id));
    coletaHistoricoItensAtual=await carregarItensColetaHistorico(id);
    imprimirColetaHistoricoAtual();
}
document.addEventListener("click",e=>{
    if(e.target===document.getElementById("coletaHistDetalheModal"))fecharDetalheColeta();
});
