# Passando da Sena Analytics 🎰

Estudo estatístico descontraído e rigoroso dos sorteios históricos da Mega Sena, com gestão de bolão.

## Estrutura

```
passando-da-sena/
├── data/               # Dataset compartilhado entre stacks
│   ├── sorteios.json   # Histórico completo dos sorteios (gerado pelo Python)
│   └── users.json      # Usuários da plataforma web (senhas em bcrypt)
├── python/             # Coleta de dados + análise estatística
│   ├── collect/        # Scripts de ingestão incremental da API Caixa
│   ├── analysis/       # Notebooks de EDA e análises dirigidas
│   └── exports/        # Gráficos e outputs (gitignored)
├── web/                # Aplicação Next.js (App Router)
│   ├── app/
│   ├── components/
│   └── lib/
└── .github/workflows/  # CI opcional para atualização de dados
```

## Setup

### Python
```bash
cd python
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

### Coleta de dados
```bash
python collect/fetch_sorteios.py
```
Detecta o último concurso em `../data/sorteios.json` e busca apenas os novos.

### Web (Next.js)
```bash
cd web
npm install
npm run dev
```
Acesse `http://localhost:3000`.

## Stack
- **Python**: pandas, numpy, scipy, matplotlib, seaborn, plotly
- **Web**: Next.js 14 (App Router), NextAuth.js, Tailwind CSS, TypeScript
- **Deploy**: Vercel (plano gratuito)
- **Dados**: JSON estático commitado no repositório, importado em build time
