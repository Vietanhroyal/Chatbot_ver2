import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentState, DEFAULT_AGENT_STATE } from './state';
import { buildAgentGraph, GraphDeps } from './graph';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { CorePromptsService } from '../core-prompts/core-prompts.service';
import { SkillsService } from '../skills/skills.service';

@Injectable()
export class AiAgentService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentService.name);
  private compiledGraph: ReturnType<typeof buildAgentGraph> | null = null;

  constructor(
    private readonly kbService: KnowledgeBaseService,
    private readonly corePrompts: CorePromptsService,
    private readonly skills: SkillsService,
  ) {}

  onModuleInit() {
    const deps: GraphDeps = {
      kbService: this.kbService,
      corePrompts: this.corePrompts,
      skills: this.skills,
    };
    this.compiledGraph = buildAgentGraph(deps);
    this.logger.log('AI Agent graph compiled successfully');
  }

  async invoke(input: Partial<AgentState>): Promise<AgentState> {
    if (!this.compiledGraph) {
      throw new Error('Agent graph not initialized');
    }

    const initialState: AgentState = {
      ...DEFAULT_AGENT_STATE,
      ...input,
    };

    this.logger.log(`Invoking agent for session: ${initialState.session_id}`);

    const result = await this.compiledGraph.invoke(initialState);
    return result as AgentState;
  }
}