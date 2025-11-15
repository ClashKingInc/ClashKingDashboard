# Migration Guide: Ancien API Client → Nouveau API Client Modulaire

## Pourquoi migrer ?

L'ancien `api-client.ts` faisait **2200+ lignes** dans un seul fichier, ce qui rendait :
- ❌ Navigation difficile
- ❌ Maintenance complexe
- ❌ Tests compliqués
- ❌ Bundle size plus gros

Le nouveau client modulaire offre :
- ✅ **Organisation claire** par domaine (auth, players, clans, etc.)
- ✅ **Fichiers de ~200 lignes** faciles à naviguer
- ✅ **Tree-shakeable** pour réduire le bundle size
- ✅ **Meilleure maintenabilité**
- ✅ **Tests indépendants** par module

---

## Changements d'Import

### Avant
```typescript
import { createApiClient, ClashKingApiClient } from '@/lib/api-client';
import type { AuthResponse, ClanRanking } from '@/lib/api-client';
```

### Après
```typescript
import { createApiClient, ClashKingApiClient } from '@/lib/api';
import type { AuthResponse, ClanRanking } from '@/lib/api';
```

**Changement minimal** : Remplacer `@/lib/api-client` par `@/lib/api`

---

## Changements d'API

### Création du client
✅ **Aucun changement**

```typescript
const api = createApiClient('https://api.clashking.xyz', 'token');
```

### Méthodes organisées par domaine

#### Avant (tout au premier niveau)
```typescript
api.getCurrentUser()
api.loginWithEmail(data)
api.getPlayerLocations(tags)
api.getClanRanking(tag)
api.createRoster(serverId, data)
api.getPreviousWars(clanTag)
```

#### Après (organisé par domaine)
```typescript
api.auth.getCurrentUser()
api.auth.loginWithEmail(data)
api.players.getLocations(tags)
api.clans.getRanking(tag)
api.rosters.create(serverId, data)
api.wars.getPrevious(clanTag)
```

---

## Tableau de Correspondance Complet

