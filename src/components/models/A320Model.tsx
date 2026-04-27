import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function A320Model(props: JSX.IntrinsicElements['group']) {
  const { whiteGeo, greyGeo, glassGeo } = useMemo(() => createA320Geometries(), []);

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
    </group>
  );
}

// --------------------------------------------------------
// Geometry Generation (1 Unit = 1 Meter)
// --------------------------------------------------------
function createA320Geometries() {
  const whiteGeos: THREE.BufferGeometry[] = [];
  const greyGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];

  // High quality segments for single model viewing
  const radialSegments = 32;
  const sphereRadial = 32;
  const sphereHeight = 16;

  const totalLength = 37.57;
  const radius = 1.975; // 3.95m diameter
  const noseLength = 4.0;
  const tailLength = 7.0;
  const bodyLength = totalLength - noseLength - tailLength;

  // 1. MAIN FUSELAGE
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyLength, radialSegments);
  bodyGeo.rotateX(Math.PI / 2);
  whiteGeos.push(bodyGeo);

  // 2. NOSE CONE (Rounder/blunter for A320)
  const noseGeo = new THREE.SphereGeometry(1, sphereRadial, sphereHeight);
  noseGeo.scale(radius, radius, noseLength * 0.85); // Plumper, blunter nose
  noseGeo.translate(0, 0, bodyLength / 2);
  whiteGeos.push(noseGeo);

  // COCKPIT WINDOW (Windshield)
  const glassGeo = new THREE.SphereGeometry(1.01, sphereRadial, sphereHeight, Math.PI / 2 - 0.45, 0.9, 0.35, 0.3);
  glassGeo.scale(radius, radius, noseLength);
  glassGeo.translate(0, 0, bodyLength / 2);
  glassGeos.push(glassGeo);

  // 3. TAIL CONE
  const tailGeo = new THREE.SphereGeometry(1, sphereRadial, sphereHeight);
  tailGeo.scale(radius, radius, tailLength);
  tailGeo.translate(0, 0, -bodyLength / 2);
  whiteGeos.push(tailGeo);

  // 4. WINGS (Swept back)
  const rootChord = 6.5;
  const tipChord = 1.8;
  const wingSpanHalf = 15.9 + radius;
  const sweepAngle = 25 * (Math.PI / 180);

  const wingsGeo = new THREE.BoxGeometry(wingSpanHalf * 2, 0.4, rootChord, 10, 1, 10);
  const posAttribute = wingsGeo.attributes.position;
  
  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const z = posAttribute.getZ(i);
    const sweep = Math.abs(x) * Math.tan(sweepAngle);
    const taper = THREE.MathUtils.lerp(1, tipChord / rootChord, Math.abs(x) / wingSpanHalf);
    posAttribute.setZ(i, z * taper - sweep);
  }
  wingsGeo.computeVertexNormals();
  wingsGeo.translate(0, -radius * 0.5, 1.0);
  whiteGeos.push(wingsGeo);

  // 4b. WINGTIP FENCES (Sharklets - small triangular fences extending above and below)
  const fenceGeo = new THREE.BoxGeometry(0.1, 1.2, 1.5);
  // Shape the fence
  const fencePos = fenceGeo.attributes.position;
  for (let i = 0; i < fencePos.count; i++) {
    let y = fencePos.getY(i);
    let z = fencePos.getZ(i);
    // Taper top and bottom
    const taper = THREE.MathUtils.lerp(1, 0.4, Math.abs(y) / 0.6);
    fencePos.setZ(i, z * taper - Math.abs(y) * 0.5);
  }
  fenceGeo.computeVertexNormals();

  const leftFence = fenceGeo.clone();
  leftFence.translate(wingSpanHalf, -radius * 0.5, 1.0 - (wingSpanHalf * Math.tan(sweepAngle)) + 0.2);
  whiteGeos.push(leftFence);

  const rightFence = fenceGeo.clone();
  rightFence.translate(-wingSpanHalf, -radius * 0.5, 1.0 - (wingSpanHalf * Math.tan(sweepAngle)) + 0.2);
  whiteGeos.push(rightFence);

  // 5. ENGINES & PYLONS
  const engineRadius = 1.0;
  const engineLength = 3.2;
  const engineGeo = new THREE.CylinderGeometry(engineRadius, engineRadius, engineLength, radialSegments);
  engineGeo.rotateX(Math.PI / 2);

  const intakeGeo = new THREE.CylinderGeometry(engineRadius * 0.9, engineRadius * 0.9, 0.1, radialSegments);
  intakeGeo.rotateX(Math.PI / 2);

  const pylonBaseGeo = new THREE.BoxGeometry(0.4, 1.8, 2.2);

  const createEngineAndPylon = (xOffset: number) => {
    const sweepAtEngine = Math.abs(xOffset) * Math.tan(sweepAngle);
    const offsetZ = 1.0 - sweepAtEngine + 1.2;
    const offsetY = -radius * 0.6 - 1.4;

    const nacelle = engineGeo.clone();
    nacelle.translate(xOffset, offsetY, offsetZ);

    const intake = intakeGeo.clone();
    intake.translate(0, 0, engineLength / 2 + 0.05);
    intake.translate(xOffset, offsetY, offsetZ);

    const exhaust = intakeGeo.clone();
    exhaust.translate(0, 0, -engineLength / 2 - 0.05);
    exhaust.translate(xOffset, offsetY, offsetZ);

    const pylonGeo = pylonBaseGeo.clone();
    pylonGeo.translate(0, 0.9, 0.2);
    pylonGeo.translate(xOffset, offsetY, offsetZ); 

    whiteGeos.push(nacelle, pylonGeo);
    greyGeos.push(intake, exhaust);
  };

  createEngineAndPylon(6.5);
  createEngineAndPylon(-6.5);

  // 6. TAIL SECTION (Empennage)
  // Vertical Stabilizer
  const vertRootChord = 5.5;
  const vertTipChord = 2.0;
  const vertHeight = 6.2;
  const vertGeo = new THREE.BoxGeometry(0.3, vertHeight, vertRootChord, 1, 10, 2);
  const vertPos = vertGeo.attributes.position;
  const vertSweepAngle = 35 * (Math.PI / 180);
  
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
  vertGeo.translate(0, radius * 0.5, -bodyLength / 2 - 1.5);
  whiteGeos.push(vertGeo);

  // Horizontal stabilizers
  const horizSpanHalf = 6.5;
  const horizRootChord = 3.8;
  const horizTipChord = 1.2;
  const horizGeo = new THREE.BoxGeometry(horizSpanHalf * 2, 0.2, horizRootChord, 10, 1, 2);
  const horizPos = horizGeo.attributes.position;
  const horizSweepAngle = 30 * (Math.PI / 180);
  
  for (let i = 0; i < horizPos.count; i++) {
    const x = horizPos.getX(i);
    const z = horizPos.getZ(i);
    const sweep = Math.abs(x) * Math.tan(horizSweepAngle);
    const taper = THREE.MathUtils.lerp(1, horizTipChord / horizRootChord, Math.abs(x) / horizSpanHalf);
    horizPos.setZ(i, z * taper - sweep);
  }
  horizGeo.computeVertexNormals();
  horizGeo.translate(0, radius * 0.2, -bodyLength / 2 - 2.8);
  whiteGeos.push(horizGeo);

  return {
    whiteGeo: whiteGeos.length > 0 ? mergeGeometries(whiteGeos) : null,
    greyGeo: greyGeos.length > 0 ? mergeGeometries(greyGeos) : null,
    glassGeo: glassGeos.length > 0 ? mergeGeometries(glassGeos) : null
  };
}
