import { ORGAN_NAMES } from './scoring';
import type { OrganCode, ScoringResult } from './scoring';
import { organs, criteria, guidelines } from './catalog';
export interface Organ {
  id: number;
  code: string;
  name: string;
  histology: string;
  guideline: string;
  color: string;
  initials: string;
  sort: number;
}

export interface Criterion {
  id: number;
  organ_code: string;
  sample_type: string;
  score: string;
  definition: string;
  interpretation: string;
  action: string;
}

export interface Guideline {
  id: number;
  organ_code: string;
  title: string;
  organization: string;
  year: number | null;
  summary: string;
  key_points: string[];
  reference_url: string;
}

export interface Evaluation {
  id: number;
  created_at: string;
  case_code: string;
  organ_code: string;
  organ_name: string;
  sample_type: string;
  intensity: string;
  pattern: string;
  percent: number;
  cluster5: boolean;
  controls_valid: boolean;
  score: string | null;
  result_snapshot: ScoringResult;
  algorithm_version: string;
  modifier: string | null;
  category: string;
  her2_status: string | null;
  interpretation: string;
  action_text: string;
  therapy: string | null;
  notes: string[] | null;
  operator: string | null;
}


const KEY = 'her2-evaluations-v2';
export async function fetchOrgans(): Promise<Organ[]> { return organs; }
export async function fetchCriteria(organ?: string): Promise<Criterion[]> { return organ ? criteria.filter(c => c.organ_code === organ) : criteria; }
export async function fetchGuidelines(): Promise<Guideline[]> { return guidelines; }
// Normalize legacy snapshots without recalculating historical scores or writing on read.
function normalizeEvaluation(e: Evaluation): Evaluation {
  const snapshot = e.result_snapshot;
  const organ = snapshot.organ ?? e.organ_code;
  if (!Object.prototype.hasOwnProperty.call(ORGAN_NAMES, organ) ||
      (snapshot.organ != null && snapshot.organ !== e.organ_code)) {
    throw new Error('Organo dello storico non valido o discordante. Nessun dato sovrascritto.');
  }
  return { ...e, result_snapshot: { ...snapshot, organ: organ as OrganCode } };
}
function readHistory(): Evaluation[] {
  const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!Array.isArray(parsed) || parsed.some(e => !e || !['0.2.0','0.2.1'].includes(e.algorithm_version) || !e.result_snapshot)) throw new Error('Storico non valido o versione non compatibile. Nessun dato sovrascritto.');
  return (parsed as Evaluation[]).map(normalizeEvaluation);
}
export async function fetchEvaluations(params?: {organ?:string;category?:string;q?:string}): Promise<Evaluation[]> {
  return readHistory().filter(e => (!params?.organ || e.organ_code === params.organ) && (!params?.category || e.category === params.category) && (!params?.q || e.case_code.toLowerCase().includes(params.q.toLowerCase())));
}
export async function saveEvaluation(payload: Record<string, unknown>): Promise<Evaluation> {
  const rows = readHistory();
  const row = {...payload, id: Math.max(Date.now(), ...rows.map(e => e.id + 1)), created_at:new Date().toISOString()} as unknown as Evaluation;
  const normalized = normalizeEvaluation(row);
  localStorage.setItem(KEY, JSON.stringify([normalized,...rows]));
  return normalized;
}
export async function deleteEvaluation(id:number):Promise<void> {localStorage.setItem(KEY,JSON.stringify(readHistory().filter(e=>e.id!==id)));}
export function sampleTypeLabel(v:string):string {return v === 'biopsia' ? 'Biopsia' : v === 'turb' ? 'TURB' : v === 'resezione' ? 'Pezzo chirurgico' : v;}
