import { useEffect, useRef, useState } from "react";

export function Tip({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!on) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOn(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [on]);
  return (
    <span className="k-tip" ref={ref}>
      <button type="button" aria-label="About this" aria-expanded={on} onClick={() => setOn((v) => !v)}>
        !
      </button>
      {on ? (
        <span className="k-tip-pop" role="note">
          {text}
        </span>
      ) : null}
    </span>
  );
}
