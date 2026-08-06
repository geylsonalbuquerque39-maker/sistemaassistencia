(function(){
    "use strict";

    let selecionadoId="";
    let selecionadoDados=null;
    let timerPresenca=null;

    function esc(v){
        if(typeof chatEscV57==="function")return chatEscV57(v);
        return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
    }
    function iniciais(nome){
        if(typeof chatIniciaisV57==="function")return chatIniciaisV57(nome);
        return String(nome||"U").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"U";
    }
    function statusReal(item){
        if(typeof classificarPresencaV56==="function")return classificarPresencaV56(item||{});
        const idade=Date.now()-new Date(item?.last_seen||item?.updated_at||0).getTime();
        if(item?.status==="offline"||!Number.isFinite(idade)||idade>120000)return "offline";
        if(item?.status==="ausente"||idade>180000)return "ausente";
        return "online";
    }
    function aniversario(v){
        if(!v)return "Não informado";
        const p=String(v).split("-");
        return p.length===3?p[2]+"/"+p[1]:"Não informado";
    }
    function tempo(v){
        if(!v)return "Sem registro";
        return typeof tempoRelativoPresencaV56==="function"?tempoRelativoPresencaV56(v):new Date(v).toLocaleString("pt-BR");
    }

    window.v698AbrirMenu=function(event,id,dados){
        event?.preventDefault();
        event?.stopPropagation();
        if(!id)return;
        selecionadoId=String(id);
        selecionadoDados=dados||null;

        const menu=document.getElementById("v698PerfilMenu");
        const conversar=document.getElementById("v698BtnConversarMenu");
        if(!menu)return;

        if(conversar)conversar.style.display=String(id)===String((typeof usuarioLogado!=="undefined"?usuarioLogado:null)?.id)?"none":"block";
        const x=Math.min(event?.clientX||20,window.innerWidth-210);
        const y=Math.min(event?.clientY||20,window.innerHeight-125);
        menu.style.left=Math.max(8,x)+"px";
        menu.style.top=Math.max(8,y)+"px";
        menu.classList.add("aberto");
    };

    window.v698FecharMenu=function(){
        document.getElementById("v698PerfilMenu")?.classList.remove("aberto");
    };

    window.v698VerPerfil=async function(){
        v698FecharMenu();
        if(!selecionadoId)return;
        await abrirPerfil(selecionadoId,selecionadoDados);
    };

    async function buscarUsuario(id,fallback){
        let usuario=fallback||null;
        let presenca=null;
        try{
            const sb=typeof obterSupabaseClient==="function"?obterSupabaseClient():null;
            if(sb){
                const [ur,pr]=await Promise.all([
                    sb.from("usuarios").select("*").eq("id",id).maybeSingle(),
                    sb.from(typeof PRESENCA_V56_TABELA!=="undefined"?PRESENCA_V56_TABELA:"presenca_usuarios")
                      .select("user_id,nome,email,perfil,status,tela,contexto,last_seen,updated_at")
                      .eq("user_id",id).maybeSingle()
                ]);
                if(!ur.error&&ur.data)usuario={...(usuario||{}),...ur.data};
                if(!pr.error&&pr.data)presenca=pr.data;
            }
        }catch(e){
            console.warn("Perfil público V6.9.8:",e?.message||e);
        }

        if(!usuario&&Array.isArray(window.chatUsuariosV57)){
            usuario=window.chatUsuariosV57.find(u=>String(u.id)===String(id))||null;
        }
        if(!presenca&&Array.isArray(window.presencasListaV56)){
            presenca=window.presencasListaV56.find(p=>String(p.user_id)===String(id))||null;
        }
        return {...(usuario||{}),...(presenca||{}),id:(usuario?.id||id)};
    }

    async function abrirPerfil(id,fallback){
        const modal=document.getElementById("v698PerfilModal");
        const carregando=document.getElementById("v698PerfilCarregando");
        const conteudo=document.getElementById("v698PerfilConteudo");
        if(!modal)return;

        modal.classList.add("aberto");
        modal.setAttribute("aria-hidden","false");
        carregando.style.display="block";
        carregando.textContent="Carregando perfil...";
        conteudo.style.display="none";

        try{
            const u=await Promise.race([
                buscarUsuario(id,fallback),
                new Promise(resolve=>setTimeout(()=>resolve(fallback||{}),3000))
            ]);
            selecionadoDados=u;
            const nome=u.nome||u.email||"Usuário";
            const s=statusReal(u);

            const avatar=document.getElementById("v698PerfilAvatar");
            avatar.innerHTML=u.avatar_url
                ?"<img src='"+esc(u.avatar_url)+"' alt='Foto de perfil'>"
                :esc(iniciais(nome));

            document.getElementById("v698PerfilNome").textContent=nome;
            document.getElementById("v698PerfilCargo").textContent=u.cargo||"Cargo não informado";
            document.getElementById("v698PerfilRecado").textContent=u.recado||"Nenhum recado informado.";
            document.getElementById("v698PerfilEmail").textContent=u.email||"Não informado";
            document.getElementById("v698PerfilTipo").textContent=
                typeof nomePerfilUsuario==="function"?nomePerfilUsuario(u.perfil):(u.perfil||"Não informado");
            document.getElementById("v698PerfilRamal").textContent=u.ramal||"Não informado";
            document.getElementById("v698PerfilAniversario").textContent=aniversario(u.aniversario);
            document.getElementById("v698PerfilUltima").textContent=tempo(u.last_seen||u.updated_at);
            document.getElementById("v698PerfilTela").textContent=
                [u.tela,u.contexto].filter(Boolean).join(" • ")||"Sem atividade informada";

            const st=document.getElementById("v698PerfilStatus");
            st.className=s;
            st.textContent=s==="online"?"🟢 Online":s==="ausente"?"🟡 Ausente":"⚫ Offline";

            const conversa=document.getElementById("v698BtnConversarModal");
            if(conversa)conversa.style.display=String(id)===String((typeof usuarioLogado!=="undefined"?usuarioLogado:null)?.id)?"none":"inline-block";

            carregando.style.display="none";
            conteudo.style.display="block";
        }catch(e){
            console.warn("Perfil público V6.9.8F:",e?.message||e);
            carregando.style.display="none";
            conteudo.style.display="block";
            const nomeEl=document.getElementById("v698PerfilNome");
            if(nomeEl&&!nomeEl.textContent.trim())nomeEl.textContent="Usuário";
        }
    }

    window.v698FecharPerfil=function(){
        const modal=document.getElementById("v698PerfilModal");
        modal?.classList.remove("aberto");
        modal?.setAttribute("aria-hidden","true");
    };

    window.v698AbrirConversa=async function(){
        const id=selecionadoId;
        if(!id||String(id)===String((typeof usuarioLogado!=="undefined"?usuarioLogado:null)?.id))return;
        v698FecharMenu();
        v698FecharPerfil();

        try{
            if(typeof carregarUsuariosChatV57==="function")await carregarUsuariosChatV57();
            const usuario=Array.isArray(window.chatUsuariosV57)
                ?window.chatUsuariosV57.find(u=>String(u.id)===String(id))
                :null;
            if(!usuario){
                alert("Este usuário não está disponível no chat.");
                return;
            }
            const painel=document.getElementById("chatPainel");
            painel?.classList.add("aberto");
            document.getElementById("chatWrap")?.classList.add("aberto");
            await abrirConversaChatV57(null,usuario.id);
        }catch(e){
            alert("Não foi possível abrir a conversa: "+(e?.message||e));
        }
    };

    async function mesclarPresencaNoChat(){
        if(typeof usuarioLogado==="undefined"||!usuarioLogado?.id||typeof obterSupabaseClient!=="function")return;
        try{
            const {data,error}=await obterSupabaseClient()
                .from(typeof PRESENCA_V56_TABELA!=="undefined"?PRESENCA_V56_TABELA:"presenca_usuarios")
                .select("user_id,nome,email,perfil,status,tela,contexto,last_seen,updated_at");
            if(error)throw error;

            const mapa=new Map((data||[]).map(p=>[String(p.user_id),p]));
            if(Array.isArray(window.chatUsuariosV57)){
                window.chatUsuariosV57=window.chatUsuariosV57.map(u=>{
                    const p=mapa.get(String(u.id));
                    return p?{...u,...p,id:u.id}:u;
                });
            }

            if(window.chatUsuarioAtualV57){
                const p=mapa.get(String(window.chatUsuarioAtualV57.id));
                if(p){
                    window.chatUsuarioAtualV57={...window.chatUsuarioAtualV57,...p,id:window.chatUsuarioAtualV57.id};
                    const st=document.getElementById("chatCabecalhoStatus");
                    if(st&&typeof chatStatusTextoV57==="function")st.textContent=chatStatusTextoV57(window.chatUsuarioAtualV57);
                }
            }

            if(typeof renderizarUsuariosChatV57==="function")renderizarUsuariosChatV57();
            anotarPerfisChat();
        }catch(e){
            console.warn("Presença real do chat V6.9.8:",e?.message||e);
        }
    }

    function anotarPerfisChat(){
        document.querySelectorAll("#chatUsuarios .chat-usuario").forEach(btn=>{
            let id="";
            const codigo=btn.getAttribute("onclick")||"";
            const m=codigo.match(/abrirConversaChatV57\(event,'([^']+)'\)/);
            if(m)id=m[1];

            const usuario=Array.isArray(window.chatUsuariosV57)
                ?window.chatUsuariosV57.find(u=>String(u.id)===String(id))
                :null;

            const avatar=btn.querySelector(".chat-avatar");
            const info=btn.querySelector(".chat-usuario-info");

            // Clicar no nome ou em qualquer área da pessoa mantém o evento
            // original do botão e abre a conversa imediatamente.
            if(info){
                info.classList.remove("v698-perfil-clicavel");
                info.removeAttribute("title");
                info.onclick=null;
            }

            // Somente a foto abre o visualizador em tela cheia.
            if(avatar&&id){
                avatar.classList.add("v698-perfil-clicavel");
                avatar.title=usuario?.avatar_url
                    ?"Ver foto em tela cheia"
                    :"Usuário sem foto de perfil";
                avatar.onclick=function(ev){
                    if(!usuario?.avatar_url)return;
                    ev.preventDefault();
                    ev.stopPropagation();
                    if(typeof ev.stopImmediatePropagation==="function")ev.stopImmediatePropagation();
                    if(typeof window.v698AbrirFotoGrande==="function"){
                        window.v698AbrirFotoGrande(usuario.avatar_url);
                    }
                };
            }
        });

        const cab=document.getElementById("chatCabecalhoAvatar");
        if(cab&&window.chatUsuarioAtualV57){
            const usuario=window.chatUsuarioAtualV57;
            cab.classList.add("v698-perfil-clicavel");
            cab.title=usuario.avatar_url
                ?"Ver foto em tela cheia"
                :"Usuário sem foto de perfil";
            cab.onclick=function(ev){
                if(!usuario.avatar_url)return;
                ev.preventDefault();
                ev.stopPropagation();
                if(typeof ev.stopImmediatePropagation==="function")ev.stopImmediatePropagation();
                if(typeof window.v698AbrirFotoGrande==="function"){
                    window.v698AbrirFotoGrande(usuario.avatar_url);
                }
            };
        }

        // O nome do cabeçalho não abre menu de perfil.
        const nomeCab=document.getElementById("chatCabecalhoNome");
        if(nomeCab){
            nomeCab.classList.remove("v698-perfil-clicavel");
            nomeCab.removeAttribute("title");
            nomeCab.onclick=null;
        }
    }

    function anotarPresencas(){
        document.querySelectorAll("#presencaLista .presenca-item").forEach((item,idx)=>{
            const p=Array.isArray(window.presencasListaV56)?window.presencasListaV56[idx]:null;
            if(!p?.user_id)return;
            [item.querySelector(".presenca-avatar"),item.querySelector(".presenca-identidade")].forEach(el=>{
                if(!el)return;
                el.classList.add("v698-perfil-clicavel");
                el.title="Opções do perfil";
                el.onclick=function(ev){v698AbrirMenu(ev,p.user_id,p)};
            });
        });
    }

    function anotarTabelaUsuarios(){
        const linhas=document.querySelectorAll("#usuariosTabela tbody tr");
        linhas.forEach(tr=>{
            const nomeTd=tr.querySelector("td");
            if(!nomeTd||nomeTd.dataset.v698Pronto)return;
            const nome=nomeTd.textContent.trim();
            const usuario=Array.isArray(window.usuariosAdminCache)
                ?window.usuariosAdminCache.find(u=>String(u.nome||"").trim()===nome)
                :null;
            if(!usuario?.id)return;
            nomeTd.dataset.v698Pronto="1";
            nomeTd.innerHTML="<button type='button' class='v698-perfil-link'>"+esc(nome)+"</button>";
            nomeTd.querySelector("button").onclick=function(ev){v698AbrirMenu(ev,usuario.id,usuario)};
        });
    }

    // Inicialização atrasada: absolutamente nada do chat/perfil é alterado
    // enquanto a tela de login estiver aberta.
    let v698Ativado=false;

    function v698LoginConcluido(){
        if(typeof usuarioLogado==="undefined" || !usuarioLogado?.id)return false;
        const tela=document.getElementById("telaLogin");
        if(!tela)return true;
        const estilo=getComputedStyle(tela);
        return estilo.display==="none" || estilo.visibility==="hidden";
    }

    function v698AtivarDepoisDoLogin(){
        if(v698Ativado || !v698LoginConcluido())return;
        v698Ativado=true;

        // Wrappers seguros: preservam as funções originais e só anotam
        // os elementos após eles já terem sido renderizados.
        if(typeof renderizarUsuariosChatV57==="function"){
            const originalRenderChat=renderizarUsuariosChatV57;
            window.renderizarUsuariosChatV57=function(){
                const r=originalRenderChat.apply(this,arguments);
                setTimeout(anotarPerfisChat,0);
                return r;
            };
        }

        if(typeof aplicarAvatarChatCabecalhoV610==="function"){
            const originalCab=aplicarAvatarChatCabecalhoV610;
            window.aplicarAvatarChatCabecalhoV610=function(){
                const r=originalCab.apply(this,arguments);
                setTimeout(anotarPerfisChat,0);
                return r;
            };
        }

        if(typeof renderizarPresencasV56==="function"){
            const originalPresenca=renderizarPresencasV56;
            window.renderizarPresencasV56=function(){
                const r=originalPresenca.apply(this,arguments);
                setTimeout(anotarPresencas,0);
                return r;
            };
        }

        if(typeof renderizarUsuariosAdmin==="function"){
            const originalAdmin=renderizarUsuariosAdmin;
            window.renderizarUsuariosAdmin=function(){
                const r=originalAdmin.apply(this,arguments);
                setTimeout(anotarTabelaUsuarios,0);
                return r;
            };
        }

        // Não substitui carregarUsuariosChatV57.
        // A presença é atualizada de forma independente, evitando recursão
        // ou interferência no carregamento original do chat.
        mesclarPresencaNoChat();
        anotarPerfisChat();
        anotarPresencas();
        anotarTabelaUsuarios();

        clearInterval(timerPresenca);
        timerPresenca=setInterval(function(){
            if(v698LoginConcluido()){
                mesclarPresencaNoChat();
                anotarPerfisChat();
                anotarPresencas();
                anotarTabelaUsuarios();
            }
        },10000);
    }

    document.addEventListener("click",function(e){
        if(!e.target.closest("#v698PerfilMenu"))v698FecharMenu();
        if(e.target===document.getElementById("v698PerfilModal"))v698FecharPerfil();
    });

    document.addEventListener("keydown",function(e){
        if(e.key==="Escape"){v698FecharMenu();v698FecharPerfil()}
    });

    // Apenas observa quando o login terminar. Não toca em fazerLogin,
    // autenticação, sessão, Supabase ou DOMContentLoaded original.
    const v698AguardarLogin=setInterval(function(){
        if(v698LoginConcluido()){
            clearInterval(v698AguardarLogin);
            v698AtivarDepoisDoLogin();
        }
    },700);

    window.addEventListener("load",function(){
        setTimeout(v698AtivarDepoisDoLogin,1200);
    });
})();
