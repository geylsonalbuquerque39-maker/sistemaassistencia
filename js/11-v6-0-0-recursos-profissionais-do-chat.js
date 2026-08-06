/* =========================================================
   V6.0.0 - RECURSOS PROFISSIONAIS DO CHAT
   ========================================================= */
let chatRespostaAtualV600=null;
let chatMensagemSelecionadaV600=null;
let chatMediaRecorderV600=null;
let chatAudioChunksV600=[];
let chatAudioInicioV600=0;
let chatAudioTimerV600=null;
let chatAudioBlobPreviaV603=null;
let chatAudioUrlPreviaV603=null;
let chatAudioNomePreviaV603=null;
let chatAudioStreamV603=null;

const chatEmojisV600=[
["😀","sorriso"],["😃","feliz"],["😄","alegre"],["😁","dentes"],["😂","risada"],["🤣","rindo"],["😊","feliz"],["😍","amor"],
["🥰","carinho"],["😘","beijo"],["😎","legal"],["🤔","pensando"],["😢","triste"],["😭","chorando"],["😡","raiva"],["😱","surpresa"],
["👍","curtir"],["👎","não gostei"],["👏","palmas"],["🙏","obrigado"],["💪","força"],["👌","ok"],["✌️","paz"],["🤝","acordo"],
["❤️","coração"],["💙","coração azul"],["💚","coração verde"],["💛","coração amarelo"],["🔥","fogo"],["⭐","estrela"],["✅","certo"],["❌","errado"],
["🎉","festa"],["🎂","bolo"],["☕","café"],["🍕","pizza"],["🚚","caminhão"],["📦","caixa"],["🔧","ferramenta"],["💻","computador"]
];

function autoAlturaChatV600(el){el.style.height="auto";el.style.height=Math.min(el.scrollHeight,130)+"px"}
function alternarEmojiV600(e){e?.stopPropagation();document.getElementById("chatEmojiPainelV600")?.classList.toggle("aberto");renderizarEmojisV600()}
function renderizarEmojisV600(){
 const grade=document.getElementById("chatEmojiGradeV600");if(!grade)return;
 const q=(document.getElementById("chatEmojiBuscaV600")?.value||"").toLowerCase();
 grade.innerHTML=chatEmojisV600.filter(x=>!q||x[1].includes(q)||x[0].includes(q)).map(x=>`<button onclick="inserirEmojiV600('${x[0]}')" title="${x[1]}">${x[0]}</button>`).join("");
}
function inserirEmojiV600(e){const c=document.getElementById("chatTexto");if(!c)return;c.value+=e;c.focus();atividadeDigitandoChatV57()}
document.addEventListener("click",e=>{if(!e.target.closest("#chatEmojiPainelV600")&&!e.target.closest("[onclick*='alternarEmojiV600']"))document.getElementById("chatEmojiPainelV600")?.classList.remove("aberto")});

function prepararRespostaChatV600(id){
 const m=chatMensagensV57.find(x=>String(x.id)===String(id));if(!m)return;
 chatRespostaAtualV600=m;
 const p=document.getElementById("chatRespostaPreviewV600");
 p.innerHTML=`<b>Respondendo a ${m.remetente_id===usuarioLogado?.id?"você":chatEscV57(chatUsuarioAtualV57?.nome||"usuário")}</b>${chatEscV57((m.mensagem||"Anexo").slice(0,120))}<button onclick="cancelarRespostaChatV600()">✕</button>`;
 p.classList.add("ativo");document.getElementById("chatTexto")?.focus();
}
function cancelarRespostaChatV600(){chatRespostaAtualV600=null;const p=document.getElementById("chatRespostaPreviewV600");if(p){p.classList.remove("ativo");p.innerHTML=""}}

