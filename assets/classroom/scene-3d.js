import * as THREE from "./vendor/three.module.min.js";
import { honors, experiment, maker, mathProps } from "./scene-props.js";
import { surfaces } from "./scene-materials.js";
import { environment } from "./scene-environment.js";

const ROOM = { w: 6.0, h: 3.55, d: 7.6 }; // x in [-3, 3], y in [0, 3.55], z in [-3.8, 3.8]
const HALF_W = ROOM.w / 2;
const HALF_D = ROOM.d / 2;
const EDGE_COLOR = 0x24324c;

// Normalized camera targets & positions for each partition view and each object focus.
const VIEW_POSES = {
  overview: {
    pos: [-.8, 2.10, 7.9], target: [.2, 1.50, -.70], fov: 53,
    compact: { pos: [-1.7, 2.30, 8.80], target: [0.0, 1.40, -0.55], fov: 52 },
  },
  front: { pos: [0.88, 1.56, 6.25], target: [-0.72, 1.52, -1.95], fov: 45 },
  work: { pos: [-0.14, 1.94, 6.18], target: [0.06, 0.88, 0.80], fov: 46 },
  wall: { pos: [-2.28, 1.80, 1.85], target: [3.00, 1.78, 0.65], fov: 44 },
};

const OBJECT_POSES = {
  entry: {
    pos: [-1.05, 1.86, 2.78], target: [-2.94, 1.86, 2.78], fov: 40,
    compact: { pos: [-0.75, 1.66, 3.26], target: [-2.94, 1.55, 3.26], fov: 46 },
  },
  kiosk: {
    pos: [.35, 1.62, 2.25], target: [-2.64, 1.29, 2.15], fov: 44,
    compact: { pos: [.80, 1.65, 2.75], target: [-2.64, .75, 2.75], fov: 46 },
  },
  experiment: {
    pos: [1.05, 1.75, -1.70], target: [-2.64, 1.06, -1.70], fov: 46,
    compact: { pos: [1.05, 1.22, -0.55], target: [-2.64, 0.56, -0.55], fov: 50 },
  },
  blackboard: {
    pos: [0.92, 1.88, 0.15], target: [0.92, 1.88, -3.77], fov: 42,
    compact: { pos: [-0.35, 1.75, 0.45], target: [-0.35, 1.25, -3.77], fov: 48 },
  },
  math: {
    pos: [-0.42, 1.72, 4.90], target: [0.82, 0.68, 2.52], fov: 38,
    compact: { pos: [0.22, 1.78, 5.15], target: [0.42, 0.35, 2.55], fov: 44 },
  },
  courses: {
    pos: [2.42, 1.76, -1.25], target: [2.42, 1.76, -3.77], fov: 38,
    compact: { pos: [1.95, 1.66, -0.95], target: [1.95, 1.28, -3.77], fov: 44 },
  },
  honors: {
    pos: [-1.72, 1.84, 1.18], target: [3.00, 1.84, 0.90], fov: 44,
    landscape: { pos: [-2.7,1.9,1.8], target: [3,1.4,1.8], fov: 50 },
    compact: { pos: [-2.05, 1.48, -0.15], target: [3.00, 0.05, -0.15], fov: 46 },
  },
  photos: {
    pos: [-0.55, 2.08, 3.22], target: [3.00, 2.08, 3.22], fov: 38,
    compact: { pos: [-0.85, 1.92, 2.74], target: [3.00, 1.48, 2.74], fov: 44 },
  },
  maker: {
    pos: [-0.08, 0.96, 3.68], target: [2.76, 0.76, 3.45], fov: 40,
    compact: { pos: [.4, 1.4, 4.2], target: [2.68, .38, 2.76], fov: 50 },
  },
};

const textureUrl = name => new URL(`materials/${name}`, import.meta.url).href;

const SHARED_EDGE_MATS = new Map();

function addInkEdges(mesh, threshold = 24, opacity = 0.45, color = EDGE_COLOR) {
  const key = `${threshold}|${opacity}|${color}`;
  let mat = SHARED_EDGE_MATS.get(key);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    SHARED_EDGE_MATS.set(key, mat);
  }
  const geo = new THREE.EdgesGeometry(mesh.geometry, threshold);
  const lines = new THREE.LineSegments(geo, mat);
  lines.userData.isEdgeLine = true;
  mesh.add(lines);
  return lines;
}

function makeSolidMat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

