#!/bin/bash

# Script per avviare MongoDB locale per sviluppo veloce

set -e

echo "🗄️  Setup MongoDB Locale per Sviluppo"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non trovato!"
    echo "   Installalo da: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check se container già esiste
if docker ps -a --format '{{.Names}}' | grep -q '^mongodb-dev$'; then
    echo "📦 Container mongodb-dev già esistente"

    # Check se è running
    if docker ps --format '{{.Names}}' | grep -q '^mongodb-dev$'; then
        echo "✅ MongoDB già in esecuzione"
    else
        echo "🔄 Avvio MongoDB..."
        docker start mongodb-dev
        sleep 2
        echo "✅ MongoDB avviato"
    fi
else
    echo "📥 Creazione nuovo container MongoDB..."
    docker run -d \
        -p 27017:27017 \
        --name mongodb-dev \
        -e MONGO_INITDB_DATABASE=medici-lazio-dev \
        mongo:latest

    echo "⏳ Attendo avvio MongoDB..."
    sleep 3
    echo "✅ MongoDB locale creato e avviato"
fi

echo ""
echo "🎯 MongoDB disponibile su: mongodb://localhost:27017"
echo ""
echo "📝 Configura nel tuo .env:"
echo "   MONGODB_URI=mongodb://localhost:27017/medici-lazio-dev"
echo ""
echo "💡 Comandi utili:"
echo "   docker stop mongodb-dev     # Ferma MongoDB"
echo "   docker start mongodb-dev    # Avvia MongoDB"
echo "   docker rm mongodb-dev       # Rimuovi container"
echo ""
