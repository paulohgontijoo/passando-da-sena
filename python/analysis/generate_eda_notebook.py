#!/usr/bin/env python3
"""
generate_eda_notebook.py
Gera 01_eda.ipynb com plots interativos via Plotly.
Execucao: python analysis/generate_eda_notebook.py  (com venv ativo)
"""

import nbformat as nbf
from pathlib import Path

OUT = Path(__file__).parent / "01_eda.ipynb"


def md(text: str) -> nbf.NotebookNode:
    return nbf.v4.new_markdown_cell(text)


def code(src: str) -> nbf.NotebookNode:
    return nbf.v4.new_code_cell(src)


# ---------------------------------------------------------------------------
# Celulas
# ---------------------------------------------------------------------------

CELL_TITLE = """\
# EDA — Mega Sena Analytics
**Analise Exploratoria Inicial** dos sorteios historicos da Mega Sena (1996–2026).

Dados: `data/sorteios.json` — 3.002 concursos coletados via API da Caixa.
Plots: **Plotly** (interativos — hover, zoom, pan, export PNG pelo menu da figura).\
"""

CELL_IMPORTS = """\
import json
import warnings
from collections import Counter
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

warnings.filterwarnings("ignore")

# -- Paths
ROOT      = Path().resolve().parents[1]
DATA_PATH = ROOT / "data" / "sorteios.json"
EXPORTS   = ROOT / "python" / "exports"
EXPORTS.mkdir(exist_ok=True)

# -- Paleta global
PRIMARY   = "#1a1a2e"
ACCENT    = "#e94560"
HIGHLIGHT = "#f5a623"
MUTED     = "#8892b0"
BG        = "#f8f9fa"

# -- Template Plotly customizado
LAYOUT = dict(
    paper_bgcolor=BG,
    plot_bgcolor=BG,
    font=dict(family="DejaVu Sans, sans-serif", color=PRIMARY),
    title_font=dict(size=16, color=PRIMARY),
    legend=dict(bgcolor="rgba(0,0,0,0)", borderwidth=0),
    hoverlabel=dict(bgcolor="white", font_size=12),
    margin=dict(t=70, b=50, l=60, r=30),
)

DEZENA_COLS = ["d1", "d2", "d3", "d4", "d5", "d6"]

print("Imports OK")\
"""

CELL_LOAD = """\
raw  = json.load(open(DATA_PATH))
rows = []

for c in raw:
    rateo   = {r["faixa"]: r for r in c.get("listaRateioPremio", [])}
    dezenas = sorted([int(x) for x in c["listaDezenas"]])
    sorteio = [int(x) for x in c["dezenasSorteadasOrdemSorteio"]]
    rows.append({
        "numero":       c["numero"],
        "data":         pd.to_datetime(c["dataApuracao"], dayfirst=True),
        "acumulado":    bool(c["acumulado"]),
        "especial":     c["indicadorConcursoEspecial"] != 1,
        "local":        c.get("localSorteio", ""),
        "cidade":       c.get("nomeMunicipioUFSorteio", ""),
        "d1": dezenas[0], "d2": dezenas[1], "d3": dezenas[2],
        "d4": dezenas[3], "d5": dezenas[4], "d6": dezenas[5],
        "s1": sorteio[0], "s2": sorteio[1], "s3": sorteio[2],
        "s4": sorteio[3], "s5": sorteio[4], "s6": sorteio[5],
        "valor_arrecadado":        c.get("valorArrecadado", 0.0),
        "valor_acumulado_proximo": c.get("valorAcumuladoProximoConcurso", 0.0),
        "valor_estimado_proximo":  c.get("valorEstimadoProximoConcurso", 0.0),
        "premio_total_sena":       c.get("valorTotalPremioFaixaUm", 0.0),
        "ganhadores_6": rateo.get(1, {}).get("numeroDeGanhadores", 0),
        "premio_6":     rateo.get(1, {}).get("valorPremio", 0.0),
        "ganhadores_5": rateo.get(2, {}).get("numeroDeGanhadores", 0),
        "premio_5":     rateo.get(2, {}).get("valorPremio", 0.0),
        "ganhadores_4": rateo.get(3, {}).get("numeroDeGanhadores", 0),
        "premio_4":     rateo.get(3, {}).get("valorPremio", 0.0),
    })

df = pd.DataFrame(rows).sort_values("numero").reset_index(drop=True)

def all_dezenas(d=df):
    return d[DEZENA_COLS].values.flatten()

print(f"{len(df)} concursos | {df['data'].min().date()} -> {df['data'].max().date()}")
df.head(3)\
"""

