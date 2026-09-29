/**
 * Code as an explanatory object: real source, highlighted with Shiki (JS regex engine,
 * runs in the render page), shown on an instrument panel. Lines can be focused (others
 * dim), highlighted, and spans selected with an editor-style sweep. The camera must be
 * locked while code is read.
 */
import type { CSSProperties } from "react";
import { color, syntax } from "@vid/design";
import { clamp, ease, useResource } from "@vid/motion";

type Tok = { content: string; color?: string; fontStyle?: number };

const THEME = {
  name: "house-instrument",
  type: "dark" as const,
  colors: { "editor.background": color.instrument, "editor.foreground": syntax.text },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: syntax.comment, fontStyle: "italic" } },
    { scope: ["keyword", "storage", "keyword.control", "keyword.operator.logical"], settings: { foreground: syntax.keyword } },
    { scope: ["string", "string.quoted"], settings: { foreground: syntax.string } },
    { scope: ["constant.numeric", "constant.language"], settings: { foreground: syntax.number } },
    { scope: ["entity.name.function", "support.function", "meta.function-call.generic"], settings: { foreground: syntax.function } },
    { scope: ["entity.name.type", "support.type", "support.class", "entity.name.class"], settings: { foreground: syntax.type } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: syntax.punctuation } },
    { scope: ["variable.parameter", "variable"], settings: { foreground: syntax.text } },
  ],
};

async function tokenize(code: string, lang: string): Promise<Tok[][]> {
  const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([import("shiki/core"), import("shiki/engine/javascript")]);
  const langs = { python: () => import("shiki/langs/python.mjs"), json: () => import("shiki/langs/json.mjs"), yaml: () => import("shiki/langs/yaml.mjs") } as const;
  const loader = langs[lang as keyof typeof langs];
  if (!loader) throw new Error(`CodePanel: add a loader for language '${lang}'`);
  const hl = await createHighlighterCore({ themes: [THEME], langs: [loader()], engine: createJavaScriptRegexEngine() });
  return hl.codeToTokens(code, { lang, theme: THEME.name }).tokens.map((line) => line.map((t) => ({ content: t.content, color: t.color, fontStyle: t.fontStyle })));
}

export interface CodeSelection {
  line: number; // 1-based within the shown code
  from: string; // substring on that line to select
  p: number;
  kind?: "select" | "strike";
}

export interface CodePanelProps {
  code: string;
  lang?: string;
  /** First line number shown in the gutter (e.g. 160 for adapters.py:160). */
  firstLine?: number;
  /** Focused lines (1-based); others dim to 35 %. Empty = all lines normal. */
  focus?: number[];
  /** 0..1 strength of the focus dimming. */
  focusP?: number;
  /** Line highlighted with a bar (1-based) and its strength. */
  highlight?: { line: number; p: number; color?: string };
  selections?: CodeSelection[];
  fontSize?: number;
  style?: CSSProperties;
}

export function CodePanel({ code, lang = "python", firstLine = 1, focus = [], focusP = 1, highlight, selections = [], fontSize = 26, style }: CodePanelProps) {
  const tokens = useResource(`shiki:${lang}:${code}`, () => tokenize(code, lang));
  const lines = tokens ?? code.split("\n").map((l) => [{ content: l, color: syntax.text }]);
  const lh = fontSize * 1.55;
  return (
    <div style={{ position: "relative", fontFamily: '"JetBrains Mono"', fontSize, lineHeight: `${lh}px`, whiteSpace: "pre", ...style }}>
      {lines.map((toks, i) => {
        const n = i + 1;
        const dim = focus.length && !focus.includes(n) ? 1 - 0.65 * clamp(focusP) : 1;
        const hi = highlight && highlight.line === n ? ease.arrive(clamp(highlight.p)) : 0;
        const text = toks.map((t) => t.content).join("");
        const sels = selections.filter((s) => s.line === n);
        return (
          <div key={i} style={{ position: "relative", display: "flex", opacity: dim }}>
            {hi > 0 && <div style={{ position: "absolute", left: -28, right: -28, top: 0, height: lh, background: highlight!.color ?? syntax.highlightBg, opacity: hi }} />}
            <span style={{ position: "relative", width: fontSize * 2.6, textAlign: "right", marginRight: fontSize * 1.1, color: color.instrumentInk2, opacity: 0.55 }}>{firstLine + i}</span>
            <span style={{ position: "relative" }}>
              {sels.map((s, k) => {
                const at = text.indexOf(s.from);
                if (at < 0) return null;
                const ch = fontSize * 0.6; // JetBrains Mono advance width is 0.6 em
                const p = ease.settle(clamp(s.p));
                return s.kind === "strike" ? (
                  <div key={k} style={{ position: "absolute", left: at * ch, top: lh * 0.52, width: s.from.length * ch * p, height: 3, background: color.red }} />
                ) : (
                  <div key={k} style={{ position: "absolute", left: at * ch - 3, top: 3, width: s.from.length * ch * p + 6, height: lh - 6, background: `${color.red}55`, borderRadius: 3 }} />
                );
              })}
              {toks.map((t, k) => (
                <span key={k} style={{ position: "relative", color: t.color, fontStyle: "fontStyle" in t && t.fontStyle && t.fontStyle & 1 ? "italic" : undefined }}>
                  {t.content}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
