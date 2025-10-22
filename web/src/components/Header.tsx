import type { Component } from "solid-js";
import type { SSESubscription } from "../lib/sse";
import Connection from "./Connection";

const Header: Component<{ subscription?: SSESubscription }> = (props) => {
  return (
    <header class="fixed w-full px-8 py-4 dark:bg-main flex items-center justify-between">
      <h1 class="text-2xl">Goplow</h1>
      {props.subscription && <Connection subscription={props.subscription} />}
    </header>
  );
};

export default Header;
