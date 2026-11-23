/**
 * A Clip is the one shape every feature produces and every sink consumes.
 * Features decide `kind` and `data`; sinks decide how to store it.
 */
export interface Clip<K extends string = string, D = unknown> {
  id: string;
  kind: K;
  /** Page the clip was taken from. */
  url: string;
  /** Human title of the source (video title, page title…). */
  title: string;
  createdAt: string;
  data: D;
}

export function newClip<K extends string, D>(
  kind: K,
  fields: { url: string; title: string; data: D },
): Clip<K, D> {
  return {
    id: crypto.randomUUID(),
    kind,
    createdAt: new Date().toISOString(),
    ...fields,
  };
}
