#!/usr/bin/env python3
"""
generate_eda_notebook.py
Gera 01_eda.ipynb usando nbformat.
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
# Fontes das celulas
# ---------------------------------------------------------------------------

CELL_TITLE = """\
# EDA — Mega Sena Analytics
**Analise Exploratoria Inicial** dos sorteios historicos da Mega Sena (1996–2026).

Dados: `data/sorteios.json` — 3.002 concursos coletados via API da Caixa.\
"""

CELL_IMPORTS = """\
import json
import warnings
from collections import Counter
from itertools import combinations
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

warnings.filterwarnings("ignore")
%matplotlib inline

# -- Paths
ROOT      = Path().resolve().parents[1]   # raiz do repo
DATA_PATH = ROOT / "data" / "sorteios.json"
EXPORTS   = ROOT / "python" / "exports"
EXPORTS.mkdir(exist_ok=True)

# -- Paleta global (reutilizar em todas as analises)
PRIMARY   = "#1a1a2e"
ACCENT    = "#e94560"
HIGHLIGHT = "#f5a623"
MUTED     = "#8892b0"
BG        = "#f8f9fa"

sns.set_theme(style="whitegrid", font_scale=1.1)
plt.rcParams.update({
    "figure.facecolor": BG,
    "axes.facecolor":   BG,
    "axes.edgecolor":   PRIMARY,
    "axes.labelcolor":  PRIMARY,
    "xtick.color":      PRIMARY,
    "ytick.color":      PRIMARY,
    "text.color":       PRIMARY,
    "grid.color":       "#e0e0e0",
    "font.family":      "DejaVu Sans",
})

DEZENA_COLS = ["d1", "d2", "d3", "d4", "d5", "d6"]
print("Imports OK")\
"""

CELL_LOAD = """\
# -- Load & Flatten
raw  = json.load(open(DATA_PATH))
rows = []

for c in raw:
    rateo   = {r["faixa"]: r for r in c.get("listaRateioPremio", [])}
    dezenas = sorted([int(x) for x in c["listaDezenas"]])
    sorteio = [int(x) for x in c["dezenasSorteadasOrdemSorteio"]]
    rows.append({
        # identificacao
        "numero":       c["numero"],
        "data":         pd.to_datetime(c["dataApuracao"], dayfirst=True),
        "acumulado":    bool(c["acumulado"]),
        "especial":     c["indicadorConcursoEspecial"] != 1,
        "local":        c.get("localSorteio", ""),
        "cidade":       c.get("nomeMunicipioUFSorteio", ""),
        # dezenas em ordem crescente
        "d1": dezenas[0], "d2": dezenas[1], "d3": dezenas[2],
        "d4": dezenas[3], "d5": dezenas[4], "d6": dezenas[5],
        # dezenas em ordem de sorteio
        "s1": sorteio[0], "s2": sorteio[1], "s3": sorteio[2],
        "s4": sorteio[3], "s5": sorteio[4], "s6": sorteio[5],
        # financeiro
        "valor_arrecadado":        c.get("valorArrecadado", 0.0),
        "valor_acumulado_proximo": c.get("valorAcumuladoProximoConcurso", 0.0),
        "valor_estimado_proximo":  c.get("valorEstimadoProximoConcurso", 0.0),
        "premio_total_sena":       c.get("valorTotalPremioFaixaUm", 0.0),
        # rateio por faixa
        "ganhadores_6": rateo.get(1, {}).get("numeroDeGanhadores", 0),
        "premio_6":     rateo.get(1, {}).get("valorPremio", 0.0),
        "ganhadores_5": rateo.get(2, {}).get("numeroDeGanhadores", 0),
        "premio_5":     rateo.get(2, {}).get("valorPremio", 0.0),
        "ganhadores_4": rateo.get(3, {}).get("numeroDeGanhadores", 0),
        "premio_4":     rateo.get(3, {}).get("valorPremio", 0.0),
    })

df = pd.DataFrame(rows).sort_values("numero").reset_index(drop=True)

