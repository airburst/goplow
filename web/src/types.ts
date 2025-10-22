export type Event = {
  id: number;
  schema: string;
  data: EventPayload | StructuredEventPayload;
  timestamp: string;
  receivedAt: string;
};

export type EventPayload = {
  app_id: string;
  kind: string;
  device_id: string;
  payload?: string;
  context?: string;
  url?: string;
};

export type StructuredEventPayload = {
  action: string;
  label?: string;
  property?: string;
  value?: number;
} & EventPayload;

export type ConvertedEvent = Omit<Event, "data"> & {
  data: ConvertedPayload;
};

export type ConvertedPayload = Omit<EventPayload, "payload" | "context"> & {
  data?: StructuredEventPayload;
  payload?: SnowplowObject;
  context?: SnowplowObject | SnowplowObject[];
};

export type SnowplowObject = {
  schema: string;
  data: Record<string, unknown> | SnowplowObject | SnowplowObject[];
};
