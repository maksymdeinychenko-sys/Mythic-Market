import React from "react";
import { useGameStore } from "@/store/gameStore";
import { TopBar } from "@/components/TopBar";
import { MainMenu } from "@/components/MainMenu";
import { HeroSelect } from "@/components/HeroSelect";
import { DayHub } from "@/components/DayHub";
import { Workshop } from "@/components/Workshop";
import { Combat } from "@/components/Combat";
import { EndOfRun } from "@/components/EndOfRun";
import { LevelUpModal } from "@/components/LevelUpModal";

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="app-shell">
      <TopBar />
      {screen === "MainMenu" && <MainMenu />}
      {screen === "HeroSelect" && <HeroSelect />}
      {screen === "DayHub" && <DayHub />}
      {screen === "Workshop" && <Workshop />}
      {screen === "Combat" && <Combat />}
      {screen === "EndOfRun" && <EndOfRun />}
      <LevelUpModal />
    </div>
  );
}
