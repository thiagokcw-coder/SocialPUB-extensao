// Ajudantes que rodam DENTRO da página da rede (mundo isolado da extensão).
// Injetado por chrome.scripting.executeScript({files: ['pagina.js']}) antes de
// cada passo; as chamadas seguintes usam `self.SP`.
//
// ── Candidatos ───────────────────────────────────────────────────────────────
// As receitas do app usam seletores do Playwright (`:text-is`, `:has-text`,
// `:visible`), que o navegador NÃO entende. Aqui cada candidato é:
//   - uma string CSS (pode ter `:has(...)`, que o Chrome entende), ou
//   - {css, texto}       → elemento do css cujo texto VISÍVEL é exatamente `texto`
//   - {css, contem}      → … cujo texto visível contém `contem`
//   - {css, filhoTexto}  → … que tem um descendente com texto exatamente esse
// O texto comparado é o `innerText` normalizado: é o que a pessoa vê. Isso evita
// a armadilha do «Criar» (textContent "Novo postCriar", tela só "Criar") e a do
// «Original» (rótulo num <span> dentro do botão — o innerText do botão é o mesmo).
(() => {
  const VERSAO = 3;
  if (self.SP && self.SP.versao === VERSAO) return;

  const INVIS = /[​‌‍﻿⁠]/g;
  const norm = s => String(s || '').replace(INVIS, '').replace(/\s+/g, ' ').trim();
  const pausa = ms => new Promise(r => setTimeout(r, ms));

  function visivel(el) {
    if (!el || !el.isConnected) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function casar(c) {
    if (typeof c === 'string') return Array.from(document.querySelectorAll(c));
    let els = Array.from(document.querySelectorAll(c.css || '*'));
    if (c.texto != null) {
      const alvo = norm(c.texto);
      // textContent primeiro (barato) para não pedir innerText a mil elementos
      els = els.filter(e => (e.textContent || '').includes(alvo.split(' ')[0]) && norm(e.innerText) === alvo);
    }
    if (c.contem != null) {
      const alvo = norm(c.contem);
      els = els.filter(e => (e.textContent || '').includes(alvo) && norm(e.innerText).includes(alvo));
    }
    if (c.filhoTexto != null) {
      const alvo = norm(c.filhoTexto);
      els = els.filter(e => (e.textContent || '').includes(alvo) &&
        Array.from(e.querySelectorAll('*')).some(d => norm(d.innerText) === alvo));
    }
    return els;
  }

  /** O primeiro candidato (em ordem) que tem elemento — visível, se pedido. */
  function achar(cands, exigirVisivel) {
    for (let i = 0; i < cands.length; i++) {
      let els;
      try { els = casar(cands[i]); } catch (e) { continue; }   // seletor que este Chrome não aceita
      if (exigirVisivel) els = els.filter(visivel);
      if (els.length) return { el: els[0], idx: i };
    }
    return null;
  }

  function descrever(c) { return typeof c === 'string' ? c : JSON.stringify(c); }

  /** Espera um candidato aparecer (todos vigiados a cada volta — a ordem só
   * desempata; lição do «Original» que ficou 60s parado no app). */
  async function esperarAchar(cands, prazoMs, exigirVisivel) {
    const fim = Date.now() + Math.max(0, prazoMs);
    for (;;) {
      const a = achar(cands, exigirVisivel);
      if (a || Date.now() >= fim) return a;
      await pausa(250);
    }
  }

  self.SP = {
    versao: VERSAO,
    norm,

    /** Acha, rola até o centro e devolve o ponto para o clique de mouse real. */
    async localizar(cands, prazoMs) {
      const a = await esperarAchar(cands, prazoMs, true);
      if (!a) return { ok: false, erro: 'não achei na tela: ' + cands.map(descrever).join(' | ') };
      a.el.scrollIntoView({ block: 'center', inline: 'center' });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const r = a.el.getBoundingClientRect();
      return { ok: true, idx: a.idx, x: r.left + r.width / 2, y: r.top + r.height / 2,
               texto: norm(a.el.innerText).slice(0, 40) };
    },

    existe(cands) { return !!achar(cands, true); },

    async sumiu(cands, prazoMs) {
      const fim = Date.now() + prazoMs;
      while (Date.now() < fim) {
        if (!achar(cands, true)) return true;
        await pausa(250);
      }
      return false;
    },

    /** Anexa no campo de arquivo — o OCULTO, que é o certo (clique não funciona
     * nele). Por isso aqui não se exige visível. */
    async anexar(b64, nome, tipo, cands, prazoMs) {
      const a = await esperarAchar(cands, prazoMs, false);
      if (!a) return { ok: false, erro: 'o campo de arquivo não apareceu: ' + cands.map(descrever).join(' | ') };
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], nome, { type: tipo }));
      a.el.files = dt.files;
      a.el.dispatchEvent(new Event('input', { bubbles: true }));
      a.el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, idx: a.idx, arquivos: a.el.files.length };
    },

    /** Foca o campo (editor ou input) e põe o cursor no fim. */
    async focar(cands, prazoMs) {
      const a = await esperarAchar(cands, prazoMs, true);
      if (!a) return { ok: false, erro: 'o campo não apareceu: ' + cands.map(descrever).join(' | ') };
      const el = a.el;
      el.scrollIntoView({ block: 'center' });
      el.focus();
      if (el.isContentEditable) {
        const sel = window.getSelection();
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      return { ok: true, idx: a.idx };
    },

    /** Método A (comparação): comando de texto do navegador. */
    escreverTexto(texto) {
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      const linhas = String(texto).split('\n');
      for (let i = 0; i < linhas.length; i++) {
        if (i > 0) document.execCommand('insertParagraph', false, null);
        if (linhas[i]) document.execCommand('insertText', false, linhas[i]);
      }
      return { ok: true };
    },

    valor(cands) {
      const a = achar(cands, false);
      return a ? (a.el.value != null ? a.el.value : a.el.innerText) : null;
    },

    /** O que FICOU: texto do editor, mídia e o botão de publicar — sem clicar. */
    ler(legenda, anexos, publicar) {
      const ed = achar(legenda || [], false);
      const an = achar(anexos || [], false);
      const bt = achar(publicar || [], true);
      return {
        texto: ed ? ed.el.innerText : null,
        midia: an ? an.el.querySelectorAll('img, video').length : 0,
        botao: bt ? { existe: true, habilitado: !(bt.el.disabled || bt.el.getAttribute('aria-disabled') === 'true') }
                  : { existe: false },
        url: location.href,
      };
    },
  };
})();
