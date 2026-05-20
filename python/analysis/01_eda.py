#!/usr/bin/env python3
"""
01_eda.py -- Analise Exploratoria Inicial dos sorteios historicos da Mega Sena
Execucao: python analysis/01_eda.py  (com venv ativo)
Saida: ../exports/eda_*.png
"""

import json
import logging
import sys
from collections import Counter
from itertools import combinations
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# -- Paths ---------------------------------------------------------------------
ROOT      = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "sorteios.json"
EXPORTS   = ROOT / "python" / "exports"
EXPORTS.mkdir(exist_ok=True)

# -- Logging -------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# -- Paleta e estilo global (reutilizar em todas as analises futuras) ----------
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


# -- Load & Flatten ------------------------------------------------------------
def load_flat() -> pd.DataFrame:
    log.info("Carregando e normalizando sorteios.json...")
    raw = json.load(open(DATA_PATH))
    rows = []
    for c in raw:
        rateo   = {r["faixa"]: r for r in c.get("listaRateioPremio", [])}
        dezenas = sorted([int(x) for x in c["listaDezenas"]])
        sorteio = [int(x) for x in c["dezenasSorteadasOrdemSorteio"]]
        row = {
            # identificacao
            "numero":               c["numero"],
            "data":                 pd.to_datetime(c["dataApuracao"], dayfirst=True),
            "acumulado":            bool(c["acumulado"]),
            "especial":             c["indicadorConcursoEspecial"] != 1,
            "local":                c.get("localSorteio", ""),
            "cidade_sorteio":       c.get("nomeMunicipioUFSorteio", ""),
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
        }
        rows.append(row)

    df = pd.DataFrame(rows).sort_values("numero").reset_index(drop=True)
    log.info("DataFrame: %d linhas, %d colunas", len(df), len(df.columns))
    log.info("Periodo: %s -> %s", df["data"].min().date(), df["data"].max().date())
    return df


def all_dezenas(df: pd.DataFrame) -> np.ndarray:
    return df[DEZENA_COLS].values.flatten()


# -- Plot 1: Frequencia de cada dezena ----------------------------------------
def plot_frequencia(df: pd.DataFrame) -> None:
    log.info("[1/7] Frequencia de dezenas...")
    freq   = Counter(all_dezenas(df))
    nums   = np.arange(1, 61)
    counts = [freq[n] for n in nums]
    media  = np.mean(counts)

    fig, ax = plt.subplots(figsize=(16, 5))
    colors = [ACCENT if c >= media else MUTED for c in counts]
    ax.bar(nums, counts, color=colors, width=0.8)
    ax.axhline(media, color=HIGHLIGHT, lw=1.8, ls="--", label=f"Media ({media:.0f}x)")

    top5 = sorted(range(1, 61), key=lambda n: freq[n], reverse=True)[:5]
    bot5 = sorted(range(1, 61), key=lambda n: freq[n])[:5]
    for n in top5 + bot5:
        ax.text(n, freq[n] + 5, str(n), ha="center", va="bottom",
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
    out = EXPORTS / "eda_01_frequencia_dezenas.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s | top5=%s | bot5=%s", out.name, sorted(top5), sorted(bot5))


# -- Plot 2: Frequencia por faixa de dezena -----------------------------------
def plot_frequencia_faixa(df: pd.DataFrame) -> None:
    log.info("[2/7] Frequencia por faixa...")
    dezenas   = all_dezenas(df)
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
                f"{count:,}\n({pct:.1f}%)", ha="center", fontsize=9.5, color=PRIMARY)
    ax.set_xlabel("Faixa")
    ax.set_ylabel("Num. de sorteios")
    ax.set_title("Sorteios por faixa de dezena", pad=14, fontsize=14, fontweight="bold")
    ax.legend(framealpha=0)
    sns.despine(ax=ax)
    fig.tight_layout()
    out = EXPORTS / "eda_02_frequencia_faixa.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s", out.name)


# -- Plot 3: Pares e impares por sorteio --------------------------------------
def plot_pares_impares(df: pd.DataFrame) -> None:
    log.info("[3/7] Pares e impares...")
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
    out = EXPORTS / "eda_03_pares_impares.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s", out.name)


# -- Plot 4: Distribuicao da soma dos 6 numeros --------------------------------
def plot_soma(df: pd.DataFrame) -> None:
    log.info("[4/7] Soma dos 6 numeros...")
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
    out = EXPORTS / "eda_04_soma_dezenas.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s | media=%.1f | std=%.1f | min=%d | max=%d",
             out.name, soma.mean(), soma.std(), soma.min(), soma.max())


