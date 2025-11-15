# Quick Start Guide

## ⚠️ Important

The dashboard requires **ClashKingAPI v2 branch** running locally (not yet in production).

## Step-by-Step Setup

### 1. Start the API (Terminal 1)

```bash
# Navigate to API directory
cd ../ClashKingAPI

# Verify you're on the correct branch
git branch --show-current
# Should show: v2

# If not, switch to it:
# git checkout v2

# Activate Python virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Start the API server
python main.py
```

✅ API running at: **http://localhost:8000**
📚 API docs at: **http://localhost:8000/docs**

### 2. Start the Dashboard (Terminal 2)

```bash
# Navigate to dashboard directory
cd clashking-dashboard

# Create .env.local if it doesn't exist
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
EOF

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

✅ Dashboard running at: **http://localhost:3002**

## Verify Everything Works

1. **API Health Check:**
   - Open http://localhost:8000/docs
   - You should see FastAPI Swagger documentation

2. **Dashboard Pages:**
   - Home: http://localhost:3002
   - Login: http://localhost:3002/login
   - Servers: http://localhost:3002/servers
   - Dashboard: http://localhost:3002/123456789 (example)
   - Settings: http://localhost:3002/123456789/general

## Troubleshooting

### API won't start

```bash
# Check if you're on the right branch
cd ../ClashKingAPI
git branch --show-current

# Make sure dependencies are installed
pip install -r requirements.txt

# Check if .env file exists and has required variables
cat .env
```

### Dashboard won't start

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for build errors
npm run build
```

### Port already in use

```bash
# API (port 8000)
lsof -ti:8000 | xargs kill -9  # macOS/Linux
# netstat -ano | findstr :8000  # Windows

# Dashboard (port 3002)
lsof -ti:3002 | xargs kill -9  # macOS/Linux
# netstat -ano | findstr :3002  # Windows
```

## Development Workflow

1. **Make UI changes** → Dashboard auto-reloads (http://localhost:3002)
2. **Make API changes** → API auto-reloads (uvicorn --reload)
3. **Test integration** → Use browser DevTools Network tab

## What's Next?

- [ ] Configure Discord OAuth2 app
- [ ] Create dashboard API endpoints
- [ ] Implement authentication flow
- [ ] Connect UI to real API data
- [ ] Add remaining dashboard pages

See `README.md` for detailed documentation.
