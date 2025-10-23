import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({
  strict: false, // Allow unknown keywords
  validateSchema: false, // Don't validate the schema itself
  addUsedSchema: false, // Don't add schemas to the cache automatically
});
addFormats(ajv);

interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

interface ValidationResultUnknown {
  isValid: "unknown";
}

type CompleteValidationResult = ValidationResult | ValidationResultUnknown;

interface EventData {
  kind?: string;
  schema?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Extracts the schema path from an Iglu schema URI
 * @param schemaUri - The full Iglu schema URI (e.g., "iglu:com.simplybusiness/help_text_opened/jsonschema/1-0-0")
 * @returns The file path relative to schemas folder (e.g., "com.simplybusiness/help_text_opened/jsonschema/1-0-0")
 */
function extractSchemaPath(schemaUri: string): string | null {
  if (!schemaUri.startsWith("iglu:")) {
    return null;
  }

  // Remove "iglu:" prefix
  return schemaUri.slice(5);
}

/**
 * Checks if a schema URI contains "simplybusiness"
 * @param schemaUri - The schema URI to check
 * @returns true if the schema contains "simplybusiness"
 */
function isSimplyBusinessSchema(schemaUri: string): boolean {
  return schemaUri.includes("simplybusiness");
}

/**
 * Parses a schema version string (e.g., "1-0-4") into comparable numbers
 * @param version - Version string in format "major-minor-patch"
 * @returns Object with major, minor, patch numbers or null if invalid
 */
function parseSchemaVersion(
  version: string
): { major: number; minor: number; patch: number } | null {
  const parts = version.split("-");
  if (parts.length !== 3) return null;

  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null;

  return { major, minor, patch };
}

/**
 * Compares two schema versions
 * @param version1 - First version object
 * @param version2 - Second version object
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(
  version1: { major: number; minor: number; patch: number },
  version2: { major: number; minor: number; patch: number }
): number {
  if (version1.major !== version2.major) {
    return version1.major - version2.major;
  }
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor;
  }
  return version1.patch - version2.patch;
}

/**
 * Checks if there are newer versions of a schema available
 * @param schemaPath - The current schema path (e.g., "com.simplybusiness/help_text_opened/jsonschema/1-0-0")
 * @returns Warning message if newer version exists, null otherwise
 */
async function checkForNewerVersion(
  schemaPath: string
): Promise<string | null> {
  try {
    // Extract the base path and current version
    const pathParts = schemaPath.split("/");
    if (pathParts.length < 4) return null;

    const vendor = pathParts[0];
    const name = pathParts[1];
    const format = pathParts[2];
    const currentVersion = pathParts[3];

    const currentVersionObj = parseSchemaVersion(currentVersion);
    if (!currentVersionObj) return null;

    // Try to find newer versions by checking common version patterns
    // We'll check up to 5 patch versions ahead and 2 minor versions ahead
    const versionsToCheck = [];

    // Check patch versions
    for (
      let patch = currentVersionObj.patch + 1;
      patch <= currentVersionObj.patch + 5;
      patch++
    ) {
      versionsToCheck.push(
        `${currentVersionObj.major}-${currentVersionObj.minor}-${patch}`
      );
    }

    // Check minor versions
    for (
      let minor = currentVersionObj.minor + 1;
      minor <= currentVersionObj.minor + 2;
      minor++
    ) {
      versionsToCheck.push(`${currentVersionObj.major}-${minor}-0`);
      versionsToCheck.push(`${currentVersionObj.major}-${minor}-1`);
    }

    // Check major version (just next one)
    versionsToCheck.push(`${currentVersionObj.major + 1}-0-0`);

    // Test each potential newer version
    for (const version of versionsToCheck) {
      const testPath = `${vendor}/${name}/${format}/${version}`;
      try {
        const response = await fetch(`/schemas/${testPath}`);
        if (response.ok) {
          const newerVersionObj = parseSchemaVersion(version);
          if (
            newerVersionObj &&
            compareVersions(newerVersionObj, currentVersionObj) > 0
          ) {
            return `Newer schema version ${version} is available (currently using ${currentVersion})`;
          }
        }
      } catch {
        // Ignore fetch errors for version checks
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Loads a JSON schema from the schemas folder
 * @param schemaPath - The relative path to the schema file
 * @returns The parsed JSON schema or null if not found
 */
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

/**
 * Validates data against a JSON schema using AJV
 * @param data - The data to validate
 * @param schema - The JSON schema to validate against
 * @returns Validation result
 */
function validateWithAjv(data: any, schema: any): ValidationResult {
  try {
    const validate = ajv.compile(schema);
    const isValid = validate(data);

    if (isValid) {
      return { isValid: true };
    } else {
      const errorMessage = validate.errors
        ? ajv.errorsText(validate.errors)
        : "Validation failed";
      return { isValid: false, error: errorMessage };
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Schema compilation error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
/**
 * Recursively searches for schema keys in an object and validates them
 * @param obj - The object to search through
 * @param isSelfDescribingEvent - Whether we're in a Self-Describing Event context
 * @returns Array of validation results
 */
async function findAndValidateSchemas(
  obj: any,
  isSelfDescribingEvent: boolean = false
): Promise<CompleteValidationResult[]> {
  const results: CompleteValidationResult[] = [];

  if (!obj || typeof obj !== "object") {
    return results;
  }

  // Check if this object indicates we're now in a Self-Describing Event context
  const isNowSDEvent =
    isSelfDescribingEvent || obj.kind === "Self-Describing Event";

  // Check if this object has a schema key
  if (obj.schema && typeof obj.schema === "string") {
    // Only validate if we're in a Self-Describing Event and it's a SimplyBusiness schema
    if (isNowSDEvent && isSimplyBusinessSchema(obj.schema)) {
      const schemaPath = extractSchemaPath(obj.schema);

      if (schemaPath) {
        const schema = await loadSchema(schemaPath);

        if (schema) {
          // Validate the adjacent data
          if (obj.data !== undefined) {
            const validation = validateWithAjv(obj.data, schema);

            // Check for newer versions if validation passed
            if (validation.isValid) {
              const warning = await checkForNewerVersion(schemaPath);
              if (warning) {
                validation.warning = warning;
              }
            }

            results.push(validation);
          } else {
            results.push({
              isValid: false,
              error: "No data found to validate against schema",
            });
          }
        } else {
          results.push({ isValid: "unknown" });
        }
      } else {
        results.push({ isValid: false, error: "Invalid schema URI format" });
      }
    }
  }

  // Recursively search through all object properties
  for (const [_key, value] of Object.entries(obj)) {
    if (value && typeof value === "object") {
      const nestedResults = await findAndValidateSchemas(value, isNowSDEvent);
      results.push(...nestedResults);
    }
  }

  return results;
}

/**
 * Main validation function that processes a JSON event
 * @param event - The JSON event to validate
 * @returns Array of validation results for all SimplyBusiness schemas found
 */
export async function validateEvent(
  event: EventData
): Promise<CompleteValidationResult[]> {
  // Check if this is a Self-Describing Event at the top level or nested
  const hasSDEventKind = (obj: any): boolean => {
    if (!obj || typeof obj !== "object") return false;
    if (obj.kind === "Self-Describing Event") return true;

    // Check nested objects
    for (const value of Object.values(obj)) {
      if (hasSDEventKind(value)) return true;
    }
    return false;
  };

  if (!hasSDEventKind(event)) {
    return [];
  }

  return await findAndValidateSchemas(event, false);
}

/**
 * Convenience function that returns a single result for simple validation
 * @param event - The JSON event to validate
 * @returns A single validation result (first found, or success if none found)
 */
export async function validateEventSingle(
  event: EventData
): Promise<CompleteValidationResult> {
  const results = await validateEvent(event);

  if (results.length === 0) {
    return { isValid: true };
  }

  // Return the first failure if any exist, otherwise return the first result
  const firstFailure = results.find((result) => result.isValid === false);
  if (firstFailure) {
    return firstFailure;
  }

  // Return the first warning if any exist (valid but with warning)
  const firstWarning = results.find(
    (result) => result.isValid === true && result.warning
  );
  if (firstWarning) {
    return firstWarning;
  }

  // If no failures or warnings, return first result (could be true or "unknown")
  return results[0];
}
