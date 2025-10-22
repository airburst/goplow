import type { Component } from "solid-js";
import { createSignal } from "solid-js";

const EventCard: Component<{ kind: string; event: string }> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const parsedEvent = JSON.parse(props.event);

  // Determine success status (TODO: customize this logic)
  const isSuccess = true;
  const statusColor = isSuccess ? "bg-green-500" : "bg-red-500";

  return (
    <div
      class="p-4 dark:bg-card rounded-2xl shadow-inner-border-dark text-white overflow-hidden transition-all duration-100 dark:shadow-inner-border"
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

        {/* Kind Text */}
        <span class="flex-grow text-left font-semibold">{props.kind}</span>

        {/* Chevron Icon */}
        <div
          class="transition-transform duration-100 flex-shrink-0"
          classList={{
            "rotate-90": isOpen(),
          }}
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      {/* Accordion Content */}
      <div
        class="transition-all duration-100 overflow-hidden"
        classList={{
          "max-h-96": isOpen(),
          "max-h-0": !isOpen(),
        }}
      >
        <div class="dark:bg-code p-4 rounded-2xl">
          <pre class="text-sm text-gray-300 whitespace-pre-wrap break-words">
            {JSON.stringify(parsedEvent, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
