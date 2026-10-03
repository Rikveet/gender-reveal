"use client";

import { useEffect, useRef, useState } from "react";
import Scene from "@/components/Scene";
import { getReveal, type Reveal } from "@/lib/reveal";

// ✏️ EDIT THESE
const HOST_NAMES = "Vipan & Anayat";
const HOST_EMAIL = "anahayer90@gmail.com"; // calendar that receives the RSVPs

const ADDRESS_LINES = [
  "228 Homestead Drive North East",
  "Calgary, Alberta T3J 2G5",
  "Canada",
];
const ADDRESS = ADDRESS_LINES.join(", ");

// 25 Oct 2026, 12–3 PM Calgary time (MDT)
const calendarUrl =
  "https://calendar.google.com/calendar/render?" +
  new URLSearchParams({
    action: "TEMPLATE",
    text: "Baby Gender Reveal 🎉",
    dates: "20261025T120000/20261025T150000",
    ctz: "America/Edmonton",
    location: ADDRESS,
    details: `Join ${HOST_NAMES} for the big reveal! Saving this event RSVPs you as a guest.`,
    add: HOST_EMAIL,
  }).toString();

const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(ADDRESS);

export default function Page() {
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState<Reveal>(null);
  const hovered = useRef(false);

  // From 1 PM on 25 Oct the letter announces the gender set in NEXT_PUBLIC_GENDER (boy | girl).
  useEffect(() => {
    setReveal(getReveal());
  }, []);

  const open = () => {
    if (opened) return;
    hovered.current = false;
    setOpened(true);
  };

  return (
    <main className="relative h-svh w-full overflow-hidden bg-black text-white">
      <Scene
        opened={opened}
        hovered={hovered}
        onOpen={open}
        onSettled={() => setReady(true)}
        names={HOST_NAMES}
        address={ADDRESS_LINES}
        reveal={reveal}
      />

      {!opened && (
        <p
          className="pointer-events-none absolute bottom-[9vh] w-full animate-hint text-center italic tracking-wide text-[#8a7a5a]"
          style={{ animationDelay: "3.4s" }}
        >
          Tap the envelope
        </p>
      )}

      {ready && !reveal && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 animate-fade bg-linear-to-t from-black/85 to-transparent" />
      )}

      {ready && !reveal && (
        <div className="absolute inset-x-0 bottom-5 z-10 grid animate-fade justify-items-center gap-2">
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[3px] border border-[#f3d98b]/70 bg-linear-to-b from-[#f7e19b] via-[#d9a94c] to-[#a6701e] px-6 py-3.5 font-display text-sm font-black tracking-wide text-[#3a0a0a] shadow-[0_0_0_3px_#2b1a0e,0_0_0_4px_#d4a24a,0_8px_28px_rgba(212,162,74,0.35)] transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Add to your Calendar
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#d9c28a] underline"
          >
            Get directions
          </a>
        </div>
      )}
    </main>
  );
}
