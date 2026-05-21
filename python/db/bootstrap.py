#!/usr/bin/env python3
"""Bootstrap do banco a partir de data/schema.yml.

Uso:
    source python/.venv/bin/activate
    python python/db/bootstrap.py

.env na raiz:
    SUPABASE_DB_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
"""
import os, sys, textwrap
from pathlib import Path
import psycopg2, yaml
from dotenv import load_dotenv

load_dotenv(".env.local", override=True)
load_dotenv()  # fallback para .env
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = PROJECT_ROOT / "data" / "schema.yml"


def connect():
    url = os.getenv("spdb_passando_da_sena_beta_POSTGRES_URL_NON_POOLING") or os.getenv("SUPABASE_DB_URL")
    if not url:
        sys.exit("SUPABASE_DB_URL ou spdb_passando_da_sena_beta_POSTGRES_URL_NON_POOLING nao definida. Adicione no .env")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


def enum_exists(cur, name):
    cur.execute("SELECT 1 FROM pg_type WHERE typname = %s AND typtype = 'e'", (name,))
    return cur.fetchone() is not None


def table_exists(cur, schema, name):
    cur.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
        (schema, name),
    )
    return cur.fetchone() is not None


def index_exists(cur, name):
    cur.execute("SELECT 1 FROM pg_indexes WHERE indexname = %s", (name,))
    return cur.fetchone() is not None


def policy_exists(cur, table, name):
    cur.execute(
        "SELECT 1 FROM pg_policies WHERE tablename = %s AND policyname = %s",
        (table, name),
    )
    return cur.fetchone() is not None


def trigger_exists(cur, name):
    cur.execute("SELECT 1 FROM pg_trigger WHERE tgname = %s", (name,))
    return cur.fetchone() is not None


def pg_type(col, enums):
    t = col["type"]
    return f"public.{t}" if t in enums else t


def build_column_ddl(col_name, col, enums):
    parts = [f"{col_name} {pg_type(col, enums)}"]
    if col.get("primary_key"):
        parts.append("PRIMARY KEY")
    if col.get("not_null") and not col.get("primary_key"):
        parts.append("NOT NULL")
    if "default" in col:
        dval = col["default"]; parts.append(f"DEFAULT {dval}")
    if "references" in col:
        on_delete = col.get("on_delete", "NO ACTION")
        ref = col["references"]; parts.append(f"REFERENCES {ref} ON DELETE {on_delete}")
    if "check" in col:
        chk = col["check"]; parts.append(f"CHECK ({chk})")
    return " ".join(parts)


def build_create_table(table_name, tdef, enums):
    schema = tdef.get("schema", "public")
    col_lines = []
    for col_name, col in tdef["columns"].items():
        col_lines.append("  " + build_column_ddl(col_name, col, enums))
    for col_name, col in tdef["columns"].items():
        if col.get("unique") and not col.get("primary_key"):
            col_lines.append(f"  UNIQUE ({col_name})")
    for c in tdef.get("constraints", []):
        if c["type"] == "UNIQUE":
            cols = ", ".join(c["columns"])
            cname = c["name"]; col_lines.append(f"  CONSTRAINT {cname} UNIQUE ({cols})")
    body = ",\n".join(col_lines)
    return f"CREATE TABLE {schema}.{table_name} (\n{body}\n);"


def apply_enums(cur, enums):
    for name, edef in enums.items():
        if enum_exists(cur, name):
            print(f"  [skip] enum {name} ja existe")
            continue
        values = ", ".join(f"'{v}'" for v in edef["values"])
        cur.execute(f"CREATE TYPE public.{name} AS ENUM ({values});")
        print(f"  [ok]   enum {name} criado")


def apply_tables(cur, tables, enums):
    for tname, tdef in tables.items():
        schema = tdef.get("schema", "public")
        if table_exists(cur, schema, tname):
            print(f"  [skip] tabela {schema}.{tname} ja existe")
            continue
        ddl = build_create_table(tname, tdef, enums)
        cur.execute(ddl)
        print(f"  [ok]   tabela {schema}.{tname} criada")


def apply_indexes(cur, tables):
    for tname, tdef in tables.items():
        schema = tdef.get("schema", "public")
        for idx in tdef.get("indexes", []):
            iname = idx["name"]
            if index_exists(cur, iname):
                print(f"  [skip] index {idx['name']} ja existe")
                continue
            cols = ", ".join(idx["columns"])
            cur.execute(f"CREATE INDEX {iname} ON {schema}.{tname} ({cols});")
            print(f"  [ok]   index {iname} criado")


def apply_rls(cur, tables):
    for tname, tdef in tables.items():
        schema = tdef.get("schema", "public")
        rls = tdef.get("rls", {})
        if not rls.get("enabled"):
            continue
        cur.execute(f"ALTER TABLE {schema}.{tname} ENABLE ROW LEVEL SECURITY;")
        for p in rls.get("policies", []):
            pname = p["name"]
            if policy_exists(cur, tname, pname):
                print(f"  [skip] policy {p['name']} ja existe")
                continue
            op = p["operation"]
            role = p["role"]
            using = p.get("using", "").strip()
            check = p.get("check", "").strip()
            sql = f"CREATE POLICY {pname} ON {schema}.{tname} FOR {op} TO {role}"
            if using:
                sql += f" USING ({using})"
            if check:
                sql += f" WITH CHECK ({check})"
            sql += ";"
            cur.execute(sql)
            print(f"  [ok]   policy {pname} criada")


def apply_triggers(cur, triggers):
    for trig in triggers:
        fname = trig["function"]
        tname = trig["name"]
        body = textwrap.dedent(trig["function_body"]).strip()
        cur.execute(
            f"""
            CREATE OR REPLACE FUNCTION public.{fname}()
            RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
            {body}
            $$;
            """
        )
        print(f"  [ok]   function {fname} criada/atualizada")
        if trigger_exists(cur, tname):
            print(f"  [skip] trigger {tname} ja existe")
            continue
        table = trig["table"]
        event = trig["event"].replace("AFTER ", "")
        cur.execute(
            f"""
            CREATE TRIGGER {tname}
            AFTER {event} ON {table}
            FOR EACH ROW EXECUTE FUNCTION public.{fname}();
            """
        )
        print(f"  [ok]   trigger {tname} criado")


def main():
    print(f"Schema: {SCHEMA_PATH}")
    with open(SCHEMA_PATH) as f:
        schema = yaml.safe_load(f)
    enums = schema.get("enums", {})
    tables = schema.get("tables", {})
    triggers = schema.get("triggers", [])
    conn = connect()
    try:
        with conn.cursor() as cur:
            print("\n-- Enums --")
            apply_enums(cur, enums)
            print("\n-- Tabelas --")
            apply_tables(cur, tables, enums)
            print("\n-- Indexes --")
            apply_indexes(cur, tables)
            print("\n-- RLS --")
            apply_rls(cur, tables)
            print("\n-- Triggers --")
            apply_triggers(cur, triggers)
        conn.commit()
        print("\nBootstrap concluido com sucesso.")
    except Exception as e:
        conn.rollback()
        print(f"\nErro -- rollback executado: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
