/* ============================================================
   V7.2.3 - COLETAS EM TEMPO REAL
   ============================================================ */
let coletaRealtimeIdV710=null;
let coletaRealtimeCanalV710=null;
let coletaRealtimeEditorV710=false;
let coletaRealtimeSincronizandoV710=false;

function usuarioAtualV710(){
    return typeof usuarioLogado!=="undefined"?usuarioLogado:null;
}
function nomeUsuarioAtualV710(){
    const u=usuarioAtualV710();
    return u?.nome||u?.email||"Usuário";
}
function atualizarTopoColetaLiveV710(textoExtra){
    const el=document.getElementById("coletaLiveTopo");
    if(!el)return;
    if(!coletaRealtimeIdV710){
        el.className="coleta-live-topo";
        el.innerHTML="";
        return;
    }
    el.className="coleta-live-topo visivel";
    el.innerHTML=
        "🟢 Coleta nº <b>"+coletaRealtimeIdV710+"</b> em tempo real"+
        (textoExtra?" • "+textoExtra:"")+
        (coletaRealtimeEditorV710?" • Você está editando":" • Somente acompanhamento")+
        (!coletaRealtimeEditorV710
            ?' <button type="button" onclick="assumirEdicaoColetaV710('+Number(coletaRealtimeIdV710)+')">Assumir edição</button>'
            :"");
}

async function garantirColetaTempoRealV710(){
    if(coletaRealtimeIdV710)return coletaRealtimeIdV710;
    if(!coletaTipoAtual)throw new Error("Selecione um tipo de coleta.");

    const supa=obterSupabaseClient();
    const u=usuarioAtualV710();
    const payload={
        tipo:coletaTipoAtual,
        titulo:"Coleta "+coletaNomeTipo(),
        usuario_id:u?.id||null,
        usuario_nome:nomeUsuarioAtualV710(),
        editor_id:u?.id||null,
        editor_nome:nomeUsuarioAtualV710(),
        quantidade:0,
        status:"em_andamento",
        ultima_atividade_em:new Date().toISOString()
    };

    const {data,error}=await supa.from("coletas_os").insert(payload).select("*").single();
    if(error)throw error;

    coletaRealtimeIdV710=data.id;
    coletaRealtimeEditorV710=true;
    await assinarColetaTempoRealV710(data.id);
    atualizarTopoColetaLiveV710("Criada agora");
    return data.id;
}

async function salvarItemColetaTempoRealV710(item){
    if(coletaRealtimeSincronizandoV710)return;
    const id=await garantirColetaTempoRealV710();
    const supa=obterSupabaseClient();

    const payload={
        coleta_id:id,
        ordem:coletaOSItens.indexOf(item)+1,
        os:coletaTexto(item,["os","OS"]),
        dt_geracao:coletaTexto(item,["dt_geracao","data_os"]),
        destino:coletaDestino(item),
        pdv:coletaLoja(item),
        alm:coletaTexto(item,["alm"]),
        grupo:coletaTexto(item,["grupo","grup"]),
        nce:coletaTexto(item,["nce"]),
        desc_produto:coletaTexto(item,["desc_produto","descricao_produto"]),
        cod_cor:coletaCodCor(item),
        cor:coletaTexto(item,["cor"]),
        n_serie:coletaTexto(item,["n_serie","numero_serie"]),
        rack:coletaRack(item),
        status_os:coletaTexto(item,["status","status_da_os"]),
        valor:String(coletaValor(item)||""),
        cubagem:String(coletaCubagem(item)||""),
        dados:item
    };

    const {error}=await supa.from("coleta_os_itens").insert(payload);
    if(error)throw error;

    await supa.from("coletas_os").update({
        quantidade:coletaOSItens.length,
        ultima_os:payload.os||null,
        ultima_atividade_em:new Date().toISOString()
    }).eq("id",id);
}