| Ancien | Nouveau | Domaine |
|--------|---------|---------|
| `api.verifyEmailCode()` | `api.auth.verifyEmailCode()` | Auth |
| `api.getCurrentUser()` | `api.auth.getCurrentUser()` | Auth |
| `api.authenticateWithDiscord()` | `api.auth.authenticateWithDiscord()` | Auth |
| `api.refreshToken()` | `api.auth.refreshToken()` | Auth |
| `api.registerWithEmail()` | `api.auth.registerWithEmail()` | Auth |
| `api.resendVerification()` | `api.auth.resendVerification()` | Auth |
| `api.loginWithEmail()` | `api.auth.loginWithEmail()` | Auth |
| `api.linkDiscord()` | `api.auth.linkDiscord()` | Auth |
| `api.linkEmail()` | `api.auth.linkEmail()` | Auth |
| `api.forgotPassword()` | `api.auth.forgotPassword()` | Auth |
| `api.resetPassword()` | `api.auth.resetPassword()` | Auth |
| | | |
| `api.getPlayerLocations()` | `api.players.getLocations()` | Players |
| `api.getPlayersSorted()` | `api.players.getSorted()` | Players |
| `api.getPlayerSummaryTop()` | `api.players.getSummaryTop()` | Players |
| `api.addPlayersToTracking()` | `api.players.addToTracking()` | Players |
| `api.removePlayersFromTracking()` | `api.players.removeFromTracking()` | Players |
| | | |
| `api.getClanRanking()` | `api.clans.getRanking()` | Clans |
| `api.getClanBoardTotals()` | `api.clans.getBoardTotals()` | Clans |
| `api.getClanDonations()` | `api.clans.getDonations()` | Clans |
| `api.getClanComposition()` | `api.clans.getComposition()` | Clans |
| `api.getClansDonations()` | `api.clans.getMultipleDonations()` | Clans |
| `api.searchClan()` | `api.clans.search()` | Clans |
| | | |
| `api.createRoster()` | `api.rosters.create()` | Rosters |
| `api.updateRoster()` | `api.rosters.update()` | Rosters |
| `api.getRoster()` | `api.rosters.get()` | Rosters |
| `api.deleteRoster()` | `api.rosters.delete()` | Rosters |
| `api.listRosters()` | `api.rosters.list()` | Rosters |
| `api.cloneRoster()` | `api.rosters.clone()` | Rosters |
| `api.refreshRosters()` | `api.rosters.refresh()` | Rosters |
| `api.bulkUpdateRosterMembers()` | `api.rosters.bulkUpdateMembers()` | Rosters |
| `api.updateRosterMember()` | `api.rosters.updateMember()` | Rosters |
| `api.removeRosterMember()` | `api.rosters.removeMember()` | Rosters |
| `api.getRosterMissingMembers()` | `api.rosters.getMissingMembers()` | Rosters |
| `api.getServerClanMembers()` | `api.rosters.getServerMembers()` | Rosters |
| `api.generateRosterToken()` | `api.rosters.generateToken()` | Rosters |
| `api.createRosterGroup()` | `api.rosters.createGroup()` | Rosters |
| `api.getRosterGroup()` | `api.rosters.getGroup()` | Rosters |
| `api.updateRosterGroup()` | `api.rosters.updateGroup()` | Rosters |
| `api.listRosterGroups()` | `api.rosters.listGroups()` | Rosters |
| `api.deleteRosterGroup()` | `api.rosters.deleteGroup()` | Rosters |
| `api.createSignupCategory()` | `api.rosters.createCategory()` | Rosters |
| `api.listSignupCategories()` | `api.rosters.listCategories()` | Rosters |
| `api.updateSignupCategory()` | `api.rosters.updateCategory()` | Rosters |
| `api.deleteSignupCategory()` | `api.rosters.deleteCategory()` | Rosters |
| `api.createRosterAutomation()` | `api.rosters.createAutomation()` | Rosters |
| `api.listRosterAutomation()` | `api.rosters.listAutomation()` | Rosters |
| `api.updateRosterAutomation()` | `api.rosters.updateAutomation()` | Rosters |
| `api.deleteRosterAutomation()` | `api.rosters.deleteAutomation()` | Rosters |
| | | |
| `api.getPreviousWars()` | `api.wars.getPrevious()` | Wars |
| `api.getCwlRankingHistory()` | `api.wars.getCwlRankingHistory()` | Wars |
| `api.getCwlLeagueThresholds()` | `api.wars.getCwlLeagueThresholds()` | Wars |
| `api.getClanWarStats()` | `api.wars.getClanStats()` | Wars |
| `api.exportCwlSummary()` | `api.wars.exportCwlSummary()` | Wars |
| `api.exportPlayerWarStats()` | `api.wars.exportPlayerStats()` | Wars |
| | | |
| `api.getServerSettings()` | `api.servers.getSettings()` | Servers |
| `api.getClanSettings()` | `api.servers.getClanSettings()` | Servers |
| `api.updateServerEmbedColor()` | `api.servers.updateEmbedColor()` | Servers |
| `api.getBans()` | `api.servers.getBans()` | Servers |
| `api.addBan()` | `api.servers.addBan()` | Servers |
| `api.removeBan()` | `api.servers.removeBan()` | Servers |
| `api.searchBannedPlayers()` | `api.servers.searchBannedPlayers()` | Servers |
| | | |
| `api.linkAccount()` | `api.links.linkAccount()` | Links |
| `api.linkAccountNoAuth()` | `api.links.linkAccountNoAuth()` | Links |
| `api.getLinkedAccounts()` | `api.links.getLinkedAccounts()` | Links |
| `api.unlinkAccount()` | `api.links.unlinkAccount()` | Links |
| `api.unlinkAccountNoAuth()` | `api.links.unlinkAccountNoAuth()` | Links |
| `api.reorderLinkedAccounts()` | `api.links.reorderAccounts()` | Links |
| | | |
| `api.getSeasonDates()` | `api.utils.getSeasonDates()` | Utils |
| `api.getRaidWeekendDates()` | `api.utils.getRaidWeekendDates()` | Utils |
| `api.getCurrentDates()` | `api.utils.getCurrentDates()` | Utils |
| `api.getSeasonStartEnd()` | `api.utils.getSeasonStartEnd()` | Utils |
| `api.getSeasonRaidDates()` | `api.utils.getSeasonRaidDates()` | Utils |
| `api.getLegendsDay()` | `api.utils.getLegendsDay()` | Utils |
| `api.getLegendsSeason()` | `api.utils.getLegendsSeason()` | Utils |
| `api.bookmarkSearch()` | `api.utils.bookmarkSearch()` | Utils |
| `api.addRecentSearch()` | `api.utils.addRecentSearch()` | Utils |
| `api.createSearchGroup()` | `api.utils.createSearchGroup()` | Utils |
| `api.addToSearchGroup()` | `api.utils.addToSearchGroup()` | Utils |
| `api.removeFromSearchGroup()` | `api.utils.removeFromSearchGroup()` | Utils |
| `api.getSearchGroup()` | `api.utils.getSearchGroup()` | Utils |
| `api.listSearchGroups()` | `api.utils.listSearchGroups()` | Utils |
| `api.deleteSearchGroup()` | `api.utils.deleteSearchGroup()` | Utils |
| `api.getPublicConfig()` | `api.utils.getPublicConfig()` | Utils |
| `api.initializeApp()` | `api.utils.initializeApp()` | Utils |
| `api.getRosterDashboard()` | `api.utils.getRosterDashboard()` | Utils |

