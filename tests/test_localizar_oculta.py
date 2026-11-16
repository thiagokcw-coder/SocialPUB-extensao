"""localizar não trava quando o requestAnimationFrame não dispara (aba oculta).

Executar: python tests/test_localizar_oculta.py (requer Playwright).
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        page = await b.new_page()
        await page.set_content('<a style="display:block;width:40px;height:40px"><svg aria-label="New post"></svg></a>')
        await page.add_script_tag(content=(ROOT / 'pagina.js').read_text(encoding='utf-8'))
        r = await page.evaluate('''async () => {
          window.requestAnimationFrame = () => 0;   // aba oculta: nenhum quadro
          const t = performance.now();
          const a = await SP.localizar(['a:has(svg[aria-label="New post"])'], 1000);
          return {ok: a.ok, ms: performance.now() - t};
        }''')
        assert r['ok'] and r['ms'] < 2000, r
        print('OK: localizar responde sem requestAnimationFrame (%.0f ms)' % r['ms'])
        await b.close()

asyncio.run(main())
