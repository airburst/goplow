import type { Component } from 'solid-js';
import Header from './components/Header';
import MainContainer from './components/MainContainer';
import EventCard from './components/EventCard';
import EventCardList from './components/EventCardList';

const App: Component = () => {
  return (
    <div class="min-h-screen bg-neutral-800 overflow-hidden text-white flex flex-col overflow-y-auto">
      <Header />
      <MainContainer>
        <EventCardList>
          <EventCard kind="Example Event" event='{"type":"example","data":"This is an example event."}' />
          <EventCard kind="Example Event" event='{"type":"example","data":"This is an example event."}' />
        </EventCardList>
      </MainContainer>
    </div>
  );
};

export default App;