---

## Migration Automatique avec Regex

Pour faciliter la migration, utilisez ces remplacements regex dans votre IDE :

### VSCode / Cursor

1. **Auth methods:**
   - Find: `api\.(verifyEmailCode|getCurrentUser|authenticateWithDiscord|refreshToken|registerWithEmail|resendVerification|loginWithEmail|linkDiscord|linkEmail|forgotPassword|resetPassword)\(`
   - Replace: `api.auth.$1(`

2. **Player methods:**
   - Find: `api\.(getPlayerLocations|getPlayersSorted|getPlayerSummaryTop|addPlayersToTracking|removePlayersFromTracking)\(`
   - Replace with manual mapping (noms changés)

3. **Clan methods:**
   - Find: `api\.(getClanRanking|getClanBoardTotals|getClanDonations|getClanComposition|searchClan)\(`
   - Replace with manual mapping

4. **Roster methods:**
   - Find: `api\.(createRoster|updateRoster|getRoster|deleteRoster|listRosters|cloneRoster)\(`
   - Replace with manual mapping

**Note**: Certains noms de méthodes ont changé, voir le tableau ci-dessus.

---

## Exemple de Migration Complète

### Avant
```typescript
// components/Dashboard.tsx
import { createApiClient } from '@/lib/api-client';

const api = createApiClient('https://api.clashking.xyz');

// Auth
const user = await api.getCurrentUser();
await api.loginWithEmail({ email, password });

// Players
const locations = await api.getPlayerLocations(['#TAG1']);

// Clans
const ranking = await api.getClanRanking('#CLANTAG');

// Rosters
const rosters = await api.listRosters(serverId);
await api.createRoster(serverId, { name: 'Roster' });

// Wars
const wars = await api.getPreviousWars('#CLANTAG');
```

### Après
```typescript
// components/Dashboard.tsx
import { createApiClient } from '@/lib/api';

const api = createApiClient('https://api.clashking.xyz');

// Auth - ajout du namespace .auth
const user = await api.auth.getCurrentUser();
await api.auth.loginWithEmail({ email, password });

// Players - ajout du namespace .players + renommage
const locations = await api.players.getLocations(['#TAG1']);

// Clans - ajout du namespace .clans + renommage
const ranking = await api.clans.getRanking('#CLANTAG');

// Rosters - ajout du namespace .rosters + renommage
const rosters = await api.rosters.list(serverId);
await api.rosters.create(serverId, { name: 'Roster' });

// Wars - ajout du namespace .wars + renommage
const wars = await api.wars.getPrevious('#CLANTAG');
```

---

## Utilisation Modulaire (Avancé)

Si vous voulez réduire encore plus le bundle size, importez seulement les clients nécessaires :

```typescript
// Au lieu d'importer tout le client
import { createApiClient } from '@/lib/api';
const api = createApiClient(baseUrl, token);

// Importez seulement ce dont vous avez besoin
import { AuthClient, ClanClient } from '@/lib/api';
const config = { baseUrl, accessToken: token };

const auth = new AuthClient(config);
const clans = new ClanClient(config);

const user = await auth.getCurrentUser();
const ranking = await clans.getRanking('#TAG');
```

---

## Checklist de Migration

- [ ] Mettre à jour les imports : `@/lib/api-client` → `@/lib/api`
- [ ] Ajouter les namespaces : `api.method()` → `api.domain.method()`
- [ ] Renommer les méthodes selon le tableau ci-dessus
- [ ] Tester toutes les fonctionnalités
- [ ] Supprimer les imports de l'ancien client
- [ ] Nettoyer le code inutilisé

---

## Support

Pour toute question sur la migration, référez-vous à :
- [lib/api/README.md](lib/api/README.md) - Documentation du nouveau client
- [ENDPOINTS_DOCUMENTATION.md](ENDPOINTS_DOCUMENTATION.md) - Référence complète de l'API
- Tableau de correspondance ci-dessus

---

## Avantages Finaux

**Avant** : 1 fichier de 2200+ lignes
```
lib/
└── api-client.ts (2200 lignes)
```

**Après** : 17 fichiers de ~100-300 lignes chacun
```
lib/api/
├── index.ts (80 lignes)
├── client.ts (100 lignes)
├── README.md
├── core/
│   └── base-client.ts (100 lignes)
├── types/ (8 fichiers, ~30-100 lignes chacun)
└── clients/ (8 fichiers, ~100-300 lignes chacun)
```

**Résultat** :
- ✅ Navigation 10x plus facile
- ✅ Maintenance simplifiée
- ✅ Tests indépendants par module
- ✅ Bundle size optimisable (tree-shaking)
- ✅ Extensibilité améliorée
