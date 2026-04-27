import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function EmbraerE190Model(props: JSX.IntrinsicElements['group']) {
  const { whiteGeo, greyGeo, glassGeo } = useMemo(() => createE190Geometries(), []);

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
function createE190Geometries() {
  const whiteGeos: THREE.BufferGeometry[] = [];
  const greyGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];

  // High quality segments for single model viewing
  const radialSegments = 32;
  const sphereRadial = 32;
  const sphereHeight = 16;

  // Embraer E190 Dimensions
  const totalLength = 36.24;
  const radius = 1.35; // Exaggerate thinness of fuselage
  const noseLength = 3.8;
  const tailLength = 6.5;
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

  // COCKPIT WINDOW (Windshield - slightly different wrap for E-jets, simplified here)
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
  const rootChord = 5.5;
  const tipChord = 1.5;
  const wingSpanHalf = 14.36; // 28.72m total wingspan
  const sweepAngle = 23 * (Math.PI / 180); // slightly less sweep than larger jets

  const wingsGeo = new THREE.BoxGeometry(wingSpanHalf * 2, 0.35, rootChord, 10, 1, 10);
  const posAttribute = wingsGeo.attributes.position;
  
  for (let i = 0; i < posAttribute.count; i++) {
    const x = posAttribute.getX(i);
    const z = posAttribute.getZ(i);
    const sweep = Math.abs(x) * Math.tan(sweepAngle);
    const taper = THREE.MathUtils.lerp(1, tipChord / rootChord, Math.abs(x) / wingSpanHalf);
    posAttribute.setZ(i, z * taper - sweep);
  }
  wingsGeo.computeVertexNormals();
  wingsGeo.translate(0, -radius * 0.4, 0.8);
  whiteGeos.push(wingsGeo);

  // 4b. WINGLETS (Tall, almost vertical for E190)
  const wingletHeight = 2.0;
  const wingletGeo = new THREE.BoxGeometry(0.15, wingletHeight, tipChord, 2, 2, 2);
  const wingletPos = wingletGeo.attributes.position;
  const wingletSweep = 15 * (Math.PI / 180);

  for (let i = 0; i < wingletPos.count; i++) {
    let y = wingletPos.getY(i);
    let z = wingletPos.getZ(i);
    y = y + wingletHeight / 2; // pivot from bottom
    wingletPos.setY(i, y);

    const sweep = y * Math.tan(wingletSweep);
    const taper = THREE.MathUtils.lerp(1, 0.4, y / wingletHeight);
    wingletPos.setZ(i, z * taper - sweep);
  }
  wingletGeo.computeVertexNormals();

  const leftWinglet = wingletGeo.clone();
  leftWinglet.rotateZ(-5 * (Math.PI / 180)); // mostly vertical
  leftWinglet.translate(wingSpanHalf, -radius * 0.4, 0.8 - (wingSpanHalf * Math.tan(sweepAngle)));
  whiteGeos.push(leftWinglet);

  const rightWinglet = wingletGeo.clone();
  rightWinglet.rotateZ(5 * (Math.PI / 180));
  rightWinglet.translate(-wingSpanHalf, -radius * 0.4, 0.8 - (wingSpanHalf * Math.tan(sweepAngle)));
  whiteGeos.push(rightWinglet);

  // 5. ENGINES & PYLONS (Mounted close to fuselage)
  const engineRadius = 0.85;
  const engineLength = 2.8;
  const engineGeo = new THREE.CylinderGeometry(engineRadius, engineRadius, engineLength, radialSegments);
  engineGeo.rotateX(Math.PI / 2);

  const intakeGeo = new THREE.CylinderGeometry(engineRadius * 0.9, engineRadius * 0.9, 0.1, radialSegments);
  intakeGeo.rotateX(Math.PI / 2);

  const pylonBaseGeo = new THREE.BoxGeometry(0.3, 1.2, 2.0);

  const createEngineAndPylon = (xOffset: number) => {
    const sweepAtEngine = Math.abs(xOffset) * Math.tan(sweepAngle);
    const offsetZ = 0.8 - sweepAtEngine + 1.2;
    const offsetY = -radius * 0.3 - 1.0; 

    const nacelle = engineGeo.clone();
    nacelle.translate(xOffset, offsetY, offsetZ);

    const intake = intakeGeo.clone();
    intake.translate(0, 0, engineLength / 2 + 0.05);
    intake.translate(xOffset, offsetY, offsetZ);

    const exhaust = intakeGeo.clone();
    exhaust.translate(0, 0, -engineLength / 2 - 0.05);
    exhaust.translate(xOffset, offsetY, offsetZ);

    const pylonGeo = pylonBaseGeo.clone();
    pylonGeo.translate(0, 0.6, 0.0);
    pylonGeo.translate(xOffset, offsetY, offsetZ); 

    whiteGeos.push(nacelle, pylonGeo);
    greyGeos.push(intake, exhaust);
  };

  createEngineAndPylon(2.8); // almost flush beneath wings/fuselage
  createEngineAndPylon(-2.8);

  // 6. TAIL SECTION (Empennage)
  // Vertical Stabilizer
  const vertRootChord = 4.8;
  const vertTipChord = 1.8;
  const vertHeight = 5.5;
  const vertGeo = new THREE.BoxGeometry(0.25, vertHeight, vertRootChord, 1, 10, 2);
  const vertPos = vertGeo.attributes.position;
  const vertSweepAngle = 38 * (Math.PI / 180);
  
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
  vertGeo.translate(0, radius * 0.4, -bodyLength / 2 - 1.2);
  whiteGeos.push(vertGeo);

  // Horizontal stabilizers
  const horizSpanHalf = 5.5;
  const horizRootChord = 2.8;
  const horizTipChord = 1.0;
  const horizGeo = new THREE.BoxGeometry(horizSpanHalf * 2, 0.15, horizRootChord, 10, 1, 2);
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
  horizGeo.translate(0, radius * 0.2, -bodyLength / 2 - 2.5);
  whiteGeos.push(horizGeo);

  const whiteMerged = whiteGeos.length > 0 ? mergeGeometries(whiteGeos) : null;
  const greyMerged = greyGeos.length > 0 ? mergeGeometries(greyGeos) : null;
  const glassMerged = glassGeos.length > 0 ? mergeGeometries(glassGeos) : null;

  // Lower overall ground clearance for the regional jet posture
  if (whiteMerged) whiteMerged.translate(0, -0.8, 0);
  if (greyMerged) greyMerged.translate(0, -0.8, 0);
  if (glassMerged) glassMerged.translate(0, -0.8, 0);

  return {
    whiteGeo: whiteMerged,
    greyGeo: greyMerged,
    glassGeo: glassMerged
  };
}
