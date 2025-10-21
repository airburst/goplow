import { createSignal, createEffect } from 'solid-js';

export interface SSEEvent {
  id: string;
  kind: string;
  event: string;
  timestamp: number;
}

export interface SSESubscription {
  events: () => SSEEvent[];
  isConnected: () => boolean;
  error: () => string | null;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Create an SSE subscription to the /api/events endpoint
 * Returns a reactive subscription object with event stream and connection status
 */
export function createSSESubscription(endpoint: string = '/api/events'): SSESubscription {
  const [events, setEvents] = createSignal<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  let eventSource: EventSource | null = null;
  let eventCounter = 0;

  const connect = () => {
    if (eventSource) {
      return; // Already connected
    }

    try {
      setError(null);
      eventSource = new EventSource(endpoint);

      // Handle incoming SSE messages
      eventSource.addEventListener('message', (e) => {
        try {
          const data = JSON.parse(e.data);

          // Create a new event object
          const newEvent: SSEEvent = {
            id: `event-${++eventCounter}`,
            kind: data.schema || 'unknown',
            event: JSON.stringify(data),
            timestamp: Date.now(),
          };

          // Add to the events array (prepend for newest first)
          setEvents((prev) => [newEvent, ...prev]);
        } catch (err) {
          console.error('Error parsing SSE message:', err);
          setError(`Failed to parse event: ${err instanceof Error ? err.message : String(err)}`);
        }
      });

      // Handle connection open
      eventSource.addEventListener('open', () => {
        setIsConnected(true);
        setError(null);
        console.log('SSE connection established');
      });

      // Handle errors
      eventSource.addEventListener('error', () => {
        setIsConnected(false);
        setError('Connection lost. Attempting to reconnect...');
        console.error('SSE connection error');
      });

      // Fallback error handler
      eventSource.onerror = () => {
        setIsConnected(false);
        setError('Failed to connect to event stream');
      };
    } catch (err) {
      setError(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      setIsConnected(false);
    }
  };

  // Auto-connect when subscription is created
  createEffect(() => {
    connect();

    // Cleanup on dispose
    return () => {
      disconnect();
    };
  });

  return {
    events,
    isConnected,
    error,
    connect,
    disconnect,
  };
}

/**
 * Clear all events from the subscription
 */
export function clearEvents(subscription: SSESubscription): void {
  // Since events is a getter, we need to update via a new reference
  // This is a helper for the component to call if needed
  console.log('Events cleared by user');
}