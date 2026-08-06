/* =========================
   V6.9.5 - RASCUNHOS COM COLUNAS REORGANIZÁVEIS
========================= */
let coletaOSItens = [];
let coletaUltimaOS = "";
let coletaTipoAtual = ""; // loja_origem | enderecamento | att
let coletaRacksSelecionados = new Set();
let coletaRackAncoraId = null;
let coletaRackArrastando = false;

function coletaEhEnderecamento(){return coletaTipoAtual==="enderecamento";}
function coletaChaveRascunho(){return "ERP_COLETA_OS_RASCUNHO_"+(coletaTipoAtual||"loja_origem");}
function coletaChaveHistorico(){return "ERP_COLETAS_OS_HISTORICO_"+(coletaTipoAtual||"loja_origem");}
function coletaNomeTipo(){
    return coletaTipoAtual==="enderecamento"?"Endereçamento":coletaTipoAtual==="att"?"ATT":"Loja de Origem";
}
function coletaRack(i){
    return coletaEhEnderecamento()
        ? coletaTexto(i,["__coleta_rack"])
        : coletaTexto(i,["rack","__coleta_rack"]);
}

function coletaEsc(v){
    return String(v == null ? "" : v).replace(/[&<>'"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c];});
}
function coletaTexto(item, nomes){
    for(const nome of nomes){
        if(item && item[nome] !== undefined && item[nome] !== null && String(item[nome]).trim() !== "") return String(item[nome]).trim();
    }
    return "";
}
function coletaNumero(v){
    if(typeof v === "number") return Number.isFinite(v) ? v : 0;
    let t=String(v||"").trim().replace(/R\$/gi,"").replace(/\s/g,"");
    if(t.includes(",")) t=t.replace(/\./g,"").replace(",",".");
    const n=Number(t); return Number.isFinite(n)?n:0;
}
function coletaMoeda(v){return coletaNumero(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function coletaNormalizarOS(v){
    let os=String(v||"").trim().toUpperCase();

    // O leitor pode enviar: ILR 25262, ILR-25262, ILR:25262 ou ILR25262.
    os=os.replace(/^ILR[\s\-:]*/i,"");

    // A O.S. usada no banco é somente numérica.
    os=os.replace(/\D/g,"");

    return os;
}
function coletaMensagem(texto,tipo){const el=document.getElementById("coletaMensagem");if(!el)return;el.className="coleta-msg"+(tipo?" "+tipo:"");el.textContent=texto;}
function focarCampoColeta(){setTimeout(()=>{const c=document.getElementById("coletaCampoOS");if(c){c.focus();c.select();}},60);}
function coletaTeclaOS(e){if(e.key==="Enter"){e.preventDefault();coletarOS();}}

function abrirColeta(){
    if(typeof exigirPermissao==="function" && !exigirPermissao(["administrador","supervisor","consulta"],"Coleta de O.S.")) return;
    esconderTelas(); definirMenuAtivo("coleta");
    const tela=document.getElementById("telaColeta"); if(tela)tela.style.display="block";
    document.getElementById("sidebar")?.classList.remove("mobile-open");
    coletaTipoAtual="";
    coletaOSItens=[];
    coletaUltimaOS="";
    document.getElementById("coletaSelecaoTipos").style.display="block";
    document.getElementById("coletaOperacao").style.display="none";
    const rm=document.getElementById("rascunhosModulo"); if(rm)rm.style.display="none"; const hm=document.getElementById("coletasHistoricoModulo"); if(hm)hm.style.display="none";
}

function selecionarTipoColeta(tipo){
    coletaTipoAtual=tipo;
    coletaOSItens=[];
    coletaUltimaOS="";
    document.getElementById("coletaSelecaoTipos").style.display="none";
    document.getElementById("coletaOperacao").style.display="block";
    const rm=document.getElementById("rascunhosModulo"); if(rm)rm.style.display="none";

    const titulo=document.getElementById("coletaTituloTipo");
    const descricao=document.getElementById("coletaDescricaoTipo");
    if(titulo) titulo.textContent="▣ Coleta — "+coletaNomeTipo();
    if(descricao) descricao.textContent=coletaEhEnderecamento()
        ?"Bipe a O.S. e informe manualmente o Rack. A coluna Destino não é exibida nesta coleta."
        :"Leia a etiqueta com o bipador ou digite a O.S. para consultar e adicionar os dados do Supabase.";

    const filtroDestino=document.getElementById("coletaFiltroDestino");
    if(filtroDestino) filtroDestino.style.display=coletaEhEnderecamento()?"none":"";
    const ajudaRack=document.getElementById("coletaAjudaRack");
    if(ajudaRack) ajudaRack.style.display=coletaEhEnderecamento()?"block":"none";
    coletaRacksSelecionados.clear();
    coletaRackAncoraId=null;
    montarCabecalhoColeta();
    restaurarColetaLocal();
    atualizarColetaKPIs();
    atualizarFiltrosColeta();
    renderizarColeta();
    coletaMensagem("Coleta "+coletaNomeTipo()+" pronta. Faça a leitura da primeira O.S.","ok");
    focarCampoColeta();
}

function voltarTiposColeta(){
    salvarColetaRascunho();
    coletaTipoAtual="";
    coletaOSItens=[];
    coletaUltimaOS="";
    document.getElementById("coletaOperacao").style.display="none";
    document.getElementById("coletaSelecaoTipos").style.display="block";
}

function montarCabecalhoColeta(){
    const thead=document.querySelector("#coletaTabela thead");
    if(!thead)return;
    const destino=coletaEhEnderecamento()?"":"<th>Destino</th>";
    thead.innerHTML="<tr><th>#</th><th class=\"col-os\">O.S.</th><th>Data da O.S.</th>"+destino+"<th class=\"col-loja\">Loja de Origem</th><th>ALM</th><th class=\"col-grupo\">GRUPO</th><th class=\"col-nce\">N.C.E.</th><th class=\"col-produto\">Descrição do produto</th><th class=\"col-codcor\">Cód. Cor</th><th>Cor</th><th>Nº de Série</th><th class=\"col-rack\">Rack</th><th>Status</th><th>Valor</th><th>Cubagem</th><th>Ação</th></tr>";
}

async function coletarOS(){
    const campo=document.getElementById("coletaCampoOS");
    const os=coletaNormalizarOS(campo?.value);
    if(!os){coletaMensagem("Digite ou bipe uma O.S.","alerta");focarCampoColeta();return;}
    if(coletaOSItens.some(x=>coletaNormalizarOS(coletaTexto(x,["os","OS"]))===os)){
        coletaMensagem("A O.S. "+os+" já está nesta coleta.","erro");campo.value="";focarCampoColeta();return;
    }
    coletaMensagem("Consultando a O.S. "+os+" no Supabase...","");
    campo.disabled=true;
    try{
        const supa=obterSupabaseClient();
        const resp=await supa.from("rexpedlr").select("*").eq("os",os).limit(2);
        if(resp.error) throw resp.error;
        let item=(resp.data||[])[0];
        if(!item){
            const alt=await supa.from("rexpedlr").select("*").ilike("os",os).limit(2);
            if(alt.error) throw alt.error;
            item=(alt.data||[])[0];
        }
        if(!item){
            item={os:os,dt_geracao:"",pdv:"",alm:"",grupo:"",nce:"",desc_produto:"",cor:"",n_serie:"",rack:"",status:"",valor_transf:"",cubagem:"",__os_nao_encontrada:true,__coleta_observacao:"O.S. não encontrada no banco"};
        }

        /* Consulta o destino somente nas coletas Loja de Origem e ATT. */
        const origemPDV=coletaTexto(item,["pdv"]).toUpperCase().trim();
        item.__coleta_destino="";

        if(!coletaEhEnderecamento() && origemPDV){
            const consultaDestino=await supa
                .from("destinos_filiais")
                .select("destino")
                .eq("origem",origemPDV)
                .maybeSingle();

            if(consultaDestino.error) throw consultaDestino.error;

            if(consultaDestino.data && consultaDestino.data.destino){
                item.__coleta_destino=String(consultaDestino.data.destino).trim().toUpperCase();
            }
        }

        /* Consulta o código da cor usando a COR cadastrada na O.S. */
        const nomeCor=coletaTexto(item,["cor"]).trim();
        item.__coleta_cod_cor="";

        if(nomeCor){
            const consultaCor=await supa
                .from("codigo_cor")
                .select("cod_cor")
                .ilike("cor",nomeCor)
                .limit(1);

            if(consultaCor.error) throw consultaCor.error;

            const registroCor=(consultaCor.data||[])[0];
            if(registroCor && registroCor.cod_cor!==null && registroCor.cod_cor!==undefined){
                item.__coleta_cod_cor=String(registroCor.cod_cor).trim();
            }
        }

        if(coletaEhEnderecamento()){
            item.__coleta_rack="";
        }

        item.__coleta_tipo=coletaTipoAtual;
        item.__coleta_id=Date.now()+Math.random();
        item.__coleta_hora=new Date().toISOString();
        coletaOSItens.unshift(item); coletaUltimaOS=os;
        campo.value="";
        atualizarColetaKPIs(); atualizarFiltrosColeta(); renderizarColeta(item.__coleta_id); salvarColetaRascunho();

        if(item.__os_nao_encontrada){
            coletaMensagem("O.S. "+os+" adicionada sem dados do banco. Os campos ficaram editáveis.","alerta");
        }else if(item.__coleta_destino){
            coletaMensagem("O.S. "+os+" adicionada. Destino: "+item.__coleta_destino+".","ok");
        }else{
            coletaMensagem("O.S. "+os+" adicionada, mas o PDV "+(origemPDV||"não informado")+" não possui destino cadastrado.","alerta");
        }
    }catch(e){
        coletaMensagem("Erro ao consultar o Supabase: "+(e.message||e),"erro");
        const chip=document.getElementById("coletaStatusConexao");if(chip)chip.textContent="Falha na conexão";
    }finally{campo.disabled=false;focarCampoColeta();}
}

function coletaDestino(i){return coletaTexto(i,["__coleta_destino","destino","pdv_expedicao","pdv_destino"]);}
function coletaLoja(i){return coletaTexto(i,["loja_origem","pdv","loja_de_origem"]);}
function coletaCodCor(i){return coletaTexto(i,["__coleta_cod_cor","cod_cor","codigo_cor","codcor"]);}
function coletaCubagem(i){return coletaTexto(i,["cubagem","m3","volume_m3"]);}
function coletaValor(i){return coletaTexto(i,["valor_transf","valor","valor_transferencia"]);}

function atualizarColetaKPIs(){
    const total=coletaOSItens.length;
    const valor=coletaOSItens.reduce((s,i)=>s+coletaNumero(coletaValor(i)),0);
    const cub=coletaOSItens.reduce((s,i)=>s+coletaNumero(coletaCubagem(i)),0);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set("coletaKpiTotal",total.toLocaleString("pt-BR"));set("coletaKpiValor",valor.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}));set("coletaKpiCubagem",cub.toLocaleString("pt-BR",{minimumFractionDigits:3,maximumFractionDigits:3}));set("coletaKpiUltima",coletaUltimaOS||"--");
    set("coletaKpiHora",coletaUltimaOS?("Lida às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"})):"Aguardando bipagem");
}

