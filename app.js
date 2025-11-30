// Configuration globale
const CONFIG = {
    cubeSize: 2.5,
    spectrumSize: 1.5,
    rotationSpeed: 0.02,
    scrollSensitivity: 0.003,
    touchSensitivity: 0.01,
    autoRotateSpeed: 0.005,
    faces: [
        { name: 'Accueil', color: 0x3498db, pageId: 'page-accueil' },      // Bleu
        { name: 'Services', color: 0xe74c3c, pageId: 'page-services' },    // Rouge
        { name: 'Concept', color: 0x9b59b6, pageId: 'page-concept' },     // Violet
        { name: 'Equipes', color: 0x152972, pageId: 'page-equipes' },      // Bleu foncé (Navy)
        { name: 'À propos', color: 0xf39c12, pageId: 'page-about' },       // Orange
        { name: 'Contact', color: 0x1abc9c, pageId: 'page-contact' }       // Turquoise
    ],
    reduceMotion: false
};

// État de l'application
const state = {
    // Scènes 3D
    spectrumScene: null,
    spectrumCamera: null,
    spectrumRenderer: null,
    spectrumShape: null,
    
    cubeScene: null,
    cubeCamera: null,
    cubeRenderer: null,
    cube: null,
    raycaster: null,
    mouse: new THREE.Vector2(),
    
    // Navigation
    currentFace: null,
    targetRotation: { x: 0.2, y: 0 },
    currentRotation: { x: 0.2, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    autoRotate: true,
    
    // UI
    currentScreen: 'welcome', // welcome, intro, cube, page
    currentPage: null
};

// Initialisation
function init() {
    // Vérifier que Three.js est chargé
    if (typeof THREE === 'undefined') {
        console.error('Three.js n\'est pas chargé');
        // Masquer le loader quand même après un délai
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.classList.add('hidden');
            }
        }, 2000);
        return;
    }
    
    try {
        setupAccessibility();
        initSpectrum();
        setupEventListeners();
        animate();
        
        // Masquer le loader
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.classList.add('hidden');
                // Forcer le masquage immédiatement
                loader.style.display = 'none';
            }
        }, 1500);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        // Masquer le loader même en cas d'erreur
        setTimeout(() => {
            const loader = document.getElementById('loader');
            if (loader) {
                loader.classList.add('hidden');
                loader.style.display = 'none';
            }
        }, 2000);
    }
}

// Configuration de l'accessibilité
function setupAccessibility() {
    const reduceMotionBtn = document.getElementById('reduce-motion');
    const closePageBtn = document.getElementById('close-page');
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        CONFIG.reduceMotion = true;
        document.body.classList.add('reduce-motion');
        reduceMotionBtn.classList.add('active');
    }
    
    reduceMotionBtn.addEventListener('click', () => {
        CONFIG.reduceMotion = !CONFIG.reduceMotion;
        document.body.classList.toggle('reduce-motion', CONFIG.reduceMotion);
        reduceMotionBtn.classList.toggle('active', CONFIG.reduceMotion);
        state.autoRotate = !CONFIG.reduceMotion;
    });
    
    closePageBtn.addEventListener('click', closeCurrentPage);
    
    // Bouton de démarrage
    document.getElementById('start-experience').addEventListener('click', startExperience);
    
    // Boutons de fermeture des pages
    document.querySelectorAll('.close-page-btn').forEach(btn => {
        btn.addEventListener('click', closeCurrentPage);
    });
    
    // Formulaire de contact
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Message envoyé ! (Fonctionnalité de démonstration)');
        });
    }
}

