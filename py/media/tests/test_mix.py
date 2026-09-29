import json

import numpy as np
import soundfile as sf

from vidmedia import sfx
from vidmedia.audio import SR, duck_envelope, mix


def _tone_level_db(x: np.ndarray, hz: float, t0: float, t1: float) -> float:
    """Amplitude (dB) of one sine component inside [t0, t1], by quadrature correlation."""
    seg = x[int(t0 * SR) : int(t1 * SR)]
    t = np.arange(len(seg)) / SR
    i, q = np.mean(seg * np.sin(2 * np.pi * hz * t)), np.mean(seg * np.cos(2 * np.pi * hz * t))
    return 20 * np.log10(2 * np.hypot(i, q) + 1e-12)


def test_duck_envelope_reaches_the_duck_depth_under_speech_and_unity_in_the_clear():
    n = 8 * SR
    env = duck_envelope(n, [[2.0, 4.0]], duck_db=-12, pad_before=0.25, pad_after=0.45, ramp=0.35)
    assert abs(20 * np.log10(env[int(3.0 * SR)]) - (-12)) < 0.01
    assert env[int(0.5 * SR)] == 1.0 and env[int(7.0 * SR)] == 1.0
    # Monotone ramp into the duck, finished before the words start.
    ramp = env[int(1.2 * SR) : int(2.0 * SR)]
    assert np.all(np.diff(ramp) <= 1e-12)
    assert abs(20 * np.log10(env[int(1.99 * SR)]) - (-12)) < 0.01


def test_mix_ducks_the_music_bed_by_the_requested_amount(tmp_path):
    # "Voice": two 200 Hz bursts. "Music": a steady 1 kHz tone.
    voice = 0.3 * np.sin(2 * np.pi * 200 * np.arange(int(1.5 * SR)) / SR)
    sf.write(tmp_path / "v.wav", voice.astype(np.float32), SR)
    music = 0.3 * np.sin(2 * np.pi * 1000 * np.arange(10 * SR) / SR)
    sf.write(tmp_path / "m.wav", music.astype(np.float32), SR)
    out = tmp_path / "mix.wav"
    r = mix({
        "duration": 9.0, "target_lufs": -16, "out": str(out),
        "items": [{"wav": str(tmp_path / "v.wav"), "start": 1.0}, {"wav": str(tmp_path / "v.wav"), "start": 5.0}],
        "music": {"path": str(tmp_path / "m.wav"), "gain_db": -20, "duck_db": -10, "fade_in": 0.2, "fade_out": 0.2},
    })
    y, _ = sf.read(out)
    clear = _tone_level_db(y, 1000, 3.3, 4.3)  # between the bursts, outside pads and ramps
    ducked = _tone_level_db(y, 1000, 1.4, 2.2)  # under the first burst
    assert abs((ducked - clear) - (-10)) < 0.5
    assert r["peak_dbfs"] <= -1.0 + 1e-6
    assert r["music"]["duck_db"] == -10


def test_procedural_sfx_are_deterministic_and_peak_normalised():
    for name in sfx.SOUNDS:
        a, b = sfx.render(name, seed=3), sfx.render(name, seed=3)
        assert np.array_equal(a, b)
        assert abs(np.max(np.abs(a)) - 1.0) < 1e-9
        assert 0.02 < len(a) / SR <= 1.2  # impact is the longest


def test_mix_places_sfx_at_their_start_time(tmp_path):
    voice = 0.2 * np.sin(2 * np.pi * 200 * np.arange(SR) / SR)
    sf.write(tmp_path / "v.wav", voice.astype(np.float32), SR)
    out = tmp_path / "mix.wav"
    mix({"duration": 4.0, "target_lufs": -16, "out": str(out), "items": [{"wav": str(tmp_path / "v.wav"), "start": 0.0}],
         "sfx": [{"sound": "tick", "start": 2.5, "gain_db": -12}]})
    y, _ = sf.read(out)
    onset = np.argmax(np.abs(y[int(1.5 * SR):]) > 0.05) / SR + 1.5
    assert abs(onset - 2.5) < 0.005