CELL_INFO = "df.info()"

CELL_MD_1 = """\
## 1. Frequencia historica de cada dezena

Quantas vezes cada dezena (1–60) foi sorteada. Barras em destaque = acima da media.\
"""

CELL_FREQ = """\
freq   = Counter(all_dezenas())
nums   = list(range(1, 61))
counts = [freq[n] for n in nums]
media  = np.mean(counts)

top5 = sorted(range(1, 61), key=lambda n: freq[n], reverse=True)[:5]
bot5 = sorted(range(1, 61), key=lambda n: freq[n])[:5]

def classify(n, c):
    if n in top5:   return "Top 5"
    if n in bot5:   return "Bottom 5"
    if c >= media:  return "Acima da media"
    return "Abaixo da media"

color_map = {"Top 5": ACCENT, "Bottom 5": HIGHLIGHT,
             "Acima da media": ACCENT, "Abaixo da media": MUTED}
opacity_map = {"Top 5": 1.0, "Bottom 5": 1.0,
               "Acima da media": 0.7, "Abaixo da media": 0.5}

categories = [classify(n, c) for n, c in zip(nums, counts)]

fig = go.Figure()

for cat in ["Acima da media", "Abaixo da media", "Top 5", "Bottom 5"]:
    xs = [n for n, c in zip(nums, categories) if c == cat]
    ys = [counts[n - 1] for n in xs]
    fig.add_trace(go.Bar(
        x=xs, y=ys,
        name=cat,
        marker_color=color_map[cat],
        opacity=opacity_map[cat],
        hovertemplate="Dezena <b>%{x}</b><br>Sorteios: <b>%{y}</b><extra></extra>",
    ))

fig.add_hline(y=media, line_dash="dash", line_color=PRIMARY, line_width=1.5,
              annotation_text=f"Media: {media:.0f}x",
              annotation_position="top right")

fig.update_layout(
    **LAYOUT,
    title="Frequencia historica de cada dezena (1996-2026)",
    xaxis=dict(title="Dezena", tickmode="linear", tick0=1, dtick=1,
               tickfont=dict(size=9), gridcolor="#e0e0e0"),
    yaxis=dict(title="Num. de sorteios", gridcolor="#e0e0e0"),
    barmode="overlay",
    bargap=0.1,
    height=420,
)
fig.write_html(EXPORTS / "eda_01_frequencia_dezenas.html")
fig.show()

print(f"Mais frequentes : {sorted(top5)}")
print(f"Menos frequentes: {sorted(bot5)}")\
"""

CELL_MD_2 = """\
## 2. Frequencia por faixa de dezena

Sorteios agrupados por faixa de 10 numeros. Linha tracejada = distribuicao esperada uniforme.\
"""

CELL_FAIXA = """\
dezenas   = all_dezenas()
labels    = ["01-10", "11-20", "21-30", "31-40", "41-50", "51-60"]
bins      = [0, 10, 20, 30, 40, 50, 60]
counts, _ = np.histogram(dezenas, bins=bins)
esperado  = dezenas.size / 6
pcts      = [100 * c / dezenas.size for c in counts]

fig = go.Figure(go.Bar(
    x=labels,
    y=counts,
    marker_color=[ACCENT if c > esperado else MUTED for c in counts],
    text=[f"{c:,}<br>({p:.1f}%)" for c, p in zip(counts, pcts)],
    textposition="outside",
    hovertemplate="Faixa <b>%{x}</b><br>Sorteios: <b>%{y:,}</b><br>%{text}<extra></extra>",
))

fig.add_hline(y=esperado, line_dash="dash", line_color=HIGHLIGHT, line_width=2,
              annotation_text=f"Esperado: {esperado:.0f}",
              annotation_position="top right")

fig.update_layout(
    **LAYOUT,
    title="Sorteios por faixa de dezena",
    xaxis=dict(title="Faixa", gridcolor="#e0e0e0"),
    yaxis=dict(title="Num. de sorteios", gridcolor="#e0e0e0"),
    height=420,
    showlegend=False,
)
fig.write_html(EXPORTS / "eda_02_frequencia_faixa.html")
fig.show()\
"""

