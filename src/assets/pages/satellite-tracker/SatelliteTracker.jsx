// SatelliteTracker.jsx — Live Satellite Tracker v1.0
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './SatelliteTracker.css';
import MiniMap from './MiniMap';
import SignalGraph from './SignalGraph';

/* ─── helpers ─── */
const fmt = (n, d = 4) => Number(n).toFixed(d);
const fmtInt = (n) => Math.round(n).toLocaleString();

/* ─── ISS "Where the ISS at?" free API ─── */
const ISS_API = 'https://api.wheretheiss.at/v1/satellites/25544';

/* ─── Satellite database (mock constellation) ─── */
const SATELLITES = [
  { id: 'SAT-ALPHA-1', issId: 25544, color: '#ff3344', orbitColor: '#ff334488' },
  { id: 'SAT-BRAVO-2', issId: 25544, color: '#33ff88', orbitColor: '#33ff8888', offset: { lat: 25, lng: 90 } },
  { id: 'SAT-CHARLIE-3', issId: 25544, color: '#3388ff', orbitColor: '#3388ff88', offset: { lat: -30, lng: -120 } },
  { id: 'SAT-DELTA-4', issId: 25544, color: '#ff8833', orbitColor: '#ff883388', offset: { lat: 15, lng: 45 } },
  { id: 'SAT-ECHO-5', issId: 25544, color: '#cc33ff', orbitColor: '#cc33ff88', offset: { lat: -45, lng: 160 } },
];

/* ─── Convert lat/lng to 3D position on sphere ─── */
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* ─── Generate orbit ring points ─── */
function createOrbitRing(inclination, offset, radius, segments = 128) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle) * Math.sin(inclination * Math.PI / 180);
    const z = radius * Math.sin(angle) * Math.cos(inclination * Math.PI / 180);
    points.push(new THREE.Vector3(x + offset * 0.01, y, z));
  }
  return points;
}

