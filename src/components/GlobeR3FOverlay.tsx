/**
 * GlobeR3FOverlay
 *
 * A transparent R3F <Canvas> positioned absolutely over react-globe.gl.
 * Camera is synced every frame to the globe.gl camera so R3F objects
 * appear to sit on the globe surface.
 *
 * Pointer events: The R3F canvas listens for pointer events (clicks,
 * hover) on its own transparent canvas so R3F meshes can be clicked.
 * Globe.gl still receives pointer events because R3F's raycaster only
 * consumes events that hit R3F objects — misses fall through to
 * the globe below via CSS pointer-events on the wrapper div.
 */

import type { ReactNode, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { useGlobeCameraDistance } from "@/contexts/GlobeCameraContext";

interface CameraSyncProps {
  globeRef: RefObject<GlobeMethods | undefined>;
}

function CameraSync({ globeRef }: CameraSyncProps) {
  const { camera } = useThree();

  useFrame(() => {
    const globeCam = globeRef.current?.camera() as THREE.PerspectiveCamera | undefined;
    if (!globeCam) return;
    camera.position.copy(globeCam.position);
    camera.quaternion.copy(globeCam.quaternion);
    (camera as THREE.PerspectiveCamera).fov = globeCam.fov;
    (camera as THREE.PerspectiveCamera).near = globeCam.near;
    (camera as THREE.PerspectiveCamera).far = globeCam.far;
    camera.projectionMatrix.copy(globeCam.projectionMatrix);
    camera.projectionMatrixInverse.copy(globeCam.projectionMatrixInverse);
  });

  return null;
}

/**
 * Publishes globe camera distance to React (throttled) so the deck can hide
 * globe.gl point sprites when instanced 3D models are in view.
 */
function CameraDistanceSync({ globeRef }: CameraSyncProps) {
  const { setCameraDistanceIfChanged } = useGlobeCameraDistance();
  useFrame(() => {
    const globeCam = globeRef.current?.camera() as THREE.PerspectiveCamera | undefined;
    if (globeCam) setCameraDistanceIfChanged(globeCam.position.length());
  });
  return null;
}

interface GlobeR3FOverlayProps {
  globeRef: RefObject<GlobeMethods | undefined>;
  width: number;
  height: number;
  eventSource?: any; // any bypasses R3F strict null checks for RefObject
  children: ReactNode;
}

export default function GlobeR3FOverlay({
  globeRef,
  width,
  height,
  eventSource,
  children,
}: GlobeR3FOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <Canvas
        eventSource={eventSource}
        eventPrefix="client"
        style={{
          background: "transparent",
          width: `${width}px`,
          height: `${height}px`,
        }}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 50, near: 0.1, far: 10000 }}
        frameloop="always"
      >
        <CameraSync globeRef={globeRef} />
        <CameraDistanceSync globeRef={globeRef} />
        {children}
      </Canvas>
    </div>
  );
}
