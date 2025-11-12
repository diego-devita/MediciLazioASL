#!/bin/bash

# Script per registrare webhook Telegram bot
# Usage: ./register-webhook.sh <NGROK_URL>
# Example: ./register-webhook.sh https://abc123.ngrok-free.dev

set -e

echo "🤖 Registrazione Webhook Telegram Bot"
echo ""

# Check .env exists
if [ ! -f ".env" ]; then
    echo "❌ File .env non trovato!"
    exit 1
fi

# Load env vars
source .env

# Check TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN non trovato nel .env"
    exit 1
fi

echo "✅ Bot token: ${TELEGRAM_BOT_TOKEN:0:10}..."

# Check TELEGRAM_SECRET_TOKEN (opzionale)
if [ -z "$TELEGRAM_SECRET_TOKEN" ]; then
    echo "⚠️  TELEGRAM_SECRET_TOKEN non trovato (webhook senza secret)"
    USE_SECRET=false
else
    echo "✅ Secret token: ${TELEGRAM_SECRET_TOKEN:0:10}..."
    USE_SECRET=true
fi

# Check ngrok URL parameter
if [ -z "$1" ]; then
    echo ""
    echo "❌ Manca URL ngrok!"
    echo ""
    echo "Usage: ./register-webhook.sh <NGROK_URL>"
    echo "Example: ./register-webhook.sh https://abc123.ngrok-free.dev"
    echo ""
    exit 1
fi

NGROK_URL="$1"
WEBHOOK_URL="${NGROK_URL}/api/webhook"

echo ""
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

# Build JSON payload
if [ "$USE_SECRET" = true ]; then
    JSON_PAYLOAD="{\"url\":\"$WEBHOOK_URL\",\"secret_token\":\"$TELEGRAM_SECRET_TOKEN\"}"
else
    JSON_PAYLOAD="{\"url\":\"$WEBHOOK_URL\"}"
fi

# Register webhook
echo "🚀 Registrazione webhook..."
echo ""

RESPONSE=$(curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")

# Check response
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook registrato con successo!"
    echo ""
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ Errore nella registrazione:"
    echo ""
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo ""
echo "🔍 Verifica webhook info..."
echo ""

# Get webhook info
INFO_RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
echo "$INFO_RESPONSE" | jq '.' 2>/dev/null || echo "$INFO_RESPONSE"

echo ""
echo "✅ Setup completato!"
echo ""
echo "💡 Ora puoi testare mandando /start al bot"
