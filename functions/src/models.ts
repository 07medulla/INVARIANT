import * as admin from 'firebase-admin';

export interface ClaimSpec {
  claim: string;
  authority: string;
  intent: string;
  risk_class: string;
}

export interface InvariantHaltResponse {
  status: 'HALTED';
  reason: string;
  issues?: string[];
}

export interface InvariantPipelinePassResponse {
  status: 'PASSED';
  data: {
    message: string;
  };
}

export interface FluidintelExecutionResponse {
  status: 'EXECUTED';
  result: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: 'admin' | 'recruiter' | 'hiring_manager' | 'candidate';
  createdAt: admin.firestore.Timestamp;
  lastLogin: admin.firestore.Timestamp;
  associatedNotionAccountId?: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: admin.firestore.Timestamp;
  llmSteps?: { llm: string; output: string }[];
}

export interface ChatSession {
  userId: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface InvariantAuditRecord {
  timestamp: string;
  eventType: 'CLAIM_SPEC_HALTED';
  missingFields: string[];
  pipelineStep: 'ACE_GATE';
}

export interface LLMResponse {
  model: string;
  output: string;
  tokenCount?: number;
}

export type ExecutionStatus = 'EXECUTED' | 'REFUSED';

export interface ExecutionResult {
  status: ExecutionStatus;
  result: string;
  action_key: string;
  artifacts?: string[];
  reason?: string;
}
