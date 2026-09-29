"""Music tracks fitted to their stretch of the film (vidmedia/tracks.py)."""

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

from vidmedia import tracks

SR = tracks.SR


def _song(seconds: float, bpm: float = 96.0) -> np.ndarray:
    """A steady test 'song': a chord progression over a kick on every beat, stereo."""
    t = np.arange(int(seconds * SR)) / SR
    beat = 60 / bpm
    bar = 4 * beat
    roots = np.array([220.0, 174.6, 261.6, 196.0])[(t // (2 * bar)).astype(int) % 4]
    pad = 0.2 * (np.sin(2 * np.pi * roots * t) + np.sin(2 * np.pi * roots * 1.5 * t))
    ph = (t % beat) / beat
    kick = 0.5 * np.exp(-ph * 18) * np.sin(2 * np.pi * 55 * t)
    x = pad + kick
    return np.stack([x, x * 0.9], axis=1)


def test_long_track_is_trimmed_from_the_kept_end():
    x = _song(40)
    y, info = tracks.fit(x, 30 * SR, "start")
    assert len(y) == 30 * SR and info["loops"] == 0
    assert np.array_equal(y, x[: 30 * SR])
    y, _ = tracks.fit(x, 30 * SR, "end")
    assert np.array_equal(y, x[10 * SR :])  # the ending survives


def test_short_track_is_lengthened_by_looping_its_middle():
    x = _song(60)
    y, info = tracks.fit(x, 100 * SR, "end")
    assert len(y) == 100 * SR and info["loops"] >= 1
    a, b = info["loop_s"]
    assert 0.2 * 60 <= a <= 0.5 * 60 + 2.5 and 0.5 * 60 <= b <= 0.85 * 60 + 2.5
    # The loop length is a whole number of bars of the test song (2.5 s), within one analysis hop.
    bars = (b - a) / 2.5
    assert abs(bars - round(bars)) * 2.5 < 0.05
    # The composed ending is intact and the start is the song's start.
    assert np.allclose(y[-10 * SR :], x[-10 * SR :])


def test_place_crossfades_two_tracks_at_the_boundary(tmp_path):
    p1, p2 = tmp_path / "a.wav", tmp_path / "b.wav"
    sf.write(p1, _song(30), SR)
    sf.write(p2, _song(30, bpm=90), SR)
    meter = pyln.Meter(SR)
    n = 40 * SR
    bed, info = tracks.place([{"path": str(p1), "start": 0, "end": 20}, {"path": str(p2), "start": 20, "end": 40}], n, -30.0, meter, xfade_s=3.0)
    assert bed.shape == (n, 2)
    assert info[0]["from_s"] == 0 and info[0]["to_s"] == 21.5
    assert info[1]["from_s"] == 18.5 and info[1]["to_s"] == 40
    # Each track sits at the requested loudness; nothing is silent across the cut.
    rms = lambda s: float(np.sqrt(np.mean(bed[int(s * SR) : int((s + 0.5) * SR)] ** 2)))
    assert all(rms(s) > 1e-3 for s in (19.0, 19.75, 20.5, 21.0))
