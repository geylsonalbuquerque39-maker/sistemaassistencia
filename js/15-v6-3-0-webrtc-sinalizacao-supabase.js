/* =========================================================
   V6.3.0 - WEBRTC + SINALIZAÇÃO SUPABASE
   ========================================================= */
let chamadaAtualV630=null,pcV630=null,streamLocalV630=null,streamRemotoV630=null;
let canalChamadasV630=null,canalSinaisV630=null,chamadaPendenteV630=null;
let candidatosPendentesV630=[],timerChamadaV630=null,inicioChamadaV630=null;
let encerrandoChamadaV631=false;
let contextoAudioToqueV638=null;
let osciladorToqueV638=null;
let ganhoToqueV638=null;
let intervaloToqueV638=null;
let timeoutChamadaRecebidaV638=null;
let toqueSilenciadoV638=false;
let segundosChamadaRecebidaV638=0;
let contadorChamadaRecebidaV638=null;
let timeoutConexaoV650=null;
let timeoutDesconexaoV650=null;
let sinaisProcessadosV650=new Set();
let contextoAudioChamadaV650=null;
let fonteAudioChamadaV650=null;
let ganhoAudioChamadaV650=null;
let altoFalanteAtivoV650=true;
let processandoSinalV650=Promise.resolve();
let cameraAtualIdV651=null;
let cameraAtualFacingV651="user";
let trocandoCameraV651=false;
let saidaAudioAtualV651="";
let elementoAudioRemotoV651=null;
let tentativaRelayV651=false;
let audioDesbloqueadoV652=false;
let tipoChamadaAtualV652="audio";
const rtcConfigV630={
 iceServers:[
   {urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]},
   {
     urls:[
       "turn:openrelay.metered.ca:80",
       "turn:openrelay.metered.ca:443",
       "turn:openrelay.metered.ca:443?transport=tcp",
       "turns:openrelay.metered.ca:443?transport=tcp"
     ],
     username:"openrelayproject",
     credential:"openrelayproject"
   }
 ],
 iceCandidatePoolSize:10,
 iceTransportPolicy:"all",
 bundlePolicy:"max-bundle",
 rtcpMuxPolicy:"require"
};

function sbV630(){return obterSupabaseClient()}
function iniciaisV630(n){return String(n||"U").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()}
function usuarioRemotoV630(){return chamadaAtualV630?.remetente_id===usuarioLogado?.id?{id:chamadaAtualV630.destinatario_id,nome:chamadaAtualV630.destinatario_nome,avatar_url:chamadaAtualV630.destinatario_avatar}:{id:chamadaAtualV630?.remetente_id,nome:chamadaAtualV630?.remetente_nome,avatar_url:chamadaAtualV630?.remetente_avatar}}
function avatarHTMLV630(u){return u?.avatar_url?`<img src="${chatEscV57(u.avatar_url)}" alt="">`:iniciaisV630(u?.nome)}

async function iniciarChamadaV630(tipo){
 tipoChamadaAtualV652=tipo;
 desbloquearAudioChamadaV653();
 if(!chatUsuarioAtualV57?.id)return alert("Selecione um usuário antes de iniciar a chamada.");

 if(chatUsuarioAtualV57.id===usuarioLogado?.id)return;
 if(chamadaAtualV630)return alert("Já existe uma chamada em andamento.");

 try{
  const tipoReal=await prepararMidiaInicialV633(tipo);
  if(!tipoReal)return;

  await sbV630().rpc("limpar_minhas_chamadas_presas_v633");

  const {data,error}=await sbV630().rpc("criar_chamada_v633",{
    p_destinatario_id:chatUsuarioAtualV57.id,
    p_tipo:tipoReal,
    p_conversa_id:chatConversaAtualV57||null
  });
  if(error)throw error;

  chamadaAtualV630=data;
  abrirTelaChamadaV630(chatUsuarioAtualV57,tipoReal,"Chamando...");
  configurarMidiaNaTelaV633(tipoReal);

  await criarPeerV630(true);
  await assinarSinaisV650(chamadaAtualV630.id);
  const oferta=await pcV630.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:tipoReal==="video"});
  await pcV630.setLocalDescription(oferta);
  await enviarSinalV630("offer",pcV630.localDescription);
  iniciarTimeoutConexaoV650();
  setTimeout(()=>carregarSinaisExistentesV650(chamadaAtualV630?.id),800);
 }catch(e){
  await limparChamadaV630();
  const msg=e?.name==="NotAllowedError"
    ?"O navegador não recebeu permissão para usar o microfone ou a câmera."
    :(e?.message||e);
  alert("Não foi possível iniciar a chamada: "+msg);
 }
}

async function prepararMidiaInicialV633(tipo){
 if(tipo==="audio"){
   streamLocalV630=await navigator.mediaDevices.getUserMedia({
     audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
     video:false
   });
   return "audio";
 }

 try{
   streamLocalV630=await navigator.mediaDevices.getUserMedia({
     audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
     video:{facingMode:{ideal:"user"},width:{ideal:1280},height:{ideal:720}}
   });
   cameraAtualFacingV651="user";
   cameraAtualIdV651=streamLocalV630.getVideoTracks()[0]?.getSettings?.().deviceId||null;
   return "video";
 }catch(e){
   const semCamera=["NotFoundError","DevicesNotFoundError","OverconstrainedError"].includes(e?.name)
     || /Requested device not found|device not found/i.test(e?.message||"");

   if(!semCamera)throw e;

   const continuar=confirm(
     "Nenhuma câmera foi encontrada neste computador.\n\n"+
     "Deseja continuar esta ligação somente com áudio?"
   );
   if(!continuar)return null;

   streamLocalV630=await navigator.mediaDevices.getUserMedia({
     audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
     video:false
   });
   return "audio";
 }
}