async function removerItemColetaTempoRealV710(item){
    if(!coletaRealtimeIdV710||!coletaRealtimeEditorV710)return;
    const supa=obterSupabaseClient();
    const os=coletaTexto(item,["os","OS"]);
    const {error}=await supa.from("coleta_os_itens")
        .delete()
        .eq("coleta_id",coletaRealtimeIdV710)
        .eq("os",os);
    if(error)throw error;
    await supa.from("coletas_os").update({
        quantidade:Math.max(0,coletaOSItens.length-1),
        ultima_atividade_em:new Date().toISOString()
    }).eq("id",coletaRealtimeIdV710);
}

async function atualizarItemColetaTempoRealV710(item){
    if(!coletaRealtimeIdV710||!coletaRealtimeEditorV710)return;
    const supa=obterSupabaseClient();
    const os=coletaTexto(item,["os","OS"]);
    const {error}=await supa.from("coleta_os_itens").update({
        pdv:coletaLoja(item),
        grupo:coletaTexto(item,["grupo","grup"]),
        nce:coletaTexto(item,["nce"]),
        desc_produto:coletaTexto(item,["desc_produto","descricao_produto"]),
        cod_cor:coletaCodCor(item),
        cor:coletaTexto(item,["cor"]),
        n_serie:coletaTexto(item,["n_serie","numero_serie"]),
        rack:coletaRack(item),
        status_os:coletaTexto(item,["status","status_da_os"]),
        dados:item
    }).eq("coleta_id",coletaRealtimeIdV710).eq("os",os);
    if(error)throw error;
    await supa.from("coletas_os").update({
        ultima_atividade_em:new Date().toISOString()
    }).eq("id",coletaRealtimeIdV710);
}

async function carregarColetaAoVivoV710(id){
    const supa=obterSupabaseClient();
    coletaRealtimeSincronizandoV710=true;
    try{
        const {data:cab,error:ec}=await supa.from("coletas_os").select("*").eq("id",id).single();
        if(ec)throw ec;
        const {data:itens,error:ei}=await supa.from("coleta_os_itens").select("*").eq("coleta_id",id).order("ordem");
        if(ei)throw ei;

        coletaRealtimeIdV710=id;
        coletaTipoAtual=cab.tipo;
        const u=usuarioAtualV710();
        coletaRealtimeEditorV710=String(cab.editor_id||"")===String(u?.id||"");

        coletaOSItens=(itens||[]).map(x=>({
            ...(x.dados||{}),
            os:x.os,dt_geracao:x.dt_geracao,pdv:x.pdv,alm:x.alm,grupo:x.grupo,nce:x.nce,
            desc_produto:x.desc_produto,__coleta_cod_cor:x.cod_cor,cor:x.cor,n_serie:x.n_serie,
            __coleta_rack:x.rack,status:x.status_os,valor_transf:x.valor,cubagem:x.cubagem,
            __coleta_destino:x.destino,__coleta_id:x.id,__coleta_tipo:cab.tipo
        }));

        document.getElementById("coletaSelecaoTipos").style.display="none";
        document.getElementById("coletasHistoricoModulo").style.display="none";
        document.getElementById("rascunhosModulo").style.display="none";
        document.getElementById("coletaOperacao").style.display="block";

        configurarTelaColeta();
        atualizarColetaKPIs();
        atualizarFiltrosColeta();
        renderizarColeta();
        atualizarTopoColetaLiveV710((cab.editor_nome||cab.usuario_nome||"Usuário")+" está editando");
        await assinarColetaTempoRealV710(id);
    }finally{
        coletaRealtimeSincronizandoV710=false;
    }
}

async function assumirEdicaoColetaV710(id){
    const u=usuarioAtualV710();
    if(!u)return;
    const {error}=await obterSupabaseClient().from("coletas_os").update({
        editor_id:u.id,
        editor_nome:nomeUsuarioAtualV710(),
        ultima_atividade_em:new Date().toISOString()
    }).eq("id",id).eq("status","em_andamento");
    if(error)return alert("Não foi possível assumir a coleta: "+error.message);
    coletaRealtimeEditorV710=true;
    atualizarTopoColetaLiveV710();
}

