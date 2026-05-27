"use client";

import style from "@/app/styles/headerStyle.module.css";

export type HeaderProps = {
    onBattleClick: () => void;
    onArmyClick: () => void;
    selectedTab: "battle" | "army";
}

export default function Header(props: HeaderProps) {
    return (
        <div className={style.navHeader}>
            <div className={style.navLogo}>CHESS BATTLE</div>
            <div className={style.navTabs}>
                <button className={`${style.navTab} ${props.selectedTab === "battle" ? style.activeTab : ""}`} onClick={props.onBattleClick}>Battle Arena</button>
                <button className={`${style.navTab} ${props.selectedTab === "army" ? style.activeTab : ""}`} onClick={props.onArmyClick}>Mon Armée</button>
            </div>
        </div>
    );
}