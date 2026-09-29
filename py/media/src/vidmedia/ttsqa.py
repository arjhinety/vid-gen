"""Listen-free QA metrics for TTS chunks (used by the TTS benchmark and, later, per-chunk production QA).

Text side (light deps: jiwer, whisper-normalizer, fugashi + unidic-lite, jaconv):
  * en_tokens / en_wer: ASR round-trip WER. Both sides go through Whisper's EnglishTextNormalizer, then a
    small equivalence table (laura~lora, jason~json, v ram~vram, ...) and single-letter runs are joined
    ("s f t" == "SFT"). Numbers are compared as Whisper writes them, so a mis-verbalised number the ASR
    still writes as the same digits is NOT caught (listening is the backstop).
  * ja_reading / ja_cer: Japanese CER on hiragana *readings* (fugashi/unidic-lite), punctuation and
    whitespace stripped, with the benchmark's Latin/number probes mapped to fixed kana on both sides, so
    the score measures pronunciation rather than the ASR's kanji choice.
Audio side (qa extra: torch CPU, speechbrain, silero-vad, librosa, pyloudnorm):
  * basic_audio: duration, peak, clipped samples, integrated LUFS
  * vad_pauses: silero-vad speech span, leading/trailing silence, internal pauses
  * f0_stats: librosa.pyin median/IQR F0
  * SpeakerEmbedder: SpeechBrain ECAPA (Apache-2.0) embeddings for cosine similarity
  * Utmos: UTMOS22-strong via SpeechMOS (MIT). Biased against high-pitched voices: compare within a voice only.
"""

from __future__ import annotations

import re
import unicodedata
from functools import lru_cache
from typing import Any

import numpy as np

# ----------------------------------------------------------------------------------------------- English

# Applied after Whisper normalisation (lower case, digits, American spelling, punctuation removed).
EN_EQUIV: list[tuple[str, str]] = [
    (r"\blaura\b", "lora"),
    (r"\blora s\b", "loras"),
    (r"\bjason\b", "json"),
    (r"\bjay son\b", "json"),
    (r"\bv ram\b", "vram"),
    (r"\bover call\b", "overcall"),
    (r"\bfinetuning\b", "fine tuning"),
    (r"\bhyper parameter\b", "hyperparameter"),
    (r"\bdata set\b", "dataset"),
    (r"\bheldout\b", "held out"),
    (r"\bprob\b", "probability"),
    (r"\bgb\b", "gigabytes"),
    (r"\boptimisation\b", "optimization"),
]


def _pre_en(text: str) -> str:
    """Before Whisper normalisation: join spelled letters ("D P O" -> "DPO"; otherwise Whisper turns the
    lone "o" into "0") and spell zero-padded integers ("001" -> "zero zero one"; Whisper drops the zeros)."""
    text = re.sub(r"(?<![\w.])((?:[A-Za-z] )+[A-Za-z])(?!\w)",
                  lambda m: m.group(1) if m.group(1).lower() in ("a i", "i a") else m.group(1).replace(" ", ""), text)
    names = "zero one two three four five six seven eight nine".split()
    return re.sub(r"(?<![\d.])0\d+(?![\d.])", lambda m: " ".join(names[int(c)] for c in m.group(0)), text)


@lru_cache(maxsize=1)
def _en_normalizer():
    from whisper_normalizer.english import EnglishTextNormalizer

    return EnglishTextNormalizer()


def en_tokens(text: str) -> list[str]:
    s = _en_normalizer()(_pre_en(text))
    for pat, rep in EN_EQUIV:
        s = re.sub(pat, rep, s)
    out: list[str] = []
    run: list[str] = []
    for tok in s.split():
        if len(tok) == 1 and tok.isalpha() and tok not in ("a", "i"):
            run.append(tok)
            continue
        if run:
            out.append("".join(run))
            run = []
        out.append(tok)
    if run:
        out.append("".join(run))
    return out


def _ops(result, ref: list[str], hyp: list[str]) -> list[dict[str, Any]]:
    ops = []
    for chunk in result.alignments[0]:
        if chunk.type == "equal":
            continue
        ops.append({
            "type": chunk.type,
            "ref": " ".join(ref[chunk.ref_start_idx:chunk.ref_end_idx]),
            "hyp": " ".join(hyp[chunk.hyp_start_idx:chunk.hyp_end_idx]),
            "ref_pos": chunk.ref_start_idx,
        })
    return ops


def en_wer(reference: str, hypothesis: str) -> dict[str, Any]:
    import jiwer

    ref, hyp = en_tokens(reference), en_tokens(hypothesis)
    if not ref:
        return {"wer": None, "n_ref": 0}
    if not hyp:
        return {"wer": 1.0, "n_ref": len(ref), "n_hyp": 0, "sub": 0, "del": len(ref), "ins": 0,
                "ops": [{"type": "delete", "ref": " ".join(ref), "hyp": "", "ref_pos": 0}]}
    r = jiwer.process_words(" ".join(ref), " ".join(hyp))
    return {"wer": round(r.wer, 4), "n_ref": len(ref), "n_hyp": len(hyp), "sub": r.substitutions,
            "del": r.deletions, "ins": r.insertions, "ops": _ops(r, ref, hyp)}


