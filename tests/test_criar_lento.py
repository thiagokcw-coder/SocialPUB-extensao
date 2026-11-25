"""Facebook: o diálogo «Criar post» abre vazio e o campo demora (25/11).

O motor NÃO pode clicar em criar de novo (cairia atrás do diálogo): espera o
campo. Executar: python tests/test_criar_lento.py (requer Playwright).
Réplica local, cliques reais via CDP; a troca de Página fica de fora.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """
<div id="criar" role="button" style="display:block;width:300px;height:40px">No que você está pensando?</div>
<script>
window.cliquesCriar = 0;
document.getElementById('criar').onclick = () => {
  cliquesCriar++;
  if (document.querySelector('[role=dialog]')) return;
  const d = document.createElement('div'); d.setAttribute('role','dialog');
  d.style.cssText = 'position:fixed;left:0;top:0;width:600px;height:400px;background:#fff';
  d.innerHTML = '<h2>Criar post</h2><div role="button" aria-label="Fechar" style="width:30px;height:30px"></div>';
  document.body.append(d);
  setTimeout(() => d.insertAdjacentHTML('beforeend', '<div role="textbox" contenteditable="true" style="width:300px;height:60px"></div>'), 12000);
};
</script>
"""
MOCK = """
window.logs = [];
window.chrome = {
  tabs: { create: async () => ({id: 1}), get: async () => ({status: 'complete'}), update: async () => ({}),
    query: async () => [], onUpdated: {addListener() {}, removeListener() {}} },
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
        # Só a abertura do compositor: sem troca de Página nem fluxo de reel.
        await page.evaluate("""() => { const R = RECEITAS.facebook; delete R.perfil; delete R.fluxo_facebook;
          window._motorLimparFacebook = async () => {}; }""")
        await page.evaluate("""() => prepararRede('facebook', null, '', {publicar:false, log: s => logs.push(s)})""")
        logs = await page.evaluate('logs')
        assert any('esperando até 30s sem clicar de novo' in s for s in logs), logs
        assert any('✓ compositor aberto' in s for s in logs), logs
        assert await page.evaluate('cliquesCriar') == 1, logs
        print('OK: Facebook — diálogo «Criar post» lento: esperou o campo, sem clicar em criar de novo')
        await b.close()

asyncio.run(main())
