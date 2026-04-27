import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function IntBall() {
  const ballRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!ballRef.current) return;
    const t = state.clock.elapsedTime;
    // Base hover position: slightly above and in front of the main module cluster
    ballRef.current.position.x = 2 + Math.cos(t * 0.8) * 1.5;
    ballRef.current.position.y = 1 + Math.sin(t * 1.2) * 0.8;
    ballRef.current.position.z = 8 + Math.sin(t * 1.5) * 1.5;

    // Gentle looking around
    ballRef.current.rotation.y = Math.sin(t * 0.5) * 0.8;
    ballRef.current.rotation.x = Math.cos(t * 0.7) * 0.3;
    ballRef.current.rotation.z = Math.sin(t * 0.3) * 0.2;
  });

  return (
    <group ref={ballRef}>
      {/* Main White Body */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color={0xffffff} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Black Face Plate */}
      <mesh position={[0, 0, 0.2]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={0x111111} roughness={0.8} />
      </mesh>
      {/* Left Eye */}
      <mesh position={[-0.12, 0.08, 0.45]}>
        <torusGeometry args={[0.06, 0.02, 16, 32]} />
        <meshBasicMaterial color={0x00ffff} />
      </mesh>
      {/* Right Eye */}
      <mesh position={[0.12, 0.08, 0.45]}>
        <torusGeometry args={[0.06, 0.02, 16, 32]} />
        <meshBasicMaterial color={0x00ffff} />
      </mesh>
    </group>
  );
}

