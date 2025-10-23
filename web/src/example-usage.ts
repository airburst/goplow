import { validateEvent, validateEventSingle } from "./lib/validate-schema";

// Example event from your specification
const exampleEvent = {
  id: 2,
  schema: "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4",
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

// Example usage
async function runExamples() {
  console.log("=== Validating Example Event ===\n");

  try {
    // Validate the event and get all validation results
    const results = await validateEvent(exampleEvent);

    console.log(`Found ${results.length} schema(s) to validate:`);
    results.forEach((result, index) => {
      console.log(`\nValidation ${index + 1}:`, result);
    });

    // Get single validation result (first found)
    console.log("\n=== Single Validation Result ===\n");
    const singleResult = await validateEventSingle(exampleEvent);
    console.log("Single result:", singleResult);
  } catch (error) {
    console.error("Validation error:", error);
  }
}

// Example of invalid data
const invalidEvent = {
  data: {
    kind: "Self-Describing Event",
    payload: {
      data: {
        schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
        data: {
          site: "simplybusiness_us",
          // Missing required fields: primary_text, help_text
        },
      },
    },
  },
};

async function runInvalidExample() {
  console.log("\n=== Validating Invalid Event ===\n");

  try {
    const results = await validateEvent(invalidEvent);
    console.log("Invalid event results:", results);
  } catch (error) {
    console.error("Validation error:", error);
  }
}

// Example of non-Self-Describing Event (should be ignored)
const nonSDEvent = {
  kind: "Regular Event",
  schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
  data: {
    site: "simplybusiness_us",
  },
};

async function runNonSDExample() {
  console.log("\n=== Validating Non-Self-Describing Event ===\n");

  try {
    const results = await validateEvent(nonSDEvent);
    console.log("Non-SD event results (should be empty):", results);
  } catch (error) {
    console.error("Validation error:", error);
  }
}

// Run all examples
async function main() {
  await runExamples();
  await runInvalidExample();
  await runNonSDExample();
}

// Export for use in other files
export {
  exampleEvent,
  invalidEvent,
  nonSDEvent,
  runExamples,
  runInvalidExample,
  runNonSDExample,
};

// Run if this file is executed directly
if (import.meta.main) {
  main();
}
