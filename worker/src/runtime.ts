import { ClaimSpec } from '../../functions/src/models';
import { ClaimSpecSchema } from '../../functions/src/schema';

export async function invariantPipeline(body: unknown) {
  const parsed = ClaimSpecSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join('.') || issue.message);
    return { status: 'HALTED', reason: 'CLAIM_SPEC_INVALID', issues };
  }
  return { status: 'PASSED', data: { message: 'ACE gate passed. Claim-Spec is structurally valid.' } };
}

export async function fluidintelExecute(body: unknown) {
  const claimSpec: ClaimSpec = ClaimSpecSchema.parse(body);
  return { status: 'EXECUTED', result: `Execution placeholder for claim: "${claimSpec.claim}"` };
}
