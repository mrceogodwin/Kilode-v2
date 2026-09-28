import { useEffect, useState } from "react";
import { OfficialLockup } from "@/components/brand-lockup";

const KEY = "kilode-splash-seen";

/** One-shot lockup on a cold load. Skipped on in-app navigation. */
export function SplashScreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      return;
    }
    setOn(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => setOn(false), 500);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prev;
    };
  }, []);
  if (!on) return null;
  return (
    <div className="kilode-splash" role="presentation">
      <div className="kilode-splash-row">
        <OfficialLockup className="kilode-splash-logo" />
      </div>
    </div>
  );
}
