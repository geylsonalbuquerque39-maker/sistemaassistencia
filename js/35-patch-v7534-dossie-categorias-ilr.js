(function(){
  "use strict";
  function normalizar(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[.\-_/\\]+/g," ").replace(/\s+/g," ").trim()}
  function numeroGrupo(v){const n=Number(String(v??"").trim().replace(",","."));return Number.isFinite(n)?n:null}
  function algum(t,regras){return regras.some(rx=>rx.test(t))}
  const pecas=[/\bPECA\b/,/\bPECAS\b/,/\bPLACA\b/,/\bCOMPRESSOR\b/,/\bMOTOR\b/,/\bRESISTENCIA\b/,/\bMANGUEIRA\b/,/\bCONTROLE\b/,/\bSUPORTE\b/,/\bCABO\b/,/\bKIT\b/,/\bFILTRO\s+REPOS/];
  const linhaBranca=[/\bGELAD/,/\bREFRIG/,/\bFREEZ/,/\bFRIGOBAR/,/\bADEGA/,/\bLAVAD/,/\bLAVA\s*(E\s*)?SECA/,/\bSECAD/,/\bTANQUIN/,/\bCENTRIF/,/\bFOGAO/,/\bCOOKTOP/,/\bFORNO/,/\bMICRO\s*OND/,/\bLAVA\s*LOUC/,/\bCOIFA/,/\bDEPURAD/,/\bEXAUST/,/\bPURIF/,/\bBEBED/,/\bFILTRO\s*(DE\s*)?AGUA/,/\bREFRIGERADOR\s+DE\s+AGUA/,/\bAR\s*COND/,/\bARCOND/,/\bCLIMAT/,/\bDESUMID/,/\bUMIDIFIC/,/\bAQUECED/];
  const ventiladorGrupo2=[/\bVENT\b/,/\bVENTIL\b/,/\bVENTILADOR/];
  const liquidificadorGrupo1=[/\bLIQUID\b/,/\bLIQUIDIF/,/\bLIQUIDIFICADOR/];
  const outrosEletro=[/\bAIR\s*FRY/,/\bFRITADEIRA/,/\bBATEDEIRA/,/\bCAFETEIRA/,/\bCHALEIRA/,/\bFERRO\b/,/\bASPIRADOR/,/\bGRILL\b/,/\bSANDUICHEIRA/,/\bMIXER\b/,/\bPROCESSADOR/,/\bMULTIPROCESS/,/\bPANELA\s*ELETR/,/\bESPREMEDOR/];
  const linhaMarrom=[/\bSMART\s*TV\b/,/\bTV\b/,/\bTELEVIS/,/\bHOME\s*THEATER/,/\bSOUNDBAR/,/\bRECEIVER/,/\bPROJETOR/,/\bBLU\s*RAY/,/\bDVD\b/];
  const informatica=[/\bNOTEBOOK/,/\bLAPTOP/,/\bDESKTOP/,/\bCOMPUTADOR/,/\bIMPRESSORA/,/\bMULTIFUNCIONAL/,/\bSCANNER/,/\bMONITOR\b/];
  const telefonia=[/\bSMARTPHONE/,/\bCELULAR/,/\bTABLET/,/\bTELEFONE/];
  window.classificarCategoriaProduto=function(descricao,grupo){
    if(descricao&&typeof descricao==="object"){
      const r=descricao; grupo=r.grupo??r.gr; descricao=r.desc_produto??r.produto??r.descricao??"";
    }
    const t=normalizar(descricao),gr=numeroGrupo(grupo); if(!t)return "Não classificado"; const p=algum(t,pecas);
    if(gr===2&&!p&&algum(t,ventiladorGrupo2))return "Eletroportáteis";
    if(gr===1&&!p&&algum(t,liquidificadorGrupo1))return "Eletroportáteis";
    if(gr===2&&!p&&algum(t,linhaBranca))return "Linha Branca";
    if(!p&&algum(t,outrosEletro))return "Eletroportáteis";
    if(algum(t,linhaMarrom))return "Linha Marrom";
    if(algum(t,informatica))return "Informática";
    if(algum(t,telefonia))return "Telefonia";
    return "Não classificado";
  };
  window.clienteExibicaoPorOrigem=(origem,nome)=>String(origem??"").toLowerCase()==="clientes"?(String(nome??"").trim()||"Não identificado"):"Claudino";
  window.rotuloOrigemERP=origem=>{const o=String(origem??"").toLowerCase();return o==="clientes"?"CLIENTES":o==="cpp"?"CPP":"ILR"};
  function aplicarRotulos(root=document.body){
    if(!root)return;
    root.querySelectorAll('option').forEach(op=>{if(/ERP\s+principal/i.test(op.textContent||""))op.textContent=(op.textContent||"").replace(/ERP\s+principal/gi,"ILR")});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>aplicarRotulos(),{once:true});else aplicarRotulos();
  console.info('V7.5.34: dossiê detalhado restaurado; ILR, Claudino e categorias consolidados.');
})();
