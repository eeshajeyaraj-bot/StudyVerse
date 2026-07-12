import { createContext, useContext, useEffect, useState } from "react";

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("studyTimer");

    if (saved) {
      const timer = JSON.parse(saved);

      setIsRunning(timer.isRunning || false);
      setSeconds(timer.seconds || 0);
      setSelectedSubject(timer.selectedSubject || "");
      setSelectedSubjectId(timer.selectedSubjectId || null);
      setStartTime(timer.startTime || null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "studyTimer",
      JSON.stringify({
        isRunning,
        seconds,
        selectedSubject,
        selectedSubjectId,
        startTime,
      })
    );
  }, [isRunning, seconds, selectedSubject, selectedSubjectId, startTime]);

  useEffect(() => {
    let interval;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <TimerContext.Provider
      value={{
        isRunning,
        setIsRunning,
        seconds,
        setSeconds,
        selectedSubject,
        setSelectedSubject,
        selectedSubjectId,
        setSelectedSubjectId,
        startTime,
        setStartTime,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}