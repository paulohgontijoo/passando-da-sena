#!/usr/bin/env python3
"""
02_eda_html.py -- Gera relatorio EDA interativo em HTML via Plotly
Execucao: python analysis/02_eda_html.py  (com venv ativo)
Saida: ../../web/public/reports/eda.html
"""

import json
import logging
import sys
from collections import Counter
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

ROOT       = Path(__file__).resolve().parents[2]
DATA_PATH  = ROOT / "data" / "sorteios.json"
THEME_PATH = ROOT / "data" / "theme.json"
OUT        = ROOT / "web" / "public" / "reports" / "eda.html"
OUT.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S", handlers=[logging.StreamHandler(sys.stdout)])
log = logging.getLogger(__name__)
DEZENA_COLS = ["d1", "d2", "d3", "d4", "d5", "d6"]


def load_theme() -> dict:
    return json.loads(THEME_PATH.read_text())


def load_flat() -> pd.DataFrame:
    raw = json.loads(DATA_PATH.read_text())
    rows = []
    for c in raw:
        rateo   = {r["faixa"]: r for r in c.get("listaRateioPremio", [])}
        dezenas = sorted([int(x) for x in c["listaDezenas"]])
        row = {
            "numero":            c["numero"],
            "data":              pd.to_datetime(c["dataApuracao"], dayfirst=True),
            "acumulado":         bool(c["acumulado"]),
            "d1": dezenas[0], "d2": dezenas[1], "d3": dezenas[2],
            "d4": dezenas[3], "d5": dezenas[4], "d6": dezenas[5],
            "valor_arrecadado":  c.get("valorArrecadado", 0.0),
            "premio_total_sena": c.get("valorTotalPremioFaixaUm", 0.0),
            "ganhadores_6":      rateo.get(1, {}).get("numeroDeGanhadores", 0),
            "premio_6":          rateo.get(1, {}).get("valorPremio", 0.0),
        }
        rows.append(row)
    df = pd.DataFrame(rows).sort_values("numero").reset_index(drop=True)
    log.info("DataFrame: %d sorteios, %s -> %s", len(df), df["data"].min().date(), df["data"].max().date())
    return df


def compute_kpis(df: pd.DataFrame) -> dict:
    freq  = Counter(df[DEZENA_COLS].values.flatten())
    top_d = max(freq, key=freq.get)
    bot_d = min(freq, key=freq.get)
    soma  = df[DEZENA_COLS].sum(axis=1)
    return {
        "total":         len(df),
        "periodo":       f"{df['data'].min().strftime('%d/%m/%Y')} - {df['data'].max().strftime('%d/%m/%Y')}",
        "top_dezena":    top_d,  "top_dezena_n":  freq[top_d],
        "bot_dezena":    bot_d,  "bot_dezena_n":  freq[bot_d],
        "ganhadores":    int(df["ganhadores_6"].sum()),
        "pct_acumulado": f"{100 * df['acumulado'].sum() / len(df):.1f}%",
        "soma_media":    f"{soma.mean():.0f}",
        "ultimo":        int(df["numero"].max()),
    }


def base_layout(t: dict, **extra) -> dict:
    return dict(
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="#0f1924",
        font=dict(family="system-ui, sans-serif", color=t["text"], size=12),
        xaxis=dict(gridcolor="#1e2d40", linecolor="#253347", zerolinecolor="#1e2d40"),
        yaxis=dict(gridcolor="#1e2d40", linecolor="#253347", zerolinecolor="#1e2d40"),
        margin=dict(l=60, r=40, t=40, b=60),
        hoverlabel=dict(bgcolor="#161b22", bordercolor="#30363d", font_color="#e2e8f0", font_size=13),
        showlegend=True, legend=dict(bgcolor="rgba(0,0,0,0)", bordercolor="#30363d"),
        **extra,
    )


def to_div(fig: go.Figure, div_id: str) -> str:
    return fig.to_html(include_plotlyjs=False, full_html=False, div_id=div_id,
                       config={"displayModeBar": True, "displaylogo": False,
                               "modeBarButtonsToRemove": ["lasso2d", "select2d"],
                               "responsive": True})

