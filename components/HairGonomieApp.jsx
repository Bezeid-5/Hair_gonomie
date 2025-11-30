'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { CONFIG } from './config'

export default function HairGonomieApp() {
  const [showLoader, setShowLoader] = useState(true)
  const [currentScreen, setCurrentScreen] = useState('welcome')
  const [currentPage, setCurrentPage] = useState(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // Refs pour Three.js
  const spectrumCanvasRef = useRef(null)
  const cubeCanvasRef = useRef(null)
  const stateRef = useRef({
    spectrumScene: null,
    spectrumCamera: null,
    spectrumRenderer: null,
    spectrumShape: null,
    spectrumParticles: null,
    spectrumLights: null,
    particlesVelocities: null,
    cubeScene: null,
    cubeCamera: null,
    cubeRenderer: null,
    cube: null,
    cubeParticles: null,
    cubeLights: null,
    cubeGlow: null,
    raycaster: null,
    mouse: new THREE.Vector2(),
    currentFace: null,
    targetRotation: { x: 0.2, y: 0 },
    currentRotation: { x: 0.2, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    autoRotate: true,
    animationFrameId: null
  })

  // Initialisation du spectre
  const initSpectrum = () => {
    if (!spectrumCanvasRef.current) return

    const canvas = spectrumCanvasRef.current
    const width = window.innerWidth
    const height = window.innerHeight
    const state = stateRef.current

    // Scène
    state.spectrumScene = new THREE.Scene()
    state.spectrumScene.background = new THREE.Color(0x000000)

    // Caméra
    state.spectrumCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    state.spectrumCamera.position.z = 5

    // Renderer
    state.spectrumRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    })
    state.spectrumRenderer.setSize(width, height)
    state.spectrumRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    state.spectrumRenderer.shadowMap.enabled = true

    // Forme spectrale
    const geometry = new THREE.IcosahedronGeometry(CONFIG.spectrumSize, 2)
    const material = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      emissive: 0x3498db,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    })

    state.spectrumShape = new THREE.Mesh(geometry, material)
    state.spectrumShape.castShadow = true
    state.spectrumShape.receiveShadow = true
    state.spectrumScene.add(state.spectrumShape)

    // Wireframe
    const wireframe = new THREE.WireframeGeometry(geometry)
    const wireframeLine = new THREE.LineSegments(
      wireframe,
      new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
      })
    )
    state.spectrumShape.add(wireframeLine)

    // Particules 0 et 1
    const particlesCount = 300
    state.spectrumParticles = new THREE.Group()

    const createTextTexture = (text) => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const context = canvas.getContext('2d')
      context.fillStyle = 'rgba(0, 0, 0, 0)'
      context.fillRect(0, 0, 64, 64)
      context.font = 'bold 48px monospace'
      context.fillStyle = '#3498db'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(text, 32, 32)
      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      return texture
    }

    const texture0 = createTextTexture('0')
    const texture1 = createTextTexture('1')
    const velocities = []

    for (let i = 0; i < particlesCount; i++) {
      const radius = 3 + Math.random() * 4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)

      const isOne = Math.random() > 0.5
      const texture = isOne ? texture1 : texture0

      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
        color: 0x3498db,
        blending: THREE.AdditiveBlending
      })

      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.position.set(x, y, z)
      sprite.scale.set(0.3, 0.3, 1)

      const vel = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      }
      sprite.userData.velocity = vel
      velocities.push(vel)

      state.spectrumParticles.add(sprite)
    }

    state.spectrumScene.add(state.spectrumParticles)
    state.particlesVelocities = velocities

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    state.spectrumScene.add(ambientLight)

    const colors = [0x3498db, 0xe74c3c, 0x9b59b6, 0xf39c12, 0x1abc9c]
    state.spectrumLights = []
    colors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 1.5, 50)
      const angle = (i / colors.length) * Math.PI * 2
      light.position.set(
        Math.cos(angle) * 5,
        Math.sin(angle) * 5,
        3
      )
      state.spectrumScene.add(light)
      state.spectrumLights.push(light)
    })

    const mainLight = new THREE.PointLight(0xffffff, 2, 100)
    mainLight.position.set(0, 0, 5)
    state.spectrumScene.add(mainLight)
  }

  // Initialisation du cube
  const initCube = () => {
    if (!cubeCanvasRef.current) return

    const canvas = cubeCanvasRef.current
    const width = window.innerWidth
    const height = window.innerHeight
    const state = stateRef.current

    // Scène
    state.cubeScene = new THREE.Scene()
    state.cubeScene.background = new THREE.Color(0x0a0a0a)

    // Caméra
    state.cubeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    state.cubeCamera.position.z = 6

    // Renderer
    state.cubeRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    })
    state.cubeRenderer.setSize(width, height)
    state.cubeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    state.cubeRenderer.shadowMap.enabled = true
    state.cubeRenderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Cube
    const geometry = new THREE.BoxGeometry(CONFIG.cubeSize, CONFIG.cubeSize, CONFIG.cubeSize)
    const materials = []

    for (let i = 0; i < 6; i++) {
      const face = CONFIG.faces[i]
      materials.push(new THREE.MeshStandardMaterial({
        color: face.color,
        emissive: face.color,
        emissiveIntensity: 0.5,
        metalness: 0.7,
        roughness: 0.3,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide
      }))
    }

    state.cube = new THREE.Mesh(geometry, materials)
    state.cube.rotation.x = 0.2
    state.cube.rotation.y = 0
    state.cube.castShadow = true
    state.cube.receiveShadow = true
    state.cubeScene.add(state.cube)

    // Bords
    const edges = new THREE.EdgesGeometry(geometry)
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.8,
        transparent: true,
        linewidth: 3
      })
    )
    state.cube.add(line)

    // Glow
    const glowGeometry = new THREE.BoxGeometry(CONFIG.cubeSize * 1.1, CONFIG.cubeSize * 1.1, CONFIG.cubeSize * 1.1)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    })
    state.cubeGlow = new THREE.Mesh(glowGeometry, glowMaterial)
    state.cube.add(state.cubeGlow)

    // Raycaster
    state.raycaster = new THREE.Raycaster()

    // Lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    state.cubeScene.add(ambientLight)

    CONFIG.faces.forEach((face, i) => {
      const angle = (i / CONFIG.faces.length) * Math.PI * 2
      const light = new THREE.DirectionalLight(face.color, 0.8)
      light.position.set(
        Math.cos(angle) * 8,
        Math.sin(angle) * 8,
        5
      )
      light.castShadow = true
      light.shadow.mapSize.width = 2048
      light.shadow.mapSize.height = 2048
      state.cubeScene.add(light)
    })

    state.cubeLights = []
    CONFIG.faces.forEach((face, i) => {
      const angle = (i / CONFIG.faces.length) * Math.PI * 2
      const light = new THREE.PointLight(face.color, 1, 50)
      light.position.set(
        Math.cos(angle) * 6,
        Math.sin(angle) * 6,
        4
      )
      state.cubeScene.add(light)
      state.cubeLights.push(light)
    })

    // Particules
    const particlesGeometry = new THREE.BufferGeometry()
    const particlesCount = 200
    const posArray = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount * 3; i += 3) {
      const radius = 4 + Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      posArray[i] = radius * Math.sin(phi) * Math.cos(theta)
      posArray[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
      posArray[i + 2] = radius * Math.cos(phi)
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })

    state.cubeParticles = new THREE.Points(particlesGeometry, particlesMaterial)
    state.cubeScene.add(state.cubeParticles)
  }

  // Animation
  const animate = () => {
    const state = stateRef.current
    let time = Date.now() * 0.001

    const animateLoop = () => {
      state.animationFrameId = requestAnimationFrame(animateLoop)
      time = Date.now() * 0.001

      // Animer le spectre
      if (state.spectrumShape && currentScreen === 'welcome') {
        state.spectrumShape.rotation.x += 0.008
        state.spectrumShape.rotation.y += 0.01
        state.spectrumShape.rotation.z += 0.005
        state.spectrumShape.position.y = Math.sin(time) * 0.5
        state.spectrumShape.material.emissiveIntensity = 0.6 + Math.sin(time * 2) * 0.2

        // Animer les particules
        if (state.spectrumParticles) {
          state.spectrumParticles.children.forEach((sprite) => {
            if (sprite.userData.velocity) {
              sprite.position.x += sprite.userData.velocity.x
              sprite.position.y += sprite.userData.velocity.y
              sprite.position.z += sprite.userData.velocity.z

              const dist = Math.sqrt(
                sprite.position.x ** 2 +
                sprite.position.y ** 2 +
                sprite.position.z ** 2
              )
              if (dist > 8) {
                const radius = 3 + Math.random() * 2
                const theta = Math.random() * Math.PI * 2
                const phi = Math.acos(Math.random() * 2 - 1)
                sprite.position.set(
                  radius * Math.sin(phi) * Math.cos(theta),
                  radius * Math.sin(phi) * Math.sin(theta),
                  radius * Math.cos(phi)
                )
              }
            }
          })
        }

        // Animer les lumières
        if (state.spectrumLights) {
          state.spectrumLights.forEach((light, i) => {
            const angle = (i / state.spectrumLights.length) * Math.PI * 2 + time
            light.position.x = Math.cos(angle) * 5
            light.position.y = Math.sin(angle) * 5
            light.intensity = 1.2 + Math.sin(time * 2 + i) * 0.3
          })
        }

        if (state.spectrumRenderer && state.spectrumScene && state.spectrumCamera) {
          state.spectrumRenderer.render(state.spectrumScene, state.spectrumCamera)
        }
      }

      // Animer le cube
      if (state.cube && currentScreen === 'cube') {
        // Auto-rotation
        if (state.autoRotate && !state.isDragging && !reduceMotion) {
          state.targetRotation.y += CONFIG.autoRotateSpeed
        }

        // Interpolation
        const lerpFactor = reduceMotion ? 1 : 0.1
        state.currentRotation.x += (state.targetRotation.x - state.currentRotation.x) * lerpFactor
        state.currentRotation.y += (state.targetRotation.y - state.currentRotation.y) * lerpFactor

        // Appliquer rotation
        state.cube.rotation.y = state.currentRotation.y
        state.cube.rotation.x = state.currentRotation.x

        // Pulsation
        state.cube.material.forEach((material, index) => {
          if (material) {
            material.emissiveIntensity = 0.4 + Math.sin(time * 2 + index) * 0.2
          }
        })

        // Glow
        if (state.cubeGlow) {
          state.cubeGlow.rotation.x = state.cube.rotation.x
          state.cubeGlow.rotation.y = state.cube.rotation.y
          state.cubeGlow.material.opacity = 0.15 + Math.sin(time * 1.5) * 0.05
        }

        // Particules
        if (state.cubeParticles) {
          state.cubeParticles.rotation.y = state.cube.rotation.y * 0.5
          state.cubeParticles.rotation.x = state.cube.rotation.x * 0.5
        }

        // Lumières
        if (state.cubeLights) {
          state.cubeLights.forEach((light, i) => {
            const angle = (i / state.cubeLights.length) * Math.PI * 2 + state.currentRotation.y
            light.position.x = Math.cos(angle) * 6
            light.position.y = Math.sin(angle) * 6
            light.intensity = 0.8 + Math.sin(time * 3 + i) * 0.2
          })
        }

        if (state.cubeRenderer && state.cubeScene && state.cubeCamera) {
          state.cubeRenderer.render(state.cubeScene, state.cubeCamera)
        }
      }
    }

    animateLoop()
  }

  // Gestion des événements
  const handleStartExperience = () => {
    setCurrentScreen('intro')
    setTimeout(() => {
      initCube()
      setCurrentScreen('cube')
    }, 100)
  }

  const handleCubeClick = (event) => {
    const state = stateRef.current
    if (!state.cube || !state.raycaster || !state.cubeCamera || currentScreen !== 'cube') return

    state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    state.raycaster.setFromCamera(state.mouse, state.cubeCamera)
    const intersects = state.raycaster.intersectObject(state.cube)

    if (intersects.length > 0) {
      const materialIndex = intersects[0].face.materialIndex
      let faceIndex = materialIndex
      if (faceIndex >= CONFIG.faces.length) {
        faceIndex = faceIndex % CONFIG.faces.length
      }
      setCurrentPage(faceIndex)
      setCurrentScreen('page')
    }
  }

  const handleClosePage = () => {
    const state = stateRef.current
    setCurrentPage(null)
    setCurrentScreen('cube')
    if (!reduceMotion) {
      state.autoRotate = true
    }
  }

  // Effet d'initialisation
  useEffect(() => {
    initSpectrum()
    animate()

    // Masquer le loader
    const timer = setTimeout(() => {
      setShowLoader(false)
    }, 1500)

    // Gestion du resize
    const handleResize = () => {
      const state = stateRef.current
      const width = window.innerWidth
      const height = window.innerHeight

      if (state.spectrumCamera && state.spectrumRenderer) {
        state.spectrumCamera.aspect = width / height
        state.spectrumCamera.updateProjectionMatrix()
        state.spectrumRenderer.setSize(width, height)
      }

      if (state.cubeCamera && state.cubeRenderer) {
        state.cubeCamera.aspect = width / height
        state.cubeCamera.updateProjectionMatrix()
        state.cubeRenderer.setSize(width, height)
      }
    }

    window.addEventListener('resize', handleResize)

    // Gestion du scroll
    const handleWheel = (e) => {
      if (reduceMotion || currentScreen !== 'cube') return
      e.preventDefault()
      const state = stateRef.current
      state.targetRotation.y += e.deltaY * CONFIG.scrollSensitivity
      state.autoRotate = false
      setTimeout(() => {
        if (!reduceMotion) state.autoRotate = true
      }, 2000)
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    // Gestion du drag
    const handleMouseDown = (e) => {
      if (currentScreen !== 'cube') return
      const state = stateRef.current
      state.isDragging = true
      state.autoRotate = false
      state.dragStart.x = e.clientX
      state.dragStart.y = e.clientY
    }

    const handleMouseMove = (e) => {
      const state = stateRef.current
      if (!state.isDragging || currentScreen !== 'cube') return
      const deltaX = e.clientX - state.dragStart.x
      const deltaY = e.clientY - state.dragStart.y
      state.targetRotation.x += deltaY * 0.01
      state.targetRotation.y += deltaX * 0.01
      state.dragStart.x = e.clientX
      state.dragStart.y = e.clientY
    }

    const handleMouseUp = () => {
      const state = stateRef.current
      state.isDragging = false
      if (!reduceMotion) {
        state.autoRotate = true
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    // Gestion du touch
    let touchStart = { x: 0, y: 0 }
    const handleTouchStart = (e) => {
      if (currentScreen !== 'cube') return
      const touch = e.touches[0]
      touchStart.x = touch.clientX
      touchStart.y = touch.clientY
      const state = stateRef.current
      state.isDragging = true
      state.autoRotate = false
    }

    const handleTouchMove = (e) => {
      const state = stateRef.current
      if (!state.isDragging || currentScreen !== 'cube') return
      e.preventDefault()
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStart.x
      const deltaY = touch.clientY - touchStart.y
      state.targetRotation.x += deltaY * CONFIG.touchSensitivity
      state.targetRotation.y += deltaX * CONFIG.touchSensitivity
      touchStart.x = touch.clientX
      touchStart.y = touch.clientY
    }

    const handleTouchEnd = () => {
      const state = stateRef.current
      state.isDragging = false
      if (!reduceMotion) {
        state.autoRotate = true
      }
    }

    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId)
      }
    }
  }, [])

  // Effet pour gérer le clic sur le cube
  useEffect(() => {
    if (currentScreen === 'cube' && cubeCanvasRef.current) {
      cubeCanvasRef.current.addEventListener('click', handleCubeClick)
      return () => {
        if (cubeCanvasRef.current) {
          cubeCanvasRef.current.removeEventListener('click', handleCubeClick)
        }
      }
    }
  }, [currentScreen])

  // Gestion de l'accessibilité
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setReduceMotion(true)
    }
  }, [])

  const handleToggleReduceMotion = () => {
    setReduceMotion(!reduceMotion)
    const state = stateRef.current
    state.autoRotate = !reduceMotion
  }

  const handleContactSubmit = (e) => {
    e.preventDefault()
    alert('Message envoyé ! (Fonctionnalité de démonstration)')
  }

  return (
    <>
      {showLoader && (
        <div id="loader" className="loader">
          <div className="loader-content">
            <div className="loader-shape"></div>
            <p>Chargement de l'expérience...</p>
          </div>
        </div>
      )}

      <div className="accessibility-controls">
          <button
          id="reduce-motion"
          className={`accessibility-btn ${reduceMotion ? 'active' : ''}`}
          onClick={handleToggleReduceMotion}
          aria-label="Réduire les animations"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
          </svg>
        </button>
        {currentScreen === 'page' && (
          <button
            id="close-page"
            className="accessibility-btn"
            onClick={handleClosePage}
            aria-label="Fermer la page"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        {currentScreen === 'cube' && (
          <button
            id="guide-toggle"
            className="accessibility-btn"
            onClick={() => setShowGuide(!showGuide)}
            aria-label="Ouvrir le guide"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              <path d="M8 7h6"></path>
              <path d="M8 11h6"></path>
              <path d="M8 15h4"></path>
            </svg>
          </button>
        )}
      </div>

      <div id="app-container" className="app-container">
        <canvas
          id="spectrum-canvas"
          ref={spectrumCanvasRef}
          className={`spectrum-canvas ${currentScreen !== 'welcome' ? 'hidden' : ''}`}
        />
        <canvas
          id="cube-canvas"
          ref={cubeCanvasRef}
          className={`cube-canvas ${currentScreen !== 'cube' ? 'hidden' : ''}`}
        />

        {currentScreen === 'welcome' && (
          <div id="welcome-screen" className="welcome-screen">
            <div className="welcome-content">
              <h1 className="welcome-title">Bienvenue dans Hair'gonomie</h1>
              <p className="welcome-subtitle">Une expérience de navigation révolutionnaire</p>
              <div className="welcome-intro">
                <p>Explorez notre univers à travers une forme 3D interactive.</p>
                <p>Chaque face vous mènera vers une nouvelle découverte.</p>
              </div>
              <button id="start-experience" className="start-button" onClick={handleStartExperience}>
                Commencer l'expérience
              </button>
            </div>
          </div>
        )}

        {currentScreen === 'intro' && (
          <div id="intro-screen" className="intro-screen">
            <div className="intro-content">
              <h2>Découvrez notre interface 3D</h2>
              <p>Interagissez avec le cube pour explorer nos différentes sections</p>
              <p className="intro-hint">Cliquez sur une face ou faites-la tourner</p>
            </div>
          </div>
        )}

        {currentScreen === 'cube' && (
          <div id="cube-container" className="cube-container"></div>
        )}

        <div id="pages-overlay" className={`pages-overlay ${currentScreen === 'page' ? 'active' : 'hidden'}`}>
          {currentPage !== null && CONFIG.faces[currentPage] && (
            <div
              className={`page-content ${currentScreen === 'page' ? 'active' : ''}`}
              id={CONFIG.faces[currentPage].pageId}
              data-face={currentPage}
            >
              <div className="page-wrapper">
                <div className="page-header">
                  <h2>{CONFIG.faces[currentPage].name}</h2>
                  <button className="close-page-btn" onClick={handleClosePage}>✕</button>
                </div>
                <div className="page-body">
                  {currentPage === 0 && (
                    <>
                      <div className="page-visual">
                        <div className="floating-shape"></div>
                      </div>
                      <div className="home-intro">
                        <h3>Bienvenue dans Hair'gonomie</h3>
                        <p className="intro-text">
                          Hair'gonomie est une application révolutionnaire qui transforme l'expérience de navigation web 
                          en une aventure interactive et immersive. Notre concept unique combine l'ergonomie moderne avec 
                          une esthétique avant-gardiste pour créer une interface utilisateur inoubliable.
                        </p>
                        <p className="intro-text">
                          Au lieu des menus traditionnels et des barres de navigation classiques, nous avons créé un 
                          univers 3D interactif où chaque face d'un cube géométrique représente une section de notre site. 
                          Cette approche innovante permet une navigation intuitive, fluide et visuellement captivante.
                        </p>
                        <div className="features-list">
                          <div className="feature-item">
                            <span className="feature-icon">🎯</span>
                            <div>
                              <h4>Navigation Intuitive</h4>
                              <p>Explorez notre contenu en interagissant naturellement avec une forme 3D</p>
                            </div>
                          </div>
                          <div className="feature-item">
                            <span className="feature-icon">✨</span>
                            <div>
                              <h4>Expérience Immersive</h4>
                              <p>Plongez dans un univers visuel unique qui transforme votre façon de naviguer</p>
                            </div>
                          </div>
                          <div className="feature-item">
                            <span className="feature-icon">🚀</span>
                            <div>
                              <h4>Innovation Technologique</h4>
                              <p>Utilisation des dernières technologies 3D pour une expérience fluide et performante</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {currentPage === 1 && (
                    <div className="services-page">
                      <p className="services-intro">Découvrez notre gamme complète de services professionnels</p>
                      <div className="services-grid">
                        <div className="service-card">
                          <div className="service-icon">✂️</div>
                          <h3>Coupe sur Mesure</h3>
                          <p className="service-description">
                            Nos experts créent des coupes personnalisées qui mettent en valeur votre personnalité 
                            et s'adaptent parfaitement à votre morphologie et à votre style de vie.
                          </p>
                          <ul className="service-features">
                            <li>Consultation personnalisée</li>
                            <li>Techniques de coupe modernes</li>
                            <li>Conseils de style adaptés</li>
                          </ul>
                        </div>
                        <div className="service-card">
                          <div className="service-icon">🎨</div>
                          <h3>Coloration Avancée</h3>
                          <p className="service-description">
                            Techniques de coloration de pointe avec des produits de qualité professionnelle. 
                            Du balayage subtil aux transformations radicales, nous réalisons vos rêves capillaires.
                          </p>
                          <ul className="service-features">
                            <li>Coloration créative</li>
                            <li>Balayage et ombré</li>
                            <li>Soins post-coloration</li>
                          </ul>
                        </div>
                        <div className="service-card">
                          <div className="service-icon">💆</div>
                          <h3>Soins Capillaires</h3>
                          <p className="service-description">
                            Traitements capillaires personnalisés pour restaurer, nourrir et protéger vos cheveux. 
                            Nos soins utilisent des produits naturels et des techniques professionnelles.
                          </p>
                          <ul className="service-features">
                            <li>Traitements réparateurs</li>
                            <li>Masques nutritifs</li>
                            <li>Conseils d'entretien</li>
                          </ul>
                        </div>
                        <div className="service-card">
                          <div className="service-icon">💇</div>
                          <h3>Styling Professionnel</h3>
                          <p className="service-description">
                            Coiffures pour tous vos événements spéciaux. De la coiffure de mariage au brushing 
                            quotidien, nos stylistes créent des looks qui vous ressemblent.
                          </p>
                          <ul className="service-features">
                            <li>Coiffures de soirée</li>
                            <li>Brushing et mise en plis</li>
                            <li>Conseils de coiffage</li>
                          </ul>
                        </div>
                        <div className="service-card">
                          <div className="service-icon">🌟</div>
                          <h3>Consultation Image</h3>
                          <p className="service-description">
                            Accompagnement complet pour définir votre style capillaire idéal. Analyse de votre 
                            morphologie, de votre teint et de votre personnalité pour un résultat parfait.
                          </p>
                          <ul className="service-features">
                            <li>Analyse personnalisée</li>
                            <li>Conseils de style</li>
                            <li>Suivi personnalisé</li>
                          </ul>
                        </div>
                        <div className="service-card">
                          <div className="service-icon">💅</div>
                          <h3>Services Complémentaires</h3>
                          <p className="service-description">
                            Services additionnels pour une expérience beauté complète : manucure, soins du visage 
                            et autres prestations pour prendre soin de vous de la tête aux pieds.
                          </p>
                          <ul className="service-features">
                            <li>Soins du visage</li>
                            <li>Manucure et pédicure</li>
                            <li>Packages complets</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  {currentPage === 2 && (
                    <>
                      <div className="concept-header">
                        <h3 className="concept-title">Notre Concept Révolutionnaire</h3>
                        <p className="concept-intro">
                          Hair'gonomie représente une rupture totale avec les interfaces web traditionnelles. 
                          Notre concept fusionne l'ergonomie moderne avec une esthétique avant-gardiste pour créer 
                          une expérience utilisateur inoubliable.
                        </p>
                      </div>
                      <div className="concept-details">
                        <div className="concept-section">
                          <h4>L'Idée Fondatrice</h4>
                          <p>
                            L'idée est née d'un constat simple : pourquoi les interfaces web doivent-elles être 
                            plates et prévisibles ? Nous avons imaginé un monde où la navigation devient une 
                            expérience sensorielle, où chaque interaction est une découverte, où la technologie 
                            rencontre l'art pour créer quelque chose de véritablement unique.
                          </p>
                        </div>
                        <div className="concept-visual">
                          <div className="concept-item">
                            <span className="concept-icon">✨</span>
                            <h3>Innovation Technologique</h3>
                            <p>
                              Utilisation des dernières technologies 3D (Three.js) pour créer des interfaces 
                              interactives et performantes. Chaque interaction est optimisée pour offrir une 
                              expérience fluide sur tous les appareils.
                            </p>
                          </div>
                          <div className="concept-item">
                            <span className="concept-icon">🎨</span>
                            <h3>Design Créatif</h3>
                            <p>
                              Chaque élément visuel est pensé pour émerveiller. Des animations subtiles aux 
                              transitions fluides, notre design crée une harmonie entre fonctionnalité et esthétique.
                            </p>
                          </div>
                          <div className="concept-item">
                            <span className="concept-icon">💫</span>
                            <h3>Excellence Utilisateur</h3>
                            <p>
                              L'utilisateur est au cœur de notre démarche. Chaque fonctionnalité est conçue pour 
                              être intuitive, accessible et agréable à utiliser, tout en conservant un niveau 
                              de professionnalisme irréprochable.
                            </p>
                          </div>
                        </div>
                        <div className="concept-section">
                          <h4>Notre Vision</h4>
                          <p>
                            Nous croyons que l'avenir du web réside dans des expériences immersives qui engagent 
                            tous les sens. Hair'gonomie n'est pas seulement un site web, c'est une démonstration 
                            de ce que peut être l'interaction numérique lorsqu'on ose sortir des sentiers battus.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {currentPage === 3 && (
                    <>
                      <div className="team-header">
                        <h3>Notre Équipe</h3>
                        <p className="team-intro">
                          Une équipe passionnée de développeurs full-stack et de designers, unis par la volonté 
                          de créer des expériences web exceptionnelles.
                        </p>
                      </div>
                      <div className="team-grid">
                        <div className="team-card leader">
                          <div className="team-avatar">👨‍💻</div>
                          <div className="team-badge">Leader</div>
                          <h3>Cheikh Melainine</h3>
                          <p className="team-role">Full-stack Developer</p>
                          <p className="team-description">
                            Expert en développement full-stack avec une passion pour l'architecture logicielle 
                            et les technologies modernes. Spécialisé dans la création d'applications performantes 
                            et scalables.
                          </p>
                        </div>
                        <div className="team-card leader">
                          <div className="team-avatar">👨‍💻</div>
                          <div className="team-badge">Leader</div>
                          <h3>El Kherchi</h3>
                          <p className="team-role">Full-stack Developer</p>
                          <p className="team-description">
                            Développeur full-stack expérimenté, passionné par l'innovation et les solutions 
                            techniques élégantes. Expert en intégration de systèmes complexes et optimisation 
                            de performances.
                          </p>
                        </div>
                        <div className="team-card">
                          <div className="team-avatar">👨‍💻</div>
                          <h3>Bezeid</h3>
                          <p className="team-role">Full-stack Developer</p>
                          <p className="team-description">
                            Développeur full-stack créatif, spécialisé dans la création d'interfaces utilisateur 
                            innovantes et d'expériences web immersives. Passionné par les technologies 3D et 
                            les interactions modernes.
                          </p>
                        </div>
                        <div className="team-card">
                          <div className="team-avatar">👩‍💻</div>
                          <h3>Oumame</h3>
                          <p className="team-role">Développeuse & Web-Designer</p>
                          <p className="team-description">
                            Créative et polyvalente, Oumame allie compétences techniques en développement et 
                            sens artistique en design. Spécialisée dans la création d'interfaces élégantes et 
                            fonctionnelles qui allient esthétique et ergonomie.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {currentPage === 4 && (
                    <div className="about-content">
                      <div className="about-section">
                        <h3>Notre Histoire</h3>
                        <p>
                          Hair'gonomie est née d'une vision audacieuse : transformer l'expérience de navigation web 
                          en quelque chose de véritablement exceptionnel. Fondée par une équipe de développeurs passionnés, 
                          notre projet a émergé du désir de casser les codes établis et de proposer une alternative 
                          innovante aux interfaces traditionnelles.
                        </p>
                        <p>
                          Le nom "Hair'gonomie" fusionne l'idée de l'ergonomie (la science de l'adaptation du travail 
                          à l'homme) avec une approche moderne et créative. Nous croyons que la technologie doit servir 
                          l'expérience utilisateur, pas l'inverse.
                        </p>
                      </div>
                      <div className="about-section">
                        <h3>Notre Mission</h3>
                        <p>
                          Notre mission est de révolutionner la façon dont les utilisateurs interagissent avec le web. 
                          Nous créons des expériences immersives qui combinent innovation technologique, design élégant 
                          et ergonomie intuitive. Chaque projet que nous développons est une opportunité de repousser 
                          les limites de ce qui est possible.
                        </p>
                      </div>
                      <div className="about-section">
                        <h3>Nos Valeurs</h3>
                        <div className="values-grid">
                          <div className="value-item">
                            <h4>Innovation</h4>
                            <p>Nous explorons constamment de nouvelles technologies et approches pour rester à la pointe de l'innovation.</p>
                          </div>
                          <div className="value-item">
                            <h4>Excellence</h4>
                            <p>Chaque détail compte. Nous visons la perfection dans chaque aspect de nos créations.</p>
                          </div>
                          <div className="value-item">
                            <h4>Créativité</h4>
                            <p>Nous osons sortir des sentiers battus pour créer des expériences uniques et mémorables.</p>
                          </div>
                          <div className="value-item">
                            <h4>Accessibilité</h4>
                            <p>Nos créations sont conçues pour être accessibles à tous, avec des options d'adaptation pour chaque utilisateur.</p>
                          </div>
                        </div>
                      </div>
                      <div className="about-section">
                        <h3>Notre Vision</h3>
                        <p>
                          Nous envisageons un futur où les interfaces web ne sont plus de simples pages statiques, 
                          mais des mondes interactifs où chaque visite est une aventure. Hair'gonomie est notre première 
                          étape vers cette vision, et nous continuons d'évoluer pour créer des expériences toujours 
                          plus immersives et engageantes.
                        </p>
                      </div>
                    </div>
                  )}
                  {currentPage === 5 && (
                    <>
                      <div className="contact-header">
                        <h3>Contactez-nous</h3>
                        <p className="contact-intro">
                          Vous avez une question, un projet ou simplement envie d'échanger ? N'hésitez pas à nous 
                          contacter. Notre équipe est à votre écoute et répondra à toutes vos demandes dans les 
                          plus brefs délais.
                        </p>
                        <p className="contact-info">
                          Que ce soit pour discuter d'un projet de développement, obtenir des informations sur nos 
                          services, ou partager vos idées, nous serions ravis d'entendre parler de vous.
                        </p>
                      </div>
                      <form className="contact-form" onSubmit={handleContactSubmit}>
                        <div className="form-group">
                          <label htmlFor="contact-name">Nom complet</label>
                          <input 
                            type="text" 
                            id="contact-name"
                            placeholder="Votre nom" 
                            aria-label="Nom" 
                            required 
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact-email">Adresse email</label>
                          <input 
                            type="email" 
                            id="contact-email"
                            placeholder="votre.email@exemple.com" 
                            aria-label="Email" 
                            required 
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contact-message">Message</label>
                          <textarea 
                            id="contact-message"
                            placeholder="Votre message..." 
                            aria-label="Message" 
                            rows="6"
                            required
                          ></textarea>
                        </div>
                        <button type="submit" className="submit-button">Envoyer le message</button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay du guide de navigation */}
      {showGuide && (
        <div 
          className={`guide-overlay ${showGuide ? 'active' : ''}`}
          onClick={(e) => {
            if (e.target.classList.contains('guide-overlay')) {
              setShowGuide(false)
            }
          }}
        >
          <div className="guide-modal">
            <div className="guide-header">
              <h2 className="guide-title">Guide de Navigation</h2>
            </div>
            <div className="guide-content">
              <div className="guide-instructions-compact">
                <div className="instruction-compact">
                  <svg className="instruction-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                  </svg>
                  <span>Molette ou glisser pour tourner</span>
                </div>
                <div className="instruction-compact">
                  <svg className="instruction-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Cliquer sur une face pour ouvrir</span>
                </div>
              </div>
              
              <div className="guide-pages-compact">
                <h3 className="guide-pages-title">Pages</h3>
                <div className="pages-grid-compact">
                  {CONFIG.faces.map((face, index) => (
                    <div key={index} className="page-guide-compact" data-color={face.name.toLowerCase().replace(' ', '-')}>
                      <span className={`page-color-dot color-${face.name.toLowerCase().replace(' ', '-')}`} style={{ backgroundColor: `#${face.color.toString(16).padStart(6, '0')}` }}></span>
                      <span className="page-name">{face.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

