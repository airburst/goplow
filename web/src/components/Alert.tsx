import type { Component, JSX } from "solid-js";

export type AlertType = "error" | "warning" | "info" | "success";

interface AlertProps {
  type: AlertType;
  title: string;
  message: string;
  class?: string;
}

const Alert: Component<AlertProps> = (props) => {
  const getAlertStyles = (): string => {
    switch (props.type) {
      case "error":
        return "bg-red-600 border-red-500";
      case "warning":
        return "bg-orange-600 border-orange-500";
      case "info":
        return "bg-blue-600 border-blue-500";
      case "success":
        return "bg-green-600 border-green-500";
      default:
        return "bg-gray-600 border-gray-500";
    }
  };

  return (
    <div
      class={`${getAlertStyles()} border text-white px-4 py-3 rounded-lg ${
        props.class || ""
      }`}
    >
      <strong class="font-bold">{props.title}: </strong>
      <span class="block sm:inline">{props.message}</span>
    </div>
  );
};

export default Alert;