function valoresUnicos(fn){return [...new Set(coletaOSItens.map(fn).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true}));}
function preencherSelectColeta(id,lista,rotulo){const el=document.getElementById(id);if(!el)return;const atual=el.value;el.innerHTML='<option value="">'+rotulo+'</option>'+lista.map(v=>'<option value="'+coletaEsc(v)+'">'+coletaEsc(v)+'</option>').join('');el.value=lista.includes(atual)?atual:"";}
function atualizarFiltrosColeta(){
    preencherSelectColeta("coletaFiltroDestino",valoresUnicos(coletaDestino),"Todos os destinos");
    preencherSelectColeta("coletaFiltroStatus",valoresUnicos(i=>coletaTexto(i,["status","status_da_os"])),"Todos os status");
    preencherSelectColeta("coletaFiltroRack",valoresUnicos(coletaRack),"Todos os racks");
}

function itensColetaFiltrados(){
    const busca=String(document.getElementById("coletaFiltroBusca")?.value||"").toLowerCase();
    const dest=coletaEhEnderecamento()?"":(document.getElementById("coletaFiltroDestino")?.value||""), status=document.getElementById("coletaFiltroStatus")?.value||"", rack=document.getElementById("coletaFiltroRack")?.value||"";
    return coletaOSItens.filter(i=>{
        const hay=Object.values(i).join(" ").toLowerCase();
        return (!busca||hay.includes(busca))&&(!dest||coletaDestino(i)===dest)&&(!status||coletaTexto(i,["status","status_da_os"])===status)&&(!rack||coletaRack(i)===rack);
    });
}

function coletaListaRackVisivel(){
    return itensColetaFiltrados().map(i=>String(i.__coleta_id));
}

function coletaAplicarVisualSelecaoRack(){
    document.querySelectorAll(".coleta-rack-input").forEach(el=>{
        el.classList.toggle("coleta-rack-selecionado",coletaRacksSelecionados.has(String(el.dataset.id)));
    });
}

function coletaSelecionarIntervaloRack(idInicial,idFinal,acumular){
    const ids=coletaListaRackVisivel();
    const a=ids.indexOf(String(idInicial));
    const b=ids.indexOf(String(idFinal));
    if(a<0||b<0)return;
    if(!acumular)coletaRacksSelecionados.clear();
    for(let i=Math.min(a,b);i<=Math.max(a,b);i++)coletaRacksSelecionados.add(ids[i]);
    coletaAplicarVisualSelecaoRack();
}

function iniciarSelecaoRack(event,id){
    if(!coletaEhEnderecamento())return;
    id=String(id);

    if(event.shiftKey && coletaRackAncoraId){
        coletaSelecionarIntervaloRack(coletaRackAncoraId,id,event.ctrlKey||event.metaKey);
    }else if(event.ctrlKey||event.metaKey){
        if(coletaRacksSelecionados.has(id))coletaRacksSelecionados.delete(id);
        else coletaRacksSelecionados.add(id);
        coletaRackAncoraId=id;
        coletaAplicarVisualSelecaoRack();
    }else{
        coletaRacksSelecionados.clear();
        coletaRacksSelecionados.add(id);
        coletaRackAncoraId=id;
        coletaAplicarVisualSelecaoRack();
    }
    coletaRackArrastando=true;
}

function estenderSelecaoRack(event,id){
    if(!coletaRackArrastando || !(event.buttons&1) || !coletaRackAncoraId)return;
    coletaSelecionarIntervaloRack(coletaRackAncoraId,String(id),false);
}

document.addEventListener("mouseup",()=>{coletaRackArrastando=false;});

function atualizarVariosRacks(ids,valores){
    if(!ids.length)return;
    const lista=valores.length?valores:[""];

    ids.forEach((id,indice)=>{
        const item=coletaOSItens.find(i=>String(i.__coleta_id)===String(id));
        if(!item)return;
        const valor=lista.length===1?lista[0]:(lista[indice]??"");
        item.__coleta_rack=String(valor||"").trim().toUpperCase();
    });

    salvarColetaRascunho();
    atualizarFiltrosColeta();
    renderizarColeta();
    coletaRacksSelecionados=new Set(ids.map(String));
    setTimeout(coletaAplicarVisualSelecaoRack,0);
    coletaMensagem(ids.length+" Rack(s) preenchido(s) de uma vez.","ok");
}

function colarRackEmLote(event,id){
    if(!coletaEhEnderecamento())return;
    event.preventDefault();

    const texto=(event.clipboardData||window.clipboardData).getData("text");
    let valores=String(texto||"")
        .replace(/\r/g,"")
        .split("\n")
        .map(linha=>linha.split("\t")[0].trim())
        .filter((valor,indice,arr)=>valor!=="" || arr.length===1);

    if(!valores.length)valores=[""];

    id=String(id);
    const selecionados=coletaListaRackVisivel().filter(x=>coletaRacksSelecionados.has(x));

    if(selecionados.length>1 && valores.length===1){
        atualizarVariosRacks(selecionados,valores);
        return;
    }

    const idsVisiveis=coletaListaRackVisivel();
    const inicio=idsVisiveis.indexOf(id);
    if(inicio<0)return;

    const idsDestino=idsVisiveis.slice(inicio,inicio+valores.length);
    atualizarVariosRacks(idsDestino,valores);
}

function copiarRacksSelecionados(event){
    if(!(event.ctrlKey||event.metaKey) || String(event.key).toLowerCase()!=="c")return;
    const ids=coletaListaRackVisivel().filter(x=>coletaRacksSelecionados.has(x));
    if(ids.length<=1)return;

    event.preventDefault();
    const texto=ids.map(rid=>{
        const item=coletaOSItens.find(i=>String(i.__coleta_id)===String(rid));
        return item?coletaRack(item):"";
    }).join("\r\n");

    navigator.clipboard?.writeText(texto);
    coletaMensagem(ids.length+" valores de Rack copiados.","ok");
}

function atualizarRackColeta(id,valor){
    const item=coletaOSItens.find(i=>String(i.__coleta_id)===String(id));
    if(!item)return;
    item.__coleta_rack=String(valor||"").trim().toUpperCase();
    salvarColetaRascunho();
    atualizarFiltrosColeta();
}

