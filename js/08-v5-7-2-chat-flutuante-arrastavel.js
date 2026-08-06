/* =========================================================
   V5.7.2 - CHAT FLUTUANTE ARRASTÁVEL
   ========================================================= */
let chatUsuariosV57=[];
let chatUsuarioAtualV57=null;
let chatConversaAtualV57=null;
let chatMensagensV57=[];
let chatResumoNaoLidasV57={};
let chatRealtimeV57=null;
let chatRealtimeResumoV57=null;
let chatPollingV57=null;
let chatDigitandoTimerV57=null;
let chatUltimoAvisoDigitandoV57=0;
let chatInicializadoV57=false;

function chatSbV57(){return obterSupabaseClient()}
function chatEscV57(v){return typeof escaparHTML==="function"?escaparHTML(String(v??"")):String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function chatIniciaisV57(nome){return String(nome||"U").split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase()||"U"}
function chatStatusUsuarioV57(u){
    const last=new Date(u.last_seen||0).getTime(),idade=Date.now()-last;
    if(u.status==="online"&&idade<=120000)return "online";
    if((u.status==="ausente"||u.status==="online")&&idade<=600000)return "ausente";
    return "offline";
}
function chatStatusTextoV57(u){
    const s=chatStatusUsuarioV57(u);
    if(s==="online")return "🟢 Online agora";
    if(s==="ausente")return "🟡 Ausente — receberá normalmente";
    return "⚫ Offline — receberá quando entrar";
}
function chatDataHoraV57(v){try{return new Date(v).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}catch(e){return ""}}
function chatDiaV57(v){try{return new Date(v).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})}catch(e){return ""}}

async function inicializarChatV57(){
    if(!usuarioLogado?.id)return;
    if(!chatInicializadoV57){
        chatInicializadoV57=true;
        iniciarResumoRealtimeChatV57();
        clearInterval(chatPollingV57);
        chatPollingV57=setInterval(async()=>{
            await marcarMensagensEntreguesV575();
            carregarResumoChatV57();
            if(chatConversaAtualV57)carregarMensagensChatV57(false);
        },10000);
    }
    await marcarMensagensEntreguesV575();
    await Promise.all([carregarUsuariosChatV57(),carregarResumoChatV57()]);
}

async function alternarChatV57(ev){
    ev?.stopPropagation();
    if(typeof chatBotaoFoiArrastadoV574!=="undefined"&&chatBotaoFoiArrastadoV574){
        chatBotaoFoiArrastadoV574=false;
        return;
    }
    if(!exigirLogin())return;
    const painel=document.getElementById("chatPainel");
    const abrir=!painel.classList.contains("aberto");
    if(abrir){
        painel.classList.add("aberto");
        document.body.classList.add("chat-aberto-v653");
        document.getElementById("chatWrap")?.classList.add("chat-atras-v652");
        const copilotoFab=document.getElementById("copilotoFab");
        if(copilotoFab){
            copilotoFab.classList.add("oculto-chat-v653");
            copilotoFab.setAttribute("aria-hidden","true");
            copilotoFab.style.pointerEvents="none";
        }
        if(typeof chatRestaurarPainelV574==="function")chatRestaurarPainelV574();
        await inicializarChatV57();
    }else fecharChatV57();
}

function fecharChatV57(){
    if(chatMediaRecorderV600?.state==="recording"){
        try{chatMediaRecorderV600.stop()}catch(_){}
    }
    finalizarInterfaceGravacaoAudioV603();
    descartarAudioPreviaV603();

    if(typeof chatSalvarPainelV574==="function")chatSalvarPainelV574();

    const painel=document.getElementById("chatPainel");
    if(painel){
        painel.classList.remove("aberto","conversa-aberta");
        painel.style.removeProperty("display");
        painel.style.removeProperty("visibility");
        painel.style.removeProperty("pointer-events");
        painel.style.removeProperty("opacity");
    }

    document.body.classList.remove("chat-aberto-v653");
    const copilotoFab=document.getElementById("copilotoFab");
    if(copilotoFab){
        copilotoFab.classList.remove("oculto-chat-v653");
        copilotoFab.removeAttribute("aria-hidden");
        copilotoFab.style.removeProperty("pointer-events");
    }

    const wrap=document.getElementById("chatWrap");
    if(wrap){
        wrap.classList.remove("aberto","chat-atras-v652");
        wrap.style.removeProperty("display");
        wrap.style.removeProperty("visibility");
        wrap.style.removeProperty("pointer-events");
    }
}
function voltarListaChatV57(){
    document.getElementById("chatPainel")?.classList.remove("conversa-aberta");
}
document.addEventListener("pointerdown",e=>{
    const painel=document.getElementById("chatPainel");
    const wrap=document.getElementById("chatWrap");
    const chamada=document.getElementById("chamadaOverlayV630");
    const chamadaRecebida=document.getElementById("chamadaRecebidaV630");
    const seletorOS=document.getElementById("chatOSSeletorOverlayV639");
    const visualizadorOS=document.getElementById("chatOSVisualizadorOverlayV639");
    const seletorContato=document.getElementById("chatContatoOverlayV640");

    // Sobreposições pertencentes ao chat não podem fechar a conversa que está atrás.
    if(
        chamada?.contains(e.target)||
        chamadaRecebida?.contains(e.target)||
        seletorOS?.contains(e.target)||
        visualizadorOS?.contains(e.target)||
        seletorContato?.contains(e.target)
    )return;

    if(painel?.classList.contains("aberto")&&!painel.contains(e.target)&&!wrap?.contains(e.target)){
        fecharChatV57();
    }
});

