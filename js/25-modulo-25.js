(function(){
    "use strict";

    document.addEventListener("click",function(event){
        const botao=event.target.closest?.("button,a");
        if(!botao)return;
        if(botao.closest("#exportacaoOfficeMenuV720"))return;

        const texto=String(botao.textContent||"").toUpperCase();
        const onclick=String(botao.getAttribute("onclick")||"").toUpperCase();

        const ehExportacao=
            texto.includes("EXPORTAR") ||
            onclick.includes("EXPORTAR") ||
            onclick.includes("CSV");

        if(!ehExportacao)return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const menu=document.getElementById("exportacaoOfficeMenuV720");
        if(!menu)return;

        if(typeof window.definirBotaoExportacaoV720==='function')window.definirBotaoExportacaoV720(botao);

        const largura=285;
        const altura=235;
        const x=Math.min(event.clientX||20,window.innerWidth-largura-10);
        const y=Math.min(event.clientY||20,window.innerHeight-altura-10);

        menu.style.left=Math.max(8,x)+"px";
        menu.style.top=Math.max(8,y)+"px";
        menu.classList.add("aberto");
    },true);
})();
