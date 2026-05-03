import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import gsap from "gsap";
import Lenis from "lenis";

THREE.Cache.enabled = true;

// --- LENIS SMOOTH SCROLL ---
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const canvasform = document.getElementById("dCanvas");
let width = canvasform.offsetWidth;
let height = canvasform.offsetHeight;

const scene = new THREE.Scene();
// Scene background is now handled by CSS gradient

const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
  precision: "mediump",
});
renderer.setSize(width, height);
renderer.setPixelRatio(
  window.innerWidth < 768 ? 1.0 : Math.min(window.devicePixelRatio, 1.5),
);
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
  MIDDLE: THREE.MOUSE.DOLLY,
};

// --- HERO SPOTLIGHT ENVIRONMENT ---
const isMobile = window.innerWidth < 768;

// Ambient light to ensure the car isn't completely pitch black in shadows
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

// Single Hero Spotlight above the car
const heroLight = new THREE.SpotLight(0xffffff, 250);
heroLight.position.set(0, 15, 0);
heroLight.angle = Math.PI / 4;
heroLight.penumbra = 0.6;
heroLight.decay = 1.5;
scene.add(heroLight);

const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader().load(
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
  (texture) => {
    scene.environment = pmrem.fromEquirectangular(texture).texture;
    texture.dispose();
  },
);

// Camera Constraints
controls.minDistance = 12;
controls.maxDistance = 16;
// Lock vertical tilt (polar angle) to prevent Y-axis rotation
const fixedPolarAngle = Math.PI / 2.2;
controls.minPolarAngle = fixedPolarAngle;
controls.maxPolarAngle = fixedPolarAngle;

// SAFETY FALLBACK: Hide loader after 10 seconds no matter what
setTimeout(() => {
  if (loaderOverlay && !loaderOverlay.classList.contains("loader-hidden")) {
    console.warn("Loading taking too long, forcing loader hide");
    loaderOverlay.classList.add("loader-hidden");
  }
}, 10000);

const carAnchor = new THREE.Group();
scene.add(carAnchor);

let object;
const loadingManager = new THREE.LoadingManager();
const progressFill = document.getElementById("progress");
const loaderOverlay = document.getElementById("loader");

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  if (progressFill) progressFill.style.width = progress + "%";
};

loadingManager.onLoad = () => {
  setTimeout(() => {
    if (loaderOverlay) loaderOverlay.classList.add("loader-hidden");
  }, 500);
};

loadingManager.onError = (url) => {
  console.error("There was an error loading " + url);
  setTimeout(() => {
    if (loaderOverlay) loaderOverlay.classList.add("loader-hidden");
  }, 1000);
};

const loader = new GLTFLoader(loadingManager);
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);
loader.setDRACOLoader(dracoLoader);

const carData = [
  {
    name: "BMW M5 EV",
    logo: "Pictures/bmwLogo.png",
    model: "Car3Dmodels/bmw.glb",
    price: "₹2.25 Cr",
    speed: "320 km/h",
    power: "1135 HP",
    gearbox: "9-Speed Auto",
  },
  {
    name: "LAMBO REVUELTO",
    logo: "Pictures/lamborghiniLogo.png",
    model: "Car3Dmodels/lamborghini.glb",
    price: "₹9.50 Cr",
    speed: "350 km/h",
    power: "1015 HP",
    gearbox: "8-Speed DCT",
  },
  {
    name: "PORSCHE GT3 RS",
    logo: "Pictures/porscheLogo.png",
    model: "Car3Dmodels/porsche.glb",
    price: "₹3.85 Cr",
    speed: "312 km/h",
    power: "525 HP",
    gearbox: "7-Speed PDK",
  },
  {
    name: "NISSAN R34 LEGACY",
    logo: "Pictures/nissanLogo.png",
    model: "Car3Dmodels/R34.glb",
    price: "₹1.10 Cr",
    speed: "285 km/h",
    power: "650 HP",
    gearbox: "6-Speed Manual",
  },
  {
    name: "SRT HELLCAT REVENANT",
    logo: "Pictures/dodgeLogo.png",
    model: "Car3Dmodels/srt.glb",
    price: "₹1.20 Cr",
    speed: "327 km/h",
    power: "807 HP",
    gearbox: "8-Speed Auto",
  },
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
  while (carAnchor.children.length > 0) {
    const child = carAnchor.children[0];
    // Don't dispose if it's one of our preloaded templates
    const isPreloaded = Object.values(preloadedModels).includes(child);
    if (!isPreloaded) disposeObject(child);
    carAnchor.remove(child);
  }

  const data = carData[index];
  document.getElementById("carName").innerText = data.name;
  document.getElementById("carLogo").src = data.logo;
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
  // Increased scale factors for bigger car appearance
  const carScaleFactor = window.innerWidth < 768 ? 7.8 : 9.0;
  const scale = carScaleFactor / maxDim;
  object.scale.setScalar(scale);
  const bottomY = center.y - size.y / 2;
  object.position.set(-center.x * scale, -bottomY * scale, -center.z * scale);
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
  const carSize = window.innerWidth < 768 ? 7.2 : 6.5;
  const zoomFactor = 0.8;
  const distance =
    carSize /
    (2 * Math.tan(fovRad / 2) * (aspect < 1 ? aspect : 1.2) * zoomFactor);
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

  renderer.render(scene, camera);
}
animate();

window.addEventListener("mousemove", (e) => {
  const rect = canvasform.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  if (object) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(object, true);
    canvasform.style.cursor = intersects.length > 0 ? "grab" : "default";
  }
});

window.addEventListener("resize", () => {
  width = canvasform.offsetWidth;
  height = canvasform.offsetHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  lockZoom();
});

let carIndex = 0;
document.getElementById("nextCar").addEventListener("click", () => {
  carIndex = (carIndex + 1) % carData.length;
  loadCar(carIndex);
});

document.getElementById("prevCar").addEventListener("click", () => {
  carIndex = (carIndex - 1 + carData.length) % carData.length;
  loadCar(carIndex);
});

// Keyboard Navigation
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    carIndex = (carIndex + 1) % carData.length;
    loadCar(carIndex);
  } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    carIndex = (carIndex - 1 + carData.length) % carData.length;
    loadCar(carIndex);
  }
});

loadCar(0);
