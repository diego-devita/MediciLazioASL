#!/bin/bash

# Script per avviare rapidamente il progetto in locale
# Usage: ./dev-local.sh [log_level]
#   log_level: error, warn, info, debug, trace (opzionale)

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

# Gestione LOG_LEVEL
if [ -z "$1" ]; then
    # Non specificato come argomento, chiedi interattivamente
    echo "🔍 Seleziona il livello di logging:"
    echo "   1) error   - Solo errori"
    echo "   2) warn    - Errori + warning"
    echo "   3) info    - Errori + warning + info (default)"
    echo "   4) debug   - Molto dettagliato (raccomandato per sviluppo)"
    echo "   5) trace   - Estremamente dettagliato (ogni chiamata)"
    echo ""
    echo -n "Scelta [1-5] (default: 3): "
    read -r choice

    case $choice in
        1) export LOG_LEVEL=error ;;
        2) export LOG_LEVEL=warn ;;
        3|"") export LOG_LEVEL=info ;;
        4) export LOG_LEVEL=debug ;;
        5) export LOG_LEVEL=trace ;;
        *)
            echo "❌ Scelta non valida, uso 'info'"
            export LOG_LEVEL=info
            ;;
    esac
else
    # Specificato come argomento
    export LOG_LEVEL="$1"
fi

echo ""
echo "📊 LOG_LEVEL impostato a: $LOG_LEVEL"
echo ""

# Start Vercel dev server
echo "🌐 Avvio server locale su http://localhost:3000"
echo "   - Admin panel: http://localhost:3000/admin.html"
echo "   - Bot config: http://localhost:3000/bot.html"
echo ""
echo "📝 Premi Ctrl+C per fermare"
echo ""

vercel dev
