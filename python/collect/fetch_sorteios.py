#!/usr/bin/env python3
"""
fetch_sorteios.py
Coleta incremental dos sorteios da Mega Sena via API da Caixa.
Detecta o último concurso no arquivo local e busca apenas os novos.
Saída: ../../data/sorteios.json
"""

import json
import time
import requests
from pathlib import Path

API_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena"
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "sorteios.json"


def fetch_concurso(numero: int) -> dict | None:
    url = f"{API_BASE}/{numero}"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            return None  # Concurso não existe — fim da série
        raise
    except Exception as e:
        print(f"Erro no concurso {numero}: {e}")
        return None


def load_existing() -> list[dict]:
    if DATA_PATH.exists():
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save(data: list[dict]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Salvo: {DATA_PATH} ({len(data)} concursos)")


def main():
    existing = load_existing()
    last = max((c["numero"] for c in existing), default=0)
    print(f"Último concurso local: {last}")

    novos = []
    numero = last + 1

    while True:
        print(f"Buscando concurso {numero}...", end=" ")
        data = fetch_concurso(numero)
        if data is None:
            print("não encontrado. Fim.")
            break
        novos.append(data)
        print("OK")
        numero += 1
        time.sleep(0.3)  # Throttle leve para não bater no rate limit

    if novos:
        save(existing + novos)
        print(f"{len(novos)} novos concursos adicionados.")
    else:
        print("Nenhum concurso novo.")


if __name__ == "__main__":
    main()
