(function(){
    "use strict";

    function ehExportacaoV721(el){
        if(!el)return false;
        const onclick=String(el.getAttribute?.("onclick")||"").toLowerCase();
        const texto=String(el.textContent||"").toLowerCase();

        return onclick.includes("exportar") ||
               onclick.includes("csv") ||
               texto.includes("exportar");
    }

    function ajustarBotaoV721(el){
        if(!el || !ehExportacaoV721(el))return;
        if(el.closest("#exportacaoOfficeMenuV720"))return;

        el.classList.add("botao-exportacao-office-v721");

        const texto=String(el.textContent||"").trim();
        if(
            texto.toLowerCase()==="exportar" ||
            texto.toLowerCase()==="exportar csv" ||
            texto.toLowerCase()==="exportar arquivo" ||
            texto.toLowerCase()==="exportar arquivo ▾"
        ){
            el.textContent="Exportar arquivo ▾";
        }else if(texto.toLowerCase().includes("exportar csv")){
            el.textContent=texto.replace(/exportar csv/ig,"Exportar arquivo ▾");
        }

        el.title="Escolha CSV, XLS ou XLT";
    }

    function varrerExportacoesV721(raiz){
        const alvo=raiz||document;
        alvo.querySelectorAll?.("button,a").forEach(ajustarBotaoV721);
        if(alvo.matches?.("button,a"))ajustarBotaoV721(alvo);
    }

    document.addEventListener("DOMContentLoaded",function(){
        varrerExportacoesV721(document);

        const observer=new MutationObserver(function(mutacoes){
            for(const mutacao of mutacoes){
                mutacao.addedNodes.forEach(no=>{
                    if(no.nodeType===1)varrerExportacoesV721(no);
                });
            }
        });

        observer.observe(document.body,{
            childList:true,
            subtree:true
        });
    });

    // Reforço no clique: qualquer botão de exportação abre o seletor de formato.
    document.addEventListener("click",function(event){
        const botao=event.target.closest?.("button,a");
        if(!botao || !ehExportacaoV721(botao))return;
        if(botao.closest("#exportacaoOfficeMenuV720"))return;

        // O interceptor da V7.2.3 já abre o menu.
        // Aqui só garante o rótulo correto antes da abertura.
        ajustarBotaoV721(botao);
    },true);
})();
