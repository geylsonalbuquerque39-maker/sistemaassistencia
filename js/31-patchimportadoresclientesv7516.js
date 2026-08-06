/* V7.5.16 - Correção isolada dos importadores da Base de Clientes */
(function(){
  "use strict";

  const get = id => document.getElementById(id);
  const txt = v => String(v ?? "").trim();
  const esc = v => typeof window.escaparHTML === "function"
    ? window.escaparHTML(String(v ?? ""))
    : String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

  function normalizarOS(v){
    return txt(v).toUpperCase().replace(/^ILR\s*/i, "").replace(/\.0+$/, "").replace(/[^0-9A-Z]/g, "");
  }
  function normalizarCabecalho(v){
    return txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.\-_/]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function status(id, mensagem, tipo){
    const el=get(id); if(!el) return;
    el.className="clientes-status"+(tipo?" "+tipo:"");
    el.textContent=mensagem;
  }
  function clienteSupabase(){
    if(typeof window.obterSupabaseClientes === "function") return window.obterSupabaseClientes();
    if(!window.supabase) throw new Error("Biblioteca Supabase não carregada.");
    if(!window.__supabaseClientesV7516){
      window.__supabaseClientesV7516=window.supabase.createClient(
        "https://hfzbcivskqvrnzimcfvm.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmemJjaXZza3F2cm56aW1jZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzE3MDMsImV4cCI6MjEwMTQ0NzcwM30.dxyQDhvxd9N4X5f44XK29-fRxulJACJfUvwNROM_U3E",
        {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
      );
    }
    return window.__supabaseClientesV7516;
  }

  async function lerArquivo(file){
    if(!file) throw new Error("Selecione um arquivo antes de continuar.");
    if(!window.XLSX) throw new Error("Biblioteca XLSX não carregou. Verifique a conexão com a internet.");
    const nome=(file.name||"").toLowerCase();
    let wb;
    if(nome.endsWith(".csv") || nome.endsWith(".txt") || nome.endsWith(".html") || nome.endsWith(".htm")){
      const texto=await file.text();
      wb=window.XLSX.read(texto,{type:"string",raw:false,cellDates:false});
    }else{
      const buffer=await file.arrayBuffer();
      wb=window.XLSX.read(buffer,{type:"array",raw:false,cellDates:false});
    }
    if(!wb.SheetNames?.length) throw new Error("O arquivo não possui planilha legível.");
    const ws=wb.Sheets[wb.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:false,blankrows:false});
  }

  const MAPA={
    os:["os","o s"], dt_geracao:["dt geracao","data geracao"], pdv:["pdv"], nf:["nf"], alm:["alm"],
    grupo:["grupo","gr"], nce:["nce","n c e"], desc_produto:["desc produto","descricao produto","produto"],
    cor:["cor"], n_serie:["n serie","numero serie"], valor_transf:["valor transf"], tecnico:["tecnico"], rack:["rack"],
    status:["status"], usuario:["usuario"], depreciacao_percentual:["depreciacao","depreciacao percentual"],
    obs_expedicao:["obs expedicao"], dt_expedicao:["dt expedicao"], pdv_expedicao:["pdv expedicao"], feirao:["feirao"],
    analise_defeito:["analise do defeito","analise defeito"], dt_conserto:["dt conserto"], obs_status:["obs status"],
    obs_ordem_servico:["obs ordem de servico","observacao ordem servico"], solicitante_cpp:["solicitante cpp"],
    data_cpp:["data cpp"], nr_cpp:["nr cpp"], sit_cpp:["sit cpp"], obs_cpp:["obs cpp"], recebedor_cpp:["recebedor cpp"],
    data_recebedor:["data recebedor"], dt_ult_entrada:["dt ult entrada"], dt_saida_oficina:["dt saida oficina"],
    dt_recb_at:["dt recb at"], status_da_os:["status da os"], tipo_garantia:["tipo garantia"]
  };
  const COLUNAS=new Set(Object.keys(MAPA));
  let previewRex=[];
  let previewRatec=[];

  function acharCabecalho(linhas){
    for(let i=0;i<Math.min(linhas.length,40);i++){
      const cab=(linhas[i]||[]).map(normalizarCabecalho);
      const indices={};
      Object.entries(MAPA).forEach(([campo,apelidos])=>indices[campo]=cab.findIndex(v=>apelidos.includes(v)));
      if(indices.os>=0 && indices.pdv>=0 && (indices.status>=0 || indices.status_da_os>=0)) return {linha:i,indices};
    }
    throw new Error("Cabeçalho do REXPEDLR não identificado. Confirme O.S., PDV e STATUS.");
  }
  function deduplicar(lista){
    const mapa=new Map(); let repetidas=0;
    for(const r of lista){
      const os=normalizarOS(r.os); if(!os) continue;
      if(mapa.has(os)) repetidas++;
      mapa.set(os,{...r,os});
    }
    return {registros:[...mapa.values()],repetidas};
  }
  function mostrarPreview(id,registros,colunas){
    const area=get(id); if(!area) return;
    if(!registros.length){area.innerHTML="";area.style.display="none";return;}
    const linhas=registros.slice(0,25).map(r=>"<tr>"+colunas.map(c=>"<td>"+esc(r[c[1]])+"</td>").join("")+"</tr>").join("");
    area.innerHTML="<table><thead><tr>"+colunas.map(c=>"<th>"+esc(c[0])+"</th>").join("")+"</tr></thead><tbody>"+linhas+"</tbody></table>";
    area.style.display="block";
  }
  function setBotoes(desabilitado){
    ["btnPreviewRexpedlrClientes","btnImportarRexpedlrClientes","btnPreviewRatec04Clientes","btnImportarRatec04Clientes"].forEach(id=>{const b=get(id);if(b)b.disabled=desabilitado;});
  }

  async function previewRexpedlr(){
    status("msgImportRexpedlrClientes","Lendo arquivo...","");
    const linhas=await lerArquivo(get("arquivoRexpedlrClientes")?.files?.[0]);
    const cab=acharCabecalho(linhas);
    const lista=[];
    for(const linha of linhas.slice(cab.linha+1)){
      const r={};
      for(const campo of Object.keys(MAPA)) r[campo]=cab.indices[campo]>=0?txt(linha[cab.indices[campo]]):"";
      r.os=normalizarOS(r.os);
      if(r.os) lista.push(r);
    }
    const d=deduplicar(lista); previewRex=d.registros; window.clientesRexpedlrPreview=previewRex;
    mostrarPreview("previewRexpedlrClientes",previewRex,[["O.S.","os"],["PDV","pdv"],["GR","grupo"],["Status","status"],["Produto","desc_produto"]]);
    status("msgImportRexpedlrClientes",`${previewRex.length} O.S. únicas prontas. ${d.repetidas} duplicata(s) removida(s).`,"ok");
    return previewRex;
  }
  async function previewRatec04Fn(){
    status("msgImportRatec04Clientes","Lendo arquivo...","");
    const linhas=await lerArquivo(get("arquivoRatec04Clientes")?.files?.[0]);
    const lista=linhas.map(l=>({os:normalizarOS(l?.[0]),nome_cliente:txt(l?.[2])})).filter(r=>r.os&&r.nome_cliente);
    const d=deduplicar(lista); previewRatec=d.registros; window.clientesRatec04Preview=previewRatec;
    mostrarPreview("previewRatec04Clientes",previewRatec,[["O.S.","os"],["Nome do cliente","nome_cliente"]]);
    status("msgImportRatec04Clientes",`${previewRatec.length} nomes prontos. ${d.repetidas} duplicata(s) removida(s).`,"ok");
    return previewRatec;
  }
  async function upsertLotes(tabela,registros){
    const supa=clienteSupabase();
    for(let i=0;i<registros.length;i+=300){
      let lote=registros.slice(i,i+300);
      if(tabela==="rexpedlr_clientes") lote=lote.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>COLUNAS.has(k))));
      const {error}=await supa.from(tabela).upsert(lote,{onConflict:"os"});
      if(error) throw error;
    }
  }
  async function importarRex(){
    if(!previewRex.length) await previewRexpedlr();
    if(!previewRex.length) throw new Error("Nenhuma O.S. válida encontrada.");
    if(!window.confirm(`Importar/atualizar ${previewRex.length} O.S.?`)) return;
    status("msgImportRexpedlrClientes","Enviando registros ao Supabase...","");
    await upsertLotes("rexpedlr_clientes",previewRex);
    localStorage.setItem("CLIENTES_ULTIMA_IMPORTACAO_REXPEDLR",new Date().toLocaleString("pt-BR"));
    status("msgImportRexpedlrClientes",`Importação concluída: ${previewRex.length} O.S. inseridas ou atualizadas.`,"ok");
    if(typeof window.carregarDashboardClientes==="function") await window.carregarDashboardClientes(true);
  }
  async function importarRatec(){
    if(!previewRatec.length) await previewRatec04Fn();
    if(!previewRatec.length) throw new Error("Nenhum cliente válido encontrado.");
    if(!window.confirm(`Importar/atualizar ${previewRatec.length} nomes?`)) return;
    status("msgImportRatec04Clientes","Enviando registros ao Supabase...","");
    await upsertLotes("ratec04_clientes",previewRatec);
    localStorage.setItem("CLIENTES_ULTIMA_IMPORTACAO_RATEC04",new Date().toLocaleString("pt-BR"));
    status("msgImportRatec04Clientes",`RATEC04 concluído: ${previewRatec.length} nomes inseridos ou atualizados.`,"ok");
    if(typeof window.carregarDashboardClientes==="function") await window.carregarDashboardClientes(true);
  }

  function executar(fn,msgId){
    return async function(ev){
      ev?.preventDefault?.();
      setBotoes(true);
      try{await fn();}
      catch(e){console.error("Importador Clientes:",e);status(msgId,"Erro: "+(e?.message||e),"erro");}
      finally{setBotoes(false);}
    };
  }
  function instalar(){
    const pares=[
      ["btnPreviewRexpedlrClientes",executar(previewRexpedlr,"msgImportRexpedlrClientes")],
      ["btnImportarRexpedlrClientes",executar(importarRex,"msgImportRexpedlrClientes")],
      ["btnPreviewRatec04Clientes",executar(previewRatec04Fn,"msgImportRatec04Clientes")],
      ["btnImportarRatec04Clientes",executar(importarRatec,"msgImportRatec04Clientes")]
    ];
    pares.forEach(([id,fn])=>{const b=get(id);if(b&&!b.dataset.v7516){b.dataset.v7516="1";b.addEventListener("click",fn);}});
    const rex=get("arquivoRexpedlrClientes"),ratec=get("arquivoRatec04Clientes");
    rex?.addEventListener("change",()=>{previewRex=[];get("previewRexpedlrClientes").style.display="none";status("msgImportRexpedlrClientes",rex.files?.[0]?`Arquivo selecionado: ${rex.files[0].name}`:"Selecione um arquivo.","");});
    ratec?.addEventListener("change",()=>{previewRatec=[];get("previewRatec04Clientes").style.display="none";status("msgImportRatec04Clientes",ratec.files?.[0]?`Arquivo selecionado: ${ratec.files[0].name}`:"Selecione um arquivo.","");});
  }
  window.preVisualizarRexpedlrClientes=previewRexpedlr;
  window.preVisualizarRatec04Clientes=previewRatec04Fn;
  window.importarRexpedlrClientes=importarRex;
  window.importarRatec04Clientes=importarRatec;
  document.addEventListener("DOMContentLoaded",instalar);
  window.addEventListener("load",instalar);
  setTimeout(instalar,500);
})();