def fig_frequencia(df, t):
    freq   = Counter(df[DEZENA_COLS].values.flatten())
    nums   = list(range(1, 61))
    counts = [freq[n] for n in nums]
    media  = float(np.mean(counts))
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=nums, y=counts, name='Frequencia',
        marker_color=[t['accent'] if c >= media else t['muted'] for c in counts],
        hovertemplate='<b>Dezena %{x}</b><br>%{y} sorteios<extra></extra>',
    ))
    fig.add_hline(y=media, line_dash='dash', line_color=t['highlight'], line_width=1.5,
                  annotation_text=f'Media: {media:.0f}x', annotation_font_color=t['highlight'])
    fig.update_layout(**base_layout(t, height=380), xaxis_title='Dezena', yaxis_title='Sorteios')
    fig.update_xaxes(tickvals=list(range(1, 61, 5)))
    return fig


def fig_frequencia_faixa(df, t):
    dezenas   = df[DEZENA_COLS].values.flatten()
    labels    = ['01-10', '11-20', '21-30', '31-40', '41-50', '51-60']
    counts, _ = np.histogram(dezenas, bins=[0, 10, 20, 30, 40, 50, 60])
    esperado  = dezenas.size / 6
    pct       = [f'{100*c/dezenas.size:.1f}%' for c in counts]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=labels, y=counts, text=pct, textposition='outside',
        textfont=dict(color=t['text']),
        marker_color=[t['accent'] if c > esperado else t['muted'] for c in counts],
        hovertemplate='<b>%{x}</b><br>%{y:,} ocorrencias (%{text})<extra></extra>',
    ))
    fig.add_hline(y=esperado, line_dash='dash', line_color=t['highlight'], line_width=1.5,
                  annotation_text=f'Esperado: {esperado:.0f}', annotation_font_color=t['highlight'])
    fig.update_layout(**base_layout(t, height=380), xaxis_title='Faixa', yaxis_title='Ocorrencias')
    return fig


def fig_pares_impares(df, t):
    n_pares  = df[DEZENA_COLS].apply(lambda row: (row % 2 == 0).sum(), axis=1)
    contagem = n_pares.value_counts().sort_index()
    labels   = [f'{p}P / {6-p}I' for p in contagem.index]
    values   = contagem.values
    pct      = [f'{100*v/len(df):.1f}%' for v in values]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=labels, y=values, text=pct, textposition='outside',
        textfont=dict(color=t['text']),
        marker_color=[t['accent'] if p == 3 else t['muted'] for p in contagem.index],
        hovertemplate='<b>%{x}</b><br>%{y} sorteios (%{text})<extra></extra>',
    ))
    fig.update_layout(**base_layout(t, height=380),
                      xaxis_title='Composicao par / impar', yaxis_title='Sorteios')
    return fig


def fig_soma(df, t):
    soma = df[DEZENA_COLS].sum(axis=1)
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=soma, nbinsx=55, name='Distribuicao',
        marker_color=t['accent'], marker_line_width=0.3, opacity=0.85,
        hovertemplate='Soma %{x}<br>%{y} sorteios<extra></extra>',
    ))
    fig.add_vline(x=soma.mean(), line_dash='dash', line_color=t['highlight'], line_width=1.5,
                  annotation_text=f'Media: {soma.mean():.0f}', annotation_font_color=t['highlight'])
    fig.add_vline(x=soma.median(), line_dash='dot', line_color=t['muted'], line_width=1.2,
                  annotation_text=f'Mediana: {soma.median():.0f}', annotation_font_color=t['muted'])
    fig.update_layout(**base_layout(t, height=380),
                      xaxis_title='Soma dos 6 numeros', yaxis_title='Sorteios')
    return fig


def fig_gap(df, t):
    gaps = {}
    for num in range(1, 61):
        mask = df[DEZENA_COLS].isin([num]).any(axis=1)
        cs   = df.loc[mask, 'numero'].values
        if len(cs) > 1:
            gaps[num] = np.diff(cs)
    all_gaps = np.concatenate(list(gaps.values()))
    mg       = {n: g.mean() for n, g in gaps.items()}
    m_geral  = float(np.mean(list(mg.values())))
    nums, meias = list(mg.keys()), list(mg.values())
    fig = make_subplots(rows=1, cols=2,
                        subplot_titles=['Distribuicao global do gap', 'Gap medio por dezena'])
    fig.add_trace(go.Histogram(
        x=all_gaps, nbinsx=60, name='Gap',
        marker_color=t['accent'], opacity=0.85,
        hovertemplate='%{x} concursos<br>%{y} ocorrencias<extra></extra>',
    ), row=1, col=1)
    fig.add_trace(go.Bar(
        x=nums, y=meias, name='Gap medio',
        marker_color=[t['accent'] if v > m_geral else t['muted'] for v in meias],
        hovertemplate='<b>Dezena %{x}</b><br>Gap medio: %{y:.1f}<extra></extra>',
    ), row=1, col=2)
    fig.add_hline(y=m_geral, line_dash='dash', line_color=t['highlight'],
                  annotation_text=f'Media: {m_geral:.1f}', annotation_font_color=t['highlight'],
                  row=1, col=2)
    fig.update_layout(**base_layout(t, height=420, showlegend=False))
    for ax in ['xaxis', 'xaxis2', 'yaxis', 'yaxis2']:
        fig.update_layout(**{ax: dict(gridcolor='#1e2d40', linecolor='#253347')})
    fig.update_xaxes(title_text='Concursos entre aparicoes', row=1, col=1)
    fig.update_xaxes(title_text='Dezena', tickvals=list(range(1, 61, 5)), row=1, col=2)
    for ann in fig.layout.annotations:
        ann.font = dict(color=t['text'], size=13)
    return fig


