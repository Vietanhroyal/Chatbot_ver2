import { createResponsePackagingNode } from './response-packaging.node';
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { OutputValidatorService } from '../../common/services/output-validator.service';
import { AgentState } from '../state';

describe('ResponsePackagingNode', () => {
  let mockCorePrompts: any;
  let mockValidator: any;
  let node: Function;

  beforeEach(() => {
    mockCorePrompts = { getConfigByCodeOrFallback: jest.fn() };
    mockValidator = {
      validateMessages: jest.fn((m) => m),
      validate: jest.fn((c) => ({ isValid: true, sanitizedContent: c })),
    };
    node = createResponsePackagingNode(mockCorePrompts, mockValidator);
  });

  const createState = (overrides: Partial<AgentState> = {}): AgentState => ({
    user_message: 'test',
    session_id: 'test',
    conversation_history: [],
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
    response_strategy: 'response text',
    response_type: 'final_answer',
    final_messages: null,
    ...overrides,
  });

  it('should validate and pass through existing final_messages', async () => {
    const existing = [{ type: 'text', content: 'existing' }];
    const state = createState({ final_messages: existing });
    const result = await node(state);
    expect(mockValidator.validateMessages).toHaveBeenCalledWith(existing);
    expect(result.final_messages).toEqual(existing);
  });

  it('should load packaging config from DB', async () => {
    mockCorePrompts.getConfigByCodeOrFallback.mockResolvedValue({
      maxMessageLength: 1000,
    });
    const state = createState({ final_messages: null });
    await node(state);
    expect(mockCorePrompts.getConfigByCodeOrFallback).toHaveBeenCalledWith(
      'response_packaging',
      expect.any(Object),
    );
  });

  it('should wrap response_strategy in single message', async () => {
    mockCorePrompts.getConfigByCodeOrFallback.mockResolvedValue({
      maxMessageLength: 1000,
    });
    const state = createState({ response_strategy: 'Hello' });
    const result = await node(state);
    expect(result.final_messages).toEqual([{ type: 'text', content: 'Hello' }]);
  });

  it('should truncate message exceeding max length', async () => {
    mockCorePrompts.getConfigByCodeOrFallback.mockResolvedValue({
      maxMessageLength: 10,
    });
    const state = createState({ response_strategy: 'This is a very long message' });
    const result = await node(state);
    expect(result.final_messages?.[0].content.length).toBeLessThanOrEqual(13);
    expect(result.final_messages?.[0].content).toContain('...');
  });

  it('should return safety net when no response_strategy', async () => {
    mockCorePrompts.getConfigByCodeOrFallback.mockResolvedValue({
      maxMessageLength: 1000,
    });
    const state = createState({ response_strategy: null, final_messages: null });
    const result = await node(state);
    expect(result.final_messages?.[0].content).toContain('Xin lỗi');
  });

  it('should replace content with sanitized version from validator', async () => {
    mockCorePrompts.getConfigByCodeOrFallback.mockResolvedValue({
      maxMessageLength: 1000,
    });
    mockValidator.validate.mockReturnValue({
      isValid: false,
      sanitizedContent: 'BLOCKED',
    });
    const state = createState({ response_strategy: 'malicious content' });
    const result = await node(state);
    expect(result.final_messages?.[0].content).toBe('BLOCKED');
  });
});
