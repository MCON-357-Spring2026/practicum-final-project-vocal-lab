import { useEffect, useRef, useState } from "react";

import {
  pauseAndReset,
  pauseAudio,
  startDualTrackSync,
  waitForAudioReady,
} from "../utils/audioPlayback";

/**
 * Play vocal and backing track in sync.
 */
export default function MixPreview({
  backingUrl,
  vocalUrl,
  label = "Play with backing track",
  isAutoTuned = false,
}) {
  const backingRef = useRef(null);
  const vocalRef = useRef(null);
  const syncRef = useRef(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const backing = new Audio();
    backing.preload = "auto";
    backingRef.current = backing;

    return () => {
      if (syncRef.current) window.clearInterval(syncRef.current);
      pauseAndReset(backing);
      backing.src = "";
    };
  }, []);

  useEffect(() => {
    const backing = backingRef.current;
    if (!backing || !backingUrl) return;
    pauseAndReset(backing);
    backing.src = backingUrl;
    backing.load();
    setPlaying(false);
    setError(null);
  }, [backingUrl]);

  const clearSync = () => {
    if (syncRef.current) {
      window.clearInterval(syncRef.current);
      syncRef.current = null;
    }
  };

  const pauseMix = () => {
    clearSync();
    pauseAudio(backingRef.current);
    setPlaying(false);
  };

  const stopMix = () => {
    clearSync();
    pauseAndReset(backingRef.current, vocalRef.current);
    setPlaying(false);
  };

  const syncBackingToVocal = () => {
    const backing = backingRef.current;
    const vocal = vocalRef.current;
    if (!backing || !vocal) return;
    backing.currentTime = vocal.currentTime;
  };

  const startBackingWithVocal = async () => {
    const backing = backingRef.current;
    const vocal = vocalRef.current;
    if (!backingUrl || !backing || !vocal) return;

    try {
      await waitForAudioReady(backing);
      syncBackingToVocal();
      await backing.play();
      clearSync();
      syncRef.current = startDualTrackSync(backing, vocal);
      setPlaying(true);
      setError(null);
    } catch {
      pauseMix();
      setError("Could not sync backing track with vocal playback.");
    }
  };

  const startMix = async () => {
    const backing = backingRef.current;
    const vocal = vocalRef.current;
    if (!backingUrl || !vocalUrl || !backing || !vocal) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([waitForAudioReady(backing), waitForAudioReady(vocal)]);
      backing.currentTime = 0;
      vocal.currentTime = 0;
      await backing.play();
      await vocal.play();
      clearSync();
      syncRef.current = startDualTrackSync(backing, vocal);
      setPlaying(true);
    } catch {
      stopMix();
      setError(
        "Could not start mix preview. Press play on the backing track player once, then try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMixToggle = async () => {
    if (playing) {
      stopMix();
      return;
    }
    await startMix();
  };

  const handleVocalPlay = async () => {
    await startBackingWithVocal();
  };

  const handleVocalSeeked = () => {
    syncBackingToVocal();
  };

  if (!backingUrl || !vocalUrl) return null;

  const playerLabel = isAutoTuned
    ? "Scrub and play — auto-tuned vocal with backing track:"
    : "Scrub and play — vocal with backing track:";

  return (
    <div className="mix-preview">
      <div className="btn-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleMixToggle}
          disabled={loading}
        >
          {loading ? "Loading…" : playing ? "Stop mix preview" : label}
        </button>
      </div>

      <p className="msg-muted" style={{ marginTop: "0.75rem" }}>
        {playerLabel}
      </p>
      <audio
        ref={vocalRef}
        controls
        src={vocalUrl}
        preload="auto"
        onPlay={handleVocalPlay}
        onPause={pauseMix}
        onSeeked={handleVocalSeeked}
        onEnded={stopMix}
      />

      {error && <p className="msg-error">{error}</p>}
    </div>
  );
}
