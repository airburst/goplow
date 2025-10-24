import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { SSESubscription } from "../lib/sse";
import { transformEvent } from "../lib/transforms";
import EventCard from "./EventCard";

const EventCardList: Component<{ subscription: SSESubscription }> = (props) => {
  return (
    <div class="grid grid-cols-1 gap-4">
      <Show
        when={props.subscription.events().length > 0}
        fallback={
          <div class="flex items-center justify-center min-h-[60vh]">
            <Show
              when={props.subscription.isConnected()}
              fallback={
                <div class="flex flex-col items-center space-y-4">
                  <div class="relative w-12 h-12">
                    <div class="absolute inset-0 animate-spin-slow">
                      <div class="absolute top-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full transform -translate-x-1/2"></div>
                      <div class="absolute top-1/2 right-0 w-2 h-2 bg-cyan-400/70 rounded-full transform -translate-y-1/2"></div>
                      <div class="absolute bottom-0 left-1/2 w-2 h-2 bg-cyan-400/40 rounded-full transform -translate-x-1/2"></div>
                      <div class="absolute top-1/2 left-0 w-2 h-2 bg-cyan-400/20 rounded-full transform -translate-y-1/2"></div>
                    </div>
                  </div>
                  <span class="text-lg text-gray-400 font-light">
                    Connecting
                  </span>
                </div>
              }
            >
              <div class="flex flex-col items-center space-y-8">
                <div class="flex justify-center">
                  <div class="flex space-x-2">
                    <div class="w-2 h-12 bg-gray-600 rounded-full animate-wave-1"></div>
                    <div class="w-2 h-12 bg-gray-600 rounded-full animate-wave-2"></div>
                    <div class="w-2 h-12 bg-gray-600 rounded-full animate-wave-3"></div>
                    <div class="w-2 h-12 bg-gray-600 rounded-full animate-wave-4"></div>
                  </div>
                </div>
                <div class="flex items-center justify-center">
                  <span class="text-lg text-gray-400 font-light">
                    Listening for events
                  </span>
                </div>
              </div>
            </Show>
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
