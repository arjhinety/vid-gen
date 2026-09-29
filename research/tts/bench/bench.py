"""TTS benchmark orchestrator (research/tts). Run with the vidmedia env:

    py/media/.venv/Scripts/python research/tts/bench/bench.py <command> [voice keys...]

Commands
  list                      show voice configs
  run <key>...              build job + manifest and run the engine adapter (one GPU process at a time)
  asr <key>...|all          faster-whisper large-v3-turbo round-trip transcripts (GPU)      -> asr.json
  audio <key>...|all        CPU metrics: ECAPA, UTMOS22, silero-vad, pyin F0, LUFS          -> audio.json, emb.npz
  masters                   CPU metrics for research/tts/voices/*.wav (identity reference)
  score                     aggregate everything                                             -> research/tts/results.json
  samples                   per-passage listening files                                      -> research/tts/samples/
  html                      research/tts/listen.html

Raw per-sentence WAVs, jobs and logs live in build/tts-bench/<engine>/<voice>/ (scratch, not kept).
Every passage in texts.yaml / texts-ja.yaml is synthesised sentence by sentence in both `spoken` and
`raw` form (sentences whose text is identical in both forms are synthesised once and shared), plus
p6_long in a single call where the engine allows it.
"""

from __future__ import annotations

import json
import os
import re
import statistics
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[3]
BENCH = ROOT / "research" / "tts" / "bench"
BUILD = ROOT / "build" / "tts-bench"
VOICES_DIR = ROOT / "research" / "tts" / "voices"
SAMPLES = ROOT / "research" / "tts" / "samples"
RESULTS = ROOT / "research" / "tts" / "results.json"

ENGINES = {
    "irodori": ("third_party/irodori-tts/.venv/Scripts/python.exe", "py/tts/irodori/run.py"),
    "qwen3": ("py/tts/qwen3/.venv/Scripts/python.exe", "py/tts/qwen3/run.py"),
    "chatterbox": ("py/tts/chatterbox/.venv/Scripts/python.exe", "py/tts/chatterbox/run.py"),
    "kokoro": ("py/tts/kokoro/.venv/Scripts/python.exe", "py/tts/kokoro/run.py"),
}

SEED = 1234


def master(name: str) -> dict[str, Any]:
    prov = yaml.safe_load((VOICES_DIR / f"ja-master-{name}.yaml").read_text(encoding="utf-8"))
    return {"wav": f"research/tts/voices/ja-master-{name}.wav", "text": prov["transcript"], "caption": prov["caption"]}


def configs() -> dict[str, dict[str, Any]]:
    """Voice configs. key = <engine>/<voice>. Masters are resolved lazily (they must exist first)."""
    cfg: dict[str, dict[str, Any]] = {}

    def add(key, lang, voice, onecall=True, note=""):
        cfg[key] = {"engine": key.split("/")[0], "lang": lang, "voice": voice, "onecall": onecall, "note": note}

    for name in ("soft", "bright", "heroine"):
        if (VOICES_DIR / f"ja-master-{name}.yaml").exists():
            mm = master(name)
            add(f"irodori/ja-ref-{name}", "ja", {"ref_wav": mm["wav"], "precision": "bf16", "seed": SEED}, onecall=True,
                note="clone of its own master (production mode)")
            add(f"irodori/ja-caption-{name}", "ja", {"caption": mm["caption"], "precision": "bf16", "seed": SEED}, onecall=False,
                note="caption only: voice re-sampled every call")
    for m in [n for n in ("soft", "bright", "heroine") if (VOICES_DIR / f"ja-master-{n}.yaml").exists()]:
        mm = master(m)
        for size in ("0.6B", "1.7B"):
            s = size.replace(".", "").lower()
            base = f"Qwen/Qwen3-TTS-12Hz-{size}-Base"
            add(f"qwen3/base{s}-icl-{m}", "en", {"model": base, "mode": "clone", "ref_wav": mm["wav"], "ref_text": mm["text"]},
                note=f"ICL clone of ja-master-{m} (JA transcript as ref_text)")
            add(f"qwen3/base{s}-xvec-{m}", "en", {"model": base, "mode": "clone", "ref_wav": mm["wav"], "xvec_only": True},
                note=f"x-vector-only clone of ja-master-{m}")
            add(f"qwen3/base{s}-icl-{m}-ja", "ja", {"model": base, "mode": "clone", "ref_wav": mm["wav"], "ref_text": mm["text"]},
                note=f"ICL clone of ja-master-{m}, Japanese output (one-engine identity check)")
        add(f"chatterbox/turbo-{m}", "en", {"variant": "turbo", "ref_wav": mm["wav"]}, onecall=True,
            note=f"Turbo clone of ja-master-{m} (no cfg_weight/exaggeration)")
        for cw in (0.0, 0.5):
            add(f"chatterbox/mtl-v3-cfg{int(cw*10)}-{m}", "en",
                {"variant": "multilingual", "t3_model": "v3", "ref_wav": mm["wav"], "cfg_weight": cw, "exaggeration": 0.5},
                note=f"Multilingual V3 clone of ja-master-{m}, language_id=en, cfg_weight={cw}")
        add(f"chatterbox/mtl-v3-{m}-ja", "ja", {"variant": "multilingual", "t3_model": "v3", "ref_wav": mm["wav"], "cfg_weight": 0.5,
                                               "exaggeration": 0.5}, note=f"Multilingual V3 clone of ja-master-{m}, Japanese output")
    for m in [n for n in ("soft", "bright", "heroine") if (VOICES_DIR / f"en-master-{n}.yaml").exists()]:
        prov = yaml.safe_load((VOICES_DIR / f"en-master-{m}.yaml").read_text(encoding="utf-8"))
        for size in ("0.6B", "1.7B"):
            s = size.replace(".", "").lower()
            add(f"qwen3/base{s}-icl-enboot-{m}", "en", {"model": f"Qwen/Qwen3-TTS-12Hz-{size}-Base", "mode": "clone",
                                                        "ref_wav": f"research/tts/voices/en-master-{m}.wav", "ref_text": prov["transcript"]},
                note=f"ICL clone of the bootstrapped EN reference en-master-{m} (EN transcript)")
        add(f"chatterbox/mtl-v3-cfg5-enboot-{m}", "en", {"variant": "multilingual", "t3_model": "v3",
                                                         "ref_wav": f"research/tts/voices/en-master-{m}.wav", "cfg_weight": 0.5,
                                                         "exaggeration": 0.5}, note=f"Multilingual V3 clone of en-master-{m}")
    calm = "Speak in a calm, clear, unhurried documentary narration voice, gentle and precise."
    for sp in ("Serena", "Ono_Anna"):
        add(f"qwen3/cv17b-{sp.lower()}", "en", {"model": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", "mode": "custom", "speaker": sp,
                                                "instruct": calm}, note="preset speaker + calm instruct")
        add(f"qwen3/cv06b-{sp.lower()}", "en", {"model": "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice", "mode": "custom", "speaker": sp},
            note="preset speaker (0.6B ignores instruct)")
    for v in ("af_heart", "af_bella"):
        add(f"kokoro/{v}", "en", {"voice": v, "speed": 1.0}, note="preset voice")
    return cfg


