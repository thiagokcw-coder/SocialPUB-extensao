// O motor: executa a receita de UMA rede. Sem `opcoes.publicar`, PARA antes do
// botão final; com ele, publica — só se a legenda conferiu.
//
// Ordem (a mesma do `publicador.preencher` + `apertar_publicar` do app): abrir
// o compositor → anexar → passos (OK, corte, Avançar…) → fechar avisos →
// escrever a legenda → colaboradores → conferir → [publicar → confirmar →
// ver o botão sumir]. Cada etapa que falha diz qual tela faltou, e a aba
// fica ABERTA com o que já foi feito — fechar jogaria fora o upload.
//
// Cliques e teclas vão pela API de depuração (eventos reais). A faixa amarela
// "está depurando" aparece enquanto a rede é preparada e some no fim.

const ESPERA_PADRAO_MS = 30000;

function _motorPrazo(promessa, descricao, ms = 45000) {
  let timer;
  return Promise.race([promessa, new Promise((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error(`${descricao}: tempo limite de ${ms / 1000}s; fluxo interrompido`)), ms);
  })]).finally(() => clearTimeout(timer));
}

async function _motorAbrirAba(url) {
  const tab = await _motorPrazo(chrome.tabs.create({ url, active: true }), 'abrir aba');
  const fim = Date.now() + 45000;
  while (Date.now() < fim) {
    if ((await _motorPrazo(chrome.tabs.get(tab.id), 'consultar aba')).status === 'complete') return tab.id;
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('carregamento da aba não terminou em 45s; verifique avisos de navegação');
}

async function _motorLimparFacebook(log) {
  log('limpeza: procurando abas com Criar post / Editar reel de execuções anteriores');
  const abas = await _motorPrazo(chrome.tabs.query({ url: ['https://*.facebook.com/*', 'https://facebook.com/*'] }), 'listar abas do Facebook');
  const guardado = await _motorPrazo(chrome.storage.session.get('facebookAbaMotor'), 'ler aba anterior');
  for (const aba of abas) {
    const antiga = aba.id === guardado.facebookAbaMotor;
    const suja = antiga || await _motorPrazo(_motorNaAba(aba.id, 'facebookCompositorAberto', []), 'inspecionar compositor anterior');
    if (suja) {
      // Fechar a aba descarta o compositor sem navegar nem acionar Publicar.
      await _motorPrazo(chrome.tabs.remove(aba.id), 'fechar aba anterior');
      log(`limpeza: aba ${aba.id} fechada; compositor descartado sem publicar`);
    }
  }
  log('limpeza: concluída; iniciando em uma aba nova');
}

/** Roda `SP[metodo](...args)` dentro da aba, injetando o pagina.js antes
 * (navegação de verdade apaga o que foi injetado; reinjetar é barato). */
async function _motorNaAba(tabId, metodo, args) {
  // A página pode ser TROCADA no meio de uma leitura (o Threads, 13/11: «Frame
  // with ID 0 was removed»). É passageiro: espera e tenta de novo, até 3 vezes.
  for (let tentativa = 1; ; tentativa++) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['pagina.js'] });
      const [r] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (m, a) => self.SP[m](...a),
        args: [metodo, args || []],
      });
      return r ? r.result : null;
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      if (tentativa >= 3 || !/frame|was removed|navigat|context|showing error page/i.test(msg)) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

function _motorTrocar(cands, u) {
  return cands.map(c => typeof c === 'string' ? c.split('{u}').join(u)
    : Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v).split('{u}').join(u)])));
}

class EtapaFalhou extends Error {}

