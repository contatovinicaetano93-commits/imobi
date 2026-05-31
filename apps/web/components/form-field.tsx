import { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}

export function FormField({
  label,
  error,
  children,
  required,
  hint,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {required && <span className="text-red-500">*</span>}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export function Input({
  hasError,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const baseClass =
    "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none transition";
  const errorClass = hasError
    ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"
    : "border-gray-200 bg-white focus:ring-2 focus:ring-brand-500";

  return <input {...props} className={`${baseClass} ${errorClass}`} />;
}

export function Textarea({
  hasError,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  const baseClass =
    "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none resize-none transition font-sans";
  const errorClass = hasError
    ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"
    : "border-gray-200 bg-white focus:ring-2 focus:ring-brand-500";

  return <textarea {...props} className={`${baseClass} ${errorClass}`} />;
}

export function Select({
  hasError,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean; children: ReactNode }) {
  const baseClass =
    "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none transition appearance-none bg-white pr-10";
  const errorClass = hasError
    ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-500"
    : "border-gray-200 bg-white focus:ring-2 focus:ring-brand-500";

  return (
    <div className="relative">
      <select {...props} className={`${baseClass} ${errorClass}`}>
        {children}
      </select>
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
}
