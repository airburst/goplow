import type { Component } from 'solid-js';

const Header: Component = () => {
  return (
    <header class="fixed w-full text-2xl px-8 py-4 bg-neutral-900 shadow-md">
      <h1 class="font-bold">Goplow</h1>
    </header>
  );
};

export default Header;
