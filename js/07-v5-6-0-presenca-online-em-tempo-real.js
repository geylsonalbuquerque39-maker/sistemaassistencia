/* =========================================================
   V5.6.0 - PRESENÇA ONLINE EM TEMPO REAL
   ========================================================= */
const PRESENCA_V56_TABELA="presenca_usuarios";
const PRESENCA_V56_HEARTBEAT_MS=45000;
const PRESENCA_V56_AUSENTE_APOS_MS=3*60*1000;
const PRESENCA_V56_OFFLINE_APOS_MS=2*60*1000;
let presencaUltimaInteracaoV56=Date.now(),presencaHeartbeatTimerV56=null,presencaPainelTimerV56=null,presencasListaV56=[],presencaEnviandoV56=false;

function telaAtualPresencaV56(){
    const telas=[["telaHomeIntegrada","Início"],["telaBusca","Busca de O.S."],["telaCI","Gerando C.I."],["telaAdminAtualizar","Importação REXPEDLR"],["telaAdminUsuarios","Gerenciamento de usuários"],["telaAdminPresenca","Usuários online"],["telaAdminHistoricoCI","Histórico de C.I."],["telaAdminAuditoria","Auditoria"],["telaAdmin","Dashboard administrativo"],["telaInteligencia","Inteligência operacional"],["telaRelatorios","Relatórios"]];
    for(const [id,nome] of telas){const el=document.getElementById(id);if(el&&getComputedStyle(el).display!=="none")return nome;}
    return "ERP";
}
function contextoAtualPresencaV56(){
    const titulo=document.querySelector(".intel-ficha h2")?.textContent?.trim();
    if(titulo&&/O\.?S/i.test(titulo))return titulo;
    if(typeof ciAtual!=="undefined"&&ciAtual&&telaAtualPresencaV56()==="Gerando C.I."){try{return typeof nomeCIAtual==="function"?nomeCIAtual():String(ciAtual)}catch(e){}}
    return "";
}
function statusLocalPresencaV56(){return document.hidden||Date.now()-presencaUltimaInteracaoV56>PRESENCA_V56_AUSENTE_APOS_MS?"ausente":"online";}
function marcarInteracaoPresencaV56(){presencaUltimaInteracaoV56=Date.now();}
async function enviarHeartbeatPresencaV56(){
    if(!usuarioLogado?.id||presencaEnviandoV56)return false;
    presencaEnviandoV56=true;
    try{
        const agora=new Date().toISOString(),status=statusLocalPresencaV56();
        const {error}=await obterSupabaseClient().from(PRESENCA_V56_TABELA).upsert({
            user_id:usuarioLogado.id,nome:usuarioLogado.nome||"",email:usuarioLogado.email||"",perfil:usuarioLogado.perfil||"",
            status,tela:telaAtualPresencaV56(),contexto:contextoAtualPresencaV56(),last_seen:agora,updated_at:agora
        },{onConflict:"user_id"});
        if(error)throw error;
        const i=document.getElementById("presencaIndicadorTopo");
        if(i){i.textContent=status==="ausente"?"● ausente":"● online";i.style.background=status==="ausente"?"#fef3c7":"#e8f7ec";i.style.color=status==="ausente"?"#92400e":"#176b37";}
        return true;
    }catch(e){console.warn("Presença V5.6:",e?.message||e);return false}
    finally{presencaEnviandoV56=false}
}
async function marcarOfflinePresencaV56(){
    if(!usuarioLogado?.id)return;
    try{const agora=new Date().toISOString();await obterSupabaseClient().from(PRESENCA_V56_TABELA).upsert({
        user_id:usuarioLogado.id,nome:usuarioLogado.nome||"",email:usuarioLogado.email||"",perfil:usuarioLogado.perfil||"",
        status:"offline",tela:"Sessão encerrada",contexto:"",last_seen:agora,updated_at:agora
    },{onConflict:"user_id"})}catch(e){}
}
function iniciarPresencaV56(){
    clearInterval(presencaHeartbeatTimerV56);
    if(!usuarioLogado?.id)return;
    marcarInteracaoPresencaV56();enviarHeartbeatPresencaV56();
    presencaHeartbeatTimerV56=setInterval(enviarHeartbeatPresencaV56,PRESENCA_V56_HEARTBEAT_MS);
}
function atualizarPresencaAgoraV56(){if(usuarioLogado?.id)enviarHeartbeatPresencaV56()}
function classificarPresencaV56(item){
    const idade=Date.now()-new Date(item.last_seen||item.updated_at||0).getTime();
    if(item.status==="offline"||!Number.isFinite(idade)||idade>PRESENCA_V56_OFFLINE_APOS_MS)return "offline";
    if(item.status==="ausente"||idade>PRESENCA_V56_AUSENTE_APOS_MS)return "ausente";
    return "online";
}
function tempoRelativoPresencaV56(data){
    const s=Math.floor(Math.max(0,Date.now()-new Date(data||0).getTime())/1000);
    if(s<15)return "agora";if(s<60)return "há "+s+" segundos";
    const m=Math.floor(s/60);if(m<60)return "há "+m+" minuto"+(m===1?"":"s");
    const h=Math.floor(m/60);if(h<24)return "há "+h+" hora"+(h===1?"":"s");
    const d=Math.floor(h/24);return "há "+d+" dia"+(d===1?"":"s");
}
async function carregarPresencasV56(forcar=false){
    const area=document.getElementById("presencaLista"),msg=document.getElementById("presencaMensagem");if(!area)return;
    if(forcar)area.innerHTML="<div class='presenca-vazio'>Atualizando presença dos usuários...</div>";
    try{
        const {data,error}=await obterSupabaseClient().from(PRESENCA_V56_TABELA).select("user_id,nome,email,perfil,status,tela,contexto,last_seen,updated_at").order("last_seen",{ascending:false});
        if(error)throw error;presencasListaV56=data||[];renderizarPresencasV56();if(msg)msg.innerHTML="";
        const hora=document.getElementById("presencaUltimaAtualizacao");if(hora)hora.textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    }catch(e){area.innerHTML="<div class='presenca-vazio'>Não foi possível carregar a presença.</div>";if(msg)msg.innerHTML="<span class='admin-status-erro'>"+escaparHTML(e?.message||String(e))+"</span>"}
}
function renderizarPresencasV56(){
    const area=document.getElementById("presencaLista");if(!area)return;
    const normalizar=typeof normalizarPesquisaGlobal==="function"?normalizarPesquisaGlobal:(v=>String(v||"").toUpperCase());
    const q=normalizar(document.getElementById("presencaBusca")?.value||"");
    const lista=presencasListaV56.map(x=>({...x,_status:classificarPresencaV56(x)})).filter(x=>!q||normalizar([x.nome,x.email,x.perfil,x.tela,x.contexto,x._status].join(" ")).includes(q)).sort((a,b)=>({online:0,ausente:1,offline:2}[a._status]-({online:0,ausente:1,offline:2}[b._status])||String(a.nome||a.email).localeCompare(String(b.nome||b.email),"pt-BR")));
    const todos=presencasListaV56.map(classificarPresencaV56);
    setIntel("presencaTotalOnline",todos.filter(x=>x==="online").length);setIntel("presencaTotalAusente",todos.filter(x=>x==="ausente").length);setIntel("presencaTotalOffline",todos.filter(x=>x==="offline").length);setIntel("presencaTotalUsuarios",todos.length);
    if(!lista.length){area.innerHTML="<div class='presenca-vazio'>Nenhum usuário encontrado.</div>";return}
    area.innerHTML=lista.map(x=>{
        const nome=x.nome||x.email||"Usuário",iniciais=nome.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
        const statusNome=x._status==="online"?"🟢 Online":x._status==="ausente"?"🟡 Ausente":"⚫ Offline";
        return "<div class='presenca-item'><div class='presenca-avatar'>"+escaparHTML(iniciais||"U")+"</div><div class='presenca-identidade'><b>"+escaparHTML(nome)+"</b><p>"+escaparHTML([x.tela,x.contexto].filter(Boolean).join(" • ")||"Sem atividade informada")+"</p><small>"+escaparHTML(x.email||"")+" • "+escaparHTML((typeof nomePerfilUsuario==="function"?nomePerfilUsuario(x.perfil):x.perfil)||"")+" • última comunicação "+escaparHTML(tempoRelativoPresencaV56(x.last_seen))+"</small></div><div class='presenca-status "+x._status+"'>"+statusNome+"</div></div>"
    }).join("");
}
function iniciarPainelPresencaV56(){clearInterval(presencaPainelTimerV56);presencaPainelTimerV56=setInterval(()=>{const tela=document.getElementById("telaAdminPresenca");if(tela&&getComputedStyle(tela).display!=="none")carregarPresencasV56(false)},30000)}
["mousemove","mousedown","keydown","touchstart","scroll"].forEach(evt=>document.addEventListener(evt,marcarInteracaoPresencaV56,{passive:true}));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)marcarInteracaoPresencaV56();enviarHeartbeatPresencaV56()});
window.addEventListener("focus",()=>{marcarInteracaoPresencaV56();enviarHeartbeatPresencaV56()});
document.addEventListener("click",()=>setTimeout(atualizarPresencaAgoraV56,800),true);
document.addEventListener("DOMContentLoaded",iniciarPainelPresencaV56);