def fig_evolucao_temporal(df, t):
    WINDOW, STEP = 200, 50
    freq = Counter(df[DEZENA_COLS].values.flatten())
    top3 = [n for n, _ in freq.most_common(3)]
    bot3 = [n for n, _ in sorted(freq.items(), key=lambda x: x[1])[:3]]
    janelas = []
    for start in range(0, len(df) - WINDOW + 1, STEP):
        bloco = df.iloc[start: start + WINDOW]
        fb    = Counter(bloco[DEZENA_COLS].values.flatten())
        mid   = int(bloco['numero'].median())
        for d in range(1, 61):
            janelas.append({'concurso': mid, 'dezena': d, 'freq': fb.get(d, 0)})
    df_ev = pd.DataFrame(janelas)
    fig = go.Figure()
    for dezena in range(1, 61):
        sub = df_ev[df_ev['dezena'] == dezena].sort_values('concurso')
        if dezena in top3:
            fig.add_trace(go.Scatter(
                x=sub['concurso'], y=sub['freq'], mode='lines',
                line=dict(color=t['accent'], width=2.5),
                name=f'{dezena} (alta freq.)',
                hovertemplate=f'Dezena {dezena}<br>Concurso %{{x}}<br>Freq: %{{y}}<extra></extra>',
            ))
        elif dezena in bot3:
            fig.add_trace(go.Scatter(
                x=sub['concurso'], y=sub['freq'], mode='lines',
                line=dict(color=t['highlight'], width=2.5, dash='dash'),
                name=f'{dezena} (baixa freq.)',
                hovertemplate=f'Dezena {dezena}<br>Concurso %{{x}}<br>Freq: %{{y}}<extra></extra>',
            ))
        else:
            fig.add_trace(go.Scatter(
                x=sub['concurso'], y=sub['freq'], mode='lines',
                line=dict(color=t['muted'], width=0.4),
                opacity=0.2, showlegend=False, hoverinfo='skip',
            ))
    fig.update_layout(**base_layout(t, height=420),
                      xaxis_title='Numero do concurso',
                      yaxis_title=f'Freq. em janela de {WINDOW} sorteios')
    return fig


def fig_pares_coocorrencia(df, t):
    pares = []
    for row in df[DEZENA_COLS].itertuples(index=False):
        pares.extend(combinations(sorted(row), 2))
    freq_pares = Counter(pares)
    top30      = freq_pares.most_common(30)
    esperado   = len(df) * 15 / 1770
    labels     = [f'{a}-{b}' for (a, b), _ in top30]
    values     = [v for _, v in top30]
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=values[::-1], y=labels[::-1], orientation='h',
        marker_color=[t['accent'] if v > esperado else t['muted'] for v in values][::-1],
        hovertemplate='<b>%{y}</b><br>%{x} co-ocorrencias<extra></extra>',
    ))
    fig.add_vline(x=esperado, line_dash='dash', line_color=t['highlight'], line_width=1.5,
                  annotation_text=f'Esperado: {esperado:.0f}x', annotation_font_color=t['highlight'])
    fig.update_layout(**base_layout(t, height=700), xaxis_title='Co-ocorrencias')
    return fig


_SECTIONS_META = [
    ('kpis',     'Visao Geral'),
    ('freq',     'Frequencia'),
    ('faixa',    'Por Faixa'),
    ('paridade', 'Paridade'),
    ('soma',     'Soma'),
    ('gap',      'Gap'),
    ('temporal', 'Temporal'),
    ('pares',    'Co-ocorrencia'),
]