function makeCanvasTexture(width, height, drawFn, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  drawFn(canvas.getContext("2d"), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

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
  const sideMat = makeSolidMat(edgeColor);
  const frontMat = makeSolidMat(0xffffff, { map: tex });
  const mats = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mats);
  addInkEdges(mesh, 25, 0.5);
  const trim = new THREE.MeshLambertMaterial({color:edgeColor});
  for (const x of [-width/2,width/2]) {
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.035,height+.035,depth+.018),trim);rail.position.x=x;mesh.add(rail);
  }
  for (const y of [-height/2,height/2]) {
    const rail=new THREE.Mesh(new THREE.BoxGeometry(width,.035,depth+.018),trim);rail.position.y=y;mesh.add(rail);
  }
  return mesh;
}

function createKiosk(textures) {
  const group = new THREE.Group();
  const addBox = (w,h,d,color,x,y,z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));
    m.position.set(x,y,z);group.add(m);addInkEdges(m,25,.22);return m;
  };
  addBox(.66,.075,.46,0x384c65,0,.038,0);
  addBox(.16,.98,.12,0x425c73,0,.56,-.025);
  addBox(1.42,.86,.10,0x68dcba,0,1.39,0);
  addBox(1.33,.77,.018,0x23394d,0,1.39,.058);
  // The active display is exactly 16:9. The square logo is contained, never stretched.
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.28,.72),makeSolidMat(0xffffff));
  display.position.set(0,1.39,.069);group.add(display);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(.64,.64),makeSolidMat(0xffffff,{map:textures['logo-2025.webp']}));
  logo.position.set(-.29,1.39,.071);group.add(logo);
  const title = makeCanvasTexture(560,640,(c,w,h)=>{
    c.fillStyle='#ffffff';c.fillRect(0,0,w,h);c.fillStyle='#244e65';c.textAlign='center';c.font='bold 53px sans-serif';c.fillText('平興數資',w/2,225);
    c.fillStyle='#729789';c.font='25px sans-serif';c.fillText('GIFTED CLASS',w/2,285);
    c.fillStyle='#d8a329';c.fillRect(140,330,280,4);c.fillStyle='#355c6a';c.font='29px sans-serif';c.fillText('探索・實作・創造',w/2,405);
  });
  const lettering=new THREE.Mesh(new THREE.PlaneGeometry(.56,.64),makeSolidMat(0xffffff,{map:title}));lettering.position.set(.33,1.39,.071);group.add(lettering);
  addBox(.13,.018,.006,0x2f5d62,0,.985,.054);
  group.position.set(-2.64,0,2.75);group.rotation.y=Math.PI/2-.34;return group;
}

function createPodium() {
  const group = new THREE.Group();
  const oakTex = makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#c98b55";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b87944";
    for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 2);
    ctx.strokeStyle = "#342725";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
  const oakMat = makeSolidMat(0xffffff, { map: oakTex });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.54), oakMat);
  body.position.set(0, 0.46, 0);
  addInkEdges(body, 25, 0.45);
  group.add(body);

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.60), makeSolidMat(0xdca06a));
  top.position.set(0, 0.94, 0);
  addInkEdges(top, 25, 0.45);
  group.add(top);

  // Computer monitor & pencil cup on podium
  const monBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.14), makeSolidMat(0x3a4760));
  monBase.position.set(-0.12, 0.985, 0);
  const monNeck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.04), makeSolidMat(0x2a3548));
  monNeck.position.set(-0.12, 1.05, -0.02);
  const monScreen = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.04), makeSolidMat(0x232d40));
  monScreen.position.set(-0.12, 1.18, 0);
  addInkEdges(monScreen, 25, 0.6);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.10, 8), makeSolidMat(0x52c4a0));
  cup.position.set(0.28, 1.02, 0.06);
  addInkEdges(cup, 25, 0.45);
  group.add(monBase, monNeck, monScreen, cup);

  group.position.set(-2.22, 0, -3.28);
  group.rotation.y = 0.28;
  return group;
}

