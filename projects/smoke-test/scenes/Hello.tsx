import { color } from "@vid/design";
import { Claim, Exhibit, HBar, Label, ScaleAxis, Stamp } from "@vid/kit";
import { useCues } from "@vid/motion";

/** Smoke exhibit: a bar that grows on one cue and a stamp on the next. Exercises fonts, cues, chrome. */
export default function Hello() {
  const cue = useCues();
  return (
    <Exhibit from="hyp">
      <Label x={180} y={420} sub="fixture · n = 1">
        Hypothesis
      </Label>
      <HBar x={560} y={420} w={1100} value={0.62} p={cue.at("hyp", { dur: 0.8 })} label="0.62" c={color.ink} />
      <ScaleAxis x={560} y={500} w={1100} ticks={[0, 0.25, 0.5, 0.75, 1]} p={cue.at("hyp", { dur: 0.6 })} />
      <Stamp x={1180} y={640} head="EVIDENCE" p={cue.at("ev", { dur: 0.25 })}>
        checkpoint · logged
      </Stamp>
      <Claim kind="design" source="smoke fixture, not a result" x={180} y={880} p={cue.at("hyp", { offset: 0.4 })} />
    </Exhibit>
  );
}
