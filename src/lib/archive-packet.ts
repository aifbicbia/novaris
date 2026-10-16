import type { ArchiveRow } from "./archive";

const columns = ["id", "slug", "title", "subject", "contest", "year", "problemNumber", "topic", "subtopic", "difficulty", "verificationStatus", "problemTextStatus", "officialSourceName", "officialSourceUrl", "preview", "searchText", "keyIdeas", "readingStatus", "reviewLabel", "paperId"] as const;
type Cell = string | number | string[] | null;
export type ArchivePacket = { version: 2; records: Cell[][] };

/** Fixed columns remove repeated keys without changing any row or search term. */
export function packArchiveRows(rows: ArchiveRow[]): ArchivePacket {
  return { version: 2, records: rows.map(row => columns.map(key => row[key] ?? null)) };
}

export function unpackArchiveRows(packet: ArchivePacket): ArchiveRow[] {
  if (packet.version !== 2) throw new Error("Unsupported archive index version");
  return packet.records.map(record => {
    if (record.length !== columns.length) throw new Error("Invalid archive record width");
    const row: Record<string, unknown> = {};
    columns.forEach((key,index) => {
      const value = record[index];
      if (value !== null) row[key] = value;
    });
    return row as ArchiveRow;
  });
}