# ---------------------------------------------------------------------------------------------- Japanese

_DIG = "レイ イチ ニ サン ヨン ゴ ロク ナナ ハチ キュウ".split()
# Fixed readings for the benchmark's Latin/number probes, applied to reference AND hypothesis.
JA_LEXICON: list[tuple[str, str]] = [
    (r"(?i)lora", "ローラ"),
    (r"(?i)vram", "ブイラム"),
    (r"(?i)json", "ジェイソン"),
    (r"(?i)bf16", "ビーエフジュウロク"),
    (r"SFT", "エスエフティー"),
    (r"DPO", "ディーピーオー"),
    (r"GPU", "ジーピーユー"),
    (r"KL", "ケーエル"),
    (r"F1", "エフワン"),
    (r"GB", "ギガバイト"),
    (r"(?<=\d)B", "ビー"),
    (r"%", "パーセント"),
]
# native counters: ASR often writes 二つ as 2つ
_TSU = {"1": "ヒトツ", "2": "フタツ", "3": "ミッツ", "4": "ヨッツ", "5": "イツツ", "6": "ムッツ", "7": "ナナツ", "8": "ヤッツ", "9": "ココノツ"}
_JA_CANON = [("ぜろ", "れい"), ("いってん", "いちてん"), ("ゔ", "ぶ"), ("ヴ", "ぶ")]


def _read_int(n: int) -> str:
    if n == 0:
        return "レイ"
    units = [(1000, "セン"), (100, "ヒャク"), (10, "ジュウ")]
    special = {300: "サンビャク", 600: "ロッピャク", 800: "ハッピャク", 3000: "サンゼン", 8000: "ハッセン"}
    out = ""
    for u, name in units:
        d, n = divmod(n, u)
        if d:
            out += special.get(d * u) or ((_DIG[d] if d > 1 else "") + name)
    if n:
        out += _DIG[n]
    return out


def _read_number(m: re.Match) -> str:
    s = m.group(0).replace(",", "")
    if "." in s:
        a, b = s.split(".", 1)
        return (_read_int(int(a)) if a else "") + "テン" + "".join(_DIG[int(c)] for c in b)
    if len(s) > 1 and s.startswith("0"):
        return "".join(_DIG[int(c)] for c in s)  # "001" is read digit by digit
    return _read_int(int(s)) if len(s) <= 4 else "".join(_DIG[int(c)] for c in s)


@lru_cache(maxsize=1)
def _tagger():
    import fugashi

    return fugashi.Tagger()  # unidic-lite dictionary


def ja_reading(text: str) -> str:
    """Hiragana reading with punctuation/whitespace removed."""
    import jaconv

    s = unicodedata.normalize("NFKC", text)
    for pat, rep in JA_LEXICON:
        s = re.sub(pat, rep, s)
    s = re.sub(r"(?<![\d.])([1-9])つ", lambda m: _TSU[m.group(1)], s)
    s = re.sub(r"\d[\d,]*(?:\.\d+)?", _read_number, s)
    parts = []
    for w in _tagger()(s):
        if re.fullmatch(r"[ぁ-んァ-ヶー]+", w.surface):  # kana is already its own reading
            parts.append(w.surface)
            continue
        kana = getattr(w.feature, "kana", None)
        parts.append(kana if kana and kana != "*" else w.surface)
    s = jaconv.kata2hira("".join(parts)).lower()
    for a, b in _JA_CANON:
        s = s.replace(a, b)
    return "".join(ch for ch in s if unicodedata.category(ch)[0] in "LN")


def ja_cer(reference: str, hypothesis: str) -> dict[str, Any]:
    import jiwer

    ref, hyp = ja_reading(reference), ja_reading(hypothesis)
    if not ref:
        return {"cer": None, "n_ref": 0}
    if not hyp:
        return {"cer": 1.0, "n_ref": len(ref), "n_hyp": 0, "sub": 0, "del": len(ref), "ins": 0, "ops": []}
    r = jiwer.process_characters(ref, hyp)
    ops = [op for op in _ops(r, list(ref), list(hyp))]
    for op in ops:  # characters were space-joined by _ops
        op["ref"], op["hyp"] = op["ref"].replace(" ", ""), op["hyp"].replace(" ", "")
    return {"cer": round(r.cer, 4), "n_ref": len(ref), "n_hyp": len(hyp), "sub": r.substitutions,
            "del": r.deletions, "ins": r.insertions, "ops": ops}


def ja_mora_count(text: str) -> int:
    r = ja_reading(text)
    return sum(1 for ch in r if ch not in "ゃゅょぁぃぅぇぉゎ")


def has_cjk(text: str) -> bool:
    return bool(re.search(r"[぀-ヿ㐀-鿿]", text))


def repeated_ngrams(tokens: list[str], n: int = 3) -> int:
    seen: dict[tuple[str, ...], int] = {}
    for i in range(len(tokens) - n + 1):
        g = tuple(tokens[i:i + n])
        seen[g] = seen.get(g, 0) + 1
    return sum(c - 1 for c in seen.values() if c > 1)


