// ─── Référentiel des catégories, sous-questions et micro-guides ────
// Vocabulaire simple, zéro jargon : destiné à l'utilisateur final.

export interface SubIssue {
  key: string;
  label: string;
}

export interface Category {
  key: string;
  label: string;
  icon: string;
  subIssues: SubIssue[];
  /** Micro-guide de premier secours : 2-3 checks rapides avant validation */
  guides: string[];
}

export const CATEGORIES: Category[] = [
  {
    key: "ECRAN",
    label: "Écran",
    icon: "🖥️",
    subIssues: [
      { key: "ecran_noir", label: "Écran noir" },
      { key: "taches_pixels", label: "Taches / pixels morts" },
      { key: "pas_image", label: "Pas d'image" },
      { key: "cable_endommage", label: "Câble endommagé ou manquant" },
      { key: "oscintillement", label: "Ça clignote / oscille" },
    ],
    guides: [
      "Vérifiez que le câble d'alimentation de l'écran est bien branché des deux côtés.",
      "Appuyez sur le bouton d'allumage de l'écran et testez le bouton de sélection de source (HDMI / VGA / DisplayPort).",
      "Vérifiez que le câble entre l'écran et l'ordinateur est fermement clipsé des deux côtés.",
    ],
  },
  {
    key: "ORDINATEUR",
    label: "Ordinateur",
    icon: "💻",
    subIssues: [
      { key: "ne_demarre_pas", label: "Ne démarre pas" },
      { key: "tres_lent", label: "Très lent" },
      { key: "plante", label: "Plante / redémarre tout seul" },
      { key: "bruit", label: "Bruit anormal (ventilateur…)" },
      { key: "mot_de_passe", label: "Mot de passe bloqué" },
    ],
    guides: [
      "Vérifiez que la prise électrique et le bloc d'alimentation sont bien branchés.",
      "Éteignez complètement l'ordinateur, attendez 10 secondes, puis redémarrez.",
      "Notez les éventuels messages affichés à l'écran — utile pour le technicien.",
    ],
  },
  {
    key: "IMPRIMANTE",
    label: "Imprimante / Scanner",
    icon: "🖨️",
    subIssues: [
      { key: "bourrage", label: "Bourrage papier" },
      { key: "pas_de_tirage", label: "N'imprime pas" },
      { key: "traits", label: "Taches / traits sur les copies" },
      { key: "scan_bloque", label: "Scanner bloqué" },
      { key: "cartouches", label: "Cartouche / toner à remplacer" },
    ],
    guides: [
      "Ouvrez le capot et retirez délicatement le papier coincé.",
      "Éteignez puis rallumez l'imprimante (30 secondes hors tension).",
      "Vérifiez qu'il y a du papier dans le bac et que le câble réseau/USB est branché.",
    ],
  },
  {
    key: "RESEAU",
    label: "Réseau / Wi-Fi",
    icon: "📶",
    subIssues: [
      { key: "wifi_coupé", label: "Wi-Fi coupé" },
      { key: "pas_de_reseau", label: "Pas de réseau filaire" },
      { key: "connexion_lente", label: "Connexion très lente" },
      { key: "interruptions", label: "Coupures aléatoires" },
    ],
    guides: [
      "Désactivez puis réactivez le Wi-Fi de votre appareil.",
      "Testez si d'autres personnes dans la salle ont le même problème (indice fort d'une panne réseau).",
      "Si vous êtes en filaire : vérifiez que le câble réseau est bien clipsé et essayez une autre prise.",
    ],
  },
  {
    key: "TELEPHONIE",
    label: "Téléphonie",
    icon: "☎️",
    subIssues: [
      { key: "pas_de_tonalite", label: "Pas de tonalité" },
      { key: "son_coupe", label: "Le son coupe" },
      { key: "telephone_hors_service", label: "Téléphone hors service" },
      { key: "messagerie", label: "Messagerie vocale bloquée" },
    ],
    guides: [
      "Débranchez puis rebranchez le téléphone (alimentation et câble réseau).",
      "Testez avec un autre combiné si disponible.",
      "Vérifiez l'affichage du poste : rien affiché = probablement plus d'alimentation.",
    ],
  },
  {
    key: "VIDEOPROJ",
    label: "Vidéoprojection",
    icon: "📽️",
    subIssues: [
      { key: "pas_de_signal", label: "Pas de signal" },
      { key: "lampe_hs", label: "Lampe / dalle HS" },
      { key: "telecommande", label: "Télécommande absente ou HS" },
      { key: "bruit_ventilo", label: "Bruit de ventilateur" },
    ],
    guides: [
      "Vérifiez que le vidéoprojecteur est allumé et que le bon câble est sélectionné (HDMI / VGA).",
      "Redémarrez le vidéoprojecteur et l'ordinateur qui envoie l'image.",
      "Vérifiez la position du cache d'objectif et la luminosité réglée au minimum.",
    ],
  },
  {
    key: "LOGICIEL",
    label: "Logiciel / Applicatif",
    icon: "🧩",
    subIssues: [
      { key: "logiciel_plante", label: "L'application plante" },
      { key: "acces_refuse", label: "Accès refusé / erreur de connexion" },
      { key: "maj_bloquee", label: "Mise à jour bloquée" },
      { key: "licence", label: "Message de licence expirée" },
    ],
    guides: [
      "Fermez complètement l'application puis relancez-la.",
      "Redémarrez votre poste : cela règle une panne sur deux.",
      "Notez le message d'erreur exact (ou faites une capture d'écran).",
    ],
  },
  {
    key: "ELECTRICITE",
    label: "Électricité / Alimentation",
    icon: "🔌",
    subIssues: [
      { key: "prise_hs", label: "Prise ou multiprise HS" },
      { key: "pas_de_courant", label: "Pas de courant sur le poste" },
      { key: "cable_detendu", label: "Câble endommagé / dénudé" },
    ],
    guides: [
      "Testez la prise avec un autre appareil (chargeur de téléphone par exemple).",
      "⚠️ Sécurité : ne touchez jamais un câble dénudé — signalez-le en criticité 🔴.",
      "Vérifiez le disjoncteur de la salle si plusieurs prises sont mortes.",
    ],
  },
  {
    key: "AUTRE",
    label: "Autre",
    icon: "❓",
    subIssues: [
      { key: "autre", label: "Autre problème non listé" },
    ],
    guides: [
      "Décrivez le plus précisément possible ce qui se passe et depuis quand.",
      "Une photo vaut mieux qu'un long message : pensez à l'appareil photo.",
    ],
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
);

export const CRITICALITIES = [
  {
    key: "BLOQUANT",
    icon: "🔴",
    label: "Bloquant",
    hint: "Impossible de travailler",
    weight: 3,
  },
  {
    key: "GENANT",
    icon: "🟠",
    label: "Gênant",
    hint: "Travail ralenti",
    weight: 2,
  },
  {
    key: "MINEUR",
    icon: "🟡",
    label: "Mineur",
    hint: "À planifier",
    weight: 1,
  },
] as const;

export const CRITICALITY_WEIGHT: Record<string, number> = Object.fromEntries(
  CRITICALITIES.map((c) => [c.key, c.weight])
);

export const STATUSES = [
  { key: "NOUVEAU", label: "Nouveau", color: "bg-blue-100 text-blue-800" },
  { key: "EN_COURS", label: "En cours", color: "bg-amber-100 text-amber-800" },
  { key: "RESOLU", label: "Résolu", color: "bg-green-100 text-green-800" },
  { key: "FERME", label: "Fermé", color: "bg-gray-100 text-gray-700" },
] as const;

export const STATUS_MAP: Record<string, (typeof STATUSES)[number]> =
  Object.fromEntries(STATUSES.map((s) => [s.key, s]));

export function statusLabel(key: string): string {
  return STATUS_MAP[key]?.label ?? key;
}

export function criticalityLabel(key: string): string {
  return CRITICALITIES.find((c) => c.key === key)?.label ?? key;
}

export function criticalityIcon(key: string): string {
  return CRITICALITIES.find((c) => c.key === key)?.icon ?? "⚪";
}

export function categoryLabel(key: string): string {
  return CATEGORY_MAP[key]?.label ?? key;
}

/** Libellé lisible d'une sous-question (retourne la clé si inconnue). */
export function subIssueLabel(categoryKey: string, subKey: string | null): string | null {
  if (!subKey) return null;
  return CATEGORY_MAP[categoryKey]?.subIssues.find((s) => s.key === subKey)?.label ?? subKey;
}

/** Libellé court et rassurant pour la page de confirmation. */
export function friendlyMessage(status: string): string {
  switch (status) {
    case "NOUVEAU":
      return "Nous avons bien reçu votre signalement. L'équipe IT vient d'être prévenue et va le prendre en charge.";
    case "EN_COURS":
      return "Un technicien est sur le problème. Vous pouvez suivre l'avancement sur cette page.";
    case "RESOLU":
      return "Le problème a été résolu ! Pensez à vérifier que tout fonctionne de votre côté.";
    case "FERME":
      return "Ce signalement est terminé. Merci d'avoir aidé à améliorer le quotidien de tous !";
    default:
      return "";
  }
}
