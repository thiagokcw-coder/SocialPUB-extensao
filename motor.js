// O motor: executa a receita de UMA rede e PARA antes de publicar.
//
// Ordem (a mesma do `publicador.preencher` do app): abrir o compositor →
// anexar → passos (OK, corte, Avançar…) → fechar avisos → escrever a legenda →
// colaboradores → conferir. Cada etapa que falha diz qual tela faltou, e a aba
// fica ABERTA com o que já foi feito — fechar jogaria fora o upload.
//
// Cliques e teclas vão pela API de depuração (eventos reais). A faixa amarela
// "está depurando" aparece enquanto a rede é preparada e some no fim.

const ESPERA_PADRAO_MS = 30000;

async function _motorAbrirAba(url) {
  const tab = await chrome.tabs.create({ url, active: true });
  await new Promise(res => {
    const ouvir = (id, info) => {
      if (id === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(ouvir); res(); }
    };
    chrome.tabs.onUpdated.addListener(ouvir);
    chrome.tabs.get(tab.id).then(t => {
      if (t.status === 'complete') { chrome.tabs.onUpdated.removeListener(ouvir); res(); }
    });
  });
  return tab.id;
}

/** Roda `SP[metodo](...args)` dentro da aba, injetando o pagina.js antes
 * (navegação de verdade apaga o que foi injetado; reinjetar é barato). */
async function _motorNaAba(tabId, metodo, args) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['pagina.js'] });
  const [r] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (m, a) => self.SP[m](...a),
    args: [metodo, args || []],
  });
  return r ? r.result : null;
}

function _motorTrocar(cands, u) {
  return cands.map(c => typeof c === 'string' ? c.split('{u}').join(u)
    : Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v).split('{u}').join(u)])));
}

class EtapaFalhou extends Error {}

/**
 * Prepara a publicação numa rede e para antes do botão final.
 * `midia` = {nome, tipo, b64} ou null; `opcoes` = {metodo: 'teclado'|'texto',
 * colaboradores: ['a', 'b'], log: fn}.
 */
