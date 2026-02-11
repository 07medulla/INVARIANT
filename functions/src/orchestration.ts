import { InvariantEnvelopeSchema, InvariantEnvelope } from './schema';
import { ClaimSpec, ExecutionResult, InvariantHaltResponse } from './models';

// LLM calls are injected from the Worker env to keep this module platform-agnostic
export interface LlmClients {
  varClient(prompt: string): Promise<string>;
  truthClient(prompt: string): Promise<string>;
  executionClient(prompt: string): Promise<string>;
}

export interface OrchestrationEnv {
  geometryVersion: string;
  llms: LlmClients;
}

interface OrchestrationResponse {
  statusCode: number;
  payload: unknown;
}

function summarizeIssues(issues: string[]): OrchestrationResponse {
  const payload: InvariantHaltResponse = {
    status: 'HALTED',
    reason: 'CLAIM_SPEC_INVALID',
    issues
  };
  return { statusCode: 422, payload };
}

function checksumLooksValid(checksum: string): boolean {
  return /^[a-f0-9]{64}$/i.test(checksum);
}

function toClaimSpec(envelope: InvariantEnvelope): ClaimSpec {
  const { claim, authority, intent, risk_class } = envelope.claimSpec;
  return { claim, authority, intent, risk_class };
}

async function runTruthCheck(envelope: InvariantEnvelope, env: OrchestrationEnv) {
  if (!envelope.gates.truth_required) {
    return { classification: 'UNVERIFIED', substrate: 'TRUTH' };
  }
  const verdict = await env.llms.truthClient(envelope.query.prompt);
  const normalized = verdict.trim().toUpperCase();
  if (normalized.includes('FALSE')) {
    return { classification: 'FALSE', substrate: 'TRUTH', raw: verdict };
  }
  if (normalized.includes('TRUE')) {
    return { classification: 'TRUE', substrate: 'TRUTH', raw: verdict };
  }
  return { classification: 'UNVERIFIABLE', substrate: 'TRUTH', raw: verdict };
}

async function runVarPhase(prompt: string, env: OrchestrationEnv) {
  return env.llms.varClient(`Generate possibility space for: ${prompt}`);
}

async function runExecution(claimSpec: ClaimSpec, env: OrchestrationEnv): Promise<ExecutionResult> {
  const output = await env.llms.executionClient(`Execute claim: ${claimSpec.claim}`);
  return {
    status: 'EXECUTED',
    result: output,
    action_key: claimSpec.claim,
    artifacts: [output]
  };
}

export async function handleInvariantEnvelope(raw: unknown, env: OrchestrationEnv): Promise<OrchestrationResponse> {
  const parsed = InvariantEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message);
    return summarizeIssues(issues);
  }

  const envelope = parsed.data;

  if (!checksumLooksValid(envelope.schema_checksum)) {
    return summarizeIssues(['schema_checksum invalid']);
  }

  if (!envelope.gates.claim_detected) {
    return summarizeIssues(['claim_detected gate is false']);
  }

  const truth = await runTruthCheck(envelope, env);
  if (envelope.gates.truth_required && truth.classification !== 'TRUE') {
    return {
      statusCode: 200,
      payload: {
        status: 'HALTED',
        reason: 'TRUTH_GATE_FAILED',
        truth
      }
    };
  }

  const claimSpec = toClaimSpec(envelope);
  const varOutput = await runVarPhase(envelope.query.prompt, env);
  const execution = envelope.gates.execution_authorized
    ? await runExecution(claimSpec, env)
    : { status: 'REFUSED', result: 'Execution not authorized', action_key: claimSpec.claim } satisfies ExecutionResult;

  return {
    statusCode: 200,
    payload: {
      status: 'ACKNOWLEDGED',
      geometry_version: env.geometryVersion,
      truth,
      reflections: varOutput,
      execution,
      silence_valid: envelope.state_update.silence_valid
    }
  };
}
