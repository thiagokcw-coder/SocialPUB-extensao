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
  const VERSAO = 9;
  if (self.SP && self.SP.versao === VERSAO) return;

  const INVIS = /[​‌‍﻿⁠]/g;
  const norm = s => String(s || '').replace(INVIS, '').replace(/\s+/g, ' ').trim();
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  let facebookFluxo = null;

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

    onde() { return location.origin + location.pathname; },

    async campoArquivo(cands, prazoMs) {
      const a = await esperarAchar(cands, prazoMs, false);
      return a ? { ok: true, idx: a.idx } : { ok: false, erro: 'o campo de arquivo não apareceu' };
    },

    arquivoInfo(cands) {
      const a = achar(cands, false);
      const f = a && a.el.files && a.el.files[0];
      return f ? { nome: f.name, tamanho: f.size, tipo: f.type } : null;
    },

    /** Lê o progresso SÓ dentro do anexo. `anexo`: o anexo está na tela;
     * `pronto`: apareceu «Ready/Pronto/Concluído» (ex.: «video.mp4: Ready»). */
    progressoUpload(cands) {
      const a = achar(cands, true);
      if (!a) return { percentual: null, texto: '', anexo: false, pronto: false };
      const els = [a.el, ...a.el.querySelectorAll('[role="progressbar"], [aria-label], span, div')];
      let pronto = null;
      for (const el of els) {
        if (!visivel(el) || el.closest('[contenteditable="true"]')) continue;
        const aria = el.getAttribute('aria-label') || '';
        const texto = norm(el.innerText);
        for (const s of [aria, texto.length < 180 ? texto : '']) {
          const m = s.match(/(?:Uploading|Enviando|A carregar|Carregando)\s*\(?\s*(\d{1,3})\s*%\)?/i);
          if (m && Number(m[1]) <= 100) return { percentual: Number(m[1]), texto: m[0], anexo: true, pronto: false };
          if (!pronto && s.length < 180 && /(?:^|[\s:])(?:Ready|Pronto|Concluído)\.?$/i.test(s)) pronto = s;
        }
        if (el.getAttribute('role') === 'progressbar' && el.hasAttribute('aria-valuenow')) {
          const n = Number(el.getAttribute('aria-valuenow'));
          const max = Number(el.getAttribute('aria-valuemax') || 100);
          if (max > 0 && n >= 0 && n <= max) return { percentual: Math.round(n * 100 / max), texto: `Uploading (${Math.round(n * 100 / max)}%)`, anexo: true, pronto: false };
        }
      }
      return { percentual: null, texto: pronto || '', anexo: true, pronto: !!pronto };
    },

    /** Autor do compositor: rótulo explícito, pergunta do editor ou cabeçalho
     * antes dele. Nunca usa a legenda, o feed ou outro diálogo como prova. */
    facebookComo(nome) {
      const nomes = [];
      const ui = /^(?:Público|Public|Amigos|Friends|Somente eu|Only me|Personalizado|Custom|Rótulo de IA (?:desativado|ativado)|AI label (?:off|on))$/i;
      const registrar = s => { const n = norm(s); if (n && !ui.test(n)) nomes.push(n); };
      const prefixo = /^(?:Posting as|Publicar como|Publicando como|A publicar como)\s*:?\s+(.+)$/i;
      const pergunta = /^(?:No que você está pensando|What['’]s on your mind|Em que estás a pensar),\s*(.+?)\s*\?$/i;
      const editorSel = '[contenteditable="true"], [role="textbox"], textarea';
      const controles = '[role="menu"], [role="listbox"], [role="option"], h1, h2, h3, [role="heading"]';
      for (const dialogo of document.querySelectorAll('[role="dialog"]')) {
        if (!visivel(dialogo)) continue;
        const editores = Array.from(dialogo.querySelectorAll(editorSel))
          .filter(el => visivel(el) && el.closest('[role="dialog"]') === dialogo);
        if (!editores.length) continue;
        for (const editor of editores) {
          for (const attr of ['placeholder', 'aria-label', 'data-placeholder']) {
            const m = norm(editor.getAttribute(attr)).match(pergunta);
            if (m) registrar(m[1]);
          }
        }
        const editor = editores[0];
        for (const el of dialogo.querySelectorAll('[aria-label], span, strong, a, [role="link"], img')) {
          if (el.closest('[role="dialog"]') !== dialogo
              || el.closest(editorSel) || el.querySelector(editorSel)) continue;
          // Ícones de audiência podem ser <img>. Ter uma imagem no botão
          // não transforma todo o texto desse controle em nome de autor.
          const botoes = [];
          for (let p = el; p && p !== dialogo; p = p.parentElement) {
            if (p.matches('button, [role="button"], [role="combobox"]')) botoes.push(p);
          }
          if (botoes.some(b => b.matches('[role="combobox"]') || /(?:Editar privacidade|Edit privacy|Selecionar público|Select audience|Público do post|Post audience|Rótulo de IA|AI label)/i.test(b.getAttribute('aria-label') || ''))) continue;
          if (botoes.length && !el.matches('img')) continue;
          if (!visivel(el)) continue;
          for (const s of [el.getAttribute('aria-label'), el.innerText]) {
            const m = norm(s).match(prefixo);
            if (m) registrar(m[1]);
          }
          // O cabeçalho do autor precede o editor. Rótulos da audiência e
          // títulos/botões não são nomes; os anexos depois do editor também não.
          if (!(el.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING)
              || el.closest(controles)) continue;
          if (el.matches('img')) {
            for (const attr of ['aria-label', 'alt']) {
              const s = norm(el.getAttribute(attr));
              if (!/^(?:profile picture|profile photo|foto d[oe] perfil|imagem d[oe] perfil)$/i.test(s)) registrar(s);
            }
          } else if (el.matches('span, strong, a, [role="link"]')
              && !el.querySelector('span, strong, a, [role="link"], img')
              && !prefixo.test(norm(el.innerText))) {
            registrar(el.innerText);
          }
        }
      }
      const unicos = [...new Set(nomes.map(n => n.toLocaleLowerCase()))];
      return { ok: unicos.length === 1 && unicos[0] === norm(nome).toLocaleLowerCase(), nomes: [...new Set(nomes)] };
    },

    // A identidade só acompanha transições no MESMO diálogo e endereço.
    // Fechar/reabrir, navegar ou encontrar outro autor invalida a prova.
    facebookIniciar(nome) {
      facebookFluxo = null;
      const autor = this.facebookComo(nome);
      const editor = Array.from(document.querySelectorAll('[role="dialog"] [contenteditable="true"], [role="dialog"] [role="textbox"], [role="dialog"] textarea')).find(visivel);
      if (!autor.ok || !editor) return false;
      let dialogo = editor.closest('[role="dialog"]');
      while (dialogo.parentElement?.closest('[role="dialog"]')) dialogo = dialogo.parentElement.closest('[role="dialog"]');
      facebookFluxo = { dialogo, nome: norm(nome).toLocaleLowerCase(), url: location.href };
      return true;
    },

    facebookEstado(nome) {
      const f = facebookFluxo;
      const autor = this.facebookComo(nome);
      if (!f || f.nome !== norm(nome).toLocaleLowerCase() || f.url !== location.href || !visivel(f.dialogo)
          || (autor.nomes.length && !autor.ok)) {
        facebookFluxo = null;
        return { ok: false, nomes: autor.nomes };
      }
      const d = f.dialogo;
      const titulos = Array.from(d.querySelectorAll('h1,h2,h3,[role="heading"]')).filter(visivel).map(e => norm(e.innerText));
      const tem = lista => titulos.some(t => lista.includes(t));
      const etapa = tem(['Configurações do reel', 'Reel settings', 'Definições do reel']) ? 'final_reel'
        : tem(['Configurações do post', 'Post settings', 'Definições da publicação']) ? 'final_post'
        : tem(['Editar reel', 'Edit reel']) ? 'editar_reel'
        : tem(['Criar post', 'Create post', 'Criar publicação']) ? 'criar' : null;
      const ed = Array.from(d.querySelectorAll('[contenteditable="true"], [role="textbox"], textarea')).find(visivel);
      const videos = Array.from(d.querySelectorAll('video')).filter(visivel);
      // Imagens de prévia, nunca o avatar do cabeçalho. Em Criar post exigimos
      // também o controle de remoção; nas configurações não há cabeçalho autor.
      const remover = Array.from(d.querySelectorAll('[aria-label]')).some(e => visivel(e) && /^(Remover anexo do post|Remove attachment|Remove post attachment)$/i.test(e.getAttribute('aria-label')));
      const imagens = Array.from(d.querySelectorAll('img')).filter(e => visivel(e) && e.naturalWidth > 80 && e.naturalHeight > 80
        && (etapa === 'final_post' || (remover && ed && (ed.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING))));
      return { ok: !!etapa && (etapa !== 'criar' || autor.ok), etapa, nomes: autor.nomes,
        texto: ed ? (ed.value ?? ed.innerText) : (etapa === 'final_post' ? d.innerText : ''),
        videos: videos.length, anexos: videos.length + imagens.length > 0, midia: videos.length + imagens.length };
    },

    facebookBanner() {
      // Só texto visível fora de posts e campos editáveis. Não retorna o
      // conteúdo inteiro do main/body nem confunde uma legenda com o aviso.
      const prefixo = /^(?:Troque para a Página(?: de)?\s|Switch into\s)/i;
      const candidatos = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3'))
        .filter(e => visivel(e) && !e.closest('[role="article"], article, [contenteditable="true"], [role="textbox"]')
          && prefixo.test(norm(e.innerText)));
      return [...new Set(candidatos.filter(e => !candidatos.some(f => f !== e && e.contains(f)))
        .map(e => norm(e.innerText).slice(0, 400)))];
    },

    /** O MEDIDOR da extensão: o que está na tela quando uma etapa falha.
     * Endereço, idioma, tamanho da janela, se parece login, os diálogos abertos
     * e os clicáveis visíveis com texto e nomes (aria-label, inclusive dos
     * ícones). NUNCA lê valor de campo, cookie nem armazenamento — o
     * diagnóstico é copiado e enviado adiante. */
    medir() {
      const sel = 'a, button, [role="button"], [role="link"], [role="menuitem"], [role="tab"]';
      // O que está DENTRO de diálogo vem primeiro: é a tela do fluxo. O feed
      // atrás enchia o diagnóstico de 13/11 com stories e botões de curtir.
      const todos = Array.from(document.querySelectorAll(sel)).filter(visivel);
      const noDialogo = todos.filter(e => e.closest('[role="dialog"]'));
      const ordem = noDialogo.concat(todos.filter(e => !e.closest('[role="dialog"]')));
      const campos = Array.from(document.querySelectorAll('[role="dialog"] input, [role="dialog"] [contenteditable="true"], [role="dialog"] textarea'))
        .map(e => ({ tag: e.tagName.toLowerCase(), tipo: e.type || '', name: e.name || '', placeholder: (e.placeholder || '').slice(0, 60),
                     aria: (e.getAttribute('aria-label') || '').slice(0, 60), visivel: visivel(e) }));
      const clicaveis = ordem.slice(0, 80).map(e => ({
        no_dialogo: !!e.closest('[role="dialog"]'),
        tag: e.tagName.toLowerCase(),
        papel: e.getAttribute('role') || '',
        texto: norm(e.innerText).slice(0, 60),
        aria: (e.getAttribute('aria-label') || '').slice(0, 60),
        icones: Array.from(e.querySelectorAll('svg[aria-label]')).map(s => s.getAttribute('aria-label')).slice(0, 3),
      }));
      const dialogos = Array.from(document.querySelectorAll('[role="dialog"]')).filter(visivel)
        .map(d => d.getAttribute('aria-label') || norm(d.innerText).slice(0, 60));
      return {
        url: location.origin + location.pathname,
        titulo: document.title.slice(0, 80),
        idioma: document.documentElement.lang || navigator.language,
        janela: innerWidth + 'x' + innerHeight,
        parece_login: /\/(accounts\/login|login|signin|challenge|checkpoint|suspended)/i.test(location.pathname)
          || !!document.querySelector('input[type="password"]'),
        dialogos,
        facebook_banner_troca: this.facebookBanner(),
        // campos dos diálogos: tipo, name, placeholder e nome — NUNCA o valor
        campos_do_dialogo: campos,
        clicaveis,
      };
    },

    /** O botão de publicar: existe e está habilitado? (desabilitado enquanto
     * o vídeo sobe — é preciso ESPERAR, não perguntar uma vez). */
    botao(cands) {
      const a = achar(cands, true);
      if (!a) return { existe: false, habilitado: false };
      const el = a.el;
      const off = el.disabled || el.getAttribute('aria-disabled') === 'true'
        || (el.closest('[aria-disabled="true"]') !== null);
      return { existe: true, habilitado: !off };
    },

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
        texto: ed ? (ed.el.value ?? ed.el.innerText) : null,
        anexos: !!an,
        midia: an ? an.el.querySelectorAll('img, video').length + (an.el.matches('img,video') ? 1 : 0) : 0,
        botao: bt ? { existe: true, habilitado: !(bt.el.disabled || bt.el.getAttribute('aria-disabled') === 'true') }
                  : { existe: false },
        url: location.href,
      };
    },
  };
})();
