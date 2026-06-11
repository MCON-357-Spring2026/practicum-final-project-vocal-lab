import { useEffect, useRef, useState } from "react";

import {
  pauseAndReset,
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

  const stopMix = () => {
    if (syncRef.current) {
      window.clearInterval(syncRef.current);
      syncRef.current = null;
    }
    pauseAndReset(backingRef.current, vocalRef.current);
    setPlaying(false);
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
    const backing = backingRef.current;
    const vocal = vocalRef.current;
    if (!backing || !vocal || !backingUrl) return;

    try {
      await waitForAudioReady(backing);
      backing.currentTime = vocal.currentTime;
      await backing.play();
      if (syncRef.current) window.clearInterval(syncRef.current);
      syncRef.current = startDualTrackSync(backing, vocal);
      setPlaying(true);
      setError(null);
    } catch {
      setError("Could not sync backing track with vocal playback.");
    }
  };

  if (!backingUrl || !vocalUrl) return null;

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

      {!isAutoTuned && (
        <p className="msg-muted" style={{ marginTop: "0.75rem" }}>
          Vocal only:
        </p>
      )}
      {isAutoTuned && (
        <p className="msg-muted" style={{ marginTop: "0.75rem" }}>
          Auto-tune final mix — tuned vocal with backing track:
        </p>
      )}
      <audio
        ref={vocalRef}
        controls
        src={vocalUrl}
        preload="auto"
        onPlay={handleVocalPlay}
        onPause={stopMix}
        onEnded={stopMix}
      />

      {error && <p className="msg-error">{error}</p>}
    </div>
  );
}
