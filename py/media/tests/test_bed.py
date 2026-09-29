import numpy as np
import soundfile as sf

from vidmedia import bed, sfx
from vidmedia.audio import SR, mix


def test_every_section_start_is_a_downbeat_near_the_requested_tempo():
    sections = [0.0, 10.1, 25.0, 31.7]
    bars = bed.bar_grid(40.0, sections, bpm=96)
    starts = [b0 for b0, _, _ in bars]
    for s in sections:
        assert any(abs(b - s) < 1e-9 for b in starts), s
    # Bars tile the film exactly.
    assert abs(sum(bl for _, bl, _ in bars) - 40.0) < 1e-9
    # Nominal bar at 96 BPM is 2.5 s. 10.1 s -> 4 bars of 2.525 s; 14.9 s -> 6 of 2.483; 6.7 s -> 3 of 2.233; 8.3 s -> 3 of 2.767.
    lengths = sorted({round(bl, 3) for _, bl, _ in bars})
    assert lengths == [2.233, 2.483, 2.525, 2.767]


def test_bed_is_deterministic_full_length_and_resolves_without_pulse():
    a = bed.render_bed(12.0, [0.0, 6.0], bpm=96, seed=3)
    b = bed.render_bed(12.0, [0.0, 6.0], bpm=96, seed=3)
    assert len(a) == 12 * SR
    assert np.array_equal(a, b)
    assert np.isfinite(a).all() and abs(np.max(np.abs(a)) - 1.0) < 1e-9
    # The last section has no sub pulse: below 60 Hz (under the pad's lowest note, E2 = 82 Hz)
    # it is far steadier than the first. Measured: coefficient of variation 1.30 vs 0.45.
    from scipy.signal import butter, sosfilt

    low = np.abs(sosfilt(butter(4, 60, "low", fs=SR, output="sos"), a))
    frames = lambda x: x[: len(x) // 2400 * 2400].reshape(-1, 2400).mean(axis=1)  # noqa: E731
    first, last = frames(low[int(1.5 * SR) : int(5.5 * SR)]), frames(low[int(7.5 * SR) : int(11.5 * SR)])
    assert np.std(first) / np.mean(first) > 2 * np.std(last) / np.mean(last)


def test_mix_with_procedural_bed_and_cut_hits_meets_the_loudness_target(tmp_path):
    t = np.arange(3 * SR) / SR
    voice = 0.2 * np.sin(2 * np.pi * 220 * t) * (1 + 0.3 * np.sin(2 * np.pi * 3 * t))
    sf.write(tmp_path / "v.wav", voice.astype(np.float32), SR)
    r = mix({
        "duration": 10.0,
        "target_lufs": -16,
        "out": str(tmp_path / "mix.wav"),
        "items": [{"wav": str(tmp_path / "v.wav"), "start": 1.0}, {"wav": str(tmp_path / "v.wav"), "start": 6.0}],
        "music": {"procedural": "pulse", "sections": [0.0, 5.0], "bpm": 96, "gain_db": -20, "duck_db": -10},
        "sfx": [{"sound": "impact", "start": 5.0, "gain_db": -14}],
        "ceiling_dbfs": -1.5,
    })
    assert r["music"]["source"] == "procedural:pulse"
    assert abs(r["lufs_after"] - -16) < 1.0
    assert r["peak_dbfs"] <= -1.5 + 1e-6


def test_mix_limits_peaks_without_giving_up_loudness(tmp_path):
    # Speech-like signal with a crest factor that a whole-bus gain cut would pay for:
    # 4 kHz-free tone at a steady level plus short 6x bursts every 1.5 s.
    t = np.arange(8 * SR) / SR
    x = 0.05 * np.sin(2 * np.pi * 180 * t) * (1 + 0.5 * np.sin(2 * np.pi * 4 * t))
    for s in np.arange(0.5, 8, 1.5):
        a = int(s * SR)
        x[a : a + 480] *= 6.0
    sf.write(tmp_path / "v.wav", x.astype(np.float32), SR)
    r = mix({"duration": 8.0, "target_lufs": -16, "out": str(tmp_path / "m.wav"), "items": [{"wav": str(tmp_path / "v.wav"), "start": 0.0}], "ceiling_dbfs": -1.5})
    y, _ = sf.read(tmp_path / "m.wav")
    assert np.max(np.abs(y)) <= 10 ** (-1.5 / 20) + 1e-4
    assert abs(r["lufs_after"] - -16) < 0.2
    assert r["limited"] and r["max_reduction_db"] > 1.0


def test_impact_is_a_known_sound():
    x = sfx.render("impact", 1)
    assert len(x) == int(1.2 * SR) and abs(np.max(np.abs(x)) - 1.0) < 1e-9
