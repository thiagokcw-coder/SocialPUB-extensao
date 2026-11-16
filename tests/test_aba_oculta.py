"""Aba oculta: opacidade congelada em 0 não esconde o diálogo; aba visível continua exigindo opacidade.

Executar: python tests/test_aba_oculta.py (requer Playwright).
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        page = await b.new_page()
        await page.set_content('<div role="dialog" style="opacity:0;width:200px;height:100px"><div data-testid="tweetTextarea_0" style="height:40px"></div></div>'
                               '<div id="oculto" role="dialog" style="display:none">x</div>')
        await page.add_script_tag(content=(ROOT / 'pagina.js').read_text(encoding='utf-8'))
        sel = ['[role=dialog] div[data-testid="tweetTextarea_0"]']
        assert not await page.evaluate('s => SP.existe(s)', sel)
        await page.evaluate("Object.defineProperty(document, 'visibilityState', {get: () => 'hidden'})")
        assert await page.evaluate('s => SP.existe(s)', sel)
        assert not await page.evaluate("SP.existe(['#oculto'])")
        e = await page.evaluate('SP.estadoAba()')
        assert e['visibilidade'] == 'hidden', e
        print('OK: aba oculta ignora só a opacidade; aba visível continua exigindo')
        await b.close()

asyncio.run(main())
