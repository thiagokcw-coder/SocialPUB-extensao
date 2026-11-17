"""Instagram: «Next» da tela Edit que não pega no 1º clique (16/11, 0.8.36).

O motor deve clicar de novo SÓ se o mesmo botão continua na tela, e chegar à
legenda. Executar: python tests/test_instagram_passos.py (requer Playwright).
Réplica local, cliques reais via CDP; não publica (publicar:false).
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """
<a id="criar" style="display:block;width:60px;height:40px" href="#"><svg aria-label="New post" width="20" height="20"></svg></a>
<script>
window.cliquesNext = 0;
const btn = (t, f) => { const b = document.createElement('div'); b.setAttribute('role','button');
  b.style.cssText = 'display:inline-block;width:90px;height:30px'; b.textContent = t; b.onclick = f; return b; };
let d;
const tela = (rotulo, ...filhos) => { d.setAttribute('aria-label', rotulo); d.replaceChildren(...filhos); };
const legenda = () => { const c = document.createElement('div'); c.setAttribute('aria-label','Add a caption...');
  c.setAttribute('role','textbox'); c.contentEditable = 'true'; c.style.cssText = 'width:200px;height:60px';
  tela('Create new post', c, btn('Share', () => {})); };
const editar = () => tela('Edit', btn('Next', () => { if (++cliquesNext >= window.MODO) legenda(); }));
const corte = () => {
  const s = document.createElement('button'); s.style.cssText = 'width:40px;height:40px';
  s.innerHTML = '<svg aria-label="Select crop" width="20" height="20"></svg>';
  s.onclick = () => d.append(btn('Original', () => {}));
  tela('Crop', s, btn('Next', editar));
};
document.getElementById('criar').onclick = e => { e.preventDefault();
  d = document.createElement('div'); d.setAttribute('role','dialog');
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'video/mp4'; f.onchange = corte;
  tela('Create new post', f); document.body.append(d); };
</script>
"""
MOCK = """
window.logs = [];
window.chrome = {
  tabs: { create: async () => ({id: 1}), get: async () => ({status: 'complete'}), update: async () => ({}),
    onUpdated: {addListener() {}, removeListener() {}} },
  scripting: {executeScript: async o => [{result: o.files ? null : await o.func(...o.args)}]},
  debugger: {attach: async () => {}, detach: async () => {}, onDetach: {addListener() {}, removeListener() {}},
    sendCommand: async (target, method, params) => cdp(method, params)}
};
"""


async def rodar(b, modo, arquivo):
    page = await b.new_page()
    session = await page.context.new_cdp_session(page)

    async def cdp(m, params):
        if m == 'DOM.setFileInputFiles':
            params = {**params, 'files': [arquivo]}
        return await session.send(m, params)
    await page.expose_function('cdp', cdp)
    await page.set_content(HTML)
    await page.evaluate(f'window.MODO = {modo}')
    await page.add_script_tag(content=MOCK)
    for name in ('pagina.js', 'receitas.js', 'arquivo.js', 'teclado.js', 'personas.js', 'cookies.js', 'motor.js'):
        await page.add_script_tag(content=(ROOT / name).read_text(encoding='utf-8'))
    r = await page.evaluate("""() => prepararRede('instagram', {nome:'v.mp4', tipo:'video/mp4', b64:'AAAA'}, '', {publicar:false, log: s => logs.push(s)})""")
    out = r, await page.evaluate('logs'), await page.evaluate('cliquesNext')
    await page.close()
    return out


async def main():
    arquivo = str(Path(__file__).resolve())   # qualquer arquivo real serve à réplica
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        r, logs, n = await rodar(b, 1, arquivo)
        assert any('✓ passo «editar»' in s for s in logs), (r, logs)
        assert n == 1 and not any('cliquei de novo' in s for s in logs), (n, logs)
        r, logs, n = await rodar(b, 2, arquivo)
        assert any('cliquei de novo' in s for s in logs), (r, logs)
        assert any('✓ passo «editar»' in s for s in logs), (r, logs)
        assert n == 2, (n, logs)
        print('OK: Instagram — Next da tela Edit clicado de novo só quando a tela não mudou')
        await b.close()

asyncio.run(main())
