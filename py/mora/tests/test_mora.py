import numpy as np
import pytest

from vidmora.align import Aligner, g2p, group_morae, strip_tags
from vidmora.viterbi import ctc_force_align, path_to_spans


def test_g2p_and_grouping_koreha():
    ph = g2p("これは、十歳の子どもです。")
    assert ph == "k o r e w a pau j u cl s a i n o k o d o m o d e s U".split()
    assert [(m, v) for m, v, _a, _b in group_morae(ph)] == [
        ("ko", "o"), ("re", "e"), ("wa", "a"), ("pau", "pau"), ("ju", "u"), ("cl", "cl"),
        ("sa", "a"), ("i", "i"), ("no", "o"), ("ko", "o"), ("do", "o"), ("mo", "o"),
        ("de", "e"), ("sU", "u"),  # devoiced final u keeps its upper-case letter in the mora string
    ]


def test_grouping_fixed_list():
    ph = "ky o o pau s a cl t o N sh I ch a".split()
    assert group_morae(ph) == [
        ("kyo", "o", 0, 1), ("o", "o", 2, 2), ("pau", "pau", 3, 3), ("sa", "a", 4, 5),
        ("cl", "cl", 6, 6), ("to", "o", 7, 8), ("N", "N", 9, 9), ("shI", "i", 10, 11), ("cha", "a", 12, 13),
    ]


def test_strip_tags():
    assert strip_tags("😏これは⏸️、🙄十歳") == "これは、十歳"


def test_viterbi_exact_path():
    # classes: 0 blank, 1 'a', 2 'b'; targets a a b need a blank between the two a's
    lp = np.log(np.array([
        [0.1, 0.8, 0.1],
        [0.1, 0.8, 0.1],
        [0.9, 0.05, 0.05],
        [0.1, 0.8, 0.1],
        [0.1, 0.1, 0.8],
        [0.1, 0.1, 0.8],
    ]))
    path = ctc_force_align(lp, [1, 1, 2], 0)
    assert path.tolist() == [1, 1, 0, 1, 2, 2]
    assert path_to_spans(path, 3, 0) == [(0, 2), (3, 4), (4, 6)]


def test_viterbi_too_short_and_empty_target():
    lp = np.log(np.full((2, 3), 1 / 3))
    with pytest.raises(ValueError):
        ctc_force_align(lp, [1, 1], 0)  # a repeat needs 3 frames
    assert ctc_force_align(lp, [], 0).tolist() == [0, 0]


def test_empty_and_silent_inputs(tmp_path):
    import soundfile as sf

    wav = tmp_path / "s.wav"
    sf.write(wav, np.zeros(16000, dtype="float32"), 16000)
    al = Aligner("cpu")
    r = al.align_one(str(wav), "これは")
    assert r["ok"] is False and r["error"] == "silent or empty audio" and r["morae"] == []
    # tags only or empty text: nothing to align, no crash
    assert al.align_one(str(wav), "😏") == {"ok": True, "morae": [], "phones": [], "greedy": "", "g2p": ""}
    assert al.align_one(str(wav), "")["morae"] == []
    empty = tmp_path / "e.wav"
    sf.write(empty, np.zeros(0, dtype="float32"), 16000)
    assert al.align_one(str(empty), "あ")["ok"] is False


def test_viterbi_matches_brute_force():
    import itertools

    rng = np.random.default_rng(0)
    T, C, tg = 7, 4, [1, 2, 2, 3]
    lp = np.log(rng.dirichlet(np.ones(C), size=T))

    def collapse(p):
        out, prev = [], 0
        for a in p:
            if a != 0 and a != prev:
                out.append(a)
            prev = a
        return out

    best = max((p for p in itertools.product(range(C), repeat=T) if collapse(p) == tg),
               key=lambda p: sum(lp[t, a] for t, a in enumerate(p)))
    assert ctc_force_align(lp, tg, 0).tolist() == list(best)
