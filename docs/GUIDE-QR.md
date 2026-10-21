# 📱 Guide de déploiement des QR codes — Signalement IT

Ce guide accompagne la page **Admin → Étiquettes QR** (`/admin/qr`).
Il décrit le format des URL, l'impression, la pose des étiquettes et la
vérification avant mise en service.

---

## 1. Format des URL

Deux variantes, toutes deux encodées dans un QR code :

| Variante | URL | Usage |
|---|---|---|
| **Équipement** | `https://[domaine]/r?salle=[CODE_SALLE]&eq=[CODE_EQ]` | Collée directement sur l'équipement (écran, PC, imprimante, vidéoprojecteur…) |
| **Salle (générique)** | `https://[domaine]/r?salle=[CODE_SALLE]` | Collée à l'entrée de la salle ; l'utilisateur choisit l'équipement ou signale un problème de salle |

Règles de nommage :

- `[CODE_SALLE]` : court, stable, en majuscules, sans accent ni espace
  (ex. `BASTIDE`, `OSA2A`). **Le code ne doit jamais changer après
  impression** : il identifie l'URL dans les QR déjà collés.
- `[CODE_EQ]` : préfixe du type + salle + numéro
  (ex. `ECR-BASTIDE-01`, `PC-OSA2A-03`, `VIDEOPROJ-VEGA-01`).
- Le domaine doit être en **HTTPS** avec un certificat valide : les navigateurs
  mobiles affichent un avertissement sinon, ce qui tue le parcours « 30 s ».

> 💡 Utilisez une URL courte (un seul sous-domaine, pas de chemin long).
> Si besoin, mettez en place une redirection depuis un domaine court
> (ex. `https://it.exemple.fr`) vers l'application.

## 2. Génération et impression

1. Se connecter à la console admin → onglet **Étiquettes QR**.
2. Cocher les salles à imprimer → **🖨️ Imprimer**.
3. Réglages d'impression recommandés :
   - Format **A4**, marges par défaut (12 mm), **sans mise à l'échelle**
     (« taille réelle / 100 % ») ;
   - Impression **couleur conseillée** (le QR générique salle est mis en
     valeur), mais noir et blanc fonctionnel ;
   - Si vous plastifiez, prévoyez ≥ 10 mm de marge autour des étiquettes.

Chaque feuille contient :
- un **QR générique de salle** (📍) à coller à l'entrée / sur la porte ;
- un **QR par équipement** avec son code en clair (ex. `ECR-BASTIDE-01`).

## 3. Pose des étiquettes

| Étiquette | Où la coller |
|---|---|
| QR salle (générique) | Porte d'entrée, plaque de salle, ou près de l'interrupteur |
| QR écran | Cadre de l'écran, coin bas-droit, côté face visible |
| QR PC / laptop station | Dock ou dessus du boîtier |
| QR imprimante / scanner | Capot, à hauteur des yeux |
| QR vidéoprojecteur | Côté du boîtier ou télécommande murale |
| QR téléphone | Socle du combiné |

Consignes :
- **Jamais sur une surface chauffante** ni derrière un objet qui masque le QR.
- Évitez la lumière directe (reflets) et les supports métalliques brillants.
- Utilisez des étiquettes plastifiées ou du ruban adhésif transparent
  **anti-UV** : un QR délavé ou rayé ne se scanne plus.

## 4. ✅ Check-list de vérification (avant de quitter la salle)

Pour chaque étiquette posée, avec un téléphone :

- [ ] Le QR se scanne **du premier coup** à ~30 cm (et à ~1 m pour le QR salle).
- [ ] La page ouverte affiche **la bonne salle** (et le bon équipement).
- [ ] Le numéro affiché sur l'étiquette (ex. `ECR-BASTIDE-01`) correspond
      exactement à l'équipement physique concerné.
- [ ] Créez un signalement test : le ticket apparaît dans la console admin.
- [ ] Testez avec **deux modèles de téléphones** différents (iOS + Android).

⚠️ En cas d'erreur de code : **ne réimprimez pas avec un autre code** tant que
les anciennes étiquettes ne sont pas retirées — deux QR différents dans la
même salle créent des signalements contradictoires.

## 5. Ajout d'une nouvelle salle / d'un nouvel équipement

1. Créer la salle (avec son **code stable**) et ses équipements depuis
   **Admin → Salles & équipements** (`/admin/referentiel`).
2. Régénérer la feuille depuis **Admin → Étiquettes QR** et vérifier que la
   nouvelle salle apparaît.
3. Imprimer, poser, vérifier (check-list ci-dessus).

## 6. Maintenance périodique

- **Trimestriellement** : scan-test rapide de quelques étiquettes,
  notamment celles exposées au soleil ou aux frottements.
- En cas de changement de **domaine** : toutes les étiquettes doivent être
  réimprimées — prévoyez une redirection 301 de l'ancien domaine pour
  les étiquettes manquées.
- Garder un plan de pose (salle → équipements → date de pose) pour tracer
  ce qui a été vérifié.
