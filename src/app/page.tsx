'use client';
import { Canvas } from '@react-three/fiber';

import {
  Environment,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  OrbitControls,
  PerspectiveCamera,
  Stats,
} from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import { GrassField } from './components/GrassField';
import { Character } from './components/Character';

export default function Home() {
  return (
    <Canvas shadows>
      <Stats />
      <Environment preset='sunset' />
      <PerspectiveCamera makeDefault position={[0, 10, 50]} fov={75} />
      <OrbitControls
        target={[0, 0, 0]}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={100}
        enableDamping
        dampingFactor={0.5}
      />
      <ambientLight intensity={0.5} />
      <axesHelper />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Suspense fallback={null}>
        <GrassField />
        <Character />
      </Suspense>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.5, 0]}
      >
        <planeGeometry args={[10000, 10000]} />
        <shaderMaterial
          vertexShader={`
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vN = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `}
          fragmentShader={`
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vWorldPos;

    // Controls
    const float SCALE = 6.0;
    const vec3 LIGHT_DIR = normalize(vec3(0.4, 1.0, 0.2));

    // Mild brownish-orange sand palette
    const vec3 SAND_LIGHT = vec3(0.87, 0.72, 0.51); // ~#DEB87F
    const vec3 SAND_DARK  = vec3(0.24, 0.56, 0.04); // ~#A3753D

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.0 + vec2(100.0, 100.0);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = vUv * SCALE;

      float n1 = fbm(uv * 0.5);
      vec2 warp = vec2(fbm(uv + vec2(5.2, 1.3)), fbm(uv + vec2(-1.7, 9.2)));
      float dunes = fbm(uv * 0.25 + warp * 0.3);
      float grain = fbm(uv * 3.5 + warp * 1.5);

      float t = clamp(0.35 * dunes + 0.65 * grain, 0.0, 1.0);
      vec3 col = mix(SAND_LIGHT, SAND_DARK, t);

      float speck = smoothstep(0.55, 0.95, noise(uv * 18.0));
      col *= 0.92 + 0.08 * speck;

      float ndl = clamp(dot(normalize(vN), LIGHT_DIR), 0.0, 1.0);
      col *= 0.5 + 0.5 * ndl;

      float ao = mix(1.0, 0.9, grain);
      col *= ao;

      gl_FragColor = vec4(col, 1.0);
    }
  `}
        />
      </mesh>
    </Canvas>
  );
}
