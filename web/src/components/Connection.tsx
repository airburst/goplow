import type { Component } from "solid-js";
import type { SSESubscription } from "../lib/sse";

const Connection: Component<{ subscription: SSESubscription }> = (props) => {
  if (props.subscription.error()) {
    return (
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-red-500" />
        <span class="text-sm text-red-400">
          Error: {props.subscription.error()}
        </span>
      </div>
    );
  }

  const isConnected = () => props.subscription.isConnected();

  return (
    <div class="flex items-center gap-2">
      <div
        class="w-3 h-3 rounded-full"
        classList={{
          "bg-green-500": isConnected(),
          "bg-red-500": !isConnected(),
        }}
      />
      <span class="text-sm">
        {isConnected() ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
};

export default Connection;
