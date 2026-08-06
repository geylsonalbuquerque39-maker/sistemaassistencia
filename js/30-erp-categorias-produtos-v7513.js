/* V7.5.15 - Motor de categorias; Linha Branca somente no grupo 2 */
(function(){
  function normCategoria(v){
    return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
      .replace(/[.\-_/\\]+/g,' ').replace(/\s+/g,' ').trim();
  }
  const exclusoesPecas=[/\bPECA\b/,/\bPECAS\b/,/\bPLACA\b/,/\bCOMPRESSOR\b/,/\bMOTOR\b/,/\bRESISTENCIA\b/,/\bMANGUEIRA\b/,/\bCONTROLE\b/,/\bSUPORTE\b/,/\bCABO\b/,/\bKIT\b/,/\bFILTRO\s+REPOS/];
  const regras={
    'Linha Branca':[
      /\bGELAD/,/\bREFRIG/,/\bFREEZ/,/\bFRIGOBAR/,/\bADEGA/,
      /\bLAVAD/,/\bLAVA\s*(E\s*)?SECA/,/\bSECAD/,/\bTANQUIN/,/\bCENTRIF/,
      /\bFOGAO/,/\bCOOKTOP/,/\bFORNO/,/\bMICRO\s*OND/,/\bLAVA\s*LOUC/,/\bCOIFA/,/\bDEPURAD/,/\bEXAUST/,
      /\bPURIF/,/\bBEBED/,/\bFILTRO\s*(DE\s*)?AGUA/,/\bREFRIGERADOR\s+DE\s+AGUA/,
      /\bAR\s*COND/,/\bARCOND/,/\bCLIMAT/,/\bDESUMID/,/\bUMIDIFIC/,/\bAQUECED/
    ],
    'Linha Marrom':[/\bSMART\s*TV\b/,/\bTV\b/,/\bTELEVIS/,/\bHOME\s*THEATER/,/\bSOUNDBAR/,/\bRECEIVER/,/\bPROJETOR/,/\bBLU\s*RAY/,/\bDVD\b/],
    'Eletroportáteis':[/\bAIR\s*FRY/,/\bFRITADEIRA/,/\bLIQUIDIFIC/,/\bBATEDEIRA/,/\bCAFETEIRA/,/\bCHALEIRA/,/\bFERRO\b/,/\bASPIRADOR/,/\bGRILL\b/,/\bSANDUICHEIRA/,/\bMIXER\b/,/\bPROCESSADOR/,/\bMULTIPROCESS/,/\bPANELA\s*ELETR/,/\bESPREMEDOR/],
    'Informática':[/\bNOTEBOOK/,/\bLAPTOP/,/\bDESKTOP/,/\bCOMPUTADOR/,/\bIMPRESSORA/,/\bMULTIFUNCIONAL/,/\bSCANNER/,/\bMONITOR\b/],
    'Telefonia':[/\bSMARTPHONE/,/\bCELULAR/,/\bTABLET/,/\bTELEFONE/]
  };
  window.normalizarDescricaoCategoria=normCategoria;
  window.classificarCategoriaProduto=function(descricao,grupo){
    const texto=normCategoria(descricao);
    if(!texto) return 'Não classificado';

    // Regra operacional: Linha Branca existe somente no GRUPO 2.
    // Aceita variações vindas de planilha/banco, como 2, 02 e 2.0.
    const grupoNormalizado=String(grupo??'').trim().replace(',', '.');
    const numeroGrupo=Number(grupoNormalizado);
    const ehGrupo2=Number.isFinite(numeroGrupo) && numeroGrupo===2;
    const parecePeca=exclusoesPecas.some(rx=>rx.test(texto));

    if(ehGrupo2 && !parecePeca && regras['Linha Branca'].some(rx=>rx.test(texto))){
      return 'Linha Branca';
    }

    // Fora do grupo 2, nunca classifica como Linha Branca.
    for(const categoria of ['Linha Marrom','Eletroportáteis','Informática','Telefonia']){
      if(regras[categoria].some(rx=>rx.test(texto))) return categoria;
    }
    return 'Não classificado';
  };
  window.CATEGORIAS_PRODUTOS_ERP=Object.keys(regras).concat('Não classificado');
})();
