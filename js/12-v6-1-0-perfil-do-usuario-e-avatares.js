/* =========================================================
   V6.1.0 - PERFIL DO USUÁRIO E AVATARES
   ========================================================= */
let perfilImagemV610=null;
let perfilImagemOriginalV610=null;
let perfilZoomAtualV610=1;
let perfilRotacaoV610=0;
let perfilOffsetXV610=0;
let perfilOffsetYV610=0;
let perfilArrastandoV610=false;
let perfilUltimoXV610=0;
let perfilUltimoYV610=0;
let perfilFotoAlteradaV610=false;
let perfilFotoRemoverV610=false;

function iniciaisPerfilV610(nome){
    return String(nome||"U").trim().split(/\s+/).slice(0,2).map(p=>p[0]||"").join("").toUpperCase()||"U";
}

function atualizarElementosAvatarV610(url,nome,idsImagem,idsFallback){
    const iniciais=iniciaisPerfilV610(nome);
    idsImagem.forEach((id,i)=>{
        const img=document.getElementById(id);
        const fallback=document.getElementById(idsFallback[i]);
        if(fallback)fallback.textContent=iniciais;

        if(img&&url){
            img.onload=()=>{
                img.style.display="block";
                if(fallback)fallback.style.display="none";
            };
            img.onerror=()=>{
                img.style.display="none";
                if(fallback)fallback.style.display="flex";
            };
            img.src=url+(url.includes("?")?"&":"?")+"v="+Date.now();
        }else{
            if(img){
                img.removeAttribute("src");
                img.style.display="none";
            }
            if(fallback)fallback.style.display="flex";
        }
    });
}

function alternarMenuPerfilV610(event){
    event?.stopPropagation();
    document.getElementById("usuarioMenuV610")?.classList.toggle("aberto");
}

document.addEventListener("click",event=>{
    if(!event.target.closest("#usuarioTopo")){
        document.getElementById("usuarioMenuV610")?.classList.remove("aberto");
    }
});

function avatarChatHTMLV610(usuario,status){
    const nome=usuario.nome||usuario.email||"Usuário";
    const iniciais=chatEscV57(chatIniciaisV57(nome));
    const url=usuario.avatar_url?chatEscV57(usuario.avatar_url):"";

    return "<div class='chat-avatar "+(url?"com-foto-v610":"")+"'>"+
        (url?"<img class='chat-avatar-img-v610' src='"+url+"' alt=''>":"")+
        "<span class='chat-avatar-iniciais-v610'>"+iniciais+"</span>"+
        "<span class='chat-status-dot "+status+"'></span>"+
        "</div>";
}

function aplicarAvatarChatCabecalhoV610(usuario){
    const avatar=document.getElementById("chatCabecalhoAvatar");
    if(!avatar)return;

    const nome=usuario.nome||usuario.email||"Usuário";
    avatar.classList.toggle("com-foto-v610",!!usuario.avatar_url);
    avatar.innerHTML=
        (usuario.avatar_url?"<img class='chat-avatar-img-v610' src='"+chatEscV57(usuario.avatar_url)+"' alt=''>":"")+
        "<span class='chat-avatar-iniciais-v610'>"+chatEscV57(chatIniciaisV57(nome))+"</span>";
}

function abrirPerfilUsuarioV610(abrirSeletor=false){
    if(!usuarioLogado)return;
    document.getElementById("usuarioMenuV610")?.classList.remove("aberto");

    document.getElementById("perfilNomeV610").value=usuarioLogado.nome||"";
    document.getElementById("perfilCargoV610").value=usuarioLogado.cargo||"";
    document.getElementById("perfilStatusV610").value=usuarioLogado.status_perfil||"online";
    document.getElementById("perfilRecadoV610").value=usuarioLogado.recado||"";
    document.getElementById("perfilRamalV610").value=usuarioLogado.ramal||"";
    document.getElementById("perfilAniversarioV610").value=usuarioLogado.aniversario||"";
    document.getElementById("perfilEmailV610").value=usuarioLogado.email||"";
    document.getElementById("perfilCanvasInicialV610").textContent=iniciaisPerfilV610(usuarioLogado.nome||usuarioLogado.email);
    document.getElementById("perfilMensagemV610").textContent="";

    resetarEditorFotoV610();
    document.getElementById("perfilModalV610")?.classList.add("aberto");
    document.getElementById("perfilModalV610")?.setAttribute("aria-hidden","false");

    if(usuarioLogado.avatar_url){
        carregarImagemURLPerfilV610(usuarioLogado.avatar_url);
    }else{
        desenharPerfilV610();
    }

    if(abrirSeletor)setTimeout(()=>document.getElementById("perfilArquivoV610")?.click(),180);
}