function renderizarColeta(novoId){
    const corpo=document.getElementById("coletaTabelaCorpo");if(!corpo)return;
    montarCabecalhoColeta();
    const itens=itensColetaFiltrados();
    const colunas=coletaEhEnderecamento()?16:17;
    if(!itens.length){
        corpo.innerHTML='<tr><td colspan="'+colunas+'" class="coleta-vazio">'+(coletaOSItens.length?'Nenhuma O.S. corresponde aos filtros.':'Nenhuma O.S. coletada.')+'</td></tr>';
        return;
    }
    corpo.innerHTML=itens.map((i,idx)=>{
        const id=i.__coleta_id; const cls=id===novoId?' class="coleta-nova"':'';
        const val=coletaValor(i), cub=coletaCubagem(i);
        const destino=coletaEhEnderecamento()?"":"<td>"+coletaEsc(coletaDestino(i))+"</td>";
        const rack=coletaEhEnderecamento()
            ?'<input class="coleta-rack-input" data-id="'+coletaEsc(String(id))+'" value="'+coletaEsc(coletaRack(i))+'" placeholder="Digite o rack" oninput="atualizarRackColeta(\''+String(id)+'\',this.value)" onmousedown="iniciarSelecaoRack(event,\''+String(id)+'\')" onmouseenter="estenderSelecaoRack(event,\''+String(id)+'\')" onpaste="colarRackEmLote(event,\''+String(id)+'\')" onkeydown="copiarRacksSelecionados(event)">'
            :coletaEsc(coletaRack(i));

        const manual=!!i.__os_nao_encontrada;
        const input=(campo,valor,classe)=>'<input class="'+(classe||"coleta-campo-editavel")+'" value="'+coletaEsc(valor)+'" oninput="atualizarCampoColeta(\''+String(id)+'\',\''+campo+'\',this.value)">';
        const osCampo=input("os",coletaTexto(i,["os","OS"]),"coleta-os-input");
        const dataCampo=manual?input("dt_geracao",coletaTexto(i,["dt_geracao","data_os"])):coletaEsc(coletaTexto(i,["dt_geracao","data_os"]));
        const lojaCampo=manual?input("pdv",coletaLoja(i)):coletaEsc(coletaLoja(i));
        const almCampo=manual?input("alm",coletaTexto(i,["alm"])):coletaEsc(coletaTexto(i,["alm"]));
        const grupoCampo=manual?input("grupo",coletaTexto(i,["grupo","grup"])):coletaEsc(coletaTexto(i,["grupo","grup"]));
        const nceCampo=manual?input("nce",coletaTexto(i,["nce"])):coletaEsc(coletaTexto(i,["nce"]));
        const produtoCampo=manual?input("desc_produto",coletaTexto(i,["desc_produto","descricao_produto"]),"coleta-campo-editavel coleta-produto-input"):coletaEsc(coletaTexto(i,["desc_produto","descricao_produto"]));
        const codCorCampo=manual?input("__coleta_cod_cor",coletaCodCor(i)):coletaEsc(coletaCodCor(i));
        const corCampo=manual?input("cor",coletaTexto(i,["cor"])):coletaEsc(coletaTexto(i,["cor"]));
        const serieCampo=manual?input("n_serie",coletaTexto(i,["n_serie","numero_serie"])):coletaEsc(coletaTexto(i,["n_serie","numero_serie"]));
        const rackCampo=manual&&!coletaEhEnderecamento()?input("__coleta_rack",coletaRack(i)):rack;
        const statusCampo=manual?input("status",coletaTexto(i,["status","status_da_os"])):coletaEsc(coletaTexto(i,["status","status_da_os"]));
        const valorCampo=manual?input("valor_transf",coletaTexto(i,["valor_transf","valor"])):coletaEsc(val?coletaMoeda(val):"");
        const cubCampo=manual?input("cubagem",coletaTexto(i,["cubagem"])):coletaEsc(cub);
        const classeLinha=manual?(cls?cls.replace(' class="',' class="coleta-nao-encontrada '):' class="coleta-nao-encontrada"'):cls;

        return '<tr'+classeLinha+'><td>'+(idx+1)+'</td><td class="coleta-os col-os">'+osCampo+'</td><td>'+dataCampo+'</td>'+destino+'<td class="col-loja">'+lojaCampo+'</td><td>'+almCampo+'</td><td class="col-grupo">'+grupoCampo+'</td><td class="col-nce">'+nceCampo+'</td><td class="col-produto">'+produtoCampo+'</td><td class="col-codcor">'+codCorCampo+'</td><td>'+corCampo+'</td><td>'+serieCampo+'</td><td class="col-rack">'+rackCampo+'</td><td>'+statusCampo+'</td><td>'+valorCampo+'</td><td>'+cubCampo+'</td><td><button class="coleta-remover" onclick="removerOSColeta(\''+String(id)+'\')">Remover</button></td></tr>';
    }).join('');
    setTimeout(coletaAplicarVisualSelecaoRack,0);
}
function removerOSColeta(id){const pos=coletaOSItens.findIndex(i=>String(i.__coleta_id)===String(id));if(pos<0)return;const os=coletaTexto(coletaOSItens[pos],["os"]);coletaOSItens.splice(pos,1);atualizarColetaKPIs();atualizarFiltrosColeta();renderizarColeta();salvarColetaRascunho();coletaMensagem("O.S. "+os+" removida da coleta.","alerta");focarCampoColeta();}
function salvarColetaRascunho(){if(!coletaTipoAtual)return;try{localStorage.setItem(coletaChaveRascunho(),JSON.stringify(coletaOSItens));}catch(e){}}
function restaurarColetaLocal(){if(coletaOSItens.length||!coletaTipoAtual)return;try{const d=JSON.parse(localStorage.getItem(coletaChaveRascunho())||"[]");if(Array.isArray(d)){coletaOSItens=d;coletaUltimaOS=d[0]?coletaTexto(d[0],["os"]):"";atualizarFiltrosColeta();}}catch(e){}}
async function salvarColetaSupabase(){
    if(!coletaOSItens.length)throw new Error("Não há O.S. para salvar.");

    const supa=obterSupabaseClient();
    const usuario=typeof usuarioLogado!=="undefined"?usuarioLogado:null;
    const usuarioId=usuario?.id||null;
    const usuarioNome=usuario?.nome||usuario?.email||"Usuário";

    const cabecalho={
        tipo:coletaTipoAtual,
        titulo:"Coleta "+coletaNomeTipo(),
        usuario_id:usuarioId,
        usuario_nome:usuarioNome,
        quantidade:coletaOSItens.length,
        status:"finalizada"
    };

    const {data:coleta,error:erroColeta}=await supa
        .from("coletas_os")
        .insert(cabecalho)
        .select("id")
        .single();

    if(erroColeta)throw erroColeta;

    const itens=coletaOSItens.map((item,indice)=>({
        coleta_id:coleta.id,
        ordem:indice+1,
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
    }));

    const {error:erroItens}=await supa.from("coleta_os_itens").insert(itens);
    if(erroItens)throw erroItens;

    // Mantém cópia local apenas como segurança, mas o histórico oficial é o Supabase.
    salvarColetaRascunho();
    return coleta.id;
}

async function finalizarColeta(){
    if(!coletaOSItens.length){
        coletaMensagem("Não há O.S. para finalizar.","alerta");
        return;
    }
    if(!confirm("Finalizar esta coleta com "+coletaOSItens.length+" O.S.?"))return;

    const botao=event?.currentTarget;
    if(botao)botao.disabled=true;
    coletaMensagem("Finalizando coleta no Supabase...","");

    try{
        const id=await garantirColetaTempoRealV710();
        const supa=obterSupabaseClient();
        const usuario=typeof usuarioLogado!=="undefined"?usuarioLogado:null;

        const {error}=await supa.from("coletas_os").update({
            status:"finalizada",
            finalizado_em:new Date().toISOString(),
            quantidade:coletaOSItens.length,
            ultima_os:coletaUltimaOS||null,
            ultima_atividade_em:new Date().toISOString(),
            editor_id:usuario?.id||null,
            editor_nome:usuario?.nome||usuario?.email||"Usuário"
        }).eq("id",id);

        if(error)throw error;

        localStorage.removeItem(coletaChaveRascunho());
        coletaMensagem("Coleta nº "+id+" finalizada e disponível para todos os usuários.","ok");
        coletaRealtimeIdV710=null;
        coletaRealtimeEditorV710=false;
        atualizarTopoColetaLiveV710();
    }catch(e){
        console.error("Erro ao finalizar coleta:",e);
        coletaMensagem("Erro ao finalizar no Supabase: "+(e?.message||e),"erro");
    }finally{
        if(botao)botao.disabled=false;
        focarCampoColeta();
    }
}
function limparColeta(){if(!coletaOSItens.length)return;if(!confirm("Remover todas as O.S. desta coleta?"))return;coletaOSItens=[];coletaUltimaOS="";localStorage.removeItem(coletaChaveRascunho());atualizarColetaKPIs();atualizarFiltrosColeta();renderizarColeta();coletaMensagem("Coleta limpa. Campo pronto para nova leitura.","alerta");focarCampoColeta();}

