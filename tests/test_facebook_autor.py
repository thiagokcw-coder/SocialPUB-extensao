"""python tests/test_facebook_autor.py (Playwright + Chrome).

Réplicas locais do compositor; nenhuma conta é acessada ou publicada.
"""
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PAGE = 'Página Exemplo'
OTHER = 'Perfil Pessoal'
EDITOR = '<div role="textbox" contenteditable="true" style="min-height:40px">Legenda</div>'


def composer(header='', editor=EDITOR, after=''):
    return f'<div role="dialog">{header}{editor}{after}</div>'


async def main():
    cases = []
    for tag in ('span', 'strong', 'a', 'div role="link"'):
        close = tag.split()[0]
        cases.append((f'autor {tag}', composer(f'<header><{tag}>{PAGE.upper()}</{close}></header>'), True))
        cases.append((f'outro autor {tag}', composer(f'<header><{tag}>{OTHER}</{close}></header>'), False))
    for label in (f'No que você está pensando, {PAGE}?', f"What's on your mind, {PAGE}?",
                  f'Em que estás a pensar, {PAGE}?'):
        for attr in ('aria-label', 'placeholder'):
            editor = f'<textarea {attr}="{label}"></textarea>'
            cases.append((f'editor {attr} {label}', composer(editor=editor), True))
            cases.append((f'autor conflitante {label}', composer(f'<span>{OTHER}</span>', editor), False))
    for attr in ('alt', 'aria-label'):
        image = f'<img {attr}="{PAGE}" width="40" height="40">'
        cases.append((f'avatar {attr}', composer(image), True))
        cases.append((f'avatar conflitante {attr}', composer(image + f'<strong>{OTHER}</strong>'), False))
    for prefix in ('Posting as', 'Publicar como', 'Publicando como', 'A publicar como'):
        cases.append((prefix, composer(f'<span>{prefix}: {PAGE}</span>'), True))
    cases.extend([
        ('autor e pergunta concordam', composer(f'<span>{PAGE}</span>',
          f'<div role="textbox" contenteditable="true" aria-label="No que você está pensando, {PAGE}?" style="min-height:40px"></div>'), True),
        ('nome apenas na legenda', composer(editor=EDITOR.replace('Legenda', f'<strong>{PAGE}</strong>')), False),
        ('rótulo falso na legenda', composer(editor=EDITOR.replace('Legenda', f'<span>Posting as {PAGE}</span>')), False),
        ('nome apenas no feed', f'<span>{PAGE}</span>' + composer(), False),
        ('nome após editor', composer(after=f'<span>{PAGE}</span>'), False),
        ('avatar após editor', composer(after=f'<img alt="{PAGE}" width="40" height="40">'), False),
        ('nome em outro diálogo', composer() + f'<div role="dialog"><strong>{PAGE}</strong></div>', False),
        ('nome em diálogo aninhado', composer(after=f'<div role="dialog"><strong>{PAGE}</strong></div>'), False),
        ('autor oculto', composer(f'<span style="display:none">{PAGE}</span>'), False),
        ('outro autor oculto', composer(f'<span>{PAGE}</span><span style="display:none">{OTHER}</span>'), True),
        ('título e audiência não são autores', composer(f'<h2><span>Criar publicação</span></h2><span>{PAGE}</span><button><span>Público</span></button>'), True),
        ('avatar clicável', composer(f'<button><img alt="{PAGE}" width="40" height="40"></button>'), True),
        ('autor clicável conflitante', composer(f'<div role="button"><img width="40" height="40"><span>{OTHER}</span></div>',
          f'<textarea placeholder="No que você está pensando, {PAGE}?"></textarea>'), False),
        ('dois compositores conflitantes', composer(f'<span>{PAGE}</span>') + composer(f'<span>{OTHER}</span>'), False),
        ('sem nome', composer(), False),
    ])
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        page = await browser.new_page()
        await page.add_script_tag(content=(ROOT / 'pagina.js').read_text(encoding='utf-8'))
        for label, html, expected in cases:
            await page.set_content(html)
            result = await page.evaluate('(name) => SP.facebookComo(name)', PAGE)
            assert result['ok'] is expected, (label, result)
            if 'conflitante' in label:
                assert OTHER in result['nomes'], (label, result)
        for script in ('receitas.js', 'motor.js'):
            await page.add_script_tag(content=(ROOT / script).read_text(encoding='utf-8'))
        # Motor real com transporte e cliques simulados. Verifica o bloqueio
        # antes do preparo, na conferência e imediatamente antes de publicar.
        for stage in (1, 2, 3):
            await page.set_content(composer(f'<span id="autor">{PAGE}</span>'))
            result = await page.evaluate("""async ([name, other, stage]) => {
              const logs = []; let reads = 0, publishClicks = 0, publishing = false;
              const realTimeout = window.setTimeout;
              window.setTimeout = cb => { queueMicrotask(cb); return 0; };
              window.chrome = { debugger: {
                attach: async () => {}, detach: async () => {}, sendCommand: async () => {},
                onDetach: {addListener() {}, removeListener() {}}
              }};
              _motorAbrirAba = async () => 1;
              window.spClicarEm = async () => { if (publishing) publishClicks++; };
              _motorNaAba = async (id, method, args) => {
                if (method === 'facebookComo') {
                  if (++reads === stage) document.getElementById('autor').textContent = other;
                  return SP.facebookComo(args[0]);
                }
                if (method === 'localizar') {
                  publishing = args[0] === RECEITAS.facebook.publicar;
                  return {ok: true, idx: 0, x: 0, y: 0};
                }
                if (method === 'existe' || method === 'sumiu') return true;
                if (method === 'ler') return {texto: '', botao: {existe: true, habilitado: true}};
                if (method === 'botao') return {existe: true, habilitado: true};
                return null;
              };
              try {
                const result = await prepararRede('facebook', null, '', {
                  facebookPagina: name, publicar: true, log: s => logs.push(s)
                });
                return {result, logs, publishClicks, reads};
              } finally { window.setTimeout = realTimeout; }
            }""", [PAGE, OTHER, stage])
            assert result['result']['erro'] == f'Facebook não está como a página {PAGE}', result
            assert result['publishClicks'] == 0 and result['reads'] == stage, result
            assert any('autores encontrados' in s and OTHER in s for s in result['logs']), result
        await browser.close()
    print(f'OK: {len(cases)} cenários de identificação + 3 bloqueios e logs no motor')


asyncio.run(main())
