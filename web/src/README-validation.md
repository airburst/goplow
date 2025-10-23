# JSON Schema Validation for Snowplow Events

This module provides functions to validate JSON events against JSON schemas, specifically designed for Snowplow Self-Describing Events with SimplyBusiness schemas.

## Features

- ✅ Recursive schema detection in nested JSON structures
- ✅ Validates only Self-Describing Events with "simplybusiness" schemas
- ✅ Supports both browser (fetch-based) and Node.js (file system-based) environments
- ✅ Returns detailed validation results with error messages
- ✅ Handles missing schemas gracefully
- ✅ Uses AJV for robust JSON Schema validation

## Installation

The required dependencies are already included in the project:

```json
{
  "ajv": "^8.17.1",
  "ajv-formats": "^3.0.1"
}
```

## Usage

## Usage

### Browser Environment (with Go Server)

```typescript
import { validateEvent, validateEventSingle } from "./lib/validate-schema";

// Your event data
const event = {
  data: {
    kind: "Self-Describing Event",
    payload: {
      data: {
        schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
        data: {
          site: "simplybusiness_us",
          primary_text: "Do you provide a secondary service?",
          help_text: "If your business fits in more than one box...",
        },
      },
    },
  },
};

// Validate and get all results
const results = await validateEvent(event);
console.log(results);
// Output: [{ isValid: true }] or [{ isValid: false, error: "..." }]

// Get single result (first found or success if none)
const result = await validateEventSingle(event);
console.log(result);
// Output: { isValid: true } or { isValid: false, error: "..." }
```

The validation functions automatically fetch schemas from your Go server's `/schemas/` endpoint.

### Node.js Environment

```typescript
import {
  validateEventNode,
  validateEventSingleNode,
} from "./lib/validate-schema-node";

// Validate with custom schemas directory
const results = await validateEventNode(event, "./schemas");

// Single validation result
const result = await validateEventSingleNode(event, "./schemas");
```

## API Reference

### Types

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface ValidationResultUnknown {
  isValid: "unknown";
}

type CompleteValidationResult = ValidationResult | ValidationResultUnknown;
```

### Functions

#### `validateEvent(event: EventData): Promise<CompleteValidationResult[]>`

Validates all SimplyBusiness schemas found in a Self-Describing Event.

**Parameters:**

- `event`: The JSON event to validate

**Returns:**

- Array of validation results for each schema found
- Empty array if no Self-Describing Event or no SimplyBusiness schemas found

**Example Return Values:**

```typescript
// Success
[{ isValid: true }]

// Validation error
[{ isValid: false, error: "data/primary_text must be string" }]

// Schema not found
[{ isValid: "unknown" }]

// No schemas to validate
[]
```

#### `validateEventSingle(event: EventData): Promise<CompleteValidationResult>`

Convenience function that returns the first validation result found.

**Parameters:**

- `event`: The JSON event to validate

**Returns:**

- Single validation result
- `{ isValid: true }` if no schemas found to validate

## How It Works

1. **Self-Describing Event Detection**: Only processes events with `kind: "Self-Describing Event"`

2. **Schema Filtering**: Only validates schemas containing "simplybusiness" in the URI

3. **Recursive Search**: Searches through all nested objects for schema keys

4. **Schema Loading**:

   - Fetches schemas via HTTP from Go server's `/schemas/` endpoint
   - Go server serves schema files directly from `./schemas/` directory

5. **Validation**: Uses AJV to validate data against the corresponding JSON schema

## Schema URI Format

The function expects Iglu schema URIs in this format:

```
iglu:com.simplybusiness/schema_name/jsonschema/version
```

This gets converted to a file path:

```
com.simplybusiness/schema_name/jsonschema/version
```

## Example Event Structure

```json
{
  "data": {
    "kind": "Self-Describing Event",
    "payload": {
      "data": {
        "schema": "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
        "data": {
          "site": "simplybusiness_us",
          "vertical": "Usa",
          "primary_text": "Question text",
          "help_text": "Help text content"
        }
      }
    }
  }
}
```

## Error Handling

The functions handle various error scenarios:

- **Missing schema file**: Returns `{ isValid: "unknown" }`
- **Invalid schema URI**: Returns `{ isValid: false, error: "Invalid schema URI format" }`
- **Validation failure**: Returns `{ isValid: false, error: "Detailed AJV error message" }`
- **Missing data**: Returns `{ isValid: false, error: "No data found to validate against schema" }`

## Testing

Run the test suite:

```bash
npm test -- validate-schema.test.ts
```

Test with the example CLI script:

```bash
cd web/src
node test-validation.js
```

## Schema Directory Structure

Schemas should be organized in this structure:

```
schemas/
├── com.simplybusiness/
│   ├── help_text_opened/
│   │   └── jsonschema/
│   │       ├── 1-0-0
│   │       └── 1-1-0
│   └── other_schema/
│       └── jsonschema/
│           └── 1-0-0
└── com.snowplowanalytics.snowplow/
    └── (non-simplybusiness schemas - ignored)
```

## Limitations

- Only validates Self-Describing Events
- Only validates schemas containing "simplybusiness"
- Requires schemas to be available via HTTP (browser) or file system (Node.js)
- Schema files must be valid JSON
- $schema references in schema files are removed to avoid AJV resolution issues