function exportarColetaCSV(){
    const itens=itensColetaFiltrados();if(!itens.length){coletaMensagem("Não há dados para exportar.","alerta");return;}
    const cabBase=["O.S.","Data da O.S."];
    if(!coletaEhEnderecamento()) cabBase.push("Destino");
    cabBase.push("Loja de Origem","ALM","GRUPO","N.C.E.","Descrição do produto","Cód. Cor","Cor","Nº de Série","Rack","Status","Valor","Cubagem");
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const rows=itens.map(i=>{
        const linha=[coletaTexto(i,["os"]),coletaTexto(i,["dt_geracao"])];
        if(!coletaEhEnderecamento()) linha.push(coletaDestino(i));
        linha.push(coletaLoja(i),coletaTexto(i,["alm"]),coletaTexto(i,["grupo"]),coletaTexto(i,["nce"]),coletaTexto(i,["desc_produto"]),coletaCodCor(i),coletaTexto(i,["cor"]),coletaTexto(i,["n_serie"]),coletaRack(i),coletaTexto(i,["status","status_da_os"]),coletaValor(i),coletaCubagem(i));
        return linha.map(q).join(';');
    });
    const blob=new Blob(['\ufeff'+cabBase.map(q).join(';')+'\r\n'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='coleta_'+coletaTipoAtual+'_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    coletaMensagem("Arquivo CSV da coleta "+coletaNomeTipo()+" gerado com "+itens.length+" O.S.","ok");
    focarCampoColeta();
}
function imprimirColeta(){
    const itens=itensColetaFiltrados();if(!itens.length){coletaMensagem("Não há dados para imprimir.","alerta");return;}
    const tabela=document.getElementById('coletaTabela').outerHTML;const w=window.open('','_blank');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Coleta - '+coletaNomeTipo()+'</title><style>body{font-family:Arial;padding:14px;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:8px}th,td{border:1px solid #333;padding:4px;white-space:nowrap}th{background:#001b3d;color:#fff}.coleta-remover{display:none}</style></head><body><h1>Coleta de Ordens de Serviço</h1><p>'+itens.length+' O.S. • '+new Date().toLocaleString('pt-BR')+'</p>'+tabela+'<script>window.onload=()=>window.print()<\/script></body></html>');w.document.close();
}


/* ==========================================================
   V6.9.5 - RASCUNHOS COM COLUNAS REORGANIZÁVEIS
   Salva apenas no navegador. Não altera a tabela REXPEDLR.
   ========================================================== */
const RASCUNHOS_STORAGE_KEY="ERP_RASCUNHOS_ABAS_V680";
let rascunhosAbas=[];
let rascunhoAbaAtivaId=null;

function carregarRascunhos(){
    try{
        const dados=JSON.parse(localStorage.getItem(RASCUNHOS_STORAGE_KEY)||"[]");
        rascunhosAbas=Array.isArray(dados)?dados:[];
    }catch(e){
        rascunhosAbas=[];
    }
}

function salvarRascunhos(){
    try{
        localStorage.setItem(RASCUNHOS_STORAGE_KEY,JSON.stringify(rascunhosAbas));
    }catch(e){
        console.error("Falha ao salvar rascunhos:",e);
    }
}

function rascunhoAtivo(){
    return rascunhosAbas.find(a=>String(a.id)===String(rascunhoAbaAtivaId))||null;
}

function criarIdRascunho(){
    return "rasc_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
}

function abrirRascunhosColeta(){
    coletaTipoAtual="";
    coletaOSItens=[];
    coletaUltimaOS="";
    document.getElementById("coletaSelecaoTipos").style.display="none";
    document.getElementById("coletaOperacao").style.display="none";
    document.getElementById("rascunhosModulo").style.display="block";

    carregarRascunhos();
    if(!rascunhosAbas.length){
        novoRascunhoAba("Nova planilha");
        return;
    }
    if(!rascunhoAbaAtivaId || !rascunhoAtivo()){
        rascunhoAbaAtivaId=rascunhosAbas[0].id;
    }
    renderizarRascunhos();
    focarCampoRascunho();
}

function voltarRascunhosParaTipos(){
    salvarRascunhos();
    document.getElementById("rascunhosModulo").style.display="none";
    document.getElementById("coletaOperacao").style.display="none";
    document.getElementById("coletaSelecaoTipos").style.display="block";
}

function novoRascunhoAba(nome){
    const numero=rascunhosAbas.length+1;
    const aba={
        id:criarIdRascunho(),
        nome:String(nome||("Planilha "+numero)),
        observacao:"",
        criado_em:new Date().toISOString(),
        atualizado_em:new Date().toISOString(),
        itens:[]
    };
    rascunhosAbas.push(aba);
    rascunhoAbaAtivaId=aba.id;
    salvarRascunhos();
    renderizarRascunhos();
    setTimeout(()=>document.getElementById("rascunhoNome")?.select(),80);
}

function selecionarRascunhoAba(id){
    rascunhoAbaAtivaId=id;
    renderizarRascunhos();
    focarCampoRascunho();
}

function duplicarRascunhoAba(){
    const atual=rascunhoAtivo();
    if(!atual)return;
    const copia=JSON.parse(JSON.stringify(atual));
    copia.id=criarIdRascunho();
    copia.nome=(atual.nome||"Planilha")+" - Cópia";
    copia.criado_em=new Date().toISOString();
    copia.atualizado_em=new Date().toISOString();
    copia.itens=(copia.itens||[]).map(i=>({...i,__rascunho_id:"item_"+Date.now()+"_"+Math.random().toString(36).slice(2,7)}));
    rascunhosAbas.push(copia);
    rascunhoAbaAtivaId=copia.id;
    salvarRascunhos();
    renderizarRascunhos();
}

function excluirRascunhoAba(id){
    const alvo=id||rascunhoAbaAtivaId;
    const aba=rascunhosAbas.find(a=>String(a.id)===String(alvo));
    if(!aba)return;
    if(!confirm('Excluir a aba "'+(aba.nome||"Sem nome")+'"?'))return;

    const indice=rascunhosAbas.findIndex(a=>String(a.id)===String(alvo));
    rascunhosAbas.splice(indice,1);

    if(!rascunhosAbas.length){
        rascunhoAbaAtivaId=null;
        salvarRascunhos();
        novoRascunhoAba("Nova planilha");
        return;
    }

    rascunhoAbaAtivaId=rascunhosAbas[Math.max(0,indice-1)].id;
    salvarRascunhos();
    renderizarRascunhos();
}

function atualizarCabecalhoRascunho(){
    const aba=rascunhoAtivo();
    if(!aba)return;
    aba.nome=document.getElementById("rascunhoNome")?.value||"Sem nome";
    aba.observacao=document.getElementById("rascunhoObsGeral")?.value||"";
    aba.atualizado_em=new Date().toISOString();
    salvarRascunhos();
    renderizarAbasRascunho();
    atualizarKpisRascunho();
}

function renderizarAbasRascunho(){
    const barra=document.getElementById("rascunhosAbasBarra");
    if(!barra)return;
    barra.innerHTML=rascunhosAbas.map(aba=>{
        const ativa=String(aba.id)===String(rascunhoAbaAtivaId)?" ativa":"";
        return '<button class="rascunho-aba'+ativa+'" onclick="selecionarRascunhoAba(\''+String(aba.id)+'\')">'+
            '<span>'+rascunhoEsc(aba.nome||"Sem nome")+'</span>'+
            '<span class="rascunho-aba-fechar" onclick="event.stopPropagation();excluirRascunhoAba(\''+String(aba.id)+'\')">×</span>'+
            '</button>';
    }).join("")+'<button class="rascunho-add-aba" onclick="novoRascunhoAba()">＋ Nova aba</button>';
}

function renderizarRascunhos(){
    renderizarAbasRascunho();
    const aba=rascunhoAtivo();
    const nome=document.getElementById("rascunhoNome");
    const obs=document.getElementById("rascunhoObsGeral");
    if(nome)nome.value=aba?.nome||"";
    if(obs)obs.value=aba?.observacao||"";
    renderizarTabelaRascunho();
    atualizarKpisRascunho();
    rascunhoMensagem(aba?"Rascunho salvo automaticamente no navegador.":"Crie uma aba para começar.");
}

function rascunhoEsc(v){
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function rascunhoTexto(item,chaves){
    for(const chave of chaves){
        const valor=item?.[chave];
        if(valor!==undefined&&valor!==null&&String(valor).trim()!=="")return String(valor).trim();
    }
    return "";
}

function rascunhoMensagem(texto){
    const el=document.getElementById("rascunhosMensagem");
    if(el)el.textContent=texto;
}

function focarCampoRascunho(){
    setTimeout(()=>{
        const campo=document.getElementById("rascunhoCampoOS");
        if(campo){campo.focus();campo.select();}
    },60);
}

function rascunhoTeclaOS(e){
    if(e.key==="Enter"){
        e.preventDefault();
        adicionarOSRascunho();
    }
}

async function adicionarOSRascunho(){
    const aba=rascunhoAtivo();
    if(!aba){novoRascunhoAba();return;}

    const campo=document.getElementById("rascunhoCampoOS");
    const os=coletaNormalizarOS(campo?.value);
    if(!os){rascunhoMensagem("Digite ou bipe uma O.S.");focarCampoRascunho();return;}

    if((aba.itens||[]).some(i=>coletaNormalizarOS(rascunhoTexto(i,["os","OS"]))===os)){
        rascunhoMensagem("A O.S. "+os+" já está nesta aba.");
        campo.value="";
        focarCampoRascunho();
        return;
    }

    rascunhoMensagem("Consultando a O.S. "+os+"...");
    campo.disabled=true;

    try{
        const supa=obterSupabaseClient();
        const resp=await supa.from("rexpedlr").select("*").eq("os",os).limit(1);
        if(resp.error)throw resp.error;
        let item=(resp.data||[])[0];

        if(!item){
            const alt=await supa.from("rexpedlr").select("*").ilike("os",os).limit(1);
            if(alt.error)throw alt.error;
            item=(alt.data||[])[0];
        }

        if(!item){
            item={
                os:os,
                dt_geracao:"",
                __rascunho_destino:"",
                pdv:"",
                alm:"",
                grupo:"",
                nce:"",
                desc_produto:"",
                __rascunho_cod_cor:"",
                cor:"",
                n_serie:"",
                rack:"",
                status:"",
                valor_transf:"",
                cubagem:"",
                __linha_manual:true,
                __os_nao_encontrada:true
            };
        }

        item={...item};
        item.__rascunho_id="item_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
        item.__rascunho_rack=rascunhoTexto(item,["rack"]);
        item.__rascunho_observacao=item.__os_nao_encontrada?"O.S. não encontrada no banco":"";

        const cor=rascunhoTexto(item,["cor"]);
        item.__rascunho_cod_cor="";
        if(cor){
            const cod=await supa.from("codigo_cor").select("cod_cor").ilike("cor",cor).limit(1);
            if(!cod.error && cod.data?.[0]?.cod_cor!==undefined){
                item.__rascunho_cod_cor=String(cod.data[0].cod_cor??"").trim();
            }
        }

        aba.itens=aba.itens||[];
        aba.itens.push(item);
        aba.atualizado_em=new Date().toISOString();
        salvarRascunhos();
        renderizarRascunhos();
        rascunhoMensagem(
            item.__os_nao_encontrada
                ? "O.S. "+os+" adicionada sem dados do banco. Os campos ficaram disponíveis para edição."
                : "O.S. "+os+" adicionada à aba "+(aba.nome||"Sem nome")+"."
        );
    }catch(e){
        console.error(e);
        rascunhoMensagem("Falha ao consultar a O.S.: "+(e?.message||e));
    }finally{
        campo.disabled=false;
        campo.value="";
        focarCampoRascunho();
    }
}

function adicionarLinhaVaziaRascunho(){
    const aba=rascunhoAtivo();
    if(!aba)return;
    aba.itens=aba.itens||[];
    aba.itens.push({
        __rascunho_id:"item_"+Date.now()+"_"+Math.random().toString(36).slice(2,8),
        os:"",
        desc_produto:"",
        pdv:"",
        grupo:"",
        cor:"",
        __rascunho_cod_cor:"",
        __rascunho_rack:"",
        status:"",
        __rascunho_observacao:"",
        __linha_manual:true
    });
    aba.atualizado_em=new Date().toISOString();
    salvarRascunhos();
    renderizarRascunhos();
}

function atualizarCelulaRascunho(itemId,campo,valor){
    const aba=rascunhoAtivo();
    const item=(aba?.itens||[]).find(i=>String(i.__rascunho_id)===String(itemId));
    if(!item)return;
    item[campo]=String(valor??"");
    aba.atualizado_em=new Date().toISOString();
    salvarRascunhos();
    atualizarKpisRascunho();
}

function removerLinhaRascunho(itemId){
    const aba=rascunhoAtivo();
    if(!aba)return;
    aba.itens=(aba.itens||[]).filter(i=>String(i.__rascunho_id)!==String(itemId));
    aba.atualizado_em=new Date().toISOString();
    salvarRascunhos();
    renderizarRascunhos();
}

const RASCUNHO_COLUNAS_PADRAO=[
    {campo:"os",titulo:"O.S.",classe:"ras-col-os",tipo:"os"},
    {campo:"pdv",titulo:"Loja de Origem",classe:"ras-col-loja"},
    {campo:"alm",titulo:"ALM",classe:"ras-col-alm"},
    {campo:"grupo",titulo:"Grupo",classe:"ras-col-grupo"},
    {campo:"nce",titulo:"N.C.E.",classe:"ras-col-nce"},
    {campo:"desc_produto",titulo:"Produto",classe:"ras-col-produto",tipo:"produto"},
    {campo:"__rascunho_cod_cor",titulo:"Cód. Cor",classe:"ras-col-codcor"},
    {campo:"cor",titulo:"Cor",classe:"ras-col-cor"},
    {campo:"n_serie",titulo:"Nº de Série",classe:"ras-col-serie"},
    {campo:"__rascunho_rack",titulo:"Rack",classe:"ras-col-rack"},
    {campo:"status",titulo:"Status",classe:"ras-col-status"}
];

function garantirEstruturaColunasRascunho(aba){
    if(!aba)return;
    if(!aba.__cabecalhos || typeof aba.__cabecalhos!=="object")aba.__cabecalhos={};
    if(!Array.isArray(aba.__colunas_personalizadas))aba.__colunas_personalizadas=[];
}

function colunasAtuaisRascunho(aba){
    garantirEstruturaColunasRascunho(aba);

    const todas=[
        ...RASCUNHO_COLUNAS_PADRAO.map(c=>({
            ...c,
            titulo:aba.__cabecalhos[c.campo]||c.titulo,
            personalizada:false
        })),
        ...aba.__colunas_personalizadas.map(c=>({
            campo:c.campo,
            titulo:c.titulo||"Nova coluna",
            classe:"ras-col-personalizada",
            personalizada:true
        }))
    ];

    const mapa=new Map(todas.map(c=>[c.campo,c]));
    let ordem=Array.isArray(aba.__ordem_colunas)?aba.__ordem_colunas.filter(c=>mapa.has(c)):[];
    for(const c of todas)if(!ordem.includes(c.campo))ordem.push(c.campo);

    aba.__ordem_colunas=ordem;
    return ordem.map(c=>mapa.get(c)).filter(Boolean);
}

function atualizarCabecalhoColunaRascunho(campo,valor){
    const aba=rascunhoAtivo();
    if(!aba)return;
    garantirEstruturaColunasRascunho(aba);

    const personalizada=aba.__colunas_personalizadas.find(c=>c.campo===campo);
    if(personalizada)personalizada.titulo=String(valor||"").trim()||"Nova coluna";
    else aba.__cabecalhos[campo]=String(valor||"").trim()||RASCUNHO_COLUNAS_PADRAO.find(c=>c.campo===campo)?.titulo||campo;

    aba.atualizado_em=new Date().toISOString();
    salvarRascunhos();
}

function abrirModalAdicionarColunaRascunho(){
    const aba=rascunhoAtivo();
    if(!aba){rascunhoMensagem("Crie ou selecione uma aba primeiro.");return;}
    garantirEstruturaColunasRascunho(aba);

    const existente=document.getElementById("modalAdicionarColunaRascunho");
    if(existente)existente.remove();

    const colunas=colunasAtuaisRascunho(aba);
    const opcoes=colunas.map(c=>'<option value="'+c.campo+'">'+rascunhoEsc(c.titulo)+'</option>').join("");

    const modal=document.createElement("div");
    modal.id="modalAdicionarColunaRascunho";
    modal.className="rascunho-modal-overlay";
    modal.innerHTML=
        '<div class="rascunho-modal">'+
            '<div class="rascunho-modal-topo">'+
                '<strong>Adicionar coluna</strong>'+
                '<button type="button" onclick="fecharModalAdicionarColunaRascunho()">×</button>'+
            '</div>'+
            '<label>Nome da coluna</label>'+
            '<input id="rascunhoNovaColunaNome" value="Nova coluna" autocomplete="off">'+
            '<label>Inserir</label>'+
            '<select id="rascunhoNovaColunaLado">'+
                '<option value="antes">Antes de</option>'+
                '<option value="depois">Depois de</option>'+
            '</select>'+
            '<label>Coluna de referência</label>'+
            '<select id="rascunhoNovaColunaReferencia">'+opcoes+'</select>'+
            '<div class="rascunho-modal-acoes">'+
                '<button type="button" class="coleta-btn light" onclick="fecharModalAdicionarColunaRascunho()">Cancelar</button>'+
                '<button type="button" class="coleta-btn blue" onclick="confirmarAdicionarColunaRascunho()">Adicionar</button>'+
            '</div>'+
        '</div>';

    document.body.appendChild(modal);
    setTimeout(()=>document.getElementById("rascunhoNovaColunaNome")?.select(),50);
}

function fecharModalAdicionarColunaRascunho(){
    document.getElementById("modalAdicionarColunaRascunho")?.remove();
}

function adicionarColunaRascunho(){
    abrirModalAdicionarColunaRascunho();
}

function confirmarAdicionarColunaRascunho(){
    const aba=rascunhoAtivo();
    if(!aba)return;
    garantirEstruturaColunasRascunho(aba);

    const nome=String(document.getElementById("rascunhoNovaColunaNome")?.value||"").trim()||"Nova coluna";
    const lado=document.getElementById("rascunhoNovaColunaLado")?.value||"depois";
    const referencia=document.getElementById("rascunhoNovaColunaReferencia")?.value||"";

    const campo="__personalizada_"+Date.now()+"_"+Math.random().toString(36).slice(2,6);
    const nova={campo:campo,titulo:nome};

    let ordem=Array.isArray(aba.__ordem_colunas)?[...aba.__ordem_colunas]:colunasAtuaisRascunho(aba).map(c=>c.campo);
    ordem=ordem.filter(c=>c!==campo);

    const indice=ordem.indexOf(referencia);
    const pos=indice<0?ordem.length:(lado==="antes"?indice:indice+1);
    ordem.splice(pos,0,campo);

    aba.__colunas_personalizadas.push(nova);
    aba.__ordem_colunas=ordem;

    for(const item of (aba.itens||[]))item[campo]="";
    aba.atualizado_em=new Date().toISOString();

    salvarRascunhos();
    fecharModalAdicionarColunaRascunho();
    renderizarRascunhos();
    rascunhoMensagem("Coluna adicionada na posição escolhida.");
}
function removerColunaRascunho(campo){
    const aba=rascunhoAtivo();
    if(!aba)return;
    garantirEstruturaColunasRascunho(aba);
    const coluna=aba.__colunas_personalizadas.find(c=>c.campo===campo);
    if(!coluna)return;
    if(!confirm('Remover a coluna "'+(coluna.titulo||"Nova coluna")+'" desta aba?'))return;

    aba.__colunas_personalizadas=aba.__colunas_personalizadas.filter(c=>c.campo!==campo);
    if(Array.isArray(aba.__ordem_colunas))aba.__ordem_colunas=aba.__ordem_colunas.filter(c=>c!==campo);
    for(const item of (aba.itens||[]))delete item[campo];

    aba.atualizado_em=new Date().toISOString();
    salvarRascunhos();
    renderizarRascunhos();
}

function renderizarCabecalhoRascunho(){
    const thead=document.getElementById("rascunhosTabelaCabecalho");
    const aba=rascunhoAtivo();
    if(!thead)return;

    const colunas=aba?colunasAtuaisRascunho(aba):RASCUNHO_COLUNAS_PADRAO;
    const cabecalhos=colunas.map(col=>{
        const excluir=col.personalizada
            ?'<button class="rascunho-remover-coluna" type="button" title="Remover coluna" onclick="event.stopPropagation();removerColunaRascunho(\''+col.campo+'\')">×</button>'
            :"";
        const largura=(aba?.__larguras_colunas?.[col.campo]||"");
        const style=largura?' style="width:'+largura+'px;min-width:'+largura+'px"':"";
        return '<th class="'+(col.classe||"")+'" data-campo="'+col.campo+'" draggable="true"'+style+
            ' ondragstart="iniciarArrasteColunaRascunho(event,\''+col.campo+'\')"'+
            ' ondragover="permitirSoltarColunaRascunho(event)"'+
            ' ondrop="soltarColunaRascunho(event,\''+col.campo+'\')"'+
            ' oncontextmenu="abrirMenuColunaRascunho(event,\''+col.campo+'\')">'+
            '<div class="rascunho-cabecalho-editavel">'+
            '<span class="rascunho-alca-arraste" title="Arraste para mover">⋮⋮</span>'+
            '<input value="'+rascunhoEsc(col.titulo)+'" title="Clique e digite para renomear" '+
            'oninput="atualizarCabecalhoColunaRascunho(\''+col.campo+'\',this.value)">'+
            excluir+
            '<span class="rascunho-redimensionador" onmousedown="iniciarRedimensionamentoColunaRascunho(event,\''+col.campo+'\')"></span>'+
            '</div></th>';
    }).join("");

    thead.innerHTML='<tr><th class="ras-col-indice">#</th>'+cabecalhos+'<th class="ras-col-acao">Ação</th></tr>';
}

let rascunhoColunaArrastada="";

function iniciarArrasteColunaRascunho(event,campo){
    rascunhoColunaArrastada=campo;
    event.dataTransfer.effectAllowed="move";
    event.dataTransfer.setData("text/plain",campo);
}

function permitirSoltarColunaRascunho(event){
    event.preventDefault();
    event.dataTransfer.dropEffect="move";
}

function soltarColunaRascunho(event,campoDestino){
    event.preventDefault();
    const aba=rascunhoAtivo();
    if(!aba)return;

    const origem=rascunhoColunaArrastada||event.dataTransfer.getData("text/plain");
    if(!origem||origem===campoDestino)return;

    let ordem=colunasAtuaisRascunho(aba).map(c=>c.campo);
    const iOrigem=ordem.indexOf(origem);
    const iDestino=ordem.indexOf(campoDestino);
    if(iOrigem<0||iDestino<0)return;

    ordem.splice(iOrigem,1);
    ordem.splice(iDestino,0,origem);
    aba.__ordem_colunas=ordem;
    aba.atualizado_em=new Date().toISOString();

    salvarRascunhos();
    renderizarRascunhos();
}

function iniciarRedimensionamentoColunaRascunho(event,campo){
    event.preventDefault();
    event.stopPropagation();

    const aba=rascunhoAtivo();
    if(!aba)return;
    if(!aba.__larguras_colunas||typeof aba.__larguras_colunas!=="object")aba.__larguras_colunas={};

    const th=event.target.closest("th");
    const larguraInicial=th?.getBoundingClientRect().width||120;
    const xInicial=event.clientX;

    const mover=e=>{
        const largura=Math.max(60,Math.round(larguraInicial+(e.clientX-xInicial)));
        th.style.width=largura+"px";
        th.style.minWidth=largura+"px";
        aba.__larguras_colunas[campo]=largura;
    };

    const soltar=()=>{
        document.removeEventListener("mousemove",mover);
        document.removeEventListener("mouseup",soltar);
        salvarRascunhos();
        renderizarTabelaRascunho();
    };

    document.addEventListener("mousemove",mover);
    document.addEventListener("mouseup",soltar);
}

function fecharMenuColunaRascunho(){
    document.getElementById("rascunhoMenuColuna")?.remove();
}

function abrirMenuColunaRascunho(event,campo){
    event.preventDefault();
    fecharMenuColunaRascunho();

    const aba=rascunhoAtivo();
    if(!aba)return;
    const coluna=colunasAtuaisRascunho(aba).find(c=>c.campo===campo);
    if(!coluna)return;

    const menu=document.createElement("div");
    menu.id="rascunhoMenuColuna";
    menu.className="rascunho-menu-coluna";
    menu.style.left=event.clientX+"px";
    menu.style.top=event.clientY+"px";

    menu.innerHTML=
        '<button onclick="inserirColunaAoLadoRascunho(\''+campo+'\',\'antes\')">Inserir coluna à esquerda</button>'+
        '<button onclick="inserirColunaAoLadoRascunho(\''+campo+'\',\'depois\')">Inserir coluna à direita</button>'+
        '<button onclick="renomearColunaRascunho(\''+campo+'\')">Renomear</button>'+
        (coluna.personalizada?'<button class="perigo" onclick="removerColunaRascunho(\''+campo+'\');fecharMenuColunaRascunho()">Excluir coluna</button>':"");

    document.body.appendChild(menu);
    setTimeout(()=>document.addEventListener("click",fecharMenuColunaRascunho,{once:true}),0);
}

function inserirColunaAoLadoRascunho(campo,lado){
    fecharMenuColunaRascunho();
    const aba=rascunhoAtivo();
    if(!aba)return;
    garantirEstruturaColunasRascunho(aba);

    const nome=prompt("Nome da nova coluna:","Nova coluna");
    if(nome===null)return;

    const novoCampo="__personalizada_"+Date.now()+"_"+Math.random().toString(36).slice(2,6);
    aba.__colunas_personalizadas.push({campo:novoCampo,titulo:String(nome).trim()||"Nova coluna"});

    let ordem=colunasAtuaisRascunho(aba).map(c=>c.campo).filter(c=>c!==novoCampo);
    const indice=ordem.indexOf(campo);
    ordem.splice(indice<0?ordem.length:(lado==="antes"?indice:indice+1),0,novoCampo);
    aba.__ordem_colunas=ordem;

    for(const item of (aba.itens||[]))item[novoCampo]="";
    aba.atualizado_em=new Date().toISOString();

    salvarRascunhos();
    renderizarRascunhos();
}

function renomearColunaRascunho(campo){
    fecharMenuColunaRascunho();
    const aba=rascunhoAtivo();
    if(!aba)return;
    const coluna=colunasAtuaisRascunho(aba).find(c=>c.campo===campo);
    if(!coluna)return;

    const nome=prompt("Novo nome da coluna:",coluna.titulo);
    if(nome===null)return;
    atualizarCabecalhoColunaRascunho(campo,nome);
    renderizarRascunhos();
}
function renderizarTabelaRascunho(){
    const corpo=document.getElementById("rascunhosTabelaCorpo");
    const aba=rascunhoAtivo();
    if(!corpo)return;

    renderizarCabecalhoRascunho();
    const colunas=aba?colunasAtuaisRascunho(aba):RASCUNHO_COLUNAS_PADRAO;
    const totalColunas=colunas.length+2;
    const itens=aba?.itens||[];

    if(!itens.length){
        corpo.innerHTML='<tr><td colspan="'+totalColunas+'" class="rascunho-vazio">Nenhuma O.S. nesta aba.</td></tr>';
        return;
    }

    corpo.innerHTML=itens.map((item,idx)=>{
        const id=String(item.__rascunho_id);
        const celula=col=>{
            let valor="";
            if(col.campo==="os")valor=rascunhoTexto(item,["os","OS"]);
            else if(col.campo==="grupo")valor=rascunhoTexto(item,["grupo","grup"]);
            else if(col.campo==="desc_produto")valor=rascunhoTexto(item,["desc_produto","descricao_produto"]);
            else if(col.campo==="__rascunho_cod_cor")valor=rascunhoTexto(item,["__rascunho_cod_cor","cod_cor"]);
            else if(col.campo==="n_serie")valor=rascunhoTexto(item,["n_serie","numero_serie"]);
            else if(col.campo==="__rascunho_rack")valor=rascunhoTexto(item,["__rascunho_rack","rack"]);
            else if(col.campo==="status")valor=rascunhoTexto(item,["status","status_da_os"]);
            else valor=rascunhoTexto(item,[col.campo]);

            if(col.tipo==="textarea"){
                return '<td class="'+col.classe+'"><textarea oninput="atualizarCelulaRascunho(\''+id+'\',\''+col.campo+'\',this.value)">'+rascunhoEsc(valor)+'</textarea></td>';
            }

            const classeInput=col.tipo==="os"?"rascunho-input-os":(col.tipo==="produto"?"rascunho-input-produto":"");
            return '<td class="'+(col.classe||"")+'"><input class="'+classeInput+'" value="'+rascunhoEsc(valor)+'" oninput="atualizarCelulaRascunho(\''+id+'\',\''+col.campo+'\',this.value)"></td>';
        };

        return '<tr>'+
            '<td class="ras-col-indice">'+(idx+1)+'</td>'+
            colunas.map(celula).join("")+
            '<td class="ras-col-acao"><button class="coleta-remover" onclick="removerLinhaRascunho(\''+id+'\')">Remover</button></td>'+
            '</tr>';
    }).join("");
}

function atualizarKpisRascunho(){
    const aba=rascunhoAtivo();
    const itens=aba?.itens||[];
    const comRack=itens.filter(i=>rascunhoTexto(i,["__rascunho_rack","rack"])).length;
    const comObs=itens.filter(i=>rascunhoTexto(i,["__rascunho_observacao_REMOVIDA"])).length;
    const hora=aba?.atualizado_em?new Date(aba.atualizado_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"--:--";

    const totalEl=document.getElementById("rascunhoKpiTotal");
    const rackEl=document.getElementById("rascunhoKpiRack");
    const obsEl=document.getElementById("rascunhoKpiObs");
    const horaEl=document.getElementById("rascunhoKpiHora");

    if(totalEl)totalEl.textContent=itens.length;
    if(rackEl)rackEl.textContent=comRack;
    if(obsEl)obsEl.textContent=comObs;
    if(horaEl)horaEl.textContent=hora;
}

function exportarRascunhoCSV(){
    const aba=rascunhoAtivo();
    const itens=aba?.itens||[];
    if(!itens.length){rascunhoMensagem("Não há linhas para exportar.");return;}

    const colunas=colunasAtuaisRascunho(aba);
    const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
    const valorCampo=(item,campo)=>{
        if(campo==="os")return rascunhoTexto(item,["os","OS"]);
        if(campo==="grupo")return rascunhoTexto(item,["grupo","grup"]);
        if(campo==="desc_produto")return rascunhoTexto(item,["desc_produto","descricao_produto"]);
        if(campo==="__rascunho_cod_cor")return rascunhoTexto(item,["__rascunho_cod_cor","cod_cor"]);
        if(campo==="n_serie")return rascunhoTexto(item,["n_serie","numero_serie"]);
        if(campo==="__rascunho_rack")return rascunhoTexto(item,["__rascunho_rack","rack"]);
        if(campo==="status")return rascunhoTexto(item,["status","status_da_os"]);
        return rascunhoTexto(item,[campo]);
    };

    const cab=colunas.map(c=>c.titulo);
    const linhas=itens.map(item=>colunas.map(c=>q(valorCampo(item,c.campo))).join(";"));

    const blob=new Blob(["\ufeff"+cab.map(q).join(";")+"\r\n"+linhas.join("\r\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="rascunho_"+String(aba.nome||"planilha").replace(/[^\w\-]+/g,"_")+".csv";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    rascunhoMensagem("CSV exportado com as colunas atuais da planilha.");
}



/* ==========================================================
   V6.9.5 - COLAGEM DE O.S. EM LOTE NOS RASCUNHOS
   ========================================================== */

let rascunhoImportandoLote=false;

function rascunhoExtrairOSDoTexto(texto){
    const partes=String(texto||"")
        .replace(/\r/g,"\n")
        .split(/[\n\t;,]+/)
        .map(v=>coletaNormalizarOS(v))
        .filter(Boolean);

    const unicas=[];
    const vistos=new Set();
    for(const os of partes){
        if(!vistos.has(os)){
            vistos.add(os);
            unicas.push(os);
        }
    }
    return unicas;
}

function rascunhoColarOS(event){
    const texto=event.clipboardData?.getData("text")||"";
    const lista=rascunhoExtrairOSDoTexto(texto);

    if(lista.length<=1){
        return;
    }

    event.preventDefault();
    importarOSRascunhoEmLote(lista);
}

function mostrarProgressoRascunho(atual,total,titulo,detalhe){
    const box=document.getElementById("rascunhosProgresso");
    const barra=document.getElementById("rascunhosProgressoBarra");
    const contador=document.getElementById("rascunhosProgressoContador");
    const tituloEl=document.getElementById("rascunhosProgressoTitulo");
    const detalheEl=document.getElementById("rascunhosProgressoDetalhe");

    if(!box)return;
    box.style.display="block";
    const percentual=total>0?Math.round((atual/total)*100):0;
    if(barra)barra.style.width=percentual+"%";
    if(contador)contador.textContent=atual+" / "+total;
    if(tituloEl)tituloEl.textContent=titulo||"Importando O.S...";
    if(detalheEl)detalheEl.textContent=detalhe||"";
}

function ocultarProgressoRascunho(){
    const box=document.getElementById("rascunhosProgresso");
    if(box){
        setTimeout(()=>{box.style.display="none";},1200);
    }
}

async function buscarOSCompletaRascunho(os,supa){
    let resp=await supa.from("rexpedlr").select("*").eq("os",os).limit(1);
    if(resp.error)throw resp.error;
    let item=(resp.data||[])[0];

    if(!item){
        const alt=await supa.from("rexpedlr").select("*").ilike("os",os).limit(1);
        if(alt.error)throw alt.error;
        item=(alt.data||[])[0];
    }

    if(!item)return null;

    item={...item};
    item.__rascunho_id="item_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
    item.__rascunho_rack=rascunhoTexto(item,["rack"]);
    item.__rascunho_observacao="";
    item.__rascunho_cod_cor="";

    const cor=rascunhoTexto(item,["cor"]);
    if(cor){
        const cod=await supa.from("codigo_cor").select("cod_cor").ilike("cor",cor).limit(1);
        if(!cod.error && cod.data?.[0]?.cod_cor!==undefined){
            item.__rascunho_cod_cor=String(cod.data[0].cod_cor??"").trim();
        }
    }

    return item;
}

async function importarOSRascunhoEmLote(lista){
    if(rascunhoImportandoLote)return;

    const aba=rascunhoAtivo();
    if(!aba){
        novoRascunhoAba();
        return;
    }

    const todas=(Array.isArray(lista)?lista:rascunhoExtrairOSDoTexto(lista));
    if(!todas.length){
        rascunhoMensagem("Nenhuma O.S. válida foi encontrada na colagem.");
        return;
    }

    const existentes=new Set((aba.itens||[]).map(i=>coletaNormalizarOS(rascunhoTexto(i,["os","OS"]))).filter(Boolean));
    const pendentes=todas.filter(os=>!existentes.has(os));
    const duplicadas=todas.length-pendentes.length;

    if(!pendentes.length){
        rascunhoMensagem("Todas as O.S. coladas já existem nesta aba.");
        return;
    }

    rascunhoImportandoLote=true;
    const campo=document.getElementById("rascunhoCampoOS");
    if(campo){
        campo.disabled=true;
        campo.value="";
    }

    const supa=obterSupabaseClient();
    let adicionadas=0;
    let naoEncontradas=0;
    let falhas=0;
    const total=pendentes.length;

    mostrarProgressoRascunho(0,total,"Importando O.S...","Preparando consulta no Supabase.");
    rascunhoMensagem("Colagem reconhecida: "+total+" O.S. para importar.");

    for(let i=0;i<pendentes.length;i++){
        const os=pendentes[i];
        mostrarProgressoRascunho(i,total,"Importando O.S...","Consultando O.S. "+os);

        try{
            let item=await buscarOSCompletaRascunho(os,supa);
            aba.itens=aba.itens||[];

            if(item){
                aba.itens.push(item);
                adicionadas++;
            }else{
                /* Mantém a O.S. no rascunho mesmo quando ela não existe na REXPEDLR.
                   Os demais campos ficam vazios e totalmente editáveis. */
                item={
                    __rascunho_id:"item_"+Date.now()+"_"+Math.random().toString(36).slice(2,8),
                    os:os,
                    dt_geracao:"",
                    __rascunho_destino:"",
                    pdv:"",
                    alm:"",
                    grupo:"",
                    nce:"",
                    desc_produto:"",
                    __rascunho_cod_cor:"",
                    cor:"",
                    n_serie:"",
                    __rascunho_rack:"",
                    status:"",
                    valor_transf:"",
                    cubagem:"",
                    __rascunho_observacao:"O.S. não encontrada no banco",
                    __linha_manual:true,
                    __os_nao_encontrada:true
                };
                aba.itens.push(item);
                naoEncontradas++;
            }
        }catch(e){
            console.error("Falha ao importar O.S. "+os,e);
            falhas++;
        }

        aba.atualizado_em=new Date().toISOString();
        salvarRascunhos();

        // Atualiza a tabela em blocos para não travar em listas grandes.
        if((i+1)%10===0 || i===pendentes.length-1){
            renderizarTabelaRascunho();
            atualizarKpisRascunho();
        }

        mostrarProgressoRascunho(i+1,total,"Importando O.S...","Processada O.S. "+os);
    }

    rascunhoImportandoLote=false;
    if(campo)campo.disabled=false;

    renderizarRascunhos();
    mostrarProgressoRascunho(total,total,"Importação concluída",
        (adicionadas+naoEncontradas)+" linha(s) criada(s), "+naoEncontradas+" sem dados do banco, "+falhas+" falha(s)."
    );
    ocultarProgressoRascunho();

    let mensagem=(adicionadas+naoEncontradas)+" O.S. adicionada(s)";
    if(duplicadas)mensagem+=", "+duplicadas+" repetida(s) ignorada(s)";
    if(naoEncontradas)mensagem+=", "+naoEncontradas+" inserida(s) sem dados do banco";
    if(falhas)mensagem+=", "+falhas+" com falha";
    rascunhoMensagem(mensagem+".");

    focarCampoRascunho();
}



/* V6.9.5 - todas as colunas originais preservadas */
function atualizarCampoColeta(id,campo,valor){
    const item=coletaOSItens.find(i=>String(i.__coleta_id)===String(id));
    if(!item)return;
    item[campo]=campo==="os"?coletaNormalizarOS(valor):String(valor??"");
    salvarColetaRascunho();
    atualizarColetaKPIs();
    atualizarFiltrosColeta();
}

function coletaExtrairOSLote(texto){
    const lista=String(texto||"").replace(/\r/g,"\n").split(/[\n\t;,]+/).map(v=>coletaNormalizarOS(v)).filter(Boolean);
    return [...new Set(lista)];
}

function coletaColarOSLote(event){
    const texto=(event.clipboardData||window.clipboardData)?.getData("text")||"";
    const lista=coletaExtrairOSLote(texto);
    if(lista.length<=1)return;
    event.preventDefault();
    importarOSColetaLote(lista);
}

async function buscarItemColetaLote(os,supa){
    let r=await supa.from("rexpedlr").select("*").eq("os",os).limit(1);
    if(r.error)throw r.error;
    let item=(r.data||[])[0];
    if(!item){
        const alt=await supa.from("rexpedlr").select("*").ilike("os",os).limit(1);
        if(alt.error)throw alt.error;
        item=(alt.data||[])[0];
    }
    if(!item){
        item={os:os,dt_geracao:"",pdv:"",alm:"",grupo:"",nce:"",desc_produto:"",cor:"",n_serie:"",rack:"",status:"",valor_transf:"",cubagem:"",__os_nao_encontrada:true,__coleta_observacao:"O.S. não encontrada no banco"};
    }else item={...item};

    item.__coleta_destino="";
    item.__coleta_cod_cor="";

    if(!item.__os_nao_encontrada){
        const origem=coletaTexto(item,["pdv"]).toUpperCase().trim();
        if(!coletaEhEnderecamento()&&origem){
            const d=await supa.from("destinos_filiais").select("destino").eq("origem",origem).maybeSingle();
            if(!d.error&&d.data?.destino)item.__coleta_destino=String(d.data.destino).trim().toUpperCase();
        }
        const cor=coletaTexto(item,["cor"]).trim();
        if(cor){
            const c=await supa.from("codigo_cor").select("cod_cor").ilike("cor",cor).limit(1);
            if(!c.error&&c.data?.[0]?.cod_cor!=null)item.__coleta_cod_cor=String(c.data[0].cod_cor).trim();
        }
    }

    if(coletaEhEnderecamento())item.__coleta_rack="";
    item.__coleta_tipo=coletaTipoAtual;
    item.__coleta_id=Date.now()+Math.random();
    item.__coleta_hora=new Date().toISOString();
    return item;
}

async function importarOSColetaLote(lista){
    const existentes=new Set(coletaOSItens.map(i=>coletaNormalizarOS(coletaTexto(i,["os","OS"]))).filter(Boolean));
    const pendentes=lista.filter(os=>!existentes.has(os));
    if(!pendentes.length){coletaMensagem("Todas as O.S. já estão nesta coleta.","alerta");return;}

    const campo=document.getElementById("coletaCampoOS");
    if(campo){campo.disabled=true;campo.value="";}
    const supa=obterSupabaseClient();
    let semDados=0;

    try{
        for(let i=0;i<pendentes.length;i++){
            const os=pendentes[i];
            coletaMensagem("Importando "+(i+1)+" de "+pendentes.length+": O.S. "+os,"");
            let item;
            try{
                item=await buscarItemColetaLote(os,supa);
            }catch(e){
                item={os:os,dt_geracao:"",pdv:"",alm:"",grupo:"",nce:"",desc_produto:"",cor:"",n_serie:"",rack:"",status:"",valor_transf:"",cubagem:"",__os_nao_encontrada:true,__coleta_observacao:"Falha ao consultar banco",__coleta_destino:"",__coleta_cod_cor:"",__coleta_rack:"",__coleta_tipo:coletaTipoAtual,__coleta_id:Date.now()+Math.random(),__coleta_hora:new Date().toISOString()};
            }
            if(item.__os_nao_encontrada)semDados++;
            coletaOSItens.push(item);
            if((i+1)%10===0||i===pendentes.length-1){
                salvarColetaRascunho();
                atualizarColetaKPIs();
                atualizarFiltrosColeta();
                renderizarColeta();
            }
        }
        coletaMensagem(pendentes.length+" O.S. adicionada(s). "+semDados+" ficaram sem dados do banco.","ok");
    }finally{
        if(campo)campo.disabled=false;
        focarCampoColeta();
    }
}