// Initialisation de la forme spectrale
function initSpectrum() {
    const canvas = document.getElementById('spectrum-canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Scène
    state.spectrumScene = new THREE.Scene();
    state.spectrumScene.background = new THREE.Color(0x000000);
    
    // Caméra
    state.spectrumCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    state.spectrumCamera.position.z = 5;
    
    // Renderer avec effets améliorés
    state.spectrumRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    state.spectrumRenderer.setSize(width, height);
    state.spectrumRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.spectrumRenderer.shadowMap.enabled = true;
    
    // Créer une forme spectrale améliorée (icosaèdre avec wireframe)
    const geometry = new THREE.IcosahedronGeometry(CONFIG.spectrumSize, 2);
    
    // Matériau principal avec glow
    const material = new THREE.MeshStandardMaterial({
        color: 0x3498db,
        emissive: 0x3498db,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    state.spectrumShape = new THREE.Mesh(geometry, material);
    state.spectrumShape.castShadow = true;
    state.spectrumShape.receiveShadow = true;
    state.spectrumScene.add(state.spectrumShape);
    
    // Ajouter un wireframe pour plus d'effet
    const wireframe = new THREE.WireframeGeometry(geometry);
    const wireframeLine = new THREE.LineSegments(
        wireframe,
        new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6
        })
    );
    state.spectrumShape.add(wireframeLine);
    
    // Particules 0 et 1 bleues (thème informatique) pour l'écran de bienvenue
    const particlesCount = 300;
    state.spectrumParticles = new THREE.Group();
    
    // Créer des textures pour 0 et 1 en bleu
    const createTextTexture = (text) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, 64, 64);
        
        context.font = 'bold 48px monospace';
        context.fillStyle = '#3498db'; // Bleu
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 32, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    };
    
    const texture0 = createTextTexture('0');
    const texture1 = createTextTexture('1');
    
    // Créer les sprites 0 et 1
    const velocities = [];
    for (let i = 0; i < particlesCount; i++) {
        const radius = 3 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        // Alterner entre 0 et 1
        const isOne = Math.random() > 0.5;
        const texture = isOne ? texture1 : texture0;
        
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7,
            color: 0x3498db, // Bleu
            blending: THREE.AdditiveBlending
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.3, 0.3, 1);
        
        // Stocker la vitesse pour l'animation
        const vel = {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
        };
        sprite.userData.velocity = vel;
        velocities.push(vel);
        
        state.spectrumParticles.add(sprite);
    }
    
    state.spectrumScene.add(state.spectrumParticles);
    state.particlesVelocities = velocities;
    
    // Lumières améliorées
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    state.spectrumScene.add(ambientLight);
    
    // Point lights colorées pour effet spectre
    const colors = [0x3498db, 0xe74c3c, 0x9b59b6, 0xf39c12, 0x1abc9c];
    state.spectrumLights = [];
    colors.forEach((color, i) => {
        const light = new THREE.PointLight(color, 1.5, 50);
        const angle = (i / colors.length) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 5,
            Math.sin(angle) * 5,
            3
        );
        state.spectrumScene.add(light);
        state.spectrumLights.push(light);
    });
    
    // Light principale au centre
    const mainLight = new THREE.PointLight(0xffffff, 2, 100);
    mainLight.position.set(0, 0, 5);
    state.spectrumScene.add(mainLight);
}

