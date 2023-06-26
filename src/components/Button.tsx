import React from "react";

type Props = {
  small?: boolean;
  gray?: boolean;
  className?: string;
} & React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>;

export default function Button({
  small = false,
  gray = false,
  className = "",
  ...props
}: Props) {
  const sizeClasses = small ? "px-2 py-1" : "px-4 py-2 font-bold";
  const colorClasses = gray
    ? "bg-gray-400 hover:bg-gray-300 focus-visible:bg-gray-300"
    : "bg-blue-500 hover:bg-blue-400 focus-visible:bg-blue-400";

  return (
    <button
      className={`rounded-full text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${colorClasses} ${className}`}
      {...props}
    ></button>
  );
}
