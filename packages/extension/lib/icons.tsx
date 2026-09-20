import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function AiTasteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 12h4.5" />
      <path d="M8 8h6" />
      <path d="M8 16h2" />
      <path d="M3 7v-2a2 2 0 0 1 2 -2h2" />
      <path d="M3 17v2a2 2 0 0 0 2 2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M14 21v-4a2 2 0 1 1 4 0v4" />
      <path d="M14 19h4" />
      <path d="M21 15v6" />
    </svg>
  );
}

export function ParrotIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 10.5c0 -.828 .746 -1.5 1.667 -1.5h6.666c.92 0 1.667 .672 1.667 1.5v3c0 .828 -.746 1.5 -1.667 1.5h-6.666c-.92 0 -1.667 -.672 -1.667 -1.5v-3" />
      <path d="M12 7v2" />
      <path d="M10 12v.01" />
      <path d="M14 12v.01" />
      <path d="M4 8v-2a2 2 0 0 1 2 -2h2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M16 20h2a2 2 0 0 0 2 -2v-2" />
    </svg>
  );
}

export function SolicitationIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 13v-2.5a1.5 1.5 0 0 1 3 0v1.5" />
      <path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" />
      <path d="M11 11.5v-8a1.5 1.5 0 1 1 3 0v8.5" />
    </svg>
  );
}