// Initialisation du cube 3D
function initCube() {
    const canvas = document.getElementById('cube-canvas');
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Scène
    state.cubeScene = new THREE.Scene();
    state.cubeScene.background = new THREE.Color(0x0a0a0a);
    
    // Caméra
    state.cubeCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    state.cubeCamera.position.z = 6;
    
    // Renderer avec effets améliorés
    state.cubeRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    state.cubeRenderer.setSize(width, height);
    state.cubeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.cubeRenderer.shadowMap.enabled = true;
    state.cubeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Créer le cube avec des matériaux améliorés pour chaque face
    const geometry = new THREE.BoxGeometry(CONFIG.cubeSize, CONFIG.cubeSize, CONFIG.cubeSize);
    const materials = [];
    
    // Un cube a 6 faces, on a maintenant 6 pages
    for (let i = 0; i < 6; i++) {
        const faceIndex = i;
        const face = CONFIG.faces[faceIndex];
        
        materials.push(new THREE.MeshStandardMaterial({
            color: face.color,
            emissive: face.color,
            emissiveIntensity: 0.5,
            metalness: 0.7,
            roughness: 0.3,
            transparent: true,
            opacity: 0.98,
            side: THREE.DoubleSide
        }));
    }
    
    state.cube = new THREE.Mesh(geometry, materials);
    state.cube.rotation.x = 0.2;
    state.cube.rotation.y = 0;
    state.cube.castShadow = true;
    state.cube.receiveShadow = true;
    state.cubeScene.add(state.cube);
    
    // Ajouter des bords brillants pour plus de visibilité
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            opacity: 0.8, 
            transparent: true,
            linewidth: 3
        })
    );
    state.cube.add(line);
    
    // Ajouter un glow autour du cube
    const glowGeometry = new THREE.BoxGeometry(CONFIG.cubeSize * 1.1, CONFIG.cubeSize * 1.1, CONFIG.cubeSize * 1.1);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x3498db,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    state.cube.add(glow);
    state.cubeGlow = glow;
    
    // Raycaster pour détecter les clics
    state.raycaster = new THREE.Raycaster();
    
    // Lumières améliorées avec couleurs
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    state.cubeScene.add(ambientLight);
    
    // Lumières directionnelles colorées pour chaque face
    CONFIG.faces.forEach((face, i) => {
        const angle = (i / CONFIG.faces.length) * Math.PI * 2;
        const light = new THREE.DirectionalLight(face.color, 0.8);
        light.position.set(
            Math.cos(angle) * 8,
            Math.sin(angle) * 8,
            5
        );
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        state.cubeScene.add(light);
    });
    
    // Point lights pour effet de glow dynamique
    state.cubeLights = [];
    CONFIG.faces.forEach((face, i) => {
        const angle = (i / CONFIG.faces.length) * Math.PI * 2;
        const light = new THREE.PointLight(face.color, 1, 50);
        light.position.set(
            Math.cos(angle) * 6,
            Math.sin(angle) * 6,
            4
        );
        state.cubeScene.add(light);
        state.cubeLights.push(light);
    });
    
    // Particules normales (petits carrés) autour du cube
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
        const radius = 4 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        
        posArray[i] = radius * Math.sin(phi) * Math.cos(theta);
        posArray[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        posArray[i + 2] = radius * Math.cos(phi);
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const cubeParticles = new THREE.Points(particlesGeometry, particlesMaterial);
    state.cubeScene.add(cubeParticles);
    state.cubeParticles = cubeParticles;
}

// Démarrer l'expérience
function startExperience() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const introScreen = document.getElementById('intro-screen');
    const cubeCanvas = document.getElementById('cube-canvas');
    const cubeContainer = document.getElementById('cube-container');
    
    // Masquer l'écran de bienvenue
    welcomeScreen.classList.add('hidden');
    
    // Initialiser le cube
    initCube();
    
    // Afficher l'introduction
    introScreen.classList.remove('hidden');
    state.currentScreen = 'intro';
    
    // Après 3 secondes, afficher le cube
    setTimeout(() => {
        introScreen.classList.add('hidden');
        cubeCanvas.classList.remove('hidden');
        cubeContainer.classList.remove('hidden');
        state.currentScreen = 'cube';
    }, 3000);
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Clic sur le cube
    window.addEventListener('click', onCubeClick);
    
    // Drag pour faire tourner le cube
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    // Touch events
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    
    // Scroll pour faire tourner
    window.addEventListener('wheel', onWheel, { passive: false });
    
    // Redimensionnement
    window.addEventListener('resize', onWindowResize);
}

