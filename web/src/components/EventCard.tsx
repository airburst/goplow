import type { Component } from "solid-js";
import { createSignal, createMemo } from "solid-js";
import { type Event } from "../types";
import { convertEventForCard, getTitleFromEvent } from "../lib/transforms";
import { createValidation } from "../lib/useValidation";
import CardHeader from "./CardHeader";
import EventCardContent from "./EventCardContent";

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

  const { validationStatus, validationError, validationWarning } =
    createValidation(event);

  const eventValue = event();

  if (!eventValue) {
    return null;
  }

  const eventType = getTitleFromEvent(eventValue);
  const codeText = JSON.stringify(eventValue, null, 2);

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
      <CardHeader
        title={eventType}
        status={validationStatus()}
        isOpen={isOpen()}
        onToggle={() => setIsOpen(!isOpen())}
      />

      <EventCardContent
        isOpen={isOpen()}
        status={validationStatus()}
        error={validationError()}
        warning={validationWarning()}
        codeText={codeText}
      />
    </div>
  );
};

export default EventCard;
