import * as T from "./vendor/three.module.min.js";
import {
  PALETTE,
  celMaterial,
  basicMaterial,
  addInkEdges,
  canvasTexture,
} from "./scene-materials.js";

function mesh(g, geo, color, x = 0, y = 0, z = 0, ink = true) {
  const mat = typeof color === "number" ? celMaterial(color) : color;
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  g.add(m);
  if (ink) addInkEdges(m, 25, 0.36);
  return m;
}

const box = (g, w, h, d, c, x = 0, y = 0, z = 0, ink = true) =>
  mesh(g, new T.BoxGeometry(w, h, d), c, x, y, z, ink);

const cyl = (g, r, h, c, x = 0, y = 0, z = 0, rt = r, ink = false) =>
  mesh(g, new T.CylinderGeometry(rt, r, h, 24), c, x, y, z, ink);

function rod(g, a, b, r, c) {
  const av = new T.Vector3(...a);
  const bv = new T.Vector3(...b);
  const delta = bv.clone().sub(av);
  const m = cyl(g, r, delta.length(), c);
  m.position.copy(av.add(bv).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return m;
}

function graphic(w, h, draw) {
  return basicMaterial(0xffffff, { map: canvasTexture(w, h, draw) });
}

function label(g, text, w, h, x, y, z, bg = "#f5efdf", fg = "#294459") {
  const m = graphic(512, 128, (c, W, H) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    c.fillStyle = fg;
    c.font = "bold 48px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, W / 2, H / 2, W - 30);
  });
  return mesh(g, new T.PlaneGeometry(w, h), m, x, y, z, false);
}

function ring(g, r, t, c, x, y, z) {
  const m = mesh(g, new T.TorusGeometry(r, t, 8, 24), c, x, y, z, false);
  m.rotation.x = Math.PI / 2;
  return m;
}

export function plant(g, x, y, z) {
  const p = new T.Group();
  p.position.set(x, y, z);
  g.add(p);
  cyl(p, 0.075, 0.13, 0xe2a879, 0, 0.065, 0, 0.092, true);
  cyl(p, 0.086, 0.015, 0x6f513b, 0, 0.128, 0, 0.086, false);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const end = [Math.cos(a) * 0.135, 0.19 + (i % 3) * 0.048, Math.sin(a) * 0.115];
    rod(p, [0, 0.125, 0], end, 0.0055, 0x457b5b);
    const leaf = mesh(p, new T.SphereGeometry(1, 10, 8), i % 2 ? 0x65a972 : 0x428761, ...end, false);
    leaf.scale.set(0.065, 0.025, 0.036);
    leaf.rotation.z = a;
  }
}

