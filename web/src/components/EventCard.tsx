import type { Component } from "solid-js";
import { createSignal, createMemo, createEffect } from "solid-js";
import { type Event } from "../types";
import { convertEventForCard, getTitleFromEvent } from "../lib/transforms";
import { validateEventSingle } from "../lib/validate-schema";
import ChevronIcon from "./ChevronIcon";

const EventCard: Component<{ kind: string; event: string }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [validationStatus, setValidationStatus] = createSignal<
    "unknown" | "valid" | "invalid"
  >("unknown");
  const [validationError, setValidationError] = createSignal<string | null>(
    null
  );

  const event = createMemo(() => {
    try {
      const parsedEvent = JSON.parse(props.event) as Event;
      return convertEventForCard(parsedEvent);
    } catch (error) {
      console.error("Failed to parse event JSON:", error);
      return null;
    }
  });

  // Run validation when event changes
  createEffect(async () => {
    const eventValue = event();
    if (eventValue) {
      try {
        const result = await validateEventSingle(eventValue);
        console.log("🚀 ~ EventCard ~ result:", result);

        if (result.isValid === true) {
          setValidationStatus("valid");
          setValidationError(null);
        } else if (result.isValid === false) {
          setValidationStatus("invalid");
          setValidationError(result.error || "Validation failed");
        } else {
          // result.isValid === "unknown"
          setValidationStatus("unknown");
          setValidationError(null);
        }
      } catch (error) {
        console.error("Validation error:", error);
        setValidationStatus("invalid");
        setValidationError("Failed to validate event");
      }
    }
  });

  const eventValue = event();

  if (!eventValue) {
    return null;
  }

  // Derive data from eventValue for card props
  // const { kind, payload } = eventValue.data;
  const eventType = getTitleFromEvent(eventValue);

  // Determine status color based on validation
  const getStatusColor = () => {
    switch (validationStatus()) {
      case "valid":
        return "bg-green-500";
      case "invalid":
        return "bg-red-500";
      case "unknown":
      default:
        return "bg-gray-400 animate-pulse shadow-lg";
    }
  };

  return (
    <div
      class="p-4 bg-card dark:bg-card rounded-2xl text-white overflow-hidden transition-all duration-100 shadow-inner-border dark:shadow-inner-border"
      style={{
        "view-transition-name": "event-card",
        animation: "slideInFromTop 0.3s ease-out",
      }}
      classList={{
        "mb-2": true,
      }}
    >
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen())}
        class="w-full flex items-center gap-4 p-4 hover:bg-card transition-colors duration-100 cursor-pointer"
      >
        {/* Status Badge */}
        <div
          class={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${getStatusColor()}`}
        ></div>

        {/* Title */}
        <span class="flex-grow text-left">{eventType}</span>

        <ChevronIcon isOpen={isOpen()} />
      </button>

      {/* Accordion Content */}
      <div
        class="transition-all duration-100 overflow-hidden"
        classList={{
          "max-h-[32rem]": isOpen(), // Increased height to accommodate error alert
          "max-h-0": !isOpen(),
        }}
      >
        {/* Error Alert */}
        {validationStatus() === "invalid" && validationError() && (
          <div class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4 mx-4">
            <strong class="font-bold">Validation Error: </strong>
            <span class="block sm:inline">{validationError()}</span>
          </div>
        )}

        <div class="bg-code dark:bg-code p-4 pr-0 rounded-2xl mx-4 mb-4">
          <pre class="text-sm text-gray-300 whitespace-pre-wrap break-words overflow-y-auto max-h-80 scrollbar-themed">
            {JSON.stringify(eventValue, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
