(function(){
    "use strict";

    let botaoExportacaoAtualV720=null;
    let ignorarInterceptacaoV720=false;
    const blobsCapturadosV720=new Map();

    const criarURLOriginalV720=URL.createObjectURL.bind(URL);
    const revogarURLOriginalV720=URL.revokeObjectURL.bind(URL);

    URL.createObjectURL=function(blob){
        const url=criarURLOriginalV720(blob);
        try{blobsCapturadosV720.set(url,blob)}catch(_){}
        return url;
    };

    URL.revokeObjectURL=function(url){
        setTimeout(()=>blobsCapturadosV720.delete(url),1500);
        return revogarURLOriginalV720(url);
    };

    function ehBotaoExportacaoV720(el){
        if(!el)return null;
        const botao=el.closest("button,a");
        if(!botao)return null;

        const texto=String(botao.textContent||"").toUpperCase();
        const onclick=String(botao.getAttribute("onclick")||"").toUpperCase();

        const ehExportacao=
            texto.includes("EXPORTAR") ||
            onclick.includes("EXPORTAR") ||
            onclick.includes("CSV");

        return ehExportacao ? botao : null;
    }

    function abrirMenuV720(botao,event){
        botaoExportacaoAtualV720=botao;
        const menu=document.getElementById("exportacaoOfficeMenuV720");
        if(!menu)return;

        const largura=285;
        const altura=235;
        const x=Math.min(event.clientX||20,window.innerWidth-largura-10);
        const y=Math.min(event.clientY||20,window.innerHeight-altura-10);

        menu.style.left=Math.max(8,x)+"px";
        menu.style.top=Math.max(8,y)+"px";
        menu.classList.add("aberto");
    }

    function fecharMenuV720(){
        document.getElementById("exportacaoOfficeMenuV720")?.classList.remove("aberto");
    }

    function executarHandlerOriginalV720(botao){
        if(!botao)return;

        ignorarInterceptacaoV720=true;
        try{
            if(typeof botao.onclick==="function"){
                botao.onclick.call(botao,new MouseEvent("click",{bubbles:false,cancelable:true}));
            }else{
                const codigo=botao.getAttribute("onclick");
                if(codigo)new Function("event",codigo).call(botao,new MouseEvent("click"));
            }
        }finally{
            ignorarInterceptacaoV720=false;
        }
    }

    async function capturarExportacaoOriginalV720(botao){
        let blobCapturado=null;
        let nomeCapturado="planilha.csv";

        const cliqueOriginal=HTMLAnchorElement.prototype.click;

        HTMLAnchorElement.prototype.click=function(){
            const href=this.href||this.getAttribute("href")||"";
            const blob=blobsCapturadosV720.get(href);
            if(blob){
                blobCapturado=blob;
                nomeCapturado=this.download||nomeCapturado;
                return;
            }
            return cliqueOriginal.apply(this,arguments);
        };

        try{
            executarHandlerOriginalV720(botao);
            await new Promise(resolve=>setTimeout(resolve,50));
        }finally{
            HTMLAnchorElement.prototype.click=cliqueOriginal;
        }

        if(!blobCapturado){
            throw new Error("Não foi possível capturar os dados desta exportação.");
        }

        return {
            blob:blobCapturado,
            nome:nomeCapturado,
            texto:await blobCapturado.text()
        };
    }

    function detectarSeparadorV720(texto){
        const primeira=String(texto||"").replace(/^\uFEFF/,"").split(/\r?\n/)[0]||"";
        let pontoVirgula=0,virgula=0,tab=0,aspas=false;

        for(let i=0;i<primeira.length;i++){
            const c=primeira[i];
            if(c==='"'){
                if(aspas&&primeira[i+1]==='"')i++;
                else aspas=!aspas;
            }else if(!aspas){
                if(c===';')pontoVirgula++;
                else if(c===',')virgula++;
                else if(c==='\t')tab++;
            }
        }

        if(tab>=pontoVirgula&&tab>=virgula)return "\t";
        return pontoVirgula>=virgula?";":",";
    }

    function analisarCSVV720(texto){
        texto=String(texto||"").replace(/^\uFEFF/,"");
        const sep=detectarSeparadorV720(texto);
        const linhas=[];
        let linha=[],campo="",aspas=false;

        for(let i=0;i<texto.length;i++){
            const c=texto[i];

            if(aspas){
                if(c==='"'){
                    if(texto[i+1]==='"'){
                        campo+='"';
                        i++;
                    }else{
                        aspas=false;
                    }
                }else{
                    campo+=c;
                }
                continue;
            }

            if(c==='"'){
                aspas=true;
            }else if(c===sep){
                linha.push(campo);
                campo="";
            }else if(c==="\n"){
                linha.push(campo.replace(/\r$/,""));
                linhas.push(linha);
                linha=[];
                campo="";
            }else{
                campo+=c;
            }
        }

        if(campo!==""||linha.length){
            linha.push(campo.replace(/\r$/,""));
            linhas.push(linha);
        }

        while(linhas.length&&linhas[linhas.length-1].every(v=>String(v).trim()==="")){
            linhas.pop();
        }

        return linhas;
    }

    function xmlEscV720(v){
        return String(v??"")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;")
            .replace(/'/g,"&apos;");
    }

    function nomePlanilhaV720(nome){
        return String(nome||"Planilha")
            .replace(/\.(csv|xls|xlt|xlsx)$/i,"")
            .replace(/[\\\/:*?\[\]]/g," ")
            .trim()
            .slice(0,31)||"Planilha";
    }

    function tipoCelulaV720(valor){
        const s=String(valor??"").trim();

        // Mantém O.S., códigos e valores com zeros à esquerda como texto.
        if(/^0\d+$/.test(s))return {tipo:"String",valor:s};

        const normal=s.replace(/\./g,"").replace(",",".");
        if(/^-?\d+(?:[.,]\d+)?$/.test(s)&&Number.isFinite(Number(normal))){
            return {tipo:"Number",valor:normal};
        }

        return {tipo:"String",valor:s};
    }

    function criarSpreadsheetMLV720(linhas,nomeArquivo){
        const colunas=Math.max(1,...linhas.map(l=>l.length));
        const larguras=[];

        for(let c=0;c<colunas;c++){
            let maior=10;
            for(let r=0;r<Math.min(linhas.length,300);r++){
                maior=Math.max(maior,String(linhas[r]?.[c]??"").length);
            }
            larguras[c]=Math.min(320,Math.max(65,maior*7.2));
        }

        const xmlLinhas=linhas.map((linha,indice)=>{
            const celulas=[];
            for(let c=0;c<colunas;c++){
                const dado=tipoCelulaV720(linha[c]??"");
                celulas.push(
                    '<Cell ss:StyleID="'+(indice===0?"Cabecalho":"Dados")+'">'+
                    '<Data ss:Type="'+dado.tipo+'">'+xmlEscV720(dado.valor)+'</Data>'+
                    '</Cell>'
                );
            }
            return "<Row>"+celulas.join("")+"</Row>";
        }).join("");

        const xmlColunas=larguras.map(w=>'<Column ss:AutoFitWidth="0" ss:Width="'+w.toFixed(0)+'"/>').join("");

        return '<?xml version="1.0"?>'+
        '<?mso-application progid="Excel.Sheet"?>'+
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" '+
        'xmlns:o="urn:schemas-microsoft-com:office:office" '+
        'xmlns:x="urn:schemas-microsoft-com:office:excel" '+
        'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" '+
        'xmlns:html="http://www.w3.org/TR/REC-html40">'+
        '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">'+
        '<Author>ERP Assistência Técnica</Author>'+
        '<Created>'+new Date().toISOString()+'</Created>'+
        '</DocumentProperties>'+
        '<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">'+
        '<ProtectStructure>False</ProtectStructure>'+
        '<ProtectWindows>False</ProtectWindows>'+
        '</ExcelWorkbook>'+
        '<Styles>'+
        '<Style ss:ID="Default" ss:Name="Normal">'+
        '<Alignment ss:Vertical="Bottom"/>'+
        '<Borders/><Font ss:FontName="Arial" x:Family="Swiss" ss:Size="10"/>'+
        '<Interior/><NumberFormat/><Protection/>'+
        '</Style>'+
        '<Style ss:ID="Cabecalho">'+
        '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'+
        '<Borders>'+
        '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'+
        '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'+
        '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'+
        '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>'+
        '</Borders>'+
        '<Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>'+
        '<Interior ss:Color="#073A78" ss:Pattern="Solid"/>'+
        '</Style>'+
        '<Style ss:ID="Dados">'+
        '<Alignment ss:Vertical="Center" ss:WrapText="1"/>'+
        '<Borders>'+
        '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>'+
        '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>'+
        '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>'+
        '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>'+
        '</Borders>'+
        '</Style>'+
        '</Styles>'+
        '<Worksheet ss:Name="'+xmlEscV720(nomePlanilhaV720(nomeArquivo))+'">'+
        '<Table ss:ExpandedColumnCount="'+colunas+'" ss:ExpandedRowCount="'+linhas.length+'" x:FullColumns="1" x:FullRows="1">'+
        xmlColunas+xmlLinhas+
        '</Table>'+
        '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">'+
        '<FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane>'+
        '<Selected/><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios>'+
        '</WorksheetOptions>'+
        '</Worksheet>'+
        '</Workbook>';
    }

    function baixarOfficeV720(texto,nomeOriginal,extensao){
        const linhas=analisarCSVV720(texto);
        if(!linhas.length)throw new Error("A exportação não possui dados.");

        const xml=criarSpreadsheetMLV720(linhas,nomeOriginal);
        const blob=new Blob(["\uFEFF"+xml],{
            type:"application/vnd.ms-excel;charset=utf-8"
        });

        const nomeBase=String(nomeOriginal||"planilha.csv")
            .replace(/\.(csv|xls|xlt|xlsx)$/i,"");

        const a=document.createElement("a");
        const url=criarURLOriginalV720(blob);
        a.href=url;
        a.download=nomeBase+"."+extensao;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=>revogarURLOriginalV720(url),1500);
    }

    window.definirBotaoExportacaoV720=function(botao){
        botaoExportacaoAtualV720=botao;
    };

    window.exportacaoOfficeExecutarV720=async function(formato){
        const botao=botaoExportacaoAtualV720;
        fecharMenuV720();
        if(!botao)return;

        try{
            if(formato==="csv"){
                executarHandlerOriginalV720(botao);
                return;
            }

            const dados=await capturarExportacaoOriginalV720(botao);
            baixarOfficeV720(dados.texto,dados.nome,formato);
        }catch(e){
            console.error("Exportação Office V7.2.3:",e);
            alert("Não foi possível gerar o arquivo: "+(e?.message||e));
        }
    };

    document.addEventListener("click",function(event){
        if(ignorarInterceptacaoV720)return;

        const botao=ehBotaoExportacaoV720(event.target);
        if(!botao){
            if(!event.target.closest("#exportacaoOfficeMenuV720"))fecharMenuV720();
            return;
        }

        // Não intercepta os próprios botões do menu.
        if(botao.closest("#exportacaoOfficeMenuV720"))return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        abrirMenuV720(botao,event);
    },true);

    document.addEventListener("keydown",function(event){
        if(event.key==="Escape")fecharMenuV720();
    });
})();
