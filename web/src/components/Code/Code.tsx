import type { Component } from "solid-js";
import { formatJSON } from "../../lib/formatJSON";
import "./Code.css";

interface CodeProps {
  text: string;
  class?: string;
}

const Code: Component<CodeProps> = (props) => {
  const formattedCode = () => formatJSON(props.text);

  return (
    <div
      class={`bg-code dark:bg-code p-4 pr-0 rounded-2xl ${props.class || ""}`}
    >
      <pre
        class="text-sm text-gray-300 overflow-y-auto max-h-80 scrollbar-themed"
        innerHTML={formattedCode()}
      />
    </div>
  );
};

export default Code;
