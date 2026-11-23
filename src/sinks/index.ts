import { logseqSink } from "./logseq";
import type { Sink } from "./types";

/** All available sinks. Add new destinations here. */
export const SINKS: Record<string, Sink> = {
  [logseqSink.id]: logseqSink,
};
