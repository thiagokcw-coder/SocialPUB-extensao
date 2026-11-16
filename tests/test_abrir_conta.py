import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.add_init_script('''window.events=[]; window.chrome={
          storage:{local:{get:async defaults=>({...defaults,personas:{p:{nome:'Teste',contas:{}}},persona_ativa:'p'}),set:async()=>{}}},
          tabs:{create:async tab=>{events.push(['abrir',tab.url]); return {id:1};}}
        };''')
        await page.goto((ROOT/'painel.html').as_uri())
        await page.wait_for_function("document.querySelector('#pers').value === 'p'")
        await page.locator('#contas-caixa').evaluate('(e)=>e.open=true')
        assert await page.locator('.abrir-conta:disabled').count() == 5
        await page.evaluate('''() => {
          for(const rede of ORDEM_REDES) PERSONAS.p.contas[rede]={cookies:[{name:'fake',value:rede}],usuario:'',salvo_em:''};
          spEntrar=async(rede,cookies)=>{events.push(['sessao',rede,cookies[0].value]);
            if(window.throwSession) throw Error('falha simulada');
            return {entrou:!window.failSession,gravados:1,recusados:window.failSession?[{}]:[]};};
          desenharContas();
        }''')
        assert await page.locator('#contas button:visible').count() == 5
        assert await page.locator('#contas .entrar, #contas .abrir').count() == 0
        await page.locator('.conta[data-rede="instagram"] .conta-gerenciar > summary').click()
        await page.locator('.conta[data-rede="instagram"] details.conta-metodo > summary').click()
        await page.locator('.conta[data-rede="instagram"] .ck').fill('[{"domain":".instagram.com","name":"sessionid","value":"fake"}]')
        await page.evaluate('events=[]')
        await page.locator('.conta[data-rede="instagram"] .salvar').click()
        await page.wait_for_function("document.querySelector('.conta[data-rede=instagram] .res').textContent.includes('Cookies salvos')")
        assert await page.evaluate('events.length') == 0
        await page.locator('.conta[data-rede="instagram"] .conta-gerenciar > summary').click()
        await page.set_viewport_size({'width':390,'height':844})
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        await page.set_viewport_size({'width':1280,'height':900})
        await page.evaluate("PERSONAS.p.contas.instagram.cookies=[{name:'fake',value:'instagram'}]; desenharContas()")
        await page.evaluate("PERSONAS.p.facebook_pagina_url='https://www.facebook.com/outrapagina'")
        urls = {'x':'https://x.com/', 'instagram':'https://www.instagram.com/', 'tiktok':'https://www.tiktok.com/',
                'threads':'https://www.threads.com/', 'facebook':'https://www.facebook.com/outrapagina'}
        for rede,url in urls.items():
            await page.evaluate('events=[]')
            button=page.locator(f'.conta[data-rede="{rede}"] .abrir-conta')
            await button.click()
            await page.wait_for_function('events.length === 2')
            assert await page.evaluate('events') == [['sessao',rede,rede],['abrir',url]]
            assert await button.is_enabled()
        for flag in ('failSession','throwSession'):
            await page.evaluate(f'events=[]; window.{flag}=true')
            await page.locator('.conta[data-rede="x"] .abrir-conta').click()
            await page.wait_for_function("!document.querySelector('.conta[data-rede=x] .abrir-conta').disabled")
            assert await page.evaluate('events.length') == 1
            await page.evaluate(f'window.{flag}=false')
        assert not errors, errors
        await browser.close()
    print('OK: abrir conta nas cinco redes aplica sessão antes de abrir; ausência, recusa e erro tratados')
asyncio.run(main())
