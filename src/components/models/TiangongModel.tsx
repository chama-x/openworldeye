import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function TiangongModel(props: JSX.IntrinsicElements['group']) {
  const { tianheGeo, labGeo, panelGeo, detailGeo } = useMemo(() => createTiangongGeometries(), []);

  return (
    <group {...props} dispose={null}>
      {tianheGeo && (
        <mesh geometry={tianheGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xd4d8e0} roughness={0.45} metalness={0.65} />
        </mesh>
      )}
      {labGeo && (
        <mesh geometry={labGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xd4d8e0} roughness={0.45} metalness={0.65} />
        </mesh>
      )}
      {panelGeo && (
        <mesh geometry={panelGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0x1a237e} roughness={0.65} metalness={0.25} />
        </mesh>
      )}
      {detailGeo && (
        <mesh geometry={detailGeo} castShadow receiveShadow>
          <meshStandardMaterial color={0xDE2910} roughness={0.7} metalness={0.3} />
        </mesh>
      )}
    </group>
  );
}

function createTiangongGeometries() {
  const tianheGeos: THREE.BufferGeometry[] = [];
  const labGeos: THREE.BufferGeometry[] = [];
  const panelGeos: THREE.BufferGeometry[] = [];
  const detailGeos: THREE.BufferGeometry[] = [];

  // ==========================================
  // 1. TIANHE CORE MODULE (Spine along Z axis)
  // ==========================================
  
  // Main Pressurised Cylinder
  const tMain = new THREE.CylinderGeometry(2.1, 2.1, 11.0, 32);
  tMain.rotateX(Math.PI / 2);
  tianheGeos.push(tMain);

  // Resource Module (Rear)
  const tRes = new THREE.CylinderGeometry(1.4, 1.8, 5.6, 32);
  tRes.rotateX(Math.PI / 2);
  tRes.translate(0, 0, -8.3);
  tianheGeos.push(tRes);

  // Forward Docking Hub
  const tHub = new THREE.CylinderGeometry(1.5, 2.1, 2.2, 32);
  tHub.rotateX(Math.PI / 2);
  tHub.translate(0, 0, 6.6);
  tianheGeos.push(tHub);

  // ==========================================
  // 2. WENTIAN & MENGTIAN LABS (Crossbar along X axis)
  // ==========================================
  
  // Wentian (+X direction, side port at +3.5)
  const wMain = new THREE.CylinderGeometry(2.1, 2.1, 12.0, 32);
  wMain.rotateZ(Math.PI / 2);
  wMain.translate(9.5, 0, 0); // 3.5 dock + 6.0 center
  labGeos.push(wMain);

  const wRes = new THREE.CylinderGeometry(1.6, 2.1, 5.9, 32);
  wRes.rotateZ(Math.PI / 2);
  wRes.translate(18.45, 0, 0); // 3.5 + 12 + 2.95
  labGeos.push(wRes);

  // Mengtian (-X direction, side port at -3.5)
  const mMain = new THREE.CylinderGeometry(2.1, 2.1, 12.0, 32);
  mMain.rotateZ(Math.PI / 2);
  mMain.translate(-9.5, 0, 0);
  labGeos.push(mMain);

  const mRes = new THREE.CylinderGeometry(2.1, 1.6, 5.9, 32); // Inverse taper
  mRes.rotateZ(Math.PI / 2);
  mRes.translate(-18.45, 0, 0);
  labGeos.push(mRes);

  // Robotic Arm (Simplified, attached to Wentian) -> Packed into LabGeos
  const elbowArm1 = new THREE.BoxGeometry(0.15, 0.15, 5.0);
  elbowArm1.rotateY(Math.PI / 8);
  elbowArm1.rotateZ(Math.PI / 4);
  elbowArm1.translate(10, 2.5, 0);
  labGeos.push(elbowArm1);

  const elbowArm2 = new THREE.BoxGeometry(0.15, 0.15, 4.0);
  elbowArm2.rotateY(-Math.PI / 8);
  elbowArm2.rotateZ(Math.PI / 4);
  elbowArm2.translate(11, 3.5, 0);
  labGeos.push(elbowArm2);

  // ==========================================
  // 3. SOLAR ARRAYS
  // ==========================================

  // Tianhe Arrays (Rear, smaller, compact)
  const tPanel1 = new THREE.BoxGeometry(4.0, 9.0, 0.06);
  tPanel1.translate(0, 6.6, -8.3);
  panelGeos.push(tPanel1);
  const tPanel2 = new THREE.BoxGeometry(4.0, 9.0, 0.06);
  tPanel2.translate(0, -6.6, -8.3);
  panelGeos.push(tPanel2);

  // Wentian Arrays (Large, tip of module)
  const wPanel1 = new THREE.BoxGeometry(5.0, 12.0, 0.06);
  wPanel1.rotateX(15 * Math.PI / 180);
  wPanel1.translate(18.0, 8.5, 0);
  panelGeos.push(wPanel1);
  const wPanel2 = new THREE.BoxGeometry(5.0, 12.0, 0.06);
  wPanel2.rotateX(15 * Math.PI / 180);
  wPanel2.translate(18.0, -8.5, 0);
  panelGeos.push(wPanel2);

  // Mengtian Arrays (Large, tip of module)
  const mPanel1 = new THREE.BoxGeometry(5.0, 12.0, 0.06);
  mPanel1.rotateX(-15 * Math.PI / 180);
  mPanel1.translate(-18.0, 8.5, 0);
  panelGeos.push(mPanel1);
  const mPanel2 = new THREE.BoxGeometry(5.0, 12.0, 0.06);
  mPanel2.rotateX(-15 * Math.PI / 180);
  mPanel2.translate(-18.0, -8.5, 0);
  panelGeos.push(mPanel2);

  // ==========================================
  // 4. CHINESE FLAG STRIPE
  // ==========================================
  const stripe = new THREE.BoxGeometry(0.02, 0.8, 2.5);
  stripe.rotateZ(Math.PI / 2); // Flat horizontal on top of cylinder
  stripe.translate(0, 2.15, 2.0); // Offset along Tianhe's main body
  detailGeos.push(stripe);

  return {
    tianheGeo: tianheGeos.length > 0 ? mergeGeometries(tianheGeos) : null,
    labGeo: labGeos.length > 0 ? mergeGeometries(labGeos) : null,
    panelGeo: panelGeos.length > 0 ? mergeGeometries(panelGeos) : null,
    detailGeo: detailGeos.length > 0 ? mergeGeometries(detailGeos) : null
  };
}
