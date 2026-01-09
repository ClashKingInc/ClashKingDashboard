# Token Refresh Implementation - Samenvattting

## 🎯 Probleem
Je kreeg veel 401 (Unauthorized) fouten na een dag ingelogd te zijn, wat aangeeft dat je access token verlopen was.

## ✅ Oplossing Geïmplementeerd

Ik heb een volledig automatisch token-refresh systeem ingebouwd dat ervoor zorgt dat je **ingelogd blijft**:

### 1. **TokenManager** (`lib/auth/token-manager.ts`)
- Beheert het opslaan en ophalen van tokens uit localStorage
- **Slaat token expiry op** - berekent wanneer de token verlopen is
- Biedt methodes om te checken of token verlopen is (met 5-min buffer)
- `TokenManager.isTokenExpired()` retourneert `true` als token verlopen is

### 2. **Automatische Token Refresh in BaseClient** (`lib/api/core/base-client.ts`)
- **Onderschept 401-fouten** automatisch
- Wanneer een 401 gekregen wordt:
  - Probeert automatisch de token te refreshen via `/v2/auth/refresh`
  - **Herhaalt de originele request** met de nieuwe token
  - Voorkomen van meerdere tegelijkertijdige refreshes (queuing)
- Redirect naar login pagina als refresh faalt

### 3. **Token Refresh Interceptor** (`lib/auth/token-refresh-interceptor.ts`)
- `initializeTokenRefresh()` - checkt en refreshes token on app load
- `startPeriodicTokenRefresh()` - checkt elke 5 minuten of token verlopen is
- Voorkomt meerdere tegelijkertijdige refresh requests

### 4. **Token Refresh Provider** (`components/token-refresh-provider.tsx`)
- Client component die automatisch wordt geactiveerd
- Geïntegreerd in root layout (`app/layout.tsx`)
- Voert refresh check uit wanneer app laadt
- Checkt periodiek (elke 5 minuten)

### 5. **useAuth Hook** (`lib/auth/use-auth.ts`)
- React hook voor authentication state
- Kan in componenten gebruikt worden: `const { isAuthenticated, isExpired, logout } = useAuth()`

### 6. **Callback Page Update** (`app/[locale]/auth/callback/page.tsx`)
- Gebruikt nu `TokenManager.setTokens()` om tokens op te slaan
- Slaat `expires_in` op zodat we weten wanneer token verlopen is

## 🔄 Hoe het werkt

```
1. User logt in → tokens opgeslagen met expiry time
2. TokenManager houdt expiry bij
3. Als je een request doet en 401 krijgt:
   → Automatisch refresh token request
   → Retry originele request met nieuwe token
4. Elke 5 minuten:
   → Check of token verlopen is
   → Automatisch refreshen als nodig
5. App load:
   → Check onmiddellijk of token verlopen is
   → Refresh als nodig
```

## 📋 Wat moet je nog doen

1. **Backend check**: Zorg dat je `/v2/auth/refresh` endpoint:
   - `refresh_token` in POST body accepteert
   - Nieuwe `access_token`, `refresh_token`, en `expires_in` retourneert

2. **Testen**: 
   - Log in en ga naar dashboard
   - Laat het meer dan 1 dag lopen
   - Kijk in console (F12) → Applications → localStorage
   - Je zou `token_expiry` moeten zien

3. **Redirect handling** (optioneel):
   - In `token-refresh-interceptor.ts` kun je uncomment: `window.location.href = '/login'`
   - Dit redirect naar login als refresh faalt

## 📦 Files Toegevoegd/Gewijzigd

**Nieuwe files:**
- `lib/auth/token-manager.ts`
- `lib/auth/token-refresh-interceptor.ts`
- `lib/auth/use-auth.ts`
- `lib/auth/index.ts`
- `components/token-refresh-provider.tsx`

**Gewijzigd:**
- `lib/api/core/base-client.ts` (401 handling + retry logic)
- `app/[locale]/auth/callback/page.tsx` (TokenManager usage)
- `app/layout.tsx` (TokenRefreshProvider wrapper)

## 🚀 Extra Features

Je kunt nu ook in componenten dit doen:

```typescript
import { useAuth } from '@/lib/auth';

export function MyComponent() {
  const { isAuthenticated, isExpired, logout } = useAuth();
  
  if (!isAuthenticated) return <div>Not logged in</div>;
  if (isExpired) return <div>Token expired</div>;
  
  return <div>Welkom!</div>;
}
```

## 💡 Toekomstige Optimalisaties

1. **Activity tracking**: Token refresh rate aanpassen op basis van user activity
2. **Sliding window**: Token auto-extend als user actief is
3. **Multiple tabs sync**: Sessie sync tussen browser tabs
4. **Offline support**: Queue requests als offline en sync na reconnect
