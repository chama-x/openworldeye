import { useMemo, type JSX } from "react";
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { atrTess } from '@/lib/model-geometry-constants';

export function ATR72Model(props: JSX.IntrinsicElements['group']) {
  const { whiteGeo, greyGeo, glassGeo, propGeo } = useMemo(() => createATR72Geometries("gallery"), []);

  return (
    <group {...props} dispose={null}>
      {whiteGeo && (
        <mesh geometry={whiteGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
        </mesh>
      )}
      {greyGeo && (
        <mesh geometry={greyGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x333333} roughness={0.8} metalness={0.2} />
        </mesh>
      )}
      {glassGeo && (
        <mesh geometry={glassGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x111111} roughness={0.1} metalness={0.8} />
        </mesh>
      )}
      {propGeo && (
        <mesh geometry={propGeo} castShadow={false} receiveShadow={false}>
          <meshStandardMaterial color={0x222222} transparent opacity={0.3} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// --------------------------------------------------------
// Geometry Generation (1 Unit = 1 Meter)
// --------------------------------------------------------
export function createATR72Geometries(quality: "gallery" | "globe" = "gallery") {
  const whiteGeos: THREE.BufferGeometry[] = [];
  const greyGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];
  const propGeos: THREE.BufferGeometry[] = [];

  const t = atrTess(quality);
  const radialSegments = t.radial;
  const sphereRadial = t.sphere;
  const sphereHeight = t.sphereH;
  const propDiscSegs = Math.max(5, t.radial);

  // ATR 72 Dimensions
  const totalLength = 27.17;
  const radius = 1.4; // ~2.8m diameter
  const noseLength = 3.5;
  const tailLength = 6.0;
  const bodyLength = totalLength - noseLength - tailLength;

  // 1. MAIN FUSELAGE
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyLength, radialSegments);
  bodyGeo.rotateX(Math.PI / 2);
  whiteGeos.push(bodyGeo);

  // 2. NOSE CONE
  const noseGeo = new THREE.SphereGeometry(1, sphereRadial, sphereHeight);
  noseGeo.scale(radius, radius, noseLength);
  noseGeo.translate(0, 0, bodyLength / 2);
  whiteGeos.push(noseGeo);

  // COCKPIT WINDOW (Windshield)
  const glassGeo = new THREE.SphereGeometry(1.02, sphereRadial, sphereHeight, Math.PI / 2 - 0.45, 0.9, 0.35, 0.3);
  glassGeo.scale(radius, radius, noseLength);
  glassGeo.translate(0, 0, bodyLength / 2);
  glassGeos.push(glassGeo);

  // 3. TAIL CONE
  const tailGeo = new THREE.SphereGeometry(1, sphereRadial, sphereHeight);
  tailGeo.scale(radius, radius, tailLength);
  tailGeo.translate(0, 0, -bodyLength / 2);
  whiteGeos.push(tailGeo);

  // 4. WINGS (High-wing, straight with minimal sweep)
  const rootChord = 2.8;
  const tipChord = 1.2;
  const wingSpanHalf = 13.525; // 27.05m total wingspan
  const sweepAngle = 3 * (Math.PI / 180); // very slight sweep for turboprop

  const wingsGeo = new THREE.BoxGeometry(wingSpanHalf * 2, 0.3, rootChord, 10, 1, 10);
  const posAttribute = wingsGeo.attributes.position;
  
  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const z = posAttribute.getZ(i);
    const sweep = Math.abs(x) * Math.tan(sweepAngle);
    const taper = THREE.MathUtils.lerp(1, tipChord / rootChord, Math.abs(x) / wingSpanHalf);
    posAttribute.setZ(i, z * taper - sweep);
  }
  wingsGeo.computeVertexNormals();
  // High-wing placement: strictly ON TOP of the fuselage
  wingsGeo.translate(0, radius * 1.0, -1.0);
  whiteGeos.push(wingsGeo);

  // 5. ENGINES & PROPELLERS
  const engineRadius = 0.6;
  const engineLength = 3.5;
  const engineGeo = new THREE.CylinderGeometry(engineRadius, engineRadius, engineLength, radialSegments);
  engineGeo.rotateX(Math.PI / 2);

  const exhaustGeo = new THREE.CylinderGeometry(engineRadius * 0.7, engineRadius * 0.4, 0.5, radialSegments);
  exhaustGeo.rotateX(Math.PI / 2);

  // Propeller Disc (represents spinning blades)
  const propDiscGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.05, propDiscSegs);
  propDiscGeo.rotateX(Math.PI / 2);

  const createEngine = (xOffset: number) => {
    const sweepAtEngine = Math.abs(xOffset) * Math.tan(sweepAngle);
    const offsetZ = -1.0 - sweepAtEngine + 0.5; // push forward of the wing
    const offsetY = radius * 0.5; // Underslung/inline with high wing

    const nacelle = engineGeo.clone();
    nacelle.translate(xOffset, offsetY, offsetZ);

    const exhaust = exhaustGeo.clone();
    exhaust.translate(0, 0, -engineLength / 2 - 0.25);
    exhaust.translate(xOffset, offsetY, offsetZ);

    // Add spinner cone
    const spinnerGeo = new THREE.ConeGeometry(0.3, 0.6, Math.max(4, Math.floor(t.radial / 2)));
    spinnerGeo.rotateX(Math.PI / 2);
    spinnerGeo.translate(0, 0, engineLength / 2 + 0.3);
    spinnerGeo.translate(xOffset, offsetY, offsetZ);

    // Add prop disc
    const propDisc = propDiscGeo.clone();
    propDisc.translate(0, 0, engineLength / 2 + 0.1);
    propDisc.translate(xOffset, offsetY, offsetZ);

    whiteGeos.push(nacelle, spinnerGeo);
    greyGeos.push(exhaust);
    propGeos.push(propDisc);
  };

  createEngine(4.0);
  createEngine(-4.0);

  // 6. TAIL SECTION (T-Tail Empennage)
  // Vertical Stabilizer
  const vertRootChord = 3.5;
  const vertTipChord = 2.0;
  const vertHeight = 4.8;
  const vertGeo = new THREE.BoxGeometry(0.25, vertHeight, vertRootChord, 1, 10, 2);
  const vertPos = vertGeo.attributes.position;
  const vertSweepAngle = 25 * (Math.PI / 180);
  
  for (let i = 0; i < vertPos.count; i++) {
    let y = vertPos.getY(i);
    let z = vertPos.getZ(i);
    y = y + vertHeight / 2;
    vertPos.setY(i, y);

    const sweep = y * Math.tan(vertSweepAngle);
    const taper = THREE.MathUtils.lerp(1, vertTipChord / vertRootChord, y / vertHeight);
    vertPos.setZ(i, z * taper - sweep);
  }
  vertGeo.computeVertexNormals();
  // Place on top of tail cone
  vertGeo.translate(0, radius * 0.4, -bodyLength / 2 - 2.5);
  whiteGeos.push(vertGeo);

  // Horizontal stabilizers (T-Tail -> strictly at the very top of the vertical stabilizer)
  const horizSpanHalf = 3.8;
  const horizRootChord = 1.5;
  const horizTipChord = 0.8;
  const horizGeo = new THREE.BoxGeometry(horizSpanHalf * 2, 0.25, horizRootChord, 10, 1, 2); // Thicker for prominence
  const horizPos = horizGeo.attributes.position;
  const horizSweepAngle = 10 * (Math.PI / 180);
  
  for (let i = 0; i < horizPos.count; i++) {
    const x = horizPos.getX(i);
    const z = horizPos.getZ(i);
    const sweep = Math.abs(x) * Math.tan(horizSweepAngle);
    const taper = THREE.MathUtils.lerp(1, horizTipChord / horizRootChord, Math.abs(x) / horizSpanHalf);
    horizPos.setZ(i, z * taper - sweep);
  }
  horizGeo.computeVertexNormals();
  
  // Translate strictly to the very top of the vertical stabilizer
  const vertSweepOffsetAtTop = vertHeight * Math.tan(vertSweepAngle);
  horizGeo.translate(0, radius * 0.4 + vertHeight, -bodyLength / 2 - 2.5 - vertSweepOffsetAtTop + 0.5);
  whiteGeos.push(horizGeo);

  return {
    whiteGeo: whiteGeos.length > 0 ? mergeGeometries(whiteGeos) : null,
    greyGeo: greyGeos.length > 0 ? mergeGeometries(greyGeos) : null,
    glassGeo: glassGeos.length > 0 ? mergeGeometries(glassGeos) : null,
    propGeo: propGeos.length > 0 ? mergeGeometries(propGeos) : null
  };
}
