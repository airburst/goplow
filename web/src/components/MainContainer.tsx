import type { Component, JSX } from "solid-js";
import { children } from "solid-js";

const MainContainer: Component<{ children?: JSX.Element }> = (props) => {
  const c = children(() => props.children);

  return (
    <main class="flex-grow px-8 py-32">
      <div>{c()}</div>
    </main>
  );
};

export default MainContainer;