CELL_MD_3 = """\
## 3. Distribuicao de pares e impares por sorteio

Composicao de numeros pares e impares em cada sorteio. A combinacao 3P/3I e a mais comum?\
"""

CELL_PARES = """\
n_pares  = df[DEZENA_COLS].apply(lambda row: (row % 2 == 0).sum(), axis=1)
contagem = n_pares.value_counts().sort_index()
labels   = [f"{p}P / {6-p}I" for p in contagem.index]
pcts     = [100 * v / len(df) for v in contagem.values]

fig = go.Figure(go.Bar(
    x=labels,
    y=contagem.values,
    marker_color=[ACCENT if p == 3 else MUTED for p in contagem.index],
    text=[f"{p:.1f}%" for p in pcts],
    textposition="outside",
    hovertemplate="<b>%{x}</b><br>Sorteios: <b>%{y:,}</b><br>%{text}<extra></extra>",
))

fig.update_layout(
    **LAYOUT,
    title="Distribuicao de pares e impares por sorteio",
    xaxis=dict(title="Composicao par / impar", gridcolor="#e0e0e0"),
    yaxis=dict(title="Num. de sorteios", gridcolor="#e0e0e0"),
    height=420,
    showlegend=False,
)
fig.write_html(EXPORTS / "eda_03_pares_impares.html")
fig.show()

n_pares.describe()\
"""

CELL_MD_4 = """\
## 4. Distribuicao da soma dos 6 numeros

Pelo Teorema Central do Limite, a soma de 6 variaveis discretas uniformes deve se aproximar de uma normal.\
"""

CELL_SOMA = """\
soma = df[DEZENA_COLS].sum(axis=1)

fig = go.Figure()

fig.add_trace(go.Histogram(
    x=soma,
    nbinsx=55,
    marker_color=ACCENT,
    opacity=0.85,
    name="Sorteios",
    hovertemplate="Soma: <b>%{x}</b><br>Freq: <b>%{y}</b><extra></extra>",
))

for val, label, color, dash in [
    (soma.mean(),   f"Media ({soma.mean():.0f})",   HIGHLIGHT, "dash"),
    (soma.median(), f"Mediana ({soma.median():.0f})", PRIMARY,  "dot"),
]:
    fig.add_vline(x=val, line_dash=dash, line_color=color, line_width=2,
                  annotation_text=label, annotation_position="top")

fig.update_layout(
    **LAYOUT,
    title="Distribuicao da soma dos 6 numeros por sorteio",
    xaxis=dict(title="Soma dos 6 numeros", gridcolor="#e0e0e0"),
    yaxis=dict(title="Num. de sorteios", gridcolor="#e0e0e0"),
    height=420,
    showlegend=False,
)
fig.write_html(EXPORTS / "eda_04_soma_dezenas.html")
fig.show()

soma.describe()\
"""

CELL_MD_5 = """\
## 5. Gap entre aparicoes de cada dezena

Quantos concursos uma dezena fica sem ser sorteada entre duas aparicoes consecutivas.\
"""

