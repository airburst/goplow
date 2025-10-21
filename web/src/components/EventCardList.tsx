import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { SSESubscription } from "../lib/sse";
import { transformEvent } from "../lib/transform";
import EventCard from "./EventCard";

const EventCardList: Component<{ subscription: SSESubscription }> = (props) => {
  return (
    <div class="grid grid-cols-1 gap-4">
      <Show
        when={props.subscription.events().length > 0}
        fallback={
          <div class="text-center text-gray-400 py-8">
            {props.subscription.isConnected()
              ? "Waiting for events..."
              : "Connecting..."}
          </div>
        }
      >
        <For each={props.subscription.events()}>
          {(event, index) => {
            const transformed = transformEvent(event);
            const isFirst = index() === 0;
            return (
              <div
                class="event-card-wrapper"
                classList={{
                  "animate-slide-in": isFirst,
                }}
              >
                <EventCard kind={transformed.kind} event={transformed.event} />
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

export default EventCardList;