function createDiscussionTable() {
  const group = new THREE.Group();
  const radiusOuter = .96;
  const radiusInner = .40;

  // Hollow octagonal tabletop extruded from 2D Shape
  const outerShape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * radiusOuter;
    const py = Math.sin(a) * radiusOuter;
    if (i === 0) outerShape.moveTo(px, py); else outerShape.lineTo(px, py);
  }
  outerShape.closePath();
  const holePath = new THREE.Path();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * radiusInner;
    const py = Math.sin(a) * radiusInner;
    if (i === 0) holePath.moveTo(px, py); else holePath.lineTo(px, py);
  }
  holePath.closePath();
  outerShape.holes.push(holePath);

  const topGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.055, bevelEnabled: false });
  topGeo.rotateX(-Math.PI / 2);
  const topMesh = new THREE.Mesh(topGeo, [makeSolidMat(0x7be8be), makeSolidMat(0xb97c46)]);
  topMesh.position.y = 0.72;
  addInkEdges(topMesh, 22, 0.45);
  group.add(topMesh);

  // Wooden legs & wooden chairs spaced around the octagon
  const legMat = makeSolidMat(0xb67a44);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), legMat);
    leg.position.set(Math.cos(a) * 0.80, 0.36, Math.sin(a) * 0.80);
    addInkEdges(leg, 25, 0.4);
    group.add(leg);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.25;
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.34), makeSolidMat(0xc4864f));
    seat.position.y = 0.44;
    addInkEdges(seat, 25, 0.45);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.045), makeSolidMat(0xb67741));
    back.position.set(0, 0.65, 0.15);
    addInkEdges(back, 25, 0.45);
    chair.add(seat, back);
    for (const lx of [-0.14, 0.14]) {
      for (const lz of [-0.13, 0.13]) {
        const cl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.04), legMat);
        cl.position.set(lx, 0.22, lz);
        chair.add(cl);
      }
    }
    chair.position.set(Math.cos(a) * 1.09, 0, Math.sin(a) * 1.09);
    chair.rotation.y = -a + Math.PI / 2;
    group.add(chair);
  }

  group.position.set(-0.08, 0, -1.55);
  return group;
}

