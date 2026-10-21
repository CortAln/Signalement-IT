# 🛠️ Signalement IT

Mini-application web de **signalement d'incidents IT**, pensée
**mobile-first** et **sans authentification obligatoire**.
Chaque utilisateur signale en moins de 30 secondes en scannant un QR code
collé sur son poste, ou via une URL courte.

## 🆕 v2.1 — Pilotage & référentiel

- **Salles & équipements gérés depuis la console** (`/admin/referentiel`) :
  création, renommage, suppression — sans toucher au seed. Les codes sont
  figés après création (encodés dans les QR imprimés) ; une salle avec
  incidents ne peut pas être supprimée.
- **Retards SLA** : délai cible par criticité (🔴 24 h, 🟠 72 h, 🟡 7 j) ;
  badge « ⏰ En retard » dans la liste et KPI dédié dans les statistiques.
- **Satisfaction du déclarant** : boutons 👍/👎 sur la page de suivi dès que
  le ticket est résolu ; taux de satisfaction dans les statistiques.
- **Sonde `/api/health`** : `{ ok, db, ts }` pour le monitoring de
  disponibilité (renvoie 503 si la base ne répond pas).
- Passage à la v2.1 : `npm run db:push` suffit (deux champs ajoutés à
  `Incident` : `satisfaction`, `feedbackAt` — aucune perte de données).

## ✨ Fonctionnalités

**Côté utilisateur (public, sans compte)**
- Accueil avec salle détectée depuis le QR, ou choix manuel du lieu.
- Parcours guidé en 7 écran : lieu → catégorie → sous-question →
  description + 1 à 3 photos → criticité (🔴/🟠/🟡) → identification
  optionnelle (anonymat possible) → confirmation avec n° de ticket.
- Détection de doublons : « ⚠️ Déjà signalé — en cours de traitement »
  tout en permettant un nouveau signalement.
- Micro-guides de premier secours (2-3 checks rapides par catégorie).
- Page de suivi publique par jeton `/t/<token>` : statut, commentaires du
  support, date de résolution. Aucun compte requis.
- **PWA** installable, file d'attente hors-ligne (les signalements créés
  sans réseau partent automatiquement au retour de la connexion).

**Côté service IT (console `/admin`, protégée)**
- Liste des incidents avec filtres (statut, catégorie, salle, criticité,
  recherche plein texte) et **export CSV**.
- Cycle de vie contrôlé : Nouveau → En cours → Résolu → Fermé, avec
  assignation à un technicien et commentaires internes/publics.
- **Carte des salles** avec code couleur selon les incidents ouverts.
- **Statistiques** : volume par semaine, MTTR, top 5 salles/équipements,
  répartition par catégorie.
- **Générateur d'étiquettes QR** imprimables (une feuille A4 par salle) —
  voir [`docs/GUIDE-QR.md`](docs/GUIDE-QR.md).
- **Référentiel salles & équipements** : gestion complète depuis la console
  (v2.1), sans toucher au seed.
- Notifications **email + webhook Teams/Slack** à chaque incident,
  filtrables par criticité.

**Transverses** : accessibilité WCAG 2.1 AA (contrastes, focus visible,
navigation clavier, libellés), RGPD (données minimales, purge après 12 mois,
mention légale sur le formulaire), ton simple et rassurant côté utilisateur
(le jargon reste côté admin).

## 🚀 Démarrage rapide (SQLite)

```bash
npm install
cp .env.example .env        # puis ajustez les variables
npm run db:push             # crée le schéma SQLite
npm run db:seed             # jeu de démonstration : 6 salles,
                            # 19 équipements, 25 incidents, 3 comptes
npm run dev                 # http://localhost:3000
```

Identifiants de démonstration (créés par le seed) :

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | `admin@exemple.fr` | `Admin!2026` |
| Technicien | `technicien@exemple.fr` | `Technicien!2026` |

⚠️ À changer absolument avant toute mise en production.

## 🏭 Production (PostgreSQL)

1. Dans `prisma/schema.prisma` : `provider = "postgresql"`.
2. `DATABASE_URL="postgresql://user:pass@host:5432/signalement_it"`.
3. Renseigner `NEXT_PUBLIC_BASE_URL` (domaine public HTTPS — utilisé par les
   QR codes et les liens de suivi).
4. Configurer SMTP et/ou le webhook dans `.env`.
5. `npm run build && npm start`, derrière un reverse proxy avec HTTPS.
6. Planifier la purge RGPD : `npm run purge` (cron mensuel conseillé).

## 🗄️ Structure des données

| Table | Rôle |
|---|---|
| `Room` | Salles/lieux avec **code court stable** utilisé dans les URL QR |
| `Equipment` | Équipements (code unique, type, salle) |
| `Incident` | Signalements : n° ticket `INC-<année>-<seq>`, statut, criticité, catégorie, description, déclarant (optionnel), jeton de suivi public, dates |
| `Photo` | Photos jointes (base64 en dev ; stockage objet S3/MinIO recommandé en prod) |
| `Comment` | Commentaires support, avec flag `internal` |
| `AdminUser` / `Session` | Comptes console et sessions (cookies httpOnly) |
| `TicketCounter` | Compteur atomique de tickets par année |

## 📁 Arborescence

```
prisma/schema.prisma       Modèle de données
prisma/seed.ts             Jeu de démonstration (25 incidents)
scripts/purge.ts           Purge RGPD (rétention configurable)
src/app/page.tsx           Accueil public
src/app/r/page.tsx         Entrée QR : /r?salle=…&eq=…
src/app/t/[token]/page.tsx Suivi public par jeton
src/app/admin/…            Console (login + groupe protégé)
src/app/api/…              API : incidents, comments, auth, qr, export
src/components/…           Wizard de signalement, composants admin, PWA
src/lib/data.ts            Référentiel catégories / sous-questions / micro-guides
src/lib/ticket.ts          N° atomiques + jetons de suivi
src/lib/notify.ts          Emails + webhooks (fire-and-forget)
public/sw.js               Service worker (shell + fallback hors-ligne)
docs/GUIDE-QR.md           Guide de déploiement des QR codes
```

## 🔐 Sécurité & RGPD

- Signalement public sans compte : seuls nom/email/poste **optionnels**
  sont collectés, jamais de données sensibles.
- Console protégée par sessions serveur (cookies `httpOnly`,
  `sameSite=lax`, `secure` en production), mots de passe **bcrypt**.
- Suivi public par jeton aléatoire 128 bits (impossible à deviner),
  sans données personnelles.
- Purge automatique : `npm run purge` supprime tickets et photos au-delà de
  `RETENTION_MONTHS` (12 mois par défaut) — à planifier via cron.
- Mention légale et durée de conservation affichées sur le formulaire.

## 📄 Licence

Usage interne — cortAIx factory.