async function carregarUsuariosChatV57(){
    const area=document.getElementById("chatUsuarios");
    try{
        const {data,error}=await chatSbV57().rpc("listar_usuarios_chat_v610");
        if(error)throw error;
        chatUsuariosV57=(data||[]).filter(u=>u.id!==usuarioLogado?.id);
        renderizarUsuariosChatV57();
    }catch(e){
        if(area)area.innerHTML="<div class='chat-sem-usuarios'>Erro ao carregar usuários:<br>"+chatEscV57(e?.message||e)+"</div>";
    }
}

function renderizarUsuariosChatV57(){
    const area=document.getElementById("chatUsuarios");if(!area)return;
    const q=String(document.getElementById("chatBuscaUsuario")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const lista=chatUsuariosV57.filter(u=>!q||[u.nome,u.email,u.cargo,u.perfil].join(" ").toLocaleLowerCase("pt-BR").includes(q))
        .sort((a,b)=>{
            const p={online:0,ausente:1,offline:2};
            return p[chatStatusUsuarioV57(a)]-p[chatStatusUsuarioV57(b)]||String(a.nome||a.email).localeCompare(String(b.nome||b.email),"pt-BR");
        });
    if(!lista.length){area.innerHTML="<div class='chat-sem-usuarios'>Nenhum usuário encontrado.</div>";return}
    area.innerHTML=lista.map(u=>{
        const s=chatStatusUsuarioV57(u),nao=Number(chatResumoNaoLidasV57[u.id]||0);
        return "<button class='chat-usuario "+(chatUsuarioAtualV57?.id===u.id?"ativo":"")+"' onclick=\"abrirConversaChatV57(event,'"+u.id+"')\">"+
            avatarChatHTMLV610(u,s)+
            "<div class='chat-usuario-info'><b>"+chatEscV57(u.nome||u.email)+"</b><span>"+chatEscV57(chatStatusTextoV57(u))+"</span></div>"+
            (nao?"<span class='chat-nao-lidas'>"+Math.min(nao,99)+"</span>":"<span></span>")+"</button>";
    }).join("");
}

async function abrirConversaChatV57(event,outroId){
    event?.preventDefault();event?.stopPropagation();
    const usuario=chatUsuariosV57.find(u=>u.id===outroId);if(!usuario)return;
    chatUsuarioAtualV57=usuario;
    document.getElementById("chatPainel")?.classList.add("conversa-aberta");
    document.getElementById("chatCabecalho")?.classList.add("ativo");
    document.getElementById("chatMensagens")?.classList.add("ativo");
    document.getElementById("chatCompositor")?.classList.add("ativo");
    const vazia=document.getElementById("chatConversaVazia");if(vazia)vazia.style.display="none";
    document.getElementById("chatCabecalhoNome").textContent=usuario.nome||usuario.email;
    document.getElementById("chatCabecalhoStatus").textContent=chatStatusTextoV57(usuario);
    aplicarAvatarChatCabecalhoV610(usuario);
    document.getElementById("chatMensagens").innerHTML="<div class='chat-carregando'>Abrindo conversa...</div>";
    renderizarUsuariosChatV57();
    try{
        const {data,error}=await chatSbV57().rpc("chat_abrir_privado_v574",{p_destinatario:String(outroId)});
        if(error)throw error;
        chatConversaAtualV57=typeof data==="string"?data:(Array.isArray(data)?data[0]?.chat_abrir_privado_v574:data?.chat_abrir_privado_v574||data?.conversa_id||data);
        if(!chatConversaAtualV57)throw new Error("Conversa não foi criada.");
        await carregarMensagensChatV57(true);
        assinarConversaRealtimeChatV57();
        await marcarConversaLidaV57();
        document.getElementById("chatTexto")?.focus();
    }catch(e){
        const detalhe=[e?.code,e?.message,e?.details,e?.hint].filter(Boolean).join(" — ")||JSON.stringify(e)||String(e);
        console.error("Falha ao abrir conversa:",e);
        chatConversaAtualV57=null;
        document.getElementById("chatMensagens").innerHTML=
            "<div class='chat-sem-usuarios'><b>Não foi possível abrir a conversa.</b><br>"+
            chatEscV57(detalhe)+"<br><small>Execute o SQL de correção V5.7.3 no Supabase.</small></div>";
    }
}

async function carregarMensagensChatV57(rolarFim=true){
    if(!chatConversaAtualV57)return;
    try{
        const {data,error}=await chatSbV57().rpc("listar_mensagens_chat_v600",{
            p_conversa_id:chatConversaAtualV57,
            p_limite:500
        });
        if(error)throw error;
        chatMensagensV57=data||[];
        renderizarMensagensChatV57(rolarFim);
        await marcarConversaLidaV57();
    }catch(e){console.warn("Chat mensagens:",e)}
}

function renderizarRegistroChamadaV633(m){
 const prefixo="[[CHAMADA_V633]]";
 const mensagem=String(m?.mensagem||"");
 if(!mensagem.startsWith(prefixo))return "";

 try{
   const dados=JSON.parse(mensagem.slice(prefixo.length));
   const video=dados.tipo==="video";
   const fuiEu=String(dados.remetente_id||"")===String(usuarioLogado?.id||"");
   const hora=chatDataHoraV57(m.created_at);
   let titulo="";
   let detalhe="";
   let classe="normal";
   let seta=fuiEu?"↗":"↙";
   let icone=video?"🎥":"📞";

   if(dados.resultado==="concluida"){
     titulo=video
       ?(fuiEu?"Chamada de vídeo efetuada":"Chamada de vídeo recebida")
       :(fuiEu?"Chamada de áudio efetuada":"Chamada de áudio recebida");
     detalhe=`${seta} ${hora} • ${formatarDuracaoChamadaV633(Number(dados.duracao_segundos||0))}`;
     classe="concluida";
   }else if(dados.resultado==="recusada"){
     titulo=video?"Chamada de vídeo recusada":"Chamada de áudio recusada";
     detalhe=fuiEu
       ?`${seta} ${hora} • A pessoa recusou`
       :`${seta} ${hora} • Você recusou`;
     classe="recusada";
   }else if(dados.resultado==="perdida"){
     titulo=video?"Chamada de vídeo perdida":"Chamada de áudio perdida";
     detalhe=fuiEu
       ?`${seta} ${hora} • Não atendida`
       :`${seta} ${hora} • Você não atendeu`;
     classe="perdida";
   }else{
     titulo=video?"Chamada de vídeo cancelada":"Chamada de áudio cancelada";
     detalhe=`${seta} ${hora} • Chamada cancelada`;
     classe="cancelada";
   }

   return `<div class="chat-registro-chamada-v638 ${classe}">
      <div class="chat-registro-icone-v638">${icone}</div>
      <div class="chat-registro-info-v638">
        <b>${titulo}</b>
        <span>${detalhe}</span>
      </div>
      <button type="button" onclick="event.stopPropagation();iniciarChamadaV630('${video?"video":"audio"}')" title="Ligar novamente" aria-label="Ligar novamente">${icone}</button>
   </div>`;
 }catch(_){
   return "";
 }
}

function formatarDuracaoChamadaV633(segundos){
 segundos=Math.max(0,Math.floor(segundos||0));
 const h=Math.floor(segundos/3600);
 const m=Math.floor((segundos%3600)/60);
 const s=segundos%60;
 if(h>0)return `${h}h ${String(m).padStart(2,"0")}min ${String(s).padStart(2,"0")}s`;
 if(m>0)return `${m}min ${String(s).padStart(2,"0")}s`;
 return `${s}s`;
}

function renderizarMensagensChatV57(rolarFim=true){
    const area=document.getElementById("chatMensagens");if(!area)return;
    if(!chatMensagensV57.length){area.innerHTML="<div class='chat-conversa-vazia' style='display:block'>Nenhuma mensagem ainda.<br>Envie a primeira mensagem.</div>";return}
    let diaAnterior="";
    area.innerHTML=chatMensagensV57.map(m=>{
        const dia=chatDiaV57(m.created_at),separador=dia!==diaAnterior?"<div class='chat-dia'>"+dia+"</div>":"";
        diaAnterior=dia;
        const minha=m.remetente_id===usuarioLogado?.id;
        const confirmacao=minha?(m.read_at?"<span class='chat-confirmacao lida'>✓✓</span>":m.delivered_at?"<span class='chat-confirmacao'>✓✓</span>":"<span class='chat-confirmacao'>✓</span>"):"";
        const resposta=m.resposta_mensagem?`<div class="chat-msg-reply"><b>${chatEscV57(m.resposta_nome||"Mensagem")}</b><br>${chatEscV57(m.resposta_mensagem)}</div>`:"";
        const anexos=renderizarAnexosChatV600(m.anexos);
        const registroChamada=renderizarRegistroChamadaV633(m);
        const registroOS=renderizarRegistroOSChatV639(m);
        const registroContato=renderizarRegistroContatoChatV640(m);
        const corpo=m.apagado?"<i>Mensagem apagada</i>":(registroChamada||registroOS||registroContato||chatEscV57(m.mensagem||"")+anexos);
        const reacoes=renderizarReacoesChatV600(m.reacoes,m.id);
        return separador+`<div class="chat-msg ${minha?"minha":"outra"}" data-id="${m.id}" oncontextmenu="abrirMenuMensagemV600(event,'${m.id}')">
          <div class="chat-msg-acoes">
            <button onclick="prepararRespostaChatV600('${m.id}')" title="Responder">↩</button>
            <button onclick="reagirMensagemV600('${m.id}','👍')" title="Curtir">👍</button>
            <button onclick="abrirMenuMensagemV600(event,'${m.id}')" title="Mais">⋮</button>
          </div>
          <div class="chat-msg-balao">${resposta}${corpo}</div>
          ${reacoes}
          <div class="chat-msg-meta">${chatDataHoraV57(m.created_at)}${m.editado?" • editada":""}${confirmacao}</div>
        </div>`;
    }).join("");
    if(rolarFim)requestAnimationFrame(()=>{area.scrollTop=area.scrollHeight});
}

function atalhoEnviarChatV57(e){
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviarMensagemChatV57()}
}
async function enviarMensagemChatV57(){
    const campo=document.getElementById("chatTexto"),btn=document.getElementById("chatEnviar");
    const mensagem=String(campo?.value||"").trim();
    if(!mensagem||!chatConversaAtualV57||!usuarioLogado?.id)return;
    campo.value="";btn.disabled=true;
    try{
        const {data,error}=await chatSbV57().rpc("enviar_mensagem_chat_v600",{
            p_conversa_id:chatConversaAtualV57,
            p_mensagem:mensagem,
            p_resposta_id:chatRespostaAtualV600?.id||null,
            p_anexos:[]
        });
        if(error)throw error;
        if(!data)throw new Error("O servidor não confirmou o envio.");
        cancelarRespostaChatV600();
        await carregarMensagensChatV57(true);
        emitirDigitandoChatV57(false);
    }catch(e){
        campo.value=mensagem;
        const detalhe=[e?.code,e?.message,e?.details,e?.hint].filter(Boolean).join(" — ")||String(e);
        alert("Não foi possível enviar a mensagem:\n"+detalhe);
    }finally{btn.disabled=false;campo.focus()}
}