# helper: todas as dezenas como array flat
def all_dezenas(d=df):
    return d[DEZENA_COLS].values.flatten()

print(f"{len(df)} concursos | {df['data'].min().date()} -> {df['data'].max().date()}")
df.head(3)\
"""

CELL_INFO = """\
df.info()\
"""

CELL_MD_1 = """\
## 1. Frequencia historica de cada dezena

Quantas vezes cada dezena (1–60) foi sorteada em toda a historia.\
"""

CELL_FREQ = """\
freq   = Counter(all_dezenas())
nums   = np.arange(1, 61)
counts = [freq[n] for n in nums]
media  = np.mean(counts)

top5 = sorted(range(1, 61), key=lambda n: freq[n], reverse=True)[:5]
bot5 = sorted(range(1, 61), key=lambda n: freq[n])[:5]

fig, ax = plt.subplots(figsize=(16, 5))
colors = [ACCENT if c >= media else MUTED for c in counts]
ax.bar(nums, counts, color=colors, width=0.8)
ax.axhline(media, color=HIGHLIGHT, lw=1.8, ls="--", label=f"Media ({media:.0f}x)")

for n in top5 + bot5:
    ax.text(n, freq[n] + 4, str(n), ha="center", va="bottom",
            fontsize=7, color=PRIMARY, fontweight="bold")

ax.set_xlabel("Dezena")
ax.set_ylabel("Num. de sorteios")
ax.set_title("Frequencia historica de cada dezena (1996-2026)",
             pad=14, fontsize=14, fontweight="bold")
ax.set_xticks(nums)
ax.tick_params(axis="x", labelsize=7)
ax.legend(framealpha=0)
sns.despine(ax=ax)
fig.tight_layout()
fig.savefig(EXPORTS / "eda_01_frequencia_dezenas.png", dpi=150, bbox_inches="tight")
plt.show()

print(f"Mais frequentes : {sorted(top5)}")
print(f"Menos frequentes: {sorted(bot5)}")\
"""

CELL_MD_2 = """\
## 2. Frequencia por faixa de dezena

Distribuicao dos sorteios agrupados por faixa (01–10, 11–20, ...).\
"""

CELL_FAIXA = """\
dezenas   = all_dezenas()
labels    = ["01-10", "11-20", "21-30", "31-40", "41-50", "51-60"]
bins      = [0, 10, 20, 30, 40, 50, 60]
counts, _ = np.histogram(dezenas, bins=bins)
esperado  = dezenas.size / 6

fig, ax = plt.subplots(figsize=(9, 5))
colors = [ACCENT if c > esperado else MUTED for c in counts]
bars   = ax.bar(labels, counts, color=colors, width=0.6)
ax.axhline(esperado, color=HIGHLIGHT, lw=1.8, ls="--", label=f"Esperado ({esperado:.0f})")
for bar, count in zip(bars, counts):
    pct = 100 * count / dezenas.size
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 80,
            f"{count:,}\\n({pct:.1f}%)", ha="center", fontsize=9.5, color=PRIMARY)
ax.set_xlabel("Faixa")
ax.set_ylabel("Num. de sorteios")
ax.set_title("Sorteios por faixa de dezena", pad=14, fontsize=14, fontweight="bold")
ax.legend(framealpha=0)
sns.despine(ax=ax)
fig.tight_layout()
fig.savefig(EXPORTS / "eda_02_frequencia_faixa.png", dpi=150, bbox_inches="tight")
plt.show()\
"""

CELL_MD_3 = """\
## 3. Distribuicao de pares e impares por sorteio

Quantos numeros pares e impares saem em cada sorteio.\
"""

CELL_PARES = """\
n_pares  = df[DEZENA_COLS].apply(lambda row: (row % 2 == 0).sum(), axis=1)
contagem = n_pares.value_counts().sort_index()

