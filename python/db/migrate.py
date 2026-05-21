#!/usr/bin/env python3
"""Aplica migrations SQL no banco Supabase.

Uso:
    source python/.venv/bin/activate
    python python/db/migrate.py [migration_file]

    Se migration_file nao for informado, aplica todas de data/migrations/ em ordem.

.env na raiz:
    SUPABASE_DB_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
"""
import os, sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env.local", override=True)
load_dotenv(PROJECT_ROOT / ".env")

MIGRATIONS_DIR = PROJECT_ROOT / "data" / "migrations"


def connect():
    url = (
        os.getenv("spdb_passando_da_sena_beta_POSTGRES_URL_NON_POOLING")
        or os.getenv("SUPABASE_DB_URL")
    )
    if not url:
        sys.exit("SUPABASE_DB_URL ou spdb_passando_da_sena_beta_POSTGRES_URL_NON_POOLING nao definida.")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


def run_migration(conn, sql_path: Path):
    print(f"\nAplicando: {sql_path.name}")
    sql = sql_path.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print(f"  [ok] {sql_path.name} aplicado com sucesso.")


def main():
    conn = connect()
    try:
        if len(sys.argv) > 1:
            target = Path(sys.argv[1])
            if not target.is_absolute():
                target = MIGRATIONS_DIR / target
            if not target.exists():
                sys.exit(f"Arquivo nao encontrado: {target}")
            run_migration(conn, target)
        else:
            files = sorted(MIGRATIONS_DIR.glob("*.sql"))
            if not files:
                print("Nenhuma migration encontrada em data/migrations/")
                return
            for f in files:
                run_migration(conn, f)
        print("\nMigrations concluidas.")
    except Exception as e:
        conn.rollback()
        print(f"\nErro — rollback executado: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
