(function(){
'use strict';
const V='7.5.27';
const SEL_INPUT=[
  'input[id*="os" i]','input[name*="os" i]','input[placeholder*="o.s" i]',
  'input[placeholder*="ordem de serviço" i]','input[data-os]','textarea[data-os]'
].join(',');

function txt(v){return String(v??'').trim()}
function normOS(v){
  const s=txt(v).toUpperCase().replace(/^ILR\s*/,'').replace(/\.0$/,'').replace(/[^0-9]/g,'');
  return s.length>=4?s:'';
}
function origemDo(el){
  const contexto=el?.closest?.('[data-menu],section,[id],[class]');
  const marca=((contexto?.dataset?.menu||'')+' '+(contexto?.id||'')+' '+(contexto?.className||'')).toLowerCase();
  if(/cliente/.test(marca))return 'clientes';
  if(/cpp/.test(marca))return 'cpp';
  const ativo=document.querySelector('.menu.active,[data-menu].active');
  const a=((ativo?.dataset?.menu||'')+' '+(ativo?.id||'')+' '+(ativo?.textContent||'')).toLowerCase();
  if(/cliente/.test(a))return 'clientes';
  if(/cpp/.test(a))return 'cpp';
  return 'principal';
}
function abrir(os,el){
  const numero=normOS(os);
  if(!numero)return;
  if(typeof window.abrirMidiasOS!=='function'){
    alert('O módulo de mídias ainda não terminou de carregar. Tente novamente em alguns segundos.');
    return;
  }
  window.abrirMidiasOS(numero,origemDo(el));
}
function criarBotao(os,referencia){
  const b=document.createElement('button');
  b.type='button';b.className='midias-os-atalho-v7527';b.textContent='📎';
  b.dataset.os=normOS(os);b.dataset.semOs=b.dataset.os?'0':'1';
  b.title=b.dataset.os?'Abrir fotos e anexos da O.S. '+b.dataset.os:'Digite uma O.S. para abrir as mídias';
  b.setAttribute('aria-label',b.title);
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();abrir(b.dataset.os,referencia||b)});
  return b;
}
function atualizarBotao(b,valor){
  const os=normOS(valor);b.dataset.os=os;b.dataset.semOs=os?'0':'1';
  b.title=os?'Abrir fotos e anexos da O.S. '+os:'Digite uma O.S. para abrir as mídias';
  b.setAttribute('aria-label',b.title);
}
function extrairOSRotulado(texto){
  const t=txt(texto).replace(/\s+/g,' ');
  const m=t.match(/(?:^|\b)(?:O\.?\s*S\.?|O,S|ORDEM\s+DE\s+SERVI[CÇ]O)\s*[:#\-]?\s*(?:ILR\s*)?(\d{4,})(?:\b|$)/i);
  return m?normOS(m[1]):'';
}
function indiceOS(t){
  return [...t.querySelectorAll('thead th')].findIndex(h=>/^(O\.?\s*S\.?|O,S|OS|ORDEM DE SERVI[CÇ]O)$/i.test(txt(h.textContent).replace(/\s+/g,' ')));
}
function decorarTabelas(raiz=document){
  raiz.querySelectorAll?.('table').forEach(t=>{
    if(t.closest('#fotosos-modal'))return;
    const idx=indiceOS(t);if(idx<0)return;
    t.querySelectorAll('tbody tr').forEach(tr=>{
      const td=tr.children[idx];if(!td)return;
      const existente=td.querySelector(':scope > .midias-os-atalho-v7527');
      const clone=td.cloneNode(true);clone.querySelectorAll('.midias-os-atalho-v7527,.fotosos-mini-btn').forEach(x=>x.remove());
      const os=normOS(clone.textContent);
      if(!os)return;
      if(existente){atualizarBotao(existente,os);return}
      td.appendChild(criarBotao(os,td));
    });
  });
}
function decorarInputs(raiz=document){
  raiz.querySelectorAll?.(SEL_INPUT).forEach(inp=>{
    if(inp.closest('#fotosos-modal')||inp.dataset.midiasOsDecorado==='1')return;
    // Evita campos que apenas contêm as letras "os" em palavras não relacionadas.
    const assinatura=((inp.id||'')+' '+(inp.name||'')+' '+(inp.placeholder||'')+' '+(inp.getAttribute('aria-label')||'')).toLowerCase();
    if(!/(^|[_\-\s])(os|o\.s)([_\-\s]|$)|ordem de servi[cç]o/.test(assinatura)&&!inp.hasAttribute('data-os'))return;
    inp.dataset.midiasOsDecorado='1';
    const b=criarBotao(inp.value,inp);b.classList.add('midias-os-input-v7527');
    inp.insertAdjacentElement('afterend',b);
    const sync=()=>atualizarBotao(b,inp.value);
    inp.addEventListener('input',sync);inp.addEventListener('change',sync);inp.addEventListener('blur',sync);
  });
}
function decorarDataOS(raiz=document){
  raiz.querySelectorAll?.('[data-os],[data-numero-os],[data-ordem-servico]').forEach(el=>{
    if(el.closest('#fotosos-modal')||el.matches('input,textarea')||el.dataset.midiasOsDecorado==='1')return;
    const os=normOS(el.dataset.os||el.dataset.numeroOs||el.dataset.ordemServico||el.textContent);
    if(!os)return;el.dataset.midiasOsDecorado='1';el.appendChild(criarBotao(os,el));
  });
}
function decorarTextosRotulados(raiz=document){
  const seletor='span,p,li,dd,strong,b,label,.valor,.value,.info,.detalhe,.detail,.campo,.card-title,.card-text';
  raiz.querySelectorAll?.(seletor).forEach(el=>{
    if(el.closest('#fotosos-modal,table')||el.dataset.midiasOsDecorado==='1'||el.children.length>5)return;
    const texto=txt(el.textContent);if(!texto||texto.length>180)return;
    const os=extrairOSRotulado(texto);if(!os)return;
    el.dataset.midiasOsDecorado='1';el.appendChild(criarBotao(os,el));
  });
}
function decorarTudo(raiz=document){
  decorarTabelas(raiz);decorarInputs(raiz);decorarDataOS(raiz);decorarTextosRotulados(raiz);
}
let pendente=false;
function agendar(){if(pendente)return;pendente=true;requestAnimationFrame(()=>{pendente=false;decorarTudo(document)})}
function iniciar(){
  decorarTudo(document);
  new MutationObserver(muts=>{
    // Revarre também tabelas já existentes quando novas linhas são renderizadas.
    if(muts.some(m=>m.addedNodes.length||m.type==='characterData'))agendar();
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
  document.addEventListener('change',e=>{if(e.target?.matches?.(SEL_INPUT))agendar()},true);
  console.info('Atalhos globais de mídias O.S. v'+V+' carregados.');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
