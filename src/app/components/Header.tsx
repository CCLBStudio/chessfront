"use client";

import style from "@/app/styles/headerStyle.module.css";

export type HeaderProps = {
    onWelcomeClick: () => void;
    onBattleClick: () => void;
    onArmyClick: () => void;
    selectedTab: "welcome" | "battle" | "army";
}

export default function Header(props: HeaderProps) {
    return (
        <div className={style.navHeader}>
            <div 
                className={style.navLogo} 
                onClick={props.onWelcomeClick} 
                style={{ cursor: "pointer" }}
            >
                CHESS FIGHT
            </div>
            <div className={style.navTabs}>
                <button className={`${style.navTab} ${props.selectedTab === "welcome" ? style.activeTab : ""}`} onClick={props.onWelcomeClick}>Accueil</button>
                <button className={`${style.navTab} ${props.selectedTab === "battle" ? style.activeTab : ""}`} onClick={props.onBattleClick}>L'Arène</button>
                <button className={`${style.navTab} ${props.selectedTab === "army" ? style.activeTab : ""}`} onClick={props.onArmyClick}>Mon Armée</button>
            </div>
        </div>
    );
}