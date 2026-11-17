import * as THREE from "./vendor/three.module.min.js";
import { honors, bookshelf, experiment, maker, mathProps } from "./scene-props.js";
import { surfaces, PALETTE, celMaterial, basicMaterial, addInkEdges } from "./scene-materials.js";
import { environment } from "./scene-environment.js";

const ROOM = { w: 6.0, h: 3.55, d: 7.6 }; // x in [-3, 3], y in [0, 3.55], z in [-3.8, 3.8]
const HALF_W = ROOM.w / 2;
const HALF_D = ROOM.d / 2;
const ENTRY_BOARD_Z = 2.85;

// Camera positions & targets for overview/zone views and each object focus.
const VIEW_POSES = {
  overview: {
    pos: [-0.65, 2.06, 7.55], target: [0.15, 1.48, -0.65], fov: 50,
    compact: { pos: [-1.45, 2.24, 8.45], target: [0.05, 1.36, -0.55], fov: 52 },
  },
  front: {
    pos: [0.55, 1.68, 6.55], target: [-0.15, 1.54, -2.20], fov: 48,
    compact: { pos: [0.35, 1.68, 6.65], target: [-0.15, 1.44, -2.20], fov: 52 },
  },
  work: {
    pos: [-0.05, 2.06, 7.15], target: [0.02, 0.98, 0.55], fov: 48,
    compact: { pos: [-0.05, 2.18, 7.55], target: [0.02, 0.88, 0.55], fov: 52 },
  },
  wall: {
    pos: [-2.45, 1.82, 1.60], target: [3.00, 1.82, 0.45], fov: 46,
    compact: { pos: [-2.45, 1.72, 1.45], target: [3.00, 1.62, 0.45], fov: 50 },
  },
};

const OBJECT_POSES = {
  entry: {
    pos: [-0.82, 1.84, ENTRY_BOARD_Z - 0.30], target: [-2.96, 1.84, ENTRY_BOARD_Z - 0.43], fov: 42,
    compact: { pos: [-0.45, 1.48, ENTRY_BOARD_Z], target: [-2.96, 0.92, ENTRY_BOARD_Z], fov: 50 },
  },
  experiment: {
    pos: [-0.45, 1.48, -1.55], target: [-2.62, 0.96, -1.78], fov: 48,
    compact: { pos: [-0.35, 1.28, -1.42], target: [-2.62, 0.56, -1.42], fov: 52 },
  },
  blackboard: {
    pos: [0.60, 1.86, 0.15], target: [0.35, 1.86, -3.74], fov: 42,
    compact: { pos: [-0.58, 1.72, 0.55], target: [-0.58, 1.24, -3.74], fov: 48 },
  },
  math: {
    pos: [-0.25, 1.66, 4.35], target: [0.85, 0.68, 1.95], fov: 40,
    compact: { pos: [0.38, 1.72, 4.55], target: [0.38, 0.35, 1.95], fov: 46 },
  },
  courses: {
    pos: [2.32, 1.84, -1.05], target: [2.25, 1.84, -3.74], fov: 40,
    compact: { pos: [1.82, 1.72, -0.85], target: [1.82, 1.32, -3.74], fov: 46 },
  },
  honors: {
    pos: [-1.75, 1.82, 0.40], target: [2.92, 1.82, 0.22], fov: 44,
    landscape: { pos: [-2.45, 1.85, 0.65], target: [2.92, 1.48, 0.50], fov: 48 },
    compact: { pos: [-2.15, 1.52, -0.65], target: [2.92, 0.78, -0.65], fov: 48 },
  },
  bookshelf: {
    pos: [-0.72, 1.36, -0.24], target: [2.72, 0.55, -0.65], fov: 42,
    compact: { pos: [-1.55, 1.50, -0.65], target: [2.72, -1.42, -0.65], fov: 48 },
  },
  photos: {
    pos: [-0.35, 2.02, 2.80], target: [2.92, 2.02, 2.72], fov: 38,
    compact: { pos: [-0.70, 1.86, 2.25], target: [2.92, 1.45, 2.25], fov: 46 },
  },
  maker: {
    pos: [0.68, 1.12, 2.68], target: [2.66, 0.74, 2.58], fov: 46,
    compact: { pos: [0.68, 1.22, 2.25], target: [2.66, 0.42, 2.25], fov: 52 },
  },
};

