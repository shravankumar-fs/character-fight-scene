'use client';

import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';

type TInst = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

const COUNT = 5000;
export function GrassField() {
  const { scene } = useGLTF('/models/grass/scene.gltf');

  const sourceMesh = useMemo(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
    });
    return found!;
  }, [scene]);

  const geometry = useMemo(() => sourceMesh.geometry.clone(), [sourceMesh]);
  const material = useMemo(() => {
    const m = (sourceMesh.material as THREE.Material).clone();
    m.side = THREE.FrontSide;
    return m;
  }, [sourceMesh]);

  const instances: TInst[] = useMemo(() => {
    const out: TInst[] = [];
    for (let x = -1000; x <= 1000; x++) {
      if (Math.random() < 0.79) continue;
      for (let z = -1000; z <= 1000; z++) {
        const scale = 2.8 + Math.random() * 0.4;
        // const rotation = Math.random() * Math.PI * 2;
        // if (out.length >= COUNT) break;
        if (Math.random() < 0.9) continue;
        out.push({
          position: [x, -0.5, z],
          scale,
          rotation: [-Math.PI / 2, 0, 0],
        });
      }
      //   if (out.length >= COUNT) break;
    }
    return out;
  }, []);
  console.log('instances', instances.length);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tmpMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpScale = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < instances.length; i++) {
      const it = instances[i];
      tmpPos.set(it.position[0], it.position[1], it.position[2]);
      tmpQuat.setFromEuler(
        new THREE.Euler(it.rotation[0], it.rotation[1], it.rotation[2])
      );
      tmpScale.setScalar(it.scale);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      meshRef.current.setMatrixAt(i, tmpMatrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [instances, tmpMatrix, tmpPos, tmpQuat, tmpScale]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
      castShadow
      receiveShadow
    >
      <primitive attach='geometry' object={geometry} />
      <primitive attach='material' object={material} />
    </instancedMesh>
  );
}

useGLTF.preload('/models/grass/scene.gltf');