function fecharPerfilUsuarioV610(){
    document.getElementById("perfilModalV610")?.classList.remove("aberto");
    document.getElementById("perfilModalV610")?.setAttribute("aria-hidden","true");
}

function resetarEditorFotoV610(){
    perfilImagemV610=null;
    perfilImagemOriginalV610=null;
    perfilZoomAtualV610=1;
    perfilRotacaoV610=0;
    perfilOffsetXV610=0;
    perfilOffsetYV610=0;
    perfilFotoAlteradaV610=false;
    perfilFotoRemoverV610=false;

    const zoom=document.getElementById("perfilZoomV610");
    if(zoom)zoom.value="1";
}

function validarArquivoFotoV610(arquivo){
    if(!arquivo)return false;
    if(!["image/jpeg","image/png","image/webp"].includes(arquivo.type)){
        alert("Use uma imagem JPG, PNG ou WEBP.");
        return false;
    }
    if(arquivo.size>5*1024*1024){
        alert("A foto deve ter no máximo 5 MB.");
        return false;
    }
    return true;
}

function carregarImagemPerfilV610(arquivo){
    if(!validarArquivoFotoV610(arquivo))return;
    const leitor=new FileReader();
    leitor.onload=()=>carregarImagemBase64PerfilV610(leitor.result,true);
    leitor.readAsDataURL(arquivo);
}

function carregarImagemURLPerfilV610(url){
    const img=new Image();
    img.crossOrigin="anonymous";
    img.onload=()=>{
        perfilImagemV610=img;
        perfilImagemOriginalV610=img;
        document.getElementById("perfilCanvasVazioV610").style.display="none";
        desenharPerfilV610();
    };
    img.onerror=()=>desenharPerfilV610();
    img.src=url+(url.includes("?")?"&":"?")+"v="+Date.now();
}

function carregarImagemBase64PerfilV610(base64,alterada){
    const img=new Image();
    img.onload=()=>{
        perfilImagemV610=img;
        perfilImagemOriginalV610=img;
        perfilZoomAtualV610=1;
        perfilRotacaoV610=0;
        perfilOffsetXV610=0;
        perfilOffsetYV610=0;
        perfilFotoAlteradaV610=alterada;
        perfilFotoRemoverV610=false;
        document.getElementById("perfilCanvasVazioV610").style.display="none";
        document.getElementById("perfilZoomV610").value="1";
        desenharPerfilV610();
    };
    img.src=base64;
}

function atualizarZoomPerfilV610(valor){
    perfilZoomAtualV610=Number(valor)||1;
    perfilFotoAlteradaV610=true;
    desenharPerfilV610();
}

function girarImagemPerfilV610(graus){
    if(!perfilImagemV610)return;
    perfilRotacaoV610=(perfilRotacaoV610+graus)%360;
    perfilFotoAlteradaV610=true;
    desenharPerfilV610();
}

function removerFotoPerfilV610(){
    perfilImagemV610=null;
    perfilFotoRemoverV610=true;
    perfilFotoAlteradaV610=true;
    document.getElementById("perfilCanvasVazioV610").style.display="flex";
    desenharPerfilV610();
}

function desenharPerfilV610(){
    const canvas=document.getElementById("perfilCanvasV610");
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(!perfilImagemV610){
        document.getElementById("perfilCanvasVazioV610").style.display="flex";
        return;
    }

    document.getElementById("perfilCanvasVazioV610").style.display="none";

    const w=perfilImagemV610.naturalWidth||perfilImagemV610.width;
    const h=perfilImagemV610.naturalHeight||perfilImagemV610.height;
    const base=Math.max(canvas.width/w,canvas.height/h);
    const escala=base*perfilZoomAtualV610;
    const dw=w*escala;
    const dh=h*escala;

    ctx.save();
    ctx.beginPath();
    ctx.arc(canvas.width/2,canvas.height/2,canvas.width/2,0,Math.PI*2);
    ctx.clip();
    ctx.translate(canvas.width/2+perfilOffsetXV610,canvas.height/2+perfilOffsetYV610);
    ctx.rotate(perfilRotacaoV610*Math.PI/180);
    ctx.drawImage(perfilImagemV610,-dw/2,-dh/2,dw,dh);
    ctx.restore();
}

