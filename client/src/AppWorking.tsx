
import React from 'react';
import PosterPair from './components/PosterPair';

export default function AppWorking() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">PickaFlick</h1>
          <p className="text-gray-300">Choose your preferences to get personalized movie recommendations</p>
        </header>
        
        <main className="max-w-4xl mx-auto">
          <PosterPair />
        </main>
      </div>
    </div>
  );
}