function normalizarAnexosV600(v){if(Array.isArray(v))return v;if(!v)return[];try{return JSON.parse(v)}catch(e){return[]}}
function renderizarAnexosChatV600(v){
 return normalizarAnexosV600(v).map(a=>{
   const url=chatEscV57(a.url||""),nome=chatEscV57(a.nome||"arquivo"),tipo=String(a.tipo||"");
   if(tipo.startsWith("image/"))return `<a href="${url}" target="_blank"><img class="chat-imagem" src="${url}" alt="${nome}"></a>`;
   if(tipo.startsWith("audio/"))return `<audio class="chat-audio" controls src="${url}"></audio>`;
   if(tipo.startsWith("video/"))return `<video controls style="max-width:280px;max-height:240px" src="${url}"></video>`;
   return `<a class="chat-anexo" href="${url}" target="_blank" download>📎 <span>${nome}</span></a>`;
 }).join("");
}

async function enviarArquivosChatV600(files){
 if(!files?.length||!chatConversaAtualV57)return;
 const progresso=document.getElementById("chatUploadProgressoV600");progresso.classList.add("ativo");
 try{
   for(let i=0;i<files.length;i++){
     const f=files[i];
     if(f.size>25*1024*1024)throw new Error(`${f.name}: limite de 25 MB.`);
     progresso.textContent=`Enviando ${i+1} de ${files.length}: ${f.name}`;
     const ext=f.name.includes(".")?f.name.split(".").pop():"bin";
     const caminho=`${usuarioLogado.id}/${chatConversaAtualV57}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
     const {error:uerr}=await chatSbV57().storage.from("chat-anexos").upload(caminho,f,{contentType:f.type,upsert:false});
     if(uerr)throw uerr;
     const {data:urlData}=chatSbV57().storage.from("chat-anexos").getPublicUrl(caminho);
     const anexo={nome:f.name,tipo:f.type||"application/octet-stream",tamanho:f.size,url:urlData.publicUrl,caminho};
     const {error}=await chatSbV57().rpc("enviar_mensagem_chat_v600",{p_conversa_id:chatConversaAtualV57,p_mensagem:"",p_resposta_id:chatRespostaAtualV600?.id||null,p_anexos:[anexo]});
     if(error)throw error;
   }
   cancelarRespostaChatV600();await carregarMensagensChatV57(true);
 }catch(e){alert("Erro ao enviar arquivo: "+(e?.message||e))}
 finally{progresso.classList.remove("ativo");progresso.textContent="";const input=document.getElementById("chatArquivoV600");if(input)input.value=""}
}

async function alternarGravacaoAudioV600(){
 if(chatMediaRecorderV600?.state==="recording"){
   pararGravacaoAudioV603();
   return;
 }

 // Não inicia uma nova gravação enquanto houver uma prévia pendente.
 if(chatAudioBlobPreviaV603){
   document.getElementById("chatAudioPreviaV603")?.classList.add("ativo");
   return;
 }

 const aviso=document.getElementById("chatGravandoV600");
 const tempo=document.getElementById("chatTempoAudioV600");
 const botao=document.getElementById("chatAudioBtnV600");

 try{
   chatAudioStreamV603=await navigator.mediaDevices.getUserMedia({audio:true});
   chatAudioChunksV600=[];
   chatMediaRecorderV600=new MediaRecorder(chatAudioStreamV603);

   chatMediaRecorderV600.ondataavailable=e=>{
     if(e.data?.size)chatAudioChunksV600.push(e.data);
   };

   chatMediaRecorderV600.onerror=()=>{
     finalizarInterfaceGravacaoAudioV603();
     alert("Erro durante a gravação do áudio.");
   };

   chatMediaRecorderV600.onstop=()=>{
     finalizarInterfaceGravacaoAudioV603();

     const tipo=chatMediaRecorderV600?.mimeType||"audio/webm";
     const blob=new Blob(chatAudioChunksV600,{type:tipo});
     chatAudioChunksV600=[];

     if(blob.size<500){
       descartarAudioPreviaV603();
       return;
     }

     criarPreviaAudioV603(blob);
   };

   chatMediaRecorderV600.start();
   chatAudioInicioV600=Date.now();

   aviso?.classList.add("ativo");
   botao?.classList.add("gravando");
   if(botao)botao.textContent="■";
   if(tempo)tempo.textContent="00:00";

   chatAudioTimerV600=setInterval(()=>{
     const segundos=Math.floor((Date.now()-chatAudioInicioV600)/1000);
     if(tempo){
       tempo.textContent=
         String(Math.floor(segundos/60)).padStart(2,"0")+
         ":"+
         String(segundos%60).padStart(2,"0");
     }
   },500);
 }catch(e){
   finalizarInterfaceGravacaoAudioV603();
   alert("Não foi possível acessar o microfone: "+(e?.message||e));
 }
}

function pararGravacaoAudioV603(){
 if(chatMediaRecorderV600?.state==="recording"){
   chatMediaRecorderV600.stop();
 }
}

function finalizarInterfaceGravacaoAudioV603(){
 clearInterval(chatAudioTimerV600);
 chatAudioTimerV600=null;

 if(chatAudioStreamV603){
   chatAudioStreamV603.getTracks().forEach(track=>track.stop());
   chatAudioStreamV603=null;
 }

 document.getElementById("chatGravandoV600")?.classList.remove("ativo");

 const botao=document.getElementById("chatAudioBtnV600");
 botao?.classList.remove("gravando");
 if(botao)botao.textContent="🎤";

 const tempo=document.getElementById("chatTempoAudioV600");
 if(tempo)tempo.textContent="00:00";
}

function criarPreviaAudioV603(blob){
 descartarAudioPreviaV603(false);

 chatAudioBlobPreviaV603=blob;
 chatAudioNomePreviaV603=`audio-${Date.now()}.webm`;
 chatAudioUrlPreviaV603=URL.createObjectURL(blob);

 const player=document.getElementById("chatAudioPlayerPreviaV603");
 if(player){
   player.src=chatAudioUrlPreviaV603;
   player.load();
 }

 document.getElementById("chatAudioPreviaV603")?.classList.add("ativo");
}

function descartarAudioPreviaV603(removerPainel=true){
 const player=document.getElementById("chatAudioPlayerPreviaV603");
 if(player){
   player.pause();
   player.removeAttribute("src");
   player.load();
 }

 if(chatAudioUrlPreviaV603){
   URL.revokeObjectURL(chatAudioUrlPreviaV603);
 }

 chatAudioBlobPreviaV603=null;
 chatAudioUrlPreviaV603=null;
 chatAudioNomePreviaV603=null;

 if(removerPainel){
   document.getElementById("chatAudioPreviaV603")?.classList.remove("ativo");
 }
}

async function enviarAudioPreviaV603(){
 if(!chatAudioBlobPreviaV603||!chatConversaAtualV57)return;

 const botao=document.getElementById("chatAudioEnviarPreviaV603");
 if(botao)botao.disabled=true;

 try{
   const arquivo=new File(
     [chatAudioBlobPreviaV603],
     chatAudioNomePreviaV603||`audio-${Date.now()}.webm`,
     {type:chatAudioBlobPreviaV603.type||"audio/webm"}
   );

   await enviarArquivosChatV600([arquivo]);
   descartarAudioPreviaV603();
 }catch(e){
   alert("Não foi possível enviar o áudio: "+(e?.message||e));
 }finally{
   if(botao)botao.disabled=false;
 }
}

function abrirMenuMensagemV600(e,id){
 e.preventDefault();e.stopPropagation();chatMensagemSelecionadaV600=chatMensagensV57.find(x=>String(x.id)===String(id));
 const menu=document.getElementById("chatMenuMsgV600");if(!menu||!chatMensagemSelecionadaV600)return;
 const minha=chatMensagemSelecionadaV600.remetente_id===usuarioLogado?.id;
 document.getElementById("chatMenuEditarV600").style.display=minha?"block":"none";
 document.getElementById("chatMenuApagarV600").style.display=minha?"block":"none";
 menu.style.left=Math.min(e.clientX,window.innerWidth-190)+"px";menu.style.top=Math.min(e.clientY,window.innerHeight-240)+"px";menu.classList.add("aberto");
}
document.addEventListener("click",()=>document.getElementById("chatMenuMsgV600")?.classList.remove("aberto"));
function responderMensagemSelecionadaV600(){if(chatMensagemSelecionadaV600)prepararRespostaChatV600(chatMensagemSelecionadaV600.id)}
async function copiarMensagemSelecionadaV600(){if(chatMensagemSelecionadaV600)await navigator.clipboard.writeText(chatMensagemSelecionadaV600.mensagem||"")}
async function editarMensagemSelecionadaV600(){
 const m=chatMensagemSelecionadaV600;if(!m)return;const novo=prompt("Editar mensagem:",m.mensagem||"");if(novo===null||!novo.trim())return;
 const {error}=await chatSbV57().rpc("editar_mensagem_chat_v600",{p_mensagem_id:m.id,p_novo_texto:novo.trim()});if(error)return alert(error.message);await carregarMensagensChatV57(false);
}
async function apagarMensagemSelecionadaV600(){
 const m=chatMensagemSelecionadaV600;if(!m||!confirm("Apagar esta mensagem?"))return;
 const {error}=await chatSbV57().rpc("apagar_mensagem_chat_v600",{p_mensagem_id:m.id});if(error)return alert(error.message);await carregarMensagensChatV57(false);
}
function reagirMensagemSelecionadaV600(emoji){if(chatMensagemSelecionadaV600)reagirMensagemV600(chatMensagemSelecionadaV600.id,emoji)}
async function reagirMensagemV600(id,emoji){
 const {error}=await chatSbV57().rpc("alternar_reacao_chat_v600",{p_mensagem_id:id,p_emoji:emoji});if(error)return alert(error.message);await carregarMensagensChatV57(false);
}
function renderizarReacoesChatV600(v,id){
 let rs=[];if(Array.isArray(v))rs=v;else if(v)try{rs=JSON.parse(v)}catch(e){}
 return rs.length?`<div class="chat-reacoes">${rs.map(r=>`<button class="chat-reacao ${r.minha?"minha":""}" onclick="reagirMensagemV600('${id}','${r.emoji}')">${r.emoji} ${r.quantidade}</button>`).join("")}</div>`:"";
}

function alternarPesquisaChatV600(){document.getElementById("chatPesquisaBarV600")?.classList.toggle("ativo");document.getElementById("chatPesquisaTextoV600")?.focus()}
function fecharPesquisaChatV600(){document.getElementById("chatPesquisaBarV600")?.classList.remove("ativo");carregarMensagensChatV57(false)}
async function pesquisarMensagensChatV600(){
 const q=(document.getElementById("chatPesquisaTextoV600")?.value||"").trim();if(!q||!chatConversaAtualV57)return;
 const {data,error}=await chatSbV57().rpc("pesquisar_mensagens_chat_v600",{p_conversa_id:chatConversaAtualV57,p_texto:q});
 if(error)return alert(error.message);chatMensagensV57=data||[];renderizarMensagensChatV57(false);
}
async function alternarFavoritoChatV600(){
 if(!chatConversaAtualV57)return;const {data,error}=await chatSbV57().rpc("alternar_favorito_chat_v600",{p_conversa_id:chatConversaAtualV57});
 if(error)return alert(error.message);const b=document.getElementById("chatFavoritoV600");b.textContent=data?"★":"☆";b.classList.toggle("chat-favorito",!!data);
}
function avisoChamadaV600(tipo){alert(`A chamada de ${tipo} precisa do módulo WebRTC e servidor de sinalização. Os botões já estão preparados para a próxima etapa.`)}

document.addEventListener("DOMContentLoaded",()=>{
 const area=document.getElementById("chatMensagens");if(!area)return;
 ["dragenter","dragover"].forEach(ev=>area.addEventListener(ev,e=>{e.preventDefault();area.classList.add("chat-drop-ativo")}));
 ["dragleave","drop"].forEach(ev=>area.addEventListener(ev,e=>{e.preventDefault();area.classList.remove("chat-drop-ativo")}));
 area.addEventListener("drop",e=>enviarArquivosChatV600(e.dataTransfer.files));
});
