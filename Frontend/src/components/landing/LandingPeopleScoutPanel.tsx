export function LandingPeopleScoutPanel() {
  return (
    <div className="landing-sourcing-panel landing-scout-panel landing-ambient-shadow relative overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-[#f1f3ff]/50">
      <video
        className="aspect-[16/11.385] w-full object-cover object-center"
        src="/1_2.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="People Scout demo"
      />
    </div>
  );
}