// Gestion des clics sur le cube
function onCubeClick(event) {
    if (state.currentScreen !== 'cube' || !state.cube) return;
    
    // Calculer la position de la souris normalisée
    state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Mettre à jour le raycaster
    state.raycaster.setFromCamera(state.mouse, state.cubeCamera);
    
    // Intersection avec le cube
    const intersects = state.raycaster.intersectObject(state.cube);
    
    if (intersects.length > 0) {
        const intersection = intersects[0];
        const face = intersection.face;
        
        // Obtenir la normale de la face dans l'espace monde
        const normal = new THREE.Vector3();
        normal.copy(face.normal);
        normal.transformDirection(state.cube.matrixWorld);
        
        // Déterminer quelle face est la plus proche de la caméra
        // En fonction de la direction de la normale
        const cameraDirection = new THREE.Vector3();
        cameraDirection.subVectors(state.cubeCamera.position, intersection.point).normalize();
        
        // Calculer le produit scalaire pour trouver la face la plus visible
        // Les faces d'un cube standard: 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
        const materialIndex = face.materialIndex;
        
        // Mapper les 6 faces du cube aux 6 pages
        // Chaque face correspond directement à une page
        let faceIndex = materialIndex;
        // S'assurer que l'index est dans les limites (0-5)
        if (faceIndex >= CONFIG.faces.length) {
            faceIndex = faceIndex % CONFIG.faces.length;
        }
        
        openPage(faceIndex);
    }
}

// Ouvrir une page depuis une face
function openPage(faceIndex) {
    if (faceIndex < 0 || faceIndex >= CONFIG.faces.length) return;
    
    const face = CONFIG.faces[faceIndex];
    const pageElement = document.getElementById(face.pageId);
    const pagesOverlay = document.getElementById('pages-overlay');
    const closePageBtn = document.getElementById('close-page');
    const cubeCanvas = document.getElementById('cube-canvas');
    const cubeContainer = document.getElementById('cube-container');
    
    if (!pageElement) return;
    
    // S'assurer que le cube reste visible (mais derrière l'overlay)
    if (cubeCanvas) {
        cubeCanvas.classList.remove('hidden');
    }
    if (cubeContainer) {
        cubeContainer.classList.remove('hidden');
    }
    
    // Masquer toutes les pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    // Afficher la page sélectionnée
    pageElement.classList.add('active');
    pagesOverlay.classList.add('active');
    pagesOverlay.classList.remove('hidden');
    closePageBtn.classList.remove('hidden');
    
    state.currentPage = faceIndex;
    state.currentScreen = 'page';
    state.autoRotate = false;
    
    // Animation du cube vers la face sélectionnée
    const targetAngles = [
        Math.PI / 4,                          // Face 0: Accueil (Bleu)
        Math.PI / 4 + Math.PI / 2.5,          // Face 1: Services (Rouge)
        Math.PI / 4 + Math.PI / 1.25,         // Face 2: Concept (Violet)
        Math.PI / 4 + Math.PI * 1.2,           // Face 3: Equipes (Vert foncé)
        Math.PI / 4 + Math.PI,                 // Face 4: À propos (Orange)
        Math.PI / 4 + Math.PI * 1.5           // Face 5: Contact (Turquoise)
    ];
    
    if (faceIndex < targetAngles.length) {
        state.targetRotation.y = targetAngles[faceIndex];
    }
}

// Fermer la page actuelle
function closeCurrentPage() {
    const pagesOverlay = document.getElementById('pages-overlay');
    const closePageBtn = document.getElementById('close-page');
    const cubeCanvas = document.getElementById('cube-canvas');
    const cubeContainer = document.getElementById('cube-container');
    
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    pagesOverlay.classList.remove('active');
    
    // S'assurer que le cube est visible IMMÉDIATEMENT
    // Forcer l'affichage en retirant la classe hidden et en définissant display
    if (cubeCanvas) {
        cubeCanvas.classList.remove('hidden');
        // Forcer le display car .hidden utilise display: none !important
        setTimeout(() => {
            cubeCanvas.style.setProperty('display', 'block', 'important');
        }, 0);
    }
    if (cubeContainer) {
        cubeContainer.classList.remove('hidden');
        setTimeout(() => {
            cubeContainer.style.setProperty('display', 'flex', 'important');
        }, 0);
    }
    
    setTimeout(() => {
        pagesOverlay.classList.add('hidden');
        closePageBtn.classList.add('hidden');
    }, 800);
    
    state.currentPage = null;
    state.currentScreen = 'cube';
    state.autoRotate = !CONFIG.reduceMotion;
}

