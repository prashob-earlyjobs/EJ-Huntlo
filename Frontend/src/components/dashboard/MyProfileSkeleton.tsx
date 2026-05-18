"use client";

export function MyProfileSkeleton() {
  return (
    <div className="dashboard-profile-body" aria-busy="true" aria-label="Loading profile">
      <div className="dashboard-profile-hero dashboard-shimmer-block dashboard-shimmer" />
      <div className="dashboard-profile-sections">
        <div className="dashboard-profile-section dashboard-shimmer-block dashboard-profile-section--tall dashboard-shimmer" />
        <div className="dashboard-profile-section dashboard-shimmer-block dashboard-profile-section--tall dashboard-shimmer" />
      </div>
    </div>
  );
}