async function prepararRede(redeId, midia, texto, opcoes) {
  const R = RECEITAS[redeId];
  const log = (m, c) => (opcoes.log || (() => {}))(`[${R.nome}] ${m}`, c);
  const tipo = midia ? (midia.tipo.startsWith('video/') ? 'video' : 'imagem') : 'texto';
  if (!R.aceita.includes(tipo)) {
    log(`pulada: a receita medida cobre ${R.aceita.join(', ')}, e o conteúdo é ${tipo}`, 'am');
    return { rede: redeId, pulada: true };
  }
  if (texto.length > R.legenda_max) log(`⚠ legenda com ${texto.length} caracteres; o limite é ${R.legenda_max}`, 'am');

  log(`abrindo ${R.url} …`);
  const tabId = await _motorAbrirAba(R.url);
  const alvo = { tabId };
  await chrome.debugger.attach(alvo, '1.3');
  const cmd = (m, p) => chrome.debugger.sendCommand(alvo, m, p);
  const naAba = (m, ...a) => _motorNaAba(tabId, m, a);

  async function clicar(cands, prazoMs, oQue) {
    const p = await naAba('localizar', cands, prazoMs);
    if (!p || !p.ok) throw new EtapaFalhou(`${oQue}: ${(p && p.erro) || 'sem resposta da aba'}`);
    await spClicarEm(cmd, p.x, p.y);
    return p;
  }

  async function dispensarAvisos(esperaS) {
    if (!R.dispensar) return 0;
    let n = 0;
    const fim = Date.now() + esperaS * 1000;
    do {
      if (await naAba('existe', R.dispensar)) {
        await clicar(R.dispensar, 1000, 'aviso');
        log('fechei um aviso por cima da tela');
        n++;
        await new Promise(r => setTimeout(r, 400));
      } else if (Date.now() < fim) {
        await new Promise(r => setTimeout(r, 300));
      }
    } while (Date.now() < fim && n < 3);
    return n;
  }

  try {
    // ── 1. abrir o compositor (só onde ele é um modal) ────────────────────
    if (R.abrir) {
      if (await naAba('existe', R.abrir.esperar)) {
        log('o compositor já estava aberto');
      } else {
        await clicar(R.abrir.clicar, ESPERA_PADRAO_MS, 'botão de criar');
        if (R.abrir.menu) {
          // Diálogo OU submenu, o que vier primeiro (6s). Clicar «Postar» com o
          // diálogo já aberto seria clicar no que estiver atrás.
          const fim = Date.now() + 6000;
          while (Date.now() < fim) {
            if (await naAba('existe', R.abrir.esperar)) break;
            if (await naAba('existe', R.abrir.menu)) {
              const m = await clicar(R.abrir.menu, 1000, 'submenu');
              log(`submenu: «${m.texto}»`);
              break;
            }
            await new Promise(r => setTimeout(r, 300));
          }
        }
        const d = await naAba('localizar', R.abrir.esperar, 20000);
        if (!d || !d.ok) throw new EtapaFalhou('cliquei em criar e o compositor não abriu — a tela que ficou aberta não foi medida');
        log('✓ compositor aberto', 'ok');
      }
    }

    // ── 2. anexar ─────────────────────────────────────────────────────────
    if (midia) {
      const a = await naAba('anexar', midia.b64, midia.nome, midia.tipo, R.arquivo, ESPERA_PADRAO_MS);
      if (!a || !a.ok) throw new EtapaFalhou('arquivo: ' + ((a && a.erro) || 'sem resposta'));
      log('✓ arquivo entregue ao campo', 'ok');
      if (R.depois_do_arquivo) {
        const s = R.espera_arquivo_s || 60;
        log(`esperando a próxima tela (até ${s}s — vídeo pode estar subindo) …`);
        const d = await naAba('localizar', R.depois_do_arquivo, s * 1000);
        if (!d || !d.ok) throw new EtapaFalhou(`a tela depois do arquivo não apareceu em ${s}s`);
      }

      // ── 3. passos medidos entre o arquivo e a legenda ───────────────────
      for (const passo of R.passos || []) {
        if (passo.opcional) {
          const p = await naAba('localizar', passo.clicar, 3000);
          if (!p || !p.ok) { log(`passo «${passo.id}»: não apareceu (opcional)`); continue; }
          await spClicarEm(cmd, p.x, p.y);
          if (passo.esperar_sumir) await naAba('sumiu', passo.clicar, 10000);
          log(`✓ passo «${passo.id}»`, 'ok');
          continue;
        }
        await clicar(passo.clicar, ESPERA_PADRAO_MS, `passo «${passo.id}»`);
        if (passo.esperar) {
          const e = await naAba('localizar', passo.esperar, ESPERA_PADRAO_MS);
          if (!e || !e.ok) throw new EtapaFalhou(`depois do passo «${passo.id}», a próxima tela medida não apareceu`);
        }
        log(`✓ passo «${passo.id}»`, 'ok');
      }
    }

    // ── 4. avisos por cima da tela ───────────────────────────────────────
    const fechados = await dispensarAvisos(R.dispensar_espera_s || 0);

    // ── 5. legenda ───────────────────────────────────────────────────────
    if (texto) {
      if (opcoes.metodo === 'texto') {
        const f = await naAba('focar', R.legenda, ESPERA_PADRAO_MS);
        if (!f || !f.ok) throw new EtapaFalhou('legenda: ' + ((f && f.erro) || 'sem resposta'));
        await naAba('escreverTexto', texto);
      } else {
        // Clique REAL no editor antes de escrever: foco por script não basta
        // em todo editor, e o aviso que cobre a tela pegaria as teclas.
        if (R.dispensar && await naAba('existe', R.dispensar)) await dispensarAvisos(0);
        await clicar(R.legenda, ESPERA_PADRAO_MS, 'campo da legenda');
        await naAba('focar', R.legenda, 2000);
        await spEscreverTeclas(cmd, texto);
      }
      log('✓ legenda escrita', 'ok');
    }

    // ── 6. colaboradores (Instagram) ─────────────────────────────────────
    const colabs = (R.colaboradores && opcoes.colaboradores) || [];
    for (const u of colabs) {
      await clicar(R.colaboradores.campo, 10000, 'campo «Adicionar colaboradores»');
      await spLimparCampo(cmd);
      await spDigitar(cmd, u, 60);
      const p = await naAba('localizar', _motorTrocar(R.colaboradores.sugestao, u), 10000);
      if (!p || !p.ok) throw new EtapaFalhou(`digitei @${u} e a sugestão com esse nome não apareceu (a lista não foi medida, ou a conta não aceita convite) — convide na aba e publique`);
      await spClicarEm(cmd, p.x, p.y);
      await new Promise(r => setTimeout(r, 700));
      const sobrou = spNormalizar(await naAba('valor', R.colaboradores.campo)).toLowerCase();
      if (sobrou === u) throw new EtapaFalhou(`cliquei na sugestão de @${u} e o campo continuou com o nome — o convite não foi aceito`);
      log(`✓ colaborador @${u} convidado`, 'ok');
    }

    // ── 7. conferir ──────────────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 1200));
    const lido = await naAba('ler', R.legenda, R.anexos || [], R.publicar);
    const res = { rede: redeId, avisos: fechados, lido };
    if (texto) {
      res.legendaOk = spNormalizar(lido.texto).includes(spNormalizar(texto));
      log(res.legendaOk ? '✓ legenda conferida: o texto INTEIRO está no editor' : '✗ a legenda NÃO bate com o que foi escrito',
          res.legendaOk ? 'ok' : 'er');
      if (!res.legendaOk) log('   o editor ficou com: ' + JSON.stringify(lido.texto), 'er');
    }
    if (lido.botao.existe) {
      log(lido.botao.habilitado ? '✓ pronto: botão de publicar habilitado — NÃO cliquei' : '? botão de publicar ainda desabilitado (o vídeo pode estar subindo)',
          lido.botao.habilitado ? 'ok' : 'am');
    } else {
      log('? não achei o botão de publicar', 'am');
    }
    return res;
  } catch (e) {
    log('✗ ' + (e instanceof EtapaFalhou ? e.message : 'erro: ' + (e && e.message ? e.message : e)) + ' — a aba ficou aberta', 'er');
    return { rede: redeId, erro: String(e && e.message ? e.message : e) };
  } finally {
    try { await chrome.debugger.detach(alvo); } catch (e) { /* já soltou */ }
  }
}

