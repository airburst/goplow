import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateEvent, validateEventSingle } from "./validate-schema";
import unstructuredExample from "./fixtures/unstructured-example.json";
import unstructuredNestedExample from "./fixtures/unstructured-nested-example.json";
import structuredExample from "./fixtures/structured-example.json";

// Mock the fetch function for schema loading
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock schema for help_text_opened
const mockHelpTextOpenedSchema = {
  self: {
    vendor: "com.simplybusiness",
    name: "help_text_opened",
    format: "jsonschema",
    version: "1-0-0",
  },
  type: "object",
  properties: {
    site: {
      type: ["string"],
      description: "site",
    },
    vertical: {
      type: ["string", "null"],
      description: "vertical",
    },
    primary_text: {
      type: ["string"],
      description: "Primary text of the question which had help text opened",
    },
    help_text: {
      type: ["string"],
      description: "Help text shown to the user",
    },
    business_unit: {
      type: ["string", "null"],
      description: "business_unit",
    },
  },
  required: ["site", "primary_text", "help_text"],
  additionalProperties: false,
  title: "Help Text Opened",
  description: "",
};

// Mock schema for form_question_answered
const mockFormQuestionAnsweredSchema = {
  self: {
    vendor: "com.simplybusiness",
    name: "form_question_answered",
    format: "jsonschema",
    version: "1-0-4",
  },
  type: "object",
  properties: {
    site: {
      type: ["string"],
      description: "site",
    },
    vertical: {
      type: ["string", "null"],
      description: "vertical",
    },
    journey_id: {
      type: ["string"],
      description: "journey_id",
    },
    page_index: {
      type: ["number"],
      description: "page_index",
    },
    page_name: {
      type: ["string"],
      description: "page_name",
    },
    section_name: {
      type: ["string"],
      description: "section_name",
    },
    question: {
      type: ["string"],
      description: "question",
    },
    answer: {
      type: ["string"],
      description: "answer",
    },
  },
  required: [
    "site",
    "journey_id",
    "page_index",
    "page_name",
    "section_name",
    "question",
    "answer",
  ],
  additionalProperties: false,
  title: "Form Question Answered",
  description: "",
};

// Mock schema for service_channel_context
const mockServiceChannelContextSchema = {
  self: {
    vendor: "com.simplybusiness",
    name: "service_channel_context",
    format: "jsonschema",
    version: "1-0-1",
  },
  type: "object",
  properties: {
    service_channel_identifier: {
      type: ["string"],
      description: "service_channel_identifier",
    },
  },
  required: ["service_channel_identifier"],
  additionalProperties: false,
  title: "Service Channel Context",
  description: "",
};

describe("validateEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate a complete self-describing event successfully", async () => {
    // Mock successful schema fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpTextOpenedSchema,
    });

    const testEvent = {
      id: 2,
      schema:
        "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
      data: {
        app_id: "us-chopin",
        device_id: "930ae551-2fc8-4e67-b1fe-3e8c8e3d9ecc",
        kind: "Self-Describing Event",
        payload: {
          schema:
            "iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0",
          data: {
            schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
            data: {
              site: "simplybusiness_us",
              vertical: "Usa",
              primary_text:
                "Do you provide a secondary service for customers that is a significant part of your business?",
              help_text:
                "If your business fits in more than one box, tell us about it here.",
            },
          },
        },
        url: "https://quote-staging.simplybusiness.com/q/usa/usa/business/68f8ca2a3d936a05c26d94f6",
      },
    };

    const results = await validateEvent(testEvent);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "/schemas/com.simplybusiness/help_text_opened/jsonschema/1-0-0"
    );
  });

  it("should return validation error for invalid data", async () => {
    // Mock successful schema fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpTextOpenedSchema,
    });

    const testEvent = {
      data: {
        kind: "Self-Describing Event",
        payload: {
          data: {
            schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
            data: {
              site: "simplybusiness_us",
              // Missing required fields: primary_text, help_text
              vertical: "Usa",
            },
          },
        },
      },
    };

    const results = await validateEvent(testEvent);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(false);
    expect(results[0]).toHaveProperty("error");
  });

  it("should return unknown validation for missing schema file", async () => {
    // Mock failed schema fetch (404)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const testEvent = {
      data: {
        kind: "Self-Describing Event",
        payload: {
          data: {
            schema:
              "iglu:com.simplybusiness/nonexistent_schema/jsonschema/1-0-0",
            data: {
              some: "data",
            },
          },
        },
      },
    };

    const results = await validateEvent(testEvent);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe("unknown");
  });

  it("should ignore non-self-describing events", async () => {
    const testEvent = {
      data: {
        kind: "Regular Event",
        schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
        data: {
          site: "simplybusiness_us",
        },
      },
    };

    const results = await validateEvent(testEvent);

    expect(results).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should ignore non-simplybusiness schemas", async () => {
    const testEvent = {
      data: {
        kind: "Self-Describing Event",
        schema:
          "iglu:com.snowplowanalytics.snowplow/page_view/jsonschema/1-0-0",
        data: {
          page_url: "https://example.com",
        },
      },
    };

    const results = await validateEvent(testEvent);

    expect(results).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle events with kind at top level", async () => {
    // Mock successful schema fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpTextOpenedSchema,
    });

    const testEvent = {
      kind: "Self-Describing Event",
      schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
      data: {
        site: "simplybusiness_us",
        vertical: "Usa",
        primary_text: "Test question",
        help_text: "Test help text",
      },
    };

    const results = await validateEvent(testEvent);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true);
  });
});

describe("validateEventSingle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success when no schemas are found", async () => {
    const testEvent = {
      kind: "Regular Event",
      data: {
        some: "data",
      },
    };

    const result = await validateEventSingle(testEvent);

    expect(result.isValid).toBe(true);
  });

  it("should return first validation result when multiple schemas found", async () => {
    // Mock successful schema fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHelpTextOpenedSchema,
    });

    const testEvent = {
      kind: "Self-Describing Event",
      schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
      data: {
        site: "simplybusiness_us",
        vertical: "Usa",
        primary_text: "Test question",
        help_text: "Test help text",
      },
    };

    const result = await validateEventSingle(testEvent);

    expect(result.isValid).toBe(true);
  });

  describe("Example JSON Validations", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should validate the structured example JSON successfully", async () => {
      // Use the imported validation example
      const result = await validateEventSingle(structuredExample);

      expect(result.isValid).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should validate the unstructured example JSON successfully", async () => {
      // Mock the schema fetch for help_text_opened
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHelpTextOpenedSchema,
      });

      // Use the imported validation example
      const result = await validateEventSingle(unstructuredExample);

      expect(result.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "/schemas/com.simplybusiness/help_text_opened/jsonschema/1-0-0"
      );
    });

    it("should validate the nested unstructured example JSON successfully", async () => {
      // Mock the schema fetch based on the specific schema path
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes("service_channel_context/jsonschema/1-0-1")) {
          return {
            ok: true,
            json: async () => mockServiceChannelContextSchema,
          };
        } else if (url.includes("form_question_answered/jsonschema/1-0-4")) {
          return {
            ok: true,
            json: async () => mockFormQuestionAnsweredSchema,
          };
        } else {
          return {
            ok: false,
            status: 404,
          };
        }
      });

      // Use the imported validation example
      const result = await validateEventSingle(unstructuredNestedExample);

      expect(result.isValid).toBe(true);
    });
  });
});
