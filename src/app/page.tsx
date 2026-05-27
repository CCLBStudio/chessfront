"use client";

import { useState } from "react";
import BattleScene from "./components/BattleScene";
import MyArmy from "./components/MyArmy";
import Header from "./components/Header";

export default function Home() {
  const [view, setView] = useState<"battle" | "army">("battle");

  return (
    <div style={{ minHeight: "100vh", background: "#121212", display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
      <Header
        onBattleClick={() => setView("battle")}
        onArmyClick={() => setView("army")}
        selectedTab={view}
      />

      {/* Conditionally Render Battle Arena or Army Editor */}
      {view === "battle" ? (
        <BattleScene onEditArmy={() => setView("army")} />
      ) : (
        <MyArmy onBackToBattle={() => setView("battle")} />
      )}
    </div>
  );
}
