"use client";

import style from "../styles/waitingMessageStyle.module.css"

export type WaitingMessageOptions = {
    message?: string;
}

export default function WaitingMessage(props: WaitingMessageOptions) {

    const { message = "loading fight..." } = props;
    return (
        <div className={style.container}>
            <span className={style.message}>
                {message}
            </span>
        </div>
    );
}