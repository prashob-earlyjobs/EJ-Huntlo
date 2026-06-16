"use client";

import Select, {
  type GroupBase,
  type SingleValueProps,
  type StylesConfig,
} from "react-select";

import { IntegrationBrandLogo } from "@/components/dashboard/IntegrationBrandLogo";
import type { CampaignEmailSenderOption } from "@/lib/emailIntegrations";

type SenderSelectOption = CampaignEmailSenderOption & {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: CampaignEmailSenderOption[];
  onChange: (integrationId: string) => void;
  disabled?: boolean;
  className?: string;
};

function toSelectOption(option: CampaignEmailSenderOption): SenderSelectOption {
  return {
    ...option,
    value: option.id,
    label: option.displayName || option.email,
  };
}

function SenderOptionContent({
  option,
  compact = false,
}: {
  option: SenderSelectOption;
  compact?: boolean;
}) {
  const title = compact
    ? option.email || option.displayName
    : option.displayName || option.email;
  const showEmail = !compact && Boolean(option.displayName && option.email);
  const showBadge = !compact && option.isDefaultEmail;

  return (
    <div
      className={`dashboard-campaign-sender-option${compact ? " dashboard-campaign-sender-option--compact" : ""}`}
    >
      <IntegrationBrandLogo
        provider={option.provider}
        title={option.email}
        className="dashboard-campaign-sender-option__logo dashboard-integration-brand-logo--sm"
      />
      <div className="dashboard-campaign-sender-option__body min-w-0">
        <span className="dashboard-campaign-sender-option__title">{title}</span>
        {showEmail ? (
          <span className="dashboard-campaign-sender-option__email">{option.email}</span>
        ) : null}
      </div>
      {showBadge ? (
        <span className="dashboard-campaign-sender-option__badge">Default</span>
      ) : null}
    </div>
  );
}

function SenderSingleValue(props: SingleValueProps<SenderSelectOption, false>) {
  return <SenderOptionContent option={props.data} compact />;
}

function buildSenderSelectStyles(): StylesConfig<
  SenderSelectOption,
  false,
  GroupBase<SenderSelectOption>
> {
  return {
    container: (base) => ({
      ...base,
      width: "100%",
    }),
    control: (base, state) => ({
      ...base,
      minHeight: "2.125rem",
      height: "2.125rem",
      borderRadius: "0.375rem",
      borderColor: state.isFocused
        ? "var(--dash-primary, #0050cb)"
        : "color-mix(in srgb, var(--dash-outline, #dadce0) 88%, transparent)",
      backgroundColor: state.isDisabled ? "#f8f9fa" : "#fff",
      boxShadow: state.isFocused
        ? "0 0 0 3px rgba(0, 80, 203, 0.14)"
        : "inset 0 1px 2px rgba(20, 27, 43, 0.04)",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      overflow: "hidden",
      "&:hover": {
        borderColor: state.isDisabled
          ? base.borderColor
          : "color-mix(in srgb, var(--dash-primary, #0050cb) 45%, transparent)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      flexWrap: "nowrap",
      padding: "0 0.125rem 0 0.5rem",
      height: "2rem",
      minHeight: "2rem",
      overflow: "hidden",
    }),
    singleValue: (base) => ({
      ...base,
      position: "static",
      top: "auto",
      transform: "none",
      margin: 0,
      maxWidth: "100%",
      width: "100%",
      overflow: "hidden",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: "2rem",
      alignItems: "center",
      alignSelf: "stretch",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: "0 0.25rem",
      color: state.isDisabled ? "#bdc1c6" : "#5f6368",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    menu: (base) => ({
      ...base,
      marginTop: "0.25rem",
      borderRadius: "0.5rem",
      border: "1px solid #e8eaed",
      backgroundColor: "#fff",
      boxShadow: "0 8px 24px rgba(32, 33, 36, 0.12)",
      overflow: "hidden",
      zIndex: 9999,
      minWidth: "17.5rem",
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.25rem",
      maxHeight: "16rem",
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "0.375rem",
      padding: "0.375rem 0.5rem",
      backgroundColor: state.isSelected
        ? "#e8f0fe"
        : state.isFocused
          ? "#f8f9fa"
          : "transparent",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
    }),
  };
}

export function CampaignEmailSenderSelect({
  value,
  options,
  onChange,
  disabled = false,
  className,
}: Props) {
  const selectOptions = options.map(toSelectOption);
  const selected = selectOptions.find((opt) => opt.value === value) ?? null;
  const menuPortalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <div className={`dashboard-campaign-sender-field${className ? ` ${className}` : ""}`}>
      <label htmlFor="campaign-email-sender" className="dashboard-campaign-sender-field__label">
        Send from
      </label>
      <Select<SenderSelectOption, false>
        inputId="campaign-email-sender"
        aria-label="Send from"
        classNamePrefix="campaign-email-sender"
        value={selected}
        options={selectOptions}
        onChange={(opt) => {
          if (opt) onChange(opt.value);
        }}
        styles={buildSenderSelectStyles()}
        isDisabled={disabled}
        isSearchable={false}
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        menuPlacement="auto"
        blurInputOnSelect
        captureMenuScroll={false}
        components={{ SingleValue: SenderSingleValue }}
        formatOptionLabel={(option) => <SenderOptionContent option={option} />}
      />
    </div>
  );
}
