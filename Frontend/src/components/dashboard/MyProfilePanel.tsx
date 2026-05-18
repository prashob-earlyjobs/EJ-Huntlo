"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { MyProfileSkeleton } from "@/components/dashboard/MyProfileSkeleton";
import { resolveProfilePhotoUrl } from "@/lib/profilePhoto";

export type MyProfileFormState = {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  profilePhotoUrl: string;
};

export type MyProfileSecurityState = {
  passwordChangedAt: string;
  activeSessions: number;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPasswordChanged(iso: string): string {
  if (!iso) return "Not available";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Props = {
  form: MyProfileFormState;
  security: MyProfileSecurityState;
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  isEditing: boolean;
  passwordForm: PasswordFormState;
  passwordUpdateLoading: boolean;
  peopleScoutProfileName?: string;
  peopleScoutLoading?: boolean;
  photoUploading?: boolean;
  onFieldChange: (field: keyof MyProfileFormState, value: string) => void;
  onPhotoUpload: (file: File) => void;
  onPhotoRemove: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPasswordFieldChange: (
    field: keyof PasswordFormState,
    value: string
  ) => void;
  onUpdatePassword: () => void;
};

const PROFILE_FIELDS: {
  key: keyof MyProfileFormState;
  label: string;
  type: string;
  icon: string;
  placeholder: string;
}[] = [
  {
    key: "fullName",
    label: "Full name",
    type: "text",
    icon: "person",
    placeholder: "Your full name",
  },
  {
    key: "email",
    label: "Work email",
    type: "email",
    icon: "mail",
    placeholder: "you@company.com",
  },
  {
    key: "companyName",
    label: "Company",
    type: "text",
    icon: "business",
    placeholder: "Company name",
  },
  {
    key: "phone",
    label: "Phone",
    type: "tel",
    icon: "call",
    placeholder: "+1 555 000 0000",
  },
  {
    key: "location",
    label: "Location",
    type: "text",
    icon: "location_on",
    placeholder: "City, country",
  },
];

function ProfileAvatar({
  name,
  photoPath,
  isEditing,
  photoUploading,
  onPhotoUpload,
  onPhotoRemove,
}: {
  name: string;
  photoPath: string;
  isEditing: boolean;
  photoUploading: boolean;
  onPhotoUpload: (file: File) => void;
  onPhotoRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const photoUrl = resolveProfilePhotoUrl(photoPath);
  const showPhoto = Boolean(photoUrl) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [photoPath]);

  return (
    <div className="dashboard-profile-avatar-wrap">
      <div
        className={`dashboard-profile-avatar${
          showPhoto ? " dashboard-profile-avatar--photo" : ""
        }`}
        aria-hidden
      >
        {showPhoto ? (
          <img
            key={photoPath}
            src={photoUrl}
            alt=""
            className="dashboard-profile-avatar-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          profileInitials(name)
        )}
      </div>

      {isEditing ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={photoUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPhotoUpload(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="dashboard-profile-avatar-action dashboard-profile-avatar-action--camera"
            aria-label="Upload profile photo"
            disabled={photoUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <MaterialIcon name="photo_camera" className="text-base" />
          </button>
          {photoPath ? (
            <button
              type="button"
              className="dashboard-profile-avatar-action dashboard-profile-avatar-action--remove"
              aria-label="Remove profile photo"
              disabled={photoUploading}
              onClick={onPhotoRemove}
            >
              <MaterialIcon name="close" className="text-sm" />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function MyProfilePanel({
  form,
  security,
  loading,
  saving,
  error,
  success,
  isEditing,
  passwordForm,
  passwordUpdateLoading,
  peopleScoutProfileName,
  peopleScoutLoading,
  photoUploading = false,
  onFieldChange,
  onPhotoUpload,
  onPhotoRemove,
  onEdit,
  onCancel,
  onSave,
  onPasswordFieldChange,
  onUpdatePassword,
}: Props) {
  const displayName = form.fullName.trim() || "Your profile";
  const roleLabel = form.role === "Admin" ? "Admin" : "Recruiter";

  return (
    <section className="dashboard-card dashboard-card--fill flex h-full min-w-0 max-w-full w-full flex-col p-6">
      <div className="dashboard-card-panel-header shrink-0">
      <div className="dashboard-results-toolbar dashboard-results-toolbar--profile">
        <div>
          <h3 className="flex items-center gap-2 dashboard-section-title">
            <MaterialIcon name="account_circle" className="text-xl text-[#0050cb]" />
            My Profile
          </h3>
          <p className="mt-1 dashboard-text-body">
            Manage your personal details, work preferences, and account security.
          </p>
        </div>

        <div className="dashboard-profile-header-actions">
          <span className="dashboard-profile-role-badge">{roleLabel}</span>
          {isEditing ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="dashboard-btn-secondary"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (isEditing ? onSave() : onEdit())}
            disabled={saving || loading}
            className="dashboard-btn-primary"
          >
            <MaterialIcon
              name={isEditing ? "save" : "edit"}
              className="text-base"
            />
            {isEditing
              ? saving
                ? "Saving…"
                : "Save changes"
              : "Edit profile"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 dashboard-alert-error">{error}</p> : null}
      {success ? (
        <p className="mt-4 dashboard-alert-success">{success}</p>
      ) : null}
      </div>

      <div className="dashboard-card-body-scroll">
      {loading ? (
        <MyProfileSkeleton />
      ) : (
        <div className="dashboard-profile-body">
          <div className="dashboard-profile-hero">
            <ProfileAvatar
              name={form.fullName}
              photoPath={form.profilePhotoUrl}
              isEditing={isEditing}
              photoUploading={photoUploading}
              onPhotoUpload={onPhotoUpload}
              onPhotoRemove={onPhotoRemove}
            />
            <div className="dashboard-profile-hero-text min-w-0 flex-1">
              <p className="dashboard-profile-hero-name truncate">{displayName}</p>
              <p className="dashboard-profile-hero-meta truncate">
                {form.companyName.trim() || "Add your company"}
                {form.location.trim() ? ` · ${form.location.trim()}` : ""}
              </p>
              <p className="dashboard-profile-hero-email truncate">
                {form.email.trim() || "Add your work email"}
              </p>
            </div>
            <div className="dashboard-profile-hero-chips hidden sm:flex">
              <span className="dashboard-profile-chip">
                <MaterialIcon name="badge" className="text-sm" />
                {roleLabel}
              </span>
              {form.phone.trim() ? (
                <span className="dashboard-profile-chip">
                  <MaterialIcon name="call" className="text-sm" />
                  {form.phone.trim()}
                </span>
              ) : null}
            </div>
          </div>

          {peopleScoutProfileName ? (
            <div className="dashboard-profile-scout-banner">
              <MaterialIcon name="travel_explore" className="text-lg text-[#0050cb]" />
              <p className="min-w-0 dashboard-text-body">
                Last viewed in People Scout:{" "}
                <span className="font-medium text-[var(--dash-on-surface)]">
                  {peopleScoutProfileName}
                </span>
                {peopleScoutLoading ? " (loading…)" : ""}
              </p>
            </div>
          ) : null}

          <div className="dashboard-profile-sections">
            <section className="dashboard-profile-section">
              <header className="dashboard-profile-section-head">
                <span className="dashboard-profile-section-icon">
                  <MaterialIcon name="contact_page" className="text-lg" />
                </span>
                <div>
                  <h4 className="dashboard-profile-section-title">Basic information</h4>
                  <p className="dashboard-profile-section-desc">
                    Used across your workspace and outreach defaults.
                  </p>
                </div>
              </header>

              <div className="dashboard-profile-fields">
                {PROFILE_FIELDS.map((field) => (
                  <label key={field.key} className="dashboard-profile-field">
                    <span className="dashboard-profile-field-label">
                      <MaterialIcon name={field.icon} className="text-base opacity-70" />
                      {field.label}
                    </span>
                    <input
                      type={field.type}
                      value={form[field.key]}
                      onChange={(event) =>
                        onFieldChange(field.key, event.target.value)
                      }
                      readOnly={!isEditing}
                      placeholder={field.placeholder}
                      className={`dashboard-input${
                        !isEditing ? " dashboard-input--readonly" : ""
                      }`}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="dashboard-profile-section">
              <header className="dashboard-profile-section-head">
                <span className="dashboard-profile-section-icon dashboard-profile-section-icon--security">
                  <MaterialIcon name="lock" className="text-lg" />
                </span>
                <div>
                  <h4 className="dashboard-profile-section-title">Security</h4>
                  <p className="dashboard-profile-section-desc">
                    Update your password and review sign-in activity.
                  </p>
                </div>
              </header>

              <div className="dashboard-profile-security-stats">
                <div className="dashboard-profile-stat">
                  <span className="dashboard-profile-stat-label">Password updated</span>
                  <span className="dashboard-profile-stat-value">
                    {formatPasswordChanged(security.passwordChangedAt)}
                  </span>
                </div>
                <div className="dashboard-profile-stat">
                  <span className="dashboard-profile-stat-label">Active sessions</span>
                  <span className="dashboard-profile-stat-value">
                    {security.activeSessions}{" "}
                    {security.activeSessions === 1 ? "device" : "devices"}
                  </span>
                </div>
              </div>

              <div className="dashboard-profile-password-form">
                <p className="dashboard-label-upper">Change password</p>
                <label className="dashboard-profile-field">
                  <span className="dashboard-label">Current password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      onPasswordFieldChange("currentPassword", event.target.value)
                    }
                    placeholder="Enter current password"
                    className="dashboard-input dashboard-input-sm"
                  />
                </label>
                <div className="dashboard-profile-password-row">
                  <label className="dashboard-profile-field">
                    <span className="dashboard-label">New password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        onPasswordFieldChange("newPassword", event.target.value)
                      }
                      placeholder="At least 8 characters"
                      className="dashboard-input dashboard-input-sm"
                    />
                  </label>
                  <label className="dashboard-profile-field">
                    <span className="dashboard-label">Confirm password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        onPasswordFieldChange("confirmPassword", event.target.value)
                      }
                      placeholder="Repeat new password"
                      className="dashboard-input dashboard-input-sm"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdatePassword()}
                  disabled={passwordUpdateLoading}
                  className="dashboard-btn-secondary mt-1"
                >
                  <MaterialIcon name="key" className="text-base" />
                  {passwordUpdateLoading ? "Updating…" : "Update password"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
