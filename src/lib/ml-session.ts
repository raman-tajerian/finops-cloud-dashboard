import { DEFAULT_MODEL_VERSION, type ModelSession, type ModelVersion } from '@/types/ml';
export const initialModelSession = (): ModelSession => ({ active: DEFAULT_MODEL_VERSION, previous: null });
export const promoteModel = (s: ModelSession, version: ModelVersion): ModelSession => version === s.active ? s : { active: version, previous: s.active };
export const rollbackModel = (s: ModelSession): ModelSession => s.previous ? { active: s.previous, previous: s.active } : s;
