from vidmedia.audio import error_rate, map_words_to_text


def test_words_map_onto_known_text_even_when_a_number_is_written_differently():
    text = "it called one anyway, sixty-two percent of the time."
    words = [
        {"w": " it", "start": 0.0, "end": 0.1},
        {"w": " called", "start": 0.1, "end": 0.4},
        {"w": " one", "start": 0.4, "end": 0.6},
        {"w": " anyway,", "start": 0.6, "end": 1.0},
        {"w": " 62%", "start": 1.1, "end": 1.9},  # ASR wrote digits
        {"w": " of", "start": 1.9, "end": 2.0},
        {"w": " the", "start": 2.0, "end": 2.1},
        {"w": " time.", "start": 2.1, "end": 2.5},
    ]
    m = map_words_to_text(words, text)
    assert text[m[1]["s0"]:m[1]["s1"]] == "called"
    # "62%" matches nothing, so it is interpolated between "anyway," and "of".
    assert m[4].get("interpolated") is True
    assert text[m[4]["s0"]:m[4]["s1"]].strip(" ,") == "sixty-two percent"
    assert text[m[5]["s0"]:m[5]["s1"]] == "of"


def test_japanese_characters_align():
    text = "モデルは拒否し始めた。"
    words = [{"w": "モデルは", "start": 0.0, "end": 0.5}, {"w": "拒否し", "start": 0.5, "end": 0.9}, {"w": "始めた", "start": 0.9, "end": 1.3}]
    m = map_words_to_text(words, text)
    assert text[m[1]["s0"]:m[1]["s1"]] == "拒否し"


def test_error_rate_is_character_level_and_ignores_punctuation():
    assert error_rate("Hello, world!", "hello world") == 0.0
    assert error_rate("hello word", "hello world") == 1 / 10


def test_error_rate_ignores_a_stretched_vowel():
    from vidmedia.audio import error_rate

    # An emotion tag can stretch a vowel; the words are the same.
    assert error_rate("拒否は消えましたー!同じ問題", "拒否は消えました。同じ問題") == 0.0
    assert error_rate("拒否は消えた", "拒否は消えました") > 0.0


def test_prep_tempo_shortens_speech_and_keeps_pitch(tmp_path):
    import numpy as np
    import soundfile as sf

    from vidmedia.audio import SR, prep_lines

    # 3 s of a 220 Hz tone with a gap: stands in for a spoken line.
    t = np.arange(3 * SR) / SR
    x = (0.3 * np.sin(2 * np.pi * 220 * t) * (np.sin(2 * np.pi * 1.5 * t) > -0.9)).astype(np.float32)
    src = tmp_path / "line.wav"
    sf.write(src, x, SR)
    plain, fast = tmp_path / "a.wav", tmp_path / "b.wav"
    r0 = prep_lines({"items": [{"id": "a", "src": str(src), "out": str(plain)}]})[0]
    r1 = prep_lines({"tempo": 1.25, "items": [{"id": "b", "src": str(src), "out": str(fast)}]})[0]
    # 1.25x faster -> 80 % of the length (trim pads are the same on both).
    assert abs(r1["duration"] / r0["duration"] - 0.8) < 0.03
    y, _ = sf.read(fast)
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y))))
    assert abs(np.fft.rfftfreq(len(y), 1 / SR)[np.argmax(spec)] - 220) < 3  # pitch unchanged
