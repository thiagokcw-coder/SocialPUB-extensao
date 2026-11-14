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
        for mode in ('video', 'texto', 'sem_midia', 'perde_midia', 'outro_autor', 'troca_dialogo', 'legenda_perdida', 'publicar', 'troca_antes_publicar'):
            await page.set_content('<div role="dialog" id="fluxo"></div>')
            result = await page.evaluate("""async mode => {
              const caption = 'Legenda de teste', name = 'Página Exemplo';
              const video = mode !== 'texto';
              let stage = 0, target = null, clicks = 0, advances = 0, logs = [];
              const root = document.getElementById('fluxo');
              const render = () => {
                const heading = stage === 0 ? 'Criar post' : stage === 1 && video ? 'Editar reel' : video ? 'Configurações do reel' : 'Configurações do post';
                const final = stage === (video ? 2 : 1);
                const author = mode === 'outro_autor' && final ? 'Perfil Pessoal' : name;
                const media = video && mode !== 'sem_midia' && !(mode === 'perde_midia' && final) ? '<video style="width:200px;height:200px"></video>' : '';
                const text = mode === 'legenda_perdida' && final ? '' : caption;
                root.innerHTML = `<h2>${heading}</h2>` + (stage === 0 || mode === 'outro_autor' ? `<span>${author}</span>` : '')
                  + (stage === 0 || (final && video) ? `<div role="textbox" contenteditable="true" style="height:50px">${stage === 0 ? '' : text}</div>` : final ? `<section>${text}</section>` : '<input aria-label="Adicionar tags">')
                  + media + `<button>${final ? 'Postar' : 'Avançar'}</button>`;
              };
              render();
              const timeout = window.setTimeout;
              window.setTimeout = cb => { queueMicrotask(cb); return 0; };
              window.chrome = {debugger:{attach:async()=>{},detach:async()=>{},sendCommand:async()=>{},onDetach:{addListener(){},removeListener(){}}}};
              _motorAbrirAba = async()=>1;
              window.spEscreverTeclas = async()=> {root.querySelector('[role=textbox]').innerText = caption;};
              window.spClicarEm = async()=> {
                if (target === RECEITAS.facebook.avancar) {
                  advances++; stage++; render();
                  if (mode === 'troca_dialogo') root.replaceWith(root.cloneNode(true));
                }
                if (target === RECEITAS.facebook.publicar) clicks++;
              };
              let finalReads = 0;
              _motorNaAba = async(id, method, args)=> {
                if (method === 'localizar') {
                  if (args[0] === RECEITAS.facebook.perfil.alternar) return {ok:false};
                  target = args[0]; return {ok:true,idx:0,x:0,y:0};
                }
                if (method === 'anexar') return {ok:true};
                if (method === 'sumiu') return true;
                if (method === 'facebookComo' && stage === 2 && mode === 'troca_antes_publicar' && ++finalReads >= 2) {
                  root.querySelector('[role=textbox]').insertAdjacentHTML('beforebegin','<span>Perfil Pessoal</span>');
                }
                return SP[method](...args);
              };
              try {
                const result = await prepararRede('facebook', video ? {tipo:'video/mp4',nome:'teste.mp4',b64:''} : null, caption, {
                  facebookPagina:name, facebookPaginaUrl:'https://www.facebook.com/pagina.exemplo',
                  publicar:mode === 'publicar' || mode === 'troca_antes_publicar', log:s=>logs.push(s)
                });
                return {result,clicks,advances,logs};
              } finally {window.setTimeout = timeout;}
            }""", mode)
            if mode in ('video', 'texto', 'publicar'):
                assert 'erro' not in result['result'], (mode, result)
                assert result['result']['legendaOk'], (mode, result)
                assert result['advances'] == (1 if mode == 'texto' else 2), (mode, result)
            else:
                assert result['result'].get('erro') or result['result'].get('legendaOk') is False, (mode, result)
            assert result['clicks'] == (1 if mode == 'publicar' else 0), (mode, result)
            if mode == 'publicar':
                assert result['result']['publicacaoIncerta'] and not result['result']['publicou'], result
        await browser.close()
    print('OK: 9 cenários do fluxo Facebook, mídia, identidade, legenda e publicação incerta')

asyncio.run(main())