fig, ax = plt.subplots(figsize=(9, 5))
labels = [f"{p}P / {6 - p}I" for p in contagem.index]
colors = [ACCENT if p == 3 else MUTED for p in contagem.index]
bars   = ax.bar(labels, contagem.values, color=colors, width=0.6)
for bar, val in zip(bars, contagem.values):
    pct = 100 * val / len(df)
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 8,
            f"{pct:.1f}%", ha="center", fontsize=10, color=PRIMARY)
ax.set_xlabel("Composicao par / impar")
ax.set_ylabel("Num. de sorteios")
ax.set_title("Distribuicao de pares e impares por sorteio",
             pad=14, fontsize=14, fontweight="bold")
sns.despine(ax=ax)
fig.tight_layout()
fig.savefig(EXPORTS / "eda_03_pares_impares.png", dpi=150, bbox_inches="tight")
plt.show()

print(n_pares.describe())\
"""

CELL_MD_4 = """\
## 4. Distribuicao da soma dos 6 numeros

A soma dos 6 numeros sorteados deve se aproximar de uma distribuicao normal pelo TCL.\
"""

CELL_SOMA = """\
soma = df[DEZENA_COLS].sum(axis=1)

fig, ax = plt.subplots(figsize=(12, 5))
ax.hist(soma, bins=55, color=ACCENT, edgecolor=BG, linewidth=0.4, alpha=0.85)
ax.axvline(soma.mean(),   color=HIGHLIGHT, lw=2.0, ls="--",
           label=f"Media ({soma.mean():.0f})")
ax.axvline(soma.median(), color=PRIMARY,   lw=1.5, ls=":",
           label=f"Mediana ({soma.median():.0f})")
ax.set_xlabel("Soma dos 6 numeros sorteados")
ax.set_ylabel("Num. de sorteios")
ax.set_title("Distribuicao da soma dos 6 numeros por sorteio",
             pad=14, fontsize=14, fontweight="bold")
ax.legend(framealpha=0)
sns.despine(ax=ax)
fig.tight_layout()
fig.savefig(EXPORTS / "eda_04_soma_dezenas.png", dpi=150, bbox_inches="tight")
plt.show()

soma.describe()\
"""

CELL_MD_5 = """\
## 5. Gap entre aparicoes de cada dezena

Intervalo (em numero de concursos) entre duas aparicoes consecutivas da mesma dezena.\
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

fig, axes = plt.subplots(1, 2, figsize=(15, 5))

# Histograma geral
axes[0].hist(all_gaps, bins=60, color=ACCENT, edgecolor=BG, lw=0.3, alpha=0.85)
axes[0].axvline(all_gaps.mean(), color=HIGHLIGHT, lw=2, ls="--",
                label=f"Media ({all_gaps.mean():.1f} concursos)")
axes[0].set_xlabel("Concursos entre aparicoes da mesma dezena")
axes[0].set_ylabel("Frequencia")
axes[0].set_title("Distribuicao do gap entre aparicoes",
                  pad=12, fontsize=13, fontweight="bold")
axes[0].legend(framealpha=0)
sns.despine(ax=axes[0])

# Gap medio por dezena
nums   = list(media_gaps.keys())
meias  = list(media_gaps.values())
m_ger  = np.mean(meias)
colors = [ACCENT if v > m_ger else MUTED for v in meias]
axes[1].bar(nums, meias, color=colors, width=0.8)
axes[1].axhline(m_ger, color=HIGHLIGHT, lw=1.5, ls="--", label=f"Media ({m_ger:.1f})")
axes[1].set_xlabel("Dezena")
axes[1].set_ylabel("Gap medio (concursos)")
axes[1].set_title("Gap medio por dezena", pad=12, fontsize=13, fontweight="bold")
axes[1].set_xticks(nums)
axes[1].tick_params(axis="x", labelsize=7)
axes[1].legend(framealpha=0)
sns.despine(ax=axes[1])

fig.tight_layout()
fig.savefig(EXPORTS / "eda_05_gap_dezenas.png", dpi=150, bbox_inches="tight")
plt.show()