_CHART_META = [
    ('freq',     '01', 'Frequencia Historica',
     'Contagem de aparicoes de cada dezena. Acima da media em vermelho.'),
    ('faixa',    '02', 'Distribuicao por Faixa',
     'Agrupa dezenas em faixas de 10 para verificar concentracao no intervalo 1-60.'),
    ('paridade', '03', 'Paridade',
     'Proporcao de pares e impares. A combinacao 3P/3I e a mais comum historicamente.'),
    ('soma',     '04', 'Distribuicao da Soma',
     'Soma dos 6 numeros por sorteio. Distribuicao aproximadamente normal.'),
    ('gap',      '05', 'Gap entre Aparicoes',
     'Intervalo medio (em concursos) entre aparicoes consecutivas de cada dezena.'),
    ('temporal', '06', 'Evolucao Temporal',
     'Frequencia em janela deslizante de 200 sorteios. Top-3 vermelho, bottom-3 ambar.'),
    ('pares',    '07', 'Co-ocorrencia de Pares',
     'Os 30 pares de dezenas que mais apareceram juntos no mesmo sorteio.'),
]

_CSS = """
:root {
  --bg: #0d1117; --surface: #161b22; --surface2: #1c2333; --border: #21262d;
  --accent: %(accent)s; --highlight: %(highlight)s; --muted: %(muted)s;
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
.logo-title { font-size: 11px; font-weight: 700; letter-spacing: .12em; color: var(--text); text-transform: uppercase; }
.logo-sub   { font-size: 9px; letter-spacing: .1em; color: var(--accent); text-transform: uppercase; }
nav { padding: .75rem 0; flex: 1; }
.nav-label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text-dim); padding: .75rem 1rem .25rem; }
.nav-item { display: flex; align-items: center; gap: .6rem; padding: .45rem 1rem;
  color: var(--text-dim); text-decoration: none; font-size: 13px;
  transition: all .15s; border-left: 2px solid transparent; }
.nav-item:hover  { color: var(--text); background: var(--surface2); }
.nav-item.active { color: var(--text); background: var(--surface2); border-left-color: var(--accent); }
.nav-icon { font-size: 10px; font-weight: 700; color: var(--accent); font-family: monospace; min-width: 16px; }
.sidebar-footer { padding: 1rem; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-dim); }
.page-header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
.page-header h1 { font-size: 1.6rem; font-weight: 700; color: var(--text); margin-bottom: .25rem; }
.page-header p  { color: var(--text-dim); font-size: 13px; }
.badge { display: inline-block; background: rgba(233,69,96,.15); color: var(--accent);
  border: 1px solid rgba(233,69,96,.3); border-radius: 4px; font-size: 11px;
  padding: 2px 8px; margin-left: .5rem; vertical-align: middle; font-weight: 600; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
.kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 1rem 1.2rem; transition: border-color .15s; }
.kpi-card:hover { border-color: var(--accent); }
.kpi-icon  { font-size: 1rem; margin-bottom: .4rem; color: var(--text-dim); }
.kpi-value { font-size: 1.45rem; font-weight: 700; color: var(--accent);
  font-family: "SF Mono", "Fira Code", monospace; line-height: 1.2; }
.kpi-label { font-size: 10px; color: var(--text-dim); text-transform: uppercase;
  letter-spacing: .06em; margin-top: .3rem; }
.kpi-sub   { font-size: 12px; color: var(--text-dim); margin-top: .15rem; }
.section { margin-bottom: 3rem; scroll-margin-top: 1.5rem; }
.section-header { display: flex; align-items: flex-start; gap: .85rem; margin-bottom: 1.25rem; }
.section-num { font-family: monospace; font-size: 10px; font-weight: 700; color: var(--accent);
  background: rgba(233,69,96,.1); border: 1px solid rgba(233,69,96,.25);
  border-radius: 4px; padding: 3px 6px; margin-top: 3px; white-space: nowrap; }
.section-title    { font-size: 1rem; font-weight: 600; color: var(--text); margin-bottom: .2rem; }
.section-subtitle { font-size: 12px; color: var(--text-dim); max-width: 620px; }
.chart-card { background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 1rem; overflow: hidden; }
@media (max-width: 768px) {
  #sidebar { transform: translateX(-100%); transition: transform .25s; }
  #sidebar.open { transform: translateX(0); }
  #content { margin-left: 0; padding: 1rem; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
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
}, { threshold: 0.25, rootMargin: '-5% 0px -65% 0px' });
sections.forEach(s => observer.observe(s));
navLinks.forEach(a => a.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
}));
"""


