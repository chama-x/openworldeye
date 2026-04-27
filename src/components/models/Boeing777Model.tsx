import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function Boeing777Model(props: JSX.IntrinsicElements['group']) {
  const { whiteGeo, greyGeo, glassGeo } = useMemo(() => createB777Geometries(), []);

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
function createB777Geometries() {
  const whiteGeos: THREE.BufferGeometry[] = [];
  const greyGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];

  // Smooth curves needed for widebody scale
  const radialSegments = 48;
  const sphereRadial = 48;
  const sphereHeight = 24;

  // Boeing 777-300ER Dimensions
  const totalLength = 73.9;
  const radius = 3.1; // 6.2m diameter (Noticeably thicker widebody fuselage)
  const noseLength = 6.5; // Blunted but large nose cone
  const tailLength = 14.0; // Long, stretched tail cone taper
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

  // COCKPIT WINDOW (Glass)
  const glassGeo = new THREE.SphereGeometry(1.01, sphereRadial, sphereHeight, Math.PI / 2 - 0.35, 0.7, 0.35, 0.3);
  glassGeo.scale(radius, radius, noseLength);
  glassGeo.translate(0, 0, bodyLength / 2);
  glassGeos.push(glassGeo);

  // 3. TAIL CONE (Long taper)
  const tailGeo = new THREE.SphereGeometry(1, sphereRadial, sphereHeight);
  tailGeo.scale(radius, radius, tailLength);
  tailGeo.translate(0, 0, -bodyLength / 2);
  whiteGeos.push(tailGeo);

  // 4. WINGS (Massive widebody wings)
  const rootChord = 15.0;
  const tipChord = 3.5;
  const wingSpanHalf = 32.4; // 64.8m total wingspan
  const sweepAngle = 31.6 * (Math.PI / 180);

  const wingsGeo = new THREE.BoxGeometry(wingSpanHalf * 2, 0.9, rootChord, 16, 1, 16);
  const posAttribute = wingsGeo.attributes.position;
  
  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const z = posAttribute.getZ(i);
    const sweep = Math.abs(x) * Math.tan(sweepAngle);
    const taper = THREE.MathUtils.lerp(1, tipChord / rootChord, Math.abs(x) / wingSpanHalf);
    posAttribute.setZ(i, z * taper - sweep);
  }
  wingsGeo.computeVertexNormals();
  wingsGeo.translate(0, -radius * 0.4, 3.0);
  whiteGeos.push(wingsGeo);

  // 4b. RAKED WINGTIPS (Iconic 777 trait, angled upwards and backwards)
  const rakedLength = 3.0; // Extend further
  const rakedHeight = 0.4;
  const rakedSweep = 45 * (Math.PI / 180);

  // Left Raked Wingtip
  const leftRakedGeo = new THREE.BoxGeometry(rakedLength, rakedHeight, tipChord, 2, 2, 2);
  const leftRakedPos = leftRakedGeo.attributes.position;
  for (let i = 0; i < leftRakedPos.count; i++) {
    let x = leftRakedPos.getX(i);
    let z = leftRakedPos.getZ(i);
    x = x + rakedLength / 2; // pivot from base
    leftRakedPos.setX(i, x);

    const sweep = Math.abs(x) * Math.tan(rakedSweep);
    const taper = THREE.MathUtils.lerp(1, 0.2, Math.abs(x) / rakedLength);
    leftRakedPos.setZ(i, z * taper - sweep);
  }
  leftRakedGeo.computeVertexNormals();
  const leftRaked = leftRakedGeo.clone();
  leftRaked.rotateZ(12 * (Math.PI / 180)); // 12-degree upward rake dihedral
  leftRaked.translate(wingSpanHalf, -radius * 0.4, 3.0 - (wingSpanHalf * Math.tan(sweepAngle)));
  whiteGeos.push(leftRaked);

  // Right Raked Wingtip
  const rightRakedGeo = new THREE.BoxGeometry(rakedLength, rakedHeight, tipChord, 2, 2, 2);
  const rightRakedPos = rightRakedGeo.attributes.position;
  for (let i = 0; i < rightRakedPos.count; i++) {
    let x = rightRakedPos.getX(i);
    let z = rightRakedPos.getZ(i);
    x = x - rakedLength / 2; // pivot from base (negative side)
    rightRakedPos.setX(i, x);

    const sweep = Math.abs(x) * Math.tan(rakedSweep);
    const taper = THREE.MathUtils.lerp(1, 0.2, Math.abs(x) / rakedLength);
    rightRakedPos.setZ(i, z * taper - sweep);
  }
  rightRakedGeo.computeVertexNormals();
  const rightRaked = rightRakedGeo.clone();
  rightRaked.rotateZ(-12 * (Math.PI / 180)); // -12-degree upward rake
  rightRaked.translate(-wingSpanHalf, -radius * 0.4, 3.0 - (wingSpanHalf * Math.tan(sweepAngle)));
  whiteGeos.push(rightRaked);

  // 5. ENGINES & PYLONS (Massive GE90 Engines)
  const engineRadius = 1.7; // ~3.4m diameter
  const engineLength = 7.3;
  const engineGeo = new THREE.CylinderGeometry(engineRadius, engineRadius, engineLength, radialSegments);
  engineGeo.rotateX(Math.PI / 2);

  const intakeGeo = new THREE.CylinderGeometry(engineRadius * 0.9, engineRadius * 0.9, 0.2, radialSegments);
  intakeGeo.rotateX(Math.PI / 2);

  const pylonBaseGeo = new THREE.BoxGeometry(0.8, 3.5, 5.0);

  const createEngineAndPylon = (xOffset: number) => {
    const sweepAtEngine = Math.abs(xOffset) * Math.tan(sweepAngle);
    const offsetZ = 3.0 - sweepAtEngine + 3.0; // Hang forward off the wing
    const offsetY = -radius * 0.4 - 2.2; // Significant hang beneath the wing

    const nacelle = engineGeo.clone();
    nacelle.translate(xOffset, offsetY, offsetZ);

    const intake = intakeGeo.clone();
    intake.translate(0, 0, engineLength / 2 + 0.1);
    intake.translate(xOffset, offsetY, offsetZ);

    const exhaust = intakeGeo.clone();
    exhaust.translate(0, 0, -engineLength / 2 - 0.1);
    exhaust.translate(xOffset, offsetY, offsetZ);

    const pylonGeo = pylonBaseGeo.clone();
    pylonGeo.translate(0, 1.75, 0.0);
    pylonGeo.translate(xOffset, offsetY, offsetZ); 

    whiteGeos.push(nacelle, pylonGeo);
    greyGeos.push(intake, exhaust);
  };

  // Mount massive engines roughly 11m from center
  createEngineAndPylon(11.0);
  createEngineAndPylon(-11.0);

  // Landing Gear Blocks (Main gear bays hinting at the 6-wheel bogies)
  const gearBayGeo = new THREE.BoxGeometry(2.0, 1.5, 5.0);
  const leftGearBay = gearBayGeo.clone();
  leftGearBay.translate(4.0, -radius * 0.8, 4.0);
  const rightGearBay = gearBayGeo.clone();
  rightGearBay.translate(-4.0, -radius * 0.8, 4.0);
  greyGeos.push(leftGearBay, rightGearBay);

  // 6. TAIL SECTION (Empennage)
  // Vertical Stabilizer
  const vertRootChord = 10.0;
  const vertTipChord = 3.5;
  const vertHeight = 11.5;
  const vertGeo = new THREE.BoxGeometry(0.5, vertHeight, vertRootChord, 1, 10, 2);
  const vertPos = vertGeo.attributes.position;
  const vertSweepAngle = 45 * (Math.PI / 180);
  
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
  vertGeo.translate(0, radius * 0.5, -bodyLength / 2 - 4.0);
  whiteGeos.push(vertGeo);

  // Horizontal stabilizers
  const horizSpanHalf = 10.7; // ~21.4m span
  const horizRootChord = 6.0;
  const horizTipChord = 1.5;
  const horizGeo = new THREE.BoxGeometry(horizSpanHalf * 2, 0.4, horizRootChord, 10, 1, 2);
  const horizPos = horizGeo.attributes.position;
  const horizSweepAngle = 35 * (Math.PI / 180);
  
  for (let i = 0; i < horizPos.count; i++) {
    const x = horizPos.getX(i);
    const z = horizPos.getZ(i);
    const sweep = Math.abs(x) * Math.tan(horizSweepAngle);
    const taper = THREE.MathUtils.lerp(1, horizTipChord / horizRootChord, Math.abs(x) / horizSpanHalf);
    horizPos.setZ(i, z * taper - sweep);
  }
  horizGeo.computeVertexNormals();
  horizGeo.translate(0, radius * 0.2, -bodyLength / 2 - 6.0);
  whiteGeos.push(horizGeo);

  const whiteMerged = whiteGeos.length > 0 ? mergeGeometries(whiteGeos) : null;
  const greyMerged = greyGeos.length > 0 ? mergeGeometries(greyGeos) : null;
  const glassMerged = glassGeos.length > 0 ? mergeGeometries(glassGeos) : null;

  // Lift slightly for massive size to maintain accurate ground clearance at Y=0 (grid is Y=-5)
  if (whiteMerged) whiteMerged.translate(0, 1.8, 0);
  if (greyMerged) greyMerged.translate(0, 1.8, 0);
  if (glassMerged) glassMerged.translate(0, 1.8, 0);

  return {
    whiteGeo: whiteMerged,
    greyGeo: greyMerged,
    glassGeo: glassMerged
  };
}
