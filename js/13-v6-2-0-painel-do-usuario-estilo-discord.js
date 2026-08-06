/* =========================================================
   V6.2.0 - PAINEL DO USUÁRIO ESTILO DISCORD
   ========================================================= */

function atualizarPainelUsuarioV620(){
    if(!usuarioLogado)return;

    const nome=document.getElementById("painelUsuarioNomeV620");
    const cargo=document.getElementById("painelUsuarioCargoV620");
    if(nome)nome.textContent=usuarioLogado.nome||usuarioLogado.email||"Usuário";
    if(cargo)cargo.textContent=usuarioLogado.cargo||PERFIS_NOME?.[usuarioLogado.perfil]||usuarioLogado.perfil||"Usuário";

    atualizarElementosAvatarV610(
        usuarioLogado.avatar_url,
        usuarioLogado.nome||usuarioLogado.email,
        ["painelAvatarImagemV620"],
        ["painelAvatarFallbackV620"]
    );

    aplicarStatusPainelV620(usuarioLogado.status_perfil||"online");
}

function aplicarStatusPainelV620(status){
    const mapa={
        online:{icone:"🟢",texto:"Online",classe:""},
        ausente:{icone:"🟡",texto:"Ausente",classe:"ausente"},
        ocupado:{icone:"🔴",texto:"Ocupado",classe:"ocupado"}
    };
    const info=mapa[status]||mapa.online;

    const icone=document.getElementById("painelStatusIconeV620");
    const texto=document.getElementById("painelStatusTextoV620");
    const bolinha=document.getElementById("painelStatusBolinhaV620");

    if(icone)icone.textContent=info.icone;
    if(texto)texto.textContent=info.texto;
    if(bolinha){
        bolinha.classList.remove("ausente","ocupado");
        if(info.classe)bolinha.classList.add(info.classe);
    }
}

function alternarMenuUsuarioV620(event){
    event?.stopPropagation();
    document.getElementById("painelStatusMenuV620")?.classList.remove("aberto");
    document.getElementById("painelMenuUsuarioV620")?.classList.toggle("aberto");
}

function alternarMenuStatusV620(event){
    event?.stopPropagation();
    document.getElementById("painelMenuUsuarioV620")?.classList.remove("aberto");
    document.getElementById("painelStatusMenuV620")?.classList.toggle("aberto");
}

document.addEventListener("click",event=>{
    if(!event.target.closest("#painelUsuarioV620")){
        document.getElementById("painelMenuUsuarioV620")?.classList.remove("aberto");
        document.getElementById("painelStatusMenuV620")?.classList.remove("aberto");
    }
});

async function alterarStatusUsuarioV620(status){
    if(!["online","ausente","ocupado"].includes(status)||!usuarioLogado)return;

    const antigo=usuarioLogado.status_perfil||"online";
    usuarioLogado.status_perfil=status;
    aplicarStatusPainelV620(status);
    document.getElementById("painelStatusMenuV620")?.classList.remove("aberto");

    try{
        const {error}=await obterSupabaseClient().rpc("alterar_meu_status_v620",{
            p_status:status
        });
        if(error)throw error;

        if(typeof carregarUsuariosChatV57==="function"){
            await carregarUsuariosChatV57();
        }
    }catch(e){
        usuarioLogado.status_perfil=antigo;
        aplicarStatusPainelV620(antigo);
        alert("Não foi possível alterar o status: "+(e?.message||e));
    }
}

async function abrirChatPainelV620(event){
    event?.preventDefault();
    event?.stopPropagation();

    document.getElementById("painelMenuUsuarioV620")?.classList.remove("aberto");
    document.getElementById("painelStatusMenuV620")?.classList.remove("aberto");
    document.getElementById("painelConfigV620")?.classList.remove("aberto");

    if(typeof exigirLogin==="function"&&!exigirLogin())return;

    const painel=document.getElementById("chatPainel");
    const wrap=document.getElementById("chatWrap");

    if(!painel){
        alert("O painel do chat não foi encontrado.");
        return;
    }

    // Remove estilos artificiais deixados pelas versões anteriores.
    painel.style.removeProperty("display");
    painel.style.removeProperty("visibility");
    painel.style.removeProperty("pointer-events");
    painel.style.removeProperty("opacity");
    painel.removeAttribute("aria-hidden");

    if(wrap){
        wrap.style.removeProperty("display");
        wrap.style.removeProperty("visibility");
        wrap.style.removeProperty("pointer-events");
        wrap.classList.remove("aberto");
    }

    // Usa exatamente o mesmo estado do botão flutuante oficial.
    painel.classList.add("aberto");
    document.body.classList.add("chat-aberto-v653");
    const copilotoFab=document.getElementById("copilotoFab");
    if(copilotoFab){
        copilotoFab.classList.add("oculto-chat-v653");
        copilotoFab.setAttribute("aria-hidden","true");
        copilotoFab.style.pointerEvents="none";
    }

    try{
        if(typeof chatRestaurarPainelV574==="function"){
            chatRestaurarPainelV574();
        }
        if(typeof inicializarChatV57==="function"){
            await inicializarChatV57();
        }
    }catch(e){
        console.error("Falha ao abrir o chat pelo perfil:",e);
    }

    requestAnimationFrame(()=>{
        if(typeof corrigirEstruturaLayoutV621==="function"){
            corrigirEstruturaLayoutV621();
        }
    });
}

function abrirConfiguracoesPainelV620(){
    document.getElementById("painelMenuUsuarioV620")?.classList.remove("aberto");
    document.getElementById("painelConfigV620")?.classList.add("aberto");
}

function fecharConfiguracoesPainelV620(){
    document.getElementById("painelConfigV620")?.classList.remove("aberto");
}

function alternarTemaV620(){
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("erp_tema_v620",document.body.classList.contains("dark-mode")?"dark":"light");
}

async function solicitarNotificacoesV620(){
    if(!("Notification" in window)){
        alert("Este navegador não suporta notificações.");
        return;
    }
    const permissao=await Notification.requestPermission();
    alert(permissao==="granted"?"Notificações ativadas.":"Permissão não concedida.");
}

function salvarPreferenciaSomV620(valor){
    localStorage.setItem("erp_som_chat_v620",valor?"1":"0");
}

document.addEventListener("DOMContentLoaded",()=>{
    const tema=localStorage.getItem("erp_tema_v620");
    if(tema==="dark")document.body.classList.add("dark-mode");

    const som=localStorage.getItem("erp_som_chat_v620");
    const campo=document.getElementById("painelSomChatV620");
    if(campo&&som!==null)campo.checked=som==="1";

    setTimeout(atualizarPainelUsuarioV620,800);
});

// Mantém o painel sincronizado sempre que o topo/perfil for atualizado.
if(typeof atualizarUsuarioTopo==="function"){
    const atualizarUsuarioTopoOriginalV620=atualizarUsuarioTopo;
    atualizarUsuarioTopo=function(){
        atualizarUsuarioTopoOriginalV620.apply(this,arguments);
        atualizarPainelUsuarioV620();
    };
}

document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
        fecharConfiguracoesPainelV620();
        document.getElementById("painelMenuUsuarioV620")?.classList.remove("aberto");
        document.getElementById("painelStatusMenuV620")?.classList.remove("aberto");
    }
});
