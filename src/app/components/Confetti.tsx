"use client";

import confetti from 'canvas-confetti';

export default function Button() {
  const shoot = async () => {
    await confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      ticks: 150,
    });

    console.log('done');
  };

  return <button onClick={shoot}>Win 🎉</button>;
}