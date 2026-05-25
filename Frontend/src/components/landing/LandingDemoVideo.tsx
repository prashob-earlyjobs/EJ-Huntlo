"use client";

import { useEffect, useRef } from "react";

export function LandingDemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      video.pause();
      return;
    }

    video.muted = true;
    const play = () => {
      void video.play().catch(() => {});
    };
    play();

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else play();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div
      className="landing-demo-stage mx-auto mt-10 w-full max-w-3xl"
      aria-hidden
    >
      <div className="landing-demo-perspective">
        <div className="landing-demo-screen">
          <video
            ref={videoRef}
            className="landing-demo-video"
            src="/video_1.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            controls={false}
            tabIndex={-1}
          />
          <div className="landing-demo-screen-edge" />
          <div className="landing-demo-screen-shine" />
        </div>
        <div className="landing-demo-floor-shadow" />
      </div>
    </div>
  );
}
