import type { SSEEvent } from "./sse";
/**
 * Transform raw event data for display
 * Can be extended in future for more complex transformations
 */
export function transformEvent(rawEvent: SSEEvent): SSEEvent {
  return {
    ...rawEvent,
    kind: rawEvent.kind.split("/").pop() || "event",
  };
}