export function honors() {
  const g = new T.Group();
  const boardW = 3.24;
  const boardH = 1.48;

  // Light gray grooved slatwall backing matching the real PSJH honors wall
  const slatMat = graphic(1024, 512, (c, w, h) => {
    c.fillStyle = "#dce2e8";
    c.fillRect(0, 0, w, h);
    for (let y = 18; y < h; y += 36) {
      c.fillStyle = "rgba(72, 86, 102, 0.36)";
      c.fillRect(0, y, w, 4);
      c.fillStyle = "rgba(255, 255, 255, 0.55)";
      c.fillRect(0, y + 4, w, 2);
    }
  });
  const backing = new T.Mesh(
    new T.BoxGeometry(boardW, boardH, 0.045),
    [
      celMaterial(0x9cb1c4),
      celMaterial(0x9cb1c4),
      celMaterial(0x9cb1c4),
      celMaterial(0x9cb1c4),
      slatMat,
      celMaterial(0x9cb1c4),
    ]
  );
  addInkEdges(backing, 25, 0.42);
  g.add(backing);

  // Slim silver aluminum frame + vertical divider splitting left and right slatwall bays
  for (const y of [-boardH / 2, boardH / 2]) {
    box(g, boardW + 0.06, 0.036, 0.068, 0xbcc8d4, 0, y, 0.018);
  }
  for (const x of [-boardW / 2, -0.34, boardW / 2]) {
    box(g, 0.036, boardH + 0.036, 0.068, 0xbcc8d4, x, 0, 0.018);
  }

  // Arched-top laser-engraved birch plaque geometry
  const pw = 0.42;
  const ph = 0.255;
  const hw = pw / 2;
  const hh = ph / 2;
  const shoulder = hh - 0.045;
  const archShape = new T.Shape();
  archShape.moveTo(-hw, -hh);
  archShape.lineTo(hw, -hh);
  archShape.lineTo(hw, shoulder);
  archShape.quadraticCurveTo(0, hh + 0.048, -hw, shoulder);
  archShape.closePath();

  const plaqueGeo = new T.ExtrudeGeometry(archShape, { depth: 0.022, bevelEnabled: false });
  const frontGeo = new T.ShapeGeometry(archShape);
  const fPos = frontGeo.attributes.position;
  const fUv = frontGeo.attributes.uv;
  for (let i = 0; i < fPos.count; i++) {
    fUv.setXY(i, (fPos.getX(i) + hw) / pw, (fPos.getY(i) + hh) / (ph + 0.024));
  }

  const fronts = [
    { label: "數學探索", sub: "桃園市科展 · 成果典藏" },
    { label: "科學研究", sub: "全國科展 · 探究實作" },
    { label: "創意實作", sub: "IEYI 發明展 · 創客作品" },
    { label: "團隊合作", sub: "JHMC 數學 · 數資共學" },
  ];
  const plaqueMaterials = fronts.map(({ label: title, sub }, idx) =>
    graphic(384, 260, (c, w, h) => {
      // Warm laser-cut birch wood grain
      c.fillStyle = idx % 2 ? "#e8d2ae" : "#e3ca9f";
      c.fillRect(0, 0, w, h);
      for (let y = 12; y < h; y += 18) {
        c.fillStyle = "rgba(150, 102, 54, 0.07)";
        c.fillRect(0, y, w, 3);
      }

      // Outer engraved border
      c.strokeStyle = "#7a5230";
      c.lineWidth = 4;
      c.strokeRect(12, 12, w - 24, h - 24);

      // Top engraved "Math & Science / PSJH" arch banner
      c.fillStyle = "rgba(122, 82, 48, 0.14)";
      c.beginPath();
      c.roundRect(88, 28, w - 176, 36, 18);
      c.fill();
      c.strokeStyle = "#7a5230";
      c.lineWidth = 2.5;
      c.stroke();

      c.fillStyle = "#5d3b1e";
      c.font = "bold 21px Georgia, serif";
      c.textAlign = "center";
      c.fillText("Math & Science", w / 2, 53);
      c.font = "bold 16px Georgia, serif";
      c.fillText("PSJH", w / 2, 82);

      // Left & right engraved corner science doodles
      c.strokeStyle = "#8a603a";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(46, 62, 14, 0, Math.PI * 2);
      c.moveTo(46, 48);
      c.lineTo(46, 76);
      c.moveTo(32, 62);
      c.lineTo(60, 62);
      c.stroke();
      c.beginPath();
      c.arc(w - 46, 58, 13, 0, Math.PI * 2);
      c.moveTo(w - 52, 74);
      c.lineTo(w - 40, 74);
      c.stroke();

      // Main engraved category title & competition note
      c.fillStyle = "#4c2f16";
      c.font = "bold 36px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      c.fillText(title, w / 2, 142);
      c.fillStyle = "#6c4829";
      c.font = "21px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      c.fillText(sub, w / 2, 182);

      // Bottom engraved motif strip
      c.strokeStyle = "#8a603a";
      c.lineWidth = 2;
      for (let bx = 42; bx <= w - 68; bx += 38) {
        c.strokeRect(bx, h - 42, 26, 18);
      }
    })
  );

  const plaqueWoodMat = celMaterial(0xdec298);
  const clipMat = celMaterial(0xb8c6d4);

  // Left bay (2 cols x 4 rows) + Right bay (4 cols x 4 rows) = 24 plaques
  const colPositions = [-1.29, -0.79, -0.02, 0.45, 0.92, 1.39];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      const x = colPositions[c];
      const y = (1.5 - r) * 0.34 - 0.015;
      const plaqueBody = new T.Mesh(plaqueGeo, plaqueWoodMat);
      plaqueBody.position.set(x, y, 0.024);
      addInkEdges(plaqueBody, 25, 0.38);
      g.add(plaqueBody);

      const plaqueFace = new T.Mesh(frontGeo, plaqueMaterials[(c + r) % 4]);
      plaqueFace.position.set(x, y, 0.048);
      g.add(plaqueFace);

      // Two silver metal hanging hooks at top of each arched plaque
      for (const hx of [-0.095, 0.095]) {
        const clip = new T.Mesh(new T.BoxGeometry(0.032, 0.042, 0.022), clipMat);
        clip.position.set(x + hx, y + shoulder + 0.026, 0.032);
        addInkEdges(clip, 25, 0.35);
        g.add(clip);
      }
    }
  }

  g.rotation.y = -Math.PI / 2;
  g.position.set(2.92, 1.82, -0.65);
  return g;
}

