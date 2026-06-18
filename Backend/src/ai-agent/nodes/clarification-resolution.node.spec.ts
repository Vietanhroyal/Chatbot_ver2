import { createClarificationResolutionNode } from './clarification-resolution.node';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { AgentState } from '../state';
import { ChatOpenAI } from '@langchain/openai';

jest.mock('@langchain/openai');

describe('ClarificationResolutionNode', () => {
  let mockCorePrompts: any;
  let mockLlm: any;
  let node: Function;

  beforeEach(() => {
    mockCorePrompts = { getByCodeOrFallback: jest.fn() };
    mockLlm = { invoke: jest.fn() };
    (ChatOpenAI as jest.Mock).mockImplementation(() => mockLlm);
    node = createClarificationResolutionNode(mockCorePrompts);
  });

  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'Có, ngành IT',
    session_id: 'test',
    conversation_history: [],
    is_safe: true,
    pending_clarification: {
      type: 'missing_info',
      question_asked: 'Em muốn hỏi về ngành nào?',
      missing_entities: ['major'],
    },
    clarification_resolved: false,
    intent: null,
    selected_skill: null,
    retrieval_plan: null,
    retrieved_knowledge: null,
    reasoning_level: null,
    need_more_info: false,
    missing_info_fields: null,
    response_strategy: null,
    response_type: 'final_answer',
    final_messages: null,
    ...overrides,
  });

  it('should return resolved=false when no pending clarification', async () => {
    const state = createState({ pending_clarification: null });
    const result = await node(state);
    expect(result.clarification_resolved).toBe(false);
    expect(mockCorePrompts.getByCodeOrFallback).not.toHaveBeenCalled();
  });

  it('should return resolved=true when LLM says so', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ resolved: true }),
    });

    const result = await node(createState());

    expect(result.clarification_resolved).toBe(true);
  });

  it('should return resolved=false when LLM says so', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ resolved: false }),
    });

    const result = await node(createState());

    expect(result.clarification_resolved).toBe(false);
  });

  it('should return resolved=false on LLM error', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockRejectedValue(new Error('LLM down'));

    const result = await node(createState());

    expect(result.clarification_resolved).toBe(false);
  });

  it('should load prompt with correct code', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ resolved: true }),
    });

    await node(createState());

    expect(mockCorePrompts.getByCodeOrFallback).toHaveBeenCalledWith(
      'clarification_resolution',
      expect.any(String),
    );
  });

  it('should include pending question in system prompt', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue(
      'pending_q:{pending_question}',
    );
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ resolved: true }),
    });

    await node(createState());

    const systemMsg = mockLlm.invoke.mock.calls[0][0][0].content;
    expect(systemMsg).toContain('Em muốn hỏi về ngành nào?');
  });

  it('should send messages array to LLM', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ resolved: true }),
    });

    await node(createState());

    const calledArgs = mockLlm.invoke.mock.calls[0][0];
    expect(Array.isArray(calledArgs)).toBe(true);
    expect(calledArgs[0].role).toBe('system');
    expect(calledArgs[1].role).toBe('user');
  });
});
