FROM node:20-bookworm

# Instalar Python, FFmpeg e dependências
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Criar venv do Python e instalar dependências
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir numpy soundfile librosa scipy

WORKDIR /app

# Copiar scripts Python
COPY melhorar_audio.py .
COPY mesclar_audio.py .

# Copiar dashboard
COPY dashboard/package*.json ./dashboard/
WORKDIR /app/dashboard
RUN npm ci

COPY dashboard/ .

# Build do Next.js
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
