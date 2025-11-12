#!/bin/bash

# 🚀 Launcher Interattivo per MediciLazioASL
# Gestisce dev server, MongoDB e ngrok con shell visibili

set -e

PROJECT_NAME="medici-lazio"
SESSION_NAME="${PROJECT_NAME}-dev"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Banner
clear
echo -e "${BOLD}${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          🚀 MEDICI LAZIO ASL - DEV LAUNCHER 🚀           ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisiti
echo -e "${CYAN}📋 Controllo prerequisiti...${NC}"
echo ""

MISSING_DEPS=0

# Check tmux
if ! command -v tmux &> /dev/null; then
    echo -e "  ${RED}✗${NC} tmux non trovato"
    echo -e "    Installalo con: ${YELLOW}sudo apt install tmux${NC}"
    MISSING_DEPS=1
else
    echo -e "  ${GREEN}✓${NC} tmux"
fi

# Check vercel
if ! command -v vercel &> /dev/null; then
    echo -e "  ${RED}✗${NC} vercel CLI non trovato"
    echo -e "    Installalo con: ${YELLOW}npm install -g vercel${NC}"
    MISSING_DEPS=1
else
    echo -e "  ${GREEN}✓${NC} vercel CLI"
fi

# Check docker
if ! command -v docker &> /dev/null; then
    echo -e "  ${RED}✗${NC} docker non trovato"
    echo -e "    Installalo da: ${YELLOW}https://docs.docker.com/get-docker/${NC}"
    MISSING_DEPS=1
else
    echo -e "  ${GREEN}✓${NC} docker"
fi

# Check ngrok
if ! command -v ngrok &> /dev/null; then
    echo -e "  ${YELLOW}⚠${NC} ngrok non trovato (opzionale)"
    echo -e "    Installalo da: ${YELLOW}https://ngrok.com/download${NC}"
else
    echo -e "  ${GREEN}✓${NC} ngrok"
fi

# Check .env
if [ ! -f ".env" ]; then
    echo -e "  ${YELLOW}⚠${NC} .env non trovato"
    echo ""
    echo -e "${YELLOW}Vuoi copiare .env.example? (y/n):${NC} "
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        cp .env.example .env
        echo -e "  ${GREEN}✓${NC} Creato .env da .env.example"
        echo -e "    ${YELLOW}IMPORTANTE: Configura .env prima di continuare!${NC}"
        echo ""
        echo -e "Premi ${BOLD}INVIO${NC} quando hai configurato .env..."
        read -r
    else
        echo -e "${RED}❌ File .env necessario per continuare${NC}"
        exit 1
    fi
else
    echo -e "  ${GREEN}✓${NC} .env"
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${CYAN}📦 Installazione dipendenze...${NC}"
    npm install
    echo -e "  ${GREEN}✓${NC} Dipendenze installate"
fi

echo ""

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}❌ Installa le dipendenze mancanti e riprova${NC}"
    exit 1
fi

# Check se sessione tmux già esiste
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Sessione tmux '$SESSION_NAME' già esistente${NC}"
    echo ""
    echo "Cosa vuoi fare?"
    echo "  1) Riconnetti alla sessione esistente"
    echo "  2) Termina e crea nuova sessione"
    echo "  3) Esci"
    echo ""
    echo -n "Scelta [1-3]: "
    read -r choice

    case $choice in
        1)
            echo ""
            echo -e "${GREEN}🔗 Riconnessione alla sessione...${NC}"
            sleep 1
            tmux attach-session -t "$SESSION_NAME"
            exit 0
            ;;
        2)
            echo ""
            echo -e "${YELLOW}🗑️  Termino sessione esistente...${NC}"
            tmux kill-session -t "$SESSION_NAME"
            sleep 1
            ;;
        *)
            echo ""
            echo -e "${CYAN}👋 Arrivederci!${NC}"
            exit 0
            ;;
    esac
fi

# Menu servizi
echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}🎯 CONFIGURA I SERVIZI DA AVVIARE${NC}"
echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""

