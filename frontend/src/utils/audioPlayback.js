/** Wait until an audio element can play through without stalling. */
export function waitForAudioReady(audio) {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Audio file could not be loaded"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.load();
  });
}

/** Start playback from the beginning (call during a user click handler). */
export async function playFromStart(audio) {
  if (!audio) throw new Error("No audio element");
  audio.currentTime = 0;
  await waitForAudioReady(audio);
  await audio.play();
}

/**
 * Keep two tracks aligned while playing (vocal is the timing master).
 */
export function startDualTrackSync(backing, vocal, intervalMs = 200) {
  return window.setInterval(() => {
    if (!vocal || vocal.paused || vocal.ended) return;
    const drift = Math.abs(backing.currentTime - vocal.currentTime);
    if (drift > 0.12) {
      backing.currentTime = vocal.currentTime;
    }
  }, intervalMs);
}

export function pauseAudio(...audios) {
  for (const audio of audios) {
    if (!audio) continue;
    audio.pause();
  }
}

export function pauseAndReset(...audios) {
  for (const audio of audios) {
    if (!audio) continue;
    audio.pause();
    audio.currentTime = 0;
  }
}
