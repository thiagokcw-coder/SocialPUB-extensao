"""Avatar da conta com rótulo genérico «Seu perfil»: confirma pela foto.

Executar: python tests/test_facebook_conta_foto.py (requer Playwright).
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
FOTO = 'https://scontent.xx.fbcdn.net/v/t39/{tam}/111_222_n.jpg?stp=x'
OUTRA = 'https://scontent.xx.fbcdn.net/v/t39/s40x40/999_888_n.jpg?stp=y'


def html(conta, pagina_foto=True, rotulo='Seu perfil'):
    acoes = (f'<div aria-label="Ações da foto do perfil" role="button"><svg width="160" height="160">'
             f'<image xlink:href="{FOTO.format(tam="s160x160")}" width="160" height="160"></image></svg></div>') if pagina_foto else ''
    return f'''<div role="banner"><div role="button" aria-label="Conta, seu perfil" style="width:40px;height:40px">
      <svg aria-label="{rotulo}" role="img" width="40" height="40"><image xlink:href="{conta}" width="40" height="40"></image></svg></div></div>
      <div role="main">{acoes}</div>'''


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        page = await b.new_page()

        async def conta(h):
            await page.set_content(h)
            await page.add_script_tag(content=(ROOT / 'pagina.js').read_text(encoding='utf-8'))
            return await page.evaluate("SP.facebookConta('Uncensored Brasil')")

        r = await conta(html(FOTO.format(tam='s40x40')))
        assert r['ok'] and r['via'] == 'foto', r
        r = await conta(html(OUTRA))
        assert not r['ok'], r
        r = await conta(html(FOTO.format(tam='s40x40'), pagina_foto=False))
        assert not r['ok'], r
        r = await conta(html(OUTRA, rotulo='Uncensored Brasil'))
        assert r['ok'] and r['via'] == 'nome', r
        r = await conta(html(FOTO.format(tam='s40x40'), rotulo='Fulano'))
        assert not r['ok'], r
        print('OK: avatar genérico confirmado pela foto; outra foto, sem foto da Página e outro nome bloqueados')
        await b.close()

asyncio.run(main())