// Gestion de la souris pour faire tourner
function onMouseDown(event) {
    if (state.currentScreen !== 'cube') return;
    state.isDragging = true;
    state.dragStart.x = event.clientX;
    state.dragStart.y = event.clientY;
    state.autoRotate = false;
}

function onMouseMove(event) {
    if (!state.isDragging || state.currentScreen !== 'cube') return;
    
    const deltaX = event.clientX - state.dragStart.x;
    const deltaY = event.clientY - state.dragStart.y;
    
    state.targetRotation.y += deltaX * 0.01;
    state.targetRotation.x += deltaY * 0.01;
    
    state.dragStart.x = event.clientX;
    state.dragStart.y = event.clientY;
}

function onMouseUp() {
    state.isDragging = false;
    if (state.currentScreen === 'cube') {
        state.autoRotate = !CONFIG.reduceMotion;
    }
}

// Gestion du touch
let touchStartX = 0;
let touchStartY = 0;

function onTouchStart(event) {
    if (state.currentScreen !== 'cube') return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    state.isDragging = true;
    state.autoRotate = false;
}

function onTouchMove(event) {
    if (!state.isDragging || state.currentScreen !== 'cube') return;
    event.preventDefault();
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    state.targetRotation.y += deltaX * CONFIG.touchSensitivity;
    state.targetRotation.x += deltaY * CONFIG.touchSensitivity;
    
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function onTouchEnd() {
    state.isDragging = false;
    if (state.currentScreen === 'cube') {
        state.autoRotate = !CONFIG.reduceMotion;
    }
}

// Gestion du scroll
function onWheel(event) {
    if (state.currentScreen !== 'cube' || CONFIG.reduceMotion) return;
    
    event.preventDefault();
    state.targetRotation.y += event.deltaY * CONFIG.scrollSensitivity;
    state.autoRotate = false;
    
    setTimeout(() => {
        state.autoRotate = !CONFIG.reduceMotion;
    }, 2000);
}

// Animation
function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    
    // Animer la forme spectrale
    if (state.spectrumShape && state.currentScreen === 'welcome') {
        // Rotation de la forme
        state.spectrumShape.rotation.x += 0.008;
        state.spectrumShape.rotation.y += 0.01;
        state.spectrumShape.rotation.z += 0.005;
        
        // Flottement vertical
        state.spectrumShape.position.y = Math.sin(time) * 0.5;
        
        // Pulsation de l'émissivité
        state.spectrumShape.material.emissiveIntensity = 0.6 + Math.sin(time * 2) * 0.2;
        
        // Animer les particules 0 et 1
        if (state.spectrumParticles && state.spectrumParticles.children) {
            state.spectrumParticles.children.forEach((sprite) => {
                if (sprite.userData.velocity) {
                    sprite.position.x += sprite.userData.velocity.x;
                    sprite.position.y += sprite.userData.velocity.y;
                    sprite.position.z += sprite.userData.velocity.z;
                    
                    // Réinitialiser si trop loin
                    const dist = Math.sqrt(
                        sprite.position.x**2 + 
                        sprite.position.y**2 + 
                        sprite.position.z**2
                    );
                    if (dist > 8) {
                        const radius = 3 + Math.random() * 2;
                        const theta = Math.random() * Math.PI * 2;
                        const phi = Math.acos(Math.random() * 2 - 1);
                        sprite.position.set(
                            radius * Math.sin(phi) * Math.cos(theta),
                            radius * Math.sin(phi) * Math.sin(theta),
                            radius * Math.cos(phi)
                        );
                    }
                }
            });
        }
        
        // Animer les lumières
        if (state.spectrumLights) {
            state.spectrumLights.forEach((light, i) => {
                const angle = (i / state.spectrumLights.length) * Math.PI * 2 + time;
                light.position.x = Math.cos(angle) * 5;
                light.position.y = Math.sin(angle) * 5;
                light.intensity = 1.2 + Math.sin(time * 2 + i) * 0.3;
            });
        }
        
        if (state.spectrumRenderer) {
            state.spectrumRenderer.render(state.spectrumScene, state.spectrumCamera);
        }
    }
    
    // Animer le cube
    if (state.cube && state.currentScreen === 'cube') {
        // Auto-rotation
        if (state.autoRotate && !state.isDragging) {
            state.targetRotation.y += CONFIG.autoRotateSpeed;
        }
        
        // Interpolation fluide
        const lerpFactor = CONFIG.reduceMotion ? 1 : 0.1;
        state.currentRotation.y += (state.targetRotation.y - state.currentRotation.y) * lerpFactor;
        state.currentRotation.x += (state.targetRotation.x - state.currentRotation.x) * lerpFactor;
        
        // Appliquer la rotation
        state.cube.rotation.y = state.currentRotation.y;
        state.cube.rotation.x = state.currentRotation.x;
        
        // Effet de pulsation sur les matériaux
        state.cube.material.forEach((material, index) => {
            if (material) {
                material.emissiveIntensity = 0.4 + Math.sin(time * 2 + index) * 0.2;
            }
        });
        
        // Animer le glow
        if (state.cubeGlow) {
            state.cubeGlow.rotation.x = state.cube.rotation.x;
            state.cubeGlow.rotation.y = state.cube.rotation.y;
            state.cubeGlow.material.opacity = 0.15 + Math.sin(time * 1.5) * 0.05;
        }
        
        // Animer les particules autour du cube
        if (state.cubeParticles) {
            state.cubeParticles.rotation.y = state.cube.rotation.y * 0.5;
            state.cubeParticles.rotation.x = state.cube.rotation.x * 0.5;
        }
        
        // Animer les lumières
        if (state.cubeLights) {
            state.cubeLights.forEach((light, i) => {
                const angle = (i / state.cubeLights.length) * Math.PI * 2 + state.currentRotation.y;
                light.position.x = Math.cos(angle) * 6;
                light.position.y = Math.sin(angle) * 6;
                light.intensity = 0.8 + Math.sin(time * 3 + i) * 0.2;
            });
        }
        
        if (state.cubeRenderer) {
            state.cubeRenderer.render(state.cubeScene, state.cubeCamera);
        }
    }
}

