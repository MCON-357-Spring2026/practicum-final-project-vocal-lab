"""
Key detection using chroma features and major-key profile matching.

Loads an audio file and estimates the most likely major key.
"""

import librosa
import numpy as np


KEYS_MAJOR = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Kessler major-key profile — one weight per pitch class.
MAJOR_PROFILE = np.array([
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
    2.52, 5.19, 2.39, 3.66, 2.29, 2.88
])


def detect_key(file_path: str) -> dict:
    """
    Analyze an audio file and return the best-matching major key.

    Returns: {"key": "C", "mode": "major", "confidence": 0.85}
    confidence is correlation strength (higher = more confident).
    """
    y, sr = librosa.load(file_path, mono=True)

    # Average chroma across time to get a single pitch-class fingerprint.
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)

    scores = []

    # Rotate the profile to test each of the 12 possible major keys.
    for i in range(12):
        rotated_profile = np.roll(MAJOR_PROFILE, i)
        score = np.corrcoef(chroma_mean, rotated_profile)[0, 1]
        scores.append(score)

    # Pick the key whose profile best matches the song's pitch content.
    best_index = int(np.argmax(scores))
    best_score = float(scores[best_index])

    return {
        "key": KEYS_MAJOR[best_index],  # saved as Recording.detected_key
        "mode": "major",  # this detector only estimates major keys for now
        "confidence": round(best_score, 2),
    }
