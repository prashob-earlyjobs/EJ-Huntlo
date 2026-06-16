import { isValidPhoneNumber, parsePhoneNumber, type CountryCode } from "libphonenumber-js";
import { getCountries, getCountryCallingCode } from "react-phone-number-input/input";
import en from "react-phone-number-input/locale/en.json";
import type { Country } from "react-phone-number-input";

export type PhoneCountry = {
  iso: Country;
  name: string;
  dialCode: string;
  flag: string;
};

export const DEFAULT_PHONE_COUNTRY_ISO: Country = "IN";

/** ITU-T E.164 max length for the national (subscriber) number. */
export const PHONE_NATIONAL_MAX_LENGTH = 15;

export function countryIsoToFlag(iso: string): string {
  const code = iso.toUpperCase();
  if (code.length !== 2) return "";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

function buildPhoneCountries(): PhoneCountry[] {
  return getCountries()
    .map((iso) => ({
      iso,
      name: en[iso as keyof typeof en] || iso,
      dialCode: getCountryCallingCode(iso),
      flag: countryIsoToFlag(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const PHONE_COUNTRIES: PhoneCountry[] = buildPhoneCountries();

const COUNTRY_BY_ISO = new Map(PHONE_COUNTRIES.map((country) => [country.iso, country]));

export function getPhoneCountry(iso: string): PhoneCountry {
  return COUNTRY_BY_ISO.get(iso as Country) ?? COUNTRY_BY_ISO.get(DEFAULT_PHONE_COUNTRY_ISO)!;
}

export function formatE164(countryIso: string, nationalDigits: string): string {
  const national = nationalDigits.replace(/\D/g, "");
  if (!national) return "";

  try {
    const parsed = parsePhoneNumber(national, countryIso as CountryCode);
    if (parsed) return parsed.number;
  } catch {
    // Fall through to manual E.164 assembly while the user is still typing.
  }

  const dialCode = getCountryCallingCode(countryIso as Country);
  return `+${dialCode}${national}`;
}

export function parsePhoneValue(value: string): { countryIso: Country; national: string } {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { countryIso: DEFAULT_PHONE_COUNTRY_ISO, national: "" };
  }

  const e164Candidate = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;

  try {
    const parsed = parsePhoneNumber(e164Candidate);
    if (parsed?.country) {
      return {
        countryIso: parsed.country,
        national: parsed.nationalNumber,
      };
    }
  } catch {
    // Fall through for partial or legacy values.
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return { countryIso: DEFAULT_PHONE_COUNTRY_ISO, national: "" };
  }

  if (!trimmed.startsWith("+") && digits.length === 10) {
    return { countryIso: DEFAULT_PHONE_COUNTRY_ISO, national: digits };
  }

  return { countryIso: DEFAULT_PHONE_COUNTRY_ISO, national: digits };
}

export function validatePhoneNumber(countryIso: string, nationalDigits: string): string | null {
  const national = nationalDigits.replace(/\D/g, "");
  if (!national) {
    return "Mobile number is required";
  }

  const e164 = formatE164(countryIso, national);
  if (e164 && isValidPhoneNumber(e164)) {
    return null;
  }

  return "Please enter a valid mobile number for this country";
}

export function validateE164Phone(value: string): string | null {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "Mobile number is required";
  }

  if (isValidPhoneNumber(trimmed)) {
    return null;
  }

  const { countryIso, national } = parsePhoneValue(trimmed);
  return validatePhoneNumber(countryIso, national);
}
