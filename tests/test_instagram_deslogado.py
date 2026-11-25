"""Instagram aberto DESLOGADO (25/11): não clicar em «Criar nova conta».

O motor deve parar ANTES de clicar, dizendo que a sessão não vale. Executar:
python tests/test_instagram_deslogado.py (requer Playwright). Réplica local.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """
<form><input name="username"><input name="password" type="password"><button>Entrar</button></form>
<a id="cad" href="/accounts/emailsignup/" style="display:block;width:200px;height:30px">Criar nova conta</a>
<script>window.clicouCadastro = 0;
document.getElementById('cad').onclick = e => { e.preventDefault(); clicouCadastro++; };</script>
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
        assert 'DESLOGADO' in r.get('erro', ''), r
        assert await page.evaluate('clicouCadastro') == 0
        # O «Criar» genérico nunca casa link de conta.
        assert not await page.evaluate("SP.existe(RECEITAS.instagram.abrir.clicar)")
        print('OK: Instagram deslogado — parou com a causa, sem clicar em «Criar nova conta»')
        await b.close()

asyncio.run(main())
