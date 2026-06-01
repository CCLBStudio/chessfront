"use client";

import { useState } from "react";
import BattleScene from "./components/BattleScene";
import MyArmy from "./components/MyArmy";
import Header from "./components/Header";
import Welcome from "./components/Welcome";

export default function Home() {
  const [view, setView] = useState<"welcome" | "battle" | "army">("welcome");

  return (
    <div style={{ minHeight: "100vh", background: "#121212", display: 'flex', flexDirection: 'column' }}>
      <Header
        onWelcomeClick={() => setView("welcome")}
        onBattleClick={() => setView("battle")}
        onArmyClick={() => setView("army")}
        selectedTab={view}
      />

      {/* Conditionally Render Welcome Page, Battle Arena or Army Editor */}
      {view === "welcome" ? (
        <Welcome 
          onStartBattle={() => setView("battle")} 
          onEditArmy={() => setView("army")} 
        />
      ) : view === "battle" ? (
        <BattleScene onEditArmy={() => setView("army")} />
      ) : (
        <MyArmy onBackToBattle={() => setView("battle")} />
      )}
    </div>
  );
}