function configurarMidiaNaTelaV633(tipo){
 const video=tipo==="video";
 const local=document.getElementById("chamadaVideoLocalV630");
 if(local)local.srcObject=streamLocalV630;

 document.getElementById("chamadaVideoLocalV630").style.display=video?"block":"none";
 const remoto=document.getElementById("chamadaVideoRemotoV630");
 if(remoto){
   remoto.classList.toggle("audio-apenas-v652",!video);
   remoto.style.display=video?"block":"block";
 }
 document.getElementById("chamadaAudioAvatarV630").classList.toggle("ativo",!video);
 document.getElementById("chamadaCameraV630").style.display=video?"inline-flex":"none";
 document.getElementById("chamadaTrocarCameraV651").style.display=video?"inline-flex":"none";
}

async function prepararMidiaV630(tipo){
 if(tipo==="video"){
   try{
     streamLocalV630=await navigator.mediaDevices.getUserMedia({
     audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
     video:{facingMode:{ideal:"user"},width:{ideal:1280},height:{ideal:720}}
   });
   cameraAtualFacingV651="user";
   cameraAtualIdV651=streamLocalV630.getVideoTracks()[0]?.getSettings?.().deviceId||null;
   }catch(e){
     const semCamera=["NotFoundError","DevicesNotFoundError","OverconstrainedError"].includes(e?.name)
       || /Requested device not found|device not found/i.test(e?.message||"");
     if(!semCamera)throw e;

     const continuar=confirm(
       "Você recebeu uma chamada de vídeo, mas nenhuma câmera foi encontrada.\n\n"+
       "Deseja atender somente com áudio?"
     );
     if(!continuar)throw new Error("Chamada não atendida porque não há câmera disponível.");

     streamLocalV630=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   }
 }else{
   streamLocalV630=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
 }

 const possuiVideo=streamLocalV630.getVideoTracks().length>0;
 document.getElementById("chamadaVideoLocalV630").srcObject=streamLocalV630;
 document.getElementById("chamadaVideoLocalV630").style.display=possuiVideo?"block":"none";
 const remoto=document.getElementById("chamadaVideoRemotoV630");
 if(remoto){
   remoto.classList.toggle("audio-apenas-v652",tipo!=="video");
   remoto.style.display="block";
 }
 document.getElementById("chamadaAudioAvatarV630").classList.toggle("ativo",tipo!=="video");
 document.getElementById("chamadaCameraV630").style.display=possuiVideo?"inline-flex":"none";
 document.getElementById("chamadaTrocarCameraV651").style.display=possuiVideo?"inline-flex":"none";
 cameraAtualIdV651=streamLocalV630.getVideoTracks()[0]?.getSettings?.().deviceId||cameraAtualIdV651;
}

async function criarPeerV630(iniciador){
 if(pcV630){
   try{pcV630.close()}catch(_){}
 }

 pcV630=new RTCPeerConnection(rtcConfigV630);
 streamRemotoV630=new MediaStream();

 const remoto=document.getElementById("chamadaVideoRemotoV630");
 if(remoto){
   remoto.srcObject=streamRemotoV630;
   remoto.autoplay=true;
   remoto.playsInline=true;
 }

 streamLocalV630?.getTracks().forEach(track=>pcV630.addTrack(track,streamLocalV630));

 pcV630.ontrack=event=>{
   const faixas=event.streams?.[0]?.getTracks?.()||[event.track];
   faixas.forEach(track=>{
     if(track&&!streamRemotoV630.getTracks().some(t=>t.id===track.id)){
       streamRemotoV630.addTrack(track);
     }
   });
   conectarAudioRemotoV650();
   tentarReproduzirMidiaRemotaV650();
 };

 pcV630.onicecandidate=event=>{
   if(event.candidate&&chamadaAtualV630?.id){
     enviarSinalV630("candidate",event.candidate.toJSON()).catch(error=>console.error("ICE:",error));
   }
 };

 pcV630.oniceconnectionstatechange=()=>tratarEstadoConexaoV650();
 pcV630.onconnectionstatechange=()=>tratarEstadoConexaoV650();
 pcV630.onsignalingstatechange=()=>{
   if(pcV630?.signalingState==="stable")aplicarCandidatosPendentesV630().catch(console.error);
 };
}

function tratarEstadoConexaoV650(){
 if(!pcV630)return;

 const estado=pcV630.connectionState;
 const ice=pcV630.iceConnectionState;

 if(estado==="connected"||ice==="connected"||ice==="completed"){
   clearTimeout(timeoutConexaoV650);
   clearTimeout(timeoutDesconexaoV650);
   timeoutConexaoV650=null;
   timeoutDesconexaoV650=null;
   atualizarEstadoChamadaV630("Em chamada");
   iniciarCronometroV630();
   desbloquearAudioChamadaV653(); conectarAudioRemotoV650();
   tentarReproduzirMidiaRemotaV650();
   return;
 }

 if(estado==="connecting"||ice==="checking"){
   atualizarEstadoChamadaV630("Conectando...");
   return;
 }

 if(estado==="disconnected"||ice==="disconnected"){
   atualizarEstadoChamadaV630("Reconectando...");
   clearTimeout(timeoutDesconexaoV650);
   timeoutDesconexaoV650=setTimeout(()=>{
     if(chamadaAtualV630&&pcV630&&["disconnected","failed"].includes(pcV630.connectionState)){
       encerrarChamadaV630("encerrada");
     }
   },10000);
   return;
 }

 if(estado==="failed"||ice==="failed"){
   atualizarEstadoChamadaV630("Falha na conexão");
   setTimeout(()=>chamadaAtualV630&&encerrarChamadaV630("encerrada"),1200);
 }
}