CELL_GAP = """\
gaps_por_dezena = {}
for num in range(1, 61):
    mask      = df[DEZENA_COLS].isin([num]).any(axis=1)
    concursos = df.loc[mask, "numero"].values
    if len(concursos) > 1:
        gaps_por_dezena[num] = np.diff(concursos)

all_gaps   = np.concatenate(list(gaps_por_dezena.values()))
media_gaps = {n: g.mean() for n, g in gaps_por_dezena.items()}

fig = make_subplots(rows=1, cols=2,
                    subplot_titles=["Distribuicao do gap global",
                                    "Gap medio por dezena"])

# Histograma global
fig.add_trace(go.Histogram(
    x=all_gaps, nbinsx=60,
    marker_color=ACCENT, opacity=0.85, name="Gap",
    hovertemplate="Gap: <b>%{x}</b> concursos<br>Freq: <b>%{y}</b><extra></extra>",
), row=1, col=1)
fig.add_vline(x=all_gaps.mean(), line_dash="dash", line_color=HIGHLIGHT,
              line_width=2, row=1, col=1,
              annotation_text=f"Media: {all_gaps.mean():.1f}")

# Gap medio por dezena
nums_g  = list(media_gaps.keys())
meias_g = list(media_gaps.values())
m_ger   = np.mean(meias_g)
fig.add_trace(go.Bar(
    x=nums_g, y=meias_g,
    marker_color=[ACCENT if v > m_ger else MUTED for v in meias_g],
    name="Gap medio",
    hovertemplate="Dezena <b>%{x}</b><br>Gap medio: <b>%{y:.1f}</b> concursos<extra></extra>",
), row=1, col=2)
fig.add_hline(y=m_ger, line_dash="dash", line_color=HIGHLIGHT,
              line_width=2, row=1, col=2,
              annotation_text=f"Media: {m_ger:.1f}")

fig.update_layout(
    **LAYOUT,
    title="Gap entre aparicoes de cada dezena",
    height=430,
    showlegend=False,
)
fig.update_xaxes(gridcolor="#e0e0e0")
fig.update_yaxes(gridcolor="#e0e0e0")
fig.write_html(EXPORTS / "eda_05_gap_dezenas.html")
fig.show()

print(f"Gap global: media={all_gaps.mean():.1f} | mediana={np.median(all_gaps):.1f} | max={all_gaps.max()}")\
"""

CELL_MD_6 = """\
## 6. Evolucao temporal da frequencia

Frequencia de cada dezena em uma janela deslizante de 200 concursos.
Destaque para as **3 mais** (vermelho) e **3 menos** (amarelo) frequentes no historico total.
As demais dezenas ficam em cinza — clique na legenda para isolar traces.\
"""

CELL_TEMPORAL = """\
WINDOW = 200
STEP   = 50

freq_total = Counter(all_dezenas())
top3 = [n for n, _ in freq_total.most_common(3)]
bot3 = [n for n, _ in sorted(freq_total.items(), key=lambda x: x[1])[:3]]

janelas = []
for start in range(0, len(df) - WINDOW + 1, STEP):
    bloco      = df.iloc[start: start + WINDOW]
    freq_bloco = Counter(bloco[DEZENA_COLS].values.flatten())
    c_meio     = int(bloco["numero"].median())
    for d in range(1, 61):
        janelas.append({"concurso": c_meio, "dezena": d, "freq": freq_bloco.get(d, 0)})

df_ev = pd.DataFrame(janelas)

fig = go.Figure()

# Fundo: todas as dezenas em cinza
for dezena in range(1, 61):
    if dezena in top3 or dezena in bot3:
        continue
    sub = df_ev[df_ev["dezena"] == dezena].sort_values("concurso")
    fig.add_trace(go.Scatter(
        x=sub["concurso"], y=sub["freq"],
        mode="lines",
        line=dict(color=MUTED, width=0.5),
        opacity=0.25,
        showlegend=False,
        hoverinfo="skip",
    ))

# Destaque: top3 e bot3
for dezena in top3:
    sub = df_ev[df_ev["dezena"] == dezena].sort_values("concurso")
    fig.add_trace(go.Scatter(
        x=sub["concurso"], y=sub["freq"],
        mode="lines",
        name=f"Dezena {dezena} (top)",
        line=dict(color=ACCENT, width=2.5),
        hovertemplate=f"Dezena {dezena}<br>Concurso: %{{x}}<br>Freq: %{{y}}<extra></extra>",
    ))

for dezena in bot3:
    sub = df_ev[df_ev["dezena"] == dezena].sort_values("concurso")
    fig.add_trace(go.Scatter(
        x=sub["concurso"], y=sub["freq"],
        mode="lines",
        name=f"Dezena {dezena} (bottom)",
        line=dict(color=HIGHLIGHT, width=2.5, dash="dash"),
        hovertemplate=f"Dezena {dezena}<br>Concurso: %{{x}}<br>Freq: %{{y}}<extra></extra>",
    ))

fig.update_layout(
    **LAYOUT,
    title=f"Evolucao temporal da frequencia (janela={WINDOW} concursos, passo={STEP})",
    xaxis=dict(title="Num. do concurso", gridcolor="#e0e0e0"),
    yaxis=dict(title=f"Freq. em janela de {WINDOW} sorteios", gridcolor="#e0e0e0"),
    height=480,
)
fig.write_html(EXPORTS / "eda_06_evolucao_temporal.html")
fig.show()

print(f"Top 3: {top3} | Bottom 3: {bot3}")\
"""

