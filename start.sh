#!/bin/bash

# ============================================
# AI Kitchen Equipment Maintenance - Start Script
# ============================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=4000
FRONTEND_PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║       🔧 KitchenAI Pro - Starting Up 🔧       ║"
echo "  ║   AI Commercial Kitchen Equipment Maintenance  ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Step 1: Clean used ports ----
echo -e "${YELLOW}[1/6] Cleaning used ports...${NC}"

cleanup_port() {
  local port=$1
  local pid=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo -e "  ${RED}Killing process on port $port (PID: $pid)${NC}"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  else
    echo -e "  ${GREEN}Port $port is free${NC}"
  fi
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo -e "${GREEN}  ✓ Ports cleaned${NC}"

# ---- Step 2: Check for .env file ----
echo -e "${YELLOW}[2/6] Checking environment configuration...${NC}"

if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo -e "${RED}  ✗ .env file not found! Creating default...${NC}"
  cat > "$PROJECT_DIR/.env" << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kitchen_maintenance
DB_USER=postgres
DB_PASSWORD=postgres
BACKEND_PORT=4000
FRONTEND_PORT=3000
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
JWT_SECRET=kitchen-maintenance-secret-key-2024
EOF
  echo -e "${YELLOW}  ⚠ Please update .env with your OpenRouter API key${NC}"
else
  echo -e "${GREEN}  ✓ .env file found${NC}"
fi

# Source env vars
export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)

# ---- Step 3: Check PostgreSQL ----
echo -e "${YELLOW}[3/6] Checking PostgreSQL connection...${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "${RED}  ✗ PostgreSQL client not found. Please install PostgreSQL.${NC}"
  exit 1
fi

# Try to connect and create database if it doesn't exist
if psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -p ${DB_PORT:-5432} -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME:-kitchen_maintenance}"; then
  echo -e "${GREEN}  ✓ Database '${DB_NAME}' exists${NC}"
else
  echo -e "${CYAN}  Creating database '${DB_NAME}'...${NC}"
  createdb -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -p ${DB_PORT:-5432} ${DB_NAME:-kitchen_maintenance} 2>/dev/null || \
    psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -p ${DB_PORT:-5432} -c "CREATE DATABASE ${DB_NAME:-kitchen_maintenance};" 2>/dev/null || true
  echo -e "${GREEN}  ✓ Database created${NC}"
fi

# ---- Step 4: Install dependencies ----
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"

cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo -e "  ${CYAN}Installing backend dependencies...${NC}"
  npm install --silent 2>&1 | tail -1
else
  echo -e "  ${GREEN}Backend dependencies up to date${NC}"
fi

cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo -e "  ${CYAN}Installing frontend dependencies...${NC}"
  npm install --silent 2>&1 | tail -1
else
  echo -e "  ${GREEN}Frontend dependencies up to date${NC}"
fi

echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# ---- Step 5: Seed database ----
echo -e "${YELLOW}[5/6] Seeding database...${NC}"

cd "$PROJECT_DIR/backend"
node seeds/seed.js
echo -e "${GREEN}  ✓ Database seeded${NC}"

# ---- Step 6: Start servers with hot reload ----
echo -e "${YELLOW}[6/6] Starting servers with hot reload...${NC}"

# Trap to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down servers...${NC}"
  cleanup_port $BACKEND_PORT
  cleanup_port $FRONTEND_PORT
  echo -e "${GREEN}Servers stopped. Goodbye!${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon (hot reload)
cd "$PROJECT_DIR/backend"
echo -e "  ${BLUE}Starting backend on port $BACKEND_PORT (with nodemon hot reload)...${NC}"
npx nodemon server.js &
BACKEND_PID=$!

# Start frontend with Vite (built-in hot reload)
cd "$PROJECT_DIR/frontend"
echo -e "  ${BLUE}Starting frontend on port $FRONTEND_PORT (with Vite HMR)...${NC}"
npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

sleep 2

echo ""
echo -e "${GREEN}  ╔═══════════════════════════════════════════════╗"
echo -e "  ║          🚀 KitchenAI Pro is Running! 🚀       ║"
echo -e "  ╠═══════════════════════════════════════════════╣"
echo -e "  ║                                               ║"
echo -e "  ║  Frontend:  ${CYAN}http://localhost:$FRONTEND_PORT${GREEN}          ║"
echo -e "  ║  Backend:   ${CYAN}http://localhost:$BACKEND_PORT${GREEN}          ║"
echo -e "  ║                                               ║"
echo -e "  ║  Login:     admin@kitchen.com / admin123      ║"
echo -e "  ║             (or click 'Quick Login' button)   ║"
echo -e "  ║                                               ║"
echo -e "  ║  Hot reload is ACTIVE for both servers        ║"
echo -e "  ║  Press Ctrl+C to stop                         ║"
echo -e "  ╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
