import type { Component } from "solid-js";
import Alert from "./Alert";
import Code from "./Code";
import type { ValidationStatus } from "../lib/useValidation";

interface EventCardContentProps {
  isOpen: boolean;
  status: ValidationStatus;
  error: string | null;
  warning: string | null;
  codeText: string;
}

const EventCardContent: Component<EventCardContentProps> = (props) => {
  const getAlertProps = () => {
    if (props.status === "invalid" && props.error) {
      return {
        type: "error" as const,
        title: "Validation Error",
        message: props.error,
      };
    }
    if (props.status === "warning" && props.warning) {
      return {
        type: "warning" as const,
        title: "Schema Warning",
        message: props.warning,
      };
    }
    return null;
  };

  return (
    <div
      class="transition-all duration-100 overflow-hidden"
      classList={{
        "max-h-[32rem]": props.isOpen,
        "max-h-0": !props.isOpen,
      }}
    >
      {(() => {
        const alertProps = getAlertProps();
        return alertProps ? (
          <Alert
            type={alertProps.type}
            title={alertProps.title}
            message={alertProps.message}
            class="mb-4 mx-4"
          />
        ) : null;
      })()}

      <Code text={props.codeText} class="mx-4 mb-4" />
    </div>
  );
};

export default EventCardContent;
