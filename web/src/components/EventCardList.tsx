import type { Component } from 'solid-js';
import type { SSESubscription } from '../lib/sse';
import { transformEvent } from '../lib/transform';
import EventCard from './EventCard';

const EventCardList: Component<{ subscription: SSESubscription }> = (props) => {
  return (
    <div class="grid grid-cols-1 gap-4">
      {props.subscription.events().length > 0 ? (
        props.subscription.events().map((event) => {
          const transformed = transformEvent(event);
          return (
            <EventCard
              kind={transformed.kind}
              event={transformed.event}
            />
          );
        })
      ) : (
        <div class="text-center text-gray-400 py-8">
          {props.subscription.isConnected() ? 'Waiting for events...' : 'Connecting...'}
        </div>
      )}
    </div>
  );
};

export default EventCardList;

