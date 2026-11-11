export default function Logo({ size = 28, fill = "var(--bg)" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="17" height="22" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 9h8M8.5 13h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20" cy="20" r="5.2" style={{ fill }} stroke="currentColor" strokeWidth="1.8" />
      <path d="M17.8 20.1l1.5 1.5 2.9-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
