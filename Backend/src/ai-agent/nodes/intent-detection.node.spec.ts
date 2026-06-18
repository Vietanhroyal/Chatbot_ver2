import { createIntentDetectionNode } from './intent-detection.node';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { AgentState } from '../state';
import { INTENTS } from '../../common/constants';
import { ChatOpenAI } from '@langchain/openai';

jest.mock('@langchain/openai');

describe('IntentDetectionNode', () => {
  let mockCorePrompts: any;
  let mockLlm: any;
  let node: Function;

  beforeEach(() => {
    mockCorePrompts = { getByCodeOrFallback: jest.fn() };
    mockLlm = { invoke: jest.fn() };
    (ChatOpenAI as jest.Mock).mockImplementation(() => mockLlm);
    node = createIntentDetectionNode(mockCorePrompts);
  });

  const createState = (msg: string, history: any[] = []): AgentState => ({
    user_message: msg,
    conversation_history: history,
    session_id: 'test',
    is_safe: true,
    pending_clarification: null,
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
  });

  it('should load prompt from CorePromptsService', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('test prompt template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ name: 'tuition_inquiry', confidence: 0.9 }),
    });

    await node(createState('Học phí bao nhiêu?'));

    expect(mockCorePrompts.getByCodeOrFallback).toHaveBeenCalledWith(
      'intent_detection',
      expect.any(String),
    );
  });

  it('should send messages array to LLM (system + user)', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ name: 'tuition_inquiry', confidence: 0.9 }),
    });

    await node(createState('Học phí'));

    const calledArgs = mockLlm.invoke.mock.calls[0][0];
    expect(Array.isArray(calledArgs)).toBe(true);
    expect(calledArgs).toHaveLength(2);
    expect(calledArgs[0].role).toBe('system');
    expect(calledArgs[1].role).toBe('user');
  });

  it('should return intent from LLM response', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ name: 'tuition_inquiry', confidence: 0.9 }),
    });

    const result = await node(createState('Học phí'));

    expect(result.intent).toEqual({ name: 'tuition_inquiry', confidence: 0.9 });
  });

  it('should return UNKNOWN on LLM error', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockRejectedValue(new Error('LLM failed'));

    const result = await node(createState('test'));

    expect(result.intent).toEqual({ name: INTENTS.UNKNOWN, confidence: 0 });
  });

  it('should return UNKNOWN on JSON parse error', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({ content: 'not json' });

    const result = await node(createState('test'));

    expect(result.intent).toEqual({ name: INTENTS.UNKNOWN, confidence: 0 });
  });

  it('should handle missing confidence field with default 0', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ name: 'tuition_inquiry' }),
    });

    const result = await node(createState('test'));

    expect(result.intent?.confidence).toBe(0);
  });

  it('should include conversation history in system prompt', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('history:{conversation_history}');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ name: 'unknown', confidence: 0 }),
    });

    const state = createState('test', [
      { role: 'user', content: 'prev question' },
      { role: 'assistant', content: 'prev answer' },
    ]);

    await node(state);

    const systemMsg = mockLlm.invoke.mock.calls[0][0][0].content;
    expect(systemMsg).toContain('prev question');
    expect(systemMsg).toContain('prev answer');
  });

  it('should wrap user message in delimiters', async () => {
    mockCorePrompts.getByCodeOrFallback.mockResolvedValue('template');
    mockLlm.invoke.mockResolvedValue({
      content: JSON.stringify({ name: 'unknown', confidence: 0 }),
    });

    await node(createState('test user input'));

    const userMsg = mockLlm.invoke.mock.calls[0][0][1].content;
    expect(userMsg).toContain('<<<test user input>>>');
  });
});
