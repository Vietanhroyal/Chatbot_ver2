import { AgentState } from '../state'
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service'

/**
 * Node 10: Knowledge Retrieval (DB Query)
 * Calls the KnowledgeBaseService to fetch relevant context.
 *
 * Note: This node needs the KB service injected. Since LangGraph nodes
 * are plain functions, we use a factory pattern (closure).
 */
export const createKnowledgeRetrievalNode = (
  kbService: KnowledgeBaseService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const query = state.retrieval_plan?.[0] ?? state.user_message
    const skill = state.selected_skill ?? undefined

    const results = await kbService.search(query, skill)

    const combinedContext = results
      .map(r => `[Source: ${r.source}]\n${r.content}`)
      .join('\n\n---\n\n')

    return {
      retrieved_knowledge: combinedContext || 'No relevant information found.',
    }
  }
}
