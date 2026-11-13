// Método B: teclado REAL pela API de depuração do Chrome (chrome.debugger).
//
// As teclas chegam à página como as de uma pessoa (isTrusted = true) — é o
// mesmo caminho do Playwright no SocialPUB. O preço: enquanto escreve, o Chrome
// mostra a faixa amarela "uma extensão está depurando este navegador".
//
// `cmd(metodo, params)` manda um comando do protocolo de depuração. Recebido
// por parâmetro para o mesmo código rodar no teste (sessão CDP do Playwright).

const _SP_INVISIVEIS = /[​‌‍﻿⁠]/g;

/** Para comparar o que foi escrito com o que voltou: sem invisíveis e com os
 * espaços normalizados (o editor troca quebras e espaços duplos à vontade). */
function spNormalizar(s) {
  return String(s || '').replace(_SP_INVISIVEIS, '').replace(/\s+/g, ' ').trim();
}

function _spPausa(ms) { return new Promise(r => setTimeout(r, ms)); }

async function _spTecla(cmd, key, code, vk, modifiers, text) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: modifiers || 0 };
  await cmd('Input.dispatchKeyEvent', Object.assign({ type: text ? 'keyDown' : 'rawKeyDown' },
    base, text ? { text, unmodifiedText: text } : {}));
  await cmd('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, base));
}

async function _spCaractere(cmd, c) {
  await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: c, text: c, unmodifiedText: c });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: c });
  await _spPausa(25);
}

/** Clique de mouse REAL no ponto (x, y) da janela, em pixels CSS. As redes
 * ignoram `element.click()` em vários lugares (o Instagram, comprovadamente,
 * no cadastro); um clique pelo protocolo de depuração é o de uma pessoa. */
async function spClicarEm(cmd, x, y) {
  await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await _spPausa(60);
  await cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await _spPausa(40);
  await cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

/** Seleciona tudo e apaga, no campo que estiver com o foco. */
async function spLimparCampo(cmd) {
  await _spTecla(cmd, 'a', 'KeyA', 65, 2);
  await _spTecla(cmd, 'Backspace', 'Backspace', 8, 0);
}

/** Digita letra a letra (para campos de busca, como o @ do colaborador: a
 * lista de sugestões reage a cada tecla). */
async function spDigitar(cmd, texto, pausaMs) {
  for (const c of String(texto)) {
    await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: c, text: c, unmodifiedText: c });
    await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: c });
    await _spPausa(pausaMs || 60);
  }
}

/** Escreve `texto` onde estiver o foco.
 *
 * Mesma regra do SocialPUB (`_inserir_linha`): texto corrido entra de uma vez
 * (`Input.insertText`), e hashtag/menção vai tecla a tecla com um ESPAÇO
 * depois — o seletor de hashtag engole o que entra em bloco, e o espaço
 * confirma a hashtag como foi escrita (um Enter escolheria a sugestão). */
async function spEscreverTeclas(cmd, texto) {
  await spLimparCampo(cmd);      // limpa SEMPRE (o TikTok pré-preenche com o nome do arquivo)
  const linhas = String(texto).split('\n');
  for (let i = 0; i < linhas.length; i++) {
    if (i > 0) await _spTecla(cmd, 'Enter', 'Enter', 13, 0, '\r');
    const partes = linhas[i].split(/([#@][^\s#@]+)/);
    let depoisDeToken = false;
    for (let j = 0; j < partes.length; j++) {
      let p = partes[j];
      if (!p) continue;
      if (j % 2 === 1) {                                  // #hashtag ou @menção
        for (const c of p) await _spCaractere(cmd, c);
        await _spCaractere(cmd, ' ');
        depoisDeToken = true;
      } else {
        if (depoisDeToken && p.startsWith(' ')) p = p.slice(1);  // o espaço já foi
        depoisDeToken = false;
        if (p) { await cmd('Input.insertText', { text: p }); await _spPausa(40); }
      }
    }
  }
}
