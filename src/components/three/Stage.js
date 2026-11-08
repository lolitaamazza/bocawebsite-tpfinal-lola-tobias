'use client'

import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { room } from '../../config/site'
import { CAMERA_FROM, FOV } from '../../three/RailRig'
import { Scene } from './Scene'
/** Lienzo WebGL a pantalla completa. Tono ACES, sombras PCF y un entorno suave para los metales. */
export function Stage({ assets, mobile, onRig, label, ...sceneProps }) {
  return (
    <Canvas
      className="!absolute inset-0 touch-none outline-none"
      dpr={[1, mobile ? 1.5 : 2]}
      shadows="percentage"
      camera={{ fov: FOV, near: 0.1, far: 40, position: CAMERA_FROM.toArray() }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      tabIndex={0}
      aria-label={label ?? 'Vestuario 3D con las camisetas del plantel. Usá las flechas para recorrerlas y Enter para abrir la ficha.'}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1
        scene.background = new THREE.Color(room.background)
        const pmrem = new THREE.PMREMGenerator(gl)
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        scene.environmentIntensity = 0.18
        pmrem.dispose()
      }}
    >
      <Scene assets={assets} mobile={mobile} onRig={onRig} {...sceneProps} />
    </Canvas>
  )
}
