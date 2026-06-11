"use client";
import { useState, forwardRef } from "react";
import type { InputHTMLAttributes, CSSProperties } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  style?: CSSProperties;
  errorStyle?: CSSProperties;
  hasError?: boolean;
}

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ style, errorStyle, hasError, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const base: CSSProperties = hasError && errorStyle ? errorStyle : (style ?? {});
    return (
      <div style={{ position: "relative" }}>
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          style={{ ...base, paddingRight: "2.75rem" }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          style={{
            position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: "var(--gray-light, #94a3b8)", display: "flex", alignItems: "center",
          }}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
