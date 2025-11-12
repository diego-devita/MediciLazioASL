#!/bin/bash

# Script per verificare lo stato del bot Telegram

set -e

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear
echo -e "${BOLD}${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          🤖 TELEGRAM BOT STATUS CHECKER 🤖               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ File .env non trovato!${NC}"
    exit 1
fi

# Load env vars
source .env

# Check bot token
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN non trovato nel .env${NC}"
    exit 1
fi

echo -e "${CYAN}📋 Configurazione:${NC}"
echo -e "  Bot token: ${GREEN}${TELEGRAM_BOT_TOKEN:0:15}...${NC}"
if [ ! -z "$TELEGRAM_SECRET_TOKEN" ]; then
    echo -e "  Secret token: ${GREEN}${TELEGRAM_SECRET_TOKEN:0:15}...${NC}"
fi
echo ""

# Get bot info
echo -e "${CYAN}🤖 Informazioni Bot:${NC}"
BOT_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe")

if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_USERNAME=$(echo "$BOT_INFO" | jq -r '.result.username')
    BOT_NAME=$(echo "$BOT_INFO" | jq -r '.result.first_name')
    echo -e "  ${GREEN}✓${NC} Bot attivo"
    echo -e "  Username: ${BOLD}@${BOT_USERNAME}${NC}"
    echo -e "  Nome: ${BOLD}${BOT_NAME}${NC}"
else
    echo -e "  ${RED}✗${NC} Bot non raggiungibile"
    echo "$BOT_INFO"
    exit 1
fi
echo ""

# Get webhook info
echo -e "${CYAN}🌐 Webhook Status:${NC}"
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")

if echo "$WEBHOOK_INFO" | grep -q '"ok":true'; then
    WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | jq -r '.result.url')
    PENDING_COUNT=$(echo "$WEBHOOK_INFO" | jq -r '.result.pending_update_count')
    LAST_ERROR=$(echo "$WEBHOOK_INFO" | jq -r '.result.last_error_message')
    LAST_ERROR_DATE=$(echo "$WEBHOOK_INFO" | jq -r '.result.last_error_date')

    if [ "$WEBHOOK_URL" = "null" ] || [ -z "$WEBHOOK_URL" ]; then
        echo -e "  ${YELLOW}⚠${NC} Webhook NON configurato"
        echo -e "  ${CYAN}ℹ${NC}  Il bot funziona solo in polling mode"
        echo ""
        echo -e "${YELLOW}💡 Per abilitare il webhook:${NC}"
        echo -e "   1. Avvia ngrok: ${BOLD}ngrok http 3000${NC}"
        echo -e "   2. Copia l'URL ngrok"
        echo -e "   3. Registra webhook: ${BOLD}./register-webhook.sh <NGROK_URL>${NC}"
    else
        echo -e "  ${GREEN}✓${NC} Webhook configurato"
        echo -e "  URL: ${BOLD}${WEBHOOK_URL}${NC}"
        echo -e "  Messaggi in coda: ${BOLD}${PENDING_COUNT}${NC}"

        if [ "$LAST_ERROR" != "null" ] && [ ! -z "$LAST_ERROR" ]; then
            echo ""
            echo -e "  ${RED}✗${NC} Ultimo errore:"
            echo -e "    ${RED}${LAST_ERROR}${NC}"
            if [ "$LAST_ERROR_DATE" != "null" ]; then
                ERROR_DATE=$(date -d "@${LAST_ERROR_DATE}" 2>/dev/null || echo "unknown")
                echo -e "    Data: ${ERROR_DATE}"
            fi
        fi
    fi
else
    echo -e "  ${RED}✗${NC} Impossibile ottenere info webhook"
    echo "$WEBHOOK_INFO"
fi
echo ""

# Check MongoDB
echo -e "${CYAN}🗄️  Database Status:${NC}"
if [ -z "$MONGODB_URI" ]; then
    echo -e "  ${RED}✗${NC} MONGODB_URI non configurato nel .env"
else
    echo -e "  ${GREEN}✓${NC} MONGODB_URI configurato"
    if [[ "$MONGODB_URI" == *"localhost"* ]]; then
        echo -e "  ${YELLOW}⚠${NC}  Usando MongoDB locale"
        # Check if MongoDB is running
        if docker ps | grep -q mongodb-dev; then
            echo -e "  ${GREEN}✓${NC} Container mongodb-dev in esecuzione"
        else
            echo -e "  ${RED}✗${NC} Container mongodb-dev NON in esecuzione"
            echo -e "  ${CYAN}💡 Avvia con:${NC} ./dev-mongodb-local.sh"
        fi
    else
        echo -e "  ${GREEN}✓${NC} Usando MongoDB remoto"
    fi
fi
echo ""

# Check Admin Chat IDs
echo -e "${CYAN}👤 Admin Configuration:${NC}"
if [ -z "$ADMIN_CHAT_IDS" ]; then
    echo -e "  ${YELLOW}⚠${NC} ADMIN_CHAT_IDS non configurato"
    echo -e "  ${CYAN}ℹ${NC}  Nessun admin definito"
else
    IFS=',' read -ra ADMIN_ARRAY <<< "$ADMIN_CHAT_IDS"
    echo -e "  ${GREEN}✓${NC} ${#ADMIN_ARRAY[@]} admin configurati"
    for admin_id in "${ADMIN_ARRAY[@]}"; do
        echo -e "    • Chat ID: ${BOLD}${admin_id}${NC}"
    done
fi
echo ""

# Final summary
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}📊 SUMMARY${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

ALL_OK=true

if echo "$BOT_INFO" | grep -q '"ok":true'; then
    echo -e "  ${GREEN}✓${NC} Bot accessibile"
else
    echo -e "  ${RED}✗${NC} Bot non accessibile"
    ALL_OK=false
fi

if [ "$WEBHOOK_URL" = "null" ] || [ -z "$WEBHOOK_URL" ]; then
    echo -e "  ${YELLOW}⚠${NC} Webhook non configurato (normale in locale)"
else
    if [ "$LAST_ERROR" != "null" ] && [ ! -z "$LAST_ERROR" ]; then
        echo -e "  ${RED}✗${NC} Webhook con errori"
        ALL_OK=false
    else
        echo -e "  ${GREEN}✓${NC} Webhook funzionante"
    fi
fi

if [ ! -z "$MONGODB_URI" ]; then
    echo -e "  ${GREEN}✓${NC} Database configurato"
else
    echo -e "  ${RED}✗${NC} Database non configurato"
    ALL_OK=false
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${BOLD}${GREEN}✅ Tutto OK!${NC}"
else
    echo -e "${BOLD}${YELLOW}⚠️  Alcuni problemi rilevati (vedi sopra)${NC}"
fi

echo ""
echo -e "${CYAN}💡 Comandi utili:${NC}"
echo -e "  • Test bot: ${BOLD}Manda /start a @${BOT_USERNAME}${NC}"
echo -e "  • Genera OTP: ${BOLD}Manda /otp al bot${NC}"
echo -e "  • Webhook: ${BOLD}./register-webhook.sh <NGROK_URL>${NC}"
echo -e "  • Avvia tutto: ${BOLD}./launcher.sh${NC}"
echo ""
