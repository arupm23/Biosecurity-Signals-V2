"""Optional Playwright smoke test (requires pip install playwright and a Chromium install).
This test injects local scripts without an HTTP server, so it works offline.
"""
from pathlib import Path
import re
from shutil import which
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text()
html = re.sub(r'<script src="[^"]+"></script>', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', '')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=which('chromium') or which('google-chrome') or None, args=['--no-sandbox'])
    for width, height in [(1366, 900), (375, 812)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.set_content(html)
        page.add_style_tag(content=(ROOT / 'styles.css').read_text())
        for filename in ('config.js','taxonomy.js','data.js','app-core.js','database.js','app.js'):
            page.add_script_tag(content=(ROOT / filename).read_text())
        assert page.locator('.record-card').count() == 8
        assert page.locator('.layer-card').count() == 4
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.locator('.record-card [data-open]').first.click()
        assert page.locator('#detailDialog').evaluate('(d) => d.open')
        assert page.locator('.source-timeline a').count() > 0
        page.locator('.signal-button').last.click()
        assert page.locator('.signal-button.selected').count() == 1
        page.locator('#closeDialog').click()
        page.locator('#typeFilter').select_option('Guidance')
        assert page.locator('.record-card').count() == 2
        page.locator('.layer-card[data-layer="governance"]').click()
        assert page.locator('.safeguard-bar').count() > 0
        page.locator('#resetFilters').click()
        assert page.locator('.record-card').count() == 8
        assert not errors, errors
        page.close()
        print(f'PASS: browser interactions at width {width}px')
    browser.close()
