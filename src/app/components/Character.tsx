'use client';

import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

const Character = () => {
  const { scene } = useGLTF('/models/CharSol.glb');

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

  return (
    <mesh scale={5}>
      <primitive attach='geometry' object={geometry} />
      <primitive attach='material' object={material} />
    </mesh>
  );
};
export { Character };
