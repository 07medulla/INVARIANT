export type ProtocolId =
  | "zero"
  | "p01"
  | "p02"
  | "p03"
  | "p04"
  | "p05"
  | "p06"
  | "p07"
  | "p08"
  | "p09"
  | "p10"
  | "p11";

export interface ProtocolDefinition {
  id: ProtocolId;
  title: string;
  summary: string;
  sourcePath: string;
}

export const NULL_PRIME_PROTOCOLS: ProtocolDefinition[] = [
  {
    id: "zero",
    title: "Protocol Zero",
    summary: "Absolute curvature authority; silence and governance precedence over execution.",
    sourcePath: "docs/null_prime/protocols/Protocol-00-Zero.md",
  },
  {
    id: "p01",
    title: "Protocol 01 – Identity",
    summary: "Anchor persona, founder masks, and the Null Prime field alignment.",
    sourcePath: "docs/null_prime/protocols/Protocol-01-Identity.md",
  },
  {
    id: "p02",
    title: "Protocol 02 – Reasoning",
    summary: "Reasoning lanes, acceptable inference surfaces, and tetrahedral drift locks.",
    sourcePath: "docs/null_prime/protocols/Protocol-02-Reasoning.md",
  },
  {
    id: "p03",
    title: "Protocol 03 – Behavioral",
    summary: "Behavioral throttle, speech constraints, and human-first affect alignment.",
    sourcePath: "docs/null_prime/protocols/Protocol-03-Behavioral.md",
  },
  {
    id: "p04",
    title: "Protocol 04 – Verification",
    summary: "Multi-layer verification stack covering audits, second reads, and stress probes.",
    sourcePath: "docs/null_prime/protocols/Protocol-04-Verification.md",
  },
  {
    id: "p05",
    title: "Protocol 05 – Logging",
    summary: "Logging and audit doctrine, including silence logs and drift capture.",
    sourcePath: "docs/null_prime/protocols/Protocol-05-Logging.md",
  },
  {
    id: "p06",
    title: "Protocol 06 – G-CoN Doctrine",
    summary: "Constraint network governance with pulse, lattice, and thermal boundaries.",
    sourcePath: "docs/null_prime/protocols/Protocol-06-G-CoN.md",
  },
  {
    id: "p07",
    title: "Protocol 07 – Purpose Filter",
    summary: "Purpose filtration, intent validation, and mission lock enforcement.",
    sourcePath: "docs/null_prime/protocols/Protocol-07-Purpose-Filter.md",
  },
  {
    id: "p08",
    title: "Protocol 08 – Radial Evolution",
    summary: "Radial growth lanes, phase rotation, and maturation deltas across engines.",
    sourcePath: "docs/null_prime/protocols/Protocol-08-Radial-Evolution.md",
  },
  {
    id: "p09",
    title: "Protocol 09 – Emotional Geometry",
    summary: "Emotional geometry doctrine and affective constraints under Null Prime.",
    sourcePath: "docs/null_prime/protocols/Protocol-09-Emotional-Geometry.md",
  },
  {
    id: "p10",
    title: "Protocol 10 – Cognitive Integrity",
    summary: "Cognitive integrity checkpoints, loopbacks, and recursion filters.",
    sourcePath: "docs/null_prime/protocols/Protocol-10-Cognitive-Integrity.md",
  },
  {
    id: "p11",
    title: "Protocol 11 – Asymmetric Recall Constraint (ARC)",
    summary: "Asymmetric recall doctrine, venting, and sanctuary gating.",
    sourcePath: "docs/null_prime/protocols/Protocol-11-ARC.md",
  },
];

export function getProtocol(id: ProtocolId): ProtocolDefinition {
  const protocol = NULL_PRIME_PROTOCOLS.find((p) => p.id === id);
  if (!protocol) {
    throw new Error(`Protocol ${id} not defined in Null Prime registry.`);
  }
  return protocol;
}
