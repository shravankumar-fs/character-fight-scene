// src/components/Character.tsx
'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

type Key =
  | 'KeyW'
  | 'KeyA'
  | 'KeyS'
  | 'KeyD'
  | 'ArrowUp'
  | 'ArrowLeft'
  | 'ArrowDown'
  | 'ArrowRight';

const MOVE_KEYS: Key[] = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
];

export function Character() {
  const baseRig = useFBX('/models/CharSol.fbx');
  const idleFBX = useFBX('/models/standingIdle.fbx');
  const walkFBX = useFBX('/models/walking.fbx');

  const model = useMemo(() => cloneSkeleton(baseRig) as THREE.Group, [baseRig]);
  const groupRef = useRef<THREE.Group>(null);

  // If your rig's authored forward isn't +Z, adjust this (e.g. Math.PI to flip)
  const MODEL_YAW_OFFSET = 0;

  useMemo(() => {
    model.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
  }, [model]);

  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const idleClip = useMemo(() => idleFBX.animations?.[0] ?? null, [idleFBX]);
  const walkClip = useMemo(() => walkFBX.animations?.[0] ?? null, [walkFBX]);

  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    // Idle is default
    if (idleClip) {
      const idle = mixer.clipAction(idleClip, model);
      idle.loop = THREE.LoopRepeat;
      idle.clampWhenFinished = false;
      idle.enabled = true;
      idle.reset();
      idle.setEffectiveWeight(1); // visible by default
      idle.play();
      idleActionRef.current = idle;
    }

    // Walk is blended out initially
    if (walkClip) {
      const walk = mixer.clipAction(walkClip, model);
      walk.loop = THREE.LoopRepeat;
      walk.clampWhenFinished = false;
      walk.enabled = true;
      walk.reset();
      walk.setEffectiveWeight(0); // hidden by default
      walk.play();
      walkActionRef.current = walk;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, model, idleClip, walkClip]);

  const keysRef = useRef<Record<Key, boolean>>({
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.code as Key;
      if (MOVE_KEYS.includes(k)) keysRef.current[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.code as Key;
      if (MOVE_KEYS.includes(k)) keysRef.current[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const SPEED = 3.0;
  const TURN_SMOOTH = 10.0;
  const tmpDir = new THREE.Vector3();
  const targetQuat = new THREE.Quaternion();
  const yUp = new THREE.Vector3(0, 1, 0);
  const lastMovingRef = useRef(false);

  useFrame((_, delta) => {
    mixer.update(delta);

    const forward = keysRef.current.KeyW || keysRef.current.ArrowUp ? 1 : 0;
    const back = keysRef.current.KeyS || keysRef.current.ArrowDown ? 1 : 0;
    const left = keysRef.current.KeyA || keysRef.current.ArrowLeft ? 1 : 0;
    const right = keysRef.current.KeyD || keysRef.current.ArrowRight ? 1 : 0;

    // +Z minus forward gives -Z when W is held (typical "forward" in Three scenes)
    tmpDir.set(right - left, 0, back - forward);
    const isMoving = tmpDir.lengthSq() > 0;

    // Animation state machine: idle <-> walk
    const idle = idleActionRef.current;
    const walk = walkActionRef.current;

    if (idle && walk) {
      if (isMoving && !lastMovingRef.current) {
        // go idle -> walk
        idle.crossFadeTo(walk, 0.15, false);
        walk.setEffectiveWeight(1);
        idle.setEffectiveWeight(0);
      } else if (!isMoving && lastMovingRef.current) {
        // go walk -> idle
        walk.crossFadeTo(idle, 0.2, false);
        idle.setEffectiveWeight(1);
        walk.setEffectiveWeight(0);
      }
    }
    lastMovingRef.current = isMoving;

    // Rotation + translation
    const g = groupRef.current;
    if (!g) return;

    if (isMoving) {
      tmpDir.normalize();
      const yaw = Math.atan2(tmpDir.x, tmpDir.z) + MODEL_YAW_OFFSET;
      targetQuat.setFromAxisAngle(yUp, yaw);
      g.quaternion.slerp(targetQuat, Math.min(1, TURN_SMOOTH * delta));
      g.position.addScaledVector(tmpDir, SPEED * delta);
      if (walk) walk.timeScale = 1;
    } else {
      if (idle) idle.timeScale = 1;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={model} scale={0.1} />
    </group>
  );
}

export default Character;