const CHAT_CONTATO_PREFIXO_V640="[[CONTATO_CHAT_V640]]";

function alternarMenuMaisChatV640(event){
    event?.preventDefault();
    event?.stopPropagation();
    const menu=document.getElementById("chatMaisMenuV640");
    if(!menu)return;
    menu.classList.toggle("aberto");
    document.getElementById("chatEmojiPainelV600")?.classList.remove("aberto");
}

function fecharMenuMaisChatV640(){
    document.getElementById("chatMaisMenuV640")?.classList.remove("aberto");
}

function selecionarOpcaoMaisChatV640(tipo){
    fecharMenuMaisChatV640();

    if(!chatConversaAtualV57){
        alert("Selecione uma conversa primeiro.");
        return;
    }

    if(tipo==="arquivo"){
        document.getElementById("chatArquivoV600")?.click();
    }else if(tipo==="foto"){
        document.getElementById("chatFotoV640")?.click();
    }else if(tipo==="contato"){
        abrirSeletorContatoChatV640();
    }else if(tipo==="os"){
        abrirSeletorOSChatV639();
    }
}

function abrirSeletorContatoChatV640(){
    const overlay=document.getElementById("chatContatoOverlayV640");
    const busca=document.getElementById("chatContatoBuscaV640");
    overlay?.classList.add("aberto");
    overlay?.setAttribute("aria-hidden","false");
    if(busca)busca.value="";
    renderizarContatosChatV640();
    setTimeout(()=>busca?.focus(),60);
}

