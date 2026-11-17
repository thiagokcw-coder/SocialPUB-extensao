"""Fluxo real do motor em DOMs locais; não acessa nem publica em contas."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page()
        for script in ('pagina.js', 'receitas.js', 'personas.js', 'motor.js', 'teclado.js'):
            await page.add_script_tag(content=(ROOT / script).read_text(encoding='utf-8'))
        for mode in ('video', 'texto', 'sem_midia', 'perde_midia', 'outro_autor', 'troca_dialogo', 'legenda_perdida', 'publicar', 'troca_antes_publicar', 'reel_direto', 'reel_publicar', 'reel_processando', 'reel_oferta', 'reel_final', 'reel_retry', 'reel_travado', 'previa_intermediaria', 'previa_atrasada', 'previa_fora', 'transicao_lenta', 'ptpt_reel'):
            await page.set_content('<div role="dialog" id="fluxo"></div>')
            result = await page.evaluate("""async mode => {
              const caption = 'Legenda de teste', name = 'Uncensored Brasil';
              const video = mode !== 'texto';
              const direto = mode.startsWith('reel_');
              let stage = 0, target = null, clicks = 0, advances = 0, recusou = 0, logs = [];
              const root = document.getElementById('fluxo');
              const render = () => {
                const heading = stage === 0 ? 'Criar post' : stage === 1 && video ? 'Editar reel' : video ? (mode === 'ptpt_reel' ? 'Definições de reels' : 'Configurações do reel') : 'Configurações do post';
                const final = stage === (video ? 2 : 1);
                const author = mode === 'outro_autor' && final ? 'Perfil Pessoal' : name;
                const ausente = mode.startsWith('previa_') && (stage === 1 || (mode === 'previa_fora' && final));
                const media = video && mode !== 'sem_midia' && !(mode === 'perde_midia' && final) && !ausente ? '<video style="width:200px;height:200px"></video>' : '';
                const text = (mode === 'legenda_perdida' || direto) && final ? '' : caption;
                root.innerHTML = `<h2>${heading}</h2>` + (stage === 0 || mode === 'outro_autor' ? `<span>${author}</span>` : '')
                  + (direto && final ? `<textarea placeholder="Descreva seu reel...">${text}</textarea>` : stage === 0 || (final && video) ? `<div role="textbox" contenteditable="true" style="height:50px">${stage === 0 ? '' : text}</div>` : final ? `<section>${text}</section>` : '<input role="textbox" aria-label="Adicionar tags">')
                  + media + (final && mode === 'ptpt_reel' ? '<button>Guardar</button><button>Publicar</button>' : `<button>${final ? 'Postar' : 'Avançar'}</button>`);
              };
              render();
              const timeout = window.setTimeout, now = Date.now;
              let clock = 0;
              Date.now = () => clock;
              window.setTimeout = (cb, ms) => { clock += ms || 1; queueMicrotask(cb); return 0; };
              window.chrome = {debugger:{attach:async()=>{},detach:async()=>{},sendCommand:async()=>{},onDetach:{addListener(){},removeListener(){}}}};
              _motorAbrirAba = async()=>1;
              _motorLimparFacebook = async()=>{};
              _motorPrazo = p => p;
              chrome.storage = {session:{set:async()=>{}}};
              chrome.tabs = {onUpdated:{addListener(){},removeListener(){}}};
              window.spLimparCampo = async()=> {};
              window.spEscreverTeclas = async()=> {
                if (direto && stage !== 2) throw new Error('escreveu antes da descrição');
                const ed = root.querySelector('textarea, [role=textbox]');
                if (ed.tagName === 'TEXTAREA') ed.value = caption; else ed.innerText = caption;
              };
              window.spClicarEm = async()=> {
                if (target === RECEITAS.facebook.avancar) {
                  advances++;
                  if (mode === 'reel_travado' || (mode === 'reel_retry' && advances === 1)) return;
                  // Grok (16/11): ~segundos sem título nem autor entre as telas.
                  if (mode === 'transicao_lenta' && stage === 0) { root.innerHTML = '<div>…</div>'; pendente = 30; return; }
                  stage++; render();
                  if (mode === 'troca_dialogo') root.replaceWith(root.cloneNode(true));
                }
                if (target === RECEITAS.facebook.recusar_depois) { recusou++; document.getElementById('oferta').remove(); root.remove(); }
                if (target === RECEITAS.facebook.publicar) {
                  clicks++;
                  if (mode === 'reel_processando') root.insertAdjacentHTML('afterend','<div role="status">Seu reel está sendo processado</div>');
                  else if (mode === 'reel_oferta') root.insertAdjacentHTML('afterend','<div role="dialog" id="oferta"><h2>Fale diretamente com as pessoas</h2><div role="button">Agora não</div><div role="button">Adicionar botão</div></div>');
                  else root.remove();
                }
              };
              let finalReads = 0, previewReads = 0, pendente = 0;
              _motorNaAba = async(id, method, args)=> {
                if (method === 'facebookConta') return {ok:true,nomes:[name]};
                if (method === 'facebookEstado' && pendente > 0 && --pendente === 0) { stage++; render(); }
                if (method === 'facebookEstado' && stage === 1 && mode === 'previa_atrasada' && ++previewReads === 5) root.insertAdjacentHTML('beforeend','<video style="width:200px;height:200px"></video>');
                if (method === 'facebookEstado' && stage > 0 && mode === 'previa_fora' && !document.getElementById('feedvideo')) root.insertAdjacentHTML('afterend','<video id="feedvideo" style="width:200px;height:200px"></video>');
                if (method === 'facebookComo' && stage === 1 && video) throw new Error('checagem de autor indevida em Editar reel');
                if (method === 'facebookEstado' && stage === 1 && video) {
                  const read = SP.facebookComo;
                  SP.facebookComo = () => {throw new Error('leitura indireta de autor em Editar reel');};
                  try {return SP.facebookEstado(...args);} finally {SP.facebookComo = read;}
                }
                if (method === 'noPonto') return {ok:true, desc:'(posição simulada)'};
                if (method === 'localizar') {
                  if (args[0] === RECEITAS.facebook.perfil.alternar) return {ok:false};
                  target = args[0]; return {ok:true,idx:0,x:0,y:0};
                }
                if (method === 'anexar') {
                  if (direto) {stage = mode === 'reel_final' ? 2 : 1; render();}
                  return {ok:true};
                }
                if (method === 'sumiu') return true;
                if (method === 'facebookComo' && stage === 2 && mode === 'troca_antes_publicar' && ++finalReads >= 2) {
                  root.querySelector('[role=textbox]').insertAdjacentHTML('beforebegin','<span>Perfil Pessoal</span>');
                }
                return SP[method](...args);
              };
              try {
                const result = await prepararRede('facebook', video ? {tipo:'video/mp4',nome:'teste.mp4',b64:''} : null, caption, {
                  facebookPagina:name, facebookPaginaUrl:'https://www.facebook.com/pagina.exemplo',
                  publicar:['publicar','troca_antes_publicar','reel_publicar','reel_processando','reel_oferta','previa_fora'].includes(mode), log:s=>logs.push(s)
                });
                return {result,clicks,advances,recusou,logs};
              } finally {window.setTimeout = timeout; Date.now = now;}
            }""", mode)
            if mode in ('video', 'texto', 'publicar', 'reel_direto', 'reel_publicar', 'reel_processando', 'reel_oferta', 'reel_final', 'reel_retry', 'previa_intermediaria', 'previa_atrasada', 'transicao_lenta', 'ptpt_reel'):
                assert 'erro' not in result['result'], (mode, result)
                assert result['result']['legendaOk'], (mode, result)
                assert result['advances'] == (2 if mode == 'reel_retry' else 0 if mode == 'reel_final' else 1 if mode == 'texto' or mode.startswith('reel_') else 2), (mode, result)
            else:
                assert result['result'].get('erro') or result['result'].get('legendaOk') is False, (mode, result)
            assert result['clicks'] == (1 if mode in ('publicar','reel_publicar','reel_processando','reel_oferta') else 0), (mode, result)
            if mode == 'transicao_lenta':
                assert any('em transição' in s for s in result['logs']), result
            if mode == 'reel_oferta':
                assert result['recusou'] == 1 and result['result']['publicou'], result
                assert any('respondi «Agora não»' in s for s in result['logs']), result
            if mode in ('publicar','reel_publicar'):
                assert result['result']['publicou'], result
            if mode == 'reel_processando':
                assert result['result']['processando'] and not result['result']['publicou'], result
            if mode in ('reel_retry', 'reel_travado'):
                assert result['advances'] == 2, result
                assert any('sem transição em 5s' in s for s in result['logs']), result
            if mode == 'reel_travado':
                assert 'após duas tentativas' in result['result']['erro'], result
            if mode == 'previa_intermediaria':
                assert any('avançando apenas à revisão' in s for s in result['logs']), result
            if mode == 'previa_atrasada':
                assert any('aguardando prévia' in s for s in result['logs']), result
                assert not any('avançando apenas à revisão' in s for s in result['logs']), result
            if mode == 'previa_fora':
                assert result['result']['erro'] == 'a mídia não apareceu no post', result
                assert any('videosForaDoDialogo' in s for s in result['logs']), result
        # Avançar do diálogo superior, inclusive aria-label sem texto e div.
        for upper_z, lower_z, expected in ((20, 1, 'top'), (1, 20, 'back'), (1, 1, 'top')):
            await page.set_content(f'''<div role="dialog" style="position:relative;z-index:{lower_z}"><div role="button" id="back">Avançar</div></div>
              <div role="dialog" style="position:relative;z-index:{upper_z}"><div role="button" style="display:none">Avançar</div><div id="top" role="button" aria-label="Avançar" style="width:80px;height:30px"></div></div>
              <div role="dialog" style="display:none"><button>Avançar</button></div>''')
            located = await page.evaluate('SP.localizar(RECEITAS.facebook.avancar, 0)')
            assert located['ok'] and 'aria' in located and 'retangulo' in located, located
            center = await page.evaluate('''id => { const r = document.getElementById(id).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; }''', expected)
            assert located['x'] == center['x'] and located['y'] == center['y'], (located, center)
        # Confirmações precisam nascer depois do clique. Um botão removido,
        # um aviso antigo ou outro diálogo aberto não comprovam publicação.
        await page.set_content('<div role="dialog"><h2>Criar post</h2><span>Página Exemplo</span><textarea></textarea><button>Postar</button></div><div role="status">Seu reel foi publicado</div>')
        assert await page.evaluate('SP.facebookIniciar("Página Exemplo") && SP.facebookArmarConfirmacao()')
        await page.evaluate('document.querySelector("button").remove()')
        assert await page.evaluate('SP.facebookResultado()') is None
        await page.evaluate('document.querySelector("[role=dialog]").remove(); document.body.insertAdjacentHTML("beforeend", \'<div role="dialog">Erro no envio</div>\')')
        assert await page.evaluate('SP.facebookResultado()') is None
        await page.evaluate('document.querySelector("[role=status]").textContent = "Your reel was published"')
        assert (await page.evaluate('SP.facebookResultado()'))['publicado']
        for heading in ('Edit reel', 'Create reel', 'Criar reel', 'Reel settings'):
            await page.set_content('<div role="dialog"><h2>Criar post</h2><span>Página Exemplo</span><textarea></textarea></div>')
            assert await page.evaluate('SP.facebookIniciar("Página Exemplo")')
            state = await page.evaluate('''heading => {
              document.querySelector('[role=dialog]').innerHTML = `<h2>${heading}</h2><textarea aria-label="Describe your reel..."></textarea><button>Share now</button><video style="width:100px;height:100px"></video>`;
              return SP.facebookEstado('Página Exemplo');
            }''', heading)
            assert state['ok'] and state['etapa'] == 'final_reel', state
        # 16/11: vídeo do reel tocando, mas recusado pelo checkVisibility; o
        # controle «Pausar vídeo» do player no diálogo comprova a prévia.
        for controle, esperado in (('<div role="button" aria-label="Pausar vídeo" style="width:20px;height:20px"></div>', 1), ('', 0)):
            await page.set_content('<div role="dialog"><h2>Criar post</h2><span>Página Exemplo</span><textarea></textarea></div>')
            assert await page.evaluate('SP.facebookIniciar("Página Exemplo")')
            state = await page.evaluate('''controle => {
              document.querySelector('[role=dialog]').innerHTML = `<h2>Configurações do reel</h2><textarea aria-label="Descreva seu reel..."></textarea><div role="button">Postar</div><video style="width:100px;height:100px;opacity:0"></video>${controle}`;
              return SP.facebookEstado('Página Exemplo');
            }''', controle)
            assert state['etapa'] == 'final_reel' and state['midia'] == esperado, state
        await browser.close()
    print('OK: 21 cenários Facebook; prévia atrasada/intermediária, mídia externa bloqueada e guardas de publicação')

asyncio.run(main())
