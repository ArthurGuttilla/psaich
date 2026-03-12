"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

// Curated calming pastel palette
const PASTEL_PALETTE = [
  new THREE.Color(0.82, 0.74, 0.96), // lavender
  new THREE.Color(0.72, 0.88, 0.96), // sky blue
  new THREE.Color(0.76, 0.94, 0.84), // mint
  new THREE.Color(0.96, 0.78, 0.84), // soft rose
  new THREE.Color(0.96, 0.88, 0.74), // peach
  new THREE.Color(0.78, 0.84, 0.96), // periwinkle
  new THREE.Color(0.84, 0.96, 0.94), // aqua
]

const VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  uniform float time;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float blend;

  void main() {
    vec3 viewDir = normalize(-vPosition);

    // Fresnel rim
    float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
    fresnel = pow(fresnel, 2.2);

    // Iridescent shimmer
    float shimmer = sin(vNormal.x * 4.0 + vNormal.y * 3.0 + time * 0.4) * 0.5 + 0.5;

    // Base pastel color transition
    vec3 base = mix(colorA, colorB, blend);

    // Soft inner highlight
    float highlight = pow(max(dot(vNormal, normalize(vec3(1.0, 1.5, 1.0))), 0.0), 6.0);

    // Layer: shimmer tint
    vec3 shimmerTint = mix(base, vec3(1.0), shimmer * 0.12);

    // Layer: rim glow brightens towards edges
    vec3 rimColor = mix(shimmerTint, vec3(1.0), fresnel * 0.55);

    // Layer: inner soft highlight
    vec3 finalColor = rimColor + vec3(highlight * 0.18);

    // Alpha — slightly translucent at rim for soft look
    float alpha = 0.88 + fresnel * 0.12;

    gl_FragColor = vec4(finalColor, alpha);
  }
`

interface Particle {
  theta: number
  phi: number
  radius: number
  speed: number
  tiltSpeed: number
}

export function Sphere() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100)
    camera.position.z = 2.8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const updateSize = () => {
      const size = Math.min(container.clientWidth, container.clientHeight)
      renderer.setSize(size, size)
    }
    updateSize()
    container.appendChild(renderer.domElement)

    // ── Sphere ────────────────────────────────────────────────────────────
    const geometry = new THREE.SphereGeometry(1, 128, 128)
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        time: { value: 0 },
        colorA: { value: PASTEL_PALETTE[0].clone() },
        colorB: { value: PASTEL_PALETTE[1].clone() },
        blend: { value: 0 },
      },
      transparent: true,
    })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // ── Orbiting coloured lights ──────────────────────────────────────────
    const lightDefs: [THREE.ColorRepresentation, number][] = [
      [0xe8c4f0, 2.2], // lilac
      [0xb8e0f7, 2.0], // ice blue
      [0xffd6e0, 1.8], // blush
    ]
    const orbitLights = lightDefs.map(([color, intensity]) => {
      const light = new THREE.PointLight(color, intensity, 10)
      scene.add(light)
      return light
    })

    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    scene.add(ambient)

    // ── Particles ─────────────────────────────────────────────────────────
    const COUNT = 180
    const pData: Particle[] = []
    const positions = new Float32Array(COUNT * 3)

    for (let i = 0; i < COUNT; i++) {
      const p: Particle = {
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos(2 * Math.random() - 1),
        radius: 1.35 + Math.random() * 0.9,
        speed: (0.08 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1),
        tiltSpeed: (0.04 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : -1),
      }
      pData.push(p)
      positions[i * 3] = p.radius * Math.sin(p.phi) * Math.cos(p.theta)
      positions[i * 3 + 1] = p.radius * Math.sin(p.phi) * Math.sin(p.theta)
      positions[i * 3 + 2] = p.radius * Math.cos(p.phi)
    }

    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const pMat = new THREE.PointsMaterial({
      size: 0.022,
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    })
    const points = new THREE.Points(pGeo, pMat)
    scene.add(points)

    // ── Mouse / touch interaction ─────────────────────────────────────────
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }

    const onMouseMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect()
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 0.6
      target.y = -((e.clientY - r.top) / r.height - 0.5) * 0.6
    }
    const onMouseLeave = () => {
      target.x = 0
      target.y = 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      const r = container.getBoundingClientRect()
      target.x = ((t.clientX - r.left) / r.width - 0.5) * 0.5
      target.y = -((t.clientY - r.top) / r.height - 0.5) * 0.5
    }

    container.addEventListener("mousemove", onMouseMove)
    container.addEventListener("mouseleave", onMouseLeave)
    container.addEventListener("touchmove", onTouchMove, { passive: true })
    container.addEventListener("touchend", onMouseLeave)

    // Click pulse effect
    let pulseScale = 1.0
    let pulsing = false
    const onClick = () => {
      if (!pulsing) {
        pulsing = true
        pulseScale = 1.0
      }
    }
    container.addEventListener("click", onClick)

    // ── Color cycle ───────────────────────────────────────────────────────
    let palIdx = 0
    let palBlend = 0
    const PAL_SPEED = 0.0018 // slow, calming

    // ── Animation loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let rafId = 0

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      // Smooth mouse follow
      current.x += (target.x - current.x) * 0.045
      current.y += (target.y - current.y) * 0.045

      // Slow drift rotation + tilt toward mouse
      sphere.rotation.x = current.y + t * 0.07
      sphere.rotation.y = current.x + t * 0.11

      // Breathing scale
      const breathe = 1.0 + Math.sin(t * 0.8) * 0.018

      // Pulse on click
      if (pulsing) {
        pulseScale += (1.06 - pulseScale) * 0.15
        if (pulseScale > 1.055) {
          pulsing = false
          pulseScale = 1.0
        }
      }

      sphere.scale.setScalar(breathe * pulseScale)

      // Pastel color blend
      palBlend += PAL_SPEED
      if (palBlend >= 1) {
        palBlend = 0
        palIdx = (palIdx + 1) % PASTEL_PALETTE.length
      }
      const nextIdx = (palIdx + 1) % PASTEL_PALETTE.length
      material.uniforms.colorA.value.copy(PASTEL_PALETTE[palIdx])
      material.uniforms.colorB.value.copy(PASTEL_PALETTE[nextIdx])
      material.uniforms.blend.value = palBlend
      material.uniforms.time.value = t

      // Orbit lights
      orbitLights.forEach((light, i) => {
        const a = t * 0.45 + (i * Math.PI * 2) / orbitLights.length
        light.position.set(
          Math.cos(a) * 2.6,
          Math.sin(a * 0.65) * 1.6,
          Math.sin(a) * 2.6
        )
      })

      // Animate particles
      const pos = pGeo.attributes.position.array as Float32Array
      for (let i = 0; i < COUNT; i++) {
        const p = pData[i]
        p.theta += p.speed * 0.012
        p.phi += p.tiltSpeed * 0.008
        pos[i * 3] = p.radius * Math.sin(p.phi) * Math.cos(p.theta)
        pos[i * 3 + 1] = p.radius * Math.sin(p.phi) * Math.sin(p.theta)
        pos[i * 3 + 2] = p.radius * Math.cos(p.phi)
      }
      pGeo.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()
    window.addEventListener("resize", updateSize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", updateSize)
      container.removeEventListener("mousemove", onMouseMove)
      container.removeEventListener("mouseleave", onMouseLeave)
      container.removeEventListener("touchmove", onTouchMove)
      container.removeEventListener("touchend", onMouseLeave)
      container.removeEventListener("click", onClick)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      pGeo.dispose()
      pMat.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full max-w-full max-h-full cursor-pointer select-none"
    />
  )
}