export function bookshelf() {
  const g = new T.Group();
  const width = 2.46;
  const depth = 0.40;
  const wood = 0xc59361;
  const trim = 0xecc49a;
  const backing = 0x775941;

  box(g, width, 0.95, 0.035, backing, 0, 0.515, -0.18);
  for (const x of [-width / 2 + 0.025, width / 2 - 0.025]) {
    box(g, 0.05, 0.97, depth, wood, x, 0.51);
  }
  for (const y of [0.08, 0.51, 1.0]) {
    box(g, width, 0.05, depth, wood, 0, y);
    box(g, width, 0.035, 0.025, trim, 0, y + 0.008, 0.20);
  }
  box(g, 0.043, 0.87, depth, wood, 0.28, 0.54);
  box(g, width - 0.17, 0.055, 0.31, backing, 0, 0.028);

  const covers = [0x388e86, 0x6c9ac7, 0xce7767, 0xe4ae55, 0x937fae, 0x547997];
  for (const [start, base, count, offset] of [[-1.11, 0.535, 15, 0], [-1.11, 0.105, 12, 2], [0.4, 0.535, 8, 4]]) {
    let x = start;
    for (let i = 0; i < count; i++) {
      const w = [0.055, 0.076, 0.061, 0.09][(i + offset) % 4];
      const h = [0.27, 0.34, 0.30, 0.365, 0.285][(i + offset) % 5];
      const color = covers[(i + offset) % covers.length];
      const z = 0.038 - (i % 3) * 0.012;
      box(g, w, h, 0.26, color, x + w / 2, base + h / 2, z);
      box(g, w - 0.013, 0.005, 0.227, 0xf1e0bf, x + w / 2, base + h + 0.002, z - 0.01, false);
      box(g, w * 0.64, 0.019, 0.004, 0xf2dcaa, x + w / 2, base + h * 0.74, z + 0.131, false);
      x += w + 0.012;
    }
  }

  for (const [i, caption, color] of [[0, "科學桌遊", 0x4f7e9f], [1, "策略遊戲", 0x547f73], [2, "科學挑戰", 0xb7745d]]) {
    const x = 0.72 + (i % 2) * 0.037;
    const y = 0.144 + i * 0.084;
    box(g, 0.65 - i * 0.05, 0.075, 0.29, color, x, y, 0.025);
    label(g, caption, 0.36, 0.053, x, y, 0.172, "#f2e6cc", "#2d4751");
  }

  g.rotation.y = -Math.PI / 2;
  g.position.set(2.75, 0, -0.65);
  return g;
}

function beaker(g, x, y, z, r = 0.085, h = 0.22, color = 0x2ad1ee) {
  const glass = basicMaterial(0xc6eef5, {
    transparent: true,
    opacity: 0.28,
    side: T.DoubleSide,
    depthWrite: false,
  });
  mesh(g, new T.CylinderGeometry(r, r, h, 24, 1, true), glass, x, y + h / 2, z, false);
  cyl(g, r * 0.89, h * 0.48, color, x, y + h * 0.24, z);
  ring(g, r, 0.008, 0xd2f1f5, x, y + h, z);
  ring(g, r, 0.005, 0xa2c8d0, x, y + 0.005, z);
  for (let i = 1; i < 5; i++) {
    box(g, i % 2 ? 0.024 : 0.04, 0.004, 0.003, 0xf5ffff, x + r * 0.35, y + (i * h) / 6, z + r * 0.94, false);
  }
}