print(f"Gap global: media={all_gaps.mean():.1f} | mediana={np.median(all_gaps):.1f} | max={all_gaps.max()}")\
"""

CELL_MD_6 = """\
## 6. Evolucao temporal da frequencia

Frequencia de cada dezena em uma janela deslizante de 200 concursos.
Destaque para as 3 mais e 3 menos frequentes na historia completa.\
"""

CELL_TEMPORAL = """\
WINDOW = 200
STEP   = 50

freq = Counter(all_dezenas())
top3 = [n for n, _ in freq.most_common(3)]
bot3 = [n for n, _ in sorted(freq.items(), key=lambda x: x[1])[:3]]

janelas = []
for start in range(0, len(df) - WINDOW + 1, STEP):
    bloco      = df.iloc[start: start + WINDOW]
    freq_bloco = Counter(bloco[DEZENA_COLS].values.flatten())
    c_meio     = int(bloco["numero"].median())
    for d in range(1, 61):
        janelas.append({"concurso": c_meio, "dezena": d, "freq": freq_bloco.get(d, 0)})

df_ev = pd.DataFrame(janelas)

fig, ax = plt.subplots(figsize=(14, 6))
for dezena in range(1, 61):
    sub = df_ev[df_ev["dezena"] == dezena].sort_values("concurso")
    if dezena in top3:
        ax.plot(sub["concurso"], sub["freq"], color=ACCENT, lw=2, alpha=0.9,
                label=f"Dezena {dezena} (top)")
    elif dezena in bot3:
        ax.plot(sub["concurso"], sub["freq"], color=HIGHLIGHT, lw=2,
                ls="--", alpha=0.9, label=f"Dezena {dezena} (bottom)")
    else:
        ax.plot(sub["concurso"], sub["freq"], color=MUTED, lw=0.4, alpha=0.2)

ax.set_xlabel("Num. do concurso")
ax.set_ylabel(f"Freq. em janela de {WINDOW} sorteios")
ax.set_title(f"Evolucao temporal da frequencia (janela={WINDOW}, passo={STEP})",
             pad=14, fontsize=14, fontweight="bold")
handles, labels = ax.get_legend_handles_labels()
ax.legend(handles, labels, framealpha=0, fontsize=9)
sns.despine(ax=ax)
fig.tight_layout()
fig.savefig(EXPORTS / "eda_06_evolucao_temporal.png", dpi=150, bbox_inches="tight")
plt.show()

print(f"Top 3: {top3} | Bottom 3: {bot3}")\
"""

CELL_MD_7 = """\
## 7. Co-ocorrencia de pares de dezenas

Os 30 pares que mais saem juntos, comparados ao valor esperado por distribuicao uniforme.
Esperado: `C(6,2) / C(60,2) * total_sorteios = ~25x`.\
"""

CELL_PARES_CO = """\
pares = []
for row in df[DEZENA_COLS].itertuples(index=False):
    pares.extend(combinations(sorted(row), 2))

freq_pares = Counter(pares)
top30      = freq_pares.most_common(30)
esperado   = len(df) * 15 / 1770  # C(6,2) / C(60,2)

labels = [f"{a}-{b}" for (a, b), _ in top30]
values = [v for _, v in top30]

fig, ax = plt.subplots(figsize=(13, 8))
colors = [ACCENT if v > esperado else MUTED for v in values]
ax.barh(labels[::-1], values[::-1], color=colors[::-1], height=0.7)
ax.axvline(esperado, color=HIGHLIGHT, lw=1.8, ls="--",
           label=f"Esperado ({esperado:.0f}x)")
ax.set_xlabel("Num. de co-ocorrencias")
ax.set_title("Top 30 pares de dezenas mais frequentes",
             pad=14, fontsize=14, fontweight="bold")
ax.legend(framealpha=0)
sns.despine(ax=ax)
fig.tight_layout()
fig.savefig(EXPORTS / "eda_07_pares_coocorrencia.png", dpi=150, bbox_inches="tight")
plt.show()

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
    "language_info": {
        "name": "python",
        "version": "3.12.3",
    },
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
