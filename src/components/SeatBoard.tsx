type Dict = {
  title: string;
  live: string;
  seatsLeft: string;
  note: string;
  sessions: Record<"a" | "b" | "c", { course: string; when: string }>;
  chat: { u1: string; b1: string; u2: string; b2: string };
};

function Seats({ total, taken, lateIndex, lastIndex }: { total: number; taken: number; lateIndex?: number; lastIndex?: number }) {
  return (
    <span className="seats" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const isTaken = i < taken;
        const cls = ["seat", isTaken ? "seat--taken" : "", i === lateIndex ? "seat--late" : "", i === lastIndex ? "seat--last" : ""]
          .filter(Boolean)
          .join(" ");
        return <span key={i} className={cls} />;
      })}
    </span>
  );
}

/**
 * Hero "enrollment board". The final state is the natural state; the chat and the seat fill are
 * CSS animations that run backwards-filled, so no JS is needed and reduced-motion users see the result.
 */
export function SeatBoard({ d }: { d: Dict }) {
  type Row = { course: string; when: string; total: number; taken: number; left: number; live: boolean; late?: number; last?: number; before?: number };
  const rows: Row[] = [
    { ...d.sessions.a, total: 5, taken: 4, late: 3, last: 4, live: true, left: 1, before: 2 },
    { ...d.sessions.b, total: 5, taken: 2, live: false, left: 3 },
    { ...d.sessions.c, total: 5, taken: 5, live: false, left: 0 },
  ];
  return (
    <figure className="board" aria-label={d.title}>
      <figcaption className="board__head">
        <span>{d.title}</span>
        <span className="board__live"><i aria-hidden="true" />{d.live}</span>
      </figcaption>

      <ul className="board__rows">
        {rows.map((r) => (
          <li key={r.when} className="board__row">
            <div>
              <p className="board__course">{r.course}</p>
              <p className="board__when">{r.when}</p>
            </div>
            <Seats total={r.total} taken={r.taken} lateIndex={r.live ? r.late : undefined} lastIndex={r.live ? r.last : undefined} />
            <p className="board__count">
              {r.live && <span className="cnt cnt--before">{r.before} {d.seatsLeft}</span>}
              <span className={r.live ? "cnt cnt--after cnt--hot" : "cnt"}>{r.left === 0 ? "—" : `${r.left} ${d.seatsLeft}`}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="chat" role="log">
        <p className="bubble bubble--user" style={{ ["--d" as string]: "0.7s" }}>{d.chat.u1}</p>
        <p className="bubble bubble--bot" style={{ ["--d" as string]: "1.7s" }}>{d.chat.b1}</p>
        <p className="bubble bubble--user" style={{ ["--d" as string]: "3.2s" }}>{d.chat.u2}</p>
        <p className="bubble bubble--bot" style={{ ["--d" as string]: "4.2s" }}>{d.chat.b2}</p>
      </div>
      <p className="board__note">{d.note}</p>
    </figure>
  );
}
