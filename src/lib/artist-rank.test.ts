import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { artistSlug, clickRate, groupArtists, rankArtists, rankSongs, risingSongs } from "./artist-rank.ts";

const now = Date.parse("2026-10-05T12:00:00Z");

describe("artist charts", () => {
  it("ranks a song with real opens above a newer song with none", () => {
    const rows = rankSongs([
      { id: "a", title: "New", artist: "A", url: "https://open.spotify.com/a", ts: now, views: 0 },
      { id: "b", title: "Heard", artist: "B", url: "https://open.spotify.com/b", ts: now - 9_000_000, views: 4 },
    ]);
    assert.equal(rows[0]?.title, "Heard");
  });

  it("groups an artist and sums only stored opens", () => {
    const artists = groupArtists([
      { id: "1", title: "One", artist: "Sade Okafor", url: "https://music.apple.com/x", cover: "https://cdn.example/a.jpg", genre: "Afrobeats", ts: 2, views: 3 },
      { id: "2", title: "Two", artist: "Sade Okafor", url: "https://music.apple.com/y", ts: 5, views: 2 },
    ]);
    assert.equal(artists.length, 1);
    assert.equal(artists[0]?.plays, 5);
    assert.equal(artists[0]?.slug, "sade-okafor");
    assert.equal(artists[0]?.tracks[0]?.title, "Two");
    assert.equal(artistSlug("Sade Okafor"), "sade-okafor");
  });

  it("puts the artist people actually opened first", () => {
    const ranked = rankArtists(groupArtists([
      { id: "1", title: "Quiet", artist: "Ada", url: "https://open.spotify.com/a", ts: 9, views: 0 },
      { id: "2", title: "Loud", artist: "Tunde", url: "https://open.spotify.com/b", ts: 1, views: 8 },
    ]));
    assert.equal(ranked[0]?.name, "Tunde");
  });

  it("does not call a month-old song rising", () => {
    const rows = risingSongs([
      { id: "old", title: "Old", artist: "A", url: "https://open.spotify.com/a", ts: now - 40 * 86_400_000, views: 20 },
      { id: "new", title: "New", artist: "B", url: "https://open.spotify.com/b", ts: now - 2 * 86_400_000, views: 1 },
    ], now);
    assert.deepEqual(rows.map((r) => r.title), ["New"]);
  });

  it("hides a click rate until someone has seen the card", () => {
    assert.equal(clickRate(0, 4), null);
    assert.equal(clickRate(20, 5), 25);
  });
});
