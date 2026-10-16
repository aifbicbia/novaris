export type ReadingStatus = 'on-site' | 'source-only' | 'incomplete' | 'needs-review';
export const readingLabels: Record<ReadingStatus, string> = {
  'on-site': 'Read here',
  'source-only': 'Statement at source',
  incomplete: 'Incomplete statement',
  'needs-review': 'Statement needs review',
};
