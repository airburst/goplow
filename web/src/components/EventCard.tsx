import type { Component } from 'solid-js';

const EventCard: Component<{ kind: string; event: string }> = (props) => {
  const parsedEvent = JSON.parse(props.event);

  return (
    <div class="bg-neutral-800 text-white p-6 rounded-lg shadow-lg border border-neutral-600">
      <h2 class="text-white mb-3">{props.kind}</h2>
      <div class="bg-neutral-800 p-4 rounded-md border border-neutral-700">
        <pre class="text-sm text-gray-300 whitespace-pre-wrap break-words">{JSON.stringify(parsedEvent, null, 2)}</pre>
      </div>
    </div>
  );
};

export default EventCard;
