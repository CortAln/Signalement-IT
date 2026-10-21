# ☁️ Déploiement sur Azure Web App — Signalement IT

Ce guide déploie l'application sur **Azure App Service (Web App Linux)**
depuis votre dépôt GitHub, via le workflow fourni
(`.github/workflows/deploy-azure.yml`).

---

## 1. Prérequis Azure

| Élément | Recommandation |
|---|---|
| Web App | Linux, **Node 20 LTS** (`WEBSITE_NODE_DEFAULT_VERSION=20-lts`), plan B1 minimum, **Always On** activé |
| Base de données | **Azure Database for PostgreSQL Flexible Server** (B1ms) — recommandé. SQLite possible si mono-instance (voir §5) |
| URL | `https://<app>.azurewebsites.net` en HTTPS natif (prérequis pour les QR codes et les cookies de session) |

## 2. Base de données (PostgreSQL)

1. Créer un serveur Flexible Server + une base `signalement_it`.
2. Dans `prisma/schema.prisma` : `provider = "postgresql"`.
3. Chaîne de connexion :
   `postgresql://<user>:<pass>@<server>.postgres.database.azure.com:5432/signalement_it?sslmode=require`

## 3. Variables (à faire une seule fois)

### a) App settings (Web App → Configuration → New application setting)

| Clé | Valeur |
|---|---|
| `DATABASE_URL` | la chaîne de connexion ci-dessus |
| `NEXT_PUBLIC_BASE_URL` | `https://<app>.azurewebsites.net` (utilisée côté serveur par /api/qr) |
| `NODE_ENV` | `production` (App Service ne la définit pas toujours) |
| `APP_SECRET` | une valeur longue et aléatoire |
| `RETENTION_MONTHS` | `12` |
| `SMTP_HOST`…`SMTP_PASS`, `SMTP_FROM`, `IT_SUPPORT_EMAIL`, `EMAIL_MIN_CRITICITE` | si notifications email |
| `WEBHOOK_URL`, `WEBHOOK_MIN_CRITICITE` | si webhook Teams/Slack |

### b) Secrets GitHub (dépôt → Settings → Secrets and variables → Actions)

| Secret | Valeur |
|---|---|
| `AZURE_WEBAPP_NAME` | nom de la Web App |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | contenu du fichier *publish profile* (Deployment Center → Manage → Download publish profile) |
| `NEXT_PUBLIC_BASE_URL` | ⚠️ même valeur que l'App setting — **indispensable au build** car intégrée au bundle client |
| `PRISMA_DATABASE_URL` | chaîne de connexion PostgreSQL (sert au `prisma db push` du workflow) |

## 4. Déploiement

Le workflow part à chaque push sur `main`, ou manuellement
(onglet **Actions → Deploy to Azure Web App → Run workflow**).

1. Pousser le code sur GitHub.
2. Suivre la run : `npm install` → `npm run build` → `prisma db push` → zip → déploiement (~5-10 min, node_modules inclus).
3. Vérifier : `https://<app>.azurewebsites.net/api/health` doit renvoyer
   `{ "ok": true, "db": "up" }`.

## 5. Variante SQLite (outil interne mono-instance uniquement)

1. Laisser `provider = "sqlite"` et définir :
   `DATABASE_URL=file:/home/site/data/prod.db` (stockage persistant).
2. **Supprimer l'étape « Schéma BDD »** du workflow (elle écrirait la base en local au CI).
3. Après le premier déploiement, appliquer le schéma une fois via la
   console SSH du portail Azure :
   `cd /home/site/wwwroot && npx prisma db push`
4. ⚠️ Si vous passez à 2+ instances, SQLite donnera des données
   incohérentes : migrez vers PostgreSQL avant.

## 6. Après le premier déploiement

- **Compte admin** (ne jamais utiliser les comptes de démo en prod) :
  depuis la console SSH : `cd /home/site/wwwroot && npx tsx scripts/create-admin.ts vous@votre-entreprise.fr "Votre Nom" "MotDePasseFort!42" ADMIN`
- **Health check** : Configuration → Health check → chemin `/api/health`
  (renvoie 503 si la base ne répond plus, ce qui alerte Azure).
- **Purge RGPD mensuelle** : WebJob déclenché par cron
  `0 0 3 1 * *` (1er du mois, 3 h) exécutant :
  `cd /home/site/wwwroot && npx tsx scripts/purge.ts`
- **QR codes** : une fois la prod stable, générer les étiquettes depuis
  Admin → Étiquettes QR (les QR contiennent l'URL `NEXT_PUBLIC_BASE_URL`).

## 7. Dépannage rapide

| Symptôme | Cause probable |
|---|---|
| Page d'accueil Azure « Welcome » | Le déploiement n'a pas eu lieu / a échoué — voir l'onglet Actions du dépôt |
| `/api/health` → `db: "down"` | `DATABASE_URL` absente ou serveur de base injoignable (pare-feu : autoriser les services Azure) |
| QR codes → `localhost` | `NEXT_PUBLIC_BASE_URL` absente **au moment du build** |
| 401 en boucle sur `/admin` | `NODE_ENV` ≠ production et HTTPS ≠ configuré (cookie `secure`) |
| Déploiement lent (~10 min) | Normal avec node_modules inclus ; option : mode standalone (voir doc Next.js) |

---

## 8. Spécificités de l'instance « ticketingcortaix » (lu dans la config Azure)

| Observation | Impact | Action |
|---|---|---|
| Plan **Free (F1)** | Always On indisponible : l'app s'endort après ~20 min d'inactivité (premier scan QR lent), quota de 60 min CPU/jour | OK pour tester ; passer en **B1** pour un usage réel |
| `NODE\|24-lts` | Next.js 14 tourne, mais le CI construit en Node 20 — léger décalage build/runtime | Recommandé : Configuration → General settings → **Node 20 LTS** pour aligner |
| `healthCheckPath: null` | Azure ne surveille pas la santé de l'app | Configuration → Health check → `/api/health` (si disponible sur votre plan) |
| `webJobsEnabled: false` | Le WebJob de purge RGPD ne pourra pas être planifié tel quel | Alternative : lancer `npx tsx scripts/purge.ts` trimestriellement via la console SSH, ou activer les WebJobs |
| `httpsOnly: true`, 1 instance | Parfait : HTTPS natif, SQLite mono-instance viable | — |
| Aucun App setting défini | `DATABASE_URL`, `NODE_ENV`, `APP_SECRET` manquants | Voir §3a — à faire avant le premier déploiement |
