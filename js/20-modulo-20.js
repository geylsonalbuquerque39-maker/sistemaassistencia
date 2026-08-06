(function(){
    document.addEventListener("click",function(e){
        const botao=e.target.closest('#v698PerfilMenu button');
        if(!botao||!botao.textContent.includes("Ver perfil"))return;

        setTimeout(function(){
            const modal=document.getElementById("v698PerfilModal");
            const carregando=document.getElementById("v698PerfilCarregando");
            const conteudo=document.getElementById("v698PerfilConteudo");
            if(modal?.classList.contains("aberto")&&carregando?.style.display!=="none"){
                carregando.style.display="none";
                if(conteudo)conteudo.style.display="block";
            }
        },3500);
    },true);
})();
