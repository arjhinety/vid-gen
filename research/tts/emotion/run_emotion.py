"""Build + run emotion-test jobs. Usage: python run_emotion.py <config> [...]   (system python, needs pyyaml? no)

Each config = one engine adapter process (one GPU process at a time), one loaded model, N conditions x 6 lines.
Raw wavs + jobs + results go to build/emotion/<config>/; listening mp3s are made by make_page.py.
Refuses to load a model when < 3 GB RAM is available (waits up to --wait seconds, then records a skip).
"""
import json, subprocess, sys, time, os, ctypes
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lines import *

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "build" / "emotion"


def avail_gb():
    class MS(ctypes.Structure):
        _fields_ = [("l", ctypes.c_ulong), ("load", ctypes.c_ulong)] + [(n, ctypes.c_ulonglong) for n in
                    ("tp", "ap", "tpf", "apf", "tv", "av", "ev")]
    m = MS(); m.l = ctypes.sizeof(MS); ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ap / 2**30


def items(cond_id, texts, lang, extra=None, seed=1234):
    d = OUT / CFG_NAME / cond_id
    out = []
    for L in LINES:
        it = {"id": f"{cond_id}/{L['id']}", "text": texts[L["id"]], "out": str(d / f"{L['id']}.wav"), "seed": seed, "lang": lang}
        if extra:
            it.update({k: v(L["id"]) if callable(v) else v for k, v in extra.items()})
        out.append(it)
    return out


def plain(lang):
    return {L["id"]: L[lang] for L in LINES}


CONFIGS = {}


def cfg(name):
    def deco(f):
        CONFIGS[name] = f
        return f
    return deco


@cfg("qwen3-cv17-en")
def _():
    v = dict(model="Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", mode="custom", speaker="Serena", language="English", seed=1234)
    its = items("neutral", plain("en"), "en") + items("directed", plain("en"), "en", {"instruct": lambda i: QWEN_INSTR[i]})
    return "qwen3", v, its


@cfg("qwen3-cv17-ja")
def _():
    v = dict(model="Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", mode="custom", speaker="Ono_Anna", language="Japanese", seed=1234)
    its = items("neutral", plain("ja"), "ja") + items("directed", plain("ja"), "ja", {"instruct": lambda i: QWEN_INSTR_JA[i]})
    return "qwen3", v, its


@cfg("voxcpm-en")
def _():
    v = dict(mode="design", voice_desc="A young woman, clear and calm, documentary narrator voice", seed=1234)
    its = items("neutral", plain("en"), "en") + items("directed", plain("en"), "en", {"style": lambda i: VOX_STYLE[i]})
    return "voxcpm", v, its


@cfg("voxcpm-clone-en")
def _():
    v = dict(mode="clone", ref_wav="research/tts/voices/en-master-soft.wav", seed=1234)
    its = items("neutral", plain("en"), "en") + items("directed", plain("en"), "en", {"style": lambda i: VOX_STYLE[i]})
    return "voxcpm", v, its


@cfg("voxcpm-ja")
def _():
    v = dict(mode="design", voice_desc="明るく澄んだ若い女性の声、落ち着いた丁寧なナレーション", seed=1234)
    its = items("neutral", plain("ja"), "ja") + items("directed", plain("ja"), "ja", {"style": lambda i: VOX_STYLE_JA[i]})
    return "voxcpm", v, its


@cfg("irodori-ja-x")
def _():
    v = dict(checkpoint="Aratako/Irodori-TTS-v4.1-Small", ref_wav="research/tts/voices/ja-master-heroine.wav",
             cache_ref_latent=True, precision="bf16", num_steps=40, cfg_scale_text=3.0, cfg_scale_speaker=5.0,
             duration_scale=1.0, seed=1234, per_item_caption=True)
    its = (items("caption", plain("ja"), "ja", {"caption": lambda i: CAP_JA[i]})
           + items("caption+emoji-a", IRO_A, "ja", {"caption": lambda i: CAP_JA[i]}))
    return "irodori", v, its


@cfg("irodori-ja-c")
def _():
    v = dict(checkpoint="Aratako/Irodori-TTS-v4.1-Small", ref_wav="research/tts/voices/ja-master-heroine.wav",
             cache_ref_latent=True, precision="bf16", num_steps=40, cfg_scale_text=3.0, cfg_scale_speaker=5.0,
             duration_scale=1.0, seed=1234)
    return "irodori", v, items("emoji-c-stacked", IRO_C, "ja")


@cfg("kokoro-en")
def _():
    v = dict(voice="af_heart", speed=1.0, lang_code="a", seed=1234)
    return "kokoro", v, items("neutral", plain("en"), "en")


@cfg("irodori-ja")
def _():
    v = json.loads((REPO / "voices" / "narrator-ja.yaml").read_text(encoding="utf-8")) if False else None
    import re
    # narrator-ja params, copied (voices/*.yaml stays untouched)
    v = dict(checkpoint="Aratako/Irodori-TTS-v4.1-Small", ref_wav="research/tts/voices/ja-master-heroine.wav",
             cache_ref_latent=True, precision="bf16", num_steps=40, cfg_scale_text=3.0, cfg_scale_speaker=5.0,
             duration_scale=1.0, seed=1234)
    its = (items("neutral", plain("ja"), "ja") + items("emoji-a", IRO_A, "ja") + items("emoji-b", IRO_B, "ja"))
    return "irodori", v, its


def main():
    global CFG_NAME
    wait = 600
    for name in [a for a in sys.argv[1:] if not a.startswith("--")]:
        CFG_NAME = name
        engine, voice, its = CONFIGS[name]()
        d = OUT / name; d.mkdir(parents=True, exist_ok=True)
        t0 = time.time()
        while avail_gb() < 3.0 and time.time() - t0 < wait:
            print(f"[wait] avail RAM {avail_gb():.2f} GB < 3", flush=True); time.sleep(15)
        a = avail_gb()
        if a < 3.0:
            (d / "SKIPPED.txt").write_text(f"skipped: only {a:.2f} GB RAM available after {wait}s\n"); print("SKIPPED", name); continue
        job = {"engine": engine, "voice": voice, "device": "cuda", "items": its, "ram_avail_gb_at_start": round(a, 2)}
        jp = d / "job.json"; jp.write_text(json.dumps(job, ensure_ascii=False, indent=1), encoding="utf-8")
        py = {"irodori": "third_party/irodori-tts/.venv/Scripts/python.exe"}.get(engine, f"py/tts/{engine}/.venv/Scripts/python.exe")
        env = dict(os.environ, PYTHONIOENCODING="utf-8", HF_HUB_DISABLE_XET="1")
        with open(d / "log.txt", "w", encoding="utf-8") as lf:
            r = subprocess.run([str(REPO / py), str(REPO / "py" / "tts" / engine / "run.py"), str(jp)], cwd=REPO, env=env, stdout=lf, stderr=subprocess.STDOUT)
        print(name, "exit", r.returncode)


main()
