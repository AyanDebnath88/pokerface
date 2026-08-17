// Side-pot construction and pot awarding.

export interface Contribution {
  playerId: string;
  /** Total chips this player committed across all streets of the hand. */
  amount: number;
  /** Folded players' chips stay in the pot but they can't win. */
  folded: boolean;
}

export interface Pot {
  amount: number;
  /** Player ids eligible to win this pot (contributed & not folded). */
  eligible: string[];
}

/**
 * Build the main pot and any side pots from per-player contributions.
 * Dead money from folded players is included in pot amounts but those
 * players are never eligible to win.
 */
export function buildSidePots(contributions: Contribution[]): Pot[] {
  let entries = contributions
    .filter((c) => c.amount > 0)
    .map((c) => ({ ...c }));

  const pots: Pot[] = [];

  while (entries.length > 0) {
    const min = Math.min(...entries.map((e) => e.amount));
    const amount = min * entries.length;
    const eligible = entries
      .filter((e) => !e.folded)
      .map((e) => e.playerId);

    // Merge into the previous pot if the eligible set is identical.
    const prev = pots[pots.length - 1];
    if (prev && sameSet(prev.eligible, eligible)) {
      prev.amount += amount;
    } else {
      pots.push({ amount, eligible });
    }

    entries = entries
      .map((e) => ({ ...e, amount: e.amount - min }))
      .filter((e) => e.amount > 0);
  }

  return pots;
}

/**
 * Award every pot to its winner(s).
 *
 * @param pots           pots from buildSidePots
 * @param scoreByPlayer  comparable hand score per eligible player (higher wins)
 * @param oddChipOrder   player ids in seat order starting left of the button;
 *                       used to hand out non-divisible odd chips deterministically
 * @returns map of playerId -> chips won
 */
export function awardPots(
  pots: Pot[],
  scoreByPlayer: Map<string, number>,
  oddChipOrder: string[],
): Map<string, number> {
  const winnings = new Map<string, number>();
  const add = (id: string, n: number) =>
    winnings.set(id, (winnings.get(id) ?? 0) + n);

  for (const pot of pots) {
    const contenders = pot.eligible.filter((id) => scoreByPlayer.has(id));
    if (contenders.length === 0) continue;

    const best = Math.max(...contenders.map((id) => scoreByPlayer.get(id)!));
    const winners = contenders.filter(
      (id) => scoreByPlayer.get(id) === best,
    );

    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const id of winners) add(id, share);

    // Distribute odd chips one at a time in seat order.
    const ordered = oddChipOrder.filter((id) => winners.includes(id));
    const ring = ordered.length > 0 ? ordered : winners;
    let i = 0;
    while (remainder > 0) {
      add(ring[i % ring.length], 1);
      remainder--;
      i++;
    }
  }

  return winnings;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