export function ISSModel(props: JSX.IntrinsicElements['group']) {
  const { trussGeo, moduleGeo, panelGeo, radiatorGeo } = useMemo(() => createISSGeometries(), []);

  return (
    <group {...props} dispose={null}>
      {trussGeo && (
        <mesh geometry={trussGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x8899aa} roughness={0.3} metalness={0.9} />
        </mesh>
      )}
      {moduleGeo && (
        <mesh geometry={moduleGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xc8ccd8} roughness={0.4} metalness={0.7} />
        </mesh>
      )}
      {panelGeo && (
        <mesh geometry={panelGeo} castShadow receiveShadow>
          <meshStandardMaterial 
            color={0xc8860a} 
            roughness={0.65} 
            metalness={0.3} 
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
      {radiatorGeo && (
        <mesh geometry={radiatorGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xe8eaec} roughness={0.08} metalness={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}
      <IntBall />
    </group>
  );
}

function createISSGeometries() {
  const trussGeos: THREE.BufferGeometry[] = [];
  const moduleGeos: THREE.BufferGeometry[] = [];
  const panelGeos: THREE.BufferGeometry[] = [];
  const radiatorGeos: THREE.BufferGeometry[] = [];

  // 1. Main Truss
  const mainTrussGeo = new THREE.BoxGeometry(108.5, 1.2, 1.2);
  trussGeos.push(mainTrussGeo);

  // Z1 Truss (vertical connection from main truss to Node 1)
  const z1Truss = new THREE.BoxGeometry(2.5, 4.0, 2.5);
  z1Truss.translate(0, -2, 0);
  trussGeos.push(z1Truss);

  // 2. Main Module Cluster (Center Cross & Spine)
  const modY = -4; // Shifted below truss

  // Node 1 (Unity)
  const unity = new THREE.CylinderGeometry(2.2, 2.2, 5.5, 32);
  unity.rotateX(Math.PI / 2);
  unity.translate(0, modY, 0);
  moduleGeos.push(unity);

  // Node 3 (Tranquility)
  const tranquility = new THREE.CylinderGeometry(2.1, 2.1, 6.5, 32);
  tranquility.rotateZ(Math.PI / 2);
  tranquility.translate(-5.45, modY, 0);
  moduleGeos.push(tranquility);

  // Quest Airlock on Starboard of Unity
  const quest = new THREE.CylinderGeometry(2.0, 2.0, 4.0, 32);
  quest.rotateZ(Math.PI / 2);
  quest.translate(4.2, modY, 0);
  moduleGeos.push(quest);

  // Destiny (US Lab)
  const destiny = new THREE.CylinderGeometry(2.1, 2.1, 8.5, 32);
  destiny.rotateX(Math.PI / 2);
  destiny.translate(0, modY, 7);
  moduleGeos.push(destiny);

  // Node 2 (Harmony)
  const harmony = new THREE.CylinderGeometry(2.2, 2.2, 7.0, 32);
  harmony.rotateX(Math.PI / 2);
  harmony.translate(0, modY, 14.8);
  moduleGeos.push(harmony);

  // Columbus (ESA)
  const columbus = new THREE.CylinderGeometry(2.1, 2.1, 7.0, 32);
  columbus.rotateZ(Math.PI / 2);
  columbus.translate(5.7, modY, 14.8);
  moduleGeos.push(columbus);

  // Kibo (JAXA)
  const kibo = new THREE.CylinderGeometry(2.1, 2.1, 11.2, 32);
  kibo.rotateZ(Math.PI / 2);
  kibo.translate(-7.8, modY, 14.8);
  moduleGeos.push(kibo);

  // Zarya (FGB)
  const zarya = new THREE.CylinderGeometry(2.1, 2.1, 12.5, 32);
  zarya.rotateX(Math.PI / 2);
  zarya.translate(0, modY, -9);
  moduleGeos.push(zarya);

  // Zvezda (Service Module) - slight taper
  const zvezda = new THREE.CylinderGeometry(1.6, 2.0, 13.0, 32);
  zvezda.rotateX(Math.PI / 2);
  zvezda.translate(0, modY, -22);
  moduleGeos.push(zvezda);

  // Connector Rings
  const ringPositions = [2.7, 11.2, -2.7, -15.5];
  ringPositions.forEach(z => {
    const ringGeo = new THREE.CylinderGeometry(2.35, 2.35, 0.5, 32);
    ringGeo.rotateX(Math.PI / 2);
    ringGeo.translate(0, modY, z);
    trussGeos.push(ringGeo);
  });

  // Russian Solar Arrays (on Zvezda)
  const rusS1 = new THREE.BoxGeometry(10, 0.1, 3);
  rusS1.translate(-6.6, modY, -22);
  panelGeos.push(rusS1);

  const rusS2 = new THREE.BoxGeometry(10, 0.1, 3);
  rusS2.translate(6.6, modY, -22);
  panelGeos.push(rusS2);

  // 3. Main Solar Arrays (Outboard)
  const wingCenters = [
    { x: 32, y: 18, z: 0.1 },
    { x: 32, y: -18, z: -0.1 },
    { x: -32, y: 18, z: 0.1 },
    { x: -32, y: -18, z: -0.1 },
    { x: 46, y: 18, z: 0.1 },
    { x: 46, y: -18, z: -0.1 },
    { x: -46, y: 18, z: 0.1 },
    { x: -46, y: -18, z: -0.1 }
  ];

  wingCenters.forEach(pos => {
    const panel = new THREE.BoxGeometry(11.6, 34, 0.15);
    panel.translate(pos.x, pos.y, pos.z);
    panelGeos.push(panel);
  });

  // 4. Main Radiators (Hanging off aft truss)
  const radiatorPositionsX = [-18, -13, -8, 8, 13, 18];
  radiatorPositionsX.forEach(x => {
    const radiatorGeo = new THREE.BoxGeometry(3.5, 0.06, 17);
    // Positioned slightly below truss and extending backward along -Z
    radiatorGeo.translate(x, -1, -8.5);
    radiatorGeos.push(radiatorGeo);
  });

  return {
    trussGeo: trussGeos.length > 0 ? mergeGeometries(trussGeos) : null,
    moduleGeo: moduleGeos.length > 0 ? mergeGeometries(moduleGeos) : null,
    panelGeo: panelGeos.length > 0 ? mergeGeometries(panelGeos) : null,
    radiatorGeo: radiatorGeos.length > 0 ? mergeGeometries(radiatorGeos) : null
  };
}