# -- Plot 5: Gap entre aparicoes de cada dezena --------------------------------
def plot_gap(df: pd.DataFrame) -> None:
    log.info("[5/7] Gap entre aparicoes...")
    gaps_por_dezena = {}
    for num in range(1, 61):
        mask      = df[DEZENA_COLS].isin([num]).any(axis=1)
        concursos = df.loc[mask, "numero"].values
        if len(concursos) > 1:
            gaps_por_dezena[num] = np.diff(concursos)

    all_gaps  = np.concatenate(list(gaps_por_dezena.values()))
    media_gaps = {n: g.mean() for n, g in gaps_por_dezena.items()}

    fig, axes = plt.subplots(1, 2, figsize=(15, 5))

    axes[0].hist(all_gaps, bins=60, color=ACCENT, edgecolor=BG, lw=0.3, alpha=0.85)
    axes[0].axvline(all_gaps.mean(), color=HIGHLIGHT, lw=2, ls="--",
                    label=f"Media ({all_gaps.mean():.1f} concursos)")
    axes[0].set_xlabel("Concursos entre aparicoes da mesma dezena")
    axes[0].set_ylabel("Frequencia")
    axes[0].set_title("Distribuicao do gap entre aparicoes",
                      pad=12, fontsize=13, fontweight="bold")
    axes[0].legend(framealpha=0)
    sns.despine(ax=axes[0])

    nums  = list(media_gaps.keys())
    meias = list(media_gaps.values())
    m_geral = np.mean(meias)
    colors  = [ACCENT if v > m_geral else MUTED for v in meias]
    axes[1].bar(nums, meias, color=colors, width=0.8)
    axes[1].axhline(m_geral, color=HIGHLIGHT, lw=1.5, ls="--",
                    label=f"Media geral ({m_geral:.1f})")
    axes[1].set_xlabel("Dezena")
    axes[1].set_ylabel("Gap medio (concursos)")
    axes[1].set_title("Gap medio por dezena", pad=12, fontsize=13, fontweight="bold")
    axes[1].set_xticks(nums)
    axes[1].tick_params(axis="x", labelsize=7)
    axes[1].legend(framealpha=0)
    sns.despine(ax=axes[1])

    fig.tight_layout()
    out = EXPORTS / "eda_05_gap_dezenas.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s | gap medio global=%.1f", out.name, all_gaps.mean())


# -- Plot 6: Evolucao temporal (janela deslizante) ----------------------------
def plot_evolucao_temporal(df: pd.DataFrame) -> None:
    log.info("[6/7] Evolucao temporal...")
    WINDOW = 200
    STEP   = 50

    freq = Counter(all_dezenas(df))
    top3 = [n for n, _ in freq.most_common(3)]
    bot3 = [n for n, _ in sorted(freq.items(), key=lambda x: x[1])[:3]]

    janelas = []
    for start in range(0, len(df) - WINDOW + 1, STEP):
        bloco      = df.iloc[start: start + WINDOW]
        freq_bloco = Counter(bloco[DEZENA_COLS].values.flatten())
        concurso_meio = int(bloco["numero"].median())
        for d in range(1, 61):
            janelas.append({"concurso": concurso_meio, "dezena": d,
                            "freq": freq_bloco.get(d, 0)})

    df_ev = pd.DataFrame(janelas)

    fig, ax = plt.subplots(figsize=(14, 6))
    for dezena in range(1, 61):
        sub = df_ev[df_ev["dezena"] == dezena].sort_values("concurso")
        if dezena in top3:
            ax.plot(sub["concurso"], sub["freq"], color=ACCENT, lw=2, alpha=0.9,
                    label=f"Dezena {dezena} (top freq.)")
        elif dezena in bot3:
            ax.plot(sub["concurso"], sub["freq"], color=HIGHLIGHT, lw=2,
                    ls="--", alpha=0.9, label=f"Dezena {dezena} (baixa freq.)")
        else:
            ax.plot(sub["concurso"], sub["freq"], color=MUTED, lw=0.4, alpha=0.25)

    ax.set_xlabel("Num. do concurso")
    ax.set_ylabel(f"Freq. em janela de {WINDOW} sorteios")
    ax.set_title(f"Evolucao temporal da frequencia (janela={WINDOW}, passo={STEP})",
                 pad=14, fontsize=14, fontweight="bold")
    handles, labels = ax.get_legend_handles_labels()
    ax.legend(handles, labels, framealpha=0, fontsize=9)
    sns.despine(ax=ax)
    fig.tight_layout()
    out = EXPORTS / "eda_06_evolucao_temporal.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s | top3=%s | bot3=%s", out.name, top3, bot3)


# -- Plot 7: Top 30 pares mais frequentes -------------------------------------
def plot_pares_coocorrencia(df: pd.DataFrame) -> None:
    log.info("[7/7] Co-ocorrencia de pares...")
    pares = []
    for row in df[DEZENA_COLS].itertuples(index=False):
        pares.extend(combinations(sorted(row), 2))

    freq_pares = Counter(pares)
    top30      = freq_pares.most_common(30)
    esperado   = len(df) * 15 / 1770  # C(6,2)/C(60,2)

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
    out = EXPORTS / "eda_07_pares_coocorrencia.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("Salvo: %s | esperado=%.1f | top par=%s (%dx)",
             out.name, esperado, top30[0][0], top30[0][1])


# -- Main ----------------------------------------------------------------------
def main():
    log.info("=== EDA Mega Sena ===")
    df = load_flat()

    plot_frequencia(df)
    plot_frequencia_faixa(df)
    plot_pares_impares(df)
    plot_soma(df)
    plot_gap(df)
    plot_evolucao_temporal(df)
    plot_pares_coocorrencia(df)

    log.info("=== Concluida. 7 graficos em %s ===", EXPORTS)


if __name__ == "__main__":
    main()