function flask(g, x, y, z, color, scale = 1) {
  const p = new T.Group();
  p.position.set(x, y, z);
  p.scale.setScalar(scale);
  g.add(p);
  const profile = [
    [0, 0],
    [0.085, 0],
    [0.10, 0.025],
    [0.028, 0.19],
    [0.027, 0.30],
    [0.036, 0.305],
  ].map(([r, h]) => new T.Vector2(r, h));
  const glass = basicMaterial(0xcdf6ff, {
    transparent: true,
    opacity: 0.30,
    depthWrite: false,
    side: T.DoubleSide,
  });
  mesh(p, new T.LatheGeometry(profile, 24), glass, 0, 0, 0, false);
  cyl(p, 0.083, 0.095, color, 0, 0.055, 0, 0.054);
  ring(p, 0.03, 0.006, 0xe5fbff, 0, 0.305, 0);
  ring(p, 0.088, 0.005, 0xb8e8f5, 0, 0.008, 0);
}

export function experiment() {
  const g = new T.Group();
  // Compact 2.54m bench matching the 2-window span directly above
  box(g, 2.54, 0.71, 0.64, 0xc3d0d8, 0, 0.425, -0.01);
  box(g, 2.44, 0.10, 0.56, 0x354b5b, 0, 0.08, -0.02);

  // Left 2 doors, center 3 stacked drawers, right 2 doors
  for (const dx of [-1.01, -0.61, 0.61, 1.01]) {
    box(g, 0.38, 0.63, 0.035, 0xe9f0f4, dx, 0.445, 0.328);
    box(g, 0.024, 0.13, 0.024, 0x5d7888, dx + (dx < 0 ? 0.11 : -0.11), 0.50, 0.354);
  }
  for (let row = 0; row < 3; row++) {
    const dy = 0.24 + row * 0.205;
    box(g, 0.76, 0.19, 0.035, 0xe9f0f4, 0, dy, 0.328);
    box(g, 0.15, 0.019, 0.024, 0x5d7888, 0, dy, 0.354);
  }

  // Countertop wrapping around recessed sink at x = -0.62
  box(g, 0.37, 0.07, 0.70, 0x445d6f, -1.085, 0.815, 0);
  box(g, 1.61, 0.07, 0.70, 0x445d6f, 0.465, 0.815, 0);
  box(g, 0.56, 0.07, 0.13, 0x445d6f, -0.62, 0.815, -0.285);
  box(g, 0.56, 0.07, 0.13, 0x445d6f, -0.62, 0.815, 0.285);
  box(g, 0.56, 0.025, 0.44, 0x7695a1, -0.62, 0.735, 0);
  for (const sx of [-0.89, -0.35]) {
    box(g, 0.024, 0.10, 0.44, 0x9fb8c2, sx, 0.79, 0);
  }
  for (const sz of [-0.215, 0.215]) {
    box(g, 0.54, 0.10, 0.024, 0x9fb8c2, -0.62, 0.79, sz);
  }

  // Gooseneck faucet
  cyl(g, 0.026, 0.25, 0xbcd2d8, -0.62, 0.975, -0.26, 0.026, true);
  rod(g, [-0.62, 1.10, -0.26], [-0.62, 1.15, -0.09], 0.022, 0xc9dfe4);
  rod(g, [-0.62, 1.15, -0.09], [-0.62, 1.07, -0.06], 0.021, 0xc9dfe4);

  // Left trailing potted plant
  plant(g, -1.10, 0.85, -0.08);

  // Clamp stand + emerald flask
  box(g, 0.26, 0.032, 0.24, 0x354d5e, -0.14, 0.866, -0.08);
  rod(g, [-0.22, 0.88, -0.15], [-0.22, 1.48, -0.15], 0.012, 0xc3d5dc);
  rod(g, [-0.22, 1.34, -0.15], [0.00, 1.34, -0.15], 0.012, 0xc3d5dc);
  flask(g, -0.02, 1.04, -0.15, 0x42e0b2, 0.70);

  // Violet flask, cyan beaker & 4-tube rack
  flask(g, 0.22, 0.85, -0.12, 0xb562eb, 0.68);
  beaker(g, 0.34, 0.85, 0.12, 0.072, 0.19, 0xc576f1);
  box(g, 0.30, 0.024, 0.13, 0x507691, 0.56, 0.868, -0.06);
  box(g, 0.30, 0.020, 0.13, 0xa8cad9, 0.56, 1.02, -0.06);
  for (const rx of [0.43, 0.69]) {
    rod(g, [rx, 0.875, -0.06], [rx, 1.035, -0.06], 0.009, 0x7396aa);
  }
  for (let i = 0; i < 4; i++) {
    beaker(g, 0.455 + i * 0.07, 0.885, -0.06, 0.021, 0.21, [0xd77bed, 0x36ccea, 0xf3c64a, 0x59dfb1][i]);
  }

  // Green hot plate + beaker
  box(g, 0.36, 0.065, 0.32, 0x6eddb8, 0.68, 0.883, 0.14);
  cyl(g, 0.12, 0.024, 0x394958, 0.68, 0.927, 0.14, 0.12, true);
  beaker(g, 0.68, 0.942, 0.14, 0.085, 0.23, 0x2ad1ee);
  label(g, "HOT PLATE", 0.21, 0.032, 0.68, 0.88, 0.302);

  // Microscope on right end
  const m = new T.Group();
  m.position.set(1.06, 0.85, 0.02);
  g.add(m);
  box(m, 0.32, 0.044, 0.26, 0xdce8e8, 0, 0.022, 0);
  rod(m, [0.08, 0.04, -0.06], [0.08, 0.33, -0.09], 0.032, 0x72919c);
  box(m, 0.22, 0.024, 0.16, 0x334e61, 0, 0.195, 0.024);
  rod(m, [0, 0.28, 0.02], [-0.052, 0.44, -0.052], 0.038, 0xdce8e8);
  rod(m, [-0.052, 0.44, -0.052], [-0.076, 0.49, -0.086], 0.024, 0x2d4558);
  cyl(m, 0.024, 0.065, 0x49687c, 0, 0.255, 0.02, 0.024, true);
  mesh(m, new T.SphereGeometry(0.034, 12, 8), 0x385165, 0.125, 0.27, -0.07, false);

  g.rotation.y = Math.PI / 2;
  g.position.set(-2.62, 0, -1.42);
  return g;
}