function fecharSeletorContatoChatV640(event){
    if(event&&event.target!==event.currentTarget)return;
    document.getElementById("chatContatoOverlayV640")?.classList.remove("aberto");
}

function renderizarContatosChatV640(){
    const area=document.getElementById("chatContatoResultadosV640");
    if(!area)return;

    const termo=normalizarTextoOSV639(document.getElementById("chatContatoBuscaV640")?.value);
    const usuarios=(chatUsuariosV57||[]).filter(u=>{
        const texto=normalizarTextoOSV639([u.nome,u.cargo,u.perfil,u.email].join(" "));
        return !termo||texto.includes(termo);
    });

    if(!usuarios.length){
        area.innerHTML="<div class='chat-os-vazio-v639'>Nenhum contato encontrado.</div>";
        return;
    }

    area.innerHTML=usuarios.map((u,indice)=>{
        const original=(chatUsuariosV57||[]).indexOf(u);
        const inicial=chatEscV57(String(u.nome||"U").trim().charAt(0).toUpperCase());
        const avatar=u.avatar_url
            ?`<img src="${chatEscV57(u.avatar_url)}" alt="">`
            :inicial;
        return `<div class="chat-contato-resultado-v640">
            <span class="chat-contato-avatar-v640">${avatar}</span>
            <span class="chat-os-resultado-info-v639">
                <b>${chatEscV57(u.nome||"Usuário")}</b>
                <small>${chatEscV57(u.cargo||u.perfil||"Usuário do ERP")}</small>
            </span>
            <button type="button" class="chat-os-enviar-v640"
                    onclick="enviarContatoChatV640(${original})">Enviar</button>
        </div>`;
    }).join("");
}

