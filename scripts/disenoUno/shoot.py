# Screenshots every /tmp/disenoUno/*.html (or the names given) to /tmp/disenoUno/<name>.png at 2x.
import asyncio, glob, os, sys
from playwright.async_api import async_playwright
async def main():
    out = os.environ.get('OUT', '/tmp/disenoUno')
    files = [f'{out}/{n}.html' for n in sys.argv[1:]] or sorted(glob.glob(f'{out}/*.html'))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await b.new_page(viewport={'width': 408, 'height': 340}, device_scale_factor=2)
        for f in files:
            await pg.goto('file://' + f); await pg.wait_for_timeout(250)
            el = await pg.query_selector('div.group')
            await el.screenshot(path=f[:-5] + '.png'); print('png', f[:-5] + '.png')
        await b.close()
asyncio.run(main())