function iniciarTimeoutConexaoV650(){
 clearTimeout(timeoutConexaoV650);
 tentativaRelayV651=false;

 timeoutConexaoV650=setTimeout(async()=>{
   if(!chamadaAtualV630||!pcV630)return;

   const conectado=pcV630.connectionState==="connected"||
     ["connected","completed"].includes(pcV630.iceConnectionState);
   if(conectado)return;

   // Em redes corporativas, tenta novamente priorizando a renovação ICE/TURN.
   if(!tentativaRelayV651){
     tentativaRelayV651=true;
     atualizarEstadoChamadaV630("Tentando conexão pela rede da empresa...");

     try{
       pcV630.restartIce?.();

       if(pcV630.signalingState==="stable"&&chamadaAtualV630?.remetente_id===usuarioLogado?.id){
         const oferta=await pcV630.createOffer({
           iceRestart:true,
           offerToReceiveAudio:true,
           offerToReceiveVideo:chamadaAtualV630?.tipo==="video"
         });
         await pcV630.setLocalDescription(oferta);
         await enviarSinalV630("offer",pcV630.localDescription);
       }

       setTimeout(()=>carregarSinaisExistentesV650(chamadaAtualV630?.id).catch(console.error),1200);
     }catch(error){
       console.error("Fallback TURN/ICE:",error);
     }

     timeoutConexaoV650=setTimeout(()=>{
       if(!chamadaAtualV630||!pcV630)return;
       const ok=pcV630.connectionState==="connected"||
         ["connected","completed"].includes(pcV630.iceConnectionState);
       if(!ok){
         atualizarEstadoChamadaV630("Rede bloqueou a ligação");
         setTimeout(()=>chamadaAtualV630&&encerrarChamadaV630("encerrada"),1800);
       }
     },18000);
     return;
   }
 },18000);
}

function desbloquearAudioChamadaV653(){
 try{
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(AudioCtx){
     if(!contextoAudioChamadaV650){
       contextoAudioChamadaV650=new AudioCtx({latencyHint:"interactive"});
     }

     if(contextoAudioChamadaV650.state==="suspended"){
       contextoAudioChamadaV650.resume().catch(()=>{});
     }

     const osc=contextoAudioChamadaV650.createOscillator();
     const ganho=contextoAudioChamadaV650.createGain();
     ganho.gain.value=0.00001;
     osc.connect(ganho);
     ganho.connect(contextoAudioChamadaV650.destination);
     osc.start();
     osc.stop(contextoAudioChamadaV650.currentTime+.03);
   }

   const audio=obterElementoAudioRemotoV651();
   audio.muted=false;
   audio.volume=1;

   // Não aguarda play() aqui. Em alguns celulares a Promise fica pendente
   // enquanto ainda não existe uma faixa remota e bloqueava os botões.
   try{
     const promessa=audio.play();
     promessa?.catch?.(()=>{});
   }catch(_){}

   audioDesbloqueadoV652=true;
 }catch(error){
   console.warn("Desbloqueio de áudio:",error);
 }
}

function desbloquearAudioChamadaV652(){
 desbloquearAudioChamadaV653();
 return Promise.resolve();
}

function obterElementoAudioRemotoV651(){
 if(elementoAudioRemotoV651&&document.body.contains(elementoAudioRemotoV651)){
   return elementoAudioRemotoV651;
 }

 let audio=document.getElementById("chamadaAudioRemotoV651");
 if(!audio){
   audio=document.createElement("audio");
   audio.id="chamadaAudioRemotoV651";
   audio.autoplay=true;
   audio.playsInline=true;
   audio.style.display="none";
   document.body.appendChild(audio);
 }
 elementoAudioRemotoV651=audio;
 return audio;
}

async function tentarReproduzirMidiaRemotaV650(){
 const remoto=document.getElementById("chamadaVideoRemotoV630");
 const audio=obterElementoAudioRemotoV651();

 if(remoto){
   remoto.srcObject=streamRemotoV630;
   remoto.autoplay=true;
   remoto.playsInline=true;
   remoto.muted=true;
   try{await remoto.play()}catch(_){}
 }

 if(audio){
   audio.srcObject=streamRemotoV630;
   audio.muted=false;
   audio.volume=1;
   try{await audio.play()}catch(error){
     console.warn("O navegador bloqueou o áudio automático:",error?.message||error);
   }
 }
}

async function prepararSaidaAudioV651(preferirAltoFalante=true){
 const audio=obterElementoAudioRemotoV651();
 if(!audio||typeof audio.setSinkId!=="function")return false;

 try{
   const dispositivos=await navigator.mediaDevices.enumerateDevices();
   const saidas=dispositivos.filter(d=>d.kind==="audiooutput");
   if(!saidas.length)return false;

   let escolhida=null;
   if(preferirAltoFalante){
     escolhida=saidas.find(d=>/alto.?falante|speaker|speakers|viva.?voz|hands.?free/i.test(d.label||""));
   }else{
     escolhida=saidas.find(d=>/fone|headset|earpiece|communications/i.test(d.label||""));
   }

   escolhida=escolhida||saidas.find(d=>d.deviceId==="default")||saidas[0];
   await audio.setSinkId(escolhida.deviceId);
   saidaAudioAtualV651=escolhida.deviceId;
   return true;
 }catch(error){
   console.warn("Seleção da saída de áudio:",error?.message||error);
   return false;
 }
}

