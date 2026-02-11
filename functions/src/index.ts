import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ClaimSpec, InvariantHaltResponse, InvariantPipelinePassResponse } from './models';
import { handleInvariantEnvelope } from './orchestration';

admin.initializeApp();
const db = admin.firestore();

// --- Canonical ACE claim-spec gate -----------------------------------------------------------
function aceClaimSpecGate(input: any): { passed: boolean; missingFields: string[] } {
  const required: (keyof ClaimSpec)[] = ['claim', 'authority', 'intent', 'risk_class'];
  const missing: string[] = [];
  for (const field of required) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') {
      missing.push(field);
    }
  }
  return { passed: missing.length === 0, missingFields: missing };
}

async function logClaimSpecHalt(missingFields: string[]): Promise<void> {
  try {
    await db.collection('invariant_audit').add({
      timestamp: new Date().toISOString(),
      eventType: 'CLAIM_SPEC_HALTED',
      missingFields,
      pipelineStep: 'ACE_GATE'
    });
  } catch (error) {
    console.error('Audit write failed (non-blocking):', error);
  }
}

export const invariantPipeline = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const gate = aceClaimSpecGate(req.body);
  if (!gate.passed) {
    await logClaimSpecHalt(gate.missingFields);
    const halt: InvariantHaltResponse = { status: 'HALTED', reason: 'CLAIM_SPEC_INVALID' };
    res.status(200).json(halt);
    return;
  }

  const pass: InvariantPipelinePassResponse = {
    status: 'PASSED',
    data: { message: 'ACE gate passed. Claim-Spec is structurally valid. Ready for FLUIDINTEL.' }
  };
  res.status(200).json(pass);
});

function executeClaimSpec(claimSpec: ClaimSpec) {
  return {
    status: 'EXECUTED',
    result: `Execution placeholder for claim: "${claimSpec.claim}"`
  };
}

export const fluidintelExecute = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const claimSpec: ClaimSpec = req.body;
  const response = executeClaimSpec(claimSpec);
  res.status(200).json(response);
});

export const invariantEnvelopeHandler = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const result = await handleInvariantEnvelope(req.body);
  res.status(result.statusCode).json(result.payload);
});
