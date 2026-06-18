import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { AgentState, DEFAULT_AGENT_STATE } from './state'
import { buildAgentGraph, GraphDeps } from './graph'
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service'
import { CorePromptsService } from '../core-prompts/core-prompts.service'
import { SkillsService } from '../core-prompts/skills.service'
import { ResponseStrategiesService } from '../response-strategies/response-strategies.service'
import { OutputValidatorService } from '../common/services/output-validator.service'
import { SecurityLoggerService } from '../common/security-logger.service'

@Injectable()
export class AiAgentService implements OnModuleInit {
  private readonly logger = new Logger(AiAgentService.name)
  private compiledGraph: ReturnType<typeof buildAgentGraph> | null = null

  constructor(
    private readonly kbService: KnowledgeBaseService,
    private readonly corePrompts: CorePromptsService,
    private readonly skills: SkillsService,
    private readonly responseStrategies: ResponseStrategiesService,
    private readonly outputValidator: OutputValidatorService,
    private readonly securityLogger: SecurityLoggerService,
  ) {}

  onModuleInit() {
    const deps: GraphDeps = {
      kbService: this.kbService,
      corePrompts: this.corePrompts,
      skills: this.skills,
      responseStrategies: this.responseStrategies,
      outputValidator: this.outputValidator,
      securityLogger: this.securityLogger,
    }
    this.compiledGraph = buildAgentGraph(deps)
    this.logger.log('AI Agent graph compiled successfully')
  }

  async invoke(input: Partial<AgentState>): Promise<AgentState> {
    if (!this.compiledGraph) {
      throw new Error('Agent graph not initialized')
    }

    const initialState: AgentState = {
      ...DEFAULT_AGENT_STATE,
      ...input,
    }

    this.logger.log(`Invoking agent for session: ${initialState.session_id}`)

    const result = await this.compiledGraph.invoke(initialState)
    return result
  }
}