const textureUrl = name => new URL(`materials/${name}`, import.meta.url).href;

function loadTextures(renderer, names, onUpdate) {
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const map = {};
  let pending = names.length;
  for (const name of names) {
    const finish = () => {
      pending--;
      onUpdate(pending === 0);
    };
    const tex = loader.load(textureUrl(name), finish, undefined, finish);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    map[name] = tex;
  }
  return map;
}

function createWallBoard(tex, width, height, depth, edgeColor) {
  const sideMat = celMaterial(edgeColor);
  const frontMat = basicMaterial(0xffffff, { map: tex });
  const mats = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mats);
  addInkEdges(mesh, 25, 0.42);
  for (const x of [-width / 2, width / 2]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.036, height + 0.036, depth + 0.018),
      celMaterial(edgeColor)
    );
    rail.position.x = x;
    addInkEdges(rail, 25, 0.36);
    mesh.add(rail);
  }
  for (const y of [-height / 2, height / 2]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.036, depth + 0.018),
      celMaterial(edgeColor)
    );
    rail.position.y = y;
    addInkEdges(rail, 25, 0.36);
    mesh.add(rail);
  }
  return mesh;
}

const KIOSK_DISPLAY = { width: 1.02, height: 1.02 * 9 / 16 };

function createKiosk(textures) {
  const group = new THREE.Group();
  const addBox = (w, h, d, color, x, y, z, parent = group) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), celMaterial(color));
    m.position.set(x, y, z);
    addInkEdges(m, 25, 0.36);
    parent.add(m);
    return m;
  };

  // Base stand & slanted support column
  addBox(0.68, 0.065, 0.44, 0x384e66, 0, 0.0325, 0);
  addBox(0.56, 0.035, 0.34, 0x4b6884, 0, 0.08, 0);
  addBox(0.16, 0.68, 0.11, 0x425c73, 0, 0.42, -0.02);

  // Landscape 16:9 interactive screen pivot (compact height so wall board behind stays unobstructed)
  const screenPivot = new THREE.Group();
  screenPivot.position.set(0, 1.04, 0.02);
  screenPivot.rotation.x = -0.22;
  group.add(screenPivot);

  addBox(1.16, 0.72, 0.085, PALETTE.mint, 0, 0, 0, screenPivot);
  addBox(1.07, 0.63, 0.022, 0x1e3348, 0, 0, 0.044, screenPivot);

  // The distant screen shows the class logo.
  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(KIOSK_DISPLAY.width, KIOSK_DISPLAY.height),
    basicMaterial(0xffffff)
  );
  display.position.set(0, 0, 0.056);
  screenPivot.add(display);
  group.userData.display = display;

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.32),
    basicMaterial(0xffffff, { map: textures["logo-2025.webp"], transparent: true })
  );
  logo.position.set(0, 0, 0.058);
  screenPivot.add(logo);

  // Small bottom power/sensor button pill on bezel
  addBox(0.11, 0.016, 0.008, 0x2c5c63, 0, -0.33, 0.045, screenPivot);

  group.position.set(-2.27, 0, 3.65);
  group.rotation.y = 0.98;
  return group;
}

function createPodium() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.90, 0.52), celMaterial(PALETTE.oak));
  body.position.set(0, 0.45, 0);
  addInkEdges(body, 25, 0.42);
  group.add(body);

  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.72, 0.02), celMaterial(PALETTE.oakDark));
  frontPanel.position.set(0, 0.46, 0.265);
  addInkEdges(frontPanel, 25, 0.35);
  group.add(frontPanel);

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.055, 0.58), celMaterial(PALETTE.oakLight));
  top.position.set(0, 0.925, 0);
  addInkEdges(top, 25, 0.42);
  group.add(top);

  const monBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.14), celMaterial(0x3a4760));
  monBase.position.set(-0.12, 0.965, 0);
  const monNeck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.04), celMaterial(0x2a3548));
  monNeck.position.set(-0.12, 1.03, -0.02);
  const monScreen = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.26, 0.04), celMaterial(0x232d40));
  monScreen.position.set(-0.12, 1.16, 0);
  addInkEdges(monScreen, 25, 0.5);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.10, 10), celMaterial(0x52c4a0));
  cup.position.set(0.28, 1.00, 0.06);
  addInkEdges(cup, 25, 0.4);
  group.add(monBase, monNeck, monScreen, cup);

  group.position.set(-2.25, 0, -3.22);
  group.rotation.y = 0.28;
  return group;
}