/** Monitor usado também no modo preparar, sem clicar em publicar. */
async function spVigiarUpload({ ler, botao, log, maxMs = 180000, zeroMs = 30000,
  agora = Date.now, pausa = ms => new Promise(r => setTimeout(r, ms)) }) {
  // 13/11: o log mostrou 33% e o compositor terminou «video.mp4: Ready» com o
  // Post habilitado, mas o vigia acusou «0% por 30s». Agora: o relógio dos 30s
  // ZERA a cada mudança de percentual; sem percentual com o anexo na tela é
  // «ainda processando», não 0%; «Ready/Pronto/Concluído» é sucesso.
  const inicio = agora();
  let zeroDesde = null, ultimo = null, andou = false, processando = false;
  for (;;) {
    const p = await ler();
    const b = await botao();
    if (p.pronto) { log('upload: ' + (p.texto || 'pronto')); return; }
    if (p.percentual != null) {
      if (p.percentual !== ultimo) {
        log('upload: ' + p.texto);
        zeroDesde = null;                       // mudou: recomeça a contar
        if (p.percentual > 0) andou = true;
      }
      ultimo = p.percentual;
      processando = false;
      if (p.percentual === 0 && !andou) { if (zeroDesde == null) zeroDesde = agora(); }
      else zeroDesde = null;
    } else if (p.anexo) {
      if (!processando && ultimo != null) log('upload: «Uploading» sumiu com o anexo na tela — processando');
      processando = true;
      zeroDesde = null;
    }
    if (b.habilitado && (p.percentual == null || p.percentual === 100)) return;
    if (zeroDesde != null && agora() - zeroDesde >= zeroMs) {
      throw new EtapaFalhou('o upload ficou em 0% por 30s — o X não iniciou o envio; nada foi publicado');
    }
    if (agora() - inicio >= maxMs) throw new EtapaFalhou('o upload/processamento do X não terminou em 180s — nada foi publicado');
    await pausa(1000);
  }
}

/**
 * Prepara a publicação numa rede; publica se `opcoes.publicar`.
 * `midia` = {nome, tipo, b64} ou null; `opcoes` = {publicar: bool, colaboradores: ['a', 'b'],
 * log: fn}.
 */
