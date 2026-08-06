let erpImportXhrV40=null,erpImportCanceladaV40=false,erpImportInicioV40=0,erpImportTimerV40=null,erpImportUltimosBytesV40=0,erpImportUltimoTempoV40=0;
function erpImportElV40(id){return document.getElementById(id)}
function erpImportTempoTextoV40(seg){seg=Math.max(0,Math.floor(seg||0));return String(Math.floor(seg/60)).padStart(2,"0")+":"+String(seg%60).padStart(2,"0")}
function erpYieldV40(ms=20){return new Promise(r=>setTimeout(r,ms))}
function erpImportLogV40(texto){const el=erpImportElV40("erpImportLog");if(!el)return;const hora=new Date().toLocaleTimeString("pt-BR");el.innerHTML+=(el.textContent==="Aguardando início..."?"":"<br>")+"["+hora+"] "+escaparHTML(texto);if(el.textContent.includes("Aguardando início..."))el.innerHTML="["+hora+"] "+escaparHTML(texto);el.scrollTop=el.scrollHeight}
function abrirImportacaoV40(nome,total){erpImportCanceladaV40=false;erpImportInicioV40=Date.now();erpImportUltimosBytesV40=0;erpImportUltimoTempoV40=performance.now();erpImportElV40("erpImportOverlay")?.classList.add("aberto");erpImportElV40("erpImportArquivo").textContent=nome||"Arquivo REXPEDLR";erpImportElV40("erpImportRegistros").textContent=Number(total||0).toLocaleString("pt-BR");erpImportElV40("erpImportEnviados").textContent="0";erpImportElV40("erpImportVelocidade").textContent="--";erpImportElV40("erpImportLog").textContent="Aguardando início...";erpImportElV40("erpImportCancelar").style.display="";erpImportElV40("erpImportFechar").style.display="none";erpImportElV40("erpImportVerComparacoes").style.display="none";["Leitura","BaseAntes","Envio","Resposta","Comparacao","Atualizacao"].forEach(x=>{const p=erpImportElV40("erpPasso"+x);if(p)p.className="erp-import-passo"});atualizarImportacaoV40(0,"Preparando importação...");clearInterval(erpImportTimerV40);erpImportTimerV40=setInterval(()=>{const t=(Date.now()-erpImportInicioV40)/1000;const el=erpImportElV40("erpImportTempo");if(el)el.textContent=erpImportTempoTextoV40(t)},500)}
function atualizarImportacaoV40(percentual,etapa,passo,status){percentual=Math.max(0,Math.min(100,Math.round(percentual||0)));const b=erpImportElV40("erpImportBarra"),p=erpImportElV40("erpImportPercentual"),e=erpImportElV40("erpImportEtapa");if(b)b.style.width=percentual+"%";if(p)p.textContent=percentual+"%";if(e&&etapa)e.textContent=etapa;if(passo){const el=erpImportElV40("erpPasso"+passo);if(el)el.className="erp-import-passo "+(status||"ativo")}}
function concluirPassoV40(p){const e=erpImportElV40("erpPasso"+p);if(e)e.className="erp-import-passo ok"}
function falharPassoV40(p){const e=erpImportElV40("erpPasso"+p);if(e)e.className="erp-import-passo erro"}
function cancelarImportacaoV40(){erpImportCanceladaV40=true;if(erpImportXhrV40){try{erpImportXhrV40.abort()}catch(_){}}atualizarImportacaoV40(Number((erpImportElV40("erpImportPercentual")||{}).textContent?.replace("%","")||0),"Cancelamento solicitado...");erpImportLogV40("Cancelamento solicitado pelo usuário.");const b=erpImportElV40("erpImportCancelar");if(b)b.disabled=true}
function fecharImportacaoV40(){
    const overlay=erpImportElV40("erpImportOverlay");
    if(overlay)overlay.classList.remove("aberto");
}
function verComparacoesImportacaoV40(){
    fecharImportacaoV40();
    const comparador=document.getElementById("comparadorModal");
    if(comparador)comparador.style.display="flex";
}
function finalizarModalImportacaoV40(sucesso,mensagem){
    clearInterval(erpImportTimerV40);
    erpImportElV40("erpImportCancelar").style.display="none";
    erpImportElV40("erpImportFechar").style.display="";
    erpImportElV40("erpImportVerComparacoes").style.display=sucesso?"":"none";
    erpImportElV40("erpImportTitulo").textContent=sucesso?"Importação concluída":"Importação interrompida";
    erpImportElV40("erpImportEtapa").textContent=mensagem||"";
}
document.addEventListener("keydown",function(event){
    if(event.key==="Escape"){
        const overlay=erpImportElV40("erpImportOverlay");
        if(overlay&&overlay.classList.contains("aberto")){
            fecharImportacaoV40();
        }
    }
});
function enviarRexpedlrXhrV40(endpoint,key,payload){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();erpImportXhrV40=xhr;xhr.open("POST",endpoint,true);xhr.setRequestHeader("Content-Type","application/json");xhr.setRequestHeader("Authorization","Bearer "+key);xhr.setRequestHeader("apikey",key);xhr.upload.onprogress=function(ev){if(!ev.lengthComputable)return;const frac=ev.loaded/ev.total,pct=40+Math.round(frac*35),enviados=Math.round((payload.registros.length||0)*frac);erpImportElV40("erpImportEnviados").textContent=enviados.toLocaleString("pt-BR");const agora=performance.now(),dt=(agora-erpImportUltimoTempoV40)/1000;if(dt>.35){const bytesSeg=(ev.loaded-erpImportUltimosBytesV40)/dt;erpImportElV40("erpImportVelocidade").textContent=bytesSeg>1048576?(bytesSeg/1048576).toFixed(1)+" MB/s":Math.max(0,bytesSeg/1024).toFixed(0)+" KB/s";erpImportUltimosBytesV40=ev.loaded;erpImportUltimoTempoV40=agora}atualizarImportacaoV40(pct,"Enviando registros ao Supabase...","Envio","ativo")};xhr.onload=function(){erpImportXhrV40=null;let retorno=null;try{retorno=JSON.parse(xhr.responseText||"{}")}catch(_){retorno={mensagem:xhr.responseText||""}}if(xhr.status>=200&&xhr.status<300)resolve(retorno);else reject(new Error(retorno?.mensagem||("Falha HTTP "+xhr.status+" na importação.")))};xhr.onerror=function(){erpImportXhrV40=null;reject(new Error("Falha de rede durante o envio ao Supabase."))};xhr.onabort=function(){erpImportXhrV40=null;reject(new Error("Importação cancelada pelo usuário."))};xhr.send(JSON.stringify(payload))})}

