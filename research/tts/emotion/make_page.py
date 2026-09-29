"""Encode listening mp3s (ffmpeg) into research/tts/emotion/samples/ and write listen.html from results.json."""
import json, subprocess, html, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lines import *
HERE = Path(__file__).parent; REPO = HERE.parents[2]; OUT = REPO / "build" / "emotion"
R = json.loads((HERE / "results.json").read_text(encoding="utf-8"))
byk = {(r["group"], r["cond"]): r for r in R}

NAMES = {
 "baseline-kokoro-af_heart": "BASELINE  Kokoro af_heart (current EN voice)",
 "kokoro-en": "BASELINE  Kokoro af_heart, exact test lines",
 "baseline-irodori-heroine": "BASELINE  Irodori heroine clone (current JA voice, no tags)",
 "qwen3-cv17-en": "Qwen3-TTS 1.7B CustomVoice (Serena), per-line instruction",
 "voxcpm-en": "VoxCPM2 2B, voice design + style prefix",
 "voxcpm-clone-en": "VoxCPM2 2B, controllable clone of our synthetic EN master + style prefix",
 "irodori-ja": "Irodori v4.1-Small heroine clone + emoji tags (A: semantic, B: one leading emoji)",
 "irodori-ja-c": "Irodori v4.1-Small heroine clone + STACKED emoji (two per clause)",
 "irodori-ja-x": "Irodori v4.1-Small heroine clone + per-line style caption",
 "qwen3-cv17-ja": "Qwen3-TTS 1.7B CustomVoice (Ono_Anna), per-line instruction",
 "voxcpm-ja": "VoxCPM2 2B, voice design + style prefix",
}
DIR = {  # what was sent per (group, cond)
 ("qwen3-cv17-en", "directed"): QWEN_INSTR, ("qwen3-cv17-ja", "directed"): QWEN_INSTR_JA,
 ("irodori-ja-c", "emoji-c-stacked"): IRO_C, ("irodori-ja-x", "caption"): CAP_JA,
 ("irodori-ja-x", "caption+emoji-a"): {k: CAP_JA[k] + "  +  " + IRO_A[k] for k in IRO_A}, ("irodori-ja", "emoji-a"): IRO_A, ("irodori-ja", "emoji-b"): IRO_B,
 ("voxcpm-en", "directed"): VOX_STYLE, ("voxcpm-clone-en", "directed"): VOX_STYLE, ("voxcpm-ja", "directed"): VOX_STYLE_JA,
}

def mp3(group, cond, lid, src):
    dst = HERE / "samples" / group / cond / f"{lid}.mp3"
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        dst.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ac", "1", "-b:a", "96k", str(dst)], check=True)
    return dst.relative_to(HERE).as_posix()

def wavpath(group, cond, lid):
    if group.startswith("baseline-irodori"):
        return REPO / "build/opengrad-study-001/ja/audio/lines" / f"{next(l['stem'] for l in LINES if l['id']==lid)}.wav"
    return OUT / group / cond / f"{lid}.wav"

def block(lang):
    groups = []
    for (g, c), r in byk.items():
        if r["lang"] != lang or g == "baseline-kokoro-af_heart": continue
        groups.append((g, c, r))
    order = lambda t: (0 if t[0].startswith(("kokoro", "baseline")) else 1, t[0], t[1])
    groups.sort(key=order)
    out = []
    for L in LINES:
        out.append(f'<section><h3>{L["id"]} <span class="emo">{html.escape(L["emo"])}</span></h3><p class="txt" lang="{lang}">{html.escape(L[lang])}</p><div class="rows">')
        for g, c, r in groups:
            row = next((x for x in r["rows"] if x["line"] == L["id"]), None)
            w = wavpath(g, c, L["id"])
            if not row or not w.exists(): continue
            d = DIR.get((g, c), {}).get(L["id"])
            base = g.startswith(("kokoro", "baseline"))
            out.append(f'<div class="row{" base" if base else ""}"><div class="lab"><b>{html.escape(NAMES.get(g, g))}</b> <i>{c}</i>'
                       + (f'<br><code>{html.escape(d)}</code>' if d else '') + '</div>'
                       f'<audio controls preload="none" src="{mp3(g, c, L["id"], w)}"></audio>'
                       f'<div class="m">{row["dur_s"]}s &middot; {"WER" if lang=="en" else "CER"} {row["err"]:.0%} &middot; line F0 SD {row["sd_st"]} st</div></div>')
        out.append("</div></section>")
    return "\n".join(out), groups

def table(groups, lang):
    rows = "".join(f'<tr><td>{html.escape(NAMES.get(g, g))}</td><td>{c}</td><td>{r["pooled_sd_st"]}</td><td>{r["range_10_90_st"]}</td>'
                   f'<td>{r["err_mean"]:.1%}</td><td>{r["rate_mean"]}</td><td>{r["f0_med"]:.0f}</td></tr>' for g, c, r in groups)
    return f'<table><tr><th>engine</th><th>condition</th><th>pitch SD (st)</th><th>10-90 range (st)</th><th>{"WER" if lang=="en" else "CER"} mean</th><th>{"words/s" if lang=="en" else "mora/s"}</th><th>median F0 Hz</th></tr>{rows}</table>'

en, gen = block("en"); ja, gja = block("ja")
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Emotion-directed TTS: listening test</title>
<style>
:root{{--bg:#fafaf7;--fg:#1c1c1a;--mut:#6b6b66;--card:#fff;--line:#e2e2da;--acc:#0b6b5f;--base:#f3efe3}}
@media(prefers-color-scheme:dark){{:root{{--bg:#151614;--fg:#ececE6;--mut:#9a9a92;--card:#1d1e1b;--line:#33342f;--acc:#5fd0be;--base:#26251c}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}}
main{{max-width:980px;margin:0 auto;padding:16px}}
h1{{font-size:22px}}h2{{margin-top:36px;border-bottom:2px solid var(--acc);padding-bottom:4px}}h3{{margin:0}}
section{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:14px 0}}
.emo{{color:var(--acc);font-weight:500;font-size:13px}}.txt{{font-size:17px;margin:4px 0 10px}}
.row{{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:4px 12px;padding:8px;border-radius:6px;align-items:center}}
.row.base{{background:var(--base)}}.lab{{font-size:13px}}.lab code{{color:var(--mut);white-space:normal}}
.m{{grid-column:1/-1;font-size:12px;color:var(--mut)}}audio{{width:100%}}
table{{border-collapse:collapse;font-size:13px;width:100%;overflow-x:auto;display:block}}td,th{{border:1px solid var(--line);padding:3px 8px;text-align:left}}
p.note{{color:var(--mut);font-size:13px}}
@media(max-width:640px){{.row{{grid-template-columns:1fr}}}}
</style></head><body><main>
<h1>Emotion-directed TTS: neutral vs directed</h1>
<p class="note">Same six lines, same fixed seed. "neutral" = no direction; "directed" = the engine's own tag or instruction (shown under the label). Metrics are computed on the audio: pitch SD is F0 spread in semitones pooled over the 6 lines (current voices: EN about 5.1, JA about 4.2). Error = ASR round trip against the clean text, so a spoken tag would show up as an error. Judge by ear first: numbers cannot hear emphasis.</p>
<h2>English</h2>{table(gen,"en")}{en}
<h2>Japanese</h2>{table(gja,"ja")}{ja}
</main></body></html>'''
(HERE / "listen.html").write_text(page, encoding="utf-8")
print("wrote listen.html", len(page))
