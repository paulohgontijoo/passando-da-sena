#!/usr/bin/env python3
"""Cria um usuario no Supabase Auth via Admin API.

Auth usa email sintetico (nickname@bolao.local) — o usuario so ve nickname e telefone.
O telefone e a senha.

Uso:
    source python/.venv/bin/activate
    python python/db/create_user.py
"""
import os, sys, getpass, requests
from dotenv import load_dotenv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local", override=True)

SUPABASE_URL = os.getenv("spdb_passando_da_sena_beta_SUPABASE_URL")
SERVICE_KEY  = os.getenv("spdb_passando_da_sena_beta_SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("Vars do Supabase ausentes no .env.local")

print("=== Criar Usuario ===")
nickname = input("Nickname (unico, sem espacos): ").strip()
telefone = getpass.getpass("Telefone (ex: 11987654321) — sera a senha: ").strip()
role     = input("Role [apostador/moderador/admin] (default: apostador): ").strip() or "apostador"

if role not in ("apostador", "moderador", "admin"):
    sys.exit(f"Role invalida: {role}")
if not nickname:
    sys.exit("Nickname nao pode ser vazio.")
if len(telefone) < 8:
    sys.exit("Telefone muito curto (min 8 digitos).")

email_sintetico = f"{nickname}@bolao.local"

payload = {
    "email": email_sintetico,
    "password": telefone,
    "email_confirm": True,
    "user_metadata": {
        "nickname": nickname,
        "telefone": telefone,
        "role": role,
    },
}

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

resp = requests.post(
    f"{SUPABASE_URL}/auth/v1/admin/users",
    json=payload,
    headers=headers,
)

if resp.status_code in (200, 201):
    user = resp.json()
    print(f"\nUsuario criado com sucesso!")
    print(f"  ID:       {user['id']}")
    print(f"  Nickname: {nickname}")
    print(f"  Role:     {role}")
    print(f"  Login:    nickname={nickname}, telefone=<fornecido>")
    print("\nO trigger on_auth_user_created deve ter inserido em public.profiles.")
else:
    print(f"\nErro {resp.status_code}: {resp.text}")
    sys.exit(1)