function createDiscussionTable() {
  const group = new THREE.Group();
  const radiusOuter = 0.92;
  const radiusInner = 0.38;

  const outerShape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * radiusOuter;
    const py = Math.sin(a) * radiusOuter;
    if (i === 0) outerShape.moveTo(px, py);
    else outerShape.lineTo(px, py);
  }
  outerShape.closePath();
  const holePath = new THREE.Path();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * radiusInner;
    const py = Math.sin(a) * radiusInner;
    if (i === 0) holePath.moveTo(px, py);
    else holePath.lineTo(px, py);
  }
  holePath.closePath();
  outerShape.holes.push(holePath);

  const topGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.055, bevelEnabled: false });
  topGeo.rotateX(-Math.PI / 2);
  const topMesh = new THREE.Mesh(topGeo, [celMaterial(0x7be8be), celMaterial(PALETTE.oak)]);
  topMesh.position.y = 0.72;
  addInkEdges(topMesh, 22, 0.42);
  group.add(topMesh);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), celMaterial(PALETTE.oakDark));
    leg.position.set(Math.cos(a) * 0.76, 0.36, Math.sin(a) * 0.76);
    addInkEdges(leg, 25, 0.4);
    group.add(leg);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.25;
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.045, 0.33), celMaterial(PALETTE.oak));
    seat.position.y = 0.44;
    addInkEdges(seat, 25, 0.42);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.38, 0.045), celMaterial(PALETTE.oakDark));
    back.position.set(0, 0.65, 0.145);
    addInkEdges(back, 25, 0.42);
    chair.add(seat, back);
    for (const lx of [-0.135, 0.135]) {
      for (const lz of [-0.125, 0.125]) {
        const cl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.04), celMaterial(PALETTE.oakDark));
        cl.position.set(lx, 0.22, lz);
        addInkEdges(cl, 25, 0.3);
        chair.add(cl);
      }
    }
    chair.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05);
    chair.rotation.y = -a + Math.PI / 2;
    group.add(chair);
  }

  group.position.set(-0.15, 0, -1.15);
  return group;
}

function createMathTable() {
  const group = new THREE.Group();
  const radius = 1.00;
  const tableY = 0.72;

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.03, radius, 0.06, 6),
    celMaterial(PALETTE.oak)
  );
  rim.position.y = tableY - 0.03;
  addInkEdges(rim, 22, 0.45);
  group.add(rim);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.02, 6),
    celMaterial(0xf5f8ff)
  );
  top.position.y = tableY;
  addInkEdges(top, 22, 0.38);
  group.add(top);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.075, tableY - 0.04, 0.075), celMaterial(PALETTE.oak));
    leg.position.set(Math.cos(a) * (radius - 0.14), (tableY - 0.04) / 2, Math.sin(a) * (radius - 0.14));
    addInkEdges(leg, 25, 0.42);
    group.add(leg);

    const sa = a + Math.PI / 6;
    const stool = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.205, 0.06, 14), celMaterial(PALETTE.mint));
    pad.position.y = 0.44;
    addInkEdges(pad, 28, 0.36);
    const seatRing = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.195, 0.04, 14), celMaterial(PALETTE.oak));
    seatRing.position.y = 0.40;
    addInkEdges(seatRing, 28, 0.36);
    stool.add(pad, seatRing);
    for (let k = 0; k < 4; k++) {
      const la = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.40, 0.04), celMaterial(PALETTE.oakDark));
      sl.position.set(Math.cos(la) * 0.125, 0.20, Math.sin(la) * 0.125);
      addInkEdges(sl, 25, 0.35);
      stool.add(sl);
    }
    stool.position.set(Math.cos(sa) * 1.13, 0, Math.sin(sa) * 1.13);
    group.add(stool);
  }

  mathProps(group, tableY);

  group.position.set(0.38, 0, 1.95);
  return group;
}

function getPose(view, objectId, isCompact) {
  if (objectId && OBJECT_POSES[objectId]) {
    const base = OBJECT_POSES[objectId];
    if (window.innerHeight <= 480 && window.innerWidth > 720 && base.landscape) return base.landscape;
    return isCompact && base.compact ? base.compact : base;
  }
  const viewPose = VIEW_POSES[view] ?? VIEW_POSES.overview;
  return isCompact && viewPose.compact ? viewPose.compact : viewPose;
}

function computeAdjustedFov(baseFov, aspect) {
  if (aspect >= 16 / 9) return baseFov;
  const baseRad = THREE.MathUtils.degToRad(baseFov);
  const scale = Math.min(2.65, (16 / 9) / Math.max(0.45, aspect));
  return Math.min(76, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseRad / 2) * scale)));
}

function setGroupHighlight(group, highlighted) {
  const tint = highlighted ? 0xd9fff3 : 0xffffff;
  group.traverse(child => {
    if (!child.isMesh || child.userData.isEdgeLine) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (!mat.userData.baseColor) mat.userData.baseColor = mat.color.clone();
      if (highlighted) {
        mat.color.copy(mat.userData.baseColor).lerp(new THREE.Color(tint), 0.36);
      } else {
        mat.color.copy(mat.userData.baseColor);
      }
    }
  });
}

export function createClassroomScene3D(viewport, objects) {
  const canvas = document.createElement("canvas");
  canvas.className = "scene-3d";
  canvas.setAttribute("aria-hidden", "true");
  viewport.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x142138);
  scene.add(new THREE.HemisphereLight(0xf6f9ff, 0xb8cade, 2.15));
  const propLight = new THREE.DirectionalLight(0xfff3de, 1.45);
  propLight.position.set(-3.5, 5.5, 4.0);
  scene.add(propLight);

  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 45);
  const textures = {
    ...surfaces(),
    ...loadTextures(renderer, [
      "logo-2025.webp",
      "activity-1.jpg",
      "activity-2.jpg",
      "activity-3.jpg",
      "activity-4.jpg",
    ], allLoaded => {
      if (allLoaded) canvas.dataset.ready = "true";
      requestRender();
    }),
  };

  environment(scene, textures);
  scene.add(createDiscussionTable());
  scene.add(createPodium());

  // Build interactive 3D object groups mapped to object IDs
  const interactiveGroups = {
    entry: (() => {
      const g = createWallBoard(textures["entry-sign.webp"], 1.34, 0.94, 0.045, 0x4fc4b0);
      g.rotation.y = Math.PI / 2;
      g.position.set(-HALF_W + 0.04, 1.84, ENTRY_BOARD_Z);
      return g;
    })(),
    kiosk: createKiosk(textures),
    experiment: experiment(),
    blackboard: (() => {
      const g = new THREE.Group();
      const board = createWallBoard(textures["blackboard.webp"], 2.56, 1.44, 0.05, 0x9aaec4);
      g.add(board);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.045, 0.11), celMaterial(0x9fb2c7));
      tray.position.set(0, -0.71, 0.045);
      addInkEdges(tray, 25, 0.42);
      g.add(tray);
      for (const [x, color] of [[-0.75, 0xe9bb68], [0.0, 0xf7f2d9], [0.38, 0x81cfdf]]) {
        const chalk = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.035), celMaterial(color));
        chalk.position.set(x, -0.67, 0.07);
        addInkEdges(chalk, 25, 0.35);
        g.add(chalk);
      }
      g.position.set(-0.58, 1.86, -HALF_D + 0.06);
      return g;
    })(),
    math: createMathTable(),
    courses: (() => {
      const g = new THREE.Group();
      const board = createWallBoard(textures["courses-board.webp"], 1.68, 1.18, 0.045, 0x5cc5b0);
      g.add(board);
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.035, 0.09), celMaterial(0x9fb2c7));
      ledge.position.set(0, -0.58, 0.04);
      addInkEdges(ledge, 25, 0.4);
      g.add(ledge);
      g.position.set(1.82, 1.84, -HALF_D + 0.06);
      return g;
    })(),
    honors: honors(),
    bookshelf: bookshelf(),
    photos: (() => {
      const g = new THREE.Group();
      g.add(createWallBoard(textures["photos-board.webp"], 1.72, 1.04, 0.045, 0x86c0ec));
      const slots = [
        [-0.403, 0.176, "activity-1.jpg"],
        [0.403, 0.176, "activity-2.jpg"],
        [-0.403, -0.275, "activity-3.jpg"],
        [0.403, -0.275, "activity-4.jpg"],
      ];
      for (const [px, py, key] of slots) {
        const photo = new THREE.Mesh(
          new THREE.PlaneGeometry(0.651, 0.366),
          basicMaterial(0xffffff, { map: textures[key] })
        );
        photo.position.set(px, py, 0.025);
        g.add(photo);
      }
      g.rotation.y = -Math.PI / 2;
      g.position.set(HALF_W - 0.08, 2.02, 2.25);
      return g;
    })(),
    maker: maker(),
  };

  const boundsById = {};
  const centerOffsets = {
    entry: [0, 0, 0],
    kiosk: [0, 0.92, 0],
    experiment: [0, 0.82, 0],
    blackboard: [0, 0, 0],
    math: [0, 0.56, 0],
    courses: [0, 0, 0],
    honors: [0, 0, 0],
    bookshelf: [0, 0.57, 0.20],
    photos: [0, 0, 0],
    maker: [0, 0.70, 0],
  };

  for (const [id, group] of Object.entries(interactiveGroups)) {
    scene.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    boundsById[id] = { box, group, center: new THREE.Vector3(...centerOffsets[id]).applyMatrix4(group.matrixWorld) };
  }

  // Camera state & pointer parallax (Render-on-Demand)
  const kioskDisplay = interactiveGroups.kiosk.userData.display;
  let kioskFocused = false;
  let currentPos = new THREE.Vector3(...VIEW_POSES.overview.pos);
  let currentTarget = new THREE.Vector3(...VIEW_POSES.overview.target);
  let currentFov = VIEW_POSES.overview.fov;
  let currentZoom = 1;
  let currentShift = 0;

  let tween = null;
  let pointerOffset = new THREE.Vector2(0, 0);
  let pointerTarget = new THREE.Vector2(0, 0);
  let frame = 0;
  let activeHighlightId = null;
  let hotspotUpdater = null;

  function renderNow() {
    const width = viewport.clientWidth || 1280;
    const height = viewport.clientHeight || 720;
    const aspect = width / Math.max(1, height);
    if (
      canvas.width !== Math.round(width * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(height * renderer.getPixelRatio())
    ) {
      renderer.setSize(width, height, false);
    }

    camera.aspect = aspect;
    camera.fov = computeAdjustedFov(currentFov, aspect);
    camera.zoom = currentZoom;
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -currentShift;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    const lookDir = new THREE.Vector3().subVectors(currentTarget, currentPos).normalize();
    const rightAxis = new THREE.Vector3().crossVectors(lookDir, camera.up).normalize();
    const upAxis = new THREE.Vector3().crossVectors(rightAxis, lookDir).normalize();
    const shiftedPos = currentPos
      .clone()
      .addScaledVector(rightAxis, pointerOffset.x * 0.14)
      .addScaledVector(upAxis, pointerOffset.y * 0.08);

    camera.position.copy(shiftedPos);
    camera.lookAt(currentTarget);
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);

    if (hotspotUpdater) {
      let screen = null;
      if (kioskFocused && !tween) {
        const corner = (x, y) => kioskDisplay.localToWorld(new THREE.Vector3(x, y, 0)).project(camera);
        const tl = corner(-KIOSK_DISPLAY.width / 2, KIOSK_DISPLAY.height / 2);
        const br = corner(KIOSK_DISPLAY.width / 2, -KIOSK_DISPLAY.height / 2);
        screen = {
          left: (1 + tl.x) * width / 2,
          top: (1 - tl.y) * height / 2,
          width: (br.x - tl.x) * width / 2,
          height: (tl.y - br.y) * height / 2,
        };
      }
      hotspotUpdater(projectAll(width, height), screen);
    }
  }

  function step(now) {
    frame = 0;
    let keepGoing = false;
    let arrivedDone = null;

    if (tween) {
      const raw = tween.duration > 0 ? Math.min(1, Math.max(0, (now - tween.start) / tween.duration)) : 1;
      const t = raw < 1 ? 1 - Math.pow(1 - raw, 3) : 1;
      currentPos.lerpVectors(tween.fromPos, tween.toPos, t);
      currentTarget.lerpVectors(tween.fromTarget, tween.toTarget, t);
      currentFov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, t);
      currentZoom = THREE.MathUtils.lerp(tween.fromZoom, tween.toZoom, t);
      currentShift = THREE.MathUtils.lerp(tween.fromShift, tween.toShift, t);

      if (raw >= 1) {
        arrivedDone = tween.onArrival;
        tween = null;
      } else {
        keepGoing = true;
      }
    }

    if (pointerOffset.distanceToSquared(pointerTarget) > 1e-6) {
      pointerOffset.lerp(pointerTarget, 0.22);
      if (pointerOffset.distanceToSquared(pointerTarget) <= 1e-6) pointerOffset.copy(pointerTarget);
      else keepGoing = true;
    }

    renderNow();
    arrivedDone?.();
    if (keepGoing) frame = requestAnimationFrame(step);
  }

  function requestRender() {
    if (!frame) frame = requestAnimationFrame(step);
  }

  function projectAll(width, height) {
    const out = {};
    const corner = new THREE.Vector3();
    for (const object of objects) {
      const entry = boundsById[object.id];
      if (!entry) continue;
      const { box, center } = entry;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let inFront = false;
      for (let ix = 0; ix < 2; ix++) {
        for (let iy = 0; iy < 2; iy++) {
          for (let iz = 0; iz < 2; iz++) {
            corner.set(ix ? box.max.x : box.min.x, iy ? box.max.y : box.min.y, iz ? box.max.z : box.min.z);
            corner.project(camera);
            if (corner.z < -1 || corner.z > 1) continue;
            inFront = true;
            const sx = (corner.x * 0.5 + 0.5) * width;
            const sy = (-corner.y * 0.5 + 0.5) * height;
            if (sx < minX) minX = sx;
            if (sx > maxX) maxX = sx;
            if (sy < minY) minY = sy;
            if (sy > maxY) maxY = sy;
          }
        }
      }
      const cProj = center.clone().project(camera);
      const cx = (cProj.x * 0.5 + 0.5) * width;
      const cy = (-cProj.y * 0.5 + 0.5) * height;
      const clLeft = Math.max(0, minX);
      const clTop = Math.max(0, minY);
      const clRight = Math.min(width, maxX);
      const clBottom = Math.min(height, maxY);
      const boxW = Math.max(0, clRight - clLeft);
      const boxH = Math.max(0, clBottom - clTop);
      let face;
      if (object.id === "math" && boxW > 12 && boxH > 12) {
        // Project only the hexagonal tabletop, excluding stools and empty space.
        const points = Array.from({ length: 6 }, (_, index) => {
          const angle = index * Math.PI / 3;
          corner.set(Math.sin(angle), 0.73, Math.cos(angle));
          corner.applyMatrix4(entry.group.matrixWorld).project(camera);
          const xPct = ((corner.x + 1) * width / 2 - clLeft) / boxW * 100;
          const yPct = ((1 - corner.y) * height / 2 - clTop) / boxH * 100;
          return `${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`;
        });
        face = `polygon(${points.join(", ")})`;
      }
      if (object.id === "bookshelf" && boxW > 12 && boxH > 12) {
        // Use the cabinet front so its hotspot can sit above the table's larger bounds.
        const corners = [[box.max.y, box.min.z], [box.max.y, box.max.z],
          [box.min.y, box.max.z], [box.min.y, box.min.z]];
        face = `polygon(${corners.map(([y, z]) => {
          corner.set(box.min.x, y, z).project(camera);
          const xPct = ((corner.x + 1) * width / 2 - clLeft) / boxW * 100;
          const yPct = ((1 - corner.y) * height / 2 - clTop) / boxH * 100;
          return `${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`;
        }).join(", ")})`;
      }
      out[object.id] = {
        visible: inFront && boxW > 12 && boxH > 12,
        left: clLeft,
        top: clTop,
        width: boxW,
        height: boxH,
        depth: cProj.z,
        face,
        titleX: boxW > 0 ? THREE.MathUtils.clamp(((cx - clLeft) / boxW) * 100, 18, 82) : 50,
        titleY: boxH > 0 ? THREE.MathUtils.clamp(((cy - clTop) / boxH) * 100, 18, 82) : 50,
      };
    }
    return out;
  }

  function fitLeftHalf(box, position, target, fov, aspect) {
    const preview = new THREE.PerspectiveCamera(computeAdjustedFov(fov, aspect), aspect);
    preview.position.copy(position);
    preview.lookAt(target);
    preview.updateMatrixWorld(true);

    const projected = new THREE.Box2();
    const corner = new THREE.Vector3();
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          projected.expandByPoint(corner.set(x, y, z).project(preview));
        }
      }
    }
    const size = projected.getSize(new THREE.Vector2());
    const zoom = Math.min(1, 0.88 / size.x, 1.65 / size.y);
    const center = projected.getCenter(new THREE.Vector2());
    return { zoom, shift: -0.5 - center.x * zoom };
  }

  return {
    setPose(view, objectId, isCompact, duration = 0, onArrival = null) {
      const pose = getPose(view, objectId, isCompact);
      const toPos = new THREE.Vector3(...pose.pos);
      const toTarget = new THREE.Vector3(...pose.target);
      const toFov = objectId === "kiosk" ? 42 : pose.fov;
      const aspect = viewport.clientWidth / Math.max(1, viewport.clientHeight) || 16 / 9;
      const wideDetail = !isCompact && objects.some(object => object.id === objectId && object.wideDetail);
      const { zoom: toZoom, shift: toShift } = wideDetail
        ? fitLeftHalf(boundsById[objectId].box, toPos, toTarget, toFov, aspect)
        : { zoom: 1, shift: 0 };
      kioskFocused = objectId === "kiosk";
      if (kioskFocused) {
        pointerOffset.set(0, 0);
        pointerTarget.set(0, 0);
        const halfFov = THREE.MathUtils.degToRad(computeAdjustedFov(toFov, aspect) / 2);
        const fitHeight = Math.max(KIOSK_DISPLAY.height / 0.70, KIOSK_DISPLAY.width / (0.88 * aspect));
        const distance = fitHeight / (2 * Math.tan(halfFov));
        kioskDisplay.getWorldPosition(toTarget);
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(kioskDisplay.getWorldQuaternion(new THREE.Quaternion()));
        toPos.copy(toTarget).addScaledVector(normal, distance);
      }

      if (duration <= 0) {
        tween = null;
        currentPos.copy(toPos);
        currentTarget.copy(toTarget);
        currentFov = toFov;
        currentZoom = toZoom;
        currentShift = toShift;
        renderNow();
        onArrival?.();
        return;
      }

      tween = {
        start: performance.now(),
        duration,
        fromPos: currentPos.clone(),
        fromTarget: currentTarget.clone(),
        fromFov: currentFov,
        fromZoom: currentZoom,
        fromShift: currentShift,
        toPos,
        toTarget,
        toFov,
        toZoom,
        toShift,
        onArrival,
      };
      requestRender();
    },

    setPointerDrift(nx, ny) {
      if (tween || kioskFocused) return;
      pointerTarget.set(THREE.MathUtils.clamp(nx, -1, 1), THREE.MathUtils.clamp(ny, -1, 1));
      requestRender();
    },

    setHighlighted(id) {
      if (activeHighlightId === id) return;
      if (activeHighlightId && interactiveGroups[activeHighlightId]) {
        setGroupHighlight(interactiveGroups[activeHighlightId], false);
      }
      activeHighlightId = id;
      if (id && interactiveGroups[id]) {
        setGroupHighlight(interactiveGroups[id], true);
      }
      requestRender();
    },

    onHotspotsProject(fn) {
      hotspotUpdater = fn;
    },

    resize() {
      requestRender();
    },
  };
}
