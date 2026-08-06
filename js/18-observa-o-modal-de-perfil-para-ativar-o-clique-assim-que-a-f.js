(function(){
    "use strict";

    let escala=1;
    let deslocX=0;
    let deslocY=0;
    let arrastando=false;
    let inicioX=0;
    let inicioY=0;
    let origemX=0;
    let origemY=0;

    function aplicarTransform(){
        const img=document.getElementById("v698FotoGrande");
        const txt=document.getElementById("v698FotoZoomTexto");
        if(!img)return;
        img.style.transform=`translate(${deslocX}px,${deslocY}px) scale(${escala})`;
        if(txt)txt.textContent=Math.round(escala*100)+"%";
        img.style.cursor=escala>1?"grab":"zoom-in";
    }

    window.v698AbrirFotoGrande=function(url){
        if(!url)return;
        const modal=document.getElementById("v698FotoModal");
        const img=document.getElementById("v698FotoGrande");
        if(!modal||!img)return;

        escala=1;
        deslocX=0;
        deslocY=0;
        img.src=url;
        aplicarTransform();

        modal.classList.add("aberto");
        modal.setAttribute("aria-hidden","false");
        document.body.style.overflow="hidden";
    };

    window.v698FecharFotoGrande=function(){
        const modal=document.getElementById("v698FotoModal");
        if(!modal)return;
        modal.classList.remove("aberto");
        modal.setAttribute("aria-hidden","true");
        document.body.style.overflow="";
        escala=1;
        deslocX=0;
        deslocY=0;
    };

    window.v698AlterarZoom=function(delta){
        escala=Math.min(4,Math.max(1,escala+delta));
        if(escala===1){
            deslocX=0;
            deslocY=0;
        }
        aplicarTransform();
    };

    window.v698ResetarZoom=function(){
        escala=1;
        deslocX=0;
        deslocY=0;
        aplicarTransform();
    };

    function habilitarCliqueAvatar(){
        const avatar=document.getElementById("v698PerfilAvatar");
        if(!avatar)return;

        const img=avatar.querySelector("img");
        if(img&&img.src){
            if(!avatar.classList.contains("tem-foto"))avatar.classList.add("tem-foto");
            if(avatar.title!=="Clique para ampliar a foto")avatar.title="Clique para ampliar a foto";
            if(!avatar.dataset.v698FotoClique){
                avatar.dataset.v698FotoClique="1";
                avatar.onclick=function(e){
                    e.stopPropagation();
                    const foto=avatar.querySelector("img");
                    if(foto?.src)v698AbrirFotoGrande(foto.currentSrc||foto.src);
                };
            }
        }else{
            avatar.classList.remove("tem-foto");
            avatar.onclick=null;
            delete avatar.dataset.v698FotoClique;
            avatar.removeAttribute("title");
        }
    }

    // Observa o modal de perfil para ativar o clique assim que a foto for carregada.
    const alvo=document.getElementById("v698PerfilAvatar");
    if(alvo){
        const obs=new MutationObserver(habilitarCliqueAvatar);
        obs.observe(alvo,{childList:true,subtree:true});
        habilitarCliqueAvatar();
    }

    const modal=document.getElementById("v698FotoModal");
    const viewport=document.getElementById("v698FotoViewport");
    const img=document.getElementById("v698FotoGrande");

    modal?.addEventListener("click",function(e){
        if(e.target===modal||e.target===viewport)v698FecharFotoGrande();
    });

    viewport?.addEventListener("wheel",function(e){
        e.preventDefault();
        v698AlterarZoom(e.deltaY<0?0.2:-0.2);
    },{passive:false});

    img?.addEventListener("dblclick",function(e){
        e.preventDefault();
        if(escala===1){
            escala=2;
        }else{
            escala=1;
            deslocX=0;
            deslocY=0;
        }
        aplicarTransform();
    });

    img?.addEventListener("mousedown",function(e){
        if(escala<=1)return;
        arrastando=true;
        inicioX=e.clientX;
        inicioY=e.clientY;
        origemX=deslocX;
        origemY=deslocY;
        img.classList.add("arrastando");
        e.preventDefault();
    });

    window.addEventListener("mousemove",function(e){
        if(!arrastando)return;
        deslocX=origemX+(e.clientX-inicioX);
        deslocY=origemY+(e.clientY-inicioY);
        aplicarTransform();
    });

    window.addEventListener("mouseup",function(){
        arrastando=false;
        img?.classList.remove("arrastando");
    });

    document.addEventListener("keydown",function(e){
        if(e.key==="Escape"&&document.getElementById("v698FotoModal")?.classList.contains("aberto")){
            e.stopImmediatePropagation();
            v698FecharFotoGrande();
        }
    },true);

    // Reaplica após abertura do perfil público.
    if(typeof window.v698VerPerfil==="function"){
        const originalVerPerfil=window.v698VerPerfil;
        window.v698VerPerfil=async function(){
            const r=await originalVerPerfil.apply(this,arguments);
            setTimeout(habilitarCliqueAvatar,120);
            return r;
        };
    }
})();
