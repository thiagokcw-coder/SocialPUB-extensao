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
        for mode in ('video', 'texto', 'sem_midia', 'perde_midia', 'outro_autor', 'troca_dialogo', 'legenda_perdida', 'publicar', 'troca_antes_publicar', 'reel_direto', 'reel_publicar', 'reel_processando', 'reel_final'):
            await page.set_content('<div role="dialog" id="fluxo"></div>')
            result = await page.evaluate("""async mode => {
              const caption = 'Legenda de teste', name = 'Página Exemplo';
              const video = mode !== 'texto';
              const direto = mode.startsWith('reel_');
              let stage = 0, target = null, clicks = 0, advances = 0, logs = [];
              const root = document.getElementById('fluxo');
              const render = () => {
                const heading = stage === 0 ? 'Criar post' : stage === 1 && video ? 'Editar reel' : video ? 'Configurações do reel' : 'Configurações do post';
                const final = stage === (video ? 2 : 1);
                const author = mode === 'outro_autor' && final ? 'Perfil Pessoal' : name;
                const media = video && mode !== 'sem_midia' && !(mode === 'perde_midia' && final) ? '<video style="width:200px;height:200px"></video>' : '';
                const text = (mode === 'legenda_perdida' || direto) && final ? '' : caption;
                root.innerHTML = `<h2>${heading}</h2>` + (stage === 0 || mode === 'outro_autor' ? `<span>${author}</span>` : '')
                  + (direto && final ? `<textarea placeholder="Descreva seu reel...">${text}</textarea>` : stage === 0 || (final && video) ? `<div role="textbox" contenteditable="true" style="height:50px">${stage === 0 ? '' : text}</div>` : final ? `<section>${text}</section>` : '<input role="textbox" aria-label="Adicionar tags">')
                  + media + `<button>${final ? 'Postar' : 'Avançar'}</button>`;
              };
              render();
              const timeout = window.setTimeout;
              window.setTimeout = cb => { queueMicrotask(cb); return 0; };
              window.chrome = {debugger:{attach:async()=>{},detach:async()=>{},sendCommand:async()=>{},onDetach:{addListener(){},removeListener(){}}}};
              _motorAbrirAba = async()=>1;
              window.spLimparCampo = async()=> {};
              window.spEscreverTeclas = async()=> {
                if (direto && stage !== 2) throw new Error('escreveu antes da descrição');
                const ed = root.querySelector('textarea, [role=textbox]');
                if (ed.tagName === 'TEXTAREA') ed.value = caption; else ed.innerText = caption;
              };
              window.spClicarEm = async()=> {
                if (target === RECEITAS.facebook.avancar) {
                  advances++; stage++; render();
                  if (mode === 'troca_dialogo') root.replaceWith(root.cloneNode(true));
                }
                if (target === RECEITAS.facebook.publicar) {
                  clicks++;
                  if (mode === 'reel_processando') root.insertAdjacentHTML('afterend','<div role="status">Seu reel está sendo processado</div>');
                  else root.remove();
                }
              };
              let finalReads = 0;
              _motorNaAba = async(id, method, args)=> {
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
                  publicar:['publicar','troca_antes_publicar','reel_publicar','reel_processando'].includes(mode), log:s=>logs.push(s)
                });
                return {result,clicks,advances,logs};
              } finally {window.setTimeout = timeout;}
            }""", mode)
            if mode in ('video', 'texto', 'publicar', 'reel_direto', 'reel_publicar', 'reel_processando', 'reel_final'):
                assert 'erro' not in result['result'], (mode, result)
                assert result['result']['legendaOk'], (mode, result)
                assert result['advances'] == (0 if mode == 'reel_final' else 1 if mode == 'texto' or mode.startswith('reel_') else 2), (mode, result)
            else:
                assert result['result'].get('erro') or result['result'].get('legendaOk') is False, (mode, result)
            assert result['clicks'] == (1 if mode in ('publicar','reel_publicar','reel_processando') else 0), (mode, result)
            if mode in ('publicar','reel_publicar'):
                assert result['result']['publicou'], result
            if mode == 'reel_processando':
                assert result['result']['processando'] and not result['result']['publicou'], result
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
        await browser.close()
    print('OK: 13 cenários do fluxo Facebook, reel direto, descrição, publicação e processamento')

asyncio.run(main())
