import type { Component } from "solid-js";

interface CodeProps {
  text: string;
  class?: string;
}

const Code: Component<CodeProps> = (props) => {
  return (
    <div
      class={`bg-code dark:bg-code p-4 pr-0 rounded-2xl ${props.class || ""}`}
    >
      <pre class="text-sm text-gray-300 whitespace-pre-wrap break-words overflow-y-auto max-h-80 scrollbar-themed">
        {props.text}
      </pre>
    </div>
  );
};

export default Code;
