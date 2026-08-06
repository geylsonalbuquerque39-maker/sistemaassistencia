function abrirCopilotoERP(){
    const painel=document.getElementById("copilotoPainel"),overlay=document.getElementById("copilotoOverlay");
    if(painel)painel.classList.add("aberto");
    if(overlay)overlay.classList.add("aberto");
    if(typeof renderContextoCopiloto==="function")renderContextoCopiloto();
    setTimeout(()=>document.getElementById("intelPergunta")?.focus(),220);
    if((typeof intelRegistros==="undefined"||!Array.isArray(intelRegistros)||!intelRegistros.length)&&typeof carregarInteligencia==="function")carregarInteligencia(false);
}
function fecharCopilotoERP(){
    document.getElementById("copilotoPainel")?.classList.remove("aberto");
    document.getElementById("copilotoOverlay")?.classList.remove("aberto");
}
function alternarCopilotoERP(){
    const painel=document.getElementById("copilotoPainel");
    if(painel&&painel.classList.contains("aberto"))fecharCopilotoERP();else abrirCopilotoERP();
}
function atualizarBadgeCopilotoERP(){
    const badge=document.getElementById("copilotoBadge");if(!badge)return;
    if(typeof intelAnalise==="undefined"||!intelAnalise){badge.classList.remove("visivel");return}
    let alertas=0;
    ["rack500Abertas","prontasAbertas","semTecnico","semRack","cpp","oficina20"].forEach(chave=>{const lista=intelAnalise[chave];if(Array.isArray(lista)&&lista.length>0)alertas++});
    badge.textContent=String(alertas);
    badge.classList.toggle("visivel",alertas>0);
}
document.addEventListener("keydown",function(event){
    if(event.key==="Escape"&&document.getElementById("copilotoPainel")?.classList.contains("aberto"))fecharCopilotoERP();
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="j"){event.preventDefault();alternarCopilotoERP()}
});
