# ── Build stage ───────────────────────────────────────────────────────────────
FROM python:3.12-slim AS base

# tshark is required by pyshark for pcap file reading
# wireshark-common provides tshark (the CLI version — no GUI needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
        tshark \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY main.py .

# ── Runtime ───────────────────────────────────────────────────────────────────
EXPOSE 8001

# Run as non-root for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
