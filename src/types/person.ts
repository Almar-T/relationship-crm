/**
 * Core domain model. Dates that only matter at day-granularity (contact
 * scheduling) are stored as local `YYYY-MM-DD` strings so that "due today"
 * never drifts across timezones. `createdDate` is a full ISO timestamp.
 */
export interface Person {
  id: string;
  name: string;
  company?: string;
  role?: string;
  whereMet?: string;
  notes?: string;
  tags: string[];
  /** 1 (acquaintance) … 5 (inner circle). */
  relationshipStrength: RelationshipStrength;
  /** How often (in days) you want to stay in touch. */
  contactFrequencyDays: number;
  /** Full ISO timestamp of when the record was created. */
  createdDate: string;
  /** `YYYY-MM-DD` of the last logged contact, or null if never contacted. */
  lastContactDate: string | null;
  /** `YYYY-MM-DD` of the next time you should reach out. */
  nextContactDate: string;
}

export type RelationshipStrength = 1 | 2 | 3 | 4 | 5;

/** Fields a user edits. The service layer derives the date bookkeeping. */
export interface PersonInput {
  name: string;
  company?: string;
  role?: string;
  whereMet?: string;
  notes?: string;
  tags: string[];
  relationshipStrength: RelationshipStrength;
  contactFrequencyDays: number;
}

export const RELATIONSHIP_STRENGTH_LABELS: Record<RelationshipStrength, string> = {
  1: 'Acquaintance',
  2: 'Loose tie',
  3: 'Solid',
  4: 'Close',
  5: 'Inner circle',
};
