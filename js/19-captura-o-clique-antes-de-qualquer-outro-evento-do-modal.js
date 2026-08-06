(function(){
    "use strict";

    function abrirFotoDoPerfil(ev){
        const avatar=ev.target.closest("#v698PerfilAvatar");
        if(!avatar)return;

        const img=avatar.querySelector("img");
        if(!img||!img.src)return;

        ev.preventDefault();
        ev.stopPropagation();
        if(typeof ev.stopImmediatePropagation==="function")ev.stopImmediatePropagation();

        if(typeof window.v698AbrirFotoGrande==="function"){
            window.v698AbrirFotoGrande(img.currentSrc||img.src);
        }
    }

    // Captura o clique antes de qualquer outro evento do modal.
    document.addEventListener("click",abrirFotoDoPerfil,true);

    // Suporte também para toque em celular.
    document.addEventListener("touchend",function(ev){
        const avatar=ev.target.closest?.("#v698PerfilAvatar");
        if(!avatar)return;
        const img=avatar.querySelector("img");
        if(!img||!img.src)return;

        ev.preventDefault();
        ev.stopPropagation();
        if(typeof window.v698AbrirFotoGrande==="function"){
            window.v698AbrirFotoGrande(img.currentSrc||img.src);
        }
    },{capture:true,passive:false});

    // O observador principal acima já acompanha a troca da foto.
})();
