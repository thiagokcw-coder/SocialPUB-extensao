import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.add_init_script('''window.chrome = {storage:{local:{
          get:async(defaults)=>({...defaults,personas:{p:{nome:'Teste',contas:{tiktok:{usuario:'preservado',cookies:[],salvo_em:''}}}},persona_ativa:'p'}),
          set:async data=>{if(window.failSave) throw Error('falha'); window.saved=structuredClone(data);},remove:async()=>{}
        }}};''')
        await page.goto((ROOT/'painel.html').as_uri())
        await page.locator('#contas-caixa').evaluate('(e)=>e.open=true')
        await page.wait_for_function("document.querySelector('#pers').value === 'p'")
        await page.locator('#cookies-importar').click()
        assert 'Selecione' in await page.locator('#cookies-importar-res').inner_text()
        data = json.dumps([{'domain':'.facebook.com','name':'xs','value':'fake'}, {'domain':'.x.com','name':'auth_token','value':'fake'}]).encode()
        async def upload(content):
            await page.locator('#cookies-txt').set_input_files({'name':'contas.txt','mimeType':'text/plain','buffer':content})
            await page.locator('#cookies-importar').click()
            await page.wait_for_function("!document.querySelector('#cookies-importar').disabled && document.querySelector('#cookies-importar-res').textContent.length > 0")
        await upload(data)
        await page.wait_for_function("window.saved?.personas.p.contas.facebook")
        assert 'Importado para' in await page.locator('#cookies-importar-res').inner_text()
        assert await page.evaluate("saved.personas.p.contas.tiktok.usuario") == 'preservado'
        assert await page.locator('#cookies-txt').input_value() == ''
        await upload(b'sessionid=NAO_EXIBIR')
        assert 'Não importado' in await page.locator('#cookies-importar-res').inner_text()
        assert 'NAO_EXIBIR' not in await page.locator('#cookies-importar-res').inner_text()
        await page.evaluate('window.failSave=true')
        await upload(json.dumps([{'domain':'.instagram.com','name':'sessionid','value':'fake'}]).encode())
        assert 'não foi possível salvar' in await page.locator('#cookies-importar-res').inner_text()
        assert await page.evaluate('!PERSONAS.p.contas.instagram')
        assert not errors, errors
        await browser.close()
    print('OK: painel importa TXT, preserva outras contas e trata arquivo inválido e falha de armazenamento')
asyncio.run(main())
