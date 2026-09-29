"""CTC forced alignment in plain NumPy (replaces torchaudio.functional.forced_align, deprecated)."""
from __future__ import annotations

import numpy as np


def ctc_force_align(logp: np.ndarray, targets: list[int], blank: int) -> np.ndarray:
    """Best CTC path for `targets` through log-probs `logp` of shape (T, C).

    Returns an int array of length T with the label id emitted at every frame (blank included).
    Raises ValueError if the target cannot fit (T < len(targets) + number of repeated neighbours).
    """
    logp = np.asarray(logp, dtype=np.float64)
    T, L = logp.shape[0], len(targets)
    if L == 0:
        return np.full(T, blank, dtype=np.int64)
    need = L + sum(1 for i in range(1, L) if targets[i] == targets[i - 1])
    if T < need:
        raise ValueError(f"{T} frames cannot hold {L} targets (need >= {need})")
    ext = np.full(2 * L + 1, blank, dtype=np.int64)
    ext[1::2] = targets
    S = len(ext)
    # a state may skip its blank neighbour only when the two surrounding labels differ
    skip = np.zeros(S, dtype=bool)
    skip[2:] = (ext[2:] != blank) & (ext[2:] != ext[:-2])
    neg = -np.inf
    dp = np.full(S, neg)
    dp[0] = logp[0, ext[0]]
    if S > 1:
        dp[1] = logp[0, ext[1]]
    back = np.zeros((T, S), dtype=np.int8)  # 0 stay, 1 from s-1, 2 from s-2
    for t in range(1, T):
        c0 = dp
        c1 = np.concatenate(([neg], dp[:-1]))
        c2 = np.concatenate(([neg, neg], dp[:-2]))
        c2 = np.where(skip, c2, neg)
        stack = np.stack([c0, c1, c2])
        arg = stack.argmax(axis=0)  # ties prefer "stay", then the shorter jump
        back[t] = arg
        dp = stack[arg, np.arange(S)] + logp[t, ext]
    s = S - 1 if S == 1 or dp[S - 1] >= dp[S - 2] else S - 2
    path = np.empty(T, dtype=np.int64)
    for t in range(T - 1, -1, -1):
        path[t] = ext[s]
        s -= int(back[t, s])
    return path


def path_to_spans(path: np.ndarray, n_targets: int, blank: int) -> list[tuple[int, int]]:
    """Frame span (first, last+1) of each target token, in order, from a path made by ctc_force_align.

    A new token starts whenever the emitted label changes to a non-blank, or a blank separates
    two equal labels; this recovers repeats correctly because the path visits the blank between them.
    """
    spans: list[tuple[int, int]] = []
    prev = blank
    for t, lab in enumerate(path.tolist()):
        if lab != blank and lab != prev:
            spans.append((t, t + 1))
        elif lab != blank and lab == prev:
            spans[-1] = (spans[-1][0], t + 1)
        prev = lab
    if len(spans) != n_targets:
        raise ValueError(f"recovered {len(spans)} spans for {n_targets} targets")
    return spans
