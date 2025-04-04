'use client'
import { useEffect, useState } from "react";

const MessengerRedirect = () => {
  const [isMessenger, setIsMessenger] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || navigator.vendor || "";
      if (/FBAN|FBAV/i.test(ua)) {
        setIsMessenger(true);
      }
    }
  }, []);

  if (!isMessenger) return null;

  return (
    <div className="w-full h-full flex flex-col justify-center p-6 border">
      <h3>⚠️ Open in browser</h3>
      <p>Messenger&apos;s browser blocks some features.</p>
      <p>Tap the three dots ••• and choose Open in external browser</p>
      <span className="absolute block bottom-4 text-3xl right-4 animate-bounce">⬇️</span>
    </div>
  );
};

export default MessengerRedirect;
