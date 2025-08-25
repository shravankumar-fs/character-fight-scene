// src/components/Character.tsx
'use client';

import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, useFBX } from '@react-three/drei';
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
  // FBX model and walking animation clip
  const original = useFBX('/models/CharSol.fbx'); // geometry/rig
  const walkFBX = useFBX('/models/walking.fbx'); // animation-only file expected

  // Safe skinned clone of the original rig for animation
  const model = useMemo(
    () => cloneSkeleton(original) as THREE.Group,
    [original]
  );

  // Prepare the group that will be moved/rotated
  const groupRef = useRef<THREE.Group>(null);

  // Normalize model props
  useMemo(() => {
    model.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
  }, [model]);

  // Animation mixer + action
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const walkClip = useMemo(() => walkFBX.animations?.[0] ?? null, [walkFBX]);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!walkClip) {
      return;
    }
    const action = mixer.clipAction(walkClip, model);
    action.loop = THREE.LoopRepeat;
    action.clampWhenFinished = false;
    action.enabled = true;
    action.weight = 1; // start blended out (idle)
    action.play();
    walkActionRef.current = action;
    return () => {
      console.log('cleanup');
      action.stop();
      mixer.stopAllAction();
    };
  }, [mixer, model, walkClip]);

  // Key state
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

  // Movement + rotation + animation blending
  const SPEED = 3.0; // units/sec
  const TURN_SMOOTH = 10.0; // higher = snappier turn
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

    // Build desired move direction in world space (+X right, +Z forward)
    tmpDir.set(right - left, 0, back - forward); // note: -Z is "forward" in Three's default view
    const isMoving = tmpDir.lengthSq() > 0;

    // Blend animation based on movement
    const walk = walkActionRef.current;
    if (walk) {
      if (isMoving && !lastMovingRef.current) {
        walk.enabled = true;
        walk.fadeIn(0.15);
      } else if (!isMoving && lastMovingRef.current) {
        walk.fadeOut(0.2);
      }
    }
    lastMovingRef.current = isMoving;

    // Rotate toward movement direction and translate
    const g = groupRef.current;
    if (!g) return;

    if (isMoving) {
      tmpDir.normalize();

      // Compute yaw from desired direction (face the movement vector)
      // Our tmpDir uses +Z forward; if you prefer -Z forward, negate Z in dir or flip here.
      const yaw = Math.atan2(tmpDir.x, tmpDir.z); // radians

      targetQuat.setFromAxisAngle(yUp, yaw);
      g.quaternion.slerp(targetQuat, Math.min(1, TURN_SMOOTH * delta));

      // Move in facing direction
      // Use the same normalized tmpDir for translation
      g.position.addScaledVector(tmpDir, SPEED * delta);
    }
  });
  console.log(groupRef.current);
  const spherePosition = new THREE.Vector3(0, 20, 5);
  const pointLightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (pointLightRef.current) {
      const time = Date.now() * 0.002;
      spherePosition.y = 30 + Math.sin(time) * 20;
      pointLightRef.current.position.set(
        spherePosition.x,
        spherePosition.y,
        spherePosition.z
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Render the animated rig */}
      <primitive object={model} scale={0.1} />

      <pointLight
        ref={pointLightRef}
        position={spherePosition}
        intensity={200.8}
        color={0xffff00}
      />
    </group>
  );
}

export default Character;
