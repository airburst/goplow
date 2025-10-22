import { describe, it, expect } from "vitest";
import {
  decodeBase64,
  convertEventForCard,
  extractEventType,
  transformEvent,
} from "./transforms";
import type { Event } from "../types";
import type { SSEEvent } from "./sse";

describe("decodeBase64", () => {
  it("should decode base64 strings correctly", () => {
    const encoded = Buffer.from("hello world").toString("base64");
    expect(decodeBase64(encoded)).toBe("hello world");
  });

  it("should decode base64 with UTF-8 characters", () => {
    const text = '{"message": "Hello with special chars: café"}';
    const encoded = Buffer.from(text, "utf-8").toString("base64");
    const decoded = decodeBase64(encoded);
    expect(decoded).toBe(text);
  });

  it("should return original string if decoding fails", () => {
    const invalid = "not-valid-base64!!!";
    expect(decodeBase64(invalid)).toBe(invalid);
  });

  it("should decode the example payload with UTF-8", () => {
    const encoded =
      "eyJzY2hlbWEiOiJpZ2x1OmNvbS5zbm93cGxvd2FuYWx5dGljcy5zbm93cGxvdy91bnN0cnVjdF9ldmVudC9qc29uc2NoZW1hLzEtMC0wIiwiZGF0YSI6eyJzY2hlbWEiOiJpZ2x1OmNvbS5zaW1wbHlidXNpbmVzcy9oZWxwX3RleHRfb3BlbmVkL2pzb25zY2hlbWEvMS0wLTAiLCJkYXRhIjp7InNpdGUiOiJzaW1wbHlidXNpbmVzc191cyIsInZlcnRpY2FsIjoiVXNhIiwicHJpbWFyeV90ZXh0IjoiRG8geW91IHByb3ZpZGUgYSBzZWNvbmRhcnkgc2VydmljZSBmb3IgY3VzdG9tZXJzIHRoYXQgaXMgYSBzaWduaWZpY2FudCBwYXJ0IG9mIHlvdXIgYnVzaW5lc3M_IiwiaGVscF90ZXh0IjoiSWYgeW91ciBidXNpbmVzcyBmaXRzIGluIG1vcmUgdGhhbiBvbmUgYm94LCB0ZWxsIHVzIGFib3V0IGl0IGhlcmUuIn19fQ";
    const decoded = decodeBase64(encoded);

    // The decoded string should be valid JSON, not the base64 string
    expect(decoded).not.toBe(encoded);
    expect(decoded).toContain("iglu:com.snowplowanalytics.snowplow");

    const parsed = JSON.parse(decoded);
    expect(parsed.data.data.primary_text).toContain("significant");
  });
});

describe("extractEventType", () => {
  it("should extract event type from unstruct_event schema", () => {
    const schema =
      "iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0";
    expect(extractEventType(schema)).toBe("unstruct_event");
  });

  it("should extract event type from custom schema", () => {
    const schema =
      "iglu:com.simplybusiness/form_question_answered/jsonschema/1-0-4";
    expect(extractEventType(schema)).toBe("form_question_answered");
  });

  it("should return empty string for invalid schema format", () => {
    const schema = "invalid/schema/format";
    expect(extractEventType(schema)).toBe("");
  });

  it("should extract event type with underscores", () => {
    const schema = "iglu:com.example/my_custom_event_type/jsonschema/1-0-0";
    expect(extractEventType(schema)).toBe("my_custom_event_type");
  });
});

describe("transformEvent", () => {
  it("should extract event kind from path", () => {
    const input: SSEEvent = {
      id: "1",
      kind: "schema/event/type",
      event: '{"data": "test"}',
      timestamp: Date.now(),
    };
    const result = transformEvent(input);
    expect(result.kind).toBe("type");
  });

  it("should handle single-part kind", () => {
    const input: SSEEvent = {
      id: "1",
      kind: "event",
      event: '{"data": "test"}',
      timestamp: Date.now(),
    };
    const result = transformEvent(input);
    expect(result.kind).toBe("event");
  });

  it("should preserve other fields", () => {
    const input: SSEEvent = {
      id: "1",
      kind: "schema/event",
      event: '{"data": "test"}',
      timestamp: Date.now(),
    };
    const result = transformEvent(input);
    expect(result.event).toBe(input.event);
  });
});

describe("convertEventForCard", () => {
  const baseEvent: Event = {
    id: 1,
    schema: "test.schema",
    timestamp: "2025-10-22T14:56:03Z",
    receivedAt: "2025-10-22T14:56:03Z",
    data: {
      app_id: "test-app",
      kind: "Test Event",
      device_id: "device-123",
    },
  };

  it("should pass through object payload", () => {
    const payloadData = { schema: "test.schema", data: { foo: "bar" } };
    const encoded = Buffer.from(JSON.stringify(payloadData), "utf-8").toString(
      "base64"
    );
    const event: Event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        payload: encoded,
      },
    };
    const result = convertEventForCard(event);
    expect(result.data.payload).toEqual(payloadData);
  });

  it("should decode base64 payload string", () => {
    const payloadData = { schema: "test.schema", data: { test: "value" } };
    const encoded = Buffer.from(JSON.stringify(payloadData), "utf-8").toString(
      "base64"
    );
    const event: Event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        payload: encoded,
      },
    };
    const result = convertEventForCard(event);
    expect(result.data.payload).toEqual(payloadData);
  });

  it("should handle undefined payload", () => {
    const result = convertEventForCard(baseEvent);
    expect(result.data.payload).toBeUndefined();
  });

  it("should pass through object context", () => {
    const contextData = {
      schema: "context.schema",
      data: [{ schema: "item.schema", data: { id: "123" } }],
    };
    const encoded = Buffer.from(JSON.stringify(contextData), "utf-8").toString(
      "base64"
    );
    const event: Event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        context: encoded,
      },
    };
    const result = convertEventForCard(event);
    expect(result.data.context).toEqual(contextData);
  });

  it("should decode base64 context string", () => {
    const contextData = {
      schema: "context.schema",
      data: [{ schema: "item.schema", data: { id: "123" } }],
    };
    const encoded = Buffer.from(JSON.stringify(contextData), "utf-8").toString(
      "base64"
    );
    const event: Event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        context: encoded,
      },
    };
    const result = convertEventForCard(event);
    expect(result.data.context).toEqual(contextData);
  });

  it("should handle invalid JSON in payload gracefully", () => {
    const event: Event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        payload: "invalid json",
      },
    };
    const result = convertEventForCard(event);
    expect(result.data.payload).toBeUndefined();
  });

  it("should preserve other data fields", () => {
    const event: Event = {
      ...baseEvent,
      data: {
        ...baseEvent.data,
        url: "https://example.com",
      },
    };
    const result = convertEventForCard(event);
    expect(result.data.url).toBe("https://example.com");
    expect(result.data.app_id).toBe("test-app");
  });
});