async function enviarContatoChatV640(indice){
    const usuario=(chatUsuariosV57||[])[Number(indice)];
    if(!usuario||!chatConversaAtualV57)return;

    const contato={
        id:usuario.id||null,
        nome:usuario.nome||"Usuário",
        cargo:usuario.cargo||"",
        perfil:usuario.perfil||"",
        avatar_url:usuario.avatar_url||""
    };

    const mensagem=CHAT_CONTATO_PREFIXO_V640+JSON.stringify(contato);

    try{
        const {data,error}=await chatSbV57().rpc("enviar_mensagem_chat_v600",{
            p_conversa_id:chatConversaAtualV57,
            p_mensagem:mensagem,
            p_resposta_id:chatRespostaAtualV600?.id||null,
            p_anexos:[]
        });
        if(error)throw error;
        if(!data)throw new Error("O servidor não confirmou o envio.");
        fecharSeletorContatoChatV640();
        cancelarRespostaChatV600();
        await carregarMensagensChatV57(true);
    }catch(e){
        alert("Não foi possível enviar o contato:\n"+(e?.message||e));
    }
}

function renderizarRegistroContatoChatV640(m){
    const mensagem=String(m?.mensagem||"");
    if(!mensagem.startsWith(CHAT_CONTATO_PREFIXO_V640))return "";

    try{
        const contato=JSON.parse(mensagem.slice(CHAT_CONTATO_PREFIXO_V640.length));
        const inicial=chatEscV57(String(contato.nome||"U").trim().charAt(0).toUpperCase());
        const avatar=contato.avatar_url
            ?`<img src="${chatEscV57(contato.avatar_url)}" alt="">`
            :inicial;

        return `<div class="chat-contato-cartao-v640">
            <span class="chat-contato-avatar-v640">${avatar}</span>
            <span class="chat-contato-cartao-info-v640">
                <small>CONTATO DO ERP</small>
                <b>${chatEscV57(contato.nome||"Usuário")}</b>
                <em>${chatEscV57(contato.cargo||contato.perfil||"Usuário")}</em>
            </span>
        </div>`;
    }catch(_){
        return "";
    }
}

document.addEventListener("pointerdown",event=>{
    const menu=document.getElementById("chatMaisMenuV640");
    const wrap=event.target.closest?.(".chat-mais-wrap-v640");
    if(menu?.classList.contains("aberto")&&!wrap){
        fecharMenuMaisChatV640();
    }
});

const CHAT_OS_PREFIXO_V639="[[OS_CHAT_V639]]";
const chatOSCartoesRenderizadosV642=new Map();
let chatOSResultadosCacheV639=[];

