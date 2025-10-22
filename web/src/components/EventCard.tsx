import type { Component } from "solid-js";
import { createSignal, createMemo } from "solid-js";
import { type Event } from "../types";
import {
  convertEventForCard,
  extractEventType,
  getTitleFromEvent,
} from "../lib/transforms";
import ChevronIcon from "./ChevronIcon";

const EventCard: Component<{ kind: string; event: string }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);

  const event = createMemo(() => {
    try {
      const parsedEvent = JSON.parse(props.event) as Event;
      return convertEventForCard(parsedEvent);
    } catch (error) {
      console.error("Failed to parse event JSON:", error);
      return null;
    }
  });

  const eventValue = event();

  if (!eventValue) {
    return null;
  }

  // Derive data from eventValue for card props
  // const { kind, payload } = eventValue.data;
  const eventType = getTitleFromEvent(eventValue);

  // Determine success status (TODO: customize this logic)
  const isSuccess = true;
  const statusColor = isSuccess ? "bg-green-500" : "bg-red-500";

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
          class={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${statusColor}`}
        ></div>

        {/* Title */}
        <span class="flex-grow text-left">{eventType}</span>

        <ChevronIcon isOpen={isOpen()} />
      </button>

      {/* Accordion Content */}
      <div
        class="transition-all duration-100 overflow-hidden"
        classList={{
          "max-h-96": isOpen(),
          "max-h-0": !isOpen(),
        }}
      >
        <div class="bg-code dark:bg-code p-4 pr-0 rounded-2xl">
          <pre class="text-sm text-gray-300 whitespace-pre-wrap break-words overflow-y-auto max-h-80 scrollbar-themed">
            {JSON.stringify(eventValue, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
