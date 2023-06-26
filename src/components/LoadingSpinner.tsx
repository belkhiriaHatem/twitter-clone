import React from "react";
import { VscRefresh } from "react-icons/vsc";

type Props = {
  big?: boolean;
};

export default function LoadingSpinner({ big = false }: Props) {
  const sizeClasses = big ? "w-16 h-16" : "w-10 h-10";
  return (
    <div className="flex justify-center p-2">
      <VscRefresh className={`animate-spin ${sizeClasses}`} />
    </div>
  );
}