async function prepararRede(redeId, midia, texto, opcoes) {
  const R = RECEITAS[redeId];
  const log = (m, c) => (opcoes.log || (() => {}))(`[${R.nome}] ${m}`, c);
  const inicioRede = Date.now();
  let etapaAtual = '', inicioEtapa = inicioRede;
  const etapa = nome => {
    if (redeId !== 'facebook') return;
    const agora = Date.now();
    if (etapaAtual) log(`tempo · ${etapaAtual}: ${((agora - inicioEtapa) / 1000).toFixed(2)}s`);
    etapaAtual = nome;
    inicioEtapa = agora;
  };
  const tipo = midia ? (midia.tipo.startsWith('video/') ? 'video' : 'imagem') : 'texto';
  if (!R.aceita.includes(tipo)) {
    log(`pulada: a receita medida cobre ${R.aceita.join(', ')}, e o conteúdo é ${tipo}`, 'am');
    return { rede: redeId, pulada: true };
  }
  if (texto.length > R.legenda_max) log(`⚠ legenda com ${texto.length} caracteres; o limite é ${R.legenda_max}`, 'am');

  let url = R.url;
  if (R.perfil) {
    opcoes = { ...opcoes, facebookPagina: 'Uncensored Brasil', facebookPaginaUrl: 'https://www.facebook.com/uncensoredbrasil' };
    try { url = spUrlPaginaFacebook(opcoes.facebookPaginaUrl); }
    catch (e) { log('✗ ' + e.message, 'er'); return { rede: redeId, erro: e.message }; }
  }
  log(`abrindo ${url} …`);
  etapa('abrir URL e conectar depuração');
  let tabId;
  try {
    if (R.perfil) await _motorLimparFacebook(log);
    tabId = await _motorAbrirAba(url);
    if (R.perfil) await _motorPrazo(chrome.storage.session.set({ facebookAbaMotor: tabId }), 'registrar aba limpa');
    await _motorPrazo(chrome.debugger.attach({ tabId }, '1.3'), 'conectar depuração');
    log('aba limpa carregada; depuração conectada');
  } catch (e) {
    log('✗ inicialização: ' + e.message, 'er');
    return { rede: redeId, erro: e.message };
  }
  const alvo = { tabId };
  let navegou = false, vigiarNavegacao = false;
  const aoNavegar = (id, info) => {
    if (id === tabId && vigiarNavegacao && (info.status === 'loading' || info.url)) {
      navegou = true;
      log('✗ Facebook recarregou ou mudou de página; fluxo interrompido, inicie novamente pela Página', 'er');
    }
  };
  if (R.perfil) chrome.tabs.onUpdated.addListener(aoNavegar);
  const checarNavegacao = () => {
    if (navegou) throw new EtapaFalhou('Facebook navegou durante o fluxo; identidade invalidada. Reinicie pela Página Uncensored Brasil');
  };
  // A depuração pode CAIR no meio (TikTok, 13/11: «Debugger is not attached»,
  // durante a espera do upload). Religa e repete o comando — a não ser que
  // tenha sido você, no «Cancelar» da faixa amarela: aí para, com o motivo.
  let soltou = null;
  const aoSoltar = (fonte, motivo) => { if (fonte.tabId === tabId) soltou = motivo; };
  chrome.debugger.onDetach && chrome.debugger.onDetach.addListener(aoSoltar);
  const cmd = async (m, p) => {
    checarNavegacao();
    try {
      return await _motorPrazo(chrome.debugger.sendCommand(alvo, m, p), 'depuração · ' + m);
    } catch (e) {
      if (!/not attached/i.test(String(e && e.message ? e.message : e))) throw e;
      if (soltou === 'canceled_by_user') throw new EtapaFalhou('a depuração foi cancelada na faixa amarela — parei');
      log(`a depuração caiu${soltou ? ' (' + soltou + ')' : ''} — religando`, 'am');
      soltou = null;
      await _motorPrazo(chrome.debugger.attach(alvo, '1.3'), 'reconectar depuração');
      checarNavegacao();
      return await _motorPrazo(chrome.debugger.sendCommand(alvo, m, p), 'depuração · ' + m);
    }
  };
  const naAba = async (m, ...a) => {
    const inicio = Date.now();
    try {
      checarNavegacao();
      const resultado = await _motorPrazo(_motorNaAba(tabId, m, a), 'leitura da aba · ' + m, 60000);
      checarNavegacao();
      return resultado;
    }
    finally {
      if (redeId === 'facebook' && m === 'facebookComo') {
        log(`tempo · checagem do autor: ${((Date.now() - inicio) / 1000).toFixed(2)}s`);
      }
    }
  };
  let facebookIniciado = false;
  let facebookMidiaConfirmada = false;

  async function estadoFacebook() {
    const e = await naAba('facebookEstado', opcoes.facebookPagina);
    if (!e || !e.ok) {
      log('autores encontrados no compositor: ' + JSON.stringify(e?.nomes || []), 'er');
      throw new EtapaFalhou(e?.erro || `Facebook não está como a página ${opcoes.facebookPagina}`);
    }
    if (tipo === 'video') { e.midia = e.videos; e.anexos = e.videos > 0; }
    if (e.midia > 0) facebookMidiaConfirmada = true;
    return e;
  }

  async function aguardarMidiaFacebook(e, intermediaria = false) {
    if (!midia || e.midia > 0) return e;
    const inicio = Date.now();
    const prazo = intermediaria ? 5000 : 15000;
    log(`aguardando prévia em ${e.etapa} (até ${prazo / 1000}s)`);
    while (!e.midia && Date.now() - inicio < prazo) {
      await new Promise(r => setTimeout(r, 500));
      e = await estadoFacebook();
    }
    log(`tempo · prévia em ${e.etapa}: ${((Date.now() - inicio) / 1000).toFixed(2)}s`);
    if (!e.midia) {
      log('diagnóstico da prévia: ' + JSON.stringify(e.diagnosticoMidia || {}), 'am');
      // Avançar não publica. A tela de edição pode renderizar a prévia fora
      // do escopo já verificado; isso não autoriza reutilizar a prova no envio.
      if (intermediaria && ['editar_reel', 'criar_reel'].includes(e.etapa) && facebookMidiaConfirmada) {
        log('prévia já confirmada antes; avançando apenas à revisão — mídia será exigida novamente antes de publicar', 'am');
      } else throw new EtapaFalhou('a mídia não apareceu no post');
    }
    return e;
  }

  async function lerPost() {
    const lido = await naAba('ler', R.legenda, R.anexos || [], R.publicar);
    if (facebookIniciado) {
      const estado = await aguardarMidiaFacebook(await estadoFacebook());
      if (!estado.etapa.startsWith('final_')) throw new EtapaFalhou('o Facebook saiu da tela de configurações antes de publicar');
      Object.assign(lido, estado);
    }
    return lido;
  }

  async function conferirPaginaFacebook() {
    if (!R.perfil) return;
    const nome = String(opcoes.facebookPagina || '').trim();
    if (!(await naAba('facebookConta', nome))?.ok) throw new EtapaFalhou('avatar da Página não confirmado; publicação bloqueada');
    let lido = nome ? await naAba('facebookComo', nome) : null;
    if (facebookIniciado && lido && !lido.nomes.length) {
      const estado = await estadoFacebook();
      if (estado.etapa !== 'criar') lido = estado;
    }
    if (!lido || !lido.ok) {
      log('autores encontrados no compositor: ' + (lido && lido.nomes && lido.nomes.length
        ? lido.nomes.map(n => JSON.stringify(n)).join(', ') : '(nenhum)'), 'er');
      throw new EtapaFalhou(`Facebook não está como a página ${nome || '(configure a página na persona)'}`);
    }
    log(`✓ Facebook está como a página ${nome}`, 'ok');
  }

  async function clicar(cands, prazoMs, oQue) {
    const p = await naAba('localizar', cands, prazoMs);
    if (!p || !p.ok) throw new EtapaFalhou(`${oQue}: ${(p && p.erro) || 'sem resposta da aba'}`);
    // Leva o mouse, ESPERA e MEDE DE NOVO antes de clicar. O menu lateral do
    // Instagram (13/11) fica recolhido e se EXPANDE com o mouse em cima: os
    // itens mudam de lugar, e o clique na posição medida antes caiu em «Painel»
    // em vez de «Criar» (foi parar nas ferramentas de anúncio).
    await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
    await new Promise(r => setTimeout(r, 400));
    const q = await naAba('localizar', cands, 1500);
    if (cands === R.avancar && !q?.ok) throw new EtapaFalhou('Avançar saiu do diálogo visível antes do clique');
    const ponto = (q && q.ok) ? q : p;
    if (q && q.ok && (Math.abs(q.x - p.x) > 4 || Math.abs(q.y - p.y) > 4)) {
      log(`(${oQue}: mudou de lugar com o mouse em cima — cliquei na posição nova)`);
    }
    await spClicarEm(cmd, ponto.x, ponto.y);
    return ponto;
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
    etapa('trocar para a Página');
    if (R.perfil) {
      const nome = String(opcoes.facebookPagina || '').trim();
      if (!nome) throw new EtapaFalhou('Facebook não está como a página (configure a página na persona)');
      // Página aberta DESLOGADA (16/11: «Vê mais conteúdos de…» com e-mail e
      // palavra-passe): parar com a causa em vez de procurar a troca de perfil.
      if (await naAba('existe', ['input[type="password"]', 'input[name="pass"]'])) {
        throw new EtapaFalhou('o Facebook abriu a Página DESLOGADO (pediu e-mail e senha) — a sessão guardada não vale mais: em «Contas da persona», use «Entrar pela tela» e «Salvar sessão atual»');
      }
      // A URL da página pode abrir ainda como perfil pessoal. Só procurar o
      // compositor depois de a troca terminar; não repetir clique na recarga.
      const s = await naAba('localizar', R.perfil.alternar, 8000);
      const banner = await naAba('facebookBanner');
      if (s?.ok || banner?.length) {
        log('troca de perfil: necessária');
        if (!s?.ok) throw new EtapaFalhou(`não consegui trocar para a Página ${nome}`);
        await clicar(R.perfil.alternar, 2000, 'mudar para a página');
        log(`cliquei «${s.texto}» para agir como a página`);
        const fimTroca = Date.now() + 30000;
        let pronta = false;
        while (Date.now() < fimTroca) {
          await new Promise(r => setTimeout(r, 500));
          // naAba reinjeta os ajudantes e tolera contextos trocados na navegação.
          const avisos = await naAba('facebookBanner');
          if (Array.isArray(avisos) && !avisos.length
              && (await naAba('facebookConta', nome))?.ok) {
            pronta = true;
            break;
          }
        }
        if (!pronta) throw new EtapaFalhou(`não consegui trocar para a Página ${nome}`);
        log('troca de perfil: feita; avatar da Página confirmado', 'ok');
      } else log('troca de perfil: verificando se já estava na Página');
      const conta = await naAba('facebookConta', nome);
      if (!conta?.ok) throw new EtapaFalhou(`não foi possível confirmar o avatar da Página ${nome}; compositor bloqueado`
        + (conta ? ` (pelo ${conta.via || 'nome'}: conta ${JSON.stringify(conta.nomes?.length ? conta.nomes : conta.fotoConta || [])}`
          + (conta.via === 'foto' ? `, Página ${JSON.stringify(conta.fotoPagina || [])}` : '') + ')' : ''));
      log('troca de perfil: ' + (s?.ok || banner?.length ? 'feita' : 'já estava na Página') + '; avatar confirmado', 'ok');
      vigiarNavegacao = true;
    }
    // ── 1. abrir o compositor (só onde ele é um modal) ────────────────────
    etapa('abrir compositor');
    if (R.abrir) {
      if (await naAba('existe', R.abrir.esperar)) {
        log('o compositor já estava aberto');
      } else {
        const antes = await naAba('onde');
        if (R.abrir.clicar) await clicar(R.abrir.clicar, ESPERA_PADRAO_MS, 'botão de criar');
        if (R.abrir.clicar && R.abrir.menu) {
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
        let d = await naAba('localizar', R.abrir.esperar, 20000);
        if ((!d || !d.ok) && R.abrir.reserva && !R.abrir.clicar) {
          log('o compositor não abriu pela URL em 20s — tentando pelo botão de criar da barra lateral', 'am');
          if (await naAba('existe', R.abrir.reserva)) {
            await clicar(R.abrir.reserva, 5000, 'botão de criar (reserva)');
            d = await naAba('localizar', R.abrir.esperar, 20000);
          }
        }
        if (!d || !d.ok) {
          if (!R.abrir.clicar) throw new EtapaFalhou('o compositor não abriu — parei antes de anexar');
          // Clicar em "criar" não muda de página: se mudou, o clique foi parar
          // em outro lugar — e seguir clicando lá seria pior.
          const depois = await naAba('onde');
          if (depois !== antes) throw new EtapaFalhou(`o clique em criar levou para ${depois} — não era o botão de criar; parei`);
          throw new EtapaFalhou('cliquei em criar e o compositor não abriu — a tela que ficou aberta não foi medida');
        }
        log('✓ compositor aberto', 'ok');
      }
    }

    etapa('validar autor e vincular compositor');
    await conferirPaginaFacebook();
    if (R.fluxo_facebook) {
      facebookIniciado = await naAba('facebookIniciar', opcoes.facebookPagina);
      if (!facebookIniciado) throw new EtapaFalhou('não consegui vincular o compositor à página verificada');
    }

    // ── 2. anexar ─────────────────────────────────────────────────────────
    etapa('anexar mídia e aguardar prévia');
    if (midia) {
      let a;
      if (R.arquivo_nativo && opcoes.uploadMetodo !== 'sintetico') {
        const caminho = await spArquivoNativo(midia);
        const campo = await naAba('campoArquivo', R.arquivo, ESPERA_PADRAO_MS);
        if (!campo || !campo.ok) throw new EtapaFalhou('o campo de arquivo não apareceu');
        const { root } = await cmd('DOM.getDocument', {});
        const { nodeId } = await cmd('DOM.querySelector', { nodeId: root.nodeId, selector: R.arquivo[campo.idx] });
        if (!nodeId) throw new EtapaFalhou('o campo de arquivo saiu da tela antes da entrega');
        // O spArquivoNativo só devolve o caminho com o download «complete» e o
        // tamanho igual ao da mídia. Depois da entrega NÃO dá para conferir pelo
        // input.files: o X esvazia o campo assim que consome o arquivo (13/11).
        // Confere pelo compositor: o anexo aparece e o vigia acompanha o envio.
        await cmd('DOM.setFileInputFiles', { nodeId, files: [caminho] });
        const anexo = await naAba('localizar', R.anexos || R.depois_do_arquivo, 20000);
        if (!anexo || !anexo.ok) throw new EtapaFalhou('o arquivo nativo foi entregue e o anexo não apareceu no compositor em 20s');
        log(`✓ arquivo nativo entregue (${midia.tamanho != null ? midia.tamanho + ' bytes' : caminho}) — o anexo apareceu no compositor`, 'ok');
        a = { ok: true };
      } else {
        a = await naAba('anexar', midia.b64, midia.nome, midia.tipo, R.arquivo, ESPERA_PADRAO_MS);
      }
      if (!a || !a.ok) throw new EtapaFalhou('arquivo: ' + ((a && a.erro) || 'sem resposta'));
      log('✓ arquivo entregue ao campo', 'ok');
      if (R.upload && tipo === 'video') {
        await spVigiarUpload({ ler: () => naAba('progressoUpload', R.upload),
          botao: () => naAba('botao', R.publicar), log });
        log('✓ upload concluído: botão de publicar habilitado — ainda NÃO cliquei', 'ok');
      }
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
    etapa('dispensar avisos');
    const fechados = await dispensarAvisos(R.dispensar_espera_s || 0);

    // ── 5. legenda ───────────────────────────────────────────────────────
    etapa('escrever legenda');
    const reelDireto = facebookIniciado && (await estadoFacebook()).etapa !== 'criar';
    if (texto && !reelDireto) {
      // Clique REAL no editor antes de escrever: foco por script não basta
      // em todo editor, e o aviso que cobre a tela pegaria as teclas.
      // Teclado real sempre: o comando de texto do navegador deixou a #hashtag
      // do X BRANCA (13/11) — o editor não processa o que não foi digitado.
      if (R.dispensar && await naAba('existe', R.dispensar)) await dispensarAvisos(0);
      await clicar(R.legenda, ESPERA_PADRAO_MS, 'campo da legenda');
      await naAba('focar', R.legenda, 2000);
      await spEscreverTeclas(cmd, texto, !!R.hashtag_por_tecla);
      log('✓ legenda escrita', 'ok');
    }

    // Facebook: legenda no compositor inicial, depois uma transição por vez.
    // Uma repetição no máximo, após 5s sem transição e nova medição do botão.
    if (facebookIniciado) {
      etapa('avançar telas do Facebook');
      let e = await estadoFacebook();
      for (let n = 0; !e.etapa.startsWith('final_'); n++) {
        if (n >= 3 || !['criar', 'editar_reel', 'criar_reel'].includes(e.etapa)) throw new EtapaFalhou('etapa do Facebook não reconhecida');
        e = await aguardarMidiaFacebook(e, ['editar_reel', 'criar_reel'].includes(e.etapa));
        if (e.etapa === 'criar' && texto && !spNormalizar(e.texto).includes(spNormalizar(texto))) {
          throw new EtapaFalhou('a legenda NÃO bate com o que foi escrito');
        }
        const anterior = e.etapa;
        etapa(`avançar a partir de ${anterior}`);
        const fim = Date.now() + 180000;
        while (!(await naAba('botao', R.avancar)).habilitado) {
          if (Date.now() >= fim) throw new EtapaFalhou('o botão Avançar do Facebook não habilitou em 180s');
          await new Promise(r => setTimeout(r, 500));
          e = await estadoFacebook();
        }
        if (anterior === 'criar') await conferirPaginaFacebook();
        let clicado = await clicar(R.avancar, 5000, 'Avançar do Facebook');
        for (let tentativa = 0; tentativa < 2; tentativa++) {
          const limite = Date.now() + 5000;
          do {
            await new Promise(r => setTimeout(r, 250));
            e = await estadoFacebook();
          } while (e.etapa === anterior && Date.now() < limite);
          if (e.etapa !== anterior) break;
          log(`Avançar sem transição em 5s (${anterior}): ` + JSON.stringify(clicado), 'am');
          if (tentativa === 1) throw new EtapaFalhou(`o Facebook permaneceu em ${anterior} após duas tentativas de Avançar (5s cada)`);
          // Recalcular o centro: nunca reutilizar coordenadas antigas.
          if (!(await naAba('botao', R.avancar)).habilitado) throw new EtapaFalhou('Avançar ficou desabilitado antes da segunda tentativa');
          clicado = await naAba('localizar', R.avancar, 1000);
          if (!clicado?.ok) throw new EtapaFalhou('Avançar visível não encontrado na segunda tentativa');
          e = await estadoFacebook();
          if (e.etapa !== anterior) break;
          log('tentativa 2: clique no centro de Avançar ' + JSON.stringify(clicado));
          await spClicarEm(cmd, clicado.x, clicado.y);
        }
        if (anterior !== 'criar' && !['editar_reel', 'criar_reel', 'final_reel'].includes(e.etapa)) throw new EtapaFalhou('transição inesperada ao configurar o reel');
        log(`✓ Facebook: ${anterior} → ${e.etapa}`, 'ok');
      }
      if (reelDireto && texto) {
        etapa('preencher descrição do reel');
        await conferirPaginaFacebook();
        await clicar(R.descricao_reel, 10000, 'descrição do reel');
        await naAba('focar', R.descricao_reel, 2000);
        await spLimparCampo(cmd);
        await spEscreverTeclas(cmd, texto, false);
        const descricao = await estadoFacebook();
        if (!spNormalizar(descricao.texto).includes(spNormalizar(texto))) throw new EtapaFalhou('a legenda NÃO bate com a descrição do reel');
        log('✓ descrição do reel escrita e conferida', 'ok');
      }
    }

    // ── 6. colaboradores (Instagram) ─────────────────────────────────────
    const colabs = (R.colaboradores && opcoes.colaboradores) || [];
    for (const u of colabs) {
      await clicar(R.colaboradores.campo, 10000, 'campo «Adicionar colaboradores»');
      await spLimparCampo(cmd);
      await spDigitar(cmd, u);
      const p = await naAba('localizar', _motorTrocar(R.colaboradores.sugestao, u), 10000);
      if (!p || !p.ok) throw new EtapaFalhou(`digitei @${u} e a sugestão com esse nome não apareceu (a lista não foi medida, ou a conta não aceita convite) — convide na aba e publique`);
      await spClicarEm(cmd, p.x, p.y);
      await new Promise(r => setTimeout(r, 700));
      const sobrou = spNormalizar(await naAba('valor', R.colaboradores.campo)).toLowerCase();
      if (sobrou === u) throw new EtapaFalhou(`cliquei na sugestão de @${u} e o campo continuou com o nome — o convite não foi aceito`);
      log(`✓ colaborador @${u} convidado`, 'ok');
    }

    // ── 7. conferir ──────────────────────────────────────────────────────
    etapa('conferir post preparado');
    await new Promise(r => setTimeout(r, 1200));
    const lido = await lerPost();
    const res = { rede: redeId, avisos: fechados, lido };
    await conferirPaginaFacebook();
    if (texto) {
      res.legendaOk = spNormalizar(lido.texto).includes(spNormalizar(texto));
      log(res.legendaOk ? '✓ legenda conferida: o texto INTEIRO está no editor' : '✗ a legenda NÃO bate com o que foi escrito',
          res.legendaOk ? 'ok' : 'er');
      if (!res.legendaOk) log('   o editor ficou com: ' + JSON.stringify(lido.texto), 'er');
    }
    if (midia && R.anexos && R.anexos.length && (!lido.anexos || !lido.midia)) {
      throw new EtapaFalhou('a mídia não apareceu no post');
    }
    if (!opcoes.publicar) {
      if (lido.botao.existe) {
        log(lido.botao.habilitado ? '✓ pronto: botão de publicar habilitado — NÃO cliquei' : '? botão de publicar ainda desabilitado (o vídeo pode estar subindo)',
            lido.botao.habilitado ? 'ok' : 'am');
      } else {
        log('? não achei o botão de publicar', 'am');
      }
      return res;
    }

    // ── 8. publicar (só com «Publicar sozinho» ligado) ───────────────────
    etapa('aguardar botão e publicar');
    // A mesma regra do `apertar_publicar` do app.
    if (res.legendaOk === false) {
      log('✗ NÃO publiquei: a legenda não conferiu — confira a aba', 'er');
      return res;
    }
    // ESPERAR o botão habilitar, não perguntar uma vez: logo depois do upload
    // ele está desabilitado em todas as redes (o vídeo ainda sobe).
    const esperaS = R.espera_botao_s || 180;
    const fimB = Date.now() + esperaS * 1000;
    let b = await naAba('botao', R.publicar);
    if (!b.habilitado) log(`esperando o botão de publicar habilitar (até ${esperaS}s) …`);
    while (!b.habilitado) {
      if (Date.now() > fimB) throw new EtapaFalhou(`o botão de publicar seguiu ${b.existe ? 'desabilitado' : 'fora da tela'} por ${esperaS}s — nada foi publicado`);
      await new Promise(r => setTimeout(r, 1000));
      b = await naAba('botao', R.publicar);
    }
    // aviso por cima do botão comeria o clique (TikTok, 10/11)
    if (R.dispensar && await naAba('existe', R.dispensar)) await dispensarAvisos(0);
    await conferirPaginaFacebook();
    // O upload pode falhar enquanto esperamos o botão habilitar.
    if (midia && R.anexos && R.anexos.length) {
      const atual = await lerPost();
      if (!atual.anexos || !atual.midia) throw new EtapaFalhou('a mídia não apareceu no post');
    }
    if (facebookIniciado && texto && !spNormalizar((await lerPost()).texto).includes(spNormalizar(texto))) {
      throw new EtapaFalhou('a legenda mudou antes de publicar');
    }
    if (facebookIniciado && !(await naAba('facebookArmarConfirmacao'))) throw new EtapaFalhou('não consegui preparar a confirmação do Facebook');
    const clicado = await clicar(R.publicar, 5000, 'botão de publicar');
    res.clicou = true;
    log('cliquei em publicar …');

    // confirmação depois do clique: uma janela curta e UM clique só
    etapa('verificar resultado do clique');
    if (R.confirmar) {
      const fimC = Date.now() + (R.confirmar_espera_s || 0) * 1000;
      for (;;) {
        if (await naAba('existe', R.confirmar)) {
          const c = await clicar(R.confirmar, 1000, 'confirmação');
          res.confirmou = c.texto;
          log(`respondi «${c.texto}»`);
          break;
        }
        if (Date.now() >= fimC) break;
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // CONFIRMAR em vez de afirmar: nas redes medidas o botão (ou o diálogo em
    // volta) SOME quando a publicação é aceita. Não sumiu = "incerto" — a pessoa
    // confere antes de publicar de novo (publicar duas vezes é o risco aqui).
    // Só o botão QUE FOI CLICADO: no X, quando o modal fecha, aparece o
    // compositor da linha do tempo atrás dele, com um botão de publicar que
    // também casa a receita — e a leva dizia "continua na tela" de um post que
    // tinha saído (13/11). É o `sel` que o app sempre usou.
    if (R.fluxo_facebook) {
      let limite = Date.now() + 30000, recusas = 0;
      do {
        // Oferta por cima («Fale diretamente com as pessoas»): «Agora não» e
        // o prazo recomeça — enquanto ela estiver aberta o post não sai.
        if (R.recusar_depois && recusas < 3 && await naAba('existe', R.recusar_depois)) {
          const o = await clicar(R.recusar_depois, 1000, 'recusar oferta do Facebook');
          recusas++;
          log(`o Facebook abriu uma oferta depois de Postar — respondi «${o.texto || 'Agora não'}»`, 'am');
          limite = Date.now() + 30000;
          await new Promise(r => setTimeout(r, 800));
          continue;
        }
        const resultado = await naAba('facebookResultado');
        if (resultado) {
          res.publicou = !!resultado.publicado;
          res.processando = !!resultado.processando;
          res.evidencia = resultado.evidencia;
          log(res.processando ? '✓ reel enviado: o Facebook informou que está processando' : '✓ publicação confirmada: ' + res.evidencia, 'ok');
          return res;
        }
        await new Promise(r => setTimeout(r, 500));
      } while (Date.now() < limite);
      res.publicou = false;
      res.publicacaoIncerta = true;
      log('? clique enviado ao Facebook; publicação ainda não confirmada no feed — confira a aba antes de repetir', 'am');
      return res;
    }
    res.publicou = await naAba('sumiu', [R.publicar[clicado.idx]], 30000);
    log(res.publicou ? '✓ PUBLICADO: o botão de publicar saiu da tela'
                     : '? cliquei em publicar e o botão CONTINUA na tela depois de 30s — CONFIRA na aba antes de publicar de novo',
        res.publicou ? 'ok' : 'am');
    return res;
  } catch (e) {
    log('✗ ' + (e instanceof EtapaFalhou ? e.message : 'erro: ' + (e && e.message ? e.message : e)) + ' — a aba ficou aberta', 'er');
    const out = { rede: redeId, erro: String(e && e.message ? e.message : e) };
    // MEDIR a tela em que parou, em vez de teorizar (a regra do projeto). O
    // diagnóstico vai no resultado; o painel oferece copiar.
    try {
      const d = await naAba('medir');
      if (d) {
        out.diagnostico = Object.assign({ rede: redeId, quando: new Date().toISOString(), erro: out.erro }, d);
        log(`   tela: ${d.url} · idioma ${d.idioma} · janela ${d.janela} · ${d.dialogos.length} diálogo(s) · ${d.clicaveis.length} clicável(is)`
            + (d.parece_login ? ' · ⚠ PARECE TELA DE LOGIN — a sessão não valeu' : ''), d.parece_login ? 'er' : 'am');
      }
    } catch (e2) { /* a aba pode ter fechado; o erro acima já diz o que houve */ }
    return out;
  } finally {
    etapa('');
    if (redeId === 'facebook') log(`tempo · total do motor: ${((Date.now() - inicioRede) / 1000).toFixed(2)}s`);
    if (R.perfil) chrome.tabs.onUpdated.removeListener(aoNavegar);
    chrome.debugger.onDetach && chrome.debugger.onDetach.removeListener(aoSoltar);
    try { await chrome.debugger.detach(alvo); } catch (e) { /* já soltou */ }
  }
}

