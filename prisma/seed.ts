/**
 * Jeu de données de démonstration — 25 incidents fictifs réalistes.
 * Usage : npm run db:push && npm run db:seed
 * (Réinitialise les tables de référence et les incidents.)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const daysAgo = (d: number, h = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, Math.floor(Math.random() * 55), 0, 0);
  return date;
};
const hoursLater = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const token = () => crypto.randomBytes(16).toString("base64url");

async function main() {
  console.log("🌱 Nettoyage…");
  await prisma.incident.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.room.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.session.deleteMany();
  await prisma.ticketCounter.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.activityLog.deleteMany();

  console.log("🌱 Salles et équipements…");
  const roomDefs = [
    { code: "OSA2A", name: "Open Space 2A", building: "Bât. A — 2ᵉ étage", floor: "A2" },
    { code: "BASTIDE", name: "Salle Bastide", building: "Bât. A — 1ᵉʳ étage", floor: "A1" },
    { code: "VEGA", name: "Salle Réunion Vega", building: "Bât. B — 1ᵉʳ étage", floor: "B1" },
    { code: "ORION", name: "Salle Réunion Orion", building: "Bât. B — 2ᵉ étage", floor: "B2" },
    { code: "ATELIER", name: "Atelier Prototypage", building: "Bât. C — RdC", floor: "C0" },
    { code: "ACCUEIL", name: "Accueil / Hall", building: "Bât. A — RdC", floor: "A0" },
  ];
  const rooms: Record<string, { id: string; name: string }> = {};
  for (const r of roomDefs) {
    const created = await prisma.room.create({ data: r });
    rooms[r.code] = { id: created.id, name: created.name };
  }

  const eqDefs: [string, string, string, string][] = [
    // [code, nom, type, salle]
    ["PC-OSA2A-01", "Ordinateur poste 01", "ORDINATEUR", "OSA2A"],
    ["PC-OSA2A-02", "Ordinateur poste 02", "ORDINATEUR", "OSA2A"],
    ["PC-OSA2A-03", "Ordinateur poste 03", "ORDINATEUR", "OSA2A"],
    ["ECR-OSA2A-01", "Écran poste 01", "ECRAN", "OSA2A"],
    ["ECR-OSA2A-02", "Écran poste 02", "ECRAN", "OSA2A"],
    ["IMPR-OSA2A-01", "Imprimante multifonction", "IMPRIMANTE", "OSA2A"],
    ["PC-BASTIDE-01", "Ordinateur professeur", "ORDINATEUR", "BASTIDE"],
    ["ECR-BASTIDE-01", "Écran professeur", "ECRAN", "BASTIDE"],
    ["VIDEOPROJ-BASTIDE-01", "Vidéoprojecteur", "VIDEOPROJ", "BASTIDE"],
    ["PC-VEGA-01", "PC raccord table", "ORDINATEUR", "VEGA"],
    ["ECR-VEGA-01", "Écran mural 65\"", "ECRAN", "VEGA"],
    ["VIDEOPROJ-VEGA-01", "Vidéoprojecteur mobile", "VIDEOPROJ", "VEGA"],
    ["PC-ORION-01", "PC raccord table", "ORDINATEUR", "ORION"],
    ["TEL-ORION-01", "Téléphone de conférence", "TELEPHONIE", "ORION"],
    ["IMPR-ATELIER-01", "Imprimante 3D", "IMPRIMANTE", "ATELIER"],
    ["SCAN-ATELIER-01", "Scanner 3D", "IMPRIMANTE", "ATELIER"],
    ["PC-ATELIER-01", "Poste CAO", "ORDINATEUR", "ATELIER"],
    ["ECR-ACCUEIL-01", "Écran borne accueil", "ECRAN", "ACCUEIL"],
    ["TEL-ACCUEIL-01", "Téléphone standard", "TELEPHONIE", "ACCUEIL"],
  ];
  const eq: Record<string, string> = {};
  for (const [code, name, type, roomCode] of eqDefs) {
    const created = await prisma.equipment.create({
      data: { code, name, type, roomId: rooms[roomCode].id },
    });
    eq[code] = created.id;
  }

  console.log("🌱 Comptes admin…");
  const admins = await Promise.all([
    prisma.adminUser.create({
      data: {
        email: "admin@exemple.fr",
        name: "Camille Fabre",
        passwordHash: await bcrypt.hash("Admin!2026", 10),
        role: "ADMIN",
      },
    }),
    prisma.adminUser.create({
      data: {
        email: "technicien@exemple.fr",
        name: "Jonas Meyer",
        passwordHash: await bcrypt.hash("Technicien!2026", 10),
        role: "TECHNICIEN",
      },
    }),
    prisma.adminUser.create({
      data: {
        email: "ines.roche@exemple.fr",
        name: "Inès Roche",
        passwordHash: await bcrypt.hash("Technicien!2026", 10),
        role: "TECHNICIEN",
      },
    }),
  ]);

  console.log("🌱 Incidents de démonstration…");
  const PRIORITY_BY_CRIT: Record<string, string> = {
    BLOQUANT: "P1",
    GENANT: "P2",
    MINEUR: "P3",
  };
  const SLA_BY_PRIO: Record<string, number> = { P1: 8, P2: 24, P3: 72, P4: 168 };
  type Seed = {
    room: string; eq?: string; category: string; subIssue: string;
    description?: string; criticality: string; status: string;
    type?: string; tags?: string; timeSpent?: number; escalated?: boolean;
    created: Date; resolveAfter?: number; closeAfter?: number;
    reporter?: [string, string, string?]; // nom, email, poste
    assigned?: number; comments?: [number, string, boolean][]; // adminIndex, texte, interne
    satisfaction?: 1 | -1; // avis du déclarant après résolution (v2.1)
  };

  const seeds: Seed[] = [
    // ── Incidents récents (ouverts) ──
    { room: "OSA2A", eq: "ECR-OSA2A-01", category: "ECRAN", subIssue: "ecran_noir", description: "L'écran du poste 01 reste noir depuis ce matin, le voyant clignote.", criticality: "BLOQUANT", status: "NOUVEAU", created: daysAgo(0, 8), reporter: ["Léa Mercier", "lea.mercier@exemple.fr", "P-201"] },
    { room: "OSA2A", category: "RESEAU", subIssue: "wifi_coupé", description: "Plus personne n'a de Wi-Fi dans l'open space depuis midi.", criticality: "GENANT", status: "EN_COURS", created: daysAgo(1, 12), assigned: 1, timeSpent: 45, comments: [[1, "Redémarrage de la borne en cours, intervention à 14h.", false]] },
    { room: "BASTIDE", eq: "VIDEOPROJ-BASTIDE-01", category: "VIDEOPROJ", subIssue: "pas_de_signal", description: "Aucune image en sortie du vidéoprojecteur pour la formation de 14h.", criticality: "BLOQUANT", status: "EN_COURS", created: daysAgo(1, 9), assigned: 0, escalated: true, reporter: ["Formateur : H. Diallo", "h.diallo@exemple.fr"], comments: [[0, "Câble HDMI remplacé à 13h40, on surveille.", true]] },
    { room: "ATELIER", eq: "IMPR-ATELIER-01", category: "IMPRIMANTE", subIssue: "bourrage", description: "Bourrage papier récurrent au niveau de la buse.", criticality: "GENANT", status: "NOUVEAU", created: daysAgo(2, 15) },
    { room: "VEGA", eq: "ECR-VEGA-01", category: "ECRAN", subIssue: "taches_pixels", description: "Une trace sombre en bas de l'écran mural, visible sur fond clair.", criticality: "MINEUR", status: "NOUVEAU", created: daysAgo(3, 11) },
    { room: "ACCUEIL", eq: "TEL-ACCUEIL-01", category: "TELEPHONIE", subIssue: "pas_de_tonalite", description: "Le téléphone de l'accueil n'a plus de tonalité.", criticality: "BLOQUANT", status: "EN_COURS", created: daysAgo(2, 10), assigned: 2, reporter: ["Anonyme", "", "P-001"] },

    // ── Demande de service & attente déclarant (v3) ──
    { room: "VEGA", category: "LOGICIEL", subIssue: "acces_refuse", description: "Besoin du logiciel de visio installé sur le PC de la salle Vega pour les réunions clients.", criticality: "MINEUR", type: "DEMANDE", status: "EN_COURS", tags: "installation,visio", created: daysAgo(2, 16), assigned: 2, timeSpent: 30 },
    { room: "ORION", eq: "VIDEOPROJ-VEGA-01", category: "VIDEOPROJ", subIssue: "pas_de_signal", description: "Le vidéoprojecteur s'allume puis s'éteint au bout de 2 minutes.", criticality: "GENANT", status: "EN_ATTENTE", created: daysAgo(3, 10), assigned: 1, timeSpent: 60, comments: [[1, "Pouvez-vous préciser si le voyant de température s'allume ? On attend votre retour pour commander la pièce.", false]] },

    // ── Incidents de la semaine dernière ──
    { room: "OSA2A", eq: "PC-OSA2A-02", category: "ORDINATEUR", subIssue: "tres_lent", description: "Le poste 02 met 10 minutes à démarrer.", criticality: "GENANT", status: "RESOLU", created: daysAgo(8), resolveAfter: 20, closeAfter: 44, assigned: 1, reporter: ["Marc Le Goff", "m.legoff@exemple.fr", "P-202"], satisfaction: 1, comments: [[1, "SSD en fin de vie, remplacé. Poste comme neuf !", false]] },
    { room: "ORION", eq: "TEL-ORION-01", category: "TELEPHONIE", subIssue: "son_coupe", description: "Le son coupe aléatoirement en visio depuis l'upgrade.", criticality: "GENANT", status: "RESOLU", created: daysAgo(9), resolveAfter: 30, assigned: 2 },
    { room: "BASTIDE", eq: "PC-BASTIDE-01", category: "LOGICIEL", subIssue: "acces_refuse", description: "Erreur « accès refusé » au logiciel de gestion à chaque ouverture de session.", criticality: "BLOQUANT", status: "RESOLU", created: daysAgo(10), resolveAfter: 5, closeAfter: 50, assigned: 0, satisfaction: 1, comments: [[0, "Groupe AD erroné, corrigé en 5 min.", false]] },
    { room: "VEGA", eq: "VIDEOPROJ-VEGA-01", category: "VIDEOPROJ", subIssue: "telecommande", description: "La télécommande du vidéoprojecteur mobile a disparu.", criticality: "MINEUR", status: "EN_COURS", created: daysAgo(12), assigned: 1 },
    { room: "ACCUEIL", category: "ELECTRICITE", subIssue: "prise_hs", description: "La prise de la borne d'accueil ne fournit plus de courant.", criticality: "GENANT", status: "RESOLU", created: daysAgo(11), resolveAfter: 26, closeAfter: 70, assigned: 2 },
    { room: "ATELIER", eq: "PC-ATELIER-01", category: "ORDINATEUR", subIssue: "ne_demarre_pas", description: "Le poste CAO ne démarre plus du tout, aucun voyant.", criticality: "BLOQUANT", status: "RESOLU", created: daysAgo(13), resolveAfter: 4, assigned: 1, comments: [[1, "Alimentation HS, échange standard effectué.", false], [1, "Facture fournisseur à joindre au dossier.", true]] },
    { room: "OSA2A", eq: "IMPR-OSA2A-01", category: "IMPRIMANTE", subIssue: "cartouches", description: "Toner noir à remplacer sur la multifonction.", criticality: "MINEUR", status: "FERME", created: daysAgo(15), resolveAfter: 3, closeAfter: 30, assigned: 2, comments: [[2, "Toner changé, merci du signalement.", false]] },
    { room: "OSA2A", eq: "ECR-OSA2A-02", category: "ECRAN", subIssue: "oscintillement", description: "L'écran du poste 02 clignote par intermittence.", criticality: "GENANT", status: "FERME", created: daysAgo(16), resolveAfter: 27, closeAfter: 96, assigned: 1, reporter: ["Sophie Nguyen", "s.nguyen@exemple.fr", "P-203"], satisfaction: -1 },
    { room: "ORION", eq: "PC-ORION-01", category: "ORDINATEUR", subIssue: "plante", description: "Le PC de la salle Orion redémarre tout seul toutes les heures.", criticality: "BLOQUANT", status: "FERME", created: daysAgo(18), resolveAfter: 8, closeAfter: 60, assigned: 0 },

    // ── Semaine -3 ──
    { room: "BASTIDE", eq: "ECR-BASTIDE-01", category: "ECRAN", subIssue: "cable_endommage", description: "Câble DisplayPort pincé par le bras de l'écran, connexion instable.", criticality: "MINEUR", status: "FERME", created: daysAgo(22), resolveAfter: 48, closeAfter: 120, assigned: 1 },
    { room: "VEGA", category: "RESEAU", subIssue: "connexion_lente", description: "Débits très faibles en visio dans toute la salle Vega.", criticality: "GENANT", status: "FERME", created: daysAgo(23), resolveAfter: 10, closeAfter: 72, assigned: 0, satisfaction: 1, comments: [[0, "Mauvais réglage QoS sur le switch de l'étage, corrigé.", false]] },
    { room: "ATELIER", eq: "SCAN-ATELIER-01", category: "IMPRIMANTE", subIssue: "scan_bloque", description: "Le scanner 3D se bloque à 30 % de la numérisation.", criticality: "GENANT", status: "FERME", created: daysAgo(25), resolveAfter: 40, closeAfter: 100, assigned: 2 },
    { room: "ACCUEIL", category: "AUTRE", subIssue: "autre", description: "La borne d'accueil est décalée, l'écran bouge quand on la touche.", criticality: "MINEUR", status: "FERME", created: daysAgo(26), resolveAfter: 22, closeAfter: 80 },

    // ── Semaine -4 ──
    { room: "OSA2A", eq: "PC-OSA2A-03", category: "ORDINATEUR", subIssue: "bruit", description: "Ventilateur du poste 03 extrêmement bruyant depuis quelques jours.", criticality: "MINEUR", status: "FERME", created: daysAgo(29), resolveAfter: 30, closeAfter: 200, assigned: 1 },
    { room: "BASTIDE", category: "ELECTRICITE", subIssue: "pas_de_courant", description: "Plusieurs prises de la salle Bastide sans courant ce matin-là.", criticality: "BLOQUANT", status: "FERME", created: daysAgo(31), resolveAfter: 2, closeAfter: 48, assigned: 2, comments: [[2, "Disjoncteur différentiel déclenché, réarmé et cause identifiée (multiprise défectueuse).", false]] },
    { room: "ORION", category: "LOGICIEL", subIssue: "licence", description: "Message « licence expirée » sur le logiciel de visio.", criticality: "GENANT", status: "FERME", created: daysAgo(33), resolveAfter: 6, closeAfter: 72, assigned: 0 },
    { room: "VEGA", eq: "PC-VEGA-01", category: "ORDINATEUR", subIssue: "mot_de_passe", description: "Compte verrouillé après plusieurs tentatives.", criticality: "MINEUR", status: "FERME", created: daysAgo(35), resolveAfter: 1, closeAfter: 24, assigned: 0 },

    // ── Semaine -5 ──
    { room: "ACCUEIL", eq: "ECR-ACCUEIL-01", category: "ECRAN", subIssue: "pas_image", description: "La borne d'accueil affichait le logo BIOS mais rien d'autre.", criticality: "GENANT", status: "FERME", created: daysAgo(38), resolveAfter: 12, closeAfter: 150, assigned: 1 },
    { room: "ATELIER", category: "RESEAU", subIssue: "interruptions", description: "Coupures réseau aléatoires dans l'atelier, machines déconnectées.", criticality: "GENANT", status: "FERME", created: daysAgo(40), resolveAfter: 18, closeAfter: 96, assigned: 0 },
  ];

  let seq = 0;
  for (const s of seeds) {
    seq++;
    const prefix = s.type === "DEMANDE" ? "DEM" : s.type === "PROBLEME" ? "PB" : "INC";
    const resolvedAt = s.resolveAfter ? hoursLater(s.created, s.resolveAfter) : null;
    const closedAt = s.closeAfter ? hoursLater(s.created, s.closeAfter) : null;
    const priority = PRIORITY_BY_CRIT[s.criticality] ?? "P3";
    const incident = await prisma.incident.create({
      data: {
        ticketNumber: `${prefix}-2026-${String(seq).padStart(4, "0")}`,
        token: token(),
        type: s.type ?? "INCIDENT",
        status: s.status,
        priority,
        criticality: s.criticality,
        category: s.category,
        subIssue: s.subIssue,
        description: s.description,
        reporterName: s.reporter?.[0] === "Anonyme" ? null : s.reporter?.[0] || null,
        reporterEmail: s.reporter?.[1] || null,
        workstationRef: s.reporter?.[2] || null,
        tags: s.tags ?? "",
        timeSpent: s.timeSpent ?? 0,
        escalated: s.escalated ?? false,
        roomId: rooms[s.room].id,
        equipmentId: s.eq ? eq[s.eq] : null,
        assignedToId: s.assigned !== undefined ? admins[s.assigned].id : null,
        createdAt: s.created,
        updatedAt: closedAt ?? resolvedAt ?? s.created,
        dueAt: hoursLater(s.created, SLA_BY_PRIO[priority] ?? 72),
        firstResponseAt: s.assigned !== undefined ? hoursLater(s.created, 2) : null,
        resolvedAt,
        closedAt: s.status === "FERME" ? closedAt : null,
        satisfaction: s.satisfaction ?? null,
        feedbackAt: s.satisfaction ? (closedAt ?? resolvedAt ?? null) : null,
        comments: s.comments
          ? {
              create: s.comments.map(([adminIdx, body, internal]) => ({
                authorType: "SUPPORT",
                authorName: admins[adminIdx].name,
                adminId: admins[adminIdx].id,
                body,
                internal,
                createdAt: hoursLater(s.created, 2),
              })),
            }
          : undefined,
        activity: {
          create: [
            {
              action: "CREATED",
              actorName: s.reporter?.[0] ?? "Anonyme",
              details: `${prefix}-2026-${String(seq).padStart(4, "0")}`,
              createdAt: s.created,
            },
            ...(s.assigned !== undefined
              ? [
                  {
                    action: "ASSIGNED",
                    actorName: "Système",
                    details: admins[s.assigned].name,
                    createdAt: hoursLater(s.created, 1),
                  },
                ]
              : []),
          ],
        },
      },
    });
    console.log(`   ${incident.ticketNumber} — ${rooms[s.room].name} (${s.category})`);
  }

  // Synchronise le compteur de tickets pour les prochains signalements
  await prisma.ticketCounter.upsert({
    where: { year: new Date().getFullYear() },
    update: { seq },
    create: { year: new Date().getFullYear(), seq },
  });

  console.log(`\n✅ ${seq} incidents de démonstration créés.`);

  console.log("🌱 Base de connaissances…");
  const kbArticles: {
    slug: string;
    title: string;
    category: string;
    keywords: string;
    content: string;
  }[] = [
    {
      slug: "ecran-noir-3-verifications",
      title: "Écran noir : les 3 vérifications avant de signaler",
      category: "ECRAN",
      keywords: "écran, noir, hdmi, vga, alimentation",
      content:
        "Un écran noir n'est pas toujours une panne ! Avant de signaler, suivez ces 3 vérifications rapides.\n\n## 1. L'alimentation\nVérifiez que le câble d'alimentation de l'écran est bien branché des deux côtés, et que le voyant de l'écran est allumé.\n\n## 2. La source d'entrée\nAppuyez sur les boutons de l'écran et testez les sources : HDMI, VGA, DisplayPort. Un mauvais canal sélectionné est la cause n°1.\n\n## 3. Le câble vidéo\nVérifiez que le câble entre l'écran et l'ordinateur est fermement clipsé des deux côtés. Testez avec un autre câble si possible.\n\nSi rien ne fonctionne après ces vérifications : signalez le problème en précisant le numéro du poste.",
    },
    {
      slug: "wifi-coupes-reseau",
      title: "Wi-Fi coupé : les gestes qui sauvent",
      category: "RESEAU",
      keywords: "wifi, réseau, coupure, débit, borne",
      content:
        "- Désactivez puis réactivez le Wi-Fi de votre appareil.\n- Oubliez le réseau puis reconnectez-vous (mot de passe à saisir à nouveau).\n- Redémarrez votre appareil.\n- Testez si d'autres personnes autour de vous ont le même problème : si oui, c'est la borne — signalez-le tout de suite en précisant la salle.\n\n## En filaire\nVérifiez que le câble réseau est bien clipsé (petit clic) et essayez une autre prise murale si disponible.",
    },
    {
      slug: "imprimante-ne-imprime-pas",
      title: "L'imprimante n'imprime pas : check-list express",
      category: "IMPRIMANTE",
      keywords: "imprimante, bourrage, toner, file d'attente, spooler",
      content:
        "Avant de signaler, testez ces points :\n\n- Il y a du papier dans le bac, sans bourrage (ouvrez le capot et vérifiez).\n- L'imprimante est allumée, sans voyant d'erreur clignotant.\n- Votre document est bien dans la file d'attente : double-cliquez sur l'icône d'imprimante dans la barre des tâches.\n- Un ancien document bloqué peut suffire à bloquer toute la file : annulez les impressions en attente et relancez.\n\n## Toner\nSi les copies sortent pâles, le toner est probablement à remplacer — signalez-le en criticité « Mineur », l'équipe IT le planifiera.",
    },
    {
      slug: "ordinateur-tres-lent",
      title: "Ordinateur très lent : 3 minutes pour diagnostiquer",
      category: "ORDINATEUR",
      keywords: "lent, lenteur, redémarrage, disque, mémoire",
      content:
        "Un poste lent est souvent un poste qui n'a pas été redémarré depuis longtemps.\n\n## Le redémarrage complet\nÉteignez complètement l'ordinateur (menu Démarrer → Arrêter), attendez 10 secondes, puis redémarrez. Cela règle une lenteur sur deux.\n\n## Après le redémarrage\n- Notez combien de temps met le poste pour être utilisable.\n- Notez les applications lancées automatiquement au démarrage.\n\nSi le poste met plus de 5 minutes à démarrer, signalez-le en précisant le numéro du poste : le disque est peut-être en fin de vie.",
    },
    {
      slug: "videoprojecteur-pas-de-signal",
      title: "Vidéoprojecteur : pas d'image en réunion ?",
      category: "VIDEOPROJ",
      keywords: "vidéoprojecteur, hdmi, vga, signal, réunion",
      content:
        "Pas de panique, dans 8 cas sur 10 c'est un problème de sélection de source.\n\n- Vérifiez que le vidéoprojecteur est allumé (voyant vert, ventilateur audible).\n- Sur la télécommande, appuyez plusieurs fois sur « Source » ou « Input » jusqu'à trouver HDMI ou VGA selon votre câble.\n- Sur l'ordinateur, activez la sortie vidéo : touche Windows + P, puis choisissez « Dupliquer ».\n- Le cache d'objectif est bien retiré et la luminosité n'est pas au minimum.\n\nSi l'image reste absente après 2 minutes de manipulations : signalez-le avant le début de votre réunion, l'équipe IT peut souvent intervenir en quelques minutes.",
    },
    {
      slug: "comment-signaler-un-probleme",
      title: "Comment bien signaler un problème informatique",
      category: "GENERAL",
      keywords: "signalement, ticket, suivi, jeton, photo",
      content:
        "Le signalement se fait sans compte, en moins de 30 secondes.\n\n## Les étapes\n- Scannez le QR code de la salle (ou ouvrez la page d'accueil).\n- Choisissez votre salle, puis l'équipement concerné s'il y en a un.\n- Décrivez le problème avec les mots simples du quotidien.\n- Ajoutez éventuellement une photo : c'est souvent ce qui aide le plus.\n\n## Après le signalement\nVous recevez un numéro de ticket et un lien de suivi privé. Conservez-le : il vous permet de suivre l'avancement, d'ajouter des précisions et de donner votre avis une fois le problème résolu.\n\n## Vos données\nNom et email sont facultatifs. Les données sont supprimées automatiquement 12 mois après la fermeture du ticket.",
    },
  ];

  for (const a of kbArticles) {
    await prisma.knowledgeArticle.create({
      data: { ...a, published: true, views: Math.floor(Math.random() * 40) },
    });
  }
  console.log(`   ${kbArticles.length} articles publiés.`);

  console.log("👤 Comptes de démo :");
  console.log("   admin@exemple.fr / Admin!2026 (ADMIN)");
  console.log("   technicien@exemple.fr / Technicien!2026 (TECHNICIEN)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
