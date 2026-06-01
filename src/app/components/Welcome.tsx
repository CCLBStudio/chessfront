"use client";

import React from "react";
import style from "../styles/welcomeStyle.module.css";

interface WelcomeProps {
    onStartBattle: () => void;
    onEditArmy: () => void;
}

export default function Welcome({ onStartBattle, onEditArmy }: WelcomeProps) {
    return (
        <div className={style.container}>
            {/* Ambient Background Glows */}
            <div className={style.ambientGlow1} />
            <div className={style.ambientGlow2} />

            {/* Floating Decorative Chess Pieces */}
            <img
                src="/assets/pieces/default/white_knight.png"
                alt="White Knight Decor"
                className={`${style.floatingPiece} ${style.pPiece1}`}
            />
            <img
                src="/assets/pieces/default/white_queen.png"
                alt="White Queen Decor"
                className={`${style.floatingPiece} ${style.pPiece2}`}
            />
            <img
                src="/assets/pieces/default/white_rook.png"
                alt="White Rook Decor"
                className={`${style.floatingPiece} ${style.pPiece3}`}
            />
            <img
                src="/assets/pieces/default/white_bishop.png"
                alt="White Bishop Decor"
                className={`${style.floatingPiece} ${style.pPiece4}`}
            />

            <div className={style.content}>
                {/* Hero Section */}
                <div className={style.hero}>
                    <div className={style.titleWrapper}>
                        <h1 className={style.title}>Chess Fight</h1>
                    </div>
                    <p className={style.subtitle}>
                        L'arène tactique ultime où vos pièces prennent vie. Personnalisez votre armée d'échecs,
                        triomphez et gagnez de nouvelles troupes pour bâtir la composition la plus redoutable.
                    </p>

                    <div className={style.actions}>
                        <button className={`${style.btn} ${style.btnPrimary}`} onClick={onStartBattle}>
                            Lancer le Combat
                        </button>
                        <button className={`${style.btn} ${style.btnSecondary}`} onClick={onEditArmy}>
                            Éditeur d'Armée
                        </button>
                    </div>
                </div>

                {/* Concept / Feature Cards */}
                <div className={style.conceptSection}>
                    <h2 className={style.sectionTitle}>Le Concept du Jeu</h2>

                    <div className={style.grid}>
                        {/* Card 1: Edit Army */}
                        <div className={style.card}>
                            <span className={style.cardIcon}>🛡️</span>
                            <h3 className={style.cardTitle}>1. Préparez</h3>
                            <p className={style.cardText}>
                                Ouvrez l'éditeur pour configurer librement vos rangs de départ (Rangs 1 & 2).
                                Renforcez vos lignes avec des Cavaliers, alignez deux Reines ou entourez
                                votre Roi de Tours. Votre imagination est votre seule limite stratégique.
                            </p>
                        </div>

                        {/* Card 2: AI Battle Arena */}
                        <div className={style.card}>
                            <span className={style.cardIcon}>⚔️</span>
                            <h3 className={style.cardTitle}>2. Combattez</h3>
                            <p className={style.cardText}>
                                Admirez l'affrontement ! Propulsé par un moteur d'échecs IA avancé,
                                chaque camp joue en temps réel sur la base de votre
                                position de départ. Vos choix initiaux déterminent le cours du combat.
                            </p>
                        </div>

                        {/* Card 3: Looting and Progression */}
                        <div className={style.card}>
                            <span className={style.cardIcon}>🎁</span>
                            <h3 className={style.cardTitle}>3. Évoluez</h3>
                            <p className={style.cardText}>
                                Remportez de précieux butins après chaque affrontement.
                                Obtenez des pièces rares pour enrichir votre réserve personnelle,
                                puis retournez à l'éditeur pour les incorporer dans vos prochains affrontements !
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
