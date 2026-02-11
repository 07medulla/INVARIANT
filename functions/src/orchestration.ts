import { InvariantEnvelopeSchema, InvariantEnvelope } from './schema';
import { callGemini, callPerplexity, callClaude } from './llm_integrations';
import { ClaimSpec, ExecutionResult, InvariantHaltResponse } from './models';

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

async function runTruthCheck(envelope: InvariantEnvelope) {
  if (!envelope.gates.truth_required) {
    return { classification: 'UNVERIFIED', substrate: 'TRUTH' };
  }
  const verdict = await callPerplexity(envelope.query.prompt);
  const normalized = verdict.output.trim().toUpperCase();
  if (normalized.includes('FALSE')) {
    return { classification: 'FALSE', substrate: 'TRUTH', raw: verdict.output };
  }
  if (normalized.includes('TRUE')) {
    return { classification: 'TRUE', substrate: 'TRUTH', raw: verdict.output };
  }
  return { classification: 'UNVERIFIABLE', substrate: 'TRUTH', raw: verdict.output };
}

async function runVarPhase(prompt: string) {
  const response = await callGemini(`Generate possibility space for: ${prompt}`);
  return response.output;
}

async function runExecution(claimSpec: ClaimSpec): Promise<ExecutionResult> {
  const execution = await callClaude(`Execute claim: ${claimSpec.claim}`);
  return {
    status: 'EXECUTED',
    result: execution.output,
    action_key: claimSpec.claim,
    artifacts: [execution.output]
  };
}

export async function handleInvariantEnvelope(raw: unknown): Promise<OrchestrationResponse> {
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

  const truth = await runTruthCheck(envelope);
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
  const varOutput = await runVarPhase(envelope.query.prompt);
  const execution = envelope.gates.execution_authorized
    ? await runExecution(claimSpec)
    : { status: 'REFUSED', result: 'Execution not authorized', action_key: claimSpec.claim } satisfies ExecutionResult;

  return {
    statusCode: 200,
    payload: {
      status: 'ACKNOWLEDGED',
      geometry_version: envelope.meta.geometry_version,
      truth,
      reflections: varOutput,
      execution,
      silence_valid: envelope.state_update.silence_valid
    }
  };
}
