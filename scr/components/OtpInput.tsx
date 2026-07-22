import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({
  value = "",
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of 6 chars
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  // Auto focus first input on mount or when value is cleared
  useEffect(() => {
    if ((autoFocus || value === "") && !disabled && inputsRef.current[0]) {
      const timer = setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [value, autoFocus, disabled]);

  const updateDigits = (newDigits: string[], lastFocusIndex?: number) => {
    const combined = newDigits.join("").replace(/\D/g, "").slice(0, 6);
    onChange(combined);

    if (lastFocusIndex !== undefined && inputsRef.current[lastFocusIndex]) {
      inputsRef.current[lastFocusIndex]?.focus();
      inputsRef.current[lastFocusIndex]?.select();
    }

    if (combined.length === 6 && onComplete) {
      onComplete(combined);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const inputValue = e.target.value;
    const cleanDigits = inputValue.replace(/\D/g, "");

    if (!cleanDigits) {
      // Empty input or non-numeric
      const nextDigits = [...digits];
      nextDigits[index] = "";
      updateDigits(nextDigits);
      return;
    }

    if (cleanDigits.length > 1) {
      // Auto-fill SMS code on mobile or paste multi-digit into one input
      const pastedCode = cleanDigits.slice(0, 6);
      const nextDigits = Array.from({ length: 6 }, (_, i) => pastedCode[i] || "");
      const focusIndex = Math.min(pastedCode.length - 1, 5);
      updateDigits(nextDigits, focusIndex);
    } else {
      // Single digit typed
      const nextDigits = [...digits];
      nextDigits[index] = cleanDigits;
      const combined = nextDigits.join("").replace(/\D/g, "").slice(0, 6);
      onChange(combined);

      // Advance focus to next box smoothly
      if (index < 5 && inputsRef.current[index + 1]) {
        inputsRef.current[index + 1]?.focus();
        inputsRef.current[index + 1]?.select();
      }

      if (combined.length === 6 && onComplete) {
        onComplete(combined);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Prevent Enter or Space key actions
    if (e.key === "Enter" || e.key === " " || e.code === "Space") {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      const nextDigits = [...digits];

      if (digits[index]) {
        // Clear current box
        nextDigits[index] = "";
        onChange(nextDigits.join(""));
      } else if (index > 0) {
        // Current box is empty -> focus previous box AND clear its digit
        nextDigits[index - 1] = "";
        onChange(nextDigits.join(""));
        inputsRef.current[index - 1]?.focus();
        inputsRef.current[index - 1]?.select();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
      inputsRef.current[index - 1]?.select();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
      inputsRef.current[index + 1]?.select();
    } else if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !/^[0-9]$/.test(e.key)
    ) {
      // Block non-digit character key presses
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const cleanCode = pastedText.replace(/\D/g, "").slice(0, 6);

    if (cleanCode) {
      const nextDigits = Array.from({ length: 6 }, (_, i) => cleanCode[i] || "");
      const focusIndex = Math.min(cleanCode.length - 1, 5);
      updateDigits(nextDigits, focusIndex);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-10 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            digit
              ? "border-indigo-500 bg-indigo-50/40 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/30 dark:text-white"
              : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        />
      ))}
    </div>
  );
}
