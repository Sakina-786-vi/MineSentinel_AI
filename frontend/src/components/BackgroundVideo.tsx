import mineSentinelVideo from "../assets/pixverse-v6-fusion-540p-image1-yes-exactly-d_38PAlaTT.mp4";
import { useEffect, useRef, useState } from "react";

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionPreference.matches);
    motionPreference.addEventListener("change", updateMotionPreference);
    return () => motionPreference.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reducedMotion) {
      video.pause();
    } else {
      void video.play().catch(() => setMediaFailed(true));
    }
  }, [reducedMotion]);

  return (
    <div className="background-video" aria-hidden="true">
      {!reducedMotion && !mediaFailed && (
        <video
          ref={videoRef}
          className="background-video__media"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setMediaFailed(true)}
        >
          <source src={mineSentinelVideo} type="video/mp4" />
        </video>
      )}
      <div className="background-video__scrim" />
    </div>
  );
}