async function conectarAudioRemotoV650(){
 if(!streamRemotoV630?.getAudioTracks().length)return;

 const audio=obterElementoAudioRemotoV651();
 if(audio){
   audio.srcObject=streamRemotoV630;
   audio.muted=false;
   audio.volume=1;
 }

 try{
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx){
     await tentarReproduzirMidiaRemotaV650();
     return;
   }

   if(!contextoAudioChamadaV650){
     contextoAudioChamadaV650=new AudioCtx({latencyHint:"interactive"});
   }
   if(contextoAudioChamadaV650.state==="suspended"){
     await contextoAudioChamadaV650.resume();
   }

   try{fonteAudioChamadaV650?.disconnect()}catch(_){}
   try{ganhoAudioChamadaV650?.disconnect()}catch(_){}

   fonteAudioChamadaV650=contextoAudioChamadaV650.createMediaStreamSource(streamRemotoV630);
   ganhoAudioChamadaV650=contextoAudioChamadaV650.createGain();
   ganhoAudioChamadaV650.gain.value=altoFalanteAtivoV650?(tipoChamadaAtualV652==="audio"?5.0:3.2):0.7;
   fonteAudioChamadaV650.connect(ganhoAudioChamadaV650);
   ganhoAudioChamadaV650.connect(contextoAudioChamadaV650.destination);

   // Evita áudio duplicado: o elemento fica mudo quando o ganho Web Audio está ativo.
   if(audio)audio.muted=true;
 }catch(error){
   console.warn("Ganho de áudio:",error);
   if(audio){
     audio.muted=false;
     audio.volume=altoFalanteAtivoV650?1:.55;
   }
 }

 await prepararSaidaAudioV651(altoFalanteAtivoV650);
 await tentarReproduzirMidiaRemotaV650();

 // Se Web Audio estiver ativo, mantém o elemento auxiliar mudo.
 if(ganhoAudioChamadaV650&&audio)audio.muted=true;
}

async function alternarAltoFalanteV651(){
 altoFalanteAtivoV650=!altoFalanteAtivoV650;
 const botao=document.getElementById("chamadaAltoFalanteV650");
 const audio=obterElementoAudioRemotoV651();

 if(botao){
   botao.textContent=altoFalanteAtivoV650?"🔊":"🔈";
   botao.title=altoFalanteAtivoV650?"Alto-falante ativado":"Som normal";
   botao.classList.toggle("ativo",altoFalanteAtivoV650);
   botao.classList.toggle("desativado",!altoFalanteAtivoV650);
 }

 // O clique do usuário libera AudioContext/autoplay em celulares.
 try{
   if(contextoAudioChamadaV650?.state==="suspended"){
     await contextoAudioChamadaV650.resume();
   }
 }catch(_){}

 await prepararSaidaAudioV651(altoFalanteAtivoV650);

 if(ganhoAudioChamadaV650){
   const agora=contextoAudioChamadaV650?.currentTime||0;
   ganhoAudioChamadaV650.gain.cancelScheduledValues(agora);
   ganhoAudioChamadaV650.gain.setTargetAtTime(altoFalanteAtivoV650?(tipoChamadaAtualV652==="audio"?5.0:3.2):.7,agora,.035);
   if(audio)audio.muted=true;
 }else{
   if(audio){
     audio.muted=false;
     audio.volume=altoFalanteAtivoV650?1:.5;
     try{await audio.play()}catch(_){}
   }
   await conectarAudioRemotoV650();
 }

 if(botao){
   botao.classList.add("confirmado-v651");
   setTimeout(()=>botao.classList.remove("confirmado-v651"),450);
 }
}

function alternarAltoFalanteV650(){
 return alternarAltoFalanteV651();
}

async function enviarSinalV630(tipo,payload){
 if(!chamadaAtualV630?.id)throw new Error("Chamada sem identificação.");
 const {error}=await sbV630().from("chat_chamada_sinais").insert({
   chamada_id:chamadaAtualV630.id,
   remetente_id:usuarioLogado.id,
   tipo,
   payload
 });
 if(error)throw error;
}

async function processarSinalV650(sinal){
 if(!sinal||sinal.remetente_id===usuarioLogado?.id||!pcV630)return;

 const chave=String(sinal.id||[
   sinal.remetente_id,sinal.tipo,
   sinal.created_at||"",
   JSON.stringify(sinal.payload||{})
 ].join("|"));

 if(sinaisProcessadosV650.has(chave))return;
 sinaisProcessadosV650.add(chave);

 if(sinal.tipo==="offer"){
   if(pcV630.signalingState!=="stable"){
     try{await pcV630.setLocalDescription({type:"rollback"})}catch(_){}
   }
   await pcV630.setRemoteDescription(new RTCSessionDescription(sinal.payload));
   await aplicarCandidatosPendentesV630();

   const resposta=await pcV630.createAnswer();
   await pcV630.setLocalDescription(resposta);
   await enviarSinalV630("answer",pcV630.localDescription);
   atualizarEstadoChamadaV630("Conectando...");
   iniciarTimeoutConexaoV650();
   return;
 }

 if(sinal.tipo==="answer"){
   if(!pcV630.currentRemoteDescription){
     await pcV630.setRemoteDescription(new RTCSessionDescription(sinal.payload));
   }
   await aplicarCandidatosPendentesV630();
   return;
 }

 if(sinal.tipo==="candidate"){
   if(pcV630.remoteDescription?.type){
     try{
       await pcV630.addIceCandidate(new RTCIceCandidate(sinal.payload));
     }catch(error){
       if(!/Unknown ufrag/i.test(error?.message||""))throw error;
     }
   }else{
     candidatosPendentesV630.push(sinal.payload);
   }
 }
}

