import {
  type Event,
  type ConvertedEvent,
  type SnowplowObject,
  ConvertedPayload,
} from "../types";
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

/**
 * Decode a base64 encoded string with UTF-8 support
 * Supports both standard base64 and base64url (RFC 4648) formats
 */
export function decodeBase64(encoded: string): string {
  try {
    // Convert from base64url to standard base64 if needed
    // base64url uses - and _ instead of + and /
    const standardBase64 = encoded.replace(/-/g, "+").replace(/_/g, "/");

    // Decode the base64 string
    const binaryString = atob(standardBase64);

    // Convert binary string to UTF-8 properly
    // atob gives us bytes as a Latin-1 string, we need to convert those to a Uint8Array
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    return new TextDecoder("utf-8").decode(uint8Array);
  } catch (error) {
    // If decoding fails, return the original string
    return encoded;
  }
}

// Convert Event to ConvertedEvent for better display in EventCard
// Parses JSON strings in payload and context fields
export function convertEventForCard(event: Event): ConvertedEvent {
  const data = { ...event.data };

  let convertedPayload: SnowplowObject | undefined = undefined;
  let convertedContext: SnowplowObject | SnowplowObject[] | undefined =
    undefined;

  // Handle payload - can be string (base64 or JSON) or object
  if (data.payload) {
    if (typeof data.payload === "string") {
      try {
        const decoded = decodeBase64(data.payload);

        convertedPayload = JSON.parse(decoded) as SnowplowObject;
      } catch {
        convertedPayload = undefined;
      }
    } else if (typeof data.payload === "object") {
      convertedPayload = data.payload as SnowplowObject;
    }
  }

  // Handle context - can be string (base64 or JSON) or object
  if (data.context) {
    if (typeof data.context === "string") {
      try {
        const decoded = decodeBase64(data.context);
        convertedContext = JSON.parse(decoded) as
          | SnowplowObject
          | SnowplowObject[];
      } catch {
        convertedContext = undefined;
      }
    } else if (typeof data.context === "object") {
      convertedContext = data.context as SnowplowObject | SnowplowObject[];
    }
  }

  return {
    ...event,
    data: {
      ...data,
      payload: convertedPayload,
      context: convertedContext,
    },
  };
}

export const extractEventType = (schema: string): string => {
  const match = schema.match(/\/([^\/]+)\/jsonschema\//);
  return match?.[1] ?? "";
};

export const getTitleFromEvent = (event: ConvertedEvent): string => {
  console.log(event);

  const { kind, payload } = event.data;

  if (!kind) return "Unknown Event";

  if (kind === "Structured Event") {
    const action =
      "action" in event.data ? (event.data.action as string) : undefined;

    return action ?? "Unknown Action";
  }

  if (kind === "Self-Describing Event") {
    if (!payload) return "Unknown Self-Describing Event";

    return typeof payload.data === "object" &&
      !Array.isArray(payload.data) &&
      "schema" in payload.data
      ? extractEventType((payload.data as { schema: string }).schema)
      : "";
  }

  return "Page View";
};
