import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
        "inline-flex items-center justify-center rounded-md bg-violet-600 px-4 py-2 " +
        "font-medium text-white transition hover:bg-violet-500 " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        className
      }
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={
        "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 " +
        "text-slate-100 outline-none placeholder:text-slate-500 " +
        "focus:border-violet-500 " +
        className
      }
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-slate-400">{label}</span>
      {children}
    </label>
  );
}
