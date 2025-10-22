import type { Component } from "solid-js";

interface ChevronIconProps {
  isOpen: boolean;
  class?: string;
}

const ChevronIcon: Component<ChevronIconProps> = (props) => {
  return (
    <div
      class={`transition-transform duration-100 flex-shrink-0 ${
        props.class || ""
      }`}
      classList={{
        "rotate-90": props.isOpen,
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
  );
};

export default ChevronIcon;
