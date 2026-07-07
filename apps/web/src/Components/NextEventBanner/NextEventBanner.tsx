import { MicVocal } from "lucide-react";
import type { OpenMicEvent } from "../../api.ts";
import styles from "./NextEventBanner.module.css";

type NextEventBannerProps = {
  event?: OpenMicEvent | null;
};

const formatWhen = (event: OpenMicEvent): string => {
  const starts = new Date(event.startsAt);
  const ends = new Date(event.endsAt);
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(starts);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time.format(starts)} – ${time.format(ends)}`;
};

export const NextEventBanner = ({ event = null }: NextEventBannerProps) => (
  <section className={styles.container} aria-label="Next open mic">
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-blue-50 px-8 py-12 text-center">
      <MicVocal aria-hidden className="h-12 w-12 text-blue-600" />
      {event ? (
        <>
          <h2 className="text-2xl font-bold">Next up: {event.title}</h2>
          <p className="text-xl">{formatWhen(event)}</p>
          <p className="text-gray-500">Sign-ups open 30 minutes before showtime.</p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold">No open mic scheduled</h2>
          <p className="text-gray-500">Check back later for the next one.</p>
        </>
      )}
    </div>
  </section>
);