/* ─── Create Earth textures procedurally ─── */
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Dark ocean base
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, 2048, 1024);

  // Simplified continent shapes with realistic positioning
  ctx.fillStyle = '#1a3a2a';
  ctx.strokeStyle = '#2a5a3a';
  ctx.lineWidth = 1.5;

  // Grid lines (graticule)
  ctx.strokeStyle = '#ffffff08';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 36; i++) {
    ctx.beginPath();
    ctx.moveTo((i / 36) * 2048, 0);
    ctx.lineTo((i / 36) * 2048, 1024);
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (i / 18) * 1024);
    ctx.lineTo(2048, (i / 18) * 1024);
    ctx.stroke();
  }

  // Continents — simplified polygon approach
  const drawContinent = (points, fill = '#0f2a1a', stroke = '#1a4a2a') => {
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    points.forEach(([x, y], i) => {
      const px = (x + 180) / 360 * 2048;
      const py = (90 - y) / 180 * 1024;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // North America
  drawContinent([
    [-130, 50], [-125, 55], [-120, 60], [-100, 65], [-80, 70], [-60, 65],
    [-55, 50], [-65, 45], [-75, 35], [-80, 25], [-90, 20], [-100, 20],
    [-105, 25], [-115, 30], [-120, 35], [-125, 40], [-130, 50]
  ]);

  // South America
  drawContinent([
    [-80, 10], [-75, 5], [-60, 5], [-50, 0], [-35, -5], [-35, -15],
    [-40, -25], [-50, -30], [-55, -35], [-60, -40], [-65, -50], [-70, -55],
    [-75, -45], [-70, -30], [-75, -20], [-80, -5], [-80, 10]
  ]);

  // Europe
  drawContinent([
    [-10, 55], [0, 60], [10, 65], [25, 70], [35, 65], [40, 60],
    [30, 50], [25, 45], [20, 40], [10, 38], [0, 40], [-10, 45], [-10, 55]
  ]);

  // Africa
  drawContinent([
    [-15, 35], [0, 37], [10, 35], [30, 30], [35, 25], [40, 15],
    [50, 10], [45, 0], [40, -10], [35, -20], [30, -30], [20, -35],
    [15, -30], [10, -20], [5, -10], [0, 0], [-5, 5], [-15, 10],
    [-20, 15], [-18, 25], [-15, 35]
  ]);

  // Asia
  drawContinent([
    [40, 60], [60, 65], [80, 70], [100, 72], [120, 68], [140, 65],
    [150, 60], [145, 55], [135, 50], [130, 45], [125, 38], [120, 30],
    [110, 20], [105, 15], [100, 10], [95, 15], [90, 20], [80, 25],
    [70, 25], [60, 30], [50, 35], [45, 40], [40, 45], [40, 60]
  ]);

  // Australia
  drawContinent([
    [115, -15], [125, -15], [135, -15], [145, -20], [150, -25],
    [152, -30], [148, -35], [140, -38], [130, -35], [120, -30],
    [115, -25], [115, -15]
  ]);

  // Add some city lights (dots)
  const cities = [
    [-74, 40.7], [-118, 34], [-87, 41.9], [0, 51.5], [2.3, 48.9],
    [13.4, 52.5], [37.6, 55.8], [116.4, 39.9], [139.7, 35.7],
    [121.5, 31.2], [77.2, 28.6], [72.9, 19.1], [151.2, -33.9],
    [-43.2, -22.9], [-46.6, -23.5], [31, 30], [36.8, -1.3],
    [28, -26], [106.8, -6.2], [100.5, 13.8], [126.9, 37.6],
    [55.3, 25.3], [44.4, 33.3], [-3.7, 40.4], [12.5, 41.9],
    [23.7, 37.9], [18.1, 59.3], [24.9, 60.2], [-79.4, 43.7],
  ];
  cities.forEach(([lng, lat]) => {
    const px = (lng + 180) / 360 * 2048;
    const py = (90 - lat) / 180 * 1024;
    // Glow
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 8);
    grad.addColorStop(0, 'rgba(255,200,100,0.6)');
    grad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px - 8, py - 8, 16, 16);
    // Dot
    ctx.fillStyle = 'rgba(255,220,150,0.9)';
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  return new THREE.CanvasTexture(canvas);
}

/* ─── Create Earth bump map ─── */
function createEarthBumpMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 1024, 512);

  // Add some noise for terrain
  for (let x = 0; x < 1024; x += 2) {
    for (let y = 0; y < 512; y += 2) {
      const v = Math.random() * 30;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

/* ─── Create atmosphere glow ─── */
function createAtmosphereGlow() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 180, 256, 256, 256);
  grad.addColorStop(0, 'rgba(60,140,255,0)');
  grad.addColorStop(0.7, 'rgba(40,100,200,0.05)');
  grad.addColorStop(0.85, 'rgba(60,140,255,0.15)');
  grad.addColorStop(1, 'rgba(60,140,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

/* ═══════════════════════════════════════════ */
/*          MAIN COMPONENT                     */
/* ═══════════════════════════════════════════ */
export default function SatelliteTracker() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const satelliteMarkersRef = useRef([]);
  const animFrameRef = useRef(null);

  /* telemetry state */
  const [telemetry, setTelemetry] = useState({
    lat: 0, lng: 0, alt: 420, vel: 27600, vis: 'daylight'
  });
  const [currentSatIndex, setCurrentSatIndex] = useState(0);
  const [showOrbit, setShowOrbit] = useState(true);
  const [showGround, setShowGround] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [signalHistory, setSignalHistory] = useState(Array(60).fill(50));
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [uptime, setUptime] = useState(0);

  const currentSat = SATELLITES[currentSatIndex];

  /* ─── Fetch live ISS data ─── */
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch(ISS_API);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const sat = SATELLITES[currentSatIndex];
      const offsetLat = sat.offset?.lat || 0;
      const offsetLng = sat.offset?.lng || 0;

      setTelemetry({
        lat: data.latitude + offsetLat,
        lng: data.longitude + offsetLng,
        alt: data.altitude,
        vel: data.velocity,
        vis: data.visibility,
      });
      setConnectionStatus('CONNECTED');

      // Update signal strength (based on altitude variation)
      setSignalHistory(prev => {
        const next = [...prev.slice(1)];
        const sig = 60 + Math.sin(Date.now() / 2000) * 20 + (Math.random() - 0.5) * 15;
        next.push(Math.max(10, Math.min(95, sig)));
        return next;
      });
    } catch {
      // Fallback mock data
      setTelemetry(prev => ({
        lat: prev.lat + (Math.random() - 0.48) * 0.5,
        lng: prev.lng + 0.15 + (Math.random() - 0.5) * 0.1,
        alt: 420 + Math.sin(Date.now() / 10000) * 15,
        vel: 27600 + Math.sin(Date.now() / 8000) * 200,
        vis: 'daylight',
      }));
      setConnectionStatus('SIMULATED');

      setSignalHistory(prev => {
        const next = [...prev.slice(1)];
        const sig = 55 + Math.sin(Date.now() / 1500) * 25 + (Math.random() - 0.5) * 10;
        next.push(Math.max(10, Math.min(95, sig)));
        return next;
      });
    }
  }, [currentSatIndex]);

  /* ─── Three.js Scene Setup ─── */
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.enablePan = true;
    controlsRef.current = controls;

    // ── Starfield ──
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 6000;
    const starPositions = new Float32Array(starsCount * 3);
    const starSizes = new Float32Array(starsCount);
    for (let i = 0; i < starsCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 200;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      starSizes[i] = Math.random() * 1.5 + 0.3;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starsGeo, starMat);
    scene.add(stars);

    // ── Earth ──
    const earthGeom = new THREE.SphereGeometry(1.5, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: createEarthTexture(),
      bumpMap: createEarthBumpMap(),
      bumpScale: 0.02,
      specular: new THREE.Color(0x222222),
      shininess: 15,
    });
    const earth = new THREE.Mesh(earthGeom, earthMat);
    scene.add(earth);

    // ── Atmosphere ──
    const atmosGeom = new THREE.SphereGeometry(1.56, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      map: createAtmosphereGlow(),
      transparent: true,
      opacity: 0.3,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosGeom, atmosMat);
    scene.add(atmosphere);

    // Outer glow ring
    const glowGeom = new THREE.SphereGeometry(1.62, 64, 64);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    scene.add(glow);

    // ── Orbit rings ──
    const orbitGroup = new THREE.Group();
    orbitGroup.name = 'orbits';
    SATELLITES.forEach((sat, i) => {
      const inclination = 51.6 + i * 12;
      const orbitRadius = 1.65 + i * 0.04;
      const pts = createOrbitRing(inclination, i * 30, orbitRadius);
      const orbitGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const orbitMat = new THREE.LineBasicMaterial({
        color: sat.orbitColor.slice(0, 7),
        transparent: true,
        opacity: 0.35,
        linewidth: 1,
      });
      const orbitLine = new THREE.Line(orbitGeom, orbitMat);
      orbitLine.rotation.y = (i * 72) * Math.PI / 180;
      orbitGroup.add(orbitLine);
    });
    scene.add(orbitGroup);

    // ── Satellite markers ──
    const markers = [];
    SATELLITES.forEach((sat) => {
      // Marker group
      const markerGroup = new THREE.Group();
      markerGroup.name = sat.id;

      // Pin sphere (neon glow)
      const pinGeom = new THREE.SphereGeometry(0.035, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({
        color: sat.color,
        transparent: true,
        opacity: 0.95,
      });
      const pin = new THREE.Mesh(pinGeom, pinMat);
      markerGroup.add(pin);

      // Glow sphere
      const glowPinGeom = new THREE.SphereGeometry(0.06, 16, 16);
      const glowPinMat = new THREE.MeshBasicMaterial({
        color: sat.color,
        transparent: true,
        opacity: 0.25,
      });
      const glowPin = new THREE.Mesh(glowPinGeom, glowPinMat);
      markerGroup.add(glowPin);

      // Pulse ring
      const ringGeom = new THREE.RingGeometry(0.045, 0.06, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: sat.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.lookAt(camera.position);
      markerGroup.add(ring);

      scene.add(markerGroup);
      markers.push({ group: markerGroup, pin, glowPin, ring, data: sat });
    });
    satelliteMarkersRef.current = markers;

    // ── Lights ──
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    backLight.position.set(-5, -3, -5);
    scene.add(backLight);

    // ── Animation loop ──
    const clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      controls.update();

      // Subtle star twinkle
      starMat.opacity = 0.6 + Math.sin(elapsed * 0.5) * 0.2;

      // Earth slow rotation
      earth.rotation.y += 0.0003;
      atmosphere.rotation.y += 0.0004;

      // Pulse satellite markers
      markers.forEach((m) => {
        const pulse = Math.sin(elapsed * 3) * 0.5 + 0.5;
        m.glowPin.scale.setScalar(1 + pulse * 0.5);
        m.glowPin.material.opacity = 0.15 + pulse * 0.15;
        m.ring.scale.setScalar(1 + pulse * 0.4);
        m.ring.material.opacity = 0.3 * (1 - pulse * 0.6);
        m.ring.lookAt(camera.position);
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* ─── Update satellite marker positions from telemetry ─── */
  useEffect(() => {
    if (!satelliteMarkersRef.current.length) return;

    SATELLITES.forEach((sat, i) => {
      const marker = satelliteMarkersRef.current[i];
      if (!marker) return;

      const offsetLat = sat.offset?.lat || 0;
      const offsetLng = sat.offset?.lng || 0;
      const lat = telemetry.lat - (SATELLITES[currentSatIndex].offset?.lat || 0) + offsetLat;
      const lng = telemetry.lng - (SATELLITES[currentSatIndex].offset?.lng || 0) + offsetLng;
      const pos = latLngToVector3(lat, lng, 1.55 + i * 0.03);

      marker.group.position.copy(pos);
    });
  }, [telemetry, currentSatIndex]);

  /* ─── Toggle orbit visibility ─── */
  useEffect(() => {
    if (!sceneRef.current) return;
    const orbits = sceneRef.current.getObjectByName('orbits');
    if (orbits) orbits.visible = showOrbit;
  }, [showOrbit]);

  /* ─── Auto-rotate toggle ─── */
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  /* ─── Live data polling ─── */
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  /* ─── Uptime counter ─── */
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Fullscreen ─── */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /* ─── Navigate satellites ─── */
  const prevSat = () => setCurrentSatIndex(i => (i - 1 + SATELLITES.length) % SATELLITES.length);
  const nextSat = () => setCurrentSatIndex(i => (i + 1) % SATELLITES.length);

  /* ─── Format uptime ─── */
  const formatUptime = (sec) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="st-container">
      {/* ── 3D Globe ── */}
      <div className="st-globe" ref={mountRef} />

      {/* ── Overlay HUD Elements ── */}
      <div className="st-hud-top-left">
        <div className="st-hud-item">
          <span className="st-hud-label">SYS STATUS</span>
          <span className={`st-hud-value st-status-${connectionStatus.toLowerCase()}`}>
            <span className="st-status-dot" /> {connectionStatus}
          </span>
        </div>
        <div className="st-hud-item">
          <span className="st-hud-label">UPTIME</span>
          <span className="st-hud-value">{formatUptime(uptime)}</span>
        </div>
      </div>

      <div className="st-hud-bottom-left">
        <span className="st-hud-watermark">ORBITAL COMMAND CENTER</span>
        <span className="st-hud-build">BUILD 2026.07 | UNCLASSIFIED</span>
      </div>

      {/* ── Panel Dashboard (Right Side) ── */}
      <div className="st-panel">
        {/* Header */}
        <div className="st-panel-header">
          <div className="st-panel-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" strokeDasharray="3 3" />
            </svg>
          </div>
          <div>
            <h1 className="st-panel-title">LIVE SATELLITE TRACKER</h1>
            <span className="st-panel-version">v1.0</span>
          </div>
        </div>

        <div className="st-divider" />

        {/* Current Target */}
        <div className="st-target-box">
          <div className="st-target-label">CURRENT TARGET</div>
          <div className="st-target-name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" className="st-target-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span style={{ color: currentSat.color }}>{currentSat.id}</span>
          </div>
          <div className="st-target-sat-nav">
            <button className="st-btn st-btn-sm" onClick={prevSat}>◀ PREV</button>
            <span className="st-target-counter">{currentSatIndex + 1} / {SATELLITES.length}</span>
            <button className="st-btn st-btn-sm" onClick={nextSat}>NEXT ▶</button>
          </div>
        </div>

        <div className="st-divider" />

        {/* Telemetry Grid */}
        <div className="st-telemetry-label">TELEMETRY DATA</div>
        <div className="st-telemetry-grid">
          <div className="st-telem-card">
            <span className="st-telem-label">LATITUDE</span>
            <span className="st-telem-value">{fmt(telemetry.lat)}°</span>
            <span className="st-telem-sub">{telemetry.lat >= 0 ? 'NORTH' : 'SOUTH'}</span>
          </div>
          <div className="st-telem-card">
            <span className="st-telem-label">LONGITUDE</span>
            <span className="st-telem-value">{fmt(telemetry.lng)}°</span>
            <span className="st-telem-sub">{telemetry.lng >= 0 ? 'EAST' : 'WEST'}</span>
          </div>
          <div className="st-telem-card">
            <span className="st-telem-label">ALTITUDE</span>
            <span className="st-telem-value">{fmt(telemetry.alt, 1)} km</span>
            <span className="st-telem-sub">ABOVE SEA LVL</span>
          </div>
          <div className="st-telem-card">
            <span className="st-telem-label">VELOCITY</span>
            <span className="st-telem-value">{fmtInt(telemetry.vel)} km/h</span>
            <span className="st-telem-sub">ORBITAL SPEED</span>
          </div>
        </div>

        <div className="st-divider" />

        {/* Mini Map */}
        <div className="st-minimap-label">GROUND POSITION</div>
        <MiniMap lat={telemetry.lat} lng={telemetry.lng} satColor={currentSat.color} />

        <div className="st-divider" />

        {/* Signal Graph */}
        <div className="st-signal-label">SIGNAL STRENGTH</div>
        <SignalGraph data={signalHistory} />

        <div className="st-divider" />

        {/* Control Buttons */}
        <div className="st-controls-label">CONTROLS</div>
        <div className="st-controls-grid">
          <button className={`st-btn ${showOrbit ? 'st-btn-active' : ''}`} onClick={() => setShowOrbit(!showOrbit)}>
            ORBITAL PATH
          </button>
          <button className={`st-btn ${showGround ? 'st-btn-active' : ''}`} onClick={() => setShowGround(!showGround)}>
            GROUND TRACK
          </button>
          <button className={`st-btn ${autoRotate ? 'st-btn-active' : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
            AUTO-ROTATE
          </button>
          <button className="st-btn" onClick={toggleFullscreen}>
            {isFullscreen ? 'EXIT FS' : 'FULLSCREEN'}
          </button>
        </div>
      </div>

      {/* Scanline overlay */}
      <div className="st-scanline" />
    </div>
  );
}
