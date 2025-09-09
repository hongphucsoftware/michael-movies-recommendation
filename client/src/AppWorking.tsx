import React from "react";
import { Shuffle, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "./components/ui/badge";
import Header from "./components/Header";
import PosterPair from "./components/PosterPair";

function AppWorking() {



  return (
    <div className="bg-black text-white min-h-screen">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "20px 20px"
          }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">PickaFlick</h1>
          <p className="text-gray-300">Find Your Next Favourite in Minutes</p>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 pb-12">
        <PosterPair />
      </main>
    </div>
  );
}

export default AppWorking;