(function configurarArrastePerfilV610(){
    document.addEventListener("DOMContentLoaded",()=>{
        const canvas=document.getElementById("perfilCanvasV610");
        if(!canvas)return;

        const inicio=(x,y)=>{
            if(!perfilImagemV610)return;
            perfilArrastandoV610=true;
            perfilUltimoXV610=x;
            perfilUltimoYV610=y;
        };
        const mover=(x,y)=>{
            if(!perfilArrastandoV610)return;
            perfilOffsetXV610+=x-perfilUltimoXV610;
            perfilOffsetYV610+=y-perfilUltimoYV610;
            perfilUltimoXV610=x;
            perfilUltimoYV610=y;
            perfilFotoAlteradaV610=true;
            desenharPerfilV610();
        };
        const fim=()=>perfilArrastandoV610=false;

        canvas.addEventListener("mousedown",e=>inicio(e.clientX,e.clientY));
        window.addEventListener("mousemove",e=>mover(e.clientX,e.clientY));
        window.addEventListener("mouseup",fim);

        canvas.addEventListener("touchstart",e=>{
            const t=e.touches[0];
            inicio(t.clientX,t.clientY);
        },{passive:true});
        canvas.addEventListener("touchmove",e=>{
            const t=e.touches[0];
            mover(t.clientX,t.clientY);
        },{passive:true});
        canvas.addEventListener("touchend",fim);
    });
})();

function canvasBlobPerfilV610(){
    return new Promise((resolve,reject)=>{
        const canvas=document.getElementById("perfilCanvasV610");
        canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Não foi possível processar a foto.")),"image/webp",.88);
    });
}

async function salvarPerfilUsuarioV610(){
    if(!usuarioLogado)return;

    const botao=document.getElementById("perfilSalvarV610");
    const mensagem=document.getElementById("perfilMensagemV610");
    const nome=document.getElementById("perfilNomeV610").value.trim();
    const cargo=document.getElementById("perfilCargoV610").value.trim();
    const status=document.getElementById("perfilStatusV610").value;
    const recado=document.getElementById("perfilRecadoV610").value.trim();
    const ramal=document.getElementById("perfilRamalV610").value.trim();
    const aniversario=document.getElementById("perfilAniversarioV610").value||null;

    if(nome.length<3){
        mensagem.textContent="Informe um nome válido.";
        mensagem.style.color="#b00020";
        return;
    }

    botao.disabled=true;
    mensagem.textContent="Salvando perfil...";
    mensagem.style.color="#0064bd";

    try{
        const supabase=obterSupabaseClient();
        let avatarUrl=usuarioLogado.avatar_url||"";

        if(perfilFotoRemoverV610){
            await supabase.storage.from("avatars").remove([`${usuarioLogado.id}/perfil.webp`]);
            avatarUrl="";
        }else if(perfilImagemV610&&perfilFotoAlteradaV610){
            const blob=await canvasBlobPerfilV610();
            const caminho=`${usuarioLogado.id}/perfil.webp`;
            const {error:uploadError}=await supabase.storage.from("avatars").upload(caminho,blob,{
                contentType:"image/webp",
                upsert:true,
                cacheControl:"3600"
            });
            if(uploadError)throw uploadError;

            const {data:urlData}=supabase.storage.from("avatars").getPublicUrl(caminho);
            avatarUrl=urlData.publicUrl;
        }

        const {data,error}=await supabase.rpc("atualizar_meu_perfil_v610",{
            p_nome:nome,
            p_cargo:cargo,
            p_avatar_url:avatarUrl,
            p_status_perfil:status,
            p_recado:recado,
            p_ramal:ramal,
            p_aniversario:aniversario
        });
        if(error)throw error;

        usuarioLogado={
            ...usuarioLogado,
            nome,
            cargo,
            avatar_url:avatarUrl,
            status_perfil:status,
            recado,
            ramal,
            aniversario:aniversario||""
        };

        atualizarUsuarioTopo();
        await carregarUsuariosChatV57();
        if(chatUsuarioAtualV57){
            const atualizado=chatUsuariosV57.find(u=>u.id===chatUsuarioAtualV57.id);
            if(atualizado){
                chatUsuarioAtualV57=atualizado;
                aplicarAvatarChatCabecalhoV610(atualizado);
            }
        }

        mensagem.textContent="Perfil salvo com sucesso.";
        mensagem.style.color="#14833b";
        setTimeout(fecharPerfilUsuarioV610,700);
    }catch(e){
        mensagem.textContent="Erro ao salvar: "+(e?.message||e);
        mensagem.style.color="#b00020";
    }finally{
        botao.disabled=false;
    }
}

document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&document.getElementById("perfilModalV610")?.classList.contains("aberto")){
        fecharPerfilUsuarioV610();
    }
});