function createMathTable(textures) {
  const group = new THREE.Group();
  const radius = 1.02;
  const tableY = 0.72;

  // White hexagonal tabletop + slate beveled rim
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.03, radius, 0.06, 6), makeSolidMat(0xc9935c));
  rim.position.y = tableY - 0.03;
  addInkEdges(rim, 22, 0.5);
  group.add(rim);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.02, 6), makeSolidMat(0xf4f8ff));
  top.position.y = tableY;
  addInkEdges(top, 22, 0.4);
  group.add(top);

  // 6 oak table legs + 6 mint-cushion stools around the hexagon
  const oakMat = makeSolidMat(0xc5854f);
  const cushionMat = makeSolidMat(0x5fd9ae);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.075, tableY - 0.04, 0.075), oakMat);
    leg.position.set(Math.cos(a) * (radius - 0.14), (tableY - 0.04) / 2, Math.sin(a) * (radius - 0.14));
    addInkEdges(leg, 25, 0.45);
    group.add(leg);

    const sa = a + Math.PI / 6;
    const stool = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.21, 0.06, 14), cushionMat);
    pad.position.y = 0.44;
    addInkEdges(pad, 28, 0.4);
    const seatRing = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.20, 0.04, 14), oakMat);
    seatRing.position.y = 0.40;
    stool.add(pad, seatRing);
    for (let k = 0; k < 4; k++) {
      const la = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.40, 0.04), oakMat);
      sl.position.set(Math.cos(la) * 0.13, 0.20, Math.sin(la) * 0.13);
      addInkEdges(sl, 25, 0.35);
      stool.add(sl);
    }
    stool.position.set(Math.cos(sa) * 1.15, 0, Math.sin(sa) * 1.15);
    group.add(stool);
  }

  mathProps(group, tableY);

  group.position.set(0.42, 0, 2.55);
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
  scene.background = new THREE.Color(0x10182a);
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0xb0c3d0, 2.2));
  const propLight = new THREE.DirectionalLight(0xfff2de, 1.5);
  propLight.position.set(-3, 6, 4);
  scene.add(propLight);

  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 45);
  const textures = { ...surfaces(), ...loadTextures(renderer, [
    "solar-system.webp", "logo-2025.webp",
  ], allLoaded => {
    if (allLoaded) canvas.dataset.ready = "true";
    requestRender();
  }) };

  environment(scene, textures);
  scene.add(createDiscussionTable());
  scene.add(createPodium());

  // Build interactive 3D object groups mapped to object IDs
  const interactiveGroups = {
    entry: (() => {
      const g = createWallBoard(textures["entry-sign.webp"], 0.42, 0.84, 0.04, 0x263759);
      g.rotation.y = Math.PI / 2;
      g.position.set(-HALF_W + 0.09, 1.92, 3.26);
      return g;
    })(),
    kiosk: createKiosk(textures),
    experiment: experiment(),
    blackboard: (() => {
      const g = new THREE.Group();
      const board = createWallBoard(textures["blackboard.webp"], 2.66, 1.48, 0.05, 0x9aaec4);
      g.add(board);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.045, 0.11), makeSolidMat(0x9fb2c7));
      tray.position.set(0, -0.73, 0.045);
      addInkEdges(tray, 25, 0.45);
      g.add(tray);
      for (const [x,color] of [[-.75,0xe9bb68],[.0,0xf7f2d9],[.38,0x81cfdf]]) {
        const chalk=new THREE.Mesh(new THREE.BoxGeometry(.22,.035,.035),makeSolidMat(color));chalk.position.set(x,-.69,.07);g.add(chalk);
      }
      g.position.set(-0.35, 1.88, -HALF_D + 0.03);
      return g;
    })(),
    math: createMathTable(textures),
    courses: (() => {
      const g = createWallBoard(textures["courses-board.webp"], 1.24, 1.02, 0.045, 0x5cc5b0);
      g.position.set(1.95, 1.76, -HALF_D + 0.025);
      return g;
    })(),
    honors: honors(),
    photos: (() => {
      const g = createWallBoard(textures["photos-board.webp"], 1.76, 1.18, 0.045, 0x9ecbf0);
      g.rotation.y = -Math.PI / 2;
      g.position.set(HALF_W - 0.025, 2.08, 2.74);
      return g;
    })(),
    maker: maker(),
  };

  const boundsById = {};
  const centerOffsets = {
    entry: [0, 0, 0],
    kiosk: [0, 1.22, 0],
    experiment: [0, 0.88, 0],
    blackboard: [0, 0, 0],
    math: [0, 0.56, 0],
    courses: [0, 0, 0],
    honors: [0, 0, 0],
    photos: [0, 0, 0],
    maker: [0, 0.72, 0],
  };

  for (const [id, group] of Object.entries(interactiveGroups)) {
    scene.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    boundsById[id] = { box, group, center: new THREE.Vector3(...centerOffsets[id]).applyMatrix4(group.matrixWorld) };
  }

  // Camera state & pointer parallax (Render-on-Demand)
  let currentPos = new THREE.Vector3(...VIEW_POSES.overview.pos);
  let currentTarget = new THREE.Vector3(...VIEW_POSES.overview.target);
  let currentFov = VIEW_POSES.overview.fov;

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
    if (canvas.width !== Math.round(width * renderer.getPixelRatio()) ||
        canvas.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
    }

    camera.aspect = aspect;
    camera.fov = computeAdjustedFov(currentFov, aspect);
    camera.updateProjectionMatrix();

    // Apply subtle 3D eye offset along camera local right/up axes for genuine parallax depth
    const lookDir = new THREE.Vector3().subVectors(currentTarget, currentPos).normalize();
    const rightAxis = new THREE.Vector3().crossVectors(lookDir, camera.up).normalize();
    const upAxis = new THREE.Vector3().crossVectors(rightAxis, lookDir).normalize();
    const shiftedPos = currentPos.clone()
      .addScaledVector(rightAxis, pointerOffset.x * 0.14)
      .addScaledVector(upAxis, pointerOffset.y * 0.08);

    camera.position.copy(shiftedPos);
    camera.lookAt(currentTarget);
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);

    if (hotspotUpdater) hotspotUpdater(projectAll(width, height));
  }

  function step(now) {
    frame = 0;
    let keepGoing = false;
    let arrivedDone = null;

    if (tween) {
      const raw = tween.duration > 0 ? Math.min(1, Math.max(0, (now - tween.start) / tween.duration)) : 1;
      // Smooth quintic cubic-bezier feel matching classroom.js easing
      const t = raw < 1 ? 1 - Math.pow(1 - raw, 3) : 1;
      currentPos.lerpVectors(tween.fromPos, tween.toPos, t);
      currentTarget.lerpVectors(tween.fromTarget, tween.toTarget, t);
      currentFov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, t);

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
            if (corner.z < 1) inFront = true;
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
      out[object.id] = {
        visible: inFront && cProj.z < 1 && boxW > 12 && boxH > 12,
        left: clLeft,
        top: clTop,
        width: boxW,
        height: boxH,
        depth: cProj.z,
        titleX: boxW > 0 ? THREE.MathUtils.clamp((cx - clLeft) / boxW * 100, 18, 82) : 50,
        titleY: boxH > 0 ? THREE.MathUtils.clamp((cy - clTop) / boxH * 100, 18, 82) : 50,
      };
    }
    return out;
  }

  return {
    setPose(view, objectId, isCompact, duration = 0, onArrival = null) {
      const pose = getPose(view, objectId, isCompact);
      const toPos = new THREE.Vector3(...pose.pos);
      const toTarget = new THREE.Vector3(...pose.target);
      const toFov = pose.fov;

      if (duration <= 0) {
        tween = null;
        currentPos.copy(toPos);
        currentTarget.copy(toTarget);
        currentFov = toFov;
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
        toPos,
        toTarget,
        toFov,
        onArrival,
      };
      requestRender();
    },

    setPointerDrift(nx, ny) {
      if (tween) return;
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
