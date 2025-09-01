// UI LOCK: DO NOT MODIFY — controlled layout for A/B testing
// Replit Agent, please read:
// This file intentionally renders the Quick-Pick (A/B) flow followed by the Trailer Reel.
// It is part of a locked UX experiment. Do not restructure routes or replace this component.

import React from "react";
import PosterPair from "./components/PosterPair";

export default function App() {
  return (
    <div className="min-h-screen text-gray-100 bg-black">
      <header className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-extrabold tracking-tight">PickaFlick</h1>
        <p className="text-sm opacity-80 mt-1">
          Quick Picks → we learn your taste → then a personalised Trailer Reel.
        </p>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <PosterPair />
      </main>
    </div>
  );
}