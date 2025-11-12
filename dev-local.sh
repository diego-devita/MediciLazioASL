#!/bin/bash

# Script per avviare rapidamente il progetto in locale
# Usage: ./dev-local.sh

set -e

echo "🚀 Avvio sviluppo locale..."
echo ""

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI non trovato!"
    echo "   Installalo con: npm install -g vercel"
    exit 1
fi

# Check .env
if [ ! -f ".env" ]; then
    echo "⚠️  File .env non trovato!"
    echo "   Vuoi copiare .env.example? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        cp .env.example .env
        echo "✅ Creato .env da .env.example"
        echo "⚠️  IMPORTANTE: Modifica .env con le tue credenziali!"
        echo ""
        echo "Premi INVIO quando hai configurato .env..."
        read -r
    else
        echo "❌ File .env necessario per continuare"
        exit 1
    fi
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze..."
    npm install
    echo "✅ Dipendenze installate"
    echo ""
fi

# Start Vercel dev server
echo "🌐 Avvio server locale su http://localhost:3000"
echo "   - Admin panel: http://localhost:3000/admin.html"
echo "   - Bot config: http://localhost:3000/bot.html"
echo ""
echo "📝 Premi Ctrl+C per fermare"
echo ""

vercel dev
