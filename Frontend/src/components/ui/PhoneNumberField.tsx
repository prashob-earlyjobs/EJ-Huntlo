"use client";

import { useEffect, useState } from "react";
import type { Country } from "react-phone-number-input";

import { PhoneCountrySelect } from "@/components/ui/PhoneCountrySelect";
import {
  formatE164,
  getPhoneCountry,
  parsePhoneValue,
  PHONE_NATIONAL_MAX_LENGTH,
} from "@/lib/phoneCountryCodes";

type Variant = "signup" | "dashboard";

type Props = {
  id?: string;
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  error?: boolean;
  variant?: Variant;
  onBlur?: () => void;
};

function fieldShellClass() {
  return "flex items-center gap-2";
}

function phoneInputClass(variant: Variant, error: boolean, disabled: boolean) {
  if (variant === "dashboard") {
    return `min-h-[3rem] min-w-0 flex-1 dashboard-input${
      disabled ? " dashboard-input--readonly" : ""
    }`;
  }

  return `min-h-[3rem] min-w-0 flex-1 rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-75 ${
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300/90 focus:border-blue-500 focus:ring-blue-200/60"
  }`;
}

export function PhoneNumberField({
  id = "mobile",
  value,
  onChange,
  disabled = false,
  error = false,
  variant = "signup",
  onBlur,
}: Props) {
  const parsed = parsePhoneValue(value);
  const [countryIso, setCountryIso] = useState<Country>(parsed.countryIso);
  const [national, setNational] = useState(parsed.national);

  useEffect(() => {
    const next = parsePhoneValue(value);
    setCountryIso(next.countryIso);
    setNational(next.national);
  }, [value]);

  const country = getPhoneCountry(countryIso);

  const emitChange = (iso: string, digits: string) => {
    onChange(formatE164(iso, digits));
  };

  return (
    <div className={fieldShellClass()}>
      <PhoneCountrySelect
        id={`${id}-country`}
        value={countryIso}
        disabled={disabled}
        error={error}
        variant={variant}
        onBlur={onBlur}
        onChange={(iso) => {
          setCountryIso(iso);
          emitChange(iso, national);
        }}
      />
      <input
        id={id}
        name={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        value={national}
        onBlur={onBlur}
        onChange={(e) => {
          const digits = e.target.value
            .replace(/\D/g, "")
            .slice(0, PHONE_NATIONAL_MAX_LENGTH);
          setNational(digits);
          emitChange(countryIso, digits);
        }}
        placeholder={country.iso === "IN" ? "98765 43210" : "Mobile number"}
        maxLength={PHONE_NATIONAL_MAX_LENGTH}
        className={phoneInputClass(variant, error, disabled)}
        aria-invalid={error}
      />
    </div>
  );
}
