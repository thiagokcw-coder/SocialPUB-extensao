"""SP.noPonto: o clique só vale se o ponto cair NO botão (18/11, Facebook).

Executar: python tests/test_no_ponto.py (requer Playwright). Só DOM local.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """
<div role="dialog" style="position:relative;width:400px;height:300px">
  <div id="opcoes" style="position:absolute;left:0;top:0;width:400px;height:200px">Adicionar tags Encurtar vídeo Legendas</div>
  <div role="button" id="avancar" style="position:absolute;left:0;top:250px;width:300px;height:36px">Avançar</div>
  <div style="position:absolute;left:0;top:200px;width:300px;height:40px">
    <div role="textbox" contenteditable="true" aria-label="Descreva seu reel" style="width:300px;height:40px"></div>
    <div id="ph" style="position:absolute;left:0;top:0;width:300px;height:40px">Descreva seu reel...</div>
  </div>
</div>
<div id="fora" style="position:fixed;left:500px;top:0;width:100px;height:100px">feed</div>
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        page = await b.new_page()
        await page.set_content(HTML)
        await page.add_script_tag(content=(ROOT / 'pagina.js').read_text(encoding='utf-8'))
        botao = "[{css:'[role=\"dialog\"] [role=\"button\"]', texto:'Avançar'}]"
        campo = "['[role=\"dialog\"] [role=\"textbox\"]']"
        r = lambda c, x, y: page.evaluate(f"SP.noPonto({c}, {x}, {y})")
        assert (await r(botao, 150, 268))['ok']                      # no botão
        no = await r(botao, 150, 100)                                  # outro elemento do diálogo
        assert not no['ok'] and 'Adicionar tags' in no['desc'], no
        assert not (await r(botao, 550, 50))['ok']                     # fora do diálogo
        assert (await r(campo, 150, 220))['ok']                        # placeholder por cima do campo
        assert not (await r(campo, 550, 50))['ok']                     # campo, mas ponto fora
        print('OK: noPonto — só o botão vale; placeholder por cima do campo é aceito')
        await b.close()

asyncio.run(main())
