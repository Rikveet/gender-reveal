export type Reveal = "boy" | "girl" | null;

// The reveal switches on at 4 PM on 25 Oct 2026, Calgary time (MDT = UTC-6), one hour after the event ends (3 PM).
export const REVEAL_AT = Date.UTC(2026, 9, 25, 22, 0, 0);

const parse = (v?: string | null): Reveal => {
  const s = v?.trim().toLowerCase();
  return s === "boy" || s === "girl" ? s : null;
};

export function getReveal(): Reveal {
  return Date.now() >= REVEAL_AT ? parse(process.env.NEXT_PUBLIC_GENDER) : null;
}
