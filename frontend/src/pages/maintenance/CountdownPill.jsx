import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * Live Countdown Pill for Maintenance SLAs
 * Ticks every 1 second and displays formatted remaining time or breached time.
 */
export default function CountdownPill({ targetIso, initialRemainingSeconds }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (initialRemainingSeconds !== undefined && initialRemainingSeconds !== null) {
      return initialRemainingSeconds;
    }
    if (targetIso) {
      const diff = Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000);
      return diff;
    }
    return null;
  });

  useEffect(() => {
    if (!targetIso && (initialRemainingSeconds === undefined || initialRemainingSeconds === null)) {
      return;
    }

    const calculateDiff = () => {
      if (targetIso) {
        return Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000);
      }
      return null;
    };

    // Initial update
    const initDiff = calculateDiff();
    if (initDiff !== null) {
      setSecondsLeft(initDiff);
    }

    const timer = setInterval(() => {
      if (targetIso) {
        setSecondsLeft(calculateDiff());
      } else {
        setSecondsLeft((prev) => (prev !== null ? prev - 1 : null));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetIso, initialRemainingSeconds]);

  if (secondsLeft === null || secondsLeft === undefined) {
    return null;
  }

  const isBreached = secondsLeft < 0;
  const absSeconds = Math.abs(secondsLeft);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  let statusClass = 'normal';
  if (isBreached) {
    statusClass = 'breached';
  } else if (mins < 15) {
    statusClass = 'warn';
  }

  return (
    <span className={`maint-countdown-pill ${statusClass}`}>
      {isBreached ? (
        <>
          <AlertTriangle size={12} />
          Breached +{formattedTime}
        </>
      ) : (
        <>
          <Clock size={12} />
          {formattedTime} left
        </>
      )}
    </span>
  );
}
