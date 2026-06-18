/** A single FAQ entry from faq.json */
export interface FaqEntry {
  id: string
  question: string
  answer: string
  category: string
}

/** Result from a knowledge base search */
export interface KnowledgeSearchResult {
  content: string
  source: string
  relevanceScore?: number
}
