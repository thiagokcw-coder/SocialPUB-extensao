"""Regressão do compositor do X em Chrome headless (requer Playwright).

Executar: python tests/test_x_midia.py
Usa uma réplica: não acessa contas nem publica nas redes reais.
"""
import asyncio
import base64
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = """
<div id="feed">
  <input type="file" data-testid="fileInput">
  <div contenteditable="true" data-testid="tweetTextarea_0">atrás</div>
  <div data-testid="attachments"><video></video></div>
  <button data-testid="tweetButtonInline">Post</button>
</div>
<script>
window.posts = 0; window.feedUploads = 0;
document.querySelector('#feed input').onchange = () => feedUploads++;
window.openComposer = () => {
  const d = document.createElement('div'); d.role = 'dialog';
  d.innerHTML = `<input type="file" data-testid="fileInput" style="display:none">
    <div contenteditable="true" data-testid="tweetTextarea_0" style="min-height:40px"> </div>
    <button data-testid="tweetButton">Post</button>`;
  document.body.append(d);
  d.querySelector('input').onchange = () => {
    setTimeout(() => {
      const a = document.createElement('div'); a.dataset.testid = 'attachments';
      a.style.minHeight = '40px';
      if (!window.emptyPreview) a.append(document.createElement('video'));
      d.append(a);
    }, 200);
  };
  d.querySelector('button').onclick = () => { posts++; d.remove(); };
};
</script>
"""
MOCK = """
window.logs = [];
window.chrome = {
  tabs: { create: async () => ({id: 1}), get: async () => ({status: 'complete'}),
    onUpdated: {addListener() {}, removeListener() {}} },
  scripting: {executeScript: async o => [{result: o.files ? null : await o.func(...o.args)}]},
  debugger: {attach: async () => {}, detach: async () => {},
    onDetach: {addListener() {}, removeListener() {}},
    sendCommand: async (target, method, params) => cdp(method, params)}
};
"""


async def main():
    temp = tempfile.TemporaryDirectory()
    native = Path(temp.name) / 'video.mp4'
    native.write_bytes(b'test fixture')
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page()
        session = await page.context.new_cdp_session(page)
        await page.expose_function("cdp", lambda method, params: session.send(method, params))

        async def run(before="", media=True, publish=True):
            await page.goto("about:blank")
            await page.set_content(HTML)
            await page.add_script_tag(content=MOCK)
            for name in ("pagina.js", "receitas.js", "arquivo.js", "teclado.js", "motor.js"):
                await page.add_script_tag(content=(ROOT / name).read_text(encoding="utf-8"))
            await page.evaluate(before or "openComposer()")
            video = {"nome": "video.mp4", "tipo": "video/mp4",
                     "caminho": str(native), "tamanho": native.stat().st_size,
                     "b64": base64.b64encode(b"test fixture").decode()} if media else None
            return await page.evaluate("""([m, pub]) => prepararRede('x', m, 'Teste', {
                publicar: pub, log: s => logs.push(s)
            })""", [video, publish])

        r = await run("setTimeout(openComposer, 500)", publish=False)
        assert r.get("legendaOk") and r["lido"]["midia"] == 1, r
        assert await page.locator('[role=dialog] video').count() == 1
        assert await page.evaluate("feedUploads === 0 && posts === 0")
        assert await page.locator('#feed [contenteditable]').inner_text() == 'atrás'
        assert await page.locator('[role=dialog] input').evaluate("e => e.files[0].name") == 'video.mp4'
        print('OK: janela atrasada, arquivo e prévia apenas no diálogo', flush=True)

        for publish in (False, True):
            r = await run("window.emptyPreview = true; openComposer()", publish=publish)
            assert r.get("erro") == 'a mídia não apareceu no post', r
            assert await page.evaluate("posts === 0")
            assert any('✗ a mídia não apareceu no post' in s for s in await page.evaluate('logs'))
        print('OK: prévia vazia bloqueada com publicação automática ligada ou desligada', flush=True)

        r = await run("""openComposer();
          const original = SP.ler; let reads = 0;
          SP.ler = (...args) => {
            if (++reads === 2) document.querySelector('[role=dialog] [data-testid=attachments]').remove();
            return original(...args);
          };""")
        assert r.get('erro') == 'a mídia não apareceu no post', r
        assert await page.evaluate('posts === 0')
        print('OK: mídia perdida entre conferir e publicar bloqueada', flush=True)

        r = await run()
        assert r.get('publicou') and await page.evaluate('posts === 1'), r
        r = await run(media=False)
        assert r.get('publicou') and await page.evaluate('posts === 1'), r
        print('OK: mídia presente e publicação intencional só com texto', flush=True)
        await browser.close()
    temp.cleanup()


asyncio.run(main())