function exhibit(g, type, x, y) {
  const p = new T.Group();
  p.position.set(x, y, 0);
  g.add(p);
  if (type === 0) {
    // Miniature 3D printer, open frame and pink print
    box(p, 0.37, 0.035, 0.30, 0xdde8ee, 0, 0.02, 0);
    box(p, 0.37, 0.03, 0.30, 0x30465b, 0, 0.31, 0);
    for (const xx of [-0.165, 0.165]) {
      for (const zz of [-0.125, 0.125]) {
        box(p, 0.024, 0.28, 0.024, 0x405870, xx, 0.165, zz);
      }
    }
    box(p, 0.28, 0.018, 0.22, 0x8799ad, 0, 0.075, 0);
    rod(p, [-0.16, 0.23, 0], [0.16, 0.23, 0], 0.009, 0xb8d0d9);
    box(p, 0.055, 0.06, 0.05, 0x3a5268, 0.04, 0.23, 0);
    mesh(p, new T.TorusKnotGeometry(0.056, 0.016, 40, 6), 0xef87b7, 0, 0.15, 0.01, false);
    ring(p, 0.067, 0.014, 0x2b4056, 0, 0.36, -0.05).rotation.set(0, 0, 0);
  }
  if (type === 1) {
    // Golden vertices and violet polyhedral struts
    const geo = new T.IcosahedronGeometry(0.155, 0);
    const pts = [];
    const a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(a, i);
      if (!pts.some(q => q.distanceTo(v) < 0.001)) pts.push(v);
    }
    const center = new T.Vector3(0, 0.18, 0);
    for (const v of pts) {
      mesh(p, new T.SphereGeometry(0.018, 8, 6), 0xffce5b, ...v.clone().add(center).toArray(), false);
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].distanceTo(pts[j]) < 0.18) {
          rod(p, pts[i].clone().add(center).toArray(), pts[j].clone().add(center).toArray(), 0.006, 0xe2c1ff);
        }
      }
    }
  }
  if (type === 2) {
    // DNA double helix
    const paths = [[], []];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const a = t * Math.PI * 3.5;
      for (let j = 0; j < 2; j++) {
        paths[j].push(
          new T.Vector3(Math.cos(a + j * Math.PI) * 0.072, 0.035 + t * 0.30, Math.sin(a + j * Math.PI) * 0.055)
        );
      }
    }
    for (const path of paths) {
      mesh(p, new T.TubeGeometry(new T.CatmullRomCurve3(path), 40, 0.009, 6, false), 0xe8f4ff, 0, 0, 0, false);
    }
    for (let i = 0; i <= 28; i += 3) {
      rod(p, paths[0][i].toArray(), paths[1][i].toArray(), 0.007, [0xfac36a, 0xb5eebc, 0xf6b4d6][i % 3]);
    }
  }
  if (type === 3) {
    // Lidded storage boxes
    for (const [xx, yy, col] of [[-0.10, 0.035, 0x30c3b4], [0.12, 0.03, 0x54a8ed]]) {
      box(p, 0.19, 0.12, 0.20, col, xx, yy + 0.06, 0);
      box(p, 0.205, 0.025, 0.215, col, xx, yy + 0.13, 0);
      box(p, 0.065, 0.014, 0.008, 0x21556e, xx, yy + 0.09, 0.105);
    }
  }
  if (type === 4) {
    // Colourful architectural blocks
    for (const [xx, h, col] of [[-0.14, 0.19, 0xf0bf42], [0, 0.27, 0xec87b3], [0.14, 0.16, 0x78d7ca]]) {
      box(p, 0.085, h, 0.12, col, xx, h / 2, 0);
    }
    box(p, 0.25, 0.065, 0.13, 0x8fa8ef, 0, 0.05, 0);
    const roof = mesh(p, new T.ConeGeometry(0.105, 0.10, 4), 0xffc689, 0, 0.32, 0);
    roof.rotation.y = Math.PI / 4;
  }
  if (type === 5) {
    // Two wireframe pyramids
    for (const [xx, r, h, col] of [[-0.10, 0.09, 0.25, 0xffcc3c], [0.12, 0.085, 0.20, 0x73d8ff]]) {
      const corners = [
        [-r, 0, -r],
        [r, 0, -r],
        [r, 0, r],
        [-r, 0, r],
      ];
      for (let i = 0; i < 4; i++) {
        rod(p, [xx, h, 0], [xx + corners[i][0], 0.012, corners[i][2]], 0.007, col);
        rod(
          p,
          [xx + corners[i][0], 0.012, corners[i][2]],
          [xx + corners[(i + 1) % 4][0], 0.012, corners[(i + 1) % 4][2]],
          0.007,
          col
        );
      }
    }
  }
}

