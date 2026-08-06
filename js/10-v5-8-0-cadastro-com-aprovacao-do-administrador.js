/* =========================================================
   V5.8.0 - CADASTRO COM APROVAÇÃO DO ADMINISTRADOR
   ========================================================= */
let solicitacoesCadastroV580=[];

function abrirCadastroV580(){
    const modal=document.getElementById("cadastroModalV580");
    const msg=document.getElementById("cadastroMensagemV580");
    if(msg){msg.className="cadastro-status";msg.textContent=""}
    modal?.classList.add("aberto");
    setTimeout(()=>document.getElementById("cadastroNomeV580")?.focus(),80);
}

function fecharCadastroV580(){
    document.getElementById("cadastroModalV580")?.classList.remove("aberto");
}

function mensagemCadastroV580(texto,tipo="info"){
    const el=document.getElementById("cadastroMensagemV580");
    if(!el)return;
    el.className="cadastro-status "+tipo;
    el.textContent=texto;
}

async function solicitarCadastroV580(){
    const nome=(document.getElementById("cadastroNomeV580")?.value||"").trim();
    const cargo=(document.getElementById("cadastroCargoV580")?.value||"").trim();
    const email=(document.getElementById("cadastroEmailV580")?.value||"").trim().toLowerCase();
    const senha=document.getElementById("cadastroSenhaV580")?.value||"";
    const senha2=document.getElementById("cadastroSenha2V580")?.value||"";
    const btn=document.getElementById("cadastroEnviarV580");

    if(nome.length<3)return mensagemCadastroV580("Informe seu nome completo.","erro");
    if(!email||!email.includes("@"))return mensagemCadastroV580("Informe um e-mail válido.","erro");
    if(senha.length<6)return mensagemCadastroV580("A senha precisa ter pelo menos 6 caracteres.","erro");
    if(senha!==senha2)return mensagemCadastroV580("As senhas não são iguais.","erro");

    btn.disabled=true;
    mensagemCadastroV580("Criando a solicitação...","info");

    try{
        const supabase=obterSupabaseClient();
        let concluido=false;
        let erroEdge=null;

        // Caminho principal: Edge Function.
        try{
            const {data,error}=await supabase.functions.invoke("solicitar-conta",{
                body:{nome,cargo,email,senha}
            });
            if(error)throw error;
            if(data?.erro)throw new Error(data.erro);
            concluido=true;
        }catch(edgeError){
            erroEdge=edgeError;
            console.warn("Edge Function solicitar-conta indisponível. Tentando cadastro direto seguro.",edgeError);
        }

        // Contingência: cria o usuário diretamente no Supabase Auth e grava o perfil
        // como pendente, usando um cliente separado para não afetar outras sessões.
        if(!concluido){
            mensagemCadastroV580("Servidor de cadastro indisponível. Tentando método alternativo...","info");

            const url=localStorage.getItem("SUPABASE_URL")||SUPABASE_URL_PADRAO;
            const key=localStorage.getItem("SUPABASE_ANON_KEY")||SUPABASE_ANON_KEY_PADRAO;
            const clienteCadastro=window.supabase.createClient(url,key,{
                auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
            });

            const {data:authData,error:authError}=await clienteCadastro.auth.signUp({
                email,
                password:senha,
                options:{data:{nome,cargo,perfil:"consulta",status_aprovacao:"pendente"}}
            });
            if(authError)throw authError;

            const userId=authData?.user?.id;
            if(!userId)throw new Error("O Supabase não retornou o identificador da nova conta.");

            const payload={
                id:userId,
                nome,
                cargo,
                perfil:"consulta",
                ativo:false,
                status_aprovacao:"pendente",
                email
            };

            let resposta=await clienteCadastro.from("usuarios").upsert(payload,{onConflict:"id"});

            // Compatibilidade com bancos sem a coluna e-mail.
            if(resposta.error&&/email|column/i.test(String(resposta.error.message||""))){
                const {email:_,...semEmail}=payload;
                resposta=await clienteCadastro.from("usuarios").upsert(semEmail,{onConflict:"id"});
            }

            // Compatibilidade com bancos antigos sem status_aprovacao.
            if(resposta.error&&/status_aprovacao|column/i.test(String(resposta.error.message||""))){
                const minimo={id:userId,nome,cargo,perfil:"consulta",ativo:false};
                resposta=await clienteCadastro.from("usuarios").upsert(minimo,{onConflict:"id"});
            }

            if(resposta.error){
                const detalheEdge=[erroEdge?.message,erroEdge?.details].filter(Boolean).join(" — ");
                throw new Error(
                    "A conta foi criada no Authentication, mas a solicitação não pôde ser gravada na tabela usuarios: "+
                    (resposta.error.message||resposta.error)+
                    (detalheEdge?" | Edge Function: "+detalheEdge:"")
                );
            }

            try{await clienteCadastro.auth.signOut()}catch(_){}
            concluido=true;
        }

        mensagemCadastroV580(
            "Solicitação criada com sucesso. Aguarde a aprovação do administrador para entrar no sistema.",
            "ok"
        );

        ["cadastroNomeV580","cadastroCargoV580","cadastroEmailV580","cadastroSenhaV580","cadastroSenha2V580"]
            .forEach(id=>{const el=document.getElementById(id);if(el)el.value=""});
    }catch(e){
        const detalhe=[e?.message,e?.details,e?.hint,e?.code].filter(Boolean).join(" — ")||String(e);
        mensagemCadastroV580("Não foi possível criar a solicitação: "+detalhe,"erro");
    }finally{
        btn.disabled=false;
    }
}

