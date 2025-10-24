import type { Component } from "solid-js";
import StatusBadge from "./StatusBadge";
import ChevronIcon from "./ChevronIcon";
import type { ValidationStatus } from "../lib/useValidation";

interface CardHeaderProps {
  title: string;
  status: ValidationStatus;
  isOpen: boolean;
  onToggle: () => void;
}

const CardHeader: Component<CardHeaderProps> = (props) => {
  return (
    <button
      onClick={props.onToggle}
      class="w-full flex items-center gap-4 p-4 hover:bg-card transition-colors duration-100 cursor-pointer"
    >
      <StatusBadge status={props.status} />
      <span class="flex-grow text-left">{props.title}</span>
      <ChevronIcon isOpen={props.isOpen} />
    </button>
  );
};

export default CardHeader;
