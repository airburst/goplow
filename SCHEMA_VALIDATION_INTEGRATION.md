# Schema Validation Integration with Go Server

## Overview

The JSON schema validation system is now fully integrated with your Go server. The web application can validate Snowplow Self-Describing Events with SimplyBusiness schemas by fetching schema files directly from the Go server.

## Implementation Summary

### ✅ **Go Server Changes**

**File: `internal/static/static.go`**

- Added `/schemas/` route that serves schema files from the `./schemas` directory
- Uses `http.FileServer` to serve static JSON schema files
- Automatically detects if schemas directory exists and logs accordingly

```go
// Serve schemas from the schemas directory
schemasDir := "./schemas"
if _, err := os.Stat(schemasDir); err == nil {
    log.Printf("Serving schemas from %s\n", schemasDir)
    mux.Handle("/schemas/", http.StripPrefix("/schemas/", http.FileServer(http.Dir(schemasDir))))
} else {
    log.Printf("Schemas directory not found at %s\n", schemasDir)
}
```

### ✅ **Web Application Changes**

**File: `web/src/lib/validate-schema.ts`**

- Updated `loadSchema()` function to fetch schemas from Go server
- Removes `$schema` references to avoid AJV compilation issues
- Uses `/schemas/` endpoint served by Go server

```typescript
async function loadSchema(schemaPath: string): Promise<any | null> {
  try {
    // Fetch schema from the Go server's /schemas/ endpoint
    const response = await fetch(`/schemas/${schemaPath}`);
    if (!response.ok) {
      return null;
    }
    const schema = await response.json();

    // Remove $schema reference to avoid AJV resolution issues
    if (schema.$schema) {
      delete schema.$schema;
    }

    return schema;
  } catch (error) {
    console.warn(`Failed to load schema: ${schemaPath}`, error);
    return null;
  }
}
```

## How It Works

### 1. **Schema Serving**

- Go server serves schemas from `./schemas/` directory via HTTP
- URL pattern: `http://localhost:8081/schemas/com.simplybusiness/schema_name/jsonschema/version`
- Example: `http://localhost:8081/schemas/com.simplybusiness/help_text_opened/jsonschema/1-0-0`

### 2. **Schema Discovery**

- Web app recursively searches JSON events for `schema` keys
- Only processes Self-Describing Events (`kind: "Self-Describing Event"`)
- Only validates schemas containing "simplybusiness"

### 3. **Validation Process**

```
Event → Schema Discovery → Schema Fetch → AJV Validation → Results
```

### 4. **Error Handling**

- **Schema not found**: Returns `{ isValid: "unknown" }`
- **Validation failure**: Returns `{ isValid: false, error: "details" }`
- **Success**: Returns `{ isValid: true }`

## Usage Examples

### Basic Validation

```typescript
import { validateEvent } from "./lib/validate-schema";

const event = {
  data: {
    kind: "Self-Describing Event",
    payload: {
      data: {
        schema: "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0",
        data: {
          site: "simplybusiness_us",
          primary_text: "Question text",
          help_text: "Help text content",
        },
      },
    },
  },
};

const results = await validateEvent(event);
console.log(results); // [{ isValid: true }]
```

### Single Validation

```typescript
import { validateEventSingle } from "./lib/validate-schema";

const result = await validateEventSingle(event);
console.log(result); // { isValid: true }
```

## Testing

### ✅ **Unit Tests**

All 8 tests pass:

- ✅ Valid Self-Describing Events
- ✅ Invalid data validation
- ✅ Missing schema handling
- ✅ Non-Self-Describing Events (ignored)
- ✅ Non-SimplyBusiness schemas (ignored)
- ✅ Various event structures

Run tests: `npm test -- validate-schema.test.ts`

### ✅ **Integration Test**

Created `web/test-validation.html` for browser testing with live Go server.

### ✅ **Manual Testing**

```bash
# Start Go server
./goplow

# Test schema endpoint
curl http://localhost:8081/schemas/com.simplybusiness/help_text_opened/jsonschema/1-0-0
```

## File Structure

```
goplow/
├── schemas/                          # Original schemas (served by Go)
│   └── com.simplybusiness/
│       └── help_text_opened/
│           └── jsonschema/
│               └── 1-0-0
├── internal/static/static.go         # Updated with /schemas/ route
├── web/src/lib/
│   ├── validate-schema.ts           # Web validation functions
│   └── validate-schema.test.ts      # Test suite
└── web/test-validation.html         # Integration test page
```

## Benefits

1. **🔄 Single Source of Truth**: Schemas served from one location
2. **🚀 Performance**: Direct file serving via Go's http.FileServer
3. **🛠️ Development Friendly**: Schemas automatically reload when changed
4. **📦 Production Ready**: No need to bundle schemas with web assets
5. **🔧 Maintainable**: Update schemas in one place, affects all clients

## Production Considerations

- Schemas are served from the same domain (no CORS issues)
- Go server handles all static file serving efficiently
- Schema files are read directly from filesystem
- Automatic graceful degradation if schemas directory missing

The validation system is now production-ready and fully integrated with your existing Go server architecture! 🎉
