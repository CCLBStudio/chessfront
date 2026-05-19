"use client";

import { useEffect, useState } from "react";
import style from "../styles/waitingMessageStyle.module.css"

export default function WaitingMessage() {

    const message = "Loading fight";
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev) => prev.length >= 3 ? "" : prev + ".");
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={style.container}>
            <span className={style.message}>
                {message}{dots}
            </span>
        </div>
    );
}