import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GHOST_THICKNESS, MARKER_SIZE, ROUTE_RADIUS, SHAFT_RADIUS, SLAB_THICKNESS, WALL_HEIGHT } from "./floor3dData.js";

const COLORS = {
  background: 0xeee8db,
  slab: 0xefe8d9,
  activeSlab: 0xfdf8ee,
  ghost: 0xd9d2c2,
  wall: 0xcabfa8,
  route: 0xc0552e,
  start: 0x2e7d46,
  dest: 0xc25e3a,
  transfer: 0x277a8a,
};

export function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

const worldPoint = (x, mapY, height) => new THREE.Vector3(x, height, -mapY);

// 把 2D 楼层数据（floor3dData.buildFloor3DScene）渲染成可旋转缩放的 3D 场景。
export function Floor3DView({ sceneData, onUnavailable }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !sceneData) return;
    if (!canUseWebGL()) {
      setFailed(true);
      onUnavailableRef.current?.();
      return;
    }
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      onUnavailableRef.current?.();
      return;
    }
    setFailed(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    const camera = new THREE.PerspectiveCamera(42, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), 1, 12000);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc3bba6, 1.15));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(700, 1600, 900);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xfff3df, 0.65);
    fillLight.position.set(-800, 900, -700);
    scene.add(fillLight);

    const disposables = [];
    const track = (resource) => { disposables.push(resource); return resource; };
    const material = (options) => track(new THREE.MeshLambertMaterial(options));

    const slabMat = material({ color: COLORS.slab });
    const activeSlabMat = material({ color: COLORS.activeSlab });
    const ghostMat = material({ color: COLORS.ghost, transparent: true, opacity: 0.22, depthWrite: false });
    const wallMat = material({ color: COLORS.wall });
    const routeMat = material({ color: COLORS.route });
    const startMat = material({ color: COLORS.start });
    const destMat = material({ color: COLORS.dest });
    const transferMat = material({ color: COLORS.transfer });
    const shaftMat = material({ color: COLORS.transfer, transparent: true, opacity: 0.72 });

    const shapeOf = (outer, holes = []) => {
      const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
      for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
      return shape;
    };

    const addTube = (points, radius, tubeMaterial) => {
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const length = a.distanceTo(b);
        if (length < 0.05) continue;
        const geometry = track(new THREE.CylinderGeometry(radius, radius, length, 8, 1, false));
        const mesh = new THREE.Mesh(geometry, tubeMaterial);
        mesh.position.copy(a).lerp(b, 0.5);
        mesh.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
        scene.add(mesh);
      }
    };

    // 楼层楼板与店铺墙体（全览模式下全部楼层统一高亮：实体楼板 + 店铺墙体）
    for (const slab of sceneData.slabs) {
      const depth = slab.solid ? SLAB_THICKNESS : GHOST_THICKNESS;
      const slabMaterial = slab.highlight ? activeSlabMat : slab.solid ? slabMat : ghostMat;
      const geometry = track(new THREE.ExtrudeGeometry(shapeOf(slab.outer, slab.holes), { depth, bevelEnabled: false, curveSegments: 1 }));
      const mesh = new THREE.Mesh(geometry, slabMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = slab.y;
      scene.add(mesh);
      if (!slab.walls.length) continue;
      for (const poly of slab.walls) {
        if (poly.length < 3) continue;
        const wallGeometry = track(new THREE.ExtrudeGeometry(shapeOf(poly), { depth: WALL_HEIGHT, bevelEnabled: false, curveSegments: 1 }));
        const wall = new THREE.Mesh(wallGeometry, wallMat);
        wall.rotation.x = -Math.PI / 2;
        wall.position.y = slab.y + SLAB_THICKNESS;
        scene.add(wall);
      }
    }

    // 步行路线（3D 管）
    for (const route of sceneData.routes) {
      const points = route.points.map(([x, mapY]) => worldPoint(x, mapY, route.y));
      addTube(points, ROUTE_RADIUS, routeMat);
      for (const point of points.slice(1, -1)) {
        const geometry = track(new THREE.SphereGeometry(ROUTE_RADIUS * 1.01, 8, 8));
        const mesh = new THREE.Mesh(geometry, routeMat);
        mesh.position.copy(point);
        scene.add(mesh);
      }
    }

    // 换乘电梯竖井
    const markerMatByKind = { start: startMat, dest: destMat, transfer: transferMat };
    for (const shaft of sceneData.shafts) {
      const from = worldPoint(shaft.from[0], shaft.from[2], shaft.from[1]);
      const to = worldPoint(shaft.to[0], shaft.to[2], shaft.to[1]);
      addTube([from, to], SHAFT_RADIUS, shaftMat);
    }

    // 起终点/换乘标记
    for (const marker of sceneData.markers) {
      const markerMaterial = markerMatByKind[marker.kind] || transferMat;
      const geometry = track(new THREE.CylinderGeometry(MARKER_SIZE * 0.62, MARKER_SIZE * 0.62, MARKER_SIZE * 1.8, 16));
      const mesh = new THREE.Mesh(geometry, markerMaterial);
      mesh.position.copy(worldPoint(marker.x, marker.mapY, marker.y + MARKER_SIZE));
      scene.add(mesh);
      const ringGeometry = track(new THREE.RingGeometry(MARKER_SIZE * 1.15, MARKER_SIZE * 1.5, 24));
      const ring = new THREE.Mesh(ringGeometry, markerMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(worldPoint(marker.x, marker.mapY, marker.y + 0.8));
      scene.add(ring);
    }

    // 楼层标签
    const makeLabel = (text) => {
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = 96 * scale;
      canvas.height = 48 * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "rgba(66,60,48,0.92)";
      ctx.font = "700 26px 'Segoe UI','Microsoft YaHei',sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 48, 24);
      const texture = track(new THREE.CanvasTexture(canvas));
      const spriteMaterial = track(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(78, 39, 1);
      return sprite;
    };
    for (const label of sceneData.labels) {
      const sprite = makeLabel(label.floor);
      sprite.position.copy(worldPoint(label.x, label.mapY, label.y));
      scene.add(sprite);
    }

    // 相机取景
    const bounds = sceneData.bounds;
    const center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, (bounds.minH + bounds.maxH) / 2, -((bounds.minY + bounds.maxY) / 2));
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxH - bounds.minH, 320);
    const initialPosition = new THREE.Vector3(center.x + span * 0.58, center.y + span * 0.98, center.z + span * 0.92);
    camera.position.copy(initialPosition);
    camera.lookAt(center);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = span * 0.32;
    controls.maxDistance = span * 3.4;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();
    viewRef.current = {
      reset: () => {
        camera.position.copy(initialPosition);
        controls.target.copy(center);
        controls.update();
      },
    };

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    let reported = false;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      if (!reported) {
        reported = true;
        // 供无头/自动化检查确认场景确实完成了绘制
        host.dataset.renderCalls = String(renderer.info.render.calls);
        host.dataset.sceneObjects = String(scene.children.length);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      for (const resource of disposables) resource?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      viewRef.current = null;
    };
  }, [sceneData]);

  return (
    <div className="floor-3d">
      <div ref={hostRef} className="floor-3d-canvas" role="img" aria-label="3D 楼层导航地图"/>
      {failed && <div className="floor-3d-fallback">当前浏览器不支持 WebGL。</div>}
      {!failed && <div className="floor-3d-hint">拖动旋转 · 滚轮/双指缩放</div>}
      {!failed && <button type="button" className="floor-3d-reset" onClick={() => viewRef.current?.reset()}>重置视角</button>}
    </div>
  );
}