async function cancelarColetaV710(id){
    if(!confirm("Cancelar esta coleta em andamento?"))return;
    const {error}=await obterSupabaseClient().from("coletas_os").update({
        status:"cancelada",
        finalizado_em:new Date().toISOString(),
        ultima_atividade_em:new Date().toISOString()
    }).eq("id",id);
    if(error)return alert(error.message);
}

async function assinarColetaTempoRealV710(id){
    const supa=obterSupabaseClient();
    if(coletaRealtimeCanalV710){
        try{await supa.removeChannel(coletaRealtimeCanalV710)}catch(_){}
    }
    coletaRealtimeCanalV710=supa.channel("coleta_live_"+id)
        .on("postgres_changes",{event:"*",schema:"public",table:"coleta_os_itens",filter:"coleta_id=eq."+id},
            async()=>{ if(!coletaRealtimeEditorV710)await carregarColetaAoVivoV710(id); })
        .on("postgres_changes",{event:"UPDATE",schema:"public",table:"coletas_os",filter:"id=eq."+id},
            payload=>{
                const c=payload.new||{};
                atualizarTopoColetaLiveV710((c.editor_nome||c.usuario_nome||"Usuário")+" está editando");
                if(c.status!=="em_andamento"){
                    carregarHistoricoColetasSupabase();
                }
            })
        .subscribe();
}

function statusTextoV710(s){
    return s==="em_andamento"?"Em andamento":s==="cancelada"?"Cancelada":"Finalizada";
}
function statusChipV710(c){
    return '<span class="coleta-live-chip '+c.status+'">'+
        (c.status==="em_andamento"?'<span class="coleta-live-ponto"></span>':"")+
        statusTextoV710(c.status)+'</span>';
}

const renderizarHistoricoColetasOriginalV710=renderizarHistoricoColetas;
window.renderizarHistoricoColetas=function(lista){
    const corpo=document.getElementById("coletasHistCorpo");
    if(!corpo)return;
    document.getElementById("coletasHistTotal").textContent=lista.length;
    document.getElementById("coletasHistTotalOS").textContent=lista.reduce((s,c)=>s+Number(c.quantidade||0),0);
    document.getElementById("coletasHistUltima").textContent=lista[0]?dataColetaHist(lista[0].criado_em):"—";

    if(!lista.length){
        corpo.innerHTML='<tr><td colspan="7">Nenhuma coleta encontrada.</td></tr>';
        return;
    }

    corpo.innerHTML=lista.map(c=>`
        <tr>
            <td>${escColetaHist(dataColetaHist(c.criado_em))}</td>
            <td>${escColetaHist(nomeTipoColetaHist(c.tipo))}</td>
            <td>${escColetaHist(c.usuario_nome||"Usuário")}</td>
            <td>${statusChipV710(c)}</td>
            <td><b>${Number(c.quantidade||0)}</b></td>
            <td>${escColetaHist(dataColetaHist(c.ultima_atividade_em||c.atualizado_em||c.criado_em))}</td>
            <td><div class="coletas-hist-acoes">
                ${c.status==="em_andamento"
                    ?`<button onclick="carregarColetaAoVivoV710(${Number(c.id)})">Acompanhar ao vivo</button>
                      <button class="coleta-acao-assumir" onclick="assumirEdicaoColetaV710(${Number(c.id)})">Assumir edição</button>
                      <button class="coleta-acao-cancelar" onclick="cancelarColetaV710(${Number(c.id)})">Cancelar</button>`
                    :`<button onclick="abrirDetalheColetaSupabase(${Number(c.id)})">Ver relação</button>
                      <button class="sec" onclick="exportarColetaHistoricoDireto(${Number(c.id)})">Exportar arquivo ▾</button>
                      <button onclick="imprimirColetaHistoricoDireto(${Number(c.id)})">Imprimir</button>`}
            </div></td>
        </tr>
    `).join("");
};

