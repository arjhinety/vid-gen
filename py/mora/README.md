# vidmora: Japanese mora timings for lip-sync

Given a WAV of Japanese speech and the exact text that was spoken, `vidmora.align` returns the onset
of every mora (and phoneme) in seconds. The mascot's Japanese voice (Irodori-TTS) exposes no
per-sound timings, so they are recovered from the audio afterwards.

It only analyses our own audio. It generates no voice and clones nothing.

## How it works

1. Strip Irodori emoji tone tags (and other pictographs) from the text.
2. `pyopenjtalk-plus` G2P gives the OpenJTalk phoneme sequence (`k o r e w a pau ...`).
3. `prj-beatrice/japanese-hubert-base-phoneme-ctc-v4` (HuBERT + CTC over OpenJTalk phonemes) gives
   per-frame log-probs for the audio (16 kHz mono, 0.5 s zero padding each side).
4. A NumPy Viterbi (`vidmora/viterbi.py`) forces the G2P phonemes through those log-probs. It is
   checked against brute force in the tests; torchaudio's deprecated `forced_align` is not used.
5. Phonemes are grouped into morae: consonant(s) + vowel, `N`, `cl` (small tsu), a long vowel as its
   own mora, and `pau` as its own entry. A mora's onset is the CTC start of its first phoneme; its end
   is the next entry's onset (the last entry ends at the end of voiced audio, 35 dB under the peak).
   CTC end times are one spike wide and are not used.

`vowel` is one of `a i u e o N cl pau`. Devoiced `I`/`U` map to `i`/`u`; the `mora` string keeps the
upper-case letter (`sU`), so devoiced morae can be recognised.

## Setup and run

```bash
cd py/mora
uv sync                       # Python 3.11, CPU torch 2.10; versions pinned in uv.lock
uv run pytest -q
uv run python -m vidmora.align path/to/job.json      # writes path/to/job.results.json
```

`PYTHONIOENCODING=utf-8` on Windows. The model is fetched from the Hugging Face hub on first use and
then read from the cache. `"device": "cuda"` needs a CUDA torch build, which this environment does not
install (CPU is fast enough: a few lines per second).

Job: `{"device": "cpu", "items": [{"id": "b01#0", "wav": "path.wav", "text": "これは、十歳の子どもでも解ける問題です。"}]}`

Result item: `{"id", "ok", "error"?, "morae": [[t0, t1, mora, vowel], ...], "phones": [[t0, t1, ph], ...],
"greedy", "g2p", "greedy_per", "run_s"}`. `greedy` is what the model hears without the text (argmax
decode); `greedy_per` is its phoneme error rate against `g2p` (pauses ignored). A high value means the
audio does not say the text (a misreading or a bad take), and the timings of that line should not be trusted.

`scripts/study_qc.py` runs the Study 001 Japanese lines and checks pause exits against loudness.

## Models and licences

| Component | Licence |
|---|---|
| `prj-beatrice/japanese-hubert-base-phoneme-ctc-v4` | Apache-2.0 |
| `pyopenjtalk-plus` (G2P; OpenJTalk inside) | MIT (OpenJTalk: modified BSD) |
| `sudachipy`, `sudachidict-core` (pyopenjtalk-plus deps) | Apache-2.0 |
| `transformers` | Apache-2.0 |
| `torch` | BSD-3-Clause |
| `numpy`, `scipy`, `soundfile` | BSD |

Provenance: the model was trained on ReazonSpeech (CDLA-Sharing-1.0), under Japanese Copyright Act
Article 30-4 (analysis use). Here it is used only to analyse our own synthetic audio, so no
ReazonSpeech data or voice is reproduced.
