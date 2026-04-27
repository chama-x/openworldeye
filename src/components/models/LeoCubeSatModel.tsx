import { useMemo, type JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function LeoCubeSatModel(props: JSX.IntrinsicElements["group"]) {
  const { bodyGeo, panelGeo } = useMemo(() => createCubeSatGeometries("gallery"), []);

  return (
    <group {...props} dispose={null}>
      {bodyGeo && (
        <mesh geometry={bodyGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x4a4a5a} roughness={0.2} metalness={0.9} />
        </mesh>
      )}
      {panelGeo && (
        <mesh geometry={panelGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x1a237e} roughness={0.3} metalness={0.8} />
        </mesh>
      )}
    </group>
  );
}

// --------------------------------------------------------
// Geometry Generation (1 Unit = 1 Meter)
// --------------------------------------------------------
export function createCubeSatGeometries(quality: "gallery" | "globe" = "gallery") {
  const bodyGeos: THREE.BufferGeometry[] = [];
  const panelGeos: THREE.BufferGeometry[] = [];
  const cylSeg = quality === "globe" ? 4 : 8;

  // CubeSat Dimensions
  const bodyWidth = 0.1;
  const bodyDepth = 0.1;
  const bodyHeight = 0.3; // 3U cube

  // 1. MAIN BODY (3U Box)
  const coreGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
  bodyGeos.push(coreGeo);

  // 2. ANTENNA STUB
  const antennaRadius = 0.0025; // 0.005 diameter
  const antennaLength = 0.08;
  const antennaGeo = new THREE.CylinderGeometry(antennaRadius, antennaRadius, antennaLength, cylSeg);
  antennaGeo.translate(0, bodyHeight / 2 + antennaLength / 2, 0); // On top of body
  bodyGeos.push(antennaGeo);

  // 3. SOLAR PANELS (Deployed like wings)
  const panelWidth = 0.3; // extend outward (this becomes X length when translated)
  const panelHeight = 0.3; // tall as the body
  const panelDepth = 0.005; // very thin

  // Left panel
  const leftPanelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
  leftPanelGeo.translate(bodyWidth / 2 + panelWidth / 2, 0, 0);
  panelGeos.push(leftPanelGeo);

  // Right panel
  const rightPanelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
  rightPanelGeo.translate(-bodyWidth / 2 - panelWidth / 2, 0, 0);
  panelGeos.push(rightPanelGeo);


  return {
    bodyGeo: bodyGeos.length > 0 ? mergeGeometries(bodyGeos) : null,
    panelGeo: panelGeos.length > 0 ? mergeGeometries(panelGeos) : null
  };
}
