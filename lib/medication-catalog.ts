/**
 * Static medication catalog used for the demo ordering flow.
 *
 * Pricing is illustrative cash-pay pricing typical of common discount programs.
 * In production this would be served from `/api/medications/search` backed by
 * a real RxNorm + pricing source.
 */

export type CatalogDrug = {
  id: string
  name: string
  generic?: string
  category: "cardiovascular" | "metabolic" | "mental-health" | "infectious" | "pain" | "respiratory" | "gi" | "endocrine" | "other"
  strength: string
  form: "tablet" | "capsule" | "injection" | "inhaler" | "topical" | "liquid"
  rxRequired: boolean
  /** 30-day cash price in USD (illustrative) */
  priceUsd: number
  description?: string
}

export const MEDICATION_CATALOG: CatalogDrug[] = [
  { id: "rx-lisinopril-10", name: "Lisinopril", generic: "lisinopril", category: "cardiovascular", strength: "10 mg", form: "tablet", rxRequired: true, priceUsd: 4.0, description: "ACE inhibitor for hypertension and heart failure." },
  { id: "rx-amlodipine-5", name: "Amlodipine", generic: "amlodipine", category: "cardiovascular", strength: "5 mg", form: "tablet", rxRequired: true, priceUsd: 5.0, description: "Calcium channel blocker for hypertension." },
  { id: "rx-atorvastatin-20", name: "Atorvastatin", generic: "atorvastatin", category: "cardiovascular", strength: "20 mg", form: "tablet", rxRequired: true, priceUsd: 6.0, description: "Statin for hyperlipidemia." },
  { id: "rx-metoprolol-50", name: "Metoprolol succinate", generic: "metoprolol succinate", category: "cardiovascular", strength: "50 mg", form: "tablet", rxRequired: true, priceUsd: 7.0, description: "Beta-blocker for hypertension and rate control." },

  { id: "rx-metformin-500", name: "Metformin", generic: "metformin", category: "metabolic", strength: "500 mg", form: "tablet", rxRequired: true, priceUsd: 4.0, description: "First-line therapy for type 2 diabetes." },
  { id: "rx-empagliflozin-10", name: "Jardiance", generic: "empagliflozin", category: "metabolic", strength: "10 mg", form: "tablet", rxRequired: true, priceUsd: 49.0, description: "SGLT2 inhibitor for type 2 diabetes and HFrEF." },
  { id: "rx-semaglutide-1", name: "Ozempic", generic: "semaglutide", category: "endocrine", strength: "1 mg/dose", form: "injection", rxRequired: true, priceUsd: 199.0, description: "Weekly GLP-1 receptor agonist." },
  { id: "rx-levothyroxine-50", name: "Levothyroxine", generic: "levothyroxine", category: "endocrine", strength: "50 mcg", form: "tablet", rxRequired: true, priceUsd: 4.0, description: "Thyroid hormone replacement." },

  { id: "rx-sertraline-50", name: "Zoloft", generic: "sertraline", category: "mental-health", strength: "50 mg", form: "tablet", rxRequired: true, priceUsd: 6.0, description: "SSRI for depression and anxiety." },
  { id: "rx-escitalopram-10", name: "Lexapro", generic: "escitalopram", category: "mental-health", strength: "10 mg", form: "tablet", rxRequired: true, priceUsd: 6.0, description: "SSRI for depression and GAD." },

  { id: "rx-omeprazole-20", name: "Prilosec", generic: "omeprazole", category: "gi", strength: "20 mg", form: "capsule", rxRequired: false, priceUsd: 5.0, description: "PPI for GERD and reflux." },
  { id: "rx-pantoprazole-40", name: "Protonix", generic: "pantoprazole", category: "gi", strength: "40 mg", form: "tablet", rxRequired: true, priceUsd: 7.0, description: "PPI for GERD and reflux." },

  { id: "rx-amoxicillin-500", name: "Amoxicillin", generic: "amoxicillin", category: "infectious", strength: "500 mg", form: "capsule", rxRequired: true, priceUsd: 8.0, description: "Penicillin antibiotic." },
  { id: "rx-azithromycin-250", name: "Z-Pak", generic: "azithromycin", category: "infectious", strength: "250 mg", form: "tablet", rxRequired: true, priceUsd: 12.0, description: "Macrolide antibiotic, 5-day course." },

  { id: "rx-albuterol-hfa", name: "Albuterol HFA", generic: "albuterol", category: "respiratory", strength: "90 mcg/puff", form: "inhaler", rxRequired: true, priceUsd: 25.0, description: "Short-acting beta-2 agonist for asthma." },
  { id: "rx-fluticasone-spray", name: "Flonase", generic: "fluticasone", category: "respiratory", strength: "50 mcg/spray", form: "topical", rxRequired: false, priceUsd: 14.0, description: "Intranasal corticosteroid for allergies." },

  { id: "rx-acetaminophen-500", name: "Acetaminophen", generic: "acetaminophen", category: "pain", strength: "500 mg", form: "tablet", rxRequired: false, priceUsd: 4.0, description: "Analgesic and antipyretic." },
  { id: "rx-ibuprofen-200", name: "Ibuprofen", generic: "ibuprofen", category: "pain", strength: "200 mg", form: "tablet", rxRequired: false, priceUsd: 4.0, description: "NSAID for pain and inflammation." },
]

export function searchCatalog(query: string, category?: CatalogDrug["category"]): CatalogDrug[] {
  const q = query.trim().toLowerCase()
  return MEDICATION_CATALOG.filter((d) => {
    const matchesQuery =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.generic?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    const matchesCategory = !category || d.category === category
    return matchesQuery && matchesCategory
  })
}

export function getDrug(id: string): CatalogDrug | undefined {
  return MEDICATION_CATALOG.find((d) => d.id === id)
}