# ------------------------------------------------------------------------------------------------- Audio

def load_mono(path, sr: int | None = None) -> tuple[np.ndarray, int]:
    import soundfile as sf

    x, fs = sf.read(str(path), dtype="float32", always_2d=True)
    x = x.mean(axis=1)
    if sr and fs != sr:
        import librosa

        x = librosa.resample(x, orig_sr=fs, target_sr=sr)
        fs = sr
    return x.astype(np.float32), fs


def basic_audio(x: np.ndarray, sr: int) -> dict[str, Any]:
    import pyloudnorm as pyln

    peak = float(np.max(np.abs(x))) if x.size else 0.0
    rec: dict[str, Any] = {
        "duration_s": round(x.size / sr, 3),
        "peak_dbfs": round(20 * np.log10(max(peak, 1e-9)), 2),
        "clipped_samples": int(np.sum(np.abs(x) >= 0.999)),
    }
    try:
        lufs = pyln.Meter(sr).integrated_loudness(x.astype(np.float64)) if x.size / sr >= 0.5 else None
        rec["lufs"] = None if lufs is None or not np.isfinite(lufs) else round(float(lufs), 2)
    except Exception:
        rec["lufs"] = None
    return rec


@lru_cache(maxsize=1)
def _silero():
    from silero_vad import load_silero_vad

    return load_silero_vad()


def vad_pauses(x16: np.ndarray, min_pause_s: float = 0.15) -> dict[str, Any]:
    """Silero VAD on 16 kHz audio -> speech span and pauses (seconds)."""
    import torch
    from silero_vad import get_speech_timestamps

    dur = x16.size / 16000
    ts = get_speech_timestamps(torch.from_numpy(x16), _silero(), sampling_rate=16000, return_seconds=True,
                               min_silence_duration_ms=int(min_pause_s * 1000), speech_pad_ms=30)
    if not ts:
        return {"speech_s": 0.0, "lead_s": round(dur, 3), "trail_s": round(dur, 3), "pauses": [], "max_pause_s": 0.0}
    pauses = [round(b["start"] - a["end"], 3) for a, b in zip(ts, ts[1:]) if b["start"] - a["end"] >= min_pause_s]
    return {
        "speech_start_s": round(ts[0]["start"], 3),
        "speech_end_s": round(ts[-1]["end"], 3),
        "speech_s": round(sum(t["end"] - t["start"] for t in ts), 3),
        "lead_s": round(ts[0]["start"], 3),
        "trail_s": round(max(0.0, dur - ts[-1]["end"]), 3),
        "pauses": pauses,
        "max_pause_s": max(pauses, default=0.0),
    }


def f0_stats(x16: np.ndarray) -> dict[str, Any]:
    """Median / IQR of F0 with librosa.yin (fast) gated to loud, in-range frames (pyin is ~20x slower)."""
    import librosa

    fl, hop = 1024, 256
    f0 = librosa.yin(x16, fmin=70, fmax=700, sr=16000, frame_length=fl, hop_length=hop)
    rms = librosa.feature.rms(y=x16, frame_length=fl, hop_length=hop)[0][: f0.size]
    db = 20 * np.log10(rms + 1e-9)
    keep = (db > db.max() - 25) & (f0 > 75) & (f0 < 660)
    f0 = f0[: db.size][keep]
    if f0.size < 5:
        return {"f0_median_hz": None, "f0_iqr_hz": None}
    q1, med, q3 = np.percentile(f0, [25, 50, 75])
    return {"f0_median_hz": round(float(med), 1), "f0_iqr_hz": round(float(q3 - q1), 1)}


class SpeakerEmbedder:
    """SpeechBrain ECAPA-TDNN (VoxCeleb), Apache-2.0. 16 kHz input, returns L2-normalised 192-d vectors."""

    def __init__(self, savedir: str | None = None):
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy

        self.model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir=savedir,
            run_opts={"device": "cpu"},
            local_strategy=LocalStrategy.COPY_SKIP_CACHE,  # no symlinks (Windows without admin)
        )

    def embed(self, x16: np.ndarray) -> np.ndarray:
        import torch

        with torch.no_grad():
            e = self.model.encode_batch(torch.from_numpy(x16)[None]).reshape(-1).numpy()
        return e / (np.linalg.norm(e) + 1e-9)


class Utmos:
    """UTMOS22-strong (SpeechMOS, MIT). Within-voice comparisons only: it penalises high pitch.
    ~1x real time on CPU, so the benchmark runs it on the GPU (research/tts/bench/utmos_gpu.py)."""

    def __init__(self, device: str = "cpu"):
        import torch

        self.torch = torch
        self.device = device
        self.model = torch.hub.load("tarepan/SpeechMOS:v1.2.0", "utmos22_strong", trust_repo=True).to(device)
        self.model.eval()

    def score(self, x16: np.ndarray) -> float:
        with self.torch.no_grad():
            x = self.torch.from_numpy(x16)[None].to(self.device)
            return round(float(self.model(x, 16000).item()), 3)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return round(float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)), 4)
