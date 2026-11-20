import { Tick } from "./Tick";

type Dict = {
  title: string;
  live: string;
  seatsLeft: string;
  note: string;
  sessions: Record<"a" | "b" | "c", { course: string; when: string }>;
  chat: { u1: string; b1: string; u2: string; b2: string };
};

function Cells({ total, taken, lateIndex, lastIndex }: { total: number; taken: number; lateIndex?: number; lastIndex?: number }) {
  return (
    <span className="cells" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const cls = ["cell", i === lateIndex ? "cell--late" : "", i === lastIndex ? "cell--last" : ""].filter(Boolean).join(" ");
        return (
          <span key={i} className={cls}>
            {i < taken && <Tick />}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Hero: a page of the class register. Each trial lesson is a row of seat cells ticked in ballpoint.
 * The final state is the natural state; the chat, the late tick and the counter are CSS animations
 * filled backwards, so no JS is needed and reduced-motion users simply see the result.
 */
export function SeatBoard({ d }: { d: Dict }) {
  type Row = { course: string; when: string; total: number; taken: number; left: number; live: boolean; late?: number; last?: number; before?: number };
  const rows: Row[] = [
    { ...d.sessions.a, total: 5, taken: 4, late: 3, last: 4, live: true, left: 1, before: 2 },
    { ...d.sessions.b, total: 5, taken: 2, live: false, left: 3 },
    { ...d.sessions.c, total: 5, taken: 5, live: false, left: 0 },
  ];
  return (
    <figure className="register" aria-label={d.title}>
      <figcaption className="register__head">
        <span className="register__title">{d.title}</span>
        <span className="register__live"><i aria-hidden="true" />{d.live}</span>
      </figcaption>

      <ul className="register__rows">
        {rows.map((r) => (
          <li key={r.when} className="register__row">
            <div className="min-w-0">
              <p className="register__course">{r.course}</p>
              <p className="register__when">{r.when}</p>
            </div>
            <Cells total={r.total} taken={r.taken} lateIndex={r.live ? r.late : undefined} lastIndex={r.live ? r.last : undefined} />
            <p className="register__count">
              {r.live && <span className="cnt--before">{r.before} {d.seatsLeft}</span>}
              <span className={r.live ? "cnt--after cnt--hot" : undefined}>{r.left === 0 ? "—" : `${r.left} ${d.seatsLeft}`}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="chat" role="region" aria-label={d.title}>
        <p className="bubble bubble--user" style={{ ["--d" as string]: "0.7s" }}>{d.chat.u1}</p>
        <p className="bubble bubble--bot" style={{ ["--d" as string]: "1.7s" }}>{d.chat.b1}</p>
        <p className="bubble bubble--user" style={{ ["--d" as string]: "3.2s" }}>{d.chat.u2}</p>
        <p className="bubble bubble--bot" style={{ ["--d" as string]: "4.2s" }}>{d.chat.b2}</p>
      </div>
      <p className="register__note">{d.note}</p>
    </figure>
  );
}
