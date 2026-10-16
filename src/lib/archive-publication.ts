export function selectPublicManifestEntries<
  T extends { id: string; visibility: string },
>(entries: readonly T[]): T[] {
  const ids = new Set<string>();
  for (const { id } of entries) {
    if (ids.has(id)) throw new Error(`Duplicate archive manifest ID: ${id}`);
    ids.add(id);
  }
  return entries.filter(({ visibility }) => visibility === "public");
}

/** Only manifest-listed sets are public; static registration alone never publishes. */
export function selectPublishedContestSets<T extends { id: string }>(
  registry: readonly T[],
  publicEntries: readonly { id: string }[],
): T[] {
  const registered = new Map<string, T>();
  for (const entry of registry) {
    if (registered.has(entry.id))
      throw new Error(`Duplicate archive registry ID: ${entry.id}`);
    registered.set(entry.id, entry);
  }

  const published = new Set<string>();
  return publicEntries.map(({ id }) => {
    if (published.has(id))
      throw new Error(`Duplicate archive manifest ID: ${id}`);
    published.add(id);
    const entry = registered.get(id);
    if (!entry) throw new Error(`Public archive set is not registered: ${id}`);
    return entry;
  });
}
