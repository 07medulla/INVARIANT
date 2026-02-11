import { z } from 'zod';

export const EnvelopeMetaSchema = z.object({
  message_id: z.string().regex(/^[0-9A-Fa-f-]{36}$/u, 'message_id must be UUID (v7 preferred)'),
  timestamp: z.string().datetime(),
  session_id: z.string().min(1),
  origin: z.string().min(1),
  target: z.string().min(1),
  mode: z.enum(['TEXT', 'AUDIO', 'SILENCE']),
  authority: z.enum(['SOURCE_PATTERN', 'VAR', 'TRUTH', 'ACE', 'FLUIDINTEL', 'META_CORE']),
  geometry_version: z.string().min(1)
});

export const DecisionWindowSchema = z.object({
  exists: z.boolean(),
  deadline: z.string().datetime().optional(),
  risk_class: z.enum(['LOW', 'MEDIUM', 'HIGH', 'SURVIVAL'])
});

export const ConstraintsSchema = z.object({
  budget: z.number().nonnegative().nullable(),
  time_horizon_days: z.number().int().nonnegative().nullable(),
  domain: z.string().min(1),
  non_negotiables: z.array(z.string()).default([])
});

export const ContextSchema = z.object({
  trigger_reason: z.string().min(1),
  decision_window: DecisionWindowSchema,
  constraints: ConstraintsSchema
});

export const QuerySchema = z.object({
  query_id: z.string().min(1),
  issued_by: z.string().min(1),
  query_type: z.enum(['ASK', 'OBSERVE', 'EXECUTE', 'SILENCE_REQUEST']),
  prompt: z.string().min(1),
  assumptions: z.array(z.string()).default([])
});

export const ResponseSchema = z.object({
  responding_substrate: z.string().min(1),
  response_type: z.enum(['TEXT', 'JSON', 'SILENCE', 'REFUSAL']),
  content: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  limitations: z.array(z.string()).default([])
});

export const GatesSchema = z.object({
  claim_detected: z.boolean(),
  truth_required: z.boolean(),
  cic_pass: z.boolean(),
  execution_authorized: z.boolean(),
  truth_verified: z.boolean().optional()
});

export const StateUpdateSchema = z.object({
  system_state: z.enum(['IDLE', 'HOLD', 'BLOCKED', 'READY', 'EXECUTING']),
  next_valid_actions: z.array(z.string()).default([]),
  silence_valid: z.boolean()
});

export const AuditSchema = z.object({
  logged: z.boolean().default(false),
  log_level: z.enum(['INFO', 'WARN', 'ERROR']).default('INFO'),
  notes: z.string().optional()
});

export const ClaimSpecSchema = z.object({
  claim: z.string().min(1),
  authority: z.string().min(1),
  intent: z.string().min(1),
  risk_class: z.string().min(1)
});

export const ExecutionResultSchema = z.object({
  status: z.enum(['EXECUTED', 'REFUSED']),
  result: z.string().min(1),
  action_key: z.string().min(1),
  artifacts: z.array(z.string()).optional(),
  reason: z.string().optional()
});

export const InvariantEnvelopeSchema = z.object({
  schema_checksum: z.string().length(64, 'checksum must be sha256'),
  meta: EnvelopeMetaSchema,
  context: ContextSchema,
  query: QuerySchema,
  response: ResponseSchema.optional(),
  gates: GatesSchema,
  state_update: StateUpdateSchema,
  audit: AuditSchema.optional(),
  claimSpec: ClaimSpecSchema,
  execution_result: ExecutionResultSchema.optional()
});

export type InvariantEnvelope = z.infer<typeof InvariantEnvelopeSchema>;
