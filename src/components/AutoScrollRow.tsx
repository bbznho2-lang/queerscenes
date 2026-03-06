import { Children } from "react";

interface Props {
  children: React.ReactNode;
  speed?: number;
}

const AutoScrollRow = ({ children }: Props) => {
  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      style={{ scrollbarWidth: "none" }}
    >
      {Children.toArray(children)}
    </div>
  );
};

export default AutoScrollRow;