START_DEV=1
START_MONGO=0
START_NGROK=0
NGROK_PORT=3000

echo -e "${BOLD}1) Dev Server (Node.js)${NC} [Obbligatorio]"
echo -e "   ${GREEN}✓${NC} Verrà avviato automaticamente"
echo ""

echo -e "${BOLD}2) MongoDB${NC}"
echo -n "   Avviare MongoDB locale? (y/n) [default: n]: "
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    START_MONGO=1
    echo -e "   ${GREEN}✓${NC} MongoDB verrà avviato"
else
    echo -e "   ${YELLOW}○${NC} MongoDB non verrà avviato"
fi
echo ""

if command -v ngrok &> /dev/null; then
    echo -e "${BOLD}3) ngrok${NC}"
    echo -n "   Avviare ngrok? (y/n) [default: n]: "
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        START_NGROK=1
        echo -n "   Porta da esporre [default: 3000]: "
        read -r port
        if [ ! -z "$port" ]; then
            NGROK_PORT=$port
        fi
        echo -e "   ${GREEN}✓${NC} ngrok verrà avviato sulla porta $NGROK_PORT"
    else
        echo -e "   ${YELLOW}○${NC} ngrok non verrà avviato"
    fi
else
    echo -e "${YELLOW}⚠${NC}  ngrok non disponibile (non installato)"
fi

echo ""
echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Livello di log per dev server
echo -e "${CYAN}📊 Seleziona il livello di logging:${NC}"
echo "   1) error   - Solo errori"
echo "   2) warn    - Errori + warning"
echo "   3) info    - Errori + warning + info"
echo "   4) debug   - Molto dettagliato"
echo "   5) trace   - Estremamente dettagliato (raccomandato)"
echo ""
echo -n "Scelta [1-5] (default: 5): "
read -r choice

case $choice in
    1) LOG_LEVEL=error ;;
    2) LOG_LEVEL=warn ;;
    3) LOG_LEVEL=info ;;
    4) LOG_LEVEL=debug ;;
    5|"") LOG_LEVEL=trace ;;
    *)
        echo -e "${YELLOW}Scelta non valida, uso 'trace'${NC}"
        LOG_LEVEL=trace
        ;;
esac

# Chiedi se aprire il browser
echo ""
echo -e "${CYAN}🌐 Aprire automaticamente il browser?${NC}"
echo -n "   (y/n) [default: y]: "
read -r response
if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
    OPEN_BROWSER=0
else
    OPEN_BROWSER=1
fi

echo ""
echo -e "${BOLD}${GREEN}🚀 AVVIO AMBIENTE DI SVILUPPO...${NC}"
echo ""
sleep 1

# Crea sessione tmux
tmux new-session -d -s "$SESSION_NAME" -n "main"

# Pannello 1: Dev Server (principale)
tmux send-keys -t "$SESSION_NAME:main" "export LOG_LEVEL=$LOG_LEVEL" C-m
tmux send-keys -t "$SESSION_NAME:main" "clear" C-m
tmux send-keys -t "$SESSION_NAME:main" "echo -e '${GREEN}🌐 DEV SERVER${NC}'" C-m
tmux send-keys -t "$SESSION_NAME:main" "echo -e '${CYAN}────────────────────────────────────────${NC}'" C-m
tmux send-keys -t "$SESSION_NAME:main" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:main" "vercel dev" C-m

# Pannello 2: MongoDB (se richiesto)
if [ $START_MONGO -eq 1 ]; then
    tmux split-window -t "$SESSION_NAME:main" -h
    tmux send-keys -t "$SESSION_NAME:main" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:main" "echo -e '${GREEN}🗄️  MONGODB${NC}'" C-m
    tmux send-keys -t "$SESSION_NAME:main" "echo -e '${CYAN}────────────────────────────────────────${NC}'" C-m
    tmux send-keys -t "$SESSION_NAME:main" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME:main" "./dev-mongodb-local.sh && docker logs -f mongodb-dev" C-m
