/* =========================================================
   V5.7.4 - ARRASTE ROBUSTO E REDIMENSIONAMENTO MANUAL
   ========================================================= */
const CHAT_V574_POS_BOTAO="erp_chat_botao_pos_v574";
const CHAT_V574_POS_PAINEL="erp_chat_painel_pos_v574";
const CHAT_V574_TAMANHO="erp_chat_tamanho_v574";
let chatBotaoFoiArrastadoV574=false;

function chatLimitarV574(v,min,max){return Math.min(Math.max(v,min),Math.max(min,max))}

function chatAplicarPosicaoV574(el,left,top){
    const r=el.getBoundingClientRect();
    el.style.setProperty("left",chatLimitarV574(left,6,window.innerWidth-r.width-6)+"px","important");
    el.style.setProperty("top",chatLimitarV574(top,6,window.innerHeight-r.height-6)+"px","important");
    el.style.setProperty("right","auto","important");
    el.style.setProperty("bottom","auto","important");
}

function chatRestaurarBotaoV574(){
    const el=document.getElementById("chatWrap");
    if(!el||window.innerWidth<=760)return;
    try{
        const p=JSON.parse(localStorage.getItem(CHAT_V574_POS_BOTAO)||"null");
        if(p)chatAplicarPosicaoV574(el,Number(p.left),Number(p.top));
    }catch(e){}
}
function chatSalvarBotaoV574(){
    const el=document.getElementById("chatWrap");if(!el)return;
    const r=el.getBoundingClientRect();
    localStorage.setItem(CHAT_V574_POS_BOTAO,JSON.stringify({left:r.left,top:r.top}));
}
function chatRestaurarPainelV574(){
    const el=document.getElementById("chatPainel");
    if(!el||window.innerWidth<=760)return;
    try{
        const t=JSON.parse(localStorage.getItem(CHAT_V574_TAMANHO)||"null");
        if(t){
            el.style.setProperty("width",chatLimitarV574(Number(t.width)||760,380,window.innerWidth-12)+"px","important");
            el.style.setProperty("height",chatLimitarV574(Number(t.height)||650,300,window.innerHeight-12)+"px","important");
        }
        const p=JSON.parse(localStorage.getItem(CHAT_V574_POS_PAINEL)||"null");
        if(p)requestAnimationFrame(()=>chatAplicarPosicaoV574(el,Number(p.left),Number(p.top)));
    }catch(e){}
}
function chatSalvarPainelV574(){
    const el=document.getElementById("chatPainel");
    if(!el||window.innerWidth<=760)return;
    const r=el.getBoundingClientRect();
    localStorage.setItem(CHAT_V574_POS_PAINEL,JSON.stringify({left:r.left,top:r.top}));
    localStorage.setItem(CHAT_V574_TAMANHO,JSON.stringify({width:r.width,height:r.height}));
}

function chatAtivarArrasteV574(el,alca,aoMoverFim,marcarBotao=false){
    if(!el||!alca)return;
    let ativo=false,dx=0,dy=0,x0=0,y0=0;

    const iniciar=(x,y,e)=>{
        if(window.innerWidth<=760)return;
        ativo=true;x0=x;y0=y;
        const r=el.getBoundingClientRect();
        dx=x-r.left;dy=y-r.top;
        el.style.setProperty("left",r.left+"px","important");
        el.style.setProperty("top",r.top+"px","important");
        el.style.setProperty("right","auto","important");
        el.style.setProperty("bottom","auto","important");
        el.classList.add("chat-arrastando");
        if(marcarBotao)chatBotaoFoiArrastadoV574=false;
        e?.preventDefault();
        e?.stopPropagation();
    };
    const mover=(x,y,e)=>{
        if(!ativo)return;
        if(marcarBotao&&Math.hypot(x-x0,y-y0)>5)chatBotaoFoiArrastadoV574=true;
        chatAplicarPosicaoV574(el,x-dx,y-dy);
        e?.preventDefault();
    };
    const finalizar=()=>{
        if(!ativo)return;
        ativo=false;
        el.classList.remove("chat-arrastando");
        aoMoverFim?.();
    };

    alca.addEventListener("mousedown",e=>iniciar(e.clientX,e.clientY,e));
    document.addEventListener("mousemove",e=>mover(e.clientX,e.clientY,e));
    document.addEventListener("mouseup",finalizar);

    alca.addEventListener("touchstart",e=>{
        const t=e.touches[0];if(t)iniciar(t.clientX,t.clientY,e);
    },{passive:false});
    document.addEventListener("touchmove",e=>{
        const t=e.touches[0];if(t)mover(t.clientX,t.clientY,e);
    },{passive:false});
    document.addEventListener("touchend",finalizar);
}

function chatAtivarResizeV574(){
    const painel=document.getElementById("chatPainel");
    const alca=document.getElementById("chatResizeHandle");
    if(!painel||!alca)return;
    let ativo=false,x0=0,y0=0,w0=0,h0=0;

    const iniciar=(x,y,e)=>{
        if(window.innerWidth<=760)return;
        ativo=true;x0=x;y0=y;
        const r=painel.getBoundingClientRect();w0=r.width;h0=r.height;
        e?.preventDefault();e?.stopPropagation();
    };
    const mover=(x,y,e)=>{
        if(!ativo)return;
        const r=painel.getBoundingClientRect();
        painel.style.setProperty("width",chatLimitarV574(w0+(x-x0),380,window.innerWidth-r.left-6)+"px","important");
        painel.style.setProperty("height",chatLimitarV574(h0+(y-y0),300,window.innerHeight-r.top-6)+"px","important");
        e?.preventDefault();
    };
    const fim=()=>{if(ativo){ativo=false;chatSalvarPainelV574()}};

    alca.addEventListener("mousedown",e=>iniciar(e.clientX,e.clientY,e));
    document.addEventListener("mousemove",e=>mover(e.clientX,e.clientY,e));
    document.addEventListener("mouseup",fim);
    alca.addEventListener("touchstart",e=>{const t=e.touches[0];if(t)iniciar(t.clientX,t.clientY,e)},{passive:false});
    document.addEventListener("touchmove",e=>{const t=e.touches[0];if(t)mover(t.clientX,t.clientY,e)},{passive:false});
    document.addEventListener("touchend",fim);
}

document.addEventListener("DOMContentLoaded",()=>{
    const wrap=document.getElementById("chatWrap");
    const botao=document.getElementById("chatBotao");
    const painel=document.getElementById("chatPainel");
    const barra=document.getElementById("chatPainelDrag");

    chatRestaurarBotaoV574();
    chatAtivarArrasteV574(wrap,botao,chatSalvarBotaoV574,true);
    chatAtivarArrasteV574(painel,barra,chatSalvarPainelV574,false);
    chatAtivarResizeV574();
});

window.addEventListener("resize",()=>{
    chatRestaurarBotaoV574();
    const p=document.getElementById("chatPainel");
    if(p?.classList.contains("aberto"))chatRestaurarPainelV574();
});
