import { CATEGORIES } from "@/lib/data";

/**
 * Formulaire d'édition/création d'article de la base de connaissances.
 * Server component : le formulaire POST vers une server action.
 */
export default function KbForm({
  action,
  article,
}: {
  action: (formData: FormData) => Promise<void>;
  article?: {
    id: string;
    title: string;
    category: string;
    keywords: string;
    content: string;
    published: boolean;
    slug: string;
  };
}) {
  const inputClass =
    "min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm";
  const KB_CATEGORIES = [
    ...CATEGORIES.map((c) => ({ key: c.key, label: `${c.icon} ${c.label}` })),
    { key: "GENERAL", label: "🌐 Général" },
  ];

  return (
    <form action={action} className="grid grid-cols-1 gap-4">
      {article && <input type="hidden" name="id" value={article.id} />}

      <div>
        <label htmlFor="kb-title" className="mb-1 block text-sm font-medium">
          Titre *
        </label>
        <input
          id="kb-title"
          name="title"
          type="text"
          required
          defaultValue={article?.title}
          placeholder="Ex. : Écran noir — les 3 vérifications avant de signaler"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="kb-category" className="mb-1 block text-sm font-medium">
            Catégorie
          </label>
          <select
            id="kb-category"
            name="category"
            defaultValue={article?.category ?? "GENERAL"}
            className={inputClass}
          >
            {KB_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="kb-keywords" className="mb-1 block text-sm font-medium">
            Mots-clés (recherche)
          </label>
          <input
            id="kb-keywords"
            name="keywords"
            type="text"
            defaultValue={article?.keywords}
            placeholder="écran, noir, hdmi, vga…"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="kb-content" className="mb-1 block text-sm font-medium">
          Contenu *
        </label>
        <textarea
          id="kb-content"
          name="content"
          rows={14}
          required
          defaultValue={article?.content}
          placeholder={
            "Texte simple. Une ligne vide sépare les paragraphes.\n" +
            "## Pour un sous-titre\n" +
            "- Pour une liste à puces"
          }
          className="w-full rounded-lg border border-slate-300 p-3 font-sans text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Format : paragraphes séparés par une ligne vide, « ## Titre » pour un
          sous-titre, « - item » pour une liste à puces.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="published"
          defaultChecked={article?.published ?? false}
          className="h-4 w-4"
        />
        Publier (visible publiquement sur /kb)
      </label>

      <div>
        <button
          type="submit"
          className="min-h-[44px] rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary-dark"
        >
          {article ? "💾 Enregistrer" : "➕ Créer l'article"}
        </button>
      </div>
    </form>
  );
}
