import type { Component, JSX } from 'solid-js';
import { children } from "solid-js";

const EventCardList: Component<{ children?: JSX.Element }> = (props) => {
  const c = children(() => props.children);

  return (
    <div class="grid grid-cols-1 gap-4">
      {c()}
    </div>
  );
};

export default EventCardList;
