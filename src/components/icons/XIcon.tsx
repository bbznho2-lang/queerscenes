import type { SVGProps } from "react";

export const XIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.844l-5.36-6.99L4.6 22H1.34l8.04-9.18L1 2h6.97l4.84 6.4L18.244 2Zm-1.2 18h1.86L7.05 4H5.08l11.964 16Z" />
  </svg>
);

export default XIcon;
