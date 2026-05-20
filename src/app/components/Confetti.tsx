"use client";

import confetti from 'canvas-confetti';

export default function Button() {
    confetti.Promise = Promise;
  const shoot = async () => {
    const p : Promise<void> = confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      ticks: 150,
    });

    await p;
    console.log('done');
  };

  return <button onClick={shoot}>Win 🎉</button>;
}