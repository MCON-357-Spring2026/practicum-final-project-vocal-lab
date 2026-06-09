import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function frequencyToNote(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];

  return {
    midi,
    noteName,
  };
}

function getAllowedNotesForMajorKey(key) {
  const majorPattern = [0, 2, 4, 5, 7, 9, 11];
  const rootIndex = NOTE_NAMES.indexOf(key);

  if (rootIndex === -1) {
    return getAllowedNotesForMajorKey("C");
  }

  return majorPattern.map((step) => NOTE_NAMES[(rootIndex + step) % 12]);
}

export default function PitchFeedback({ songKey = "C", active = false, mediaStream = null }) {
  const animationRef = useRef(null);

  const [pitch, setPitch] = useState(null);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("Start recording to see live pitch feedback");

  useEffect(() => {
    if (!active || !mediaStream) {
      setPitch(null);
      setNote("");
      setFeedback("Start recording to see live pitch feedback");
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    const detector = PitchDetector.forFloat32Array(analyser.fftSize);
    const input = new Float32Array(detector.inputLength);
    const allowedNotes = getAllowedNotesForMajorKey(songKey);

    const updatePitch = () => {
      analyser.getFloatTimeDomainData(input);

      const [detectedPitch, clarity] = detector.findPitch(
        input,
        audioContext.sampleRate
      );

      if (clarity > 0.8 && detectedPitch > 70 && detectedPitch < 1000) {
        const detectedNote = frequencyToNote(detectedPitch);

        setPitch(Math.round(detectedPitch));
        setNote(detectedNote.noteName);
        setFeedback(
          allowedNotes.includes(detectedNote.noteName)
            ? "On pitch"
            : `Off key — aim for notes in ${songKey} major`
        );
      } else {
        setPitch(null);
        setNote("");
        setFeedback("Sing louder or clearer");
      }

      animationRef.current = requestAnimationFrame(updatePitch);
    };

    updatePitch();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [active, mediaStream, songKey]);

  return (
    <div>
      <h3>Real-Time Pitch Feedback</h3>
      <p>Song key: {songKey} major</p>
      <p>Feedback: {feedback}</p>
      {active && pitch && (
        <p>
          Pitch: {pitch} Hz — Note: {note}
        </p>
      )}
    </div>
  );
}
