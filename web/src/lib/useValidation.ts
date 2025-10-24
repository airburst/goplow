import { createSignal, createEffect } from "solid-js";
import type { Event } from "../types";
import { validateEventSingle } from "./validate-schema";

export type ValidationStatus = "unknown" | "valid" | "invalid" | "warning";

interface ValidationState {
  status: ValidationStatus;
  error: string | null;
  warning: string | null;
}

export const createValidation = (event: () => any) => {
  const [validationStatus, setValidationStatus] =
    createSignal<ValidationStatus>("unknown");
  const [validationError, setValidationError] = createSignal<string | null>(
    null
  );
  const [validationWarning, setValidationWarning] = createSignal<string | null>(
    null
  );

  const updateValidationState = (
    status: ValidationStatus,
    error: string | null = null,
    warning: string | null = null
  ) => {
    setValidationStatus(status);
    setValidationError(error);
    setValidationWarning(warning);
  };

  // Run validation when event changes
  createEffect(async () => {
    const eventValue = event();
    if (eventValue) {
      try {
        const result = await validateEventSingle(eventValue);

        if (result.isValid === true) {
          updateValidationState(
            result.warning ? "warning" : "valid",
            null,
            result.warning || null
          );
        } else if (result.isValid === false) {
          updateValidationState("invalid", result.error || "Validation failed");
        } else {
          updateValidationState("unknown");
        }
      } catch (error) {
        console.error("Validation error:", error);
        updateValidationState("invalid", "Failed to validate event");
      }
    }
  });

  return {
    validationStatus,
    validationError,
    validationWarning,
  };
};