const carregarHistoricoOriginalV710=carregarHistoricoColetasSupabase;
window.carregarHistoricoColetasSupabase=async function(){
    const msg=document.getElementById("coletasHistMensagem");
    if(msg){msg.className="coleta-msg";msg.textContent="Carregando coletas do Supabase...";}
    try{
        const {data,error}=await obterSupabaseClient()
            .from("coletas_os")
            .select("*")
            .order("criado_em",{ascending:false})
            .limit(500);
        if(error)throw error;
        coletasHistoricoCache=data||[];
        filtrarHistoricoColetas();
        if(msg){msg.className="coleta-msg ok";msg.textContent=coletasHistoricoCache.length+" coleta(s) carregada(s).";}
    }catch(e){
        if(msg){msg.className="coleta-msg erro";msg.textContent="Erro ao carregar histórico: "+(e?.message||e);}
    }
};

function iniciarRealtimeHistoricoV710(){
    const supa=obterSupabaseClient();
    supa.channel("historico_coletas_v710")
        .on("postgres_changes",{event:"*",schema:"public",table:"coletas_os"},
            ()=>{ if(document.getElementById("coletasHistoricoModulo")?.style.display==="block") carregarHistoricoColetasSupabase(); })
        .subscribe();
}

// Hooks seguros nas operações já existentes.
const adicionarOriginalV710=adicionarOSColeta;
window.adicionarOSColeta=async function(){
    const antes=coletaOSItens.length;
    const r=await adicionarOriginalV710.apply(this,arguments);
    if(coletaOSItens.length>antes&&coletaRealtimeEditorV710!==false){
        const item=coletaOSItens[coletaOSItens.length-1];
        try{await salvarItemColetaTempoRealV710(item)}catch(e){coletaMensagem("O.S. adicionada localmente, mas falhou no tempo real: "+e.message,"erro")}
    }
    return r;
};

const importarOriginalV710=typeof importarOSColetaLote==="function"?importarOSColetaLote:null;
if(importarOriginalV710){
    window.importarOSColetaLote=async function(lista){
        const antes=coletaOSItens.length;
        const r=await importarOriginalV710.apply(this,arguments);
        const novos=coletaOSItens.slice(antes);
        for(const item of novos){
            try{await salvarItemColetaTempoRealV710(item)}catch(e){console.error(e)}
        }
        return r;
    };
}

const removerOriginalV710=removerOSColeta;
window.removerOSColeta=async function(id){
    const item=coletaOSItens.find(i=>String(i.__coleta_id)===String(id));
    if(item&&coletaRealtimeEditorV710){
        try{await removerItemColetaTempoRealV710(item)}catch(e){return coletaMensagem("Erro ao remover no Supabase: "+e.message,"erro")}
    }
    return removerOriginalV710.apply(this,arguments);
};

const atualizarRackOriginalV710=atualizarRackColeta;
window.atualizarRackColeta=function(id,valor){
    const r=atualizarRackOriginalV710.apply(this,arguments);
    const item=coletaOSItens.find(i=>String(i.__coleta_id)===String(id));
    if(item&&coletaRealtimeEditorV710)setTimeout(()=>atualizarItemColetaTempoRealV710(item),250);
    return r;
};

const selecionarTipoOriginalV710=selecionarTipoColeta;
window.selecionarTipoColeta=function(tipo){
    coletaRealtimeIdV710=null;
    coletaRealtimeEditorV710=true;
    const r=selecionarTipoOriginalV710.apply(this,arguments);
    atualizarTopoColetaLiveV710();
    return r;
};

window.addEventListener("load",()=>{
    setTimeout(()=>{
        try{iniciarRealtimeHistoricoV710()}catch(e){console.warn("Realtime histórico:",e)}
    },1500);
});
