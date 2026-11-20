export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span aria-hidden="true" className="panelim-mark" style={{ width: size, height: size, padding: size * 0.24 }}>
      <i /><i /><i />
    </span>
  );
}
