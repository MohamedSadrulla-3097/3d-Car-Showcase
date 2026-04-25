import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import gsap from 'gsap';
import Lenis from 'lenis';

THREE.Cache.enabled = true;

// --- LENIS SMOOTH SCROLL ---
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const canvasform = document.getElementById('dCanvas');
let width = canvasform.offsetWidth;
let height = canvasform.offsetHeight;

const scene = new THREE.Scene();
// Scene background is now handled by CSS gradient

const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ 
  alpha: true, 
  antialias: true, 
  powerPreference: "high-performance",
  precision: 'mediump'
});
renderer.setSize(width, height);
renderer.setPixelRatio(window.innerWidth < 768 ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; 
canvasform.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enablePan = false; 

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY
};

// AUTO-ROTATION CONTROL
let isInteracting = false;
controls.addEventListener('start', () => { isInteracting = true; });
controls.addEventListener('end', () => { isInteracting = false; });

// --- LUXURY WHITE PLATFORM ---
const platformGroup = new THREE.Group();
scene.add(platformGroup);

const platformGeom = new THREE.CylinderGeometry(6.5, 6.5, 0.1, 64);
const platformMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
});
const platform = new THREE.Mesh(platformGeom, platformMat);
platform.position.y = -0.05; 
scene.add(platform);

// Ground Shadow
const groundGeom = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.05 });
const ground = new THREE.Mesh(groundGeom, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.1;
scene.add(ground);

// --- 2026 TREND: DIGITAL TWIN & AERO SCANNER EFFECTS ---
// Subtle blueprint grid in Black for contrast on white floor
const gridHelper = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
gridHelper.material.opacity = 0.03;
gridHelper.material.transparent = true;
gridHelper.position.y = -0.09;
scene.add(gridHelper);

// EV Charging / Data Scanner Rings in Blue and Red
const techRings = new THREE.Group();
scene.add(techRings);
const ringColors = [0x00aaff, 0xff2200, 0x00aaff]; // Cyber Blue and Racing Red
for (let i = 0; i < 3; i++) {
  const ringGeom = new THREE.RingGeometry(8 + i * 2.5, 8.05 + i * 2.5, 64, 1, 0, Math.PI * 1.5);
  const ringMat = new THREE.MeshBasicMaterial({ 
    color: ringColors[i], 
    transparent: true, 
    opacity: 0.12 - (i * 0.03),
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.08;
  techRings.add(ring);
}

// LiDAR Scanning / Aero Wind Particles
const particlesGeom = new THREE.BufferGeometry();
const particleCount = 1000;
const posArray = new Float32Array(particleCount * 3);
const colorArray = new Float32Array(particleCount * 3);

for(let i = 0; i < particleCount * 3; i+=3) {
  posArray[i] = (Math.random() - 0.5) * 50;
  posArray[i+1] = Math.random() * 20;
  posArray[i+2] = (Math.random() - 0.5) * 50;

  const isBlue = Math.random() > 0.5;
  colorArray[i] = isBlue ? 0.0 : 1.0; 
  colorArray[i+1] = isBlue ? 0.6 : 0.1;
  colorArray[i+2] = isBlue ? 1.0 : 0.0;
}

particlesGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
particlesGeom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

const particlesMat = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true,
  transparent: true,
  opacity: 0.2
});
const particlesMesh = new THREE.Points(particlesGeom, particlesMat);
scene.add(particlesMesh);

// Camera Constraints
controls.minDistance = 12;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2.2;
controls.minPolarAngle = Math.PI / 3.0;

// Lighting - Restored White Lights
scene.add(new THREE.AmbientLight(0xffffff, 2.0));
const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
topLight.position.set(5, 15, 5);
scene.add(topLight);

const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader().load("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr", (texture) => {
  scene.environment = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
});

// SAFETY FALLBACK: Hide loader after 10 seconds no matter what
setTimeout(() => {
  if (loaderOverlay && !loaderOverlay.classList.contains('loader-hidden')) {
    console.warn('Loading taking too long, forcing loader hide');
    loaderOverlay.classList.add('loader-hidden');
  }
}, 10000);

const carAnchor = new THREE.Group();
scene.add(carAnchor);

let object;
const loadingManager = new THREE.LoadingManager();
const progressFill = document.getElementById('progress');
const loaderOverlay = document.getElementById('loader');

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  if (progressFill) progressFill.style.width = progress + '%';
};

loadingManager.onLoad = () => {
  setTimeout(() => {
    if (loaderOverlay) loaderOverlay.classList.add('loader-hidden');
  }, 500);
};

loadingManager.onError = (url) => {
  console.error('There was an error loading ' + url);
  setTimeout(() => {
    if (loaderOverlay) loaderOverlay.classList.add('loader-hidden');
  }, 1000);
};

const loader = new GLTFLoader(loadingManager);

