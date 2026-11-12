'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createShirtGeometry } from '@/three/model/shirtModel'
import { TEMPLATE_H, TEMPLATE_W } from '@/three/kit/uvMap'
import { longSleeve } from './longSleeve'
import { paintHistoricShirt } from './paintShirt'

export default function ShirtScene({ diseño, back, onReady }) {
  const canvas = useRef(null)
  const sceneRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = canvas.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true })
    } catch {
      return
    }
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 10)
    const geometry = createShirtGeometry()
    geometry.center()
    const longGeometry = createShirtGeometry(longSleeve)
    longGeometry.center()
    const material = new THREE.MeshStandardMaterial({ roughness: 0.92, vertexColors: true, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh, new THREE.HemisphereLight('#f2f6ff', '#8e9ec8', 2.1))
    const key = new THREE.DirectionalLight('#fff3d8', 2.2)
    key.position.set(-2, 3, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight('#9cbbff', 1.2)
    rim.position.set(2, 1, -3)
    scene.add(rim)

    const atlas = document.createElement('canvas')
    atlas.width = TEMPLATE_W * 2
    atlas.height = TEMPLATE_H
    const context = atlas.getContext('2d')
    const texture = new THREE.CanvasTexture(atlas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.flipY = false
    material.map = texture

    const draw = () => renderer.render(scene, camera)
    const resize = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      camera.position.z = 1.72 * Math.max(1, 0.84 / camera.aspect)
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height, false)
      draw()
    }
    const observer = new ResizeObserver(resize)
    const lost = (event) => {
      event.preventDefault()
      setReady(false)
      onReady(false)
    }
    const restored = () => {
      resize()
      setReady(true)
      onReady(true)
    }
    el.addEventListener('webglcontextlost', lost)
    el.addEventListener('webglcontextrestored', restored)
    sceneRef.current = { mesh, context, texture, draw, geometry, longGeometry }
    observer.observe(el)
    restored()
    return () => {
      observer.disconnect()
      el.removeEventListener('webglcontextlost', lost)
      el.removeEventListener('webglcontextrestored', restored)
      sceneRef.current = null
      texture.dispose()
      material.dispose()
      geometry.dispose()
      longGeometry.dispose()
      renderer.dispose()
    }
  }, [onReady])

  useEffect(() => {
    const view = sceneRef.current
    if (!ready || !view) return
    view.mesh.geometry = diseño.longSleeves ? view.longGeometry : view.geometry
    paintHistoricShirt(view.context, diseño)
    view.texture.needsUpdate = true
    view.draw()
  }, [diseño, ready])

  useEffect(() => {
    const view = sceneRef.current
    if (!ready || !view) return
    const target = back ? -0.22 : Math.PI - 0.22
    const from = view.mesh.rotation.y
    const start = performance.now()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame
    function turn(now) {
      const t = reduced ? 1 : Math.min(1, (now - start) / 420)
      view.mesh.rotation.y = from + (target - from) * (1 - (1 - t) ** 3)
      view.draw()
      if (t < 1) frame = requestAnimationFrame(turn)
    }
    turn(start)
    return () => cancelAnimationFrame(frame)
  }, [back, ready])

  return <canvas ref={canvas} className={`absolute inset-0 h-full w-full ${ready ? '' : 'opacity-0'}`} aria-hidden="true" />
}
