import type { Component } from "solid-js";
import type { ValidationStatus } from "../lib/useValidation";

interface StatusBadgeProps {
  status: ValidationStatus;
}

const StatusBadge: Component<StatusBadgeProps> = (props) => {
  const getStatusColor = (): string => {
    switch (props.status) {
      case "valid":
        return "bg-green-500";
      case "invalid":
        return "bg-red-500";
      case "warning":
        return "bg-orange-500";
      case "unknown":
      default:
        return "bg-gray-400 animate-pulse shadow-lg";
    }
  };

  return (
    <div
      class={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${getStatusColor()}`}
    />
  );
};

export default StatusBadge;