# ------------------------------------------------------------------------------------------------ corpus

def load_corpus(lang: str) -> list[dict[str, Any]]:
    f = BENCH / ("texts-ja.yaml" if lang == "ja" else "texts.yaml")
    return yaml.safe_load(f.read_text(encoding="utf-8"))["passages"]


def split_sentences(text: str, lang: str) -> list[str]:
    text = " ".join(text.split())
    if lang == "ja":
        parts = re.findall(r"[^。！？]+[。！？]?", text)
    else:
        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"'(])", text)
    return [p.strip() for p in parts if p.strip()]


def build_manifest(lang: str, onecall: bool) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    uniq: dict[str, str] = {}
    items: list[dict[str, Any]] = []
    manifest: dict[str, Any] = {"lang": lang, "passages": {}}
    for p in load_corpus(lang):
        entry: dict[str, Any] = {"reference": " ".join(str(p.get("reference", "")).split()), "forms": {}}
        for form in ("spoken", "raw"):
            sents = split_sentences(p[form], lang)
            stems = []
            for i, s in enumerate(sents):
                if s not in uniq:
                    uniq[s] = f"{p['id']}__{form}__s{i:02d}"
                    items.append({"id": uniq[s], "text": s})
                stems.append(uniq[s])
            entry["forms"][form] = {"text": " ".join(p[form].split()) if lang == "en" else p[form], "sentences": sents, "stems": stems}
        if onecall and p["id"] == "p6_long":
            entry["onecall"] = "p6_long__onecall"
            items.append({"id": "p6_long__onecall", "text": entry["forms"]["spoken"]["text"], "onecall": True})
        manifest["passages"][p["id"]] = entry
    return manifest, items


def run_dir(key: str) -> Path:
    return BUILD / key


# --------------------------------------------------------------------------------------------------- run

