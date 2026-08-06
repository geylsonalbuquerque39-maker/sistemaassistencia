/* =========================================================
   V6.2.1 - FIXAÇÃO REAL DO PERFIL E RESET DO CHAT
   ========================================================= */
function corrigirEstruturaLayoutV621(){
    const sidebar=document.getElementById("sidebar");
    const painel=document.getElementById("painelUsuarioV620");

    // Coloca fisicamente o painel dentro da lateral.
    if(sidebar&&painel&&painel.parentElement!==sidebar){
        sidebar.appendChild(painel);
    }

    // Remove posições e dimensões antigas salvas ou aplicadas pelo arraste.
    const chat=document.getElementById("chatPainel");
    if(chat){
        [
            "left","top","right","bottom","width","height",
            "transform","resize"
        ].forEach(propriedade=>chat.style.removeProperty(propriedade));
        chat.classList.remove("chat-arrastando");
    }

    const wrap=document.getElementById("chatWrap");
    if(wrap){
        ["left","top","right","bottom","transform"].forEach(
            propriedade=>wrap.style.removeProperty(propriedade)
        );
        wrap.classList.remove("chat-arrastando");
    }

    // Remove dados antigos de posição caso versões anteriores tenham salvado.
    [
        "chat_posicao_v57",
        "chat_posicao_v574",
        "chat_posicao_v575",
        "chat_tamanho_v57",
        "chat_tamanho_v574",
        "chat_tamanho_v575",
        "chatPainelPosicao",
        "chatPainelTamanho"
    ].forEach(chave=>localStorage.removeItem(chave));
}

document.addEventListener("DOMContentLoaded",()=>{
    corrigirEstruturaLayoutV621();
    setTimeout(corrigirEstruturaLayoutV621,300);
});

window.addEventListener("resize",()=>{
    const chat=document.getElementById("chatPainel");
    if(chat){
        chat.style.removeProperty("left");
        chat.style.removeProperty("top");
        chat.style.removeProperty("width");
        chat.style.removeProperty("height");
        chat.style.removeProperty("transform");
    }
});