export function maker() {
  const g = new T.Group();
  const colors = [PALETTE.mint, PALETTE.lavender, PALETTE.blue];
  const backs = [0x297469, 0x594b87, 0x2a5f94];
  for (let c = 0; c < 3; c++) {
    const x = (c - 1) * 0.58;
    const col = colors[c];
    box(g, 0.58, 1.20, 0.035, backs[c], x, 0.67, -0.225);
    for (const y of [0.10, 0.46, 0.85, 1.25]) {
      box(g, 0.58, 0.04, 0.48, col, x, y, 0);
    }
    for (const side of [-1, 1]) {
      box(g, 0.027, 1.19, 0.48, col, x + side * 0.277, 0.675, 0);
    }
    box(g, 0.515, 0.30, 0.425, col, x, 0.28, 0.012);
    box(g, 0.135, 0.018, 0.014, 0x28485f, x, 0.37, 0.233);
    exhibit(g, c, x, 0.875);
    exhibit(g, c + 3, x, 0.485);
  }
  for (const x of [-0.76, 0.76]) {
    for (const z of [-0.16, 0.16]) {
      box(g, 0.065, 0.08, 0.065, 0x3e5665, x, 0.04, z);
    }
  }
  plant(g, 0.68, 1.275, -0.06);
  g.rotation.y = -Math.PI / 2;
  g.position.set(2.66, 0, 2.25);
  return g;
}

