import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appleTrackId, artworkFromLookup, pushDays, pushNetwork, pushUsd } from "./artist-rules.ts";

describe("artist push", () => {
  it("accepts a real social or music link and rejects a random site", () => {
    assert.equal(pushNetwork("https://www.instagram.com/sade")?.network, "Instagram");
    assert.equal(pushNetwork("https://music.apple.com/us/album/rush/1642898371?i=1642898573")?.network, "Apple Music");
    assert.equal(pushNetwork("https://open.spotify.com/track/abc")?.network, "Spotify");
    assert.equal(pushNetwork("http://instagram.com/sade"), null);
    assert.equal(pushNetwork("https://example.com/song"), null);
  });

  it("charges more for a longer push and nothing for an unknown length", () => {
    assert.equal(pushUsd(1), 4);
    assert.equal(pushUsd(3), 9);
    assert.equal(pushUsd(7), 18);
    assert.equal(pushUsd(30), 0);
    assert.equal(pushDays("push-7"), 7);
    assert.equal(pushDays("push-2"), 0);
  });

  it("reads an Apple song id and a lookup cover", () => {
    assert.equal(appleTrackId("https://music.apple.com/us/album/rush/1642898371?i=1642898573"), "1642898573");
    assert.equal(artworkFromLookup({ results: [{ artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg" }] }), "https://is1-ssl.mzstatic.com/image/thumb/a/300x300bb.jpg");
    assert.equal(artworkFromLookup({ results: [] }), "");
  });
});