function formatarSolicitacaoV580(data){
    if(!data)return "-";
    try{return new Date(data).toLocaleString("pt-BR")}catch(e){return String(data)}
}

async function carregarSolicitacoesCadastroV580(){
    if(!temPermissao(["administrador"]))return;
    const lista=document.getElementById("solicitacoesListaV580");
    const badge=document.getElementById("solicitacoesBadgeV580");
    if(lista)lista.innerHTML="<div class='solicitacoes-vazio'>Carregando solicitações...</div>";

    try{
        const {data,error}=await obterSupabaseClient().rpc("listar_solicitacoes_cadastro_v582",{
            p_status:"pendente"
        });
        if(error)throw error;
        solicitacoesCadastroV580=Array.isArray(data)?data:[];
        if(badge)badge.textContent=solicitacoesCadastroV580.length+" pendente"+(solicitacoesCadastroV580.length===1?"":"s");
        renderizarSolicitacoesCadastroV580();
    }catch(e){
        if(lista)lista.innerHTML="<div class='solicitacoes-vazio'>Erro ao carregar: "+escaparHTML(e?.message||String(e))+"</div>";
    }
}

function renderizarSolicitacoesCadastroV580(){
    const lista=document.getElementById("solicitacoesListaV580");
    if(!lista)return;
    if(!solicitacoesCadastroV580.length){
        lista.innerHTML="<div class='solicitacoes-vazio'>Nenhuma solicitação pendente.</div>";
        return;
    }

    lista.innerHTML=solicitacoesCadastroV580.map(s=>`
        <div class="solicitacao-card">
            <div class="solicitacao-dados">
                <strong>${escaparHTML(s.nome||"Sem nome")}</strong>
                <span>📧 ${escaparHTML(s.email||"-")}</span>
                <span>💼 ${escaparHTML(s.cargo||"Cargo não informado")}</span>
                <span>🕒 Solicitado em ${escaparHTML(formatarSolicitacaoV580(s.criado_em))}</span>
            </div>
            <div class="solicitacao-acoes">
                <button class="btn-aprovar" onclick="aprovarSolicitacaoV580('${escaparHTML(s.user_id)}')">✓ Aprovar</button>
                <button class="btn-negar" onclick="negarSolicitacaoV580('${escaparHTML(s.user_id)}')">✕ Negar</button>
            </div>
        </div>
    `).join("");
}

async function aprovarSolicitacaoV580(userId){
    if(!confirm("Aprovar esta conta e liberar o acesso ao sistema?"))return;

    const supabase=obterSupabaseClient();
    try{
        // Mantém compatibilidade com a RPC já existente.
        const respostaRpc=await supabase.rpc("aprovar_solicitacao_cadastro_v582",{
            p_user_id:userId,
            p_perfil:"consulta"
        });
        if(respostaRpc.error){
            console.warn("RPC de aprovação falhou; aplicando atualização direta.",respostaRpc.error);
        }

        // Correção definitiva: a aprovação precisa alterar os dois campos.
        const {data:perfilAtualizado,error:updateError}=await supabase
            .from("usuarios")
            .update({
                ativo:true,
                status_aprovacao:"aprovado",
                perfil:"consulta"
            })
            .eq("id",userId)
            .select("id,ativo,status_aprovacao,perfil")
            .maybeSingle();

        if(updateError)throw updateError;
        if(!perfilAtualizado){
            throw new Error("O cadastro não foi encontrado na tabela usuarios.");
        }
        if(perfilAtualizado.ativo!==true || String(perfilAtualizado.status_aprovacao||"").toLowerCase()!=="aprovado"){
            throw new Error("A conta não ficou marcada como aprovada no banco.");
        }

        alert("Conta aprovada com sucesso. O usuário já pode entrar no sistema.");
        await carregarSolicitacoesCadastroV580();
        await carregarUsuariosAdmin();
    }catch(e){
        alert("Erro ao aprovar: "+(e?.message||e));
    }
}

async function negarSolicitacaoV580(userId){
    const motivo=prompt("Motivo da negativa (opcional):","")??null;
    if(motivo===null)return;

    const supabase=obterSupabaseClient();
    try{
        // Mantém compatibilidade com a RPC já existente.
        const respostaRpc=await supabase.rpc("negar_solicitacao_cadastro_v582",{
            p_user_id:userId,
            p_motivo:motivo
        });
        if(respostaRpc.error){
            console.warn("RPC de negativa falhou; aplicando atualização direta.",respostaRpc.error);
        }

        const atualizacao={
            ativo:false,
            status_aprovacao:"negado"
        };

        const {data:perfilAtualizado,error:updateError}=await supabase
            .from("usuarios")
            .update(atualizacao)
            .eq("id",userId)
            .select("id,ativo,status_aprovacao")
            .maybeSingle();

        if(updateError)throw updateError;
        if(!perfilAtualizado){
            throw new Error("O cadastro não foi encontrado na tabela usuarios.");
        }

        alert("Solicitação negada.");
        await carregarSolicitacoesCadastroV580();
        await carregarUsuariosAdmin();
    }catch(e){
        alert("Erro ao negar: "+(e?.message||e));
    }
}
