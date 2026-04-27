import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function GeoSatelliteModel(props: JSX.IntrinsicElements['group']) {
  const { busGeo, panelGeo, frameGeo, radiatorGeo, dishGeo } = useMemo(() => createGeoSatGeometries(), []);

  return (
    <group {...props} dispose={null}>
      {busGeo && (
        <mesh geometry={busGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xffaa00} roughness={0.4} metalness={0.9} /> {/* Gold foil look */}
        </mesh>
      )}
      {radiatorGeo && (
        <mesh geometry={radiatorGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xc0c0c0} roughness={0.1} metalness={0.8} />
        </mesh>
      )}
      {frameGeo && (
        <mesh geometry={frameGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x555555} roughness={0.5} metalness={0.7} />
        </mesh>
      )}
      {dishGeo && (
        <mesh geometry={dishGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xeeeeee} roughness={0.4} metalness={0.2} side={THREE.DoubleSide} />
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

function createGeoSatGeometries() {
  const busGeos: THREE.BufferGeometry[] = [];
  const panelGeos: THREE.BufferGeometry[] = [];
  const frameGeos: THREE.BufferGeometry[] = [];
  const radiatorGeos: THREE.BufferGeometry[] = [];
  const dishGeos: THREE.BufferGeometry[] = [];

  // Dimensions
  const busWidth = 2.4;
  const busHeight = 3.6;
  const busDepth = 2.4;

  const panelWidth = 8.0; // extending along X
  const panelHeight = 2.0; // extending along Y
  const panelDepth = 0.04;

  // 1. Main Bus Body
  const coreGeo = new THREE.BoxGeometry(busWidth, busHeight, busDepth);
  busGeos.push(coreGeo);

  // 2. Solar Arrays (3 segments per wing)
  const segmentWidth = panelWidth / 3;
  const gap = 0.05;
  const standoff = 1.0; // Distance from bus to start of solar array
  const panelCenterX = busWidth / 2 + standoff + panelWidth / 2; // 1.2 + 1.0 + 4.0 = 6.2

  for (let i = 0; i < 3; i++) {
    // Left side panels (X-axis)
    const leftPanel = new THREE.BoxGeometry(segmentWidth - gap, panelHeight, panelDepth);
    const leftX = busWidth / 2 + standoff + segmentWidth / 2 + i * segmentWidth;
    leftPanel.translate(leftX, 0, 0);
    panelGeos.push(leftPanel);

    // Left frames
    const leftFrame = new THREE.BoxGeometry(gap, panelHeight, panelDepth * 1.5);
    leftFrame.translate(leftX - segmentWidth / 2 + gap / 2, 0, 0);
    frameGeos.push(leftFrame);

    // Right side panels (-X-axis)
    const rightPanel = new THREE.BoxGeometry(segmentWidth - gap, panelHeight, panelDepth);
    const rightX = - (busWidth / 2 + standoff + segmentWidth / 2 + i * segmentWidth);
    rightPanel.translate(rightX, 0, 0);
    panelGeos.push(rightPanel);

    // Right frames
    const rightFrame = new THREE.BoxGeometry(gap, panelHeight, panelDepth * 1.5);
    rightFrame.translate(rightX + segmentWidth / 2 - gap / 2, 0, 0);
    frameGeos.push(rightFrame);
  }
  
  // Outer frame edge gaps
  const leftOuterFrame = new THREE.BoxGeometry(gap, panelHeight, panelDepth * 1.5);
  leftOuterFrame.translate(busWidth / 2 + standoff + panelWidth, 0, 0);
  frameGeos.push(leftOuterFrame);
  
  const rightOuterFrame = new THREE.BoxGeometry(gap, panelHeight, panelDepth * 1.5);
  rightOuterFrame.translate(- (busWidth / 2 + standoff + panelWidth), 0, 0);
  frameGeos.push(rightOuterFrame);

  // Central booms holding the solar arrays
  const arrayBoomLength = standoff + panelWidth;
  const leftArrayBoom = new THREE.CylinderGeometry(0.05, 0.05, arrayBoomLength + gap, 8);
  leftArrayBoom.rotateZ(Math.PI / 2);
  leftArrayBoom.translate(busWidth / 2 + arrayBoomLength / 2, 0, 0);
  frameGeos.push(leftArrayBoom);

  const rightArrayBoom = new THREE.CylinderGeometry(0.05, 0.05, arrayBoomLength + gap, 8);
  rightArrayBoom.rotateZ(Math.PI / 2);
  rightArrayBoom.translate(- (busWidth / 2 + arrayBoomLength / 2), 0, 0);
  frameGeos.push(rightArrayBoom);

  // 3. Thermal Radiator Panels (North/South faces, Z-axis)
  const radiatorWidth = 1.0;
  const radiatorHeight = 3.0;
  const radiatorDepth = 0.04;

  const frontRadiator = new THREE.BoxGeometry(radiatorWidth, radiatorHeight, radiatorDepth);
  frontRadiator.translate(0, 0, busDepth / 2 + radiatorDepth / 2);
  radiatorGeos.push(frontRadiator);

  const backRadiator = new THREE.BoxGeometry(radiatorWidth, radiatorHeight, radiatorDepth);
  backRadiator.translate(0, 0, -busDepth / 2 - radiatorDepth / 2);
  radiatorGeos.push(backRadiator);

  // 4. Parabolic Dish Antenna (Earth-facing, -Y axis)
  const dishRadius = 1.0; // 2.0m diameter
  const boomLength = 1.5;
  const boomRadius = 0.04; // 0.08m diameter

  // Boom
  const boomGeo = new THREE.CylinderGeometry(boomRadius, boomRadius, boomLength, 8);
  boomGeo.translate(0, -busHeight / 2 - boomLength / 2, 0);
  frameGeos.push(boomGeo);

  // Dish (Hemisphere) - Using SphereGeometry with phiLength = Math.PI, or we can just flatten it
  // Since SphereGeometry has params: radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength
  const dishMesh = new THREE.SphereGeometry(dishRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  // Flatten to represent a shallow parabolic dish
  dishMesh.scale(1, 0.4, 1);
  // Orient to face downwards (-Y)
  // By default, the top of the sphere is at +Y, and it goes down to equator. So we need to flip it
  dishMesh.rotateX(Math.PI);
  dishMesh.translate(0, -busHeight / 2 - boomLength, 0);
  dishGeos.push(dishMesh);
  
  // Second antenna (smaller, offset)
  const smallBoomLength = 0.8;
  const smallBoom = new THREE.CylinderGeometry(boomRadius, boomRadius, smallBoomLength, 8);
  smallBoom.translate(0.8, -busHeight / 2 - smallBoomLength / 2, 0.8);
  frameGeos.push(smallBoom);
  
  const smallDish = new THREE.SphereGeometry(dishRadius * 0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  smallDish.scale(1, 0.4, 1);
  smallDish.rotateX(Math.PI);
  smallDish.translate(0.8, -busHeight / 2 - smallBoomLength, 0.8);
  dishGeos.push(smallDish);

  return {
    busGeo: busGeos.length > 0 ? mergeGeometries(busGeos) : null,
    panelGeo: panelGeos.length > 0 ? mergeGeometries(panelGeos) : null,
    frameGeo: frameGeos.length > 0 ? mergeGeometries(frameGeos) : null,
    radiatorGeo: radiatorGeos.length > 0 ? mergeGeometries(radiatorGeos) : null,
    dishGeo: dishGeos.length > 0 ? mergeGeometries(dishGeos) : null
  };
}
