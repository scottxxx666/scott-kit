import type { Clip } from "../core/clip";
import type { Settings } from "../core/settings";

/** A destination for clips. Throw to signal failure; the clip gets queued. */
export interface Sink {
  id: string;
  label: string;
  send(clip: Clip, settings: Settings): Promise<void>;
  /** Cheap connectivity check for the options page. Returns a short detail string. */
  test(settings: Settings): Promise<string>;
}
