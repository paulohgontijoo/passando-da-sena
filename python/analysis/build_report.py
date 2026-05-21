#!/usr/bin/env python3
"""
build_report.py -- Monta eda.html a partir dos fragmentos exportados pelo notebook.

Fluxo:
  Notebook exporta python/exports/eda_*.html
  -> este script copia para web/public/exports/
  -> e monta web/public/reports/eda.html com sidebar + iframes

Execucao: python analysis/build_report.py  (stdlib apenas, sem venv necessario)
"""

import json
import shutil
import sys
from pathlib import Path

ROOT    = Path(__file__).resolve().parents[2]
EXPORTS = ROOT / "python" / "exports"
WEB_EXP = ROOT / "web" / "public" / "exports"
OUT     = ROOT / "web" / "public" / "reports" / "eda.html"
SECTIONS_FILE = EXPORTS / "report_sections.json"

_CSS = """
:root {
  --bg: #0d1117; --surface: #161b22; --surface2: #1c2333; --border: #21262d;
  --accent: #e94560; --highlight: #f5a623; --muted: #8892b0;
  --text: #e2e8f0; --text-dim: #8b949e; --sidebar-w: 230px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px; line-height: 1.6; min-height: 100vh; }
#app { display: flex; min-height: 100vh; }
#sidebar { width: var(--sidebar-w); background: var(--surface);
  border-right: 1px solid var(--border); position: fixed; top: 0; left: 0;
  height: 100vh; overflow-y: auto; z-index: 100; display: flex; flex-direction: column; }
#content { margin-left: var(--sidebar-w); flex: 1; padding: 2rem 2.5rem; max-width: 1100px; }
.sidebar-logo { display: flex; align-items: center; gap: .75rem;
  padding: 1.25rem 1rem; border-bottom: 1px solid var(--border); }
.logo-icon  { font-size: 1.4rem; color: var(--accent); }
.logo-title { font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: var(--text); text-transform: uppercase; }
.logo-sub   { font-size: 9px; letter-spacing: .1em; color: var(--accent); text-transform: uppercase; }
nav { padding: .75rem 0; flex: 1; }
.nav-label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text-dim); padding: .75rem 1rem .25rem; }
.nav-item { display: flex; align-items: center; gap: .6rem; padding: .45rem 1rem;
  color: var(--text-dim); text-decoration: none; font-size: 13px;
  transition: all .15s; border-left: 2px solid transparent; }
.nav-item:hover  { color: var(--text); background: var(--surface2); }
.nav-item.active { color: var(--text); background: var(--surface2); border-left-color: var(--accent); }
.nav-icon { font-size: 10px; font-weight: 700; color: var(--accent);
  font-family: monospace; min-width: 16px; }
.sidebar-footer { padding: 1rem; border-top: 1px solid var(--border);
  font-size: 11px; color: var(--text-dim); }
.page-header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
.page-header h1 { font-size: 1.6rem; font-weight: 700; color: var(--text); margin-bottom: .25rem; }
.page-header p  { color: var(--text-dim); font-size: 13px; }
.badge { display: inline-block; background: rgba(233,69,96,.15); color: var(--accent);
  border: 1px solid rgba(233,69,96,.3); border-radius: 4px; font-size: 11px;
  padding: 2px 8px; margin-left: .5rem; vertical-align: middle; font-weight: 600; }
.section { margin-bottom: 3rem; scroll-margin-top: 1.5rem; }
.section-header { display: flex; align-items: flex-start; gap: .85rem; margin-bottom: 1.25rem; }
.section-num { font-family: monospace; font-size: 10px; font-weight: 700; color: var(--accent);
  background: rgba(233,69,96,.1); border: 1px solid rgba(233,69,96,.25);
  border-radius: 4px; padding: 3px 6px; margin-top: 3px; white-space: nowrap; }
.section-title    { font-size: 1rem; font-weight: 600; color: var(--text); margin-bottom: .2rem; }
.section-subtitle { font-size: 12px; color: var(--text-dim); max-width: 640px; }
.chart-frame { width: 100%; border: 1px solid var(--border); border-radius: 8px;
  background: var(--surface); display: block; }
@media (max-width: 768px) {
  #sidebar { transform: translateX(-100%); transition: transform .25s; }
  #sidebar.open { transform: translateX(0); }
  #content { margin-left: 0; padding: 1rem; }
  #hamburger { display: flex; position: fixed; top: .75rem; left: .75rem; z-index: 200;
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    padding: 6px 10px; cursor: pointer; color: var(--text); font-size: 18px; }
}
@media (min-width: 769px) { #hamburger { display: none; } }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #484f58; }
"""

