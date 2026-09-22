import oranVeOranti from "@/lib/knowledge/packs/matematik/7/oran-ve-oranti.json";
import { createKnowledgePackRegistry, type KnowledgePackRegistry } from "@/lib/knowledge/registry/knowledge-pack-registry";

/**
 * Every production Knowledge Pack currently authored, regardless of status.
 * Adding a new pack means adding one entry here — nothing else in the
 * generation flow needs to change.
 */
const PRODUCTION_PACKS: unknown[] = [oranVeOranti];

/**
 * Builds a fresh registry over every production pack. Construction is cheap
 * (a handful of small JSON documents, pure synchronous validation), so a new
 * instance per call keeps this side-effect free rather than relying on
 * module-level mutable state.
 */
export function createProductionKnowledgePackRegistry(): KnowledgePackRegistry {
  return createKnowledgePackRegistry(PRODUCTION_PACKS);
}
