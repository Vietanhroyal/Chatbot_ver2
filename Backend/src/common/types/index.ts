// at this file we will create and export types/interface that are used across the application
//at this interface we delcare a common shape of the response from the server
//that interface have generic type parameter that means it can
//accept any type of data T and return it as a response
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string 
}

export interface ErrorDetail {
  code: number
  message: string
  path: string
}

//the common shape of the error response form the server when catching an error
export interface ApiErrorResponse {
  success: boolean
  error: ErrorDetail
}

//message history type
export interface Message {}

//types for the supported channels connected with my server
export type Channel = 'web' | 'facebook' | 'zalo' | 'api'

//inten result after detect from message
export interface IntentResult {}

//mode for each message to server, backend will decided the reasoning level based on the message
export type ReasoningLevel = 'shallow' | 'medium' | 'deep'

//agent response type
//if final_answer then the agent will return the final answer
//if ask_clarification then the agent will ask the user for more information
export type AgentResponseType = 'final_answer,' | 'ask_clarification'

//clarification type
//if intent then the agent will ask the user for more information about the intent
//if missing_info then the agent will ask the user for more information about the missing information
export type ClarificationType = 'intent' | 'missing_info'

//the shape of final message
export interface FinalMessage {}

//meta data about the retrievel source
export interface RetrievedSource {}