CELL_MD_7 = """\
## 7. Co-ocorrencia de pares de dezenas

Top 30 pares que mais saem juntos. A linha tracejada marca o valor esperado por distribuicao uniforme:
`C(6,2) / C(60,2) * total_sorteios ≈ 25x`.\
"""

CELL_PARES_CO = """\
pares = []
for row in df[DEZENA_COLS].itertuples(index=False):
    pares.extend(combinations(sorted(row), 2))

freq_pares = Counter(pares)
top30      = freq_pares.most_common(30)
esperado   = len(df) * 15 / 1770

labels = [f"{a}-{b}" for (a, b), _ in top30]
values = [v for _, v in top30]
desvio = [f"{(v - esperado) / esperado * 100:+.1f}%" for v in values]

fig = go.Figure(go.Bar(
    x=values[::-1],
    y=labels[::-1],
    orientation="h",
    marker_color=[ACCENT if v > esperado else MUTED for v in values[::-1]],
    text=[f"{v}x ({d})" for v, d in zip(values[::-1], desvio[::-1])],
    textposition="outside",
    hovertemplate="Par <b>%{y}</b><br>Co-ocorrencias: <b>%{x}</b><br>%{text}<extra></extra>",
))

fig.add_vline(x=esperado, line_dash="dash", line_color=HIGHLIGHT, line_width=2,
              annotation_text=f"Esperado: {esperado:.0f}x",
              annotation_position="top")

fig.update_layout(
    **LAYOUT,
    title="Top 30 pares de dezenas mais frequentes",
    xaxis=dict(title="Num. de co-ocorrencias", gridcolor="#e0e0e0"),
    yaxis=dict(title="Par", gridcolor="#e0e0e0", tickfont=dict(size=10)),
    height=650,
    showlegend=False,
    margin=dict(t=70, b=50, l=80, r=120),
)
fig.write_html(EXPORTS / "eda_07_pares_coocorrencia.html")
fig.show()

print(f"Esperado por par: {esperado:.1f}x")
print(f"Top 5 pares: {top30[:5]}")\
"""

# ---------------------------------------------------------------------------
# Monta o notebook
# ---------------------------------------------------------------------------

nb = nbf.v4.new_notebook()
nb.metadata = {
    "kernelspec": {
        "display_name": "Python 3 (ipykernel)",
        "language": "python",
        "name": "python3",
    },
    "language_info": {"name": "python", "version": "3.12.3"},
}

nb.cells = [
    md(CELL_TITLE),
    code(CELL_IMPORTS),
    md("## Dados"),
    code(CELL_LOAD),
    code(CELL_INFO),
    md(CELL_MD_1),
    code(CELL_FREQ),
    md(CELL_MD_2),
    code(CELL_FAIXA),
    md(CELL_MD_3),
    code(CELL_PARES),
    md(CELL_MD_4),
    code(CELL_SOMA),
    md(CELL_MD_5),
    code(CELL_GAP),
    md(CELL_MD_6),
    code(CELL_TEMPORAL),
    md(CELL_MD_7),
    code(CELL_PARES_CO),
]

nbf.write(nb, str(OUT))
print(f"Notebook gerado: {OUT}")