// Gestion du redimensionnement
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (state.spectrumCamera && state.spectrumRenderer) {
        state.spectrumCamera.aspect = width / height;
        state.spectrumCamera.updateProjectionMatrix();
        state.spectrumRenderer.setSize(width, height);
    }
    
    if (state.cubeCamera && state.cubeRenderer) {
        state.cubeCamera.aspect = width / height;
        state.cubeCamera.updateProjectionMatrix();
        state.cubeRenderer.setSize(width, height);
    }
}

// Initialisation au chargement
// Attendre que le DOM et Three.js soient chargés
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Attendre que Three.js soit chargé
        if (typeof THREE !== 'undefined') {
            init();
        } else {
            // Attendre un peu plus si Three.js n'est pas encore chargé
            const checkThree = setInterval(() => {
                if (typeof THREE !== 'undefined') {
                    clearInterval(checkThree);
                    init();
                }
            }, 100);
            
            // Timeout de sécurité après 5 secondes
            setTimeout(() => {
                clearInterval(checkThree);
                if (typeof THREE === 'undefined') {
                    console.error('Three.js n\'a pas pu être chargé');
                }
                init(); // Essayer quand même
            }, 5000);
        }
    });
} else {
    // Le DOM est déjà chargé
    if (typeof THREE !== 'undefined') {
        init();
    } else {
        // Attendre que Three.js soit chargé
        const checkThree = setInterval(() => {
            if (typeof THREE !== 'undefined') {
                clearInterval(checkThree);
                init();
            }
        }, 100);
        
        setTimeout(() => {
            clearInterval(checkThree);
            init(); // Essayer quand même
        }, 5000);
    }
}

// Gestion de la visibilité
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        state.autoRotate = false;
    } else {
        state.autoRotate = !CONFIG.reduceMotion && state.currentScreen === 'cube';
    }
});
