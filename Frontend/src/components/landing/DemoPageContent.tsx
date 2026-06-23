const DEMO_VIDEO_ID = "wUob2ZudG_0";

export function DemoPageContent() {
  return (
    <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-2xl border border-[#c3c6d6]/30 bg-[#141b2b] shadow-lg shadow-[#141b2b]/10">
      <iframe
        src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}`}
        title="Huntlo product demo"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