fi

# Pannello 3: ngrok (se richiesto)
if [ $START_NGROK -eq 1 ]; then
    if [ $START_MONGO -eq 1 ]; then
        # Se abbiamo MongoDB, split il pannello MongoDB verticalmente
        tmux select-pane -t "$SESSION_NAME:main.1"
        tmux split-window -t "$SESSION_NAME:main" -v
    else
        # Altrimenti split il pannello dev server
        tmux split-window -t "$SESSION_NAME:main" -h
    fi
    tmux send-keys -t "$SESSION_NAME:main" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:main" "echo -e '${GREEN}🌐 NGROK${NC}'" C-m
    tmux send-keys -t "$SESSION_NAME:main" "echo -e '${CYAN}────────────────────────────────────────${NC}'" C-m
    tmux send-keys -t "$SESSION_NAME:main" "echo ''" C-m
    tmux send-keys -t "$SESSION_NAME:main" "sleep 3 && ngrok http $NGROK_PORT" C-m
fi

# Bilancia i pannelli
tmux select-layout -t "$SESSION_NAME:main" tiled

# Focus sul dev server (pannello 0)
tmux select-pane -t "$SESSION_NAME:main.0"

# Apri browser se richiesto (in background)
if [ $OPEN_BROWSER -eq 1 ]; then
    (
        # Aspetta che il server sia pronto
        sleep 8
        # Prova ad aprire il browser
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000 &> /dev/null
        elif command -v open &> /dev/null; then
            open http://localhost:3000 &> /dev/null
        fi
    ) &
fi

# Mostra istruzioni
clear
echo -e "${BOLD}${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ✨ AMBIENTE PRONTO! ✨                       ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${CYAN}📍 Servizi attivi:${NC}"
echo ""
echo -e "  ${GREEN}●${NC} ${BOLD}Dev Server${NC}"
echo -e "    └─ http://localhost:3000"
echo -e "    └─ Log level: ${YELLOW}$LOG_LEVEL${NC}"
if [ $OPEN_BROWSER -eq 1 ]; then
    echo -e "    └─ ${GREEN}Browser si aprirà automaticamente...${NC}"
fi
echo ""

if [ $START_MONGO -eq 1 ]; then
    echo -e "  ${GREEN}●${NC} ${BOLD}MongoDB${NC}"
    echo -e "    └─ mongodb://localhost:27017/medici-lazio-dev"
    echo ""
fi

if [ $START_NGROK -eq 1 ]; then
    echo -e "  ${GREEN}●${NC} ${BOLD}ngrok${NC}"
    echo -e "    └─ Porta: $NGROK_PORT"
    echo -e "    └─ URL disponibile tra qualche secondo..."
    echo ""
fi

echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}⌨️  COMANDI TMUX UTILI:${NC}"
echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${YELLOW}Ctrl+B${NC} poi ${YELLOW}←↑→↓${NC}      Naviga tra i pannelli"
echo -e "  ${YELLOW}Ctrl+B${NC} poi ${YELLOW}D${NC}          Detach (senza killare)"
echo -e "  ${YELLOW}Ctrl+B${NC} poi ${YELLOW}[${NC}          Scroll mode (q per uscire)"
echo -e "  ${YELLOW}Ctrl+B${NC} poi ${YELLOW}Z${NC}          Zoom pannello corrente"
echo -e "  ${YELLOW}Ctrl+C${NC}                Ferma processo nel pannello"
echo ""
echo -e "  ${CYAN}Riconnetti:${NC}           ${YELLOW}tmux attach -t $SESSION_NAME${NC}"
echo -e "  ${CYAN}Termina tutto:${NC}        ${YELLOW}tmux kill-session -t $SESSION_NAME${NC}"
echo ""
echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Premi ${GREEN}INVIO${NC}${BOLD} per attaccare alla sessione...${NC}"
read -r

# Attacca alla sessione
tmux attach-session -t "$SESSION_NAME"
