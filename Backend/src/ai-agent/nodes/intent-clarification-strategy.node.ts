import { AgentState } from '../state';

/**
 * Node 7: Intent Clarification Strategy (Template/Rule)
 * Creates a question to clarify vague or unknown intents.
 */
export const intentClarificationStrategyNode = (
  state: AgentState,
): Partial<AgentState> => {
  const clarificationMessage =
    'Mình chưa rõ em đang muốn tìm hiểu về vấn đề gì. ' +
    'Em có thể cho mình biết em quan tâm đến: học phí, ngành học, ' +
    'tuyển sinh, hay học bổng không ạ?';

  return {
    response_type: 'ask_clarification',
    pending_clarification: {
      type: 'intent',
      question_asked: clarificationMessage,
    },
    final_messages: [{ type: 'text', content: clarificationMessage }],
  };
};
