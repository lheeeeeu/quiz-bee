import React, { useEffect, useState, useRef } from 'react';
import { socketService } from '../../services/socket';
import { sound } from '../../services/sound';

export function TimerDisplay({ session, size = 'large', variant = 'default', dark = false, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(15);
  const prevTimeRef = useRef(null);

  const isRunning = session?.status === 'TIMER_RUNNING';
  const endsAtStr = session?.timer_ends_at;

  useEffect(() => {
    if (!isRunning || !endsAtStr) {
      prevTimeRef.current = null;
      if (session?.status === 'TIMER_EXPIRED') {
        setTimeLeft(0);
      } else if (session?.timer_duration) {
        setTimeLeft(session.timer_duration);
        setTotalDuration(session.timer_duration);
      }
      return;
    }

    const duration = session.timer_duration || 15;
    setTotalDuration(duration);

    const endsAt = new Date(endsAtStr).getTime();

    const updateTimer = () => {
      const serverNow = socketService.getServerNow();
      const remainingMs = endsAt - serverNow;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSec);

      if (prevTimeRef.current !== null && prevTimeRef.current !== remainingSec) {
        if (remainingSec <= 5 && remainingSec > 0) {
          sound.playUrgentTick();
        } else if (remainingSec > 5) {
          sound.playTick();
        } else if (remainingSec === 0) {
          sound.playBuzzer();
          if (onExpire) onExpire();
        }
      }
      prevTimeRef.current = remainingSec;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 150);

    return () => clearInterval(interval);
  }, [isRunning, endsAtStr, session?.status, session?.timer_duration, onExpire]);

  const percentage = totalDuration > 0 ? (timeLeft / totalDuration) * 100 : 0;
  const isUrgent = timeLeft <= 5 && isRunning;

  // Stage variant: exact Photo 3 clean inline display -> "Time left  14s"
  if (variant === 'stage') {
    return (
      <div className="inline-flex items-baseline justify-center gap-3 tabular-nums">
        <span className={`text-base sm:text-lg lg:text-xl font-medium ${dark ? 'text-stone-400' : 'text-[#756769]'}`}>
          Time left
        </span>
        <span
          className={`text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-none transition-colors ${
            isUrgent
              ? 'text-red-700 animate-pulse'
              : dark
              ? 'text-stone-100'
              : 'text-[#3e1b20]'
          }`}
        >
          {timeLeft}
          <span className="text-xl sm:text-2xl font-bold ml-0.5">s</span>
        </span>
      </div>
    );
  }

  let colorClasses = 'text-[#3e1b20] stroke-[#3e1b20]';
  if (isUrgent) {
    colorClasses = 'text-red-700 stroke-red-600 animate-pulse';
  } else if (timeLeft <= 10 && isRunning) {
    colorClasses = 'text-amber-700 stroke-amber-600';
  }

  if (size === 'compact') {
    return (
      <div className={`inline-flex items-baseline gap-1.5 font-mono font-bold tabular-nums ${colorClasses}`}>
        <span className="text-xs uppercase font-sans font-semibold text-[#756769]">Time left</span>
        <span className="text-2xl font-black">{timeLeft}</span>
        <span className="text-sm font-bold">s</span>
      </div>
    );
  }

  const strokeWidth = 7;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          className="stroke-[#e5dfd6]"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          className={`transition-all duration-300 ease-linear ${colorClasses}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      <div className="absolute flex flex-col items-center justify-center tabular-nums">
        <span className={`text-3xl font-black tracking-tight ${colorClasses}`}>
          {timeLeft}s
        </span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-[#756769]">
          {isRunning ? 'Remaining' : session?.status === 'TIMER_EXPIRED' ? 'Locked' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
