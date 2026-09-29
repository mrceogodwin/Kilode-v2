import { useEffect, useState } from "react";

export function OfflineToast() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const sync = () => setOff(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!off) return null;
  return <div className="offline-toast">You are currently offline. Showing the saved Kilode.</div>;
}