const carData = [
  { name: "BMW M5 EV", logo: "Pictures/bmwLogo.png", model: 'Car3Dmodels/bmw.glb', price: "₹2.25 Cr", speed: "320 km/h", power: "1135 HP", gearbox: "9-Speed Auto" },
  { name: "LAMBO REVUELTO", logo: "Pictures/lamborghiniLogo.png", model: 'Car3Dmodels/lamborghini.glb', price: "₹9.50 Cr", speed: "350 km/h", power: "1015 HP", gearbox: "8-Speed DCT" },
  { name: "PORSCHE GT3 RS", logo: "Pictures/porscheLogo.png", model: 'Car3Dmodels/porsche.glb', price: "₹3.85 Cr", speed: "312 km/h", power: "525 HP", gearbox: "7-Speed PDK" },
  { name: "NISSAN R34 LEGACY", logo: "Pictures/nissanLogo.png", model: 'Car3Dmodels/R34.glb', price: "₹1.10 Cr", speed: "285 km/h", power: "650 HP", gearbox: "6-Speed Manual" },
  { name: "SRT HELLCAT REVENANT", logo: "Pictures/dodgeLogo.png", model: 'Car3Dmodels/srt.glb', price: "₹1.20 Cr", speed: "327 km/h", power: "807 HP", gearbox: "8-Speed Auto" }
];

const preloadedModels = {};

function preloadRemainingCars() {
  carData.forEach((data, index) => {
    if (index === 0) return; // Already loading/loaded
    loader.load(data.model, (gltf) => {
      preloadedModels[index] = gltf.scene;
    });
  });
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (child.material.map) child.material.map.dispose();
      if (child.material.envMap) child.material.envMap.dispose();
      child.material.dispose();
    }
  });
}

function loadCar(index) {
  const currentRotation = carAnchor.rotation.y;
  while(carAnchor.children.length > 0){ 
    const child = carAnchor.children[0];
    // Don't dispose if it's one of our preloaded templates
    const isPreloaded = Object.values(preloadedModels).includes(child);
    if (!isPreloaded) disposeObject(child);
    carAnchor.remove(child); 
  }
  
  const data = carData[index];
  document.getElementById('carName').innerText = data.name;
  document.getElementById('carLogo').src = data.logo;
  document.getElementById("specPrice").innerText = data.price;
  document.getElementById("specSpeed").innerText = data.speed;
  document.getElementById("specPower").innerText = data.power;
  document.getElementById("specGearbox").innerText = data.gearbox;

  if (preloadedModels[index]) {
    setupCarModel(preloadedModels[index], currentRotation);
  } else {
    loader.load(data.model, (gltf) => {
      setupCarModel(gltf.scene, currentRotation);
      if (index === 0) preloadRemainingCars();
    });
  }
}

function setupCarModel(model, currentRotation) {
  object = model;
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const carScaleFactor = (window.innerWidth < 768 ? 7.2 : 6.5);
  const scale = carScaleFactor / maxDim;
  object.scale.setScalar(scale);
  const bottomY = center.y - (size.y / 2);
  object.position.set(-center.x * scale, (-bottomY * scale), -center.z * scale);
  carAnchor.add(object);
  carAnchor.rotation.y = currentRotation;

  object.traverse((child) => {
    if (child.isMesh) {
      child.material.envMapIntensity = 2.5;
    }
  });

  controls.target.set(0, 0.5, 0); 
  lockZoom();
}

function lockZoom() {
    const aspect = camera.aspect;
    const fovRad = (camera.fov * Math.PI) / 180;
    const carSize = (window.innerWidth < 768 ? 7.2 : 6.5);
    const zoomFactor = 0.8;
    const distance = carSize / (2 * Math.tan(fovRad / 2) * (aspect < 1 ? aspect : 1.2) * zoomFactor);
    const finalDistance = Math.max(distance, window.innerWidth < 768 ? 15 : 12);
    
    controls.minDistance = finalDistance;
    controls.maxDistance = finalDistance;

    // ISOMETRIC VIEW: Set camera to a corner (45 degrees)
    const isoAngle = finalDistance / Math.sqrt(2);
    camera.position.set(isoAngle, isoAngle * 0.5, isoAngle); 
    
    controls.update();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Animate 2026 Effects
  if (typeof techRings !== 'undefined') {
    techRings.children.forEach((ring, index) => {
      ring.rotation.z += 0.002 * (index + 1);
    });
  }
  if (typeof particlesMesh !== 'undefined') {
    particlesMesh.rotation.y += 0.001;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('mousemove', (e) => {
  const rect = canvasform.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  if (object) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(object, true);
    canvasform.style.cursor = intersects.length > 0 ? 'grab' : 'default';
  }
});

window.addEventListener('resize', () => {
  width = canvasform.offsetWidth;
  height = canvasform.offsetHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  lockZoom();
});

let carIndex = 0;
document.getElementById('nextCar').addEventListener('click', () => {
  carIndex = (carIndex + 1) % carData.length;
  loadCar(carIndex);
});

document.getElementById('prevCar').addEventListener('click', () => {
  carIndex = (carIndex - 1 + carData.length) % carData.length;
  loadCar(carIndex);
});

loadCar(0);
