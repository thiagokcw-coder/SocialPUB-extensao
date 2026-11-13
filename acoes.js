// Funções que rodam DENTRO da página da rede, via chrome.scripting.executeScript.
//
// ⚠ Cada uma tem de ser AUTOSSUFICIENTE: o Chrome copia só o texto da função
// para dentro da aba, então ela não enxerga nada de fora (nem as outras daqui).
// Por isso há pequenas repetições (achar o elemento, esperar) — são de
// propósito.

/** Anexa o arquivo no campo de upload (o oculto, que é o certo: clique não
 * funciona ali). `b64` é o conteúdo em base64. */
async function spAnexar(b64, nome, tipo, seletores, prazoMs) {
  const fim = Date.now() + prazoMs;
  let input = null, usado = '';
  while (!input && Date.now() < fim) {
    for (const s of seletores) {
      const el = document.querySelector(s);
      if (el) { input = el; usado = s; break; }
    }
    if (!input) await new Promise(r => setTimeout(r, 250));
  }
  if (!input) return { ok: false, erro: 'o campo de arquivo não apareceu: ' + seletores.join(' | ') };
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const dt = new DataTransfer();
  dt.items.add(new File([bytes], nome, { type: tipo }));
  input.files = dt.files;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, seletor: usado, arquivos: input.files.length };
}

/** Acha o editor, foca e põe o cursor no fim. Usado antes do teclado real
 * (método B), que digita onde estiver o foco. */
async function spFocarEditor(seletores, prazoMs) {
  const fim = Date.now() + prazoMs;
  let el = null, usado = '';
  while (!el && Date.now() < fim) {
    for (const s of seletores) {
      const e = document.querySelector(s);
      if (e) { el = e; usado = s; break; }
    }
    if (!el) await new Promise(r => setTimeout(r, 250));
  }
  if (!el) return { ok: false, erro: 'o campo da legenda não apareceu: ' + seletores.join(' | ') };
  el.scrollIntoView({ block: 'center' });
  el.focus();
  const sel = window.getSelection();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  sel.removeAllRanges();
  sel.addRange(r);
  return { ok: true, seletor: usado };
}

/** Método A: escreve pelo comando de texto do próprio navegador
 * (`execCommand('insertText')`). Não é tecla simulada por script — é a mesma
 * via do colar/autocorretor, que editores como Draft.js e Lexical escutam.
 * Se a rede ignorar, a conferência (spLerTexto) mostra. */
async function spEscreverTexto(seletores, texto, prazoMs) {
  const fim = Date.now() + prazoMs;
  let el = null, usado = '';
  while (!el && Date.now() < fim) {
    for (const s of seletores) {
      const e = document.querySelector(s);
      if (e) { el = e; usado = s; break; }
    }
    if (!el) await new Promise(r => setTimeout(r, 250));
  }
  if (!el) return { ok: false, erro: 'o campo da legenda não apareceu: ' + seletores.join(' | ') };
  el.scrollIntoView({ block: 'center' });
  el.focus();
  // Limpa antes SEMPRE (o TikTok pré-preenche com o nome do arquivo).
  document.execCommand('selectAll', false, null);
  document.execCommand('delete', false, null);
  const linhas = String(texto).split('\n');
  const pausa = () => new Promise(r => setTimeout(r, 60));
  for (let i = 0; i < linhas.length; i++) {
    if (i > 0) { document.execCommand('insertParagraph', false, null); await pausa(); }
    if (linhas[i]) { document.execCommand('insertText', false, linhas[i]); await pausa(); }
  }
  return { ok: true, seletor: usado };
}

/** Lê o que FICOU no editor, se a mídia aparece e o estado do botão de
 * publicar — sem clicar em nada. */
function spLerTexto(seletores, anexos, publicar) {
  const achar = lista => { for (const s of lista) { const e = document.querySelector(s); if (e) return e; } return null; };
  const ed = achar(seletores);
  const an = achar(anexos || []);
  const bt = achar(publicar || []);
  return {
    texto: ed ? ed.innerText : null,
    midia: an ? an.querySelectorAll('img, video').length : 0,
    botao: bt ? { existe: true, habilitado: !(bt.disabled || bt.getAttribute('aria-disabled') === 'true') }
              : { existe: false },
    url: location.href,
  };
}
