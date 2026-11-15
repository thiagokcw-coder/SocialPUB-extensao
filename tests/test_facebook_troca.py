"""Troca de identidade antes do compositor, em DOM local sem contas reais."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page()
        for script in ('pagina.js', 'receitas.js', 'personas.js', 'motor.js'):
            await page.add_script_tag(content=(ROOT / script).read_text(encoding='utf-8'))
        for mode in ('Trocar agora', 'Switch now', 'Alternar', 'Switch', 'persistente', 'sem_botao', 'ja_pagina', 'pessoal', 'sem_avatar', 'navegacao'):
            await page.set_content('<main role="main"></main>')
            result = await page.evaluate("""async mode => {
              const main = document.querySelector('main'), clicks = [], logs = [];
              const name = 'Uncensored Brasil';
              const banner = mode.startsWith('Switch') ? "Switch into Página Exemplo's Page to start managing it." : 'Troque para a Página de Página Exemplo para começar a gerenciá-la.';
              const button = ['persistente', 'sem_botao'].includes(mode) ? 'Trocar agora' : mode;
              const ready = () => {
                main.innerHTML = (mode === 'sem_avatar' ? '' : `<div role="banner"><button aria-label="Conta, seu perfil"><img alt="${mode === 'pessoal' ? 'Pessoa' : name}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="width:40px;height:40px"></button></div>`) + '<button id="create">No que você está pensando?</button>';
                document.getElementById('create').onclick = () => {
                  clicks.push('criar'); main.innerHTML = '<div role="dialog"><div role="textbox" contenteditable="true">Teste</div></div>';
                };
              };
              let switched = false, polls = 0;
              if (['ja_pagina', 'pessoal', 'sem_avatar', 'navegacao'].includes(mode)) ready();
              else {
                main.innerHTML = `<div><span>${banner}</span></div>` + (mode === 'sem_botao' ? '' : `<button id="switch">${button}</button>`);
                const sw = document.getElementById('switch');
                if (sw) sw.onclick = () => { clicks.push('trocar'); switched = true; };
              }
              const diagnostic = SP.medir();
              const timeout = window.setTimeout, now = Date.now;
              let clock = 0;
              Date.now = () => clock;
              window.setTimeout = (cb, ms) => {clock += ms || 1; queueMicrotask(cb); return 0;};
              window.chrome = {debugger:{attach:async()=>{},detach:async()=>{},sendCommand:async()=>{},onDetach:{addListener(){},removeListener(){}}}};
              _motorAbrirAba = async()=>1;
              _motorLimparFacebook = async()=>{};
              chrome.storage = { session: { set: async()=>{} } };
              let onUpdated;
              chrome.tabs = { onUpdated: {addListener(fn){onUpdated=fn;},removeListener(){}} };
              _motorPrazo = (p) => p;
              window.spClicarEm = async(cmd,x,y)=>document.elementFromPoint(x,y).click();
              _motorNaAba = async(id, method, args)=> {
                if (mode === 'navegacao' && method === 'existe') onUpdated(1, {status:'loading'});
                if (method === 'facebookBanner' && switched && mode !== 'persistente' && ++polls === 3) ready();
                // Parar após abrir: este teste cobre a troca; os demais testes
                // cobrem o autor, mídia e os passos de publicação.
                if (method === 'facebookComo') return {ok:false, nomes:['fim do teste']};
                return SP[method](...args);
              };
              try {
                const result = await prepararRede('facebook', null, '', {
                  facebookPagina:name,facebookPaginaUrl:'https://www.facebook.com/pagina.exemplo',publicar:false,log:s=>logs.push(s)
                });
                return {result, clicks, polls, diagnostic, logs};
              } finally { window.setTimeout = timeout; Date.now = now; }
            }""", mode)
            if mode in ('persistente', 'sem_botao'):
                assert result['result']['erro'] == 'não consegui trocar para a Página Uncensored Brasil', result
                assert 'criar' not in result['clicks'], result
                assert result['result']['diagnostico']['facebook_banner_troca'], result
            elif mode == 'navegacao':
                assert 'navegou' in result['result']['erro'], result
                assert result['clicks'] == [], result
            elif mode in ('pessoal', 'sem_avatar'):
                assert 'avatar' in result['result']['erro'], result
                assert result['clicks'] == [], result
            elif mode == 'ja_pagina':
                assert result['clicks'] == ['criar'], result
            else:
                assert result['clicks'] == ['trocar', 'criar'] and result['polls'] >= 3, result
            assert bool(result['diagnostic']['facebook_banner_troca']) == (mode not in ('ja_pagina', 'pessoal', 'sem_avatar', 'navegacao')), result
        # Feed e texto oculto não devem ser confundidos com o banner de troca.
        await page.set_content('<article><span>Troque para a Página de Exemplo</span></article><span hidden>Troque para a Página de Exemplo</span>')
        assert await page.evaluate('SP.facebookBanner()') == []
        await browser.close()
    print('OK: 10 cenários de troca, espera, ordem dos cliques e diagnóstico; feed/ocultos ignorados')

asyncio.run(main())