window.importarNettermParaSupabase=async function(){
 const msg=document.getElementById("msgAdminImportacao"),input=document.getElementById("arquivoNetterm");let baseAntesImportacao=[],passoAtual="Leitura";
 try{
  if(!input||!input.files||!input.files[0])throw new Error("Selecione o arquivo gerado pelo NetTerm.");
  abrirImportacaoV40(input.files[0].name,registrosNettermPreview.length);erpImportLogV40("Importação iniciada.");atualizarImportacaoV40(3,"Lendo e preparando o arquivo...","Leitura","ativo");await erpYieldV40(80);
  if(registrosNettermPreview.length===0){const res=await lerArquivoNetterm();if(erpImportCanceladaV40)throw new Error("Importação cancelada pelo usuário.");registrosNettermPreview=res.registros;document.getElementById("adminQtdRegistros").innerHTML=res.totalLinhas;document.getElementById("adminQtdValidos").innerHTML=res.registros.length;document.getElementById("adminQtdErros").innerHTML=res.ignorados;renderPreviewNetterm(res.registros)}
  if(registrosNettermPreview.length===0)throw new Error("Nenhum registro válido para importar.");
  erpImportElV40("erpImportRegistros").textContent=registrosNettermPreview.length.toLocaleString("pt-BR");concluirPassoV40("Leitura");atualizarImportacaoV40(12,"Arquivo preparado com "+registrosNettermPreview.length.toLocaleString("pt-BR")+" O.S.");erpImportLogV40(registrosNettermPreview.length.toLocaleString("pt-BR")+" registros válidos preparados.");
  const confirmar=confirm("Atualizar banco de O.S.?\n\nO sistema vai enviar "+registrosNettermPreview.length+" registros para a API importar-rexpedlr.\nAs O.S. existentes serão atualizadas e as novas serão inseridas.");if(!confirmar)throw new Error("Importação cancelada pelo usuário.");
  passoAtual="BaseAntes";atualizarImportacaoV40(16,"Carregando a base atual para comparação...","BaseAntes","ativo");erpImportLogV40("Carregando base anterior do Supabase.");await erpYieldV40(50);
  try{baseAntesImportacao=await buscarTodaRexpedlr()}catch(e){console.warn(e);baseAntesImportacao=[];erpImportLogV40("Base anterior indisponível; importação continuará sem comparação completa.");}
  if(erpImportCanceladaV40)throw new Error("Importação cancelada pelo usuário.");concluirPassoV40("BaseAntes");atualizarImportacaoV40(38,"Base anterior carregada. Preparando envio...");erpImportLogV40(baseAntesImportacao.length.toLocaleString("pt-BR")+" registros carregados para comparação.");
  const url=localStorage.getItem("SUPABASE_URL")||SUPABASE_URL_PADRAO,key=localStorage.getItem("SUPABASE_ANON_KEY")||SUPABASE_ANON_KEY_PADRAO,endpoint=url.replace(/\/$/,"")+"/functions/v1/importar-rexpedlr",arquivo=input.files[0]?.name||"arquivo-netterm";
  msg.innerHTML="Importação em andamento. Acompanhe o indicador de progresso.";passoAtual="Envio";atualizarImportacaoV40(40,"Enviando registros ao Supabase...","Envio","ativo");erpImportLogV40("Iniciando envio para importar-rexpedlr.");
  const retorno=await enviarRexpedlrXhrV40(endpoint,key,{arquivo,registros:registrosNettermPreview});
  if(erpImportCanceladaV40)throw new Error("Importação cancelada pelo usuário.");if(retorno&&retorno.erro)throw new Error(retorno.mensagem||"Falha na Edge Function importar-rexpedlr.");concluirPassoV40("Envio");erpImportElV40("erpImportEnviados").textContent=registrosNettermPreview.length.toLocaleString("pt-BR");
  passoAtual="Resposta";atualizarImportacaoV40(78,"Confirmando a resposta do servidor...","Resposta","ativo");await erpYieldV40(120);
  const importados=retorno.total_importado||retorno.totalImportado||registrosNettermPreview.length,recebidos=retorno.total_recebido||registrosNettermPreview.length,duplicados=retorno.duplicados_removidos||Math.max(0,recebidos-importados);
  concluirPassoV40("Resposta");atualizarImportacaoV40(83,importados.toLocaleString("pt-BR")+" O.S. confirmadas pelo servidor.");erpImportLogV40("Servidor confirmou "+importados.toLocaleString("pt-BR")+" registros.");
  const agora=new Date().toLocaleString("pt-BR");localStorage.setItem("ULTIMA_IMPORTACAO_REXPEDLR",agora);localStorage.setItem("ULTIMA_IMPORTACAO_REXPEDLR_QTD",String(importados));localStorage.setItem("ULTIMA_IMPORTACAO_REXPEDLR_DUP",String(duplicados));bancoREXPEDLR=[];bancoCarregado=false;
  passoAtual="Comparacao";atualizarImportacaoV40(86,"Comparando alterações após a importação...","Comparacao","ativo");erpImportLogV40("Carregando base atualizada para gerar o comparador.");
  try{const baseDepoisImportacao=await buscarTodaRexpedlr();if(erpImportCanceladaV40)throw new Error("Importação cancelada pelo usuário.");const comparacao=compararBasesImportacao(baseAntesImportacao,baseDepoisImportacao,{arquivo,data:new Date().toISOString(),usuario:(usuarioLogado&&(usuarioLogado.nome||usuarioLogado.email))||"Usuário"});await salvarComparacaoImportacao(comparacao);concluirPassoV40("Comparacao");atualizarImportacaoV40(94,"Comparação concluída.");erpImportLogV40((comparacao.todas?.length||0).toLocaleString("pt-BR")+" alterações identificadas.");setTimeout(()=>abrirComparadorImportacao(comparacao),400)}catch(compErro){console.warn(compErro);concluirPassoV40("Comparacao");erpImportLogV40("Importação concluída, mas o comparador não pôde ser gerado.");}
  passoAtual="Atualizacao";atualizarImportacaoV40(96,"Atualizando dashboard, histórico e indicadores...","Atualizacao","ativo");await Promise.allSettled([carregarDashboardAdmin(),carregarHistoricoImportacoes()]);concluirPassoV40("Atualizacao");atualizarImportacaoV40(100,"Importação concluída com sucesso.");erpImportLogV40("Todos os painéis foram atualizados.");
  msg.innerHTML="<span class='admin-status-ok'>Banco atualizado com sucesso:</span> "+importados+" de "+recebidos+" O.S. enviadas para o Supabase em "+agora+".";await registrarAuditoria("importacao","Banco REXPEDLR atualizado com sucesso.",{recebidos,importados,duplicados,arquivo});finalizarModalImportacaoV40(true,importados.toLocaleString("pt-BR")+" O.S. importadas com sucesso.");
 }catch(e){const cancelada=/cancelad/i.test(String(e.message||e));falharPassoV40(passoAtual);erpImportLogV40((cancelada?"Cancelada: ":"Erro: ")+(e.message||e));msg.innerHTML="<span class='"+(cancelada?"admin-status-alerta":"admin-status-erro")+"'>"+(cancelada?"Importação cancelada: ":"Erro na importação: ")+"</span> "+escaparHTML(e.message||e);if(!cancelada)await registrarAuditoria("erro","Erro na importação REXPEDLR.",{erro:e.message||String(e)});finalizarModalImportacaoV40(false,cancelada?"A importação foi cancelada.":(e.message||String(e)));
 }finally{erpImportXhrV40=null;const b=erpImportElV40("erpImportCancelar");if(b)b.disabled=false}
};
