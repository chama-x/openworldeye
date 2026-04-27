/**
 * GlobeR3FOverlay
 *
 * A transparent R3F <Canvas> positioned absolutely over react-globe.gl.
 * Camera is synced every frame to the globe.gl camera so R3F objects
 * appear to sit on the globe surface.
 *
 * pointer-events: none — globe.gl handles all mouse/touch interaction.
 */

import type { ReactNode, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

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

interface GlobeR3FOverlayProps {
  globeRef: RefObject<GlobeMethods | undefined>;
  width: number;
  height: number;
  children: ReactNode;
}

export default function GlobeR3FOverlay({
  globeRef,
  width,
  height,
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
        {children}
      </Canvas>
    </div>
  );
}
