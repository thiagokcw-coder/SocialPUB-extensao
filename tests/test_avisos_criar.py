"""Aviso por cima da tela antes de criar (Instagram «Turn on Notifications»).

Executar: python tests/test_avisos_criar.py (requer Playwright). Réplica local, cliques reais via CDP.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """
<a id="criar" style="display:block;width:60px;height:40px" href="#"><svg aria-label="New post" width="20" height="20"></svg></a>
<div id="aviso" role="dialog" style="position:fixed;inset:0;background:#0008">
  <div>Turn on Notifications</div><button style="width:120px;height:30px">Turn On</button><button style="width:120px;height:30px">Not Now</button>
</div>
<script>
window.ativou = 0;
document.querySelector('#aviso button').onclick = () => ativou++;
document.querySelectorAll('#aviso button')[1].onclick = () => document.getElementById('aviso').remove();
document.getElementById('criar').onclick = e => { e.preventDefault();
  if (document.getElementById('aviso')) return;   // o aviso engole o clique
  const d = document.createElement('div'); d.setAttribute('role','dialog'); d.setAttribute('aria-label','Create new post');
  d.innerHTML = '<div style="width:200px;height:100px">Create new post</div>'; document.body.append(d); };
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


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=True)
        page = await b.new_page()
        session = await page.context.new_cdp_session(page)
        await page.expose_function('cdp', lambda m, params: session.send(m, params))
        await page.set_content(HTML)
        await page.add_script_tag(content=MOCK)
        for name in ('pagina.js', 'receitas.js', 'arquivo.js', 'teclado.js', 'personas.js', 'cookies.js', 'motor.js'):
            await page.add_script_tag(content=(ROOT / name).read_text(encoding='utf-8'))
        r = await page.evaluate("""() => prepararRede('instagram', {nome:'v.mp4', tipo:'video/mp4', b64:''}, '', {publicar:false, log: s => logs.push(s)})""")
        logs = await page.evaluate('logs')
        assert any('fechei um aviso' in s and 'Not Now' in s for s in logs), logs
        assert any('✓ compositor aberto' in s for s in logs), logs
        assert await page.evaluate('ativou') == 0
        print('OK: aviso de notificações recusado («Not Now», nunca «Turn On») e compositor aberto')
        await b.close()

asyncio.run(main())
