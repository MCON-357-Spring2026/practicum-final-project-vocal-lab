import os
import uuid
import numpy as np
import librosa
import soundfile as sf

CORRECTED_DIR = "corrected"
os.makedirs(CORRECTED_DIR, exist_ok=True)

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def get_major_scale_notes(song_key: str):
    major_pattern = [0, 2, 4, 5, 7, 9, 11]

    if song_key not in NOTE_NAMES:
        raise ValueError("Invalid song key")

    root_index = NOTE_NAMES.index(song_key)
    return [(root_index + step) % 12 for step in major_pattern]


def hz_to_midi(frequency):
    return 69 + 12 * np.log2(frequency / 440.0)


def nearest_scale_midi(midi_note, allowed_pitch_classes):
    rounded = int(round(midi_note))
    candidates = []

    for octave_shift in range(-2, 3):
        base_octave = (rounded // 12 + octave_shift) * 12

        for pitch_class in allowed_pitch_classes:
            candidates.append(base_octave + pitch_class)

    return min(candidates, key=lambda x: abs(x - midi_note))


def apply_basic_pitch_correction(vocal_path: str, song_key: str):
    if not os.path.exists(vocal_path):
        raise FileNotFoundError("Vocal file not found")

    y, sr = librosa.load(vocal_path, sr=None, mono=True)

    allowed_notes = get_major_scale_notes(song_key)

    f0, voiced_flag, voiced_probs = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr
    )

    valid_pitches = f0[~np.isnan(f0)]

    if len(valid_pitches) == 0:
        raise ValueError("No clear vocal pitch detected")

    median_pitch = np.median(valid_pitches)
    median_midi = hz_to_midi(median_pitch)

    target_midi = nearest_scale_midi(median_midi, allowed_notes)

    semitone_shift = target_midi - median_midi

    corrected_audio = librosa.effects.pitch_shift(
        y=y,
        sr=sr,
        n_steps=semitone_shift
    )

    filename = f"{uuid.uuid4()}_corrected_vocal.wav"
    output_path = os.path.join(CORRECTED_DIR, filename)

    sf.write(output_path, corrected_audio, sr)

    return {
        "filename": filename,
        "file_path": output_path,
        "semitone_shift": round(float(semitone_shift), 2)
    }