def _kpi(icon, label, value, sub=''):
    sub_html = f'<div class="kpi-sub">{sub}</div>' if sub else ''
    return (f'<div class="kpi-card"><div class="kpi-icon">{icon}</div>'
            f'<div class="kpi-value">{value}</div>'
            f'<div class="kpi-label">{label}</div>{sub_html}</div>')


def _section(sid, num, title, subtitle, chart_html):
    return (f'<section id="{sid}" class="section">'
            f'<div class="section-header">'
            f'<span class="section-num">{num}</span>'
            f'<div><h2 class="section-title">{title}</h2>'
            f'<p class="section-subtitle">{subtitle}</p></div></div>'
            f'<div class="chart-card">{chart_html}</div></section>')


def build_html(kpis, charts, t):
    css = _CSS % {'accent': t['accent'], 'highlight': t['highlight'], 'muted': t['muted']}

    nav = '\n      '.join(
        '<a href="#{sid}" class="nav-item" data-section="{sid}">'
        '<span class="nav-icon">{icon}</span>{label}</a>'.format(
            sid=sid, icon='&bull;' if i == 0 else '&gt;', label=label)
        for i, (sid, label) in enumerate(_SECTIONS_META)
    )

    kpi_html = (
        '<section id="kpis" class="section"><div class="kpi-grid">'
        + _kpi('~', 'Total de Sorteios',     f"{kpis['total']:,}")
        + _kpi('#', 'Ultimo Concurso',        f"{kpis['ultimo']:,}")
        + _kpi('@', 'Periodo',                kpis['periodo'])
        + _kpi('^', 'Dezena Mais Frequente',  str(kpis['top_dezena']), f"{kpis['top_dezena_n']}x")
        + _kpi('v', 'Dezena Menos Frequente', str(kpis['bot_dezena']), f"{kpis['bot_dezena_n']}x")
        + _kpi('+', 'Soma Media / Sorteio',   kpis['soma_media'])
        + _kpi('*', 'Ganhadores da Sena',     f"{kpis['ganhadores']:,}")
        + _kpi('%', 'Concursos Acumulados',   kpis['pct_acumulado'])
        + '</div></section>'
    )

    chart_sections = ''.join(
        _section(sid, num, title, subtitle, charts[i])
        for i, (sid, num, title, subtitle) in enumerate(_CHART_META)
    )

    return (
        '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n'
        '<meta charset="UTF-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        '<title>Mega Sena - EDA Report</title>\n'
        '<script src="https://cdn.plot.ly/plotly-2.32.0.min.js" charset="utf-8"></script>\n'
        f'<style>{css}</style>\n</head>\n<body>\n'
        '<button id="hamburger" '
        'onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')">&#9776;</button>\n'
        '<div id="app">\n<aside id="sidebar">\n'
        '<div class="sidebar-logo">\n'
        '<span class="logo-icon">&#9670;</span>\n'
        '<div><div class="logo-title">Mega Sena</div>'
        '<div class="logo-sub">Analytics Lab</div></div>\n'
        '</div>\n<nav>\n<div class="nav-label">Relatorio EDA</div>\n'
        f'{nav}\n</nav>\n'
        '<div class="sidebar-footer">Passando da Sena &copy; 2025</div>\n'
        '</aside>\n<main id="content">\n'
        '<header class="page-header">\n'
        '<h1>Analise Exploratoria <span class="badge">EDA</span></h1>\n'
        f'<p>Sorteios historicos da Mega Sena &bull; {kpis["total"]:,} concursos analisados</p>\n'
        '</header>\n'
        f'{kpi_html}\n{chart_sections}\n'
        '</main>\n</div>\n'
        f'<script>{_JS}</script>\n</body>\n</html>'
    )


def main():
    log.info('=== EDA HTML Generator ===')
    t    = load_theme()
    df   = load_flat()
    kpis = compute_kpis(df)

    log.info('Gerando figuras Plotly...')
    figs = [
        fig_frequencia(df, t),
        fig_frequencia_faixa(df, t),
        fig_pares_impares(df, t),
        fig_soma(df, t),
        fig_gap(df, t),
        fig_evolucao_temporal(df, t),
        fig_pares_coocorrencia(df, t),
    ]

    charts = [to_div(f, f'chart{i+1}') for i, f in enumerate(figs)]
    log.info('%d charts gerados.', len(charts))

    html = build_html(kpis, charts, t)
    OUT.write_text(html, encoding='utf-8')
    log.info('Relatorio salvo: %s (%.0f KB)', OUT, OUT.stat().st_size / 1024)
    log.info('=== Concluido ===')


if __name__ == '__main__':
    main()
