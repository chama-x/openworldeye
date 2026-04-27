import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function Boeing737Model(props: JSX.IntrinsicElements['group']) {
  const { whiteGeo, greyGeo, glassGeo } = useMemo(() => createB737Geometries(), []);

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
function createB737Geometries() {
  const whiteGeos: THREE.BufferGeometry[] = [];
  const greyGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];

  // High quality segments for single model viewing
  const radialSegments = 32;
  const sphereRadial = 32;
  const sphereHeight = 16;

  // Boeing 737-800 Dimensions
  const totalLength = 39.5;
  const radius = 1.88; // 3.76m diameter (slightly narrower than A320)
  const noseLength = 4.5; // Pointier nose
  const tailLength = 8.0;
  const bodyLength = totalLength - noseLength - tailLength;

  // 1. MAIN FUSELAGE
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, bodyLength, radialSegments);
  bodyGeo.rotateX(Math.PI / 2);
  whiteGeos.push(bodyGeo);

  // 2. NOSE CONE (Pointier for 737)
  const noseGeo = new THREE.SphereGeometry(1, sphereRadial, sphereHeight);
  noseGeo.scale(radius, radius, noseLength);
  noseGeo.translate(0, 0, bodyLength / 2);
  whiteGeos.push(noseGeo);

  // COCKPIT WINDOW (Windshield - 737 has a distinct 'V' shape but we maintain simple geometry)
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
  const rootChord = 7.0;
  const tipChord = 1.5;
  const wingSpanHalf = 17.9; // 35.8m total wingspan
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
  wingsGeo.translate(0, -radius * 0.5, 1.5);
  whiteGeos.push(wingsGeo);

  // 4b. WINGLETS (Distinct 737 tall vertical blended winglets)
  const wingletHeight = 3.2; // Taller
  const wingletGeo = new THREE.BoxGeometry(0.2, wingletHeight, tipChord, 2, 2, 2);
  const wingletPos = wingletGeo.attributes.position;
  const wingletSweep = 30 * (Math.PI / 180);

  for (let i = 0; i < wingletPos.count; i++) {
    let y = wingletPos.getY(i);
    let z = wingletPos.getZ(i);
    y = y + wingletHeight / 2; // pivot from bottom
    wingletPos.setY(i, y);

    const sweep = y * Math.tan(wingletSweep);
    const taper = THREE.MathUtils.lerp(1, 0.3, y / wingletHeight);
    wingletPos.setZ(i, z * taper - sweep);
  }
  wingletGeo.computeVertexNormals();

  const leftWinglet = wingletGeo.clone();
  // Transform to the left wing tip
  leftWinglet.rotateZ(-10 * (Math.PI / 180)); // More vertical cant angle
  leftWinglet.translate(wingSpanHalf, -radius * 0.5, 1.5 - (wingSpanHalf * Math.tan(sweepAngle)));
  whiteGeos.push(leftWinglet);

  const rightWinglet = wingletGeo.clone();
  // Transform to the right wing tip
  rightWinglet.rotateZ(10 * (Math.PI / 180)); // More vertical cant angle
  rightWinglet.translate(-wingSpanHalf, -radius * 0.5, 1.5 - (wingSpanHalf * Math.tan(sweepAngle)));
  whiteGeos.push(rightWinglet);

  // 5. ENGINES & PYLONS (CFM56 style flattened bottom simulated via scaling)
  const engineRadius = 1.0;
  const engineLength = 3.2;
  const engineGeo = new THREE.CylinderGeometry(engineRadius, engineRadius, engineLength, radialSegments);
  engineGeo.rotateX(Math.PI / 2);
  // Flatten the bottom explicitly like an iconic 737 CFM56 engine
  engineGeo.scale(1, 0.8, 1);
  engineGeo.translate(0, engineRadius * 0.1, 0); // shift up to stay aligned

  const intakeGeo = new THREE.CylinderGeometry(engineRadius * 0.9, engineRadius * 0.9, 0.1, radialSegments);
  intakeGeo.rotateX(Math.PI / 2);
  intakeGeo.scale(1, 0.8, 1);
  intakeGeo.translate(0, engineRadius * 0.1, 0);

  const pylonBaseGeo = new THREE.BoxGeometry(0.4, 1.5, 2.8);

  const createEngineAndPylon = (xOffset: number) => {
    const sweepAtEngine = Math.abs(xOffset) * Math.tan(sweepAngle);
    const offsetZ = 1.5 - sweepAtEngine + 1.6;
    const offsetY = -radius * 0.5 - 1.2; // tighter to the wing than A320

    const nacelle = engineGeo.clone();
    nacelle.translate(xOffset, offsetY, offsetZ);

    const intake = intakeGeo.clone();
    intake.translate(0, 0, engineLength / 2 + 0.05);
    intake.translate(xOffset, offsetY, offsetZ);

    const exhaust = intakeGeo.clone();
    exhaust.translate(0, 0, -engineLength / 2 - 0.05);
    exhaust.translate(xOffset, offsetY, offsetZ);

    const pylonGeo = pylonBaseGeo.clone();
    pylonGeo.translate(0, 0.8, 0.0);
    pylonGeo.translate(xOffset, offsetY, offsetZ); 

    whiteGeos.push(nacelle, pylonGeo);
    greyGeos.push(intake, exhaust);
  };

  createEngineAndPylon(5.5);
  createEngineAndPylon(-5.5);

  // 6. TAIL SECTION (Empennage)
  // Vertical Stabilizer
  const vertRootChord = 6.0;
  const vertTipChord = 2.0;
  const vertHeight = 6.8;
  const vertGeo = new THREE.BoxGeometry(0.3, vertHeight, vertRootChord, 1, 10, 2);
  const vertPos = vertGeo.attributes.position;
  const vertSweepAngle = 40 * (Math.PI / 180);
  
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
  vertGeo.translate(0, radius * 0.5, -bodyLength / 2 - 2.0);
  whiteGeos.push(vertGeo);

  // Dorsal fin (Distinctive 737 extension in front of vertical stabilizer)
  const dorsalGeo = new THREE.BoxGeometry(0.25, 2.5, 4.0, 1, 2, 2);
  const dorsalPos = dorsalGeo.attributes.position;
  for (let i = 0; i < dorsalPos.count; i++) {
    let y = dorsalPos.getY(i);
    let z = dorsalPos.getZ(i);
    y = y + 1.25; // pivot from base
    dorsalPos.setY(i, y);
    // Huge sweep
    const sweep = y * Math.tan(75 * Math.PI / 180);
    const taper = THREE.MathUtils.lerp(1, 0.1, y / 2.5);
    dorsalPos.setZ(i, z * taper - sweep);
  }
  dorsalGeo.computeVertexNormals();
  dorsalGeo.translate(0, radius * 0.5, -bodyLength / 2 + 1.5);
  whiteGeos.push(dorsalGeo);

  // Horizontal stabilizers
  const horizSpanHalf = 7.0;
  const horizRootChord = 4.0;
  const horizTipChord = 1.0;
  const horizGeo = new THREE.BoxGeometry(horizSpanHalf * 2, 0.2, horizRootChord, 10, 1, 2);
  const horizPos = horizGeo.attributes.position;
  const horizSweepAngle = 32 * (Math.PI / 180);
  
  for (let i = 0; i < horizPos.count; i++) {
    const x = horizPos.getX(i);
    const z = horizPos.getZ(i);
    const sweep = Math.abs(x) * Math.tan(horizSweepAngle);
    const taper = THREE.MathUtils.lerp(1, horizTipChord / horizRootChord, Math.abs(x) / horizSpanHalf);
    horizPos.setZ(i, z * taper - sweep);
  }
  horizGeo.computeVertexNormals();
  horizGeo.translate(0, radius * 0.3, -bodyLength / 2 - 3.5);
  whiteGeos.push(horizGeo);

  return {
    whiteGeo: whiteGeos.length > 0 ? mergeGeometries(whiteGeos) : null,
    greyGeo: greyGeos.length > 0 ? mergeGeometries(greyGeos) : null,
    glassGeo: glassGeos.length > 0 ? mergeGeometries(glassGeos) : null
  };
}