function normalizarTextoOSV639(valor){
    return String(valor??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}

function escaparAtributoOSV639(valor){
    return String(valor??"")
        .replace(/&/g,"&amp;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#39;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;");
}

function mapearLinhaOSChatV639(linha){
    return {
        os:linha?.[0]||"",
        data:linha?.[1]||"",
        loja:linha?.[2]||"",
        gr:linha?.[5]||"",
        nce:linha?.[6]||"",
        produto:linha?.[7]||"",
        cor:linha?.[8]||"",
        serie:linha?.[9]||"",
        valor_transporte:linha?.[10]||"",
        tecnico:linha?.[11]||"",
        rack:linha?.[12]||"",
        status:linha?.[13]||"",
        usuario:linha?.[14]||""
    };
}

async function garantirBaseOSChatV639(){
    if(typeof bancoREXPEDLR!=="undefined"&&Array.isArray(bancoREXPEDLR)&&bancoREXPEDLR.length>1){
        return bancoREXPEDLR;
    }
    if(typeof carregarBancoREXPEDLR==="function"){
        await carregarBancoREXPEDLR();
    }
    return (typeof bancoREXPEDLR!=="undefined"&&Array.isArray(bancoREXPEDLR))?bancoREXPEDLR:[];
}

async function abrirSeletorOSChatV639(){
    if(!chatConversaAtualV57){
        alert("Selecione uma conversa antes de enviar uma O.S.");
        return;
    }

    const overlay=document.getElementById("chatOSSeletorOverlayV639");
    const status=document.getElementById("chatOSStatusV639");
    const resultados=document.getElementById("chatOSResultadosV639");
    const busca=document.getElementById("chatOSBuscaV639");

    if(overlay){
        overlay.classList.add("aberto");
        overlay.setAttribute("aria-hidden","false");
    }
    if(status)status.textContent="Carregando base de O.S...";
    if(resultados)resultados.innerHTML="";
    if(busca)busca.value="";

    try{
        const base=await garantirBaseOSChatV639();
        chatOSResultadosCacheV639=base.slice(1).filter(Boolean).map(mapearLinhaOSChatV639);
        if(status){
            status.textContent=chatOSResultadosCacheV639.length
                ?`${chatOSResultadosCacheV639.length} O.S. disponíveis. Digite para pesquisar.`
                :"Nenhuma O.S. foi encontrada na base atual.";
        }
        renderizarResultadosOSChatV639(chatOSResultadosCacheV639.slice(0,30));
        setTimeout(()=>busca?.focus(),60);
    }catch(e){
        if(status)status.textContent="Erro ao carregar a base: "+(e?.message||e);
    }
}

function fecharSeletorOSChatV639(event){
    if(event&&event.target!==event.currentTarget)return;
    const overlay=document.getElementById("chatOSSeletorOverlayV639");
    overlay?.classList.remove("aberto");
    overlay?.setAttribute("aria-hidden","true");
}

function pesquisarOSChatV639(){
    const termo=normalizarTextoOSV639(document.getElementById("chatOSBuscaV639")?.value);
    const status=document.getElementById("chatOSStatusV639");

    let lista=chatOSResultadosCacheV639;
    if(termo){
        lista=lista.filter(item=>normalizarTextoOSV639([
            item.os,item.data,item.loja,item.gr,item.nce,item.produto,item.cor,
            item.serie,item.tecnico,item.rack,item.status,item.usuario
        ].join(" ")).includes(termo));
    }

    if(status){
        status.textContent=termo
            ?`${lista.length} resultado(s) encontrado(s).`
            :`${chatOSResultadosCacheV639.length} O.S. disponíveis.`;
    }
    renderizarResultadosOSChatV639(lista.slice(0,100));
}

function renderizarResultadosOSChatV639(lista){
    const area=document.getElementById("chatOSResultadosV639");
    if(!area)return;

    if(!lista.length){
        area.innerHTML="<div class='chat-os-vazio-v639'>Nenhuma O.S. encontrada.</div>";
        return;
    }

    area.innerHTML=lista.map(item=>{
        const indice=chatOSResultadosCacheV639.indexOf(item);
        return `<div class="chat-os-resultado-v639">
            <span class="chat-os-resultado-icone-v639">📄</span>
            <span class="chat-os-resultado-info-v639">
                <b>O.S. ${chatEscV57(item.os||"-")}</b>
                <small>${chatEscV57(item.produto||"Produto não informado")}</small>
                <em>${chatEscV57(item.status||"Status não informado")} • ${chatEscV57(item.loja||"Loja não informada")}</em>
            </span>
            <button type="button" class="chat-os-enviar-v640"
                    onclick="event.stopPropagation();enviarOSChatV640PorIndice(${indice})">Enviar</button>
        </div>`;
    }).join("");
}

function enviarOSChatV640PorIndice(indice){
    const item=chatOSResultadosCacheV639[Number(indice)];
    if(!item){
        alert("A O.S. selecionada não está mais disponível. Faça a pesquisa novamente.");
        return;
    }
    enviarOSChatV639(item);
}

async function enviarOSChatV639(itemOuDados){
    if(!chatConversaAtualV57||!usuarioLogado?.id)return;

    let item=itemOuDados;
    if(typeof itemOuDados==="string"){
        try{
            item=JSON.parse(decodeURIComponent(itemOuDados));
        }catch(e){
            alert("Não foi possível ler os dados desta O.S.");
            return;
        }
    }

    if(!item?.os){
        alert("A O.S. selecionada não possui número válido.");
        return;
    }

    const mensagem=CHAT_OS_PREFIXO_V639+JSON.stringify({
        tipo:"os",
        enviado_em:new Date().toISOString(),
        dados:item
    });

    const status=document.getElementById("chatOSStatusV639");
    if(status)status.textContent=`Enviando O.S. ${item.os}...`;

    try{
        const {data,error}=await chatSbV57().rpc("enviar_mensagem_chat_v600",{
            p_conversa_id:chatConversaAtualV57,
            p_mensagem:mensagem,
            p_resposta_id:chatRespostaAtualV600?.id||null,
            p_anexos:[]
        });
        if(error)throw error;
        if(!data)throw new Error("O servidor não confirmou o envio.");

        cancelarRespostaChatV600();

        const painelChat=document.getElementById("chatPainel");
        const conversaContinuavaAberta=!!painelChat?.classList.contains("aberto");
        const conversaSelecionada=chatConversaAtualV57;

        fecharSeletorOSChatV639();

        if(conversaContinuavaAberta&&painelChat){
            painelChat.classList.add("aberto");
            if(conversaSelecionada)painelChat.classList.add("conversa-aberta");
        }

        await carregarMensagensChatV57(true);
    }catch(e){
        const detalhe=[e?.code,e?.message,e?.details,e?.hint].filter(Boolean).join(" — ")||String(e);
        if(status)status.textContent="Falha no envio: "+detalhe;
        alert("Não foi possível enviar a O.S.:\n"+detalhe);
    }
}

function extrairRegistroOSChatV639(m){
    const mensagem=String(m?.mensagem||"");
    if(!mensagem.startsWith(CHAT_OS_PREFIXO_V639))return null;
    try{
        const registro=JSON.parse(mensagem.slice(CHAT_OS_PREFIXO_V639.length));
        return registro?.dados||null;
    }catch(_){
        return null;
    }
}

function renderizarRegistroOSChatV639(m){
    const item=extrairRegistroOSChatV639(m);
    if(!item)return "";

    const chave=String(m?.id||("os-"+item.os+"-"+Math.random().toString(36).slice(2)));
    chatOSCartoesRenderizadosV642.set(chave,item);

    return `<button type="button" class="chat-os-cartao-v639"
                    data-os-chave-v642="${escaparAtributoOSV639(chave)}"
                    onclick="event.stopPropagation();abrirVisualizadorOSChatV642PorChave(this.dataset.osChaveV642)">
        <span class="chat-os-cartao-cab-v639">
            <span class="chat-os-cartao-icone-v639">📄</span>
            <span>
                <small>ORDEM DE SERVIÇO</small>
                <b>O.S. ${chatEscV57(item.os||"-")}</b>
            </span>
        </span>
        <span class="chat-os-cartao-linha-v639"><strong>Produto</strong><em>${chatEscV57(item.produto||"-")}</em></span>
        <span class="chat-os-cartao-linha-v639"><strong>Status</strong><em>${chatEscV57(item.status||"-")}</em></span>
        <span class="chat-os-cartao-linha-v639"><strong>Loja</strong><em>${chatEscV57(item.loja||"-")}</em></span>
        <span class="chat-os-cartao-rodape-v639">Clique para abrir a O.S. <b>›</b></span>
    </button>`;
}

function abrirVisualizadorOSChatV642PorChave(chave){
    const item=chatOSCartoesRenderizadosV642.get(String(chave||""));
    if(!item){
        alert("Não foi possível localizar os dados desta O.S. no chat.");
        return;
    }
    abrirVisualizadorOSChatV639(item);
}

function abrirVisualizadorOSChatV639(itemOuDados){
    let item=itemOuDados;

    if(typeof itemOuDados==="string"){
        try{
            item=JSON.parse(decodeURIComponent(itemOuDados));
        }catch(e){
            alert("Os dados desta O.S. não puderam ser abertos.");
            return;
        }
    }

    if(!item||typeof item!=="object"){
        alert("Os dados desta O.S. não puderam ser abertos.");
        return;
    }

    const titulo=document.getElementById("chatOSVisualizadorTituloV639");
    const conteudo=document.getElementById("chatOSVisualizadorConteudoV639");
    const overlay=document.getElementById("chatOSVisualizadorOverlayV639");

    if(titulo)titulo.textContent=`📄 Ordem de Serviço ${item.os||""}`;
    if(conteudo){
        const campos=[
            ["O.S.",item.os],
            ["Data",item.data],
            ["Loja / PDV",item.loja],
            ["Produto",item.produto],
            ["Cor",item.cor],
            ["Nº de série",item.serie],
            ["Status",item.status],
            ["Técnico",item.tecnico],
            ["Rack",item.rack],
            ["GR",item.gr],
            ["NCE",item.nce],
            ["Valor transporte",item.valor_transporte],
            ["Usuário",item.usuario]
        ];

        conteudo.innerHTML=`
            <div class="chat-os-ficha-destaque-v639">
                <span>O.S.</span>
                <strong>${chatEscV57(item.os||"-")}</strong>
                <small>${chatEscV57(item.status||"Status não informado")}</small>
            </div>
            <div class="chat-os-ficha-grade-v639">
                ${campos.map(([rotulo,valor])=>`
                    <div class="chat-os-ficha-campo-v639">
                        <span>${chatEscV57(rotulo)}</span>
                        <b>${chatEscV57(valor||"-")}</b>
                    </div>`).join("")}
            </div>`;
    }

    if(overlay){
        overlay.classList.add("aberto");
        overlay.setAttribute("aria-hidden","false");
        overlay.style.display="flex";
    }
}

function fecharVisualizadorOSChatV639(event){
    if(event&&event.target!==event.currentTarget)return;
    const overlay=document.getElementById("chatOSVisualizadorOverlayV639");
    overlay?.classList.remove("aberto");
    overlay?.setAttribute("aria-hidden","true");
    if(overlay)overlay.style.display="none";
}

document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    const visualizador=document.getElementById("chatOSVisualizadorOverlayV639");
    const seletor=document.getElementById("chatOSSeletorOverlayV639");
    if(visualizador?.classList.contains("aberto")){
        fecharVisualizadorOSChatV639();
        return;
    }
    if(seletor?.classList.contains("aberto")){
        fecharSeletorOSChatV639();
        return;
    }
    if(document.getElementById("chatContatoOverlayV640")?.classList.contains("aberto")){
        fecharSeletorContatoChatV640();
        return;
    }
    fecharMenuMaisChatV640();
});


