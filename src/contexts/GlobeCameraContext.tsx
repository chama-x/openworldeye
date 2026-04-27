import { createContext, useContext, useState, type ReactNode } from "react";

const THRESH = 1.5;

const GlobeCameraContext = createContext<{
  cameraDistance: number;
  setCameraDistanceIfChanged: (d: number) => void;
} | null>(null);

export function GlobeCameraProvider({ children }: { children: ReactNode }) {
  const [cameraDistance, setCameraDistance] = useState(400);
  const setCameraDistanceIfChanged = (d: number) => {
    setCameraDistance((prev) => (Math.abs(prev - d) > THRESH ? d : prev));
  };
  return (
    <GlobeCameraContext.Provider value={{ cameraDistance, setCameraDistanceIfChanged }}>
      {children}
    </GlobeCameraContext.Provider>
  );
}

export function useGlobeCameraDistance() {
  const c = useContext(GlobeCameraContext);
  if (!c) throw new Error("useGlobeCameraDistance: missing GlobeCameraProvider");
  return c;
}

export function useGlobeCameraDistanceSafe() {
  return useContext(GlobeCameraContext);
}

/** Camera distance ABOVE which globe.gl aircraft points stay visible; below, instanced 3D fleet shows. */
export const AIRCRAFT_MODEL_OVERLAY_FADE_DIST = 210;

export const SATELLITE_MODEL_OVERLAY_FADE_DIST = 280;