async function assinarSinaisV650(id){
 if(canalSinaisV630){
   try{await sbV630().removeChannel(canalSinaisV630)}catch(_){}
 }

 canalSinaisV630=sbV630()
   .channel("sinais-v650-"+id+"-"+usuarioLogado.id+"-"+Date.now())
   .on("postgres_changes",{
     event:"INSERT",
     schema:"public",
     table:"chat_chamada_sinais",
     filter:"chamada_id=eq."+id
   },payload=>{
     processandoSinalV650=processandoSinalV650
       .then(()=>processarSinalV650(payload.new))
       .catch(error=>console.error("Sinal WebRTC:",error));
   });

 await new Promise((resolve,reject)=>{
   let finalizado=false;
   const limite=setTimeout(()=>{
     if(!finalizado){finalizado=true;resolve()}
   },3000);

   canalSinaisV630.subscribe(status=>{
     if(finalizado)return;
     if(status==="SUBSCRIBED"){
       finalizado=true;
       clearTimeout(limite);
       resolve();
     }else if(["CHANNEL_ERROR","TIMED_OUT"].includes(status)){
       finalizado=true;
       clearTimeout(limite);
       reject(new Error("Não foi possível ativar a sinalização da chamada."));
     }
   });
 });
}

function assinarSinaisV630(id){
 return assinarSinaisV650(id);
}

async function carregarSinaisExistentesV650(id){
 if(!id||!pcV630)return;
 const {data,error}=await sbV630()
   .from("chat_chamada_sinais")
   .select("*")
   .eq("chamada_id",id)
   .order("created_at",{ascending:true});
 if(error)throw error;

 for(const sinal of data||[]){
   await processarSinalV650(sinal);
 }
}

async function aplicarCandidatosPendentesV630(){
 if(!pcV630?.remoteDescription?.type)return;
 const pendentes=candidatosPendentesV630.splice(0);
 for(const candidato of pendentes){
   try{
     await pcV630.addIceCandidate(new RTCIceCandidate(candidato));
   }catch(error){
     if(!/Unknown ufrag/i.test(error?.message||""))console.warn("ICE pendente:",error);
   }
 }
}

async function aceitarChamadaV630(){
 const c=chamadaPendenteV630;
 if(c)tipoChamadaAtualV652=c.tipo||"audio";
 desbloquearAudioChamadaV653();
 if(!c)return;

 clearTimeout(timeoutChamadaRecebidaV638);
 pararToqueChamadaV638();
 pararContadorChamadaRecebidaV638();

 const recebida=document.getElementById("chamadaRecebidaV630");
 if(recebida){
   recebida.classList.remove("aberta");
   recebida.style.display="none";
   recebida.setAttribute("aria-hidden","true");
 }

 chamadaAtualV630=c;
 chamadaPendenteV630=null;
 sinaisProcessadosV650.clear();
 candidatosPendentesV630=[];

 try{
   const u={id:c.remetente_id,nome:c.remetente_nome,avatar_url:c.remetente_avatar};
   abrirTelaChamadaV630(u,c.tipo,"Preparando áudio...");

   await prepararMidiaV630(c.tipo);
   await criarPeerV630(false);
   await assinarSinaisV650(c.id);

   const {error}=await sbV630().rpc("responder_chamada_v633",{
     p_chamada_id:c.id,
     p_aceitar:true
   });
   if(error)throw error;

   atualizarEstadoChamadaV630("Conectando...");
   await carregarSinaisExistentesV650(c.id);
   iniciarTimeoutConexaoV650();

   setTimeout(()=>carregarSinaisExistentesV650(c.id).catch(console.error),1200);
   setTimeout(()=>carregarSinaisExistentesV650(c.id).catch(console.error),3000);
 }catch(e){
   await limparChamadaV630();
   alert("Não foi possível aceitar a chamada: "+(e?.message||e));
 }
}
async function recusarChamadaV630(){
 if(!chamadaPendenteV630)return;

 clearTimeout(timeoutChamadaRecebidaV638);
 pararToqueChamadaV638();
 pararContadorChamadaRecebidaV638();

 const id=chamadaPendenteV630.id;
 chamadaPendenteV630=null;

 const recebida=document.getElementById("chamadaRecebidaV630");
 if(recebida){
   recebida.classList.remove("aberta");
   recebida.style.display="none";
   recebida.setAttribute("aria-hidden","true");
 }

 await sbV630().rpc("responder_chamada_v633",{
   p_chamada_id:id,
   p_aceitar:false
 });

 if(typeof carregarMensagensChatV57==="function"&&chatConversaAtualV57){
   setTimeout(()=>carregarMensagensChatV57(false),250);
 }
}

function abrirTelaChamadaV630(u,tipo,status){
 const avatar=avatarHTMLV630(u);
 document.getElementById("chamadaAvatarV630").innerHTML=avatar;document.getElementById("chamadaAudioFotoV630").innerHTML=avatar;
 document.getElementById("chamadaNomeV630").textContent=u?.nome||"Usuário";document.getElementById("chamadaAudioNomeV630").textContent=u?.nome||"Usuário";
 atualizarEstadoChamadaV630(status);
 const overlay=document.getElementById("chamadaOverlayV630");
 if(overlay){
   overlay.style.display="flex";
   overlay.setAttribute("aria-hidden","false");
   overlay.classList.add("aberta");
 }
}
function atualizarEstadoChamadaV630(s){document.getElementById("chamadaStatusV630").textContent=s;document.getElementById("chamadaAudioEstadoV630").textContent=s}
function iniciarCronometroV630(){if(timerChamadaV630)return;inicioChamadaV630=Date.now();timerChamadaV630=setInterval(()=>{const s=Math.floor((Date.now()-inicioChamadaV630)/1000);document.getElementById("chamadaTempoV630").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")},1000)}
async function trocarCameraV651(){
 if(trocandoCameraV651||!streamLocalV630)return;

 const trackAtual=streamLocalV630.getVideoTracks()[0];
 if(!trackAtual)return alert("A chamada atual não possui câmera ativa.");

 trocandoCameraV651=true;
 const botao=document.getElementById("chamadaTrocarCameraV651");
 botao?.classList.add("trocando");
 if(botao)botao.textContent="⏳";

 const facingAnterior=trackAtual.getSettings?.().facingMode||cameraAtualFacingV651||"user";
 const facingDestino=facingAnterior==="environment"?"user":"environment";
 const sender=pcV630?.getSenders().find(s=>s.track?.kind==="video");
 const local=document.getElementById("chamadaVideoLocalV630");
 let novaStream=null;
 let novaTrack=null;

 try{
   // Em celulares, duas câmeras geralmente não podem ficar abertas ao mesmo tempo.
   // Primeiro remove a faixa do envio e libera a câmera atual.
   if(sender)await sender.replaceTrack(null);
   try{trackAtual.stop()}catch(_){}
   streamLocalV630.removeTrack(trackAtual);

   const tentarCaptura=async constraint=>{
     return navigator.mediaDevices.getUserMedia({
       audio:false,
       video:{
         facingMode:constraint,
         width:{ideal:1280},
         height:{ideal:720},
         frameRate:{ideal:30,max:30}
       }
     });
   };

   try{
     novaStream=await tentarCaptura({exact:facingDestino});
   }catch(_){
     novaStream=await tentarCaptura({ideal:facingDestino});
   }

   novaTrack=novaStream.getVideoTracks()[0];
   if(!novaTrack)throw new Error("A câmera selecionada não forneceu imagem.");

   // Aguarda a câmera produzir dimensões válidas antes de voltar ao PeerConnection.
   const teste=document.createElement("video");
   teste.muted=true;
   teste.autoplay=true;
   teste.playsInline=true;
   teste.srcObject=new MediaStream([novaTrack]);

   await new Promise((resolve,reject)=>{
     const limite=setTimeout(()=>reject(new Error("A câmera não iniciou a imagem.")),8000);
     const verificar=()=>{
       if(teste.videoWidth>0&&teste.videoHeight>0&&novaTrack.readyState==="live"){
         clearTimeout(limite);
         resolve();
       }
     };
     teste.onloadedmetadata=async()=>{
       try{await teste.play()}catch(_){}
       verificar();
     };
     teste.onplaying=verificar;
     setTimeout(verificar,500);
   });

   streamLocalV630.addTrack(novaTrack);
   if(sender)await sender.replaceTrack(novaTrack);

   if(local){
     local.srcObject=new MediaStream([
       ...streamLocalV630.getAudioTracks(),
       novaTrack
     ]);
     local.muted=true;
     local.autoplay=true;
     local.playsInline=true;
     try{await local.play()}catch(_){}
   }

   cameraAtualFacingV651=novaTrack.getSettings?.().facingMode||facingDestino;
   cameraAtualIdV651=novaTrack.getSettings?.().deviceId||null;
   novaStream=null;
 }catch(error){
   console.error("Troca de câmera:",error);

   // Se a troca falhar, tenta restaurar a câmera anterior.
   try{
     novaStream?.getTracks().forEach(t=>{try{t.stop()}catch(_){}});
     const restaurada=await navigator.mediaDevices.getUserMedia({
       audio:false,
       video:{
         facingMode:{ideal:facingAnterior},
         width:{ideal:1280},
         height:{ideal:720}
       }
     });
     const trackRestaurada=restaurada.getVideoTracks()[0];
     if(trackRestaurada){
       streamLocalV630.addTrack(trackRestaurada);
       if(sender)await sender.replaceTrack(trackRestaurada);
       if(local){
         local.srcObject=new MediaStream([
           ...streamLocalV630.getAudioTracks(),
           trackRestaurada
         ]);
         local.muted=true;
         local.playsInline=true;
         try{await local.play()}catch(_){}
       }
       cameraAtualFacingV651=trackRestaurada.getSettings?.().facingMode||facingAnterior;
       cameraAtualIdV651=trackRestaurada.getSettings?.().deviceId||null;
     }
   }catch(restaurarErro){
     console.error("Falha ao restaurar câmera:",restaurarErro);
   }

   alert("Não foi possível trocar a câmera neste aparelho. A câmera anterior foi restaurada quando possível.");
 }finally{
   trocandoCameraV651=false;
   botao?.classList.remove("trocando");
   if(botao)botao.textContent="🔄";
 }
}

function alternarMicrofoneV630(){const t=streamLocalV630?.getAudioTracks()[0];if(!t)return;t.enabled=!t.enabled;document.getElementById("chamadaMicV630").classList.toggle("desativado",!t.enabled)}
function alternarCameraV630(){const t=streamLocalV630?.getVideoTracks()[0];if(!t)return;t.enabled=!t.enabled;document.getElementById("chamadaCameraV630").classList.toggle("desativado",!t.enabled)}

async function encerrarChamadaV630(status="encerrada"){
 if(encerrandoChamadaV631)return;
 encerrandoChamadaV631=true;

 const botao=document.getElementById("chamadaEncerrarV631");
 botao?.classList.add("encerrando");

 const id=chamadaAtualV630?.id;

 // Fecha imediatamente no usuário que clicou.
 await limparChamadaV630();

 // Atualiza o banco depois, sem manter a tela presa esperando rede.
 if(id){
   try{
     const {error}=await sbV630().rpc("encerrar_chamada_v633",{
       p_chamada_id:id,
       p_status:status==="cancelada"?"cancelada":"encerrada"
     });
     if(error)console.error("Falha ao registrar encerramento:",error);
     if(typeof carregarMensagensChatV57==="function"&&chatConversaAtualV57){
       setTimeout(()=>carregarMensagensChatV57(false),250);
     }
   }catch(e){
     console.error("Falha ao registrar encerramento:",e);
   }
 }

 encerrandoChamadaV631=false;
 botao?.classList.remove("encerrando");
}

async function limparChamadaV630(){
 clearTimeout(timeoutChamadaRecebidaV638);
 clearTimeout(timeoutConexaoV650);
 clearTimeout(timeoutDesconexaoV650);
 timeoutConexaoV650=null;
 timeoutDesconexaoV650=null;
 pararToqueChamadaV638();
 pararContadorChamadaRecebidaV638();

 clearInterval(timerChamadaV630);
 timerChamadaV630=null;
 inicioChamadaV630=null;

 // Para câmera e microfone de forma garantida.
 if(streamLocalV630){
   streamLocalV630.getTracks().forEach(track=>{
     try{track.stop()}catch(_){}
   });
 }
 if(streamRemotoV630){
   streamRemotoV630.getTracks().forEach(track=>{
     try{track.stop()}catch(_){}
   });
 }

 // Remove mídias dos elementos para apagar luz da câmera e áudio remoto.
 const videoLocal=document.getElementById("chamadaVideoLocalV630");
 const videoRemoto=document.getElementById("chamadaVideoRemotoV630");
 if(videoLocal){
   try{videoLocal.pause()}catch(_){}
   videoLocal.srcObject=null;
 }
 if(videoRemoto){
   try{videoRemoto.pause()}catch(_){}
   videoRemoto.srcObject=null;
 }

 if(pcV630){
   try{
     pcV630.ontrack=null;
     pcV630.onicecandidate=null;
     pcV630.onconnectionstatechange=null;
     pcV630.getSenders().forEach(sender=>{
       try{sender.track?.stop()}catch(_){}
     });
     pcV630.close();
   }catch(_){}
 }

 try{fonteAudioChamadaV650?.disconnect()}catch(_){}
 try{ganhoAudioChamadaV650?.disconnect()}catch(_){}
 try{await contextoAudioChamadaV650?.close()}catch(_){}
 fonteAudioChamadaV650=null;
 ganhoAudioChamadaV650=null;
 contextoAudioChamadaV650=null;

 if(elementoAudioRemotoV651){
   try{elementoAudioRemotoV651.pause()}catch(_){}
   elementoAudioRemotoV651.srcObject=null;
 }
 saidaAudioAtualV651="";
 tentativaRelayV651=false;
 audioDesbloqueadoV652=false;
 tipoChamadaAtualV652="audio";
 trocandoCameraV651=false;
 cameraAtualIdV651=null;
 cameraAtualFacingV651="user";

 pcV630=null;
 streamLocalV630=null;
 streamRemotoV630=null;
 candidatosPendentesV630=[];
 sinaisProcessadosV650.clear();
 processandoSinalV650=Promise.resolve();

 if(canalSinaisV630){
   try{await sbV630().removeChannel(canalSinaisV630)}catch(_){}
   canalSinaisV630=null;
 }

 chamadaAtualV630=null;
 chamadaPendenteV630=null;

 const overlayChamada=document.getElementById("chamadaOverlayV630");
 if(overlayChamada){
   overlayChamada.classList.remove("aberta");
   overlayChamada.style.display="none";
   overlayChamada.setAttribute("aria-hidden","true");
 }

 const chamadaRecebida=document.getElementById("chamadaRecebidaV630");
 if(chamadaRecebida){
   chamadaRecebida.classList.remove("aberta");
   chamadaRecebida.style.display="none";
   chamadaRecebida.setAttribute("aria-hidden","true");
 }

 document.getElementById("chamadaAudioAvatarV630")?.classList.remove("ativo");

 const tempo=document.getElementById("chamadaTempoV630");
 if(tempo)tempo.textContent="00:00";

 const mic=document.getElementById("chamadaMicV630");
 const camera=document.getElementById("chamadaCameraV630");
 const trocarCamera=document.getElementById("chamadaTrocarCameraV651");
 const altoFalante=document.getElementById("chamadaAltoFalanteV650");
 mic?.classList.remove("desativado");
 camera?.classList.remove("desativado");
 trocarCamera?.classList.remove("trocando");
 if(trocarCamera)trocarCamera.textContent="🔄";
 altoFalanteAtivoV650=true;
 if(altoFalante){
   altoFalante.textContent="🔊";
   altoFalante.title="Som alto ativado";
   altoFalante.classList.add("ativo");
   altoFalante.classList.remove("desativado");
 }

}

async function iniciarEscutaChamadasV630(){
 if(!usuarioLogado?.id)return;
 if(canalChamadasV630)await sbV630().removeChannel(canalChamadasV630);
 canalChamadasV630=sbV630().channel("chamadas-"+usuarioLogado.id)
 .on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_chamadas",filter:"destinatario_id=eq."+usuarioLogado.id},p=>mostrarChamadaRecebidaV630(p.new))
 .on("postgres_changes",{event:"UPDATE",schema:"public",table:"chat_chamadas",filter:"id=neq.00000000-0000-0000-0000-000000000000"},p=>{
   if(chamadaAtualV630?.id===p.new.id){
    chamadaAtualV630={...chamadaAtualV630,...p.new};
    if(p.new.status==="aceita")atualizarEstadoChamadaV630("Conectando...");
    if(["recusada","encerrada","cancelada"].includes(p.new.status)){
      encerrandoChamadaV631=true;
      limparChamadaV630().finally(()=>{encerrandoChamadaV631=false});
    }
   }
   if(chamadaPendenteV630?.id===p.new.id&&["recusada","encerrada","cancelada"].includes(p.new.status)){
     chamadaPendenteV630=null;
     document.getElementById("chamadaRecebidaV630")?.classList.remove("aberta");
   }
 }).subscribe();
}
function iniciarToqueChamadaV638(){
 pararToqueChamadaV638();
 toqueSilenciadoV638=false;
 const botao=document.getElementById("chamadaSilenciarToqueV638");
 if(botao)botao.textContent="🔔";

 try{
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx)return;
   contextoAudioToqueV638=new AudioCtx();

   const tocarPulso=()=>{
     if(toqueSilenciadoV638||!contextoAudioToqueV638)return;
     try{
       const agora=contextoAudioToqueV638.currentTime;
       const osc=contextoAudioToqueV638.createOscillator();
       const ganho=contextoAudioToqueV638.createGain();

       osc.type="sine";
       osc.frequency.setValueAtTime(740,agora);
       osc.frequency.setValueAtTime(880,agora+.22);

       ganho.gain.setValueAtTime(.0001,agora);
       ganho.gain.exponentialRampToValueAtTime(.18,agora+.03);
       ganho.gain.exponentialRampToValueAtTime(.0001,agora+.42);

       osc.connect(ganho);
       ganho.connect(contextoAudioToqueV638.destination);
       osc.start(agora);
       osc.stop(agora+.45);
     }catch(_){}
   };

   tocarPulso();
   intervaloToqueV638=setInterval(()=>{
     tocarPulso();
     setTimeout(tocarPulso,600);
   },2600);
 }catch(e){
   console.warn("Toque de chamada indisponível:",e);
 }
}

function pararToqueChamadaV638(){
 clearInterval(intervaloToqueV638);
 intervaloToqueV638=null;

 try{
   osciladorToqueV638?.stop();
 }catch(_){}
 osciladorToqueV638=null;

 try{
   contextoAudioToqueV638?.close();
 }catch(_){}
 contextoAudioToqueV638=null;
}

function alternarToqueChamadaV638(){
 toqueSilenciadoV638=!toqueSilenciadoV638;
 const botao=document.getElementById("chamadaSilenciarToqueV638");
 if(botao){
   botao.textContent=toqueSilenciadoV638?"🔕":"🔔";
   botao.title=toqueSilenciadoV638?"Ativar toque":"Silenciar toque";
 }
 if(toqueSilenciadoV638){
   pararToqueChamadaV638();
 }else{
   iniciarToqueChamadaV638();
 }
}

function iniciarContadorChamadaRecebidaV638(){
 clearInterval(contadorChamadaRecebidaV638);
 segundosChamadaRecebidaV638=0;
 const label=document.getElementById("chamadaRecebidaTempoV638");
 if(label)label.textContent="Chamando...";

 contadorChamadaRecebidaV638=setInterval(()=>{
   segundosChamadaRecebidaV638++;
   if(label)label.textContent=`Chamando há ${segundosChamadaRecebidaV638}s`;
 },1000);
}

function pararContadorChamadaRecebidaV638(){
 clearInterval(contadorChamadaRecebidaV638);
 contadorChamadaRecebidaV638=null;
 segundosChamadaRecebidaV638=0;
 const label=document.getElementById("chamadaRecebidaTempoV638");
 if(label)label.textContent="Chamando...";
}

async function expirarChamadaRecebidaV638(){
 if(!chamadaPendenteV630)return;

 const id=chamadaPendenteV630.id;
 chamadaPendenteV630=null;
 pararToqueChamadaV638();
 pararContadorChamadaRecebidaV638();

 const caixa=document.getElementById("chamadaRecebidaV630");
 if(caixa){
   caixa.classList.remove("aberta");
   caixa.style.display="none";
   caixa.setAttribute("aria-hidden","true");
 }

 try{
   await sbV630().rpc("encerrar_chamada_v633",{
     p_chamada_id:id,
     p_status:"cancelada"
   });
 }catch(e){
   console.warn("Não foi possível marcar chamada como perdida:",e);
 }

 if(typeof carregarMensagensChatV57==="function"&&chatConversaAtualV57){
   setTimeout(()=>carregarMensagensChatV57(false),250);
 }
}

function mostrarChamadaRecebidaV630(c){
 if(chamadaAtualV630||chamadaPendenteV630){
   sbV630().rpc("responder_chamada_v633",{p_chamada_id:c.id,p_aceitar:false});
   return;
 }

 chamadaPendenteV630=c;
 const u={nome:c.remetente_nome,avatar_url:c.remetente_avatar};

 document.getElementById("chamadaRecebidaAvatarV630").innerHTML=avatarHTMLV630(u);
 document.getElementById("chamadaRecebidaNomeV630").textContent=u.nome||"Usuário";
 document.getElementById("chamadaRecebidaTipoV630").textContent=c.tipo==="video"?"Chamada de vídeo":"Chamada de áudio";

 const recebida=document.getElementById("chamadaRecebidaV630");
 if(recebida){
   recebida.style.display="block";
   recebida.setAttribute("aria-hidden","false");
   recebida.classList.add("aberta");
 }

 iniciarToqueChamadaV638();
 iniciarContadorChamadaRecebidaV638();

 clearTimeout(timeoutChamadaRecebidaV638);
 timeoutChamadaRecebidaV638=setTimeout(expirarChamadaRecebidaV638,45000);
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(async()=>{
 try{await sbV630().rpc("limpar_minhas_chamadas_presas_v633")}catch(_){}
 iniciarEscutaChamadasV630();
},1500));

document.addEventListener("DOMContentLoaded",()=>{
 const botao=document.getElementById("chamadaEncerrarV631");
 if(botao){
   botao.addEventListener("click",event=>{
     event.preventDefault();
     event.stopPropagation();
     encerrarChamadaV630("encerrada");
   });
   botao.addEventListener("touchend",event=>{
     event.preventDefault();
     event.stopPropagation();
     encerrarChamadaV630("encerrada");
   },{passive:false});
 }
});

document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&document.getElementById("chamadaOverlayV630")?.classList.contains("aberta")){
   encerrarChamadaV630("encerrada");
 }
});

window.addEventListener("beforeunload",()=>{
 streamLocalV630?.getTracks().forEach(track=>{try{track.stop()}catch(_){}});
 pcV630?.close();
});