async function marcarMensagensEntreguesV575(){
    if(!usuarioLogado?.id)return;
    try{
        const {error}=await chatSbV57().rpc("marcar_mensagens_entregues_v575");
        if(error)throw error;
    }catch(e){
        console.warn("Confirmação de entrega:",e?.message||e);
    }
}

async function marcarConversaLidaV57(){
    if(!chatConversaAtualV57||!usuarioLogado?.id)return;
    try{
        const {error}=await chatSbV57().rpc("marcar_chat_lido_v575",{
            p_conversa_id:chatConversaAtualV57
        });
        if(error)throw error;
        await carregarResumoChatV57();
    }catch(e){}
}

async function carregarResumoChatV57(){
    if(!usuarioLogado?.id)return;
    try{
        const {data,error}=await chatSbV57().rpc("resumo_chat_nao_lidas");
        if(error)throw error;
        chatResumoNaoLidasV57={};
        let total=0;
        (data||[]).forEach(r=>{chatResumoNaoLidasV57[r.outro_usuario_id]=Number(r.nao_lidas||0);total+=Number(r.nao_lidas||0)});
        const badge=document.getElementById("chatContador");
        if(badge){badge.textContent=total>99?"99+":String(total);badge.classList.toggle("vazio",total===0)}
        renderizarUsuariosChatV57();
    }catch(e){console.warn("Resumo chat:",e)}
}

