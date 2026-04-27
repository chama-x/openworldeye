import { useMemo, type JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type ModelQuality = "gallery" | "globe";

/**
 * Procedural narrowbody-class silhouette in **meters** (~B737-scale) for consistency with
 * Boeing737Model / instanced globe fleet.
 */
export function createGenericAircraftGeometries(quality: ModelQuality = "gallery") {
  const whiteGeos: THREE.BufferGeometry[] = [];
  const greyGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];

  const capLen = quality === "globe" ? 3 : 6;
  const capRad = quality === "globe" ? 6 : 12;

  const fuselageRad = 1.85;
  const fuselageLen = 30;
  const bodyGeo = new THREE.CapsuleGeometry(fuselageRad, fuselageLen, capLen, capRad);
  bodyGeo.rotateX(Math.PI / 2);
  whiteGeos.push(bodyGeo);

  const wingSpan = 35;
  const wingChord = 5.5;
  const wingsGeo = new THREE.BoxGeometry(wingSpan, 0.35, wingChord, quality === "globe" ? 4 : 10, 1, 4);
  wingsGeo.rotateY(0.08 * Math.PI);
  wingsGeo.translate(0, fuselageRad * 0.35, fuselageLen * 0.02);
  whiteGeos.push(wingsGeo);

  const wingletSeg = quality === "globe" ? 2 : 3;
  const addWinglet = (dir: number) => {
    const g = new THREE.BoxGeometry(3.5, 0.22, 1.8, wingletSeg, 1, wingletSeg);
    g.rotateZ(dir * 0.06);
    g.translate(dir * (wingSpan / 2 - 1.2), fuselageRad * 0.55, 1.5);
    whiteGeos.push(g);
  };
  addWinglet(-1);
  addWinglet(1);

  const horizGeo = new THREE.BoxGeometry(14, 0.22, 4.5, 6, 1, 3);
  horizGeo.translate(0, fuselageRad * 0.15, -fuselageLen / 2 - 3);
  whiteGeos.push(horizGeo);

  const vertGeo = new THREE.BoxGeometry(0.45, 7.5, 5.5, 1, 4, 3);
  vertGeo.translate(0, fuselageRad + 3.2, -fuselageLen / 2 - 3.2);
  whiteGeos.push(vertGeo);

  const engGeo = new THREE.CapsuleGeometry(0.85, 4.2, 3, capRad);
  engGeo.rotateZ(Math.PI / 2);
  engGeo.translate(-11, -fuselageRad * 0.9, 1.5);
  greyGeos.push(engGeo);
  const engGeoR = engGeo.clone();
  engGeoR.scale(-1, 1, 1);
  engGeoR.translate(22, 0, 0);
  greyGeos.push(engGeoR);

  const cockpitGeo = new THREE.BoxGeometry(fuselageRad * 1.9, fuselageRad * 0.9, 3.5, 2, 2, 2);
  cockpitGeo.translate(0, fuselageRad * 0.35, fuselageLen / 2 + 1.5);
  glassGeos.push(cockpitGeo);

  return {
    whiteGeo: mergeGeometries(whiteGeos),
    greyGeo: mergeGeometries(greyGeos),
    glassGeo: mergeGeometries(glassGeos),
  };
}

export function GenericAircraftModel({
  scale = 1,
  color = "#ffffff",
  ...props
}: JSX.IntrinsicElements["group"] & {
  scale?: number;
  color?: string;
}) {
  const { whiteGeo, greyGeo, glassGeo } = useMemo(() => createGenericAircraftGeometries("gallery"), []);

  return (
    <group {...props} dispose={null} scale={scale}>
      {whiteGeo && (
        <mesh geometry={whiteGeo} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
        </mesh>
      )}
      {greyGeo && (
        <mesh geometry={greyGeo} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.35} />
        </mesh>
      )}
      {glassGeo && (
        <mesh geometry={glassGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x0a1018} roughness={0.12} metalness={0.8} />
        </mesh>
      )}
    </group>
  );
}
