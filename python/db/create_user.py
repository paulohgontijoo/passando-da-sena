#!/usr/bin/env python3
"""Cria um usuario admin no Supabase Auth via Admin API."""
import os, sys, getpass, requests
from dotenv import load_dotenv
from pathlib import Path

root = Path(__file__).resolve().parents[2]
load_dotenv(root / ".env.local", override=True)

SUPABASE_URL = os.getenv("spdb_passando_da_sena_beta_SUPABASE_URL")
SERVICE_KEY  = os.getenv("spdb_passando_da_sena_beta_SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("Vars do Supabase ausentes no .env.local")

email    = input("Email: ").strip()
nome     = input("Nome: ").strip()
password = getpass.getpass("Senha (min 8 chars): ")

if len(password) < 8:
    sys.exit("Senha muito curta.")

payload = {
    "email": email,
    "password": password,
    "email_confirm": True,
    "user_metadata": {"nome": nome, "role": "admin"},
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
    uid, uemail = user["id"], user["email"]
    print(f"Usuario criado: {uemail} (id: {uid})")
    print("Trigger on_auth_user_created deve ter inserido em public.profiles.")
else:
    print(f"Erro {resp.status_code}: {resp.text}")