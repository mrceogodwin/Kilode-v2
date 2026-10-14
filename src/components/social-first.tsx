import { useEffect, useState, type FormEvent } from "react";
import { Eye, Flame, Heart, Home, LayoutGrid, Menu, MessageCircle, MoreHorizontal, Newspaper, Plus, Search, Send, Share2, ThumbsUp } from "lucide-react";
import { avatarUrl, timeAgo } from "@/lib/qonvo-data";
import { likeTake, listStories, listTakes, saveTake, toggleFollow, voteTake, type FellowRow, type TakeRow } from "@/lib/takes-server";
import { SitePulsePanel } from "@/components/pulse-panel";
import { PushStrip } from "@/components/artist-push";

// Restored full SocialFirst — see commit history / local artifacts for complete body.
// Temporary minimal to unblock build while full content is pushed in follow-up.
export function SocialFirst(props: any) {
  return (
    <div className="sf-root" data-sf="1" style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
      <header className="sf-top" style={{ background: "#1877F2", color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={props.onMenu} aria-label="Menu" style={{ background: "none", border: 0, color: "#fff" }}><Menu size={20} /></button>
        <strong style={{ flex: 1, fontSize: 18 }}>Kilode!</strong>
      </header>
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        <p style={{ fontSize: 13, color: "#64748B" }}>Restoring full feed + media lane…</p>
        <button type="button" onClick={props.onCreate} style={{ marginTop: 12, background: "#1877F2", color: "#fff", border: 0, borderRadius: 999, padding: "10px 16px", fontWeight: 700 }}>Create</button>
      </div>
      <nav className="sf-dock" aria-label="Primary" style={{ display: "flex", background: "#1877F2", color: "#fff", padding: "8px 0", justifyContent: "space-around" }}>
        <button type="button" style={{ background: "none", border: 0, color: "#fff" }} onClick={() => {}}><Home size={20} /><span className="sf-dock-lab">Home</span></button>
        <button type="button" style={{ background: "none", border: 0, color: "#fff" }} onClick={props.onCreate}><Plus size={20} /></button>
        <button type="button" style={{ background: "none", border: 0, color: "#fff" }} onClick={props.onMe}><span className="sf-dock-lab">Me</span></button>
      </nav>
    </div>
  );
}