export function mathProps(g, y) {
  // 1. 3x3x3 pastel Rubik's cube
  const cube = new T.Group();
  cube.position.set(-0.37, y + 0.145, -0.24);
  cube.rotation.y = 0.24;
  g.add(cube);
  const colors = [0xe8b955, 0x659cbf, 0xcd7180, 0x68af98, 0xf0e4c5, 0xa18dc7];
  const materials = colors.map(c => celMaterial(c));
  for (let x = 0; x < 3; x++) {
    for (let yy = 0; yy < 3; yy++) {
      for (let z = 0; z < 3; z++) {
        box(cube, 0.081, 0.081, 0.081, materials, (x - 1) * 0.087, (yy - 1) * 0.087, (z - 1) * 0.087);
      }
    }
  }

  // 2. Violet square pyramid
  const pyramid = mesh(g, new T.ConeGeometry(0.18, 0.30, 4), 0xa17be4, 0.04, y + 0.16, -0.29);
  pyramid.rotation.y = Math.PI / 4;

  // 3. Coral-pink dodecahedron
  const d = mesh(g, new T.DodecahedronGeometry(0.16), 0xf090b5, 0.43, 0, -0.19);
  d.rotation.set(0.2, 0.4, 0.1);
  d.updateMatrixWorld(true);
  d.position.y = y + 0.01 - new T.Box3().setFromObject(d).min.y;

  // 4. Blue geometry construction blueprint
  const paper = graphic(768, 512, (c, w, h) => {
    c.fillStyle = "#367fc5";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#68a1d3";
    c.lineWidth = 1.5;
    for (let i = 0; i < w; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, h);
      c.stroke();
    }
    for (let i = 0; i < h; i += 32) {
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(w, i);
      c.stroke();
    }
    c.strokeStyle = "#daeeff";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(330, 270, 155, 0, Math.PI * 2);
    c.moveTo(175, 270);
    c.lineTo(485, 270);
    c.lineTo(330, 115);
    c.closePath();
    c.stroke();
    c.fillStyle = "#e1f3ff";
    c.font = "bold 28px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.fillText("GEOMETRY / 幾何探索", 35, 45);
  });
  const p = mesh(
    g,
    new T.BoxGeometry(0.65, 0.004, 0.42),
    [
      celMaterial(0x367fc5),
      celMaterial(0x367fc5),
      paper,
      celMaterial(0x367fc5),
      celMaterial(0x367fc5),
      celMaterial(0x367fc5),
    ],
    -0.02,
    y + 0.013,
    0.24
  );
  p.rotation.y = -0.08;

  // 5. Mint set square with inner triangle cutout
  const s = new T.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.29, 0);
  s.lineTo(0, 0.24);
  s.closePath();
  const h = new T.Path();
  h.moveTo(0.04, 0.04);
  h.lineTo(0.04, 0.15);
  h.lineTo(0.18, 0.04);
  h.closePath();
  s.holes.push(h);
  const sq = mesh(g, new T.ExtrudeGeometry(s, { depth: 0.009, bevelEnabled: false }), 0x75b6a3, -0.60, y + 0.012, 0.12);
  sq.rotation.x = -Math.PI / 2;

  // 6. Upright Lambda-shaped metallic drawing compass on right-front of table
  const cp = new T.Group();
  cp.position.set(0.42, y + 0.01, 0.18);
  cp.rotation.y = -0.35;
  g.add(cp);
  rod(cp, [0, 0.255, 0], [-0.085, 0.015, 0], 0.011, 0x7a93a3);
  rod(cp, [0, 0.255, 0], [0.085, 0.015, 0], 0.011, 0x7a93a3);
  rod(cp, [-0.085, 0.015, 0], [-0.095, 0.0, 0], 0.004, 0x2c3c4f);
  rod(cp, [0.085, 0.015, 0], [0.095, 0.0, 0], 0.004, 0x2c3c4f);
  const hinge = cyl(cp, 0.022, 0.020, 0xd8aa4c, 0, 0.258, 0, 0.022, true);
  hinge.rotation.x = Math.PI / 2;
  cyl(cp, 0.010, 0.042, 0x455b6d, 0, 0.292, 0, 0.008, true);
}
