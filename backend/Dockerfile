FROM python:3.11-slim

WORKDIR /app

# System deps for bcrypt + psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Seed DB and start server
CMD ["sh", "-c", "python -c 'import sys; sys.path.insert(0,\".\"); exec(open(\"../scripts/seed_db.py\").read())' 2>/dev/null || true && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
