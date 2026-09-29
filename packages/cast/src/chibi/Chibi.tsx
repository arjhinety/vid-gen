/**
 * One character, drawn from its definition and a pose. Layer order, back to front:
 * back hair → legs → skirt → top → coat → notebook arms → neck → head (face, eyes,
 * mouth, side locks, fringe, brows, glasses, accessories) → pointer arm → pointer.
 *
 * Transforms: lift and squash about the feet, lean about the feet, head tilt and nod
 * about the neck, arms about the shoulders. Squash keeps volume (x scales by 1/√squash).
 */
import { useId } from "react";
import type { CharacterDef, Pose } from "../types.ts";
import { PIVOT } from "./anatomy.ts";
import { Arm, Coat, Legs, Neck, Notebook, Pointer, Skirt, Torso } from "./Body.tsx";
import { Blush, Brows, Eyes, FaceSkin, Mouth, Nose } from "./Face.tsx";
import { rotAbout } from "./paths.ts";

export function Glasses({ c }: { c: CharacterDef }) {
  const p = c.palette;
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d="M 18,-331 C 18,-306 24,-292 39,-291 C 54,-292 61,-306 61,-331" fill="#FFFFFF" fillOpacity={0.12} stroke={p.line} strokeOpacity={0.3} strokeWidth={1.2} />
          <path d="M 17,-331 Q 40,-341 62,-331" fill="none" stroke={p.accent} strokeWidth={3} strokeLinecap="round" />
          <path d="M 62,-331 L 78,-335" stroke={p.line} strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}
      <path d="M -17,-330 Q 0,-336 17,-330" fill="none" stroke={p.accent} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

export function Chibi({ c, pose }: { c: CharacterDef; pose: Pose }) {
  const uid = `c${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const p = c.palette;
  const o = c.outfit;
  const H = c.hair;
  const sq = pose.squash;
  const body = `translate(0 ${-pose.lift}) ${rotAbout(pose.lean, [0, 0])} scale(${1 / Math.sqrt(sq)} ${sq})`;
  const head = `translate(${pose.head.turn * 2} ${pose.head.nod}) ${rotAbout(pose.head.tilt, PIVOT.neck)}`;
  const feat = `translate(${pose.head.turn * 5} 0)`;
  const hp = { p, swing: pose.hair, uid };
  const notebook = o.prop === "notebook";
  return (
    <g transform={`scale(${c.scale})`}>
      <g transform={body}>
        <g transform={head}>
          <H.Back {...hp} />
        </g>
        <Legs p={p} o={o} />
        <Skirt p={p} />
        <Torso p={p} o={o} />
        {o.coat && <Coat p={p} />}
        {notebook ? <Notebook p={p} /> : null}
        <Arm side={-1} angle={notebook ? -34 : pose.armL} hand={pose.handL} p={p} o={o} />
        <Neck p={p} />
        <g transform={head}>
          <FaceSkin p={p} uid={uid} fringe={H.fringe} />
          <g transform={feat}>
            <Blush p={p} amount={pose.face.blush} />
            <Eyes face={pose.face} p={p} uid={uid} />
            <Nose p={p} />
            <Mouth face={pose.face} p={p} />
          </g>
          <H.Side {...hp} />
          <H.Front {...hp} />
          <g transform={feat}>
            <Brows face={pose.face} p={p} />
            {o.glasses && <Glasses c={c} />}
          </g>
          {H.Extra && <H.Extra {...hp} />}
        </g>
        {o.prop === "pointer" && <Pointer pose={pose} p={p} />}
        <Arm side={1} angle={pose.armR} hand={pose.pointer !== null && o.prop === "pointer" ? "fist" : pose.handR} p={p} o={o} />
      </g>
    </g>
  );
}
