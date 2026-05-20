#!/usr/bin/env python3
"""
fetch_sorteios.py
Coleta incremental dos sorteios da Mega Sena via API da Caixa.
Detecta o ultimo concurso no arquivo local e busca apenas os novos.
Saida: ../../data/sorteios.json
"""

import json
import logging
import sys
import time
from pathlib import Path

import requests

API_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena"
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "sorteios.json"
LOG_PATH = Path(__file__).resolve().parents[2] / "data" / "collect.log"
DELAY = 0.3
PROGRESS_EVERY = 50


def setup_logging() -> None:
    fmt = "%(asctime)s [%(levelname)s] %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"
    stdout_handler = logging.StreamHandler(sys.stdout)
    file_handler = logging.FileHandler(LOG_PATH, encoding="utf-8")
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        datefmt=datefmt,
        handlers=[stdout_handler, file_handler],
    )


def fetch_ultimo_concurso() -> int:
    """Busca o numero do ultimo concurso disponivel na API (upper bound)."""
    r = requests.get(API_BASE, timeout=10)
    r.raise_for_status()
    return r.json()["numero"]


def fetch_concurso(numero: int) -> dict | None:
    url = f"{API_BASE}/{numero}"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            return None
        raise
    except Exception as e:
        logging.warning("Concurso %d: %s", numero, e)
        return None


def load_existing() -> list[dict]:
    if DATA_PATH.exists():
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        logging.info("Arquivo local: %d concursos.", len(data))
        return data
    logging.info("Nenhum arquivo local. Iniciando coleta completa.")
    return []


def save(data: list[dict]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    logging.info("Salvo: %s (%d concursos)", DATA_PATH, len(data))


def main():
    setup_logging()
    logging.info("=== Inicio da coleta ===")

    existing = load_existing()
    last_local = max((c["numero"] for c in existing), default=0)
    logging.info("Ultimo concurso local: %d", last_local)

    logging.info("Consultando ultimo concurso disponivel na API...")
    last_api = fetch_ultimo_concurso()
    logging.info("Ultimo concurso na API: %d", last_api)

    total = last_api - last_local
    if total <= 0:
        logging.info("Nenhum concurso novo. Arquivo ja atualizado.")
        return

    logging.info("Buscando %d concursos (%d -> %d)...", total, last_local + 1, last_api)

    novos = []
    erros = []
    start = time.time()

    for i, numero in enumerate(range(last_local + 1, last_api + 1), start=1):
        data = fetch_concurso(numero)
        if data is None:
            logging.warning("Concurso %d: sem dados, pulando.", numero)
            erros.append(numero)
        else:
            novos.append(data)

        if i % PROGRESS_EVERY == 0 or i == total:
            elapsed = time.time() - start
            rate = i / elapsed if elapsed > 0 else 0
            eta = (total - i) / rate if rate > 0 else 0
            logging.info(
                "Progresso: %d/%d (%.1f%%) | %.1f req/s | ETA %.0fs",
                i, total, 100 * i / total, rate, eta,
            )

        time.sleep(DELAY)

    if novos:
        save(existing + novos)

    logging.info("Concluido: %d novos adicionados, %d erros.", len(novos), len(erros))
    if erros:
        logging.warning("Concursos com erro: %s", erros)
    logging.info("=== Fim da coleta ===")


if __name__ == "__main__":
    main()
