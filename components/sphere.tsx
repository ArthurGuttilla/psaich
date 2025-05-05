"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function Sphere() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })

    const container = containerRef.current
    const updateSize = () => {
      const size = Math.min(container.clientWidth, container.clientHeight)
      renderer.setSize(size, size)
    }
    updateSize()
    container.appendChild(renderer.domElement)

    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const material = new THREE.MeshPhongMaterial({
      shininess: 100,
      specular: 0x444444,
    })
    const sphere = new THREE.Mesh(geometry, material)

    scene.add(sphere)

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(1, 1, 1)
    scene.add(light)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    camera.position.z = 2.5

    // Pastel color generation
    const generatePastelColor = () => {
      const hue = Math.random()
      const saturation = 0.5 + Math.random() * 0.3 // 0.5 to 0.8
      const lightness = 0.7 + Math.random() * 0.2 // 0.7 to 0.9
      return new THREE.Color().setHSL(hue, saturation, lightness)
    }

    let currentColor = generatePastelColor()
    let targetColor = generatePastelColor()
    let colorChangeProgress = 0
    const colorChangeDuration = 3 // seconds

    function animate(time: number) {
      requestAnimationFrame(animate)

      sphere.rotation.x += 0.005
      sphere.rotation.y += 0.005

      // Smoothly transition between pastel colors
      colorChangeProgress += 0.016 / colorChangeDuration // Assuming 60fps
      if (colorChangeProgress >= 1) {
        currentColor = targetColor
        targetColor = generatePastelColor()
        colorChangeProgress = 0
      }

      const interpolatedColor = new THREE.Color()
      interpolatedColor.lerpColors(currentColor, targetColor, colorChangeProgress)
      material.color = interpolatedColor

      renderer.render(scene, camera)
    }

    animate(0)

    window.addEventListener("resize", updateSize)

    return () => {
      window.removeEventListener("resize", updateSize)
      container.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full max-w-full max-h-full" />
}
