import inventory from '@/data/quality-inventory.json';
import type { ReadingStatus } from './content-labels';
export type ContentQuality = {
  reading: ReadingStatus;
  answerReview: string;
  mathReview: string;
  rights: string;
  rightsUrl: string;
  reviewPath: string;
  issues: string[];
};
export const qualityCounts = inventory.counts;
const records = inventory.records as Record<string, ContentQuality>;
export function getContentQuality(id: string): ContentQuality {
  const record = records[id];
  if (!record) throw new Error(`Missing content quality record: ${id}`);
  return record;
}

/** Stored original text is displayed only under recorded reproduction terms. */
export function canDisplayStatement(id: string): boolean {
  return getContentQuality(id).rights === 'documented-educational-use';
}