_JS = """
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-item');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const id = e.target.id;
      navLinks.forEach(a => a.classList.toggle('active', a.dataset.section === id));
    }
  });
}, { threshold: 0.2, rootMargin: '-5% 0px -60% 0px' });
sections.forEach(s => observer.observe(s));
navLinks.forEach(a => a.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
}));
"""


def section_id(filename: str) -> str:
    return Path(filename).stem


def validate_sections(sections: list) -> list[str]:
    missing = [s["file"] for s in sections if not (EXPORTS / s["file"]).exists()]
    return missing


def copy_exports(sections: list) -> None:
    WEB_EXP.mkdir(parents=True, exist_ok=True)
    for s in sections:
        src = EXPORTS / s["file"]
        dst = WEB_EXP / s["file"]
        shutil.copy2(src, dst)
        print(f"  copiado: {s['file']}")


def build_nav(sections: list) -> str:
    items = []
    for i, s in enumerate(sections):
        sid  = section_id(s["file"])
        icon = "&bull;" if i == 0 else "&gt;"
        items.append(
            f'<a href="#{sid}" class="nav-item" data-section="{sid}">'
            f'<span class="nav-icon">{icon}</span>{s["title"]}</a>'
        )
    return "\n      ".join(items)


def build_sections(sections: list) -> str:
    parts = []
    for i, s in enumerate(sections):
        sid    = section_id(s["file"])
        num    = f"{i+1:02d}"
        height = s.get("height", 420)
        src    = f"/exports/{s['file']}"
        parts.append(
            f'<section id="{sid}" class="section">'
            f'<div class="section-header">'
            f'<span class="section-num">{num}</span>'
            f'<div>'
            f'<h2 class="section-title">{s["title"]}</h2>'
            f'<p class="section-subtitle">{s.get("description", "")}</p>'
            f'</div></div>'
            f'<iframe src="{src}" class="chart-frame" height="{height}" '
            f'frameborder="0" scrolling="no" title="{s["title"]}"></iframe>'
            f'</section>'
        )
    return "\n    ".join(parts)


def build_html(sections: list) -> str:
    nav           = build_nav(sections)
    sections_html = build_sections(sections)
    total         = len(sections)
    return (
        '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n'
        '<meta charset="UTF-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        '<title>Mega Sena - EDA Report</title>\n'
        f'<style>{_CSS}</style>\n'
        '</head>\n<body>\n'
        '<button id="hamburger" '
        'onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')">'
        '&#9776;</button>\n'
        '<div id="app">\n'
        '<aside id="sidebar">\n'
        '  <div class="sidebar-logo">\n'
        '    <span class="logo-icon">&#9670;</span>\n'
        '    <div>\n'
        '      <div class="logo-title">Mega Sena</div>\n'
        '      <div class="logo-sub">Analytics Lab</div>\n'
        '    </div>\n'
        '  </div>\n'
        '  <nav>\n'
        '    <div class="nav-label">Analise Exploratoria</div>\n'
        f'    {nav}\n'
        '  </nav>\n'
        '  <div class="sidebar-footer">Passando da Sena &copy; 2025</div>\n'
        '</aside>\n'
        '<main id="content">\n'
        '  <header class="page-header">\n'
        '    <h1>Analise Exploratoria <span class="badge">EDA</span></h1>\n'
        f'    <p>{total} analises &bull; gerado a partir dos exports do notebook</p>\n'
        '  </header>\n'
        f'  {sections_html}\n'
        '</main>\n'
        '</div>\n'
        f'<script>{_JS}</script>\n'
        '</body>\n</html>'
    )


def main() -> None:
    print("=== build_report ===")

    sections = json.loads(SECTIONS_FILE.read_text(encoding="utf-8"))
    print(f"  {len(sections)} secoes em report_sections.json")

    missing = validate_sections(sections)
    if missing:
        print("ERRO: fragmentos ausentes em python/exports/:")
        for f in missing:
            print(f"  - {f}")
        sys.exit(1)

    print("Copiando para web/public/exports/...")
    copy_exports(sections)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = build_html(sections)
    OUT.write_text(html, encoding="utf-8")
    print(f"Relatorio salvo: {OUT} ({OUT.stat().st_size // 1024} KB)")
    print("=== Concluido ===")


if __name__ == "__main__":
    main()
