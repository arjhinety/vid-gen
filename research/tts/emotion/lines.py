"""The 6 test lines (EN and JA) and the per-engine emotion directions for research/tts/emotion-tags.md.

EN text: narration.yaml `en` with [[cue]] and the `*` marks removed. JA text: the `ja` field, same cleaning.
No `say_ja` exists for these beats, so the `ja` text is used.
"""
LINES = [
    # id, beat key (baseline wav stem), emotion, en, ja
    dict(id="L1", stem="b01_2", emo="disbelief; the turn",
         en="The model we trained doesn't even try.",
         ja="私たちが訓練したモデルは、答えようとすらしません。"),
    dict(id="L2", stem="b01_3", emo="irony",
         en="By the score we promoted on, it was the better model.",
         ja="それでも、昇格に使ったスコアでは、こちらの方が優れたモデルでした。"),
    dict(id="L3", stem="b09_2", emo="gravity",
         en="Both trained checkpoints refused every single one.",
         ja="訓練した二つのチェックポイントは、一問残らず拒否しました。"),
    dict(id="L4", stem="b10_1", emo="surprise",
         en="The refusals vanished. Same questions. Same weights.",
         ja="拒否は消えました。同じ問題、同じ重み。"),
    dict(id="L5", stem="b12_5", emo="reveal",
         en="Not a statistics problem. An empty bin.",
         ja="統計の問題ではありません。空っぽの箱です。"),
    dict(id="L6", stem="b17_0", emo="resolve; closing line",
         en="Every gradient is a hypothesis. Every checkpoint is evidence.",
         ja="すべての勾配は仮説であり、すべてのチェックポイントは証拠である。"),
]

# ---- Qwen3-TTS 1.7B CustomVoice: per-line natural-language instruction (English)
QWEN_INSTR = {
    "L1": "Quiet disbelief, slightly incredulous, as if stating something hard to believe.",
    "L2": "Dry, ironic and faintly sardonic, leaning on the word 'better' with a knowing tone.",
    "L3": "Grave and solemn, slow and deliberate, low energy, heavy with weight.",
    "L4": "Surprised and amazed, brightening and speeding up on 'vanished'.",
    "L5": "Calm, then a slow decisive reveal on the last three words, with a short pause before them.",
    "L6": "Warm, confident and resolute, a conclusive closing statement spoken with conviction.",
}
QWEN_INSTR_JA = {
    "L1": "信じられないという静かな驚きを込めて話してください。",
    "L2": "皮肉っぽく、少し冷ややかに、「優れた」を強調して話してください。",
    "L3": "重々しく、ゆっくりと、深刻な調子で話してください。",
    "L4": "驚きと感嘆を込めて、「消えました」で声を明るくしてください。",
    "L5": "落ち着いた声から、最後の言葉をゆっくりと決定的に明かすように話してください。",
    "L6": "温かく、確信に満ちた決意のこもった、締めくくりの口調で話してください。",
}

# ---- Irodori v4.1: emoji from irodori_tts/gradio_emoji_palette.py (the model's own palette)
# variant A: semantic emoji placed where the emotion starts
IRO_A = {
    "L1": "😲私たちが訓練したモデルは、答えようとすらしません。",       # 😲 驚き
    "L2": "それでも、昇格に使ったスコアでは、😏こちらの方が優れたモデルでした。",  # 😏 からかう
    "L3": "😟訓練した二つのチェックポイントは、🐢一問残らず拒否しました。",     # 😟 心配, 🐢 ゆっくり
    "L4": "拒否は😲消えました。同じ問題、同じ重み。",                       # 😲
    "L5": "統計の問題ではありません。⏸️😎空っぽの箱です。",                 # ⏸️ 間, 😎 得意げ
    "L6": "💪すべての勾配は仮説であり、すべてのチェックポイントは😌証拠である。",  # 💪 力強く, 😌 安堵
}
# variant B: one leading emoji per line (simplest possible markup)
IRO_B = {
    "L1": "😰私たちが訓練したモデルは、答えようとすらしません。",       # 😰 慌てる/動揺
    "L2": "🙄それでも、昇格に使ったスコアでは、こちらの方が優れたモデルでした。",  # 🙄 呆れ
    "L3": "😖訓練した二つのチェックポイントは、一問残らず拒否しました。",       # 😖 苦しげ
    "L4": "😆拒否は消えました。同じ問題、同じ重み。",                       # 😆 喜び
    "L5": "🫶統計の問題ではありません。空っぽの箱です。",                     # 🫶 優しく
    "L6": "📖すべての勾配は仮説であり、すべてのチェックポイントは証拠である。",   # 📖 朗読
}

# ---- VoxCPM2: "(style description)text"
VOX_STYLE = {
    "L1": "quietly incredulous, slightly astonished",
    "L2": "dry, ironic, faintly sardonic",
    "L3": "grave and solemn, slow, heavy",
    "L4": "surprised and amazed, brightening",
    "L5": "calm, then a slow decisive reveal",
    "L6": "warm, confident, resolute, conclusive",
}
VOX_STYLE_JA = {
    "L1": "静かに信じられないという驚き",
    "L2": "皮肉っぽく、少し冷ややかに",
    "L3": "重々しく、ゆっくりと、深刻に",
    "L4": "驚きと感嘆、明るく",
    "L5": "落ち着いて、最後をゆっくり決定的に",
    "L6": "温かく、確信に満ちた決意",
}

# ---- Irodori style captions (per line, used together with the reference clip; style only, no voice description)
CAP_JA = {
    "L1": "信じられないという、静かな驚きを含んだ口調で話している。",
    "L2": "皮肉っぽく、少し冷ややかに話している。",
    "L3": "重々しく、ゆっくりと、深刻な調子で話している。",
    "L4": "驚きと感嘆を込めて、声が明るくなる。",
    "L5": "落ち着いた声で、最後の言葉を決定的にゆっくりと明かすように話している。",
    "L6": "温かく、確信に満ちた、力強い締めくくりの口調で話している。",
}
# variant C: stacked emoji (two per line) at the start of the clause that carries the emotion
IRO_C = {
    "L1": "😲😰私たちが訓練したモデルは、答えようとすらしません。",
    "L2": "それでも、昇格に使ったスコアでは、😏🙄こちらの方が優れたモデルでした。",
    "L3": "😟😖訓練した二つのチェックポイントは、🐢一問残らず拒否しました。",
    "L4": "拒否は😲😆消えました。同じ問題、同じ重み。",
    "L5": "統計の問題ではありません。⏸️⏸️😎💥空っぽの箱です。",
    "L6": "💪😎すべての勾配は仮説であり、すべてのチェックポイントは😌証拠である。",
}
