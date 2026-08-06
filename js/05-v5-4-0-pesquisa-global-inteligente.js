/* =========================================================
   V5.4.0 - PESQUISA GLOBAL INTELIGENTE
   ========================================================= */
let pesquisaGlobalTimer=null;
let pesquisaGlobalToken=0;
let pesquisaGlobalItens=[];
let pesquisaGlobalIndice=-1;
let pesquisaGlobalOsCache=[];
let pesquisaGlobalCiCache=[];
let pesquisaGlobalObsCache=[];
let pesquisaGlobalUsuariosCache=[];
let pesquisaGlobalCarregadoEm=0;

function normalizarPesquisaGlobal(v){
    return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ").trim();
}
function escaparAttrPesquisaGlobal(v){
    return String(v??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function abrirPesquisaGlobal(termo=""){
    if(!usuarioLogado)return;
    const overlay=document.getElementById("pesquisaGlobalOverlay");
    const input=document.getElementById("pesquisaGlobalInput");
    overlay.classList.add("aberto");
    input.value=termo||"";
    pesquisaGlobalIndice=-1;
    setTimeout(()=>input.focus(),80);
    if(termo)executarPesquisaGlobal();
}
function fecharPesquisaGlobal(){
    document.getElementById("pesquisaGlobalOverlay")?.classList.remove("aberto");
}
function agendarPesquisaGlobal(){
    clearTimeout(pesquisaGlobalTimer);
    pesquisaGlobalTimer=setTimeout(executarPesquisaGlobal,220);
}
async function carregarIndicePesquisaGlobal(forcar=false){
    const agora=Date.now();
    if(!forcar&&pesquisaGlobalCarregadoEm&&agora-pesquisaGlobalCarregadoEm<120000&&pesquisaGlobalOsCache.length)return;

    const tarefas=[];

    tarefas.push((async()=>{
        if(typeof intelRegistros!=="undefined"&&Array.isArray(intelRegistros)&&intelRegistros.length){
            pesquisaGlobalOsCache=intelRegistros;
        }else if(typeof buscarTodaRexpedlr==="function"){
            pesquisaGlobalOsCache=await buscarTodaRexpedlr();
            if(typeof intelRegistros!=="undefined"&&(!Array.isArray(intelRegistros)||!intelRegistros.length)){
                intelRegistros=pesquisaGlobalOsCache;
                if(typeof analisarIntel==="function")intelAnalise=analisarIntel(intelRegistros);
            }
        }
    })());

    tarefas.push((async()=>{
        try{
            const {data,error}=await obterSupabaseClient()
                .from("ci_historico")
                .select("id,numero_ci,tipo_ci,data_emissao,usuario_nome,quantidade_os,status,lista_os")
                .order("data_emissao",{ascending:false})
                .limit(500);
            if(error)throw error;
            pesquisaGlobalCiCache=data||[];
        }catch(e){
            pesquisaGlobalCiCache=Array.isArray(historicoCILista)?historicoCILista:[];
        }
    })());

    tarefas.push((async()=>{
        try{
            const {data,error}=await obterSupabaseClient()
                .from(ERP_V38_TABELAS.observacoes)
                .select("id,os,texto,autor_nome,autor_email,created_at")
                .order("created_at",{ascending:false})
                .limit(500);
            if(error)throw error;
            pesquisaGlobalObsCache=data||[];
        }catch(e){
            pesquisaGlobalObsCache=[];
        }
    })());

    tarefas.push((async()=>{
        const perfil=String(usuarioLogado?.perfil||"").toLowerCase();
        if(perfil!=="administrador"){
            pesquisaGlobalUsuariosCache=[];
            return;
        }
        try{
            if(Array.isArray(usuariosAdminLista)&&usuariosAdminLista.length){
                pesquisaGlobalUsuariosCache=usuariosAdminLista;
                return;
            }
            const {data,error}=await obterSupabaseClient()
                .from("usuarios")
                .select("id,nome,email,cargo,perfil,ativo")
                .order("nome",{ascending:true});
            if(error)throw error;
            pesquisaGlobalUsuariosCache=data||[];
        }catch(e){
            pesquisaGlobalUsuariosCache=[];
        }
    })());

    await Promise.allSettled(tarefas);
    pesquisaGlobalCarregadoEm=Date.now();
}
function pontuarPesquisaGlobal(texto,termo){
    const t=normalizarPesquisaGlobal(texto);
    const q=normalizarPesquisaGlobal(termo);
    if(!t||!q)return 0;
    if(t===q)return 100;
    if(t.startsWith(q))return 80;
    if(t.includes(" "+q))return 60;
    if(t.includes(q))return 40;
    const palavras=q.split(" ").filter(Boolean);
    return palavras.every(p=>t.includes(p))?25:0;
}
function montarResultadosPesquisaGlobal(termo){
    const itens=[];

    pesquisaGlobalOsCache.forEach(r=>{
        const campos=[
            r.os,r.desc_produto,r.descricao,r.tecnico,r.pdv,r.rack,r.status,r.status_da_os,
            r.nf,r.nce,r.nr_serie,r.cor,r.marca,r.fabricante,r.imei,r.tipo_garantia
        ];
        const score=Math.max(...campos.map(v=>pontuarPesquisaGlobal(v,termo)));
        if(score>0){
            itens.push({
                tipo:"os",grupo:"Ordens de serviço",icone:"🔧",score,
                titulo:"O.S. "+(r.os||"-"),
                subtitulo:[r.desc_produto,r.status||r.status_da_os,r.tecnico&&("Técnico: "+r.tecnico),r.rack&&("Rack: "+r.rack),r.pdv&&("PDV: "+r.pdv)].filter(Boolean).join(" • "),
                detalhe:r.dt_geracao||"",
                dado:r
            });
        }
    });

    pesquisaGlobalCiCache.forEach(x=>{
        const texto=[x.numero_ci,x.id,x.tipo_ci,x.usuario_nome,x.lista_os,x.status].join(" ");
        const score=pontuarPesquisaGlobal(texto,termo);
        if(score>0){
            itens.push({
                tipo:"ci",grupo:"C.I.",icone:"📄",score,
                titulo:"C.I. "+(x.numero_ci||x.id),
                subtitulo:[nomeTipoCI(x.tipo_ci),x.quantidade_os+" O.S.",x.usuario_nome].filter(Boolean).join(" • "),
                detalhe:x.data_emissao?formatarDataHora(x.data_emissao):"",
                dado:x
            });
        }
    });

    pesquisaGlobalObsCache.forEach(x=>{
        const score=Math.max(pontuarPesquisaGlobal(x.os,termo),pontuarPesquisaGlobal(x.texto,termo),pontuarPesquisaGlobal(x.autor_nome||x.autor_email,termo));
        if(score>0){
            itens.push({
                tipo:"observacao",grupo:"Observações internas",icone:"💬",score,
                titulo:"Observação da O.S. "+x.os,
                subtitulo:String(x.texto||"").slice(0,180),
                detalhe:[x.autor_nome||x.autor_email,x.created_at?formatarDataHora(x.created_at):""].filter(Boolean).join(" • "),
                dado:x
            });
        }
    });

    (erpNotificacoes||[]).forEach(x=>{
        const score=pontuarPesquisaGlobal([x.titulo,x.mensagem,x.tipo].join(" "),termo);
        if(score>0){
            itens.push({
                tipo:"notificacao",grupo:"Notificações",icone:"🔔",score,
                titulo:x.titulo||"Notificação",
                subtitulo:x.mensagem||"",
                detalhe:x.created_at?formatarDataHora(x.created_at):"",
                dado:x
            });
        }
    });

    pesquisaGlobalUsuariosCache.forEach(u=>{
        const score=pontuarPesquisaGlobal([u.nome,u.email,u.cargo,u.perfil,u.ativo?"ativo":"inativo"].join(" "),termo);
        if(score>0){
            itens.push({
                tipo:"usuario",grupo:"Usuários",icone:"👤",score,
                titulo:u.nome||u.email||"Usuário",
                subtitulo:[u.email,u.cargo,nomePerfilUsuario(u.perfil),u.ativo===false?"Inativo":"Ativo"].filter(Boolean).join(" • "),
                detalhe:"",
                dado:u
            });
        }
    });

    return itens.sort((a,b)=>b.score-a.score||String(a.titulo).localeCompare(String(b.titulo),"pt-BR")).slice(0,80);
}
function renderPesquisaGlobal(itens){
    pesquisaGlobalItens=itens;
    pesquisaGlobalIndice=-1;
    const area=document.getElementById("pesquisaGlobalResultados");
    const status=document.getElementById("pesquisaGlobalStatus");

    if(!itens.length){
        area.innerHTML="<div class='pesquisa-global-vazio'>Nenhum resultado encontrado.</div>";
        status.textContent="0 resultados";
        return;
    }

    const grupos=new Map();
    itens.forEach((item,indice)=>{
        item._indice=indice;
        if(!grupos.has(item.grupo))grupos.set(item.grupo,[]);
        grupos.get(item.grupo).push(item);
    });

    area.innerHTML=[...grupos.entries()].map(([grupo,lista])=>
        "<section class='pesquisa-global-grupo'><h3>"+escaparHTML(grupo)+" • "+lista.length+"</h3>"+
        lista.map(item=>
            "<div class='pesquisa-global-item' data-pg-indice='"+item._indice+"' onclick='abrirResultadoPesquisaGlobal("+item._indice+")'>"+
                "<div class='pesquisa-global-item-icone'>"+item.icone+"</div>"+
                "<div><b>"+escaparHTML(item.titulo)+"</b><p>"+escaparHTML(item.subtitulo||"")+"</p></div>"+
                "<small>"+escaparHTML(item.detalhe||"")+"</small>"+
            "</div>"
        ).join("")+"</section>"
    ).join("");

    status.textContent=itens.length+" resultado(s)";
}
async function executarPesquisaGlobal(){
    const input=document.getElementById("pesquisaGlobalInput");
    const area=document.getElementById("pesquisaGlobalResultados");
    const termo=String(input?.value||"").trim();
    const token=++pesquisaGlobalToken;

    if(termo.length<2){
        pesquisaGlobalItens=[];
        pesquisaGlobalIndice=-1;
        area.innerHTML="<div class='pesquisa-global-vazio'>Digite pelo menos 2 caracteres para pesquisar.</div>";
        document.getElementById("pesquisaGlobalStatus").textContent="Pesquisa local e Supabase";
        return;
    }

    area.innerHTML="<div class='pesquisa-global-carregando'>Pesquisando em todo o ERP...</div>";
    document.getElementById("pesquisaGlobalStatus").textContent="Atualizando índice...";
    await carregarIndicePesquisaGlobal(false);
    if(token!==pesquisaGlobalToken)return;
    renderPesquisaGlobal(montarResultadosPesquisaGlobal(termo));
}
function navegarPesquisaGlobal(event){
    if(event.key==="Escape"){
        event.preventDefault();
        fecharPesquisaGlobal();
        return;
    }
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){
        event.preventDefault();
        if(!pesquisaGlobalItens.length)return;
        const delta=event.key==="ArrowDown"?1:-1;
        pesquisaGlobalIndice=(pesquisaGlobalIndice+delta+pesquisaGlobalItens.length)%pesquisaGlobalItens.length;
        document.querySelectorAll(".pesquisa-global-item").forEach(el=>el.classList.remove("selecionado"));
        const alvo=document.querySelector(".pesquisa-global-item[data-pg-indice='"+pesquisaGlobalIndice+"']");
        alvo?.classList.add("selecionado");
        alvo?.scrollIntoView({block:"nearest"});
        return;
    }
    if(event.key==="Enter"&&pesquisaGlobalIndice>=0){
        event.preventDefault();
        abrirResultadoPesquisaGlobal(pesquisaGlobalIndice);
    }
}
async function abrirResultadoPesquisaGlobal(indice){
    const item=pesquisaGlobalItens[indice];
    if(!item)return;
    fecharPesquisaGlobal();

    if(item.tipo==="os"){
        abrirFichaRegistro(item.dado);
        return;
    }

    if(item.tipo==="observacao"){
        const r=pesquisaGlobalOsCache.find(x=>String(x.os)===String(item.dado.os));
        if(r)abrirFichaRegistro(r);
        else abrirBusca();
        return;
    }

    if(item.tipo==="ci"){
        abrirAdminSecao("historico_ci");
        if(!Array.isArray(historicoCILista)||!historicoCILista.some(x=>Number(x.id)===Number(item.dado.id))){
            await carregarHistoricoCI();
        }
        setTimeout(()=>visualizarHistoricoCI(item.dado.id),120);
        return;
    }

    if(item.tipo==="usuario"){
        abrirAdminSecao("usuarios");
        setTimeout(()=>{
            const campo=document.getElementById("usuariosBusca");
            if(campo){
                campo.value=item.dado.nome||item.dado.email||"";
                filtrarUsuariosAdmin();
            }
        },250);
        return;
    }

    if(item.tipo==="notificacao"){
        item.dado.lida=true;
        renderCentralNotificacoesV39();
        alternarCentralNotificacoes({stopPropagation(){}});
        return;
    }
}
document.addEventListener("keydown",function(event){
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
        event.preventDefault();
        abrirPesquisaGlobal();
    }
});
