import type { Component } from 'solid-js';
import { createSSESubscription } from './lib/sse';
import Header from './components/Header';
import MainContainer from './components/MainContainer';
import EventCardList from './components/EventCardList';

const App: Component = () => {
  // Create SSE subscription to the Go server
  const subscription = createSSESubscription('/api/events');

  return (
    <div class="min-h-screen bg-neutral-800 overflow-hidden text-white flex flex-col overflow-y-auto">
      <Header subscription={subscription} />
      <MainContainer>
        <EventCardList subscription={subscription} />
      </MainContainer>
    </div>
  );
};

export default App;

