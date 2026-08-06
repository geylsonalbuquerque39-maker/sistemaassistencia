(function(){
    "use strict";
    let timerPresencaV725=null;

    function escV725(v){return typeof chatEscV57==="function"?chatEscV57(v):String(v??"")}
    function anexosV725(v){return typeof normalizarAnexosV600==="function"?normalizarAnexosV600(v):(Array.isArray(v)?v:[])}

    window.chatV725FecharMenu=function(){
        const menu=document.getElementById("chatMenuCabecalhoV725");
        menu?.classList.remove("aberto");menu?.setAttribute("aria-hidden","true");
    };
    function abrirMenuCabecalhoV725(ev){
        if(!chatUsuarioAtualV57)return;
        const menu=document.getElementById("chatMenuCabecalhoV725");if(!menu)return;
        const cab=document.getElementById("chatCabecalho");
        const r=cab?.getBoundingClientRect();
        const x=Math.min((r?.left||ev.clientX||15)+70,window.innerWidth-300);
        const y=Math.min((r?.bottom||ev.clientY||15)+6,window.innerHeight-230);
        menu.style.left=Math.max(8,x)+"px";menu.style.top=Math.max(8,y)+"px";
        menu.classList.add("aberto");menu.setAttribute("aria-hidden","false");
    }
    window.chatV725Pesquisar=function(){chatV725FecharMenu();if(typeof alternarPesquisaChatV600==="function")alternarPesquisaChatV600()};
    window.chatV725AbrirPerfil=function(){
        chatV725FecharMenu();
        if(!chatUsuarioAtualV57)return;
        if(typeof window.v698AbrirMenu==="function"){
            const r=document.getElementById("chatCabecalho")?.getBoundingClientRect();
            window.v698AbrirMenu({preventDefault(){},stopPropagation(){},clientX:(r?.left||20)+80,clientY:(r?.bottom||20)},chatUsuarioAtualV57.id,chatUsuarioAtualV57);
            if(typeof window.v698VerPerfil==="function")window.v698VerPerfil();
        }
    };
    window.chatV725FecharMidias=function(){const m=document.getElementById("chatMidiasModalV725");m?.classList.remove("aberto");m?.setAttribute("aria-hidden","true")};
    window.chatV725AbrirMidias=function(aba){chatV725FecharMenu();const m=document.getElementById("chatMidiasModalV725");m?.classList.add("aberto");m?.setAttribute("aria-hidden","false");chatV725RenderMidias(aba||"midias")};
    window.chatV725RenderMidias=function(aba){
        const area=document.getElementById("chatMidiasConteudoV725");if(!area)return;
        document.querySelectorAll(".chat-midias-abas-v725 button").forEach(b=>b.classList.toggle("ativo",b.dataset.aba===aba));
        const itens=[];
        (chatMensagensV57||[]).forEach(m=>{
            anexosV725(m.anexos).forEach(a=>{
                const tipo=String(a.tipo||"").toLowerCase(),url=String(a.url||"");if(!url)return;
                const midia=tipo.startsWith("image/")||tipo.startsWith("video/")||tipo.startsWith("audio/");
                if((aba==="midias"&&midia)||(aba==="documentos"&&!midia))itens.push({tipo,url,nome:a.nome||"Arquivo"});
            });
            if(aba==="links"){
                const encontrados=String(m.mensagem||"").match(/https?:\/\/[^\s<]+/gi)||[];
                encontrados.forEach(url=>itens.push({tipo:"link",url,nome:url}));
            }
        });
        if(!itens.length){area.innerHTML="<div class='chat-midias-vazio-v725'>Nenhum conteúdo encontrado nesta conversa.</div>";return}
        area.innerHTML="<div class='chat-midias-grade-v725'>"+itens.reverse().map(i=>{
            const url=escV725(i.url),nome=escV725(i.nome);
            if(i.tipo.startsWith("image/"))return `<div class="chat-midia-item-v725"><a href="${url}" target="_blank"><img src="${url}" alt="${nome}"></a></div>`;
            if(i.tipo.startsWith("video/"))return `<div class="chat-midia-item-v725"><video controls src="${url}"></video><a href="${url}" target="_blank">${nome}</a></div>`;
            if(i.tipo.startsWith("audio/"))return `<div class="chat-midia-item-v725"><audio controls src="${url}"></audio><a href="${url}" target="_blank">${nome}</a></div>`;
            return `<div class="chat-midia-item-v725"><a href="${url}" target="_blank" rel="noopener">📎 ${nome}</a></div>`;
        }).join("")+"</div>";
    };

    async function atualizarPresencaChatV725(){
        if(!usuarioLogado?.id||typeof obterSupabaseClient!=="function")return;
        try{
            const tabela=typeof PRESENCA_V56_TABELA!=="undefined"?PRESENCA_V56_TABELA:"presenca_usuarios";
            const {data,error}=await obterSupabaseClient().from(tabela).select("user_id,status,last_seen,updated_at,tela,contexto");
            if(error)throw error;
            const mapa=new Map((data||[]).map(p=>[String(p.user_id),p]));
            // Usa diretamente as variáveis internas do chat. Top-level let não pertence a window.
            if(Array.isArray(chatUsuariosV57)){
                chatUsuariosV57=chatUsuariosV57.map(u=>{const p=mapa.get(String(u.id));return p?{...u,...p,id:u.id}:u});
            }
            if(chatUsuarioAtualV57){
                const p=mapa.get(String(chatUsuarioAtualV57.id));
                if(p)chatUsuarioAtualV57={...chatUsuarioAtualV57,...p,id:chatUsuarioAtualV57.id};
                const st=document.getElementById("chatCabecalhoStatus");
                if(st)st.textContent=chatStatusTextoV57(chatUsuarioAtualV57);
            }
            renderizarUsuariosChatV57();
        }catch(e){console.warn("Presença do chat V7.2.5:",e?.message||e)}
    }

    function instalarV725(){
        const cab=document.getElementById("chatCabecalho");
        if(cab&&!cab.dataset.v725){
            cab.dataset.v725="1";
            cab.addEventListener("click",function(ev){
                if(ev.target.closest("#chatCabecalhoAvatar,.chat-cabecalho-acoes,.chat-voltar-mobile,button,a"))return;
                ev.preventDefault();ev.stopPropagation();abrirMenuCabecalhoV725(ev);
            });
        }
        // Reforça: a foto nunca abre o menu; abre somente a imagem grande.
        const avatar=document.getElementById("chatCabecalhoAvatar");
        if(avatar&&!avatar.dataset.v725){
            avatar.dataset.v725="1";
            avatar.addEventListener("click",function(ev){
                ev.preventDefault();ev.stopPropagation();
                const url=chatUsuarioAtualV57?.avatar_url;
                if(url&&typeof window.v698AbrirFotoGrande==="function")window.v698AbrirFotoGrande(url);
            },true);
        }
        clearInterval(timerPresencaV725);
        timerPresencaV725=setInterval(atualizarPresencaChatV725,5000);
        atualizarPresencaChatV725();
    }
    document.addEventListener("click",function(ev){
        if(!ev.target.closest("#chatMenuCabecalhoV725")&&!ev.target.closest("#chatCabecalho"))chatV725FecharMenu();
        if(ev.target===document.getElementById("chatMidiasModalV725"))chatV725FecharMidias();
    });
    document.addEventListener("keydown",ev=>{if(ev.key==="Escape"){chatV725FecharMenu();chatV725FecharMidias()}});
    window.addEventListener("load",()=>setTimeout(instalarV725,1300));
    document.addEventListener("DOMContentLoaded",()=>setTimeout(instalarV725,800));
})();