function assinarConversaRealtimeChatV57(){
    if(chatRealtimeV57){try{chatSbV57().removeChannel(chatRealtimeV57)}catch(e){}}
    if(!chatConversaAtualV57)return;
    chatRealtimeV57=chatSbV57().channel("chat-conversa-"+chatConversaAtualV57)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_mensagens",filter:"conversa_id=eq."+chatConversaAtualV57},async payload=>{
            if(!chatMensagensV57.some(m=>m.id===payload.new.id)){chatMensagensV57.push(payload.new);renderizarMensagensChatV57(true)}
            await marcarMensagensEntreguesV575();
            await marcarConversaLidaV57();
            await carregarMensagensChatV57(true);
        })
        .subscribe();
}

function iniciarResumoRealtimeChatV57(){
    if(chatRealtimeResumoV57){try{chatSbV57().removeChannel(chatRealtimeResumoV57)}catch(e){}}
    chatRealtimeResumoV57=chatSbV57().channel("chat-resumo-"+usuarioLogado.id)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_mensagens"},()=>carregarResumoChatV57())
        .subscribe();
}

function atividadeDigitandoChatV57(){
    const agora=Date.now();
    if(agora-chatUltimoAvisoDigitandoV57>1500){chatUltimoAvisoDigitandoV57=agora;emitirDigitandoChatV57(true)}
    clearTimeout(chatDigitandoTimerV57);
    chatDigitandoTimerV57=setTimeout(()=>emitirDigitandoChatV57(false),2500);
}
async function emitirDigitandoChatV57(ativo){
    if(!chatConversaAtualV57||!usuarioLogado?.id)return;
    try{
        await chatSbV57().rpc("atualizar_digitando_chat",{
            p_conversa_id:chatConversaAtualV57,
            p_digitando:!!ativo
        });
    }catch(e){}
}

function limparChatAoSairV57(){
    clearInterval(chatPollingV57);
    if(chatRealtimeV57)try{chatSbV57().removeChannel(chatRealtimeV57)}catch(e){}
    if(chatRealtimeResumoV57)try{chatSbV57().removeChannel(chatRealtimeResumoV57)}catch(e){}
    chatInicializadoV57=false;chatUsuarioAtualV57=null;chatConversaAtualV57=null;chatMensagensV57=[];chatUsuariosV57=[];
}
