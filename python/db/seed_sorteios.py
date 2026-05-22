#!/usr/bin/env python3
"""
seed_sorteios.py
Popula (ou atualiza) a tabela sorteios no Supabase a partir de sorteios.json.
Idempotente: upsert por concurso. Pode rodar quantas vezes quiser.

Uso:
    source python/.venv/bin/activate
    python python/db/seed_sorteios.py
"""
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH    = PROJECT_ROOT / "data" / "sorteios.json"
LOG_PATH     = PROJECT_ROOT / "data" / "seed.log"
BATCH_SIZE   = 200

load_dotenv(PROJECT_ROOT / ".env.local", override=True)
load_dotenv(PROJECT_ROOT / ".env")


def setup_logging():
    fmt = "%(asctime)s [%(levelname)s] %(message)s"
    logging.basicConfig(
        level=logging.INFO, format=fmt, datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout),
                  logging.FileHandler(LOG_PATH, encoding="utf-8")],
    )


def connect():
    url = (
        os.getenv("spdb_passando_da_sena_beta_POSTGRES_URL_NON_POOLING")
        or os.getenv("SUPABASE_DB_URL")
    )
    if not url:
        sys.exit("SUPABASE_DB_URL nao definida.")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


def parse_date(s: str):
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%d/%m/%Y").date()
    except ValueError:
        return None


def parse_municipio_uf(s: str):
    if not s or not s.strip():
        return None, None
    parts = s.rsplit(",", 1)
    if len(parts) == 2:
        return parts[0].strip().upper(), parts[1].strip().upper()[:2]
    return s.strip().upper(), None


def premio_por_faixa(lista, faixa):
    for item in lista or []:
        if item.get("faixa") == faixa:
            return item.get("valorPremio") or None
    return None


def ganhadores_por_faixa(lista, faixa):
    for item in lista or []:
        if item.get("faixa") == faixa:
            return item.get("numeroDeGanhadores")
    return None


def parse_record(raw: dict) -> dict:
    rateiro       = raw.get("listaRateioPremio") or []
    municipio, uf = parse_municipio_uf(raw.get("nomeMunicipioUFSorteio", ""))
    dezenas_ordem = [int(d) for d in (raw.get("dezenasSorteadasOrdemSorteio") or [])]
    numeros       = sorted(int(d) for d in (raw.get("listaDezenas") or []))

    return {
        "concurso":            raw["numero"],
        "data_sorteio":        parse_date(raw.get("dataApuracao", "")),
        "numeros":             numeros,
        "acumulou":            bool(raw.get("acumulado", False)),
        "premio_sena":         premio_por_faixa(rateiro, 1),
        "premio_quina":        premio_por_faixa(rateiro, 2),
        "premio_quadra":       premio_por_faixa(rateiro, 3),
        "arrecadacao":         raw.get("valorArrecadado") or None,
        "local_sorteio":       (raw.get("localSorteio") or "").strip() or None,
        "municipio":           municipio,
        "uf":                  uf,
        "dezenas_ordem":       dezenas_ordem or None,
        "valor_acumulado":     raw.get("valorAcumuladoProximoConcurso") or None,
        "valor_estimado_prox": raw.get("valorEstimadoProximoConcurso") or None,
        "ganhadores_sena":     ganhadores_por_faixa(rateiro, 1),
    }


UPSERT_SQL = """
INSERT INTO public.sorteios (
    concurso, data_sorteio, numeros, acumulou,
    premio_sena, premio_quina, premio_quadra, arrecadacao,
    local_sorteio, municipio, uf, dezenas_ordem,
    valor_acumulado, valor_estimado_prox, ganhadores_sena
) VALUES (
    %(concurso)s, %(data_sorteio)s, %(numeros)s, %(acumulou)s,
    %(premio_sena)s, %(premio_quina)s, %(premio_quadra)s, %(arrecadacao)s,
    %(local_sorteio)s, %(municipio)s, %(uf)s, %(dezenas_ordem)s,
    %(valor_acumulado)s, %(valor_estimado_prox)s, %(ganhadores_sena)s
)
ON CONFLICT (concurso) DO UPDATE SET
    data_sorteio        = EXCLUDED.data_sorteio,
    numeros             = EXCLUDED.numeros,
    acumulou            = EXCLUDED.acumulou,
    premio_sena         = EXCLUDED.premio_sena,
    premio_quina        = EXCLUDED.premio_quina,
    premio_quadra       = EXCLUDED.premio_quadra,
    arrecadacao         = EXCLUDED.arrecadacao,
    local_sorteio       = EXCLUDED.local_sorteio,
    municipio           = EXCLUDED.municipio,
    uf                  = EXCLUDED.uf,
    dezenas_ordem       = EXCLUDED.dezenas_ordem,
    valor_acumulado     = EXCLUDED.valor_acumulado,
    valor_estimado_prox = EXCLUDED.valor_estimado_prox,
    ganhadores_sena     = EXCLUDED.ganhadores_sena;
"""


def main():
    setup_logging()
    log = logging.getLogger()

    log.info("Lendo %s", DATA_PATH)
    raw_list = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    log.info("Total de registros no JSON: %d", len(raw_list))

    records = [parse_record(r) for r in raw_list]
    log.info("Parsing concluido. Conectando ao Supabase...")

    conn = connect()
    try:
        with conn.cursor() as cur:
            total = 0
            for i in range(0, len(records), BATCH_SIZE):
                batch = records[i : i + BATCH_SIZE]
                psycopg2.extras.execute_batch(cur, UPSERT_SQL, batch, page_size=BATCH_SIZE)
                total += len(batch)
                log.info("  upsert %d/%d", total, len(records))
        conn.commit()
        log.info("Seed concluido — %d registros upsertados.", total)
    except Exception as e:
        conn.rollback()
        log.error("Erro — rollback: %s", e)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