def cmd_run(keys: list[str]) -> None:
    cfg = configs()
    for key in keys:
        c = cfg[key]
        d = run_dir(key)
        (d / "wav").mkdir(parents=True, exist_ok=True)
        manifest, items = build_manifest(c["lang"], c["onecall"])
        manifest.update(key=key, engine=c["engine"], voice=c["voice"], note=c["note"])
        (d / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
        job = {"engine": c["engine"], "device": "cuda", "voice": c["voice"],
               "items": [{**it, "lang": c["lang"], "seed": SEED, "out": (d / "wav" / f"{it['id']}.wav").as_posix()} for it in items]}
        (d / "job.json").write_text(json.dumps(job, ensure_ascii=False, indent=1), encoding="utf-8")
        py, adapter = ENGINES[c["engine"]]
        env = {**os.environ, "HF_HUB_DISABLE_SYMLINKS_WARNING": "1", "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
        print(f"== {key}: {len(items)} items", flush=True)
        t0 = time.time()
        with open(d / "log.txt", "w", encoding="utf-8") as log:
            rc = subprocess.run([str(ROOT / py), str(ROOT / adapter), str(d / "job.json")], cwd=ROOT, env=env,
                                stdout=log, stderr=subprocess.STDOUT).returncode
        res = d / "job.results.json"
        ok = sum(r["ok"] for r in json.loads(res.read_text(encoding="utf-8"))["items"]) if res.exists() else 0
        print(f"   rc={rc} ok={ok}/{len(items)} wall={time.time() - t0:.0f}s", flush=True)


# --------------------------------------------------------------------------------------------------- asr

def _wavs(key: str) -> tuple[dict[str, Any], list[str]]:
    d = run_dir(key)
    man = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    stems = sorted({s for p in man["passages"].values() for f in p["forms"].values() for s in f["stems"]}
                   | {p["onecall"] for p in man["passages"].values() if p.get("onecall")} | set(man.get("stems", [])))
    return man, [s for s in stems if (d / "wav" / f"{s}.wav").exists()]


def _keys(args: list[str]) -> list[str]:
    if args == ["all"]:
        return sorted(k for k in configs() if (run_dir(k) / "job.results.json").exists())
    return args


def run_keys() -> list[str]:
    return sorted(k for k in configs() if (run_dir(k) / "job.results.json").exists())


def cmd_asr(args: list[str]) -> None:
    sys.path.insert(0, str(ROOT / "py" / "media" / "src"))
    from vidmedia.cuda import pick_device

    dev, compute = pick_device("cuda")
    from faster_whisper import WhisperModel

    model = WhisperModel("large-v3-turbo", device=dev, compute_type=compute)
    for key in _keys(args):
        d = run_dir(key)
        man, stems = _wavs(key)
        cache_f = d / "asr.json"
        cache = json.loads(cache_f.read_text(encoding="utf-8")) if cache_f.exists() else {}
        n = 0
        for s in stems:
            wav = d / "wav" / f"{s}.wav"
            if s in cache and cache[s].get("mtime") == wav.stat().st_mtime:
                continue
            segs, info = model.transcribe(str(wav), language=man["lang"], beam_size=5, vad_filter=False,
                                          word_timestamps=True, condition_on_previous_text=False)
            segs = list(segs)
            cache[s] = {
                "mtime": wav.stat().st_mtime,
                "text": ("" if man["lang"] == "ja" else " ").join(x.text.strip() for x in segs).strip(),
                "avg_logprob": round(min((x.avg_logprob for x in segs), default=0.0), 3),
                "compression_ratio": round(max((x.compression_ratio for x in segs), default=0.0), 3),
                "no_speech_prob": round(max((x.no_speech_prob for x in segs), default=0.0), 3),
                "words": [[round(w.start, 2), round(w.end, 2), w.word] for x in segs for w in (x.words or [])],
            }
            n += 1
        cache_f.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"asr {key}: {n} new, {len(stems)} total", flush=True)


# ------------------------------------------------------------------------------------------------- audio

class _AudioMetrics:
    def __init__(self):
        import torch

        torch.set_num_threads(int(os.environ.get("QA_THREADS", "4")))
        sys.path.insert(0, str(ROOT / "py" / "media" / "src"))
        from vidmedia import ttsqa

        self.q = ttsqa
        self.emb = ttsqa.SpeakerEmbedder(savedir=str(BUILD / "_models" / "ecapa"))

    def clip(self, wav: Path) -> tuple[dict[str, Any], np.ndarray]:
        q = self.q
        x, sr = q.load_mono(wav)
        rec = q.basic_audio(x, sr)
        x16, _ = q.load_mono(wav, 16000)
        rec.update(q.vad_pauses(x16))
        rec.update(q.f0_stats(x16))
        return rec, self.emb.embed(x16)


def cmd_audio(args: list[str]) -> None:
    am = _AudioMetrics()
    for key in _keys(args):
        d = run_dir(key)
        _, stems = _wavs(key)
        out, embs = {}, {}
        for s in stems:
            out[s], embs[s] = am.clip(d / "wav" / f"{s}.wav")
        (d / "audio.json").write_text(json.dumps(out, indent=0), encoding="utf-8")
        np.savez(d / "emb.npz", **embs)
        print(f"audio {key}: {len(stems)} clips", flush=True)


def cmd_masters(_args: list[str]) -> None:
    am = _AudioMetrics()
    out, embs = {}, {}
    for wav in sorted(VOICES_DIR.glob("*.wav")):
        out[wav.stem], embs[wav.stem] = am.clip(wav)
    (BUILD / "_masters").mkdir(parents=True, exist_ok=True)
    (BUILD / "_masters" / "audio.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    np.savez(BUILD / "_masters" / "emb.npz", **embs)
    print(json.dumps(out, indent=1))


# ------------------------------------------------------------------------------------------------- score

def _q():
    sys.path.insert(0, str(ROOT / "py" / "media" / "src"))
    from vidmedia import ttsqa

    return ttsqa


def _med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 3) if xs else None


def _mean(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.fmean(xs), 3) if xs else None


def _pct(xs, p):
    xs = [x for x in xs if x is not None]
    return round(float(np.percentile(xs, p)), 3) if xs else None


def _audio_with_mos(d: Path) -> dict[str, Any]:
    audio = json.loads((d / "audio.json").read_text(encoding="utf-8"))
    if (d / "utmos.json").exists():
        for k, v in json.loads((d / "utmos.json").read_text(encoding="utf-8")).items():
            audio.setdefault(k, {})["utmos"] = v
    return audio


def clip_metrics(q, lang: str, ref: str, text: str, asr: dict, audio: dict) -> dict[str, Any]:
    """Per-clip round trip + failure flags. `ref` = what a listener should hear, `text` = what was sent."""
    hyp = asr.get("text", "")
    if lang == "ja":
        m = q.ja_cer(ref, hyp)
        err, n_ref = m.get("cer"), m["n_ref"]
        toks_ref, toks_hyp = list(q.ja_reading(ref)), list(q.ja_reading(hyp))
        unit_count = q.ja_mora_count(text)
        big_del, big_ins, tail_min = 4, 5, 3
    else:
        m = q.en_wer(ref, hyp)
        err, n_ref = m.get("wer"), m["n_ref"]
        toks_ref, toks_hyp = q.en_tokens(ref), q.en_tokens(hyp)
        unit_count = len(q.en_tokens(text))
        big_del, big_ins, tail_min = 2, 3, 2
    ratio = len(toks_hyp) / max(1, len(toks_ref))
    flags = []
    ops = m.get("ops", [])
    # A reference that is itself unspeakable (the raw equation: = σ β Δ) cannot be compared word by word:
    # keep only the audio checks and the wrong-language check for it.
    unscorable = bool(re.search(r"[=σβΔ·_]", ref))
    if lang == "en" and q.has_cjk(hyp):
        flags.append("wrong_language")
    tail_del = bool(ops) and ops[-1]["type"] == "delete" and len(ops[-1]["ref"].split() if lang == "en" else ops[-1]["ref"]) >= tail_min \
        and ops[-1]["ref_pos"] + (len(ops[-1]["ref"].split()) if lang == "en" else len(ops[-1]["ref"])) >= len(toks_ref)
    n = 3 if lang == "en" else 6
    if not unscorable:
        if ratio < 0.75 or tail_del:
            flags.append("truncation")
        if ratio > 1.3 or q.repeated_ngrams(toks_hyp, n) > q.repeated_ngrams(toks_ref, n):
            flags.append("repetition")
        if (m.get("del") or 0) >= big_del and "truncation" not in flags:
            flags.append("skipped_words")
        if (m.get("ins") or 0) >= big_ins:
            flags.append("hallucination")
    if audio.get("max_pause_s", 0) > 1.0 or audio.get("lead_s", 0) > 0.75 or audio.get("trail_s", 0) > 1.0:
        flags.append("long_silence")
    if audio.get("clipped_samples", 0) >= 10:
        flags.append("clipping")
    if asr.get("avg_logprob", 0) < -1.0 or asr.get("compression_ratio", 0) > 2.4:
        flags.append("asr_low_conf")
    span = (audio.get("speech_end_s") or 0) - (audio.get("speech_start_s") or 0)
    rate = None
    if span > 0.3:
        rate = round(unit_count / span * (60 if lang == "en" else 1), 1)
    return {"ref": ref, "hyp": hyp, "err": err, "n_ref": n_ref, "text_scorable": not unscorable, "sub": m.get("sub"), "del": m.get("del"), "ins": m.get("ins"),
            "ops": ops[:12], "flags": flags, "rate": rate, "span_s": round(span, 3), "units": unit_count}


def score_voice(q, key: str, master_embs: dict[str, np.ndarray]) -> dict[str, Any]:
    cfg = configs()[key]
    d = run_dir(key)
    man = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
    res = json.loads((d / "job.results.json").read_text(encoding="utf-8"))
    job = json.loads((d / "job.json").read_text(encoding="utf-8"))
    asr = json.loads((d / "asr.json").read_text(encoding="utf-8"))
    audio = _audio_with_mos(d)
    emb = dict(np.load(d / "emb.npz"))
    lang = man["lang"]
    items = {r["id"]: r for r in res["items"]}
    texts = {it["id"]: it["text"] for it in job["items"]}

    # per-clip reference: spoken sentence (EN, when raw/spoken split align) or the clip's own text
    clip_ref: dict[str, str] = {}
    for pid, p in man["passages"].items():
        sp, rw = p["forms"]["spoken"], p["forms"]["raw"]
        for form in ("spoken", "raw"):
            f = p["forms"][form]
            for i, stem in enumerate(f["stems"]):
                if lang == "en" and form == "raw" and len(rw["sentences"]) == len(sp["sentences"]):
                    clip_ref.setdefault(stem, sp["sentences"][i])
                else:
                    clip_ref.setdefault(stem, f["sentences"][i])
        if p.get("onecall"):
            clip_ref[p["onecall"]] = p["reference"] if lang == "en" else p["forms"]["spoken"]["text"]

    clips: dict[str, Any] = {}
    for stem, ref in clip_ref.items():
        r = items.get(stem, {})
        if not r.get("ok"):
            clips[stem] = {"ok": False, "error": r.get("error", "missing")}
            continue
        a = audio.get(stem, {})
        c = clip_metrics(q, lang, ref, texts[stem], asr.get(stem, {}), a)
        c.update(ok=True, text=texts[stem], gen_s=r.get("gen_s"), rtf=r.get("rtf"), duration_s=r.get("duration_s"),
                 audio={k: a.get(k) for k in ("lufs", "peak_dbfs", "clipped_samples", "lead_s", "trail_s", "max_pause_s",
                                              "pauses", "f0_median_hz", "f0_iqr_hz", "utmos")},
                 asr={k: asr.get(stem, {}).get(k) for k in ("avg_logprob", "compression_ratio", "no_speech_prob")})
        clips[stem] = c

    sent = [s for s in clips if not s.endswith("__onecall")]
    ok = [s for s in sent if clips[s]["ok"]]
    # speaking-rate outliers within the voice (sec per unit z-score)
    spu = {s: clips[s]["span_s"] / clips[s]["units"] for s in ok if clips[s]["units"] and clips[s]["span_s"] > 0.3}
    if len(spu) >= 5:
        mu, sd = statistics.fmean(spu.values()), statistics.pstdev(spu.values()) or 1e-9
        for s, v in spu.items():
            if abs(v - mu) / sd > 3:
                clips[s]["flags"].append("rate_outlier")

    # passage-level round trip (sentences concatenated, as the pipeline would)
    passages: dict[str, Any] = {}
    tot = {"spoken": [0, 0], "raw": [0, 0]}
    for pid, p in man["passages"].items():
        passages[pid] = {}
        for form in ("spoken", "raw"):
            f = p["forms"][form]
            if not all(clips.get(s, {}).get("ok") for s in f["stems"]):
                passages[pid][form] = {"err": None, "missing": True}
                continue
            hyp = ("" if lang == "ja" else " ").join(clips[s]["hyp"] for s in f["stems"])
            ref = p["reference"] if lang == "en" else f["text"]
            m = q.en_wer(ref, hyp) if lang == "en" else q.ja_cer(ref, hyp)
            e = m.get("wer", m.get("cer"))
            passages[pid][form] = {"err": e, "n_ref": m["n_ref"], "sub": m.get("sub"), "del": m.get("del"), "ins": m.get("ins"),
                                   "ops": m.get("ops", []), "hyp": hyp}
            if e is not None:
                tot[form][0] += (m.get("sub") or 0) + (m.get("del") or 0) + (m.get("ins") or 0)
                tot[form][1] += m["n_ref"]
        if p.get("onecall") and clips.get(p["onecall"], {}).get("ok"):
            oc = clips[p["onecall"]]
            passages[pid]["onecall"] = {"err": oc["err"], "flags": oc["flags"], "ops": oc["ops"], "duration_s": oc["duration_s"],
                                        "rtf": oc["rtf"]}
        elif p.get("onecall"):
            passages[pid]["onecall"] = {"err": None, "error": clips.get(p["onecall"], {}).get("error")}

    # speaker similarity (ECAPA cosine)
    long_ok = [s for s in ok if (clips[s]["duration_s"] or 0) >= 1.5 and s in emb]
    sim: dict[str, Any] = {}
    if long_ok:
        cen = np.mean([emb[s] for s in long_ok], axis=0)
        cons = [q.cosine(emb[s], cen) for s in long_ok]
        sim.update(consistency_mean=_mean(cons), consistency_p5=_pct(cons, 5), consistency_min=round(min(cons), 4))
        for mname, mv in master_embs.items():
            ids = [q.cosine(emb[s], mv) for s in long_ok]
            sim[f"to_{mname}_mean"] = _mean(ids)
            sim[f"to_{mname}_p5"] = _pct(ids, 5)
        for s in long_ok:
            clips[s]["sim_centroid"] = q.cosine(emb[s], cen)

    # re-derive the run-level collapse flag with the current rule (> 3x median AND slower than real time)
    run_flags = [x for x in (res.get("flags") or []) if x != "throughput_collapse"]
    rt = [clips[s]["rtf"] for s in ok[1:]]
    if len(rt) >= 3 and any(x > max(3 * statistics.median(rt), 1.0) for x in rt):
        run_flags.append("throughput_collapse")
    res["flags"] = run_flags

    flag_counts: dict[str, int] = {}
    for s in ok:
        for fl in clips[s]["flags"]:
            flag_counts[fl] = flag_counts.get(fl, 0) + 1
    rtfs = [clips[s]["rtf"] for s in ok]
    gen = sum(clips[s]["gen_s"] or 0 for s in ok)
    dur = sum(clips[s]["duration_s"] or 0 for s in ok)
    lufs = [clips[s]["audio"]["lufs"] for s in ok]
    moss = [clips[s]["audio"]["utmos"] for s in ok]
    summary = {
        "key": key, "engine": cfg["engine"], "lang": lang, "voice": cfg["voice"], "note": cfg["note"],
        "n_clips": len(sent), "n_ok": len(ok), "errors": [s for s in sent if not clips[s]["ok"]],
        "load_s": res.get("load_s"), "peak_vram_mb": res.get("peak_vram_mb"), "load_peak_vram_mb": res.get("load_peak_vram_mb"),
        "synth_peak_vram_mb": res.get("synth_peak_vram_mb"), "gpu": res.get("gpu"), "run_flags": res.get("flags"),
        "sentence_peak_vram_mb": max((items[s].get("peak_vram_mb") or 0 for s in sent if s in items), default=None),
        "onecall_peak_vram_mb": next((items[s].get("peak_vram_mb") for s in clips if s.endswith("__onecall") and s in items), None),
        "host_private_mb_max": res.get("private_mb_max"),
        "rtf_median": _med(rtfs), "rtf_p90": _pct(rtfs, 90), "rtf_aggregate": round(gen / dur, 3) if dur else None,
        "audio_s": round(dur, 1),
        "err_spoken": round(tot["spoken"][0] / tot["spoken"][1], 4) if tot["spoken"][1] else None,
        "err_raw": round(tot["raw"][0] / tot["raw"][1], 4) if tot["raw"][1] else None,
        "err_onecall": (passages.get("p6_long", {}).get("onecall") or {}).get("err"),
        "err_metric": "CER (kana reading)" if lang == "ja" else "WER",
        "flag_counts": flag_counts,
        "rate_median": _med([clips[s]["rate"] for s in ok]), "rate_unit": "mora/s" if lang == "ja" else "wpm",
        "max_pause_median_s": _med([clips[s]["audio"]["max_pause_s"] for s in ok]),
        "lead_mean_s": _mean([clips[s]["audio"]["lead_s"] for s in ok]),
        "trail_mean_s": _mean([clips[s]["audio"]["trail_s"] for s in ok]),
        "lufs_mean": _mean(lufs), "lufs_sd": round(statistics.pstdev([x for x in lufs if x is not None]), 2) if len(lufs) > 1 else None,
        "peak_dbfs_max": max((clips[s]["audio"]["peak_dbfs"] or -99) for s in ok) if ok else None,
        "f0_median_hz": _med([clips[s]["audio"]["f0_median_hz"] for s in ok]),
        "utmos_median": _med(moss), "utmos_p10": _pct(moss, 10),
        "similarity": sim,
    }
    return {"summary": summary, "passages": passages, "clips": clips}


def cmd_score(_args: list[str]) -> None:
    q = _q()
    mdir = BUILD / "_masters"
    master_embs = {k: v for k, v in np.load(mdir / "emb.npz").items() if k.startswith("ja-master-")} if (mdir / "emb.npz").exists() else {}
    primary = (VOICES_DIR / "PRIMARY").read_text().strip() if (VOICES_DIR / "PRIMARY").exists() else None
    voices = {}
    for key in run_keys():
        if not (run_dir(key) / "audio.json").exists() or not (run_dir(key) / "asr.json").exists():
            print(f"skip {key}: not scored yet")
            continue
        voices[key] = score_voice(q, key, master_embs)
        s = voices[key]["summary"]
        print(f"{key:36s} ok {s['n_ok']}/{s['n_clips']} rtf {s['rtf_median']} vram {s['peak_vram_mb']} "
              f"err sp {s['err_spoken']} raw {s['err_raw']} one {s['err_onecall']} flags {s['flag_counts']}")
    out = {
        "generated": time.strftime("%Y-%m-%d %H:%M"),
        "primary_master": primary,
        "masters": json.loads((mdir / "audio.json").read_text(encoding="utf-8")) if (mdir / "audio.json").exists() else {},
        "method": {
            "asr": "faster-whisper large-v3-turbo fp16, beam 5, fixed language, no prompt, no VAD filter",
            "wer": "Whisper EnglishTextNormalizer both sides + equivalences (laura~lora, jason~json, v ram~vram, ...), "
                   "spelled letters joined; passage WER = sentence transcripts concatenated vs texts.yaml reference",
            "cer": "hiragana reading (fugashi + unidic-lite), punctuation/whitespace stripped, probe tokens mapped to fixed "
                   "kana on both sides; reference = the text of the form that was sent",
            "similarity": "SpeechBrain ECAPA (spkrec-ecapa-voxceleb) cosine; consistency = clip vs voice centroid (clips >= 1.5 s); "
                          "to_<master> = clip vs Irodori JA master",
            "mos": "UTMOS22-strong (SpeechMOS); biased against high pitch - compare within a voice only",
            "rtf": "seconds of compute per second of audio (lower is faster), per sentence item, model already loaded and warmed up",
        },
        "voices": voices,
    }
    RESULTS.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {RESULTS} ({RESULTS.stat().st_size / 1e6:.1f} MB)")


# ----------------------------------------------------------------------------------------------- samples

GAP_S = 0.3
TARGET_LUFS = -18.0


def _encode(x: np.ndarray, sr: int, out: Path) -> None:
    import pyloudnorm as pyln

    lufs = pyln.Meter(sr).integrated_loudness(x.astype(np.float64))
    gain = 10 ** ((TARGET_LUFS - lufs) / 20) if np.isfinite(lufs) else 1.0
    peak = float(np.max(np.abs(x))) or 1.0
    gain = min(gain, 10 ** (-1 / 20) / peak)  # keep peaks <= -1 dBFS
    y = np.clip(x * gain, -1, 1)
    out.parent.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", "96k", str(out)], input=pcm, check=True)


def cmd_samples(args: list[str]) -> None:
    import soundfile as sf

    for key in (args or run_keys()):
        d = run_dir(key)
        man = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
        dest = SAMPLES / key
        for pid, p in man["passages"].items():
            for form in ("spoken", "raw"):
                stems = p["forms"][form]["stems"]
                wavs = [d / "wav" / f"{s}.wav" for s in stems]
                if not all(w.exists() for w in wavs):
                    continue
                parts, sr = [], None
                for w in wavs:
                    x, sr = sf.read(w, dtype="float32")
                    parts += [x, np.zeros(int(GAP_S * sr), np.float32)]
                _encode(np.concatenate(parts[:-1]), sr, dest / f"{pid}{'' if form == 'spoken' else '_raw'}.mp3")
            if p.get("onecall") and (d / "wav" / f"{p['onecall']}.wav").exists():
                x, sr = sf.read(d / "wav" / f"{p['onecall']}.wav", dtype="float32")
                _encode(x, sr, dest / f"{pid}_onecall.mp3")
        print(f"samples {key}")
    total = sum(f.stat().st_size for f in SAMPLES.rglob("*.mp3"))
    print(f"samples total {total / 1e6:.1f} MB")


# ------------------------------------------------------------------------------------------------ design

def _loudness_sd(x: np.ndarray, sr: int, win: float = 1.0) -> float | None:
    """SD (dB) of 1-s RMS level over voiced windows: a simple loudness-stability measure."""
    n = int(win * sr)
    lv = [20 * np.log10(np.sqrt(np.mean(x[i:i + n] ** 2)) + 1e-9) for i in range(0, x.size - n + 1, n // 2)]
    lv = [v for v in lv if v > max(lv) - 25]  # drop pauses
    return round(float(np.std(lv)), 2) if len(lv) > 2 else None


def cmd_design(args: list[str]) -> None:
    """Score the caption x seed candidates and freeze one master per caption (research/tts/voices)."""
    import hashlib

    import pyloudnorm as pyln
    import soundfile as sf

    q = _q()
    d = run_dir("design")
    spec = json.loads((d / "design.json").read_text(encoding="utf-8"))
    asr = json.loads((d / "asr.json").read_text(encoding="utf-8"))
    audio = _audio_with_mos(d)
    emb = dict(np.load(d / "emb.npz"))
    rows = []
    for cap in spec["captions"]:
        stems = [f"{cap}-s{s}" for s in spec["seeds"]]
        for st in stems:
            x, sr = q.load_mono(d / "wav" / f"{st}.wav")
            a = audio[st]
            m = q.ja_cer(spec["text"], asr[st]["text"])
            others = [q.cosine(emb[st], emb[o]) for o in stems if o != st]
            rows.append({"stem": st, "caption": cap, "seed": int(st.rsplit("-s", 1)[1]), "cer": m["cer"], "ops": m["ops"],
                         "asr": asr[st]["text"], "clipped": a["clipped_samples"], "peak_dbfs": a["peak_dbfs"], "lufs": a["lufs"],
                         "loudness_sd_db": _loudness_sd(x, sr), "max_pause_s": a["max_pause_s"], "f0_median_hz": a["f0_median_hz"],
                         "f0_iqr_hz": a["f0_iqr_hz"], "utmos": a.get("utmos"), "sim_to_other_seeds": _mean(others),
                         "duration_s": a["duration_s"]})
    # choose per caption: exact/near-exact round trip first, then no clipping, stable loudness, then within-caption MOS
    chosen = {}
    for cap in spec["captions"]:
        cands = [r for r in rows if r["caption"] == cap]
        cands.sort(key=lambda r: (round(r["cer"], 2), r["clipped"] > 0, r["loudness_sd_db"] or 99, -(r["utmos"] or 0)))
        chosen[cap] = cands[0]
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    snap = sorted((Path.home() / ".cache/huggingface/hub/models--Aratako--Irodori-TTS-v4.1-Small/snapshots").glob("*"))
    for cap, r in chosen.items():
        x, sr = sf.read(d / "wav" / f"{r['stem']}.wav", dtype="float32")
        x16, _ = q.load_mono(d / "wav" / f"{r['stem']}.wav", 16000)
        v = q.vad_pauses(x16)
        a0 = max(0, int((v.get("speech_start_s", 0) - 0.15) * sr))
        a1 = min(x.size, int((v.get("speech_end_s", x.size / sr) + 0.25) * sr))
        y = x[a0:a1].astype(np.float64)
        gain = 10 ** ((-16.0 - pyln.Meter(sr).integrated_loudness(y)) / 20)
        gain = min(gain, 10 ** (-1 / 20) / np.max(np.abs(y)))
        y = (y * gain).astype(np.float32)
        out = VOICES_DIR / f"ja-master-{cap}.wav"
        sf.write(out, y, sr, subtype="PCM_16")
        prov = {
            "name": f"ja-master-{cap}",
            "engine": "Irodori-TTS v4.1-Small (MIT weights + Ethical Restrictions), caption-only voice design (no reference audio)",
            "checkpoint": "Aratako/Irodori-TTS-v4.1-Small",
            "checkpoint_revision": snap[-1].name if snap else None,
            "codec": "Aratako/Semantic-DACVAE-Japanese-32dim",
            "precision": "bf16 model, fp32 codec",
            "sampling": {"num_steps": 40, "cfg_scale_text": 3.0, "cfg_scale_caption": 3.0, "seed": r["seed"]},
            "caption": spec["captions"][cap],
            "transcript": spec["text"],
            "post": "silence-trimmed (VAD, 0.15 s lead / 0.25 s tail kept), normalised to -16 LUFS integrated, peak <= -1 dBFS, 48 kHz PCM16",
            "duration_s": round(y.size / sr, 2),
            "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
            "selection": {k: r[k] for k in ("cer", "clipped", "loudness_sd_db", "utmos", "f0_median_hz", "sim_to_other_seeds")},
            "provenance": "Fully synthetic voice designed from a Japanese text caption. No recording of any real person or "
                          "character was used, and the caption names no person or character. Output carries Irodori's "
                          "SilentCipher watermark (payload IRDTS).",
            "created": time.strftime("%Y-%m-%d"),
        }
        (VOICES_DIR / f"ja-master-{cap}.yaml").write_text(yaml.safe_dump(prov, allow_unicode=True, sort_keys=False), encoding="utf-8")
    (d / "design_scores.json").write_text(json.dumps({"rows": rows, "chosen": {c: r["stem"] for c, r in chosen.items()}},
                                                     ensure_ascii=False, indent=1), encoding="utf-8")
    for r in rows:
        mark = "*" if chosen[r["caption"]]["stem"] == r["stem"] else " "
        print(f"{mark} {r['stem']:16s} cer {r['cer']:.3f} clip {r['clipped']:3d} peak {r['peak_dbfs']:6.2f} lufs {r['lufs']} "
              f"ldsd {r['loudness_sd_db']} pause {r['max_pause_s']} f0 {r['f0_median_hz']} iqr {r['f0_iqr_hz']} "
              f"mos {r['utmos']} simseeds {r['sim_to_other_seeds']} ops {[(o['ref'], o['hyp']) for o in r['ops']][:4]}")
    # design candidates for the listening page
    for r in rows:
        x, sr = sf.read(d / "wav" / f"{r['stem']}.wav", dtype="float32")
        _encode(x, sr, SAMPLES / "_design" / f"{r['stem']}.mp3")


# --------------------------------------------------------------------------------------------- bootstrap

def cmd_bootstrap(args: list[str]) -> None:
    """Freeze an English reference from a cross-lingual clone run (landscape §2.2 step 4):
    take error-free, unflagged spoken-form sentences with the highest similarity to the JA master,
    join them (0.3 s gaps) to ~10-15 s -> research/tts/voices/en-master-<master>.wav + provenance."""
    import hashlib

    import pyloudnorm as pyln
    import soundfile as sf

    src, mname = args[0], args[1]  # e.g. qwen3/base06b-icl-soft soft
    q = _q()
    d = run_dir(src)
    res = json.loads(RESULTS.read_text(encoding="utf-8"))["voices"][src]
    emb = dict(np.load(d / "emb.npz"))
    mv = dict(np.load(BUILD / "_masters" / "emb.npz"))[f"ja-master-{mname}"]
    cands = []
    for stem, c in res["clips"].items():
        if not c.get("ok") or "__spoken__" not in stem or c["flags"] or c["err"] or not (2.5 <= c["duration_s"] <= 9):
            continue
        cands.append((q.cosine(emb[stem], mv), stem, c))
    cands.sort(reverse=True)
    picked, total = [], 0.0
    for sim, stem, c in cands:
        if total >= 10.0:
            break
        picked.append((sim, stem, c))
        total += c["duration_s"]
    parts, sr = [], None
    for _, stem, _ in picked:
        x, sr = sf.read(d / "wav" / f"{stem}.wav", dtype="float32")
        parts += [x, np.zeros(int(0.3 * sr), np.float32)]
    y = np.concatenate(parts[:-1]).astype(np.float64)
    gain = min(10 ** ((-16.0 - pyln.Meter(sr).integrated_loudness(y)) / 20), 10 ** (-1 / 20) / np.max(np.abs(y)))
    out = VOICES_DIR / f"en-master-{mname}.wav"
    sf.write(out, (y * gain).astype(np.float32), sr, subtype="PCM_16")
    transcript = " ".join(c["text"] for _, _, c in picked)
    prov = {
        "name": f"en-master-{mname}",
        "engine": f"{src} (Qwen3-TTS 12Hz 0.6B-Base, Apache-2.0) cross-lingual clone of ja-master-{mname}",
        "method": "bootstrap: error-free, unflagged benchmark sentences with the highest ECAPA similarity to the JA master, "
                  "joined with 0.3 s gaps, normalised to -16 LUFS / peak <= -1 dBFS",
        "sentences": [s for _, s, _ in picked],
        "similarity_to_ja_master": [round(x, 3) for x, _, _ in picked],
        "transcript": transcript,
        "duration_s": round(y.size / sr, 2),
        "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
        "provenance": f"Fully synthetic: derived only from ja-master-{mname} (itself caption-designed in Irodori). "
                      "No recording of any real person or character was used.",
        "created": time.strftime("%Y-%m-%d"),
    }
    (VOICES_DIR / f"en-master-{mname}.yaml").write_text(yaml.safe_dump(prov, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(json.dumps(prov, indent=1, ensure_ascii=False))


# ------------------------------------------------------------------------------------------------ tables

def cmd_tables(_args: list[str]) -> None:
    """Markdown tables for benchmark.md (printed to stdout)."""
    res = json.loads(RESULTS.read_text(encoding="utf-8"))
    primary = res.get("primary_master")
    V = res["voices"]

    def f(x, nd=3):
        return "–" if x is None else (f"{x:.{nd}f}" if isinstance(x, float) else str(x))

    for eng in ("irodori", "qwen3", "chatterbox", "kokoro"):
        keys = [k for k in V if V[k]["summary"]["engine"] == eng]
        if not keys:
            continue
        print(f"\n#### {eng}\n")
        print("| voice | lang | load s | torch reserved MB: load / sentences / one call | smi peak MB (job) | spill (job) | RTF median (p90) | "
              "err spoken | err raw | p6 one call | consistency | sim to master | F0 Hz | rate | LUFS mean ± sd | flags |")
        print("|" + "---|" * 16)
        for k in sorted(keys):
            s = V[k]["summary"]
            g = s.get("gpu") or {}
            sim = s["similarity"]
            spill = ", ".join(s.get("run_flags") or []) or "no"
            if g.get("wddm_shared_peak_mb") is not None:
                spill += f" ({g['wddm_shared_peak_mb'] - (g.get('wddm_shared_baseline_mb') or 0):.0f} MB shared)"
            flags = ", ".join(f"{a} {b}" for a, b in sorted(s["flag_counts"].items())) or "none"
            print(f"| {k.split('/', 1)[1]} | {s['lang']} | {f(s['load_s'], 0)} | {f(s['load_peak_vram_mb'], 0)} / {f(s['sentence_peak_vram_mb'], 0)} / {f(s['onecall_peak_vram_mb'], 0)} | "
                  f"{f(g.get('smi_peak_used_mb'), 0)} | {spill} | {f(s['rtf_median'], 2)} ({f(s['rtf_p90'], 2)}) | "
                  f"{f(s['err_spoken'])} | {f(s['err_raw'])} | {f(s['err_onecall'])} | {f(sim.get('consistency_mean'))} "
                  f"(min {f(sim.get('consistency_min'))}) | {f(sim.get(f'to_ja-master-{primary}_mean'))} | {f(s['f0_median_hz'], 0)} | "
                  f"{f(s['rate_median'], 1)} {s['rate_unit']} | {f(s['lufs_mean'], 1)} ± {f(s['lufs_sd'], 1)} | {flags} |")

    print("\n#### Identity: similarity of each voice's clips to every JA master (ECAPA cosine, mean)\n")
    ms = sorted({k[3:] for s in V.values() for k in s["summary"]["similarity"] if k.startswith("to_") and k.endswith("_mean")})
    ms = [m[:-5] for m in ms]
    print("| voice | " + " | ".join(ms) + " |")
    print("|---|" + "---|" * len(ms))
    for k in sorted(V):
        sim = V[k]["summary"]["similarity"]
        print(f"| {k} | " + " | ".join(f(sim.get(f'to_{m}_mean')) for m in ms) + " |")

    print("\n#### Round-trip errors by passage (spoken / raw)\n")
    pids = list(next(iter(V.values()))["passages"].keys())
    print("| voice | " + " | ".join(pids) + " |")
    print("|---|" + "---|" * len(pids))
    for k in sorted(V):
        P = V[k]["passages"]
        print(f"| {k} | " + " | ".join(f"{f((P[p].get('spoken') or {}).get('err'), 2)} / {f((P[p].get('raw') or {}).get('err'), 2)}" for p in pids) + " |")

    print("\n#### Misreadings (passage-level alignment, raw form; substitutions/deletions, first 6 per passage)\n")
    for k in sorted(V):
        out = []
        for pid, P in V[k]["passages"].items():
            for form in ("raw", "spoken"):
                ops = [o for o in (P.get(form) or {}).get("ops", []) if o["type"] in ("substitute", "delete", "insert")]
                if ops:
                    out.append(f"{pid}/{form}: " + "; ".join(f"`{o['ref'] or '∅'}`→`{o['hyp'] or '∅'}`" for o in ops[:6]))
        print(f"- **{k}**: " + (" · ".join(out) if out else "no errors"))

    print("\n#### Flagged sentences\n")
    for k in sorted(V):
        bad = [(s, c) for s, c in V[k]["clips"].items() if c.get("ok") and c["flags"]]
        if bad:
            print(f"- **{k}**: " + "; ".join(f"{s} [{','.join(c['flags'])}] “{c['hyp'][:80]}”" for s, c in bad[:8]))


# -------------------------------------------------------------------------------------------------- html

def _esc(s: str) -> str:
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def cmd_html(_args: list[str]) -> None:
    res = json.loads(RESULTS.read_text(encoding="utf-8"))
    voices = res["voices"]
    order = sorted(voices, key=lambda k: (voices[k]["summary"]["lang"] != "en", k))
    en_corpus = {p["id"]: p for p in load_corpus("en")}
    ja_corpus = {p["id"]: p for p in load_corpus("ja")}
    primary = res.get("primary_master")

    def fmt(x, nd=3):
        return "–" if x is None else (f"{x:.{nd}f}" if isinstance(x, float) else str(x))

    def audio(rel: str) -> str:
        return f'<audio controls preload="none" src="{_esc(rel)}"></audio>' if (ROOT / "research" / "tts" / rel).exists() else '<span class="na">n/a</span>'

    rows_sum = []
    for k in order:
        s = voices[k]["summary"]
        sim = s["similarity"]
        ident = sim.get(f"to_ja-master-{primary}_mean")
        rows_sum.append(
            f'<tr data-lang="{s["lang"]}"><td><button class="star" data-k="{_esc(k)}" aria-label="mark favourite">☆</button></td>'
            f'<td><b>{_esc(k)}</b><div class="note">{_esc(s["note"])}</div></td><td>{s["lang"].upper()}</td>'
            f'<td>{fmt(s["peak_vram_mb"], 0)}</td><td>{fmt(s["rtf_median"], 2)}</td>'
            f'<td>{fmt(s["err_spoken"])}</td><td>{fmt(s["err_raw"])}</td><td>{fmt(s["err_onecall"])}</td>'
            f'<td>{fmt(sim.get("consistency_mean"))}</td><td>{fmt(ident)}</td><td>{fmt(s["f0_median_hz"], 0)}</td>'
            f'<td>{sum(s["flag_counts"].values())}</td></tr>')

    masters = "".join(
        f'<div class="card"><div class="lbl">{_esc(w.stem)}{" (primary)" if primary and w.stem.endswith(primary) else ""}</div>'
        f'{audio("voices/" + w.name)}</div>' for w in sorted(VOICES_DIR.glob("*.wav")))
    design = "".join(
        f'<div class="card"><div class="lbl">{_esc(f.stem)}</div>{audio("samples/_design/" + f.name)}</div>'
        for f in sorted((SAMPLES / "_design").glob("*.mp3")))

    sections = []
    for pid in en_corpus:
        head = (f'<div class="texts"><div><span class="tag">EN spoken</span> {_esc(" ".join(en_corpus[pid]["spoken"].split()))}</div>'
                f'<div class="raw"><span class="tag">EN raw</span> {_esc(" ".join(en_corpus[pid]["raw"].split()))}</div>'
                f'<div><span class="tag">JA spoken</span> {_esc(ja_corpus[pid]["spoken"])}</div>'
                f'<div class="raw"><span class="tag">JA raw</span> {_esc(ja_corpus[pid]["raw"])}</div></div>')
        rows = []
        for k in order:
            s = voices[k]["summary"]
            pm = voices[k]["passages"].get(pid, {})
            cells = []
            for form, suffix in (("spoken", ""), ("raw", "_raw"), ("onecall", "_onecall")):
                if form == "onecall" and pid != "p6_long":
                    continue
                e = (pm.get(form) or {}).get("err")
                cells.append(f'<td class="{form}">{audio(f"samples/{k}/{pid}{suffix}.mp3")}<div class="m">{s["err_metric"].split()[0]} {fmt(e)}</div></td>')
            rows.append(f'<tr data-lang="{s["lang"]}"><td class="vk"><b>{_esc(k)}</b></td>{"".join(cells)}</tr>')
        oc = '<th class="onecall">one call</th>' if pid == "p6_long" else ""
        sections.append(f'<section><h2>{pid}</h2>{head}<table class="grid"><thead><tr><th>voice</th><th>spoken</th>'
                        f'<th class="raw">raw</th>{oc}</tr></thead><tbody>{"".join(rows)}</tbody></table></section>')

    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TTS Listening Board</title>
<style>
:root {{ --bg:#fbfaf7; --fg:#1d1d1f; --mut:#6b6b70; --line:#e3e1db; --card:#fff; --acc:#b3264b; --tag:#efe9e0; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#16161a; --fg:#ececef; --mut:#a0a0a8; --line:#2c2c33; --card:#1e1e24; --acc:#ff7a9c; --tag:#2a2a31; }} }}
:root[data-theme="dark"] {{ --bg:#16161a; --fg:#ececef; --mut:#a0a0a8; --line:#2c2c33; --card:#1e1e24; --acc:#ff7a9c; --tag:#2a2a31; }}
body {{ margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui,-apple-system,"Segoe UI","Hiragino Sans","Yu Gothic UI",sans-serif; }}
main {{ max-width:1200px; margin:0 auto; padding:24px 16px 64px; }}
h1 {{ font-size:1.6rem; margin:0 0 4px; }} h2 {{ margin:40px 0 8px; font-size:1.2rem; }}
.warn {{ border-left:4px solid var(--acc); background:var(--card); padding:10px 14px; margin:16px 0; }}
.note, .m, .na, .lbl {{ color:var(--mut); font-size:.8rem; }}
.controls {{ position:sticky; top:0; background:var(--bg); padding:8px 0; border-bottom:1px solid var(--line); z-index:2; display:flex; gap:16px; flex-wrap:wrap; }}
.cards {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:10px; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:8px; padding:8px; }}
.scroll {{ overflow-x:auto; }}
table {{ border-collapse:collapse; width:100%; }} th, td {{ border-bottom:1px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; }}
th {{ font-size:.8rem; color:var(--mut); font-weight:600; }}
audio {{ width:230px; height:32px; }}
.texts div {{ margin:4px 0; }} .tag {{ background:var(--tag); border-radius:4px; padding:1px 6px; font-size:.75rem; margin-right:6px; }}
.star {{ background:none; border:0; font-size:1.2rem; cursor:pointer; color:var(--acc); }}
body.noraw .raw {{ display:none; }} body.onlyen tr[data-lang="ja"], body.onlyja tr[data-lang="en"] {{ display:none; }}
</style></head>
<body><main>
<h1>TTS Listening Board</h1>
<div class="note">Generated {res['generated']} from research/tts/results.json. Each passage was synthesised sentence by sentence
(as the production pipeline does) and joined with {GAP_S:.1f} s gaps; "one call" is the whole passage in a single request.
All clips are loudness-matched to {TARGET_LUFS:.0f} LUFS (peaks &le; &minus;1 dBFS) so level differences do not bias you;
engine-native loudness is in results.json.</div>
<div class="warn"><b>Final voice choice must be confirmed by listening.</b> The objective metrics (ASR round trip, ECAPA similarity,
MOS) cannot judge anime-style timbre, accent carry-over from the Japanese reference, or whether the delivery fits calm research
narration. MOS predictors are biased against high-pitched voices, so they were never used to rank voices.</div>
<div class="controls"><label><input type="checkbox" id="raw" checked> show raw-form clips</label>
<label><input type="radio" name="lang" value="" checked> all</label><label><input type="radio" name="lang" value="onlyen"> EN only</label>
<label><input type="radio" name="lang" value="onlyja"> JA only</label><span class="note" id="favs"></span></div>
<h2>Master voices (Irodori, Japanese)</h2><div class="cards">{masters}</div>
<h2>Voice-design candidates (caption × seed)</h2><div class="cards">{design}</div>
<h2>Summary</h2><div class="scroll"><table><thead><tr><th></th><th>voice</th><th>lang</th><th>peak VRAM MB</th><th>RTF</th>
<th>WER/CER spoken</th><th>WER/CER raw</th><th>one call</th><th>consistency</th><th>sim to master</th><th>F0 Hz</th><th>flags</th></tr></thead>
<tbody>{"".join(rows_sum)}</tbody></table></div>
<div class="note">RTF = seconds of compute per second of audio (lower is faster). WER (EN) / kana-reading CER (JA). Similarity = ECAPA cosine;
cross-lingual similarity is inherently lower than same-language similarity.</div>
{"".join(f'<div class="scroll">{x}</div>' for x in sections)}
</main>
<script>
const b = document.body;
document.getElementById('raw').addEventListener('change', e => b.classList.toggle('noraw', !e.target.checked));
document.querySelectorAll('input[name=lang]').forEach(r => r.addEventListener('change', e => {{
  b.classList.remove('onlyen', 'onlyja'); if (e.target.value) b.classList.add(e.target.value); }}));
let favs = [];
try {{ favs = JSON.parse(localStorage.getItem('tts-favs') || '[]'); }} catch (e) {{}}
function paint() {{
  document.querySelectorAll('.star').forEach(s => s.textContent = favs.includes(s.dataset.k) ? '★' : '☆');
  document.getElementById('favs').textContent = favs.length ? 'favourites: ' + favs.join(', ') : '';
}}
document.querySelectorAll('.star').forEach(s => s.addEventListener('click', () => {{
  const k = s.dataset.k; favs = favs.includes(k) ? favs.filter(x => x !== k) : favs.concat([k]);
  try {{ localStorage.setItem('tts-favs', JSON.stringify(favs)); }} catch (e) {{}}
  paint(); }}));
paint();
// only one clip plays at a time
document.addEventListener('play', e => document.querySelectorAll('audio').forEach(a => {{ if (a !== e.target) a.pause(); }}), true);
</script></body></html>"""
    out = ROOT / "research" / "tts" / "listen.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "list":
        for k, v in configs().items():
            print(f"{k:40s} {v['lang']}  {v['note']}")
    else:
        {"run": cmd_run, "asr": cmd_asr, "audio": cmd_audio, "masters": cmd_masters, "score": cmd_score,
         "samples": cmd_samples, "html": cmd_html, "design": cmd_design, "tables": cmd_tables,
         "bootstrap": cmd_bootstrap}[cmd](rest)
