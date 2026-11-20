/** A ballpoint check mark. pathLength=1 lets CSS "draw" it with a single dash. */
export function Tick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`tick ${className}`.trim()}>
      <path d="M4.5 13.2l4.6 4.4L19.8 6.2" pathLength={1} />
    </svg>
  );
}
