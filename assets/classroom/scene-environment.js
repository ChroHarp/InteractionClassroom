import * as T from "./vendor/three.module.min.js";
import {
  PALETTE,
  celMaterial,
  basicMaterial,
  addInkEdges,
  canvasTexture,
} from "./scene-materials.js";
import { plant } from "./scene-props.js";

function box(g, w, h, d, color, x, y, z, ink = true) {
  const mat = typeof color === "number" ? celMaterial(color) : color;
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  g.add(m);
  if (ink) addInkEdges(m, 25, 0.32);
  return m;
}

function plane(g, w, h, mat, x, y, z, ry = 0) {
  const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

function wall(g, w, x, z, rot) {
  const p = new T.Group();
  p.position.set(x, 0, z);
  p.rotation.y = rot;
  g.add(p);
  box(p, w, 3.55, 0.10, PALETTE.wallCream, 0, 1.775, -0.06, false);
  box(p, w, 1.05, 0.055, PALETTE.wainscotGreen, 0, 0.525, 0.01, false);
  box(p, w, 0.055, 0.08, PALETTE.wainscotTrim, 0, 1.075, 0.035, true);
  box(p, w, 0.065, 0.07, PALETTE.baseboard, 0, 0.035, 0.035, false);
  for (let xx = -w / 2 + 0.28; xx < w / 2; xx += 0.42) {
    box(p, 0.012, 0.93, 0.012, 0x749b76, xx, 0.55, 0.045, false);
  }
  return p;
}

function addFluffyTree(g, x, z, scale = 1) {
  const tree = new T.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  g.add(tree);
  box(tree, 0.12, 1.5, 0.12, 0x9b7e5c, 0, 0.75, 0, true);
  const clusters = [
    [0, 1.85, 0, 0.52, 0x67b86a],
    [-0.28, 1.62, 0.14, 0.38, 0x82cc72],
    [0.26, 1.68, -0.14, 0.40, 0x5aa66d],
    [0.04, 2.18, 0.06, 0.36, 0x98dc7b],
  ];
  for (const [cx, cy, cz, r, col] of clusters) {
    const crown = new T.Mesh(new T.SphereGeometry(r, 12, 10), celMaterial(col));
    crown.position.set(cx, cy, cz);
    crown.scale.set(1.05, 0.88, 1.05);
    tree.add(crown);
  }
}

export function environment(scene, textures) {
  const g = new T.Group();
  scene.add(g);

  // 1. Warm honey oak floor
  const floorMat = basicMaterial(0xffffff, { map: textures.floor });
  const floor = new T.Mesh(new T.PlaneGeometry(6.2, 13, 12, 26), floorMat);
  floor.position.set(0, 0, 2.0);
  floor.rotation.x = -Math.PI / 2;
  g.add(floor);

  // 2. Back wall (z = -3.8) & Right wall (x = +3.0, extending cleanly past z = +3.8)
  wall(g, 6.20, 0, -3.8, 0);
  wall(g, 10.6, 3.0, 1.5, -Math.PI / 2);

  // 3. Left wall (x = -3.0): Compact 2-window science bay + full front indoor wall + oak door
  // Lower wainscoting runs seamlessly along left wall up to the door opening (z in [-3.8, 2.75])
  const lowerLeft = new T.Group();
  lowerLeft.position.set(-3.0, 0, -0.525);
  lowerLeft.rotation.y = Math.PI / 2;
  g.add(lowerLeft);
  box(lowerLeft, 6.55, 1.08, 0.10, PALETTE.wainscotGreen, 0, 0.54, -0.05, false);
  box(lowerLeft, 6.55, 0.055, 0.14, PALETTE.wainscotTrim, 0, 1.105, 0.01, true);
  box(lowerLeft, 6.55, 0.065, 0.12, PALETTE.baseboard, 0, 0.035, 0.01, false);
  for (let x = -3.1; x < 3.1; x += 0.42) {
    box(lowerLeft, 0.012, 0.96, 0.012, 0x749b76, x, 0.56, 0.015, false);
  }

  // Left wall upper header across whole length (-3.8 to 6.2)
  box(g, 0.14, 0.99, 10.0, PALETTE.wallCream, -3.02, 3.055, 1.2, false);
  // Subtle dark slate top cove trim matching ceiling edge
  box(g, 0.16, 0.14, 10.0, 0x263a51, -3.01, 3.48, 1.2, false);

  // Left wall vertical solid sections around the two compact windows:
  // Back corner pillar [-3.8, -2.62], center mullion [-1.46, -1.24],
  // AND large indoor wall [-0.08, +2.75] for the Entry News Corkboard!
  const solidLeftPillars = [
    [-3.80, -2.62],
    [-1.46, -1.24],
    [-0.08, 2.75],
  ];
  for (const [za, zb] of solidLeftPillars) {
    const zw = zb - za;
    const zc = (za + zb) / 2;
    box(g, 0.12, 1.46, zw, PALETTE.wallCream, -3.02, 1.85, zc, false);
  }

  // Front wall extension beyond the door (z = 3.63 to 6.2) so camera never sees void
  box(g, 0.14, 2.56, 2.57, PALETTE.wallCream, -3.02, 1.28, 4.915, false);
  box(g, 0.08, 1.08, 2.57, PALETTE.wainscotGreen, -2.97, 0.54, 4.915, false);

  // Two compact windows on left wall: [-2.62, -1.46] and [-1.24, -0.08]
  for (const [za, zb] of [[-2.62, -1.46], [-1.24, -0.08]]) {
    const z = (za + zb) / 2;
    const w = zb - za;
    // Cream windowsill
    box(g, 0.24, 0.06, w + 0.08, 0xe8f1ef, -2.94, 1.13, z, true);
    // Outer slate-blue sash frame with non-coplanar depths to prevent z-fighting
    box(g, 0.11, 0.06, w - 0.004, 0x415b73, -3.00, 2.53, z, true);
    box(g, 0.10, 1.34, 0.055, 0x415b73, -3.00, 1.83, za + 0.032, true);
    box(g, 0.10, 1.34, 0.055, 0x415b73, -3.00, 1.83, zb - 0.032, true);
    box(g, 0.06, 1.34, 0.048, 0x4a6680, -3.02, 1.83, z, true);
    box(g, 0.05, 0.048, w - 0.12, 0x4a6680, -3.02, 2.04, z, true);
    // Soft translucent glass tint behind mullions
    const glass = new T.Mesh(
      new T.PlaneGeometry(w - 0.08, 1.32),
      basicMaterial(0xdbf6ff, { transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false })
    );
    glass.rotation.y = Math.PI / 2;
    glass.position.set(-3.058, 1.83, z);
    g.add(glass);
    // Top cream roller shade mounted cleanly on interior side
    box(g, 0.035, 0.22, w - 0.12, 0xf3f1e6, -2.935, 2.40, z, true);
  }
  // Small potted plant on Window 2 sill
  plant(g, -2.89, 1.16, -0.35);

  // 4. Outdoor scenery behind the two compact windows
  const sky = canvasTexture(512, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#6cc0ec");
    gr.addColorStop(0.65, "#bae8f7");
    gr.addColorStop(1, "#e7f7f5");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (const [cx, cy, rx, ry] of [[110, 120, 82, 22], [290, 185, 110, 26], [420, 95, 70, 18]]) {
      c.beginPath();
      c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  plane(g, 24, 7.5, basicMaterial(0xffffff, { map: sky }), -6.2, 2.1, -1.2, Math.PI / 2);

  // Distant sunlit campus building outside the windows
  box(g, 0.35, 1.75, 14.0, 0xdfe9ef, -5.65, 1.15, -1.2, false);
  box(g, 0.38, 0.14, 14.2, 0xb8cedb, -5.64, 2.04, -1.2, false);
  for (let z = -6.5; z < 4.5; z += 0.72) {
    box(g, 0.38, 0.48, 0.44, 0x8cc0d4, -5.56, 1.38, z, false);
  }
  for (let i = 0; i < 10; i++) {
    addFluffyTree(g, -4.35 - (i % 2) * 0.25, -5.2 + i * 0.95, 0.92 + (i % 3) * 0.08);
  }

  // 5. Classroom entrance door at left-front (z in [2.75, 3.63])
  box(g, 0.14, 2.78, 0.96, 0xe8d9be, -2.97, 1.39, 3.19, true);
  box(g, 0.15, 2.62, 0.80, PALETTE.oak, -2.91, 1.31, 3.19, true);
  box(g, 0.04, 0.22, 0.06, 0x7890a1, -2.82, 1.02, 2.92, true);
  box(g, 0.12, 0.035, 0.16, 0xd8e5ea, -2.78, 1.06, 2.97, true);

  // 6. Seamless Solar System & Nebula Mural across Back-Right Corner & Right Wall
  plane(g, 4.20, 0.98, basicMaterial(0xffffff, { map: textures["solar-back.webp"] }), 0.92, 3.06, -3.79, 0);
  plane(g, 9.60, 0.98, basicMaterial(0xffffff, { map: textures["solar-right.webp"] }), 2.98, 3.06, 1.00, -Math.PI / 2);

  // 7. Sunlit floor patches aligned strictly with the two compact windows (z = -2.62..-0.08)
  const sunPatch = canvasTexture(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(255, 245, 198, 0.34)";
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 2; col++) {
        c.fillRect(36 + col * 230, 30 + r * 240, 196, 196);
      }
    }
  });
  const patch = plane(
    g,
    2.55,
    2.70,
    basicMaterial(0xffffff, { map: sunPatch, transparent: true, depthWrite: false }),
    -1.20,
    0.006,
    -1.05
  );
  patch.rotation.x = -Math.PI / 2;
  patch.rotation.z = -0.24;

  // 8. Ceiling structural grid & diagonal Mint-to-Blue suspended baffles
  box(g, 6.2, 0.06, 12.0, 0x1a293b, 0, 3.60, 1.8, false);
  for (let x = -2.8; x < 3; x += 0.75) {
    box(g, 0.045, 0.08, 11.6, 0x2d4157, x, 3.57, 1.7, false);
  }
  for (let z = -3.4; z < 7; z += 0.85) {
    box(g, 6.0, 0.08, 0.045, 0x31455b, 0, 3.57, z, false);
  }

  for (const z of [-2.75, -1.55, -0.35, 0.85, 2.05, 3.25]) {
    const b = new T.Group();
    b.position.set(0, 3.40, z);
    b.rotation.y = -0.24;
    g.add(b);
    for (const [x, sideCol, botCol] of [
      [-1.52, PALETTE.mint, PALETTE.mintLight],
      [1.52, PALETTE.blue, PALETTE.blueLight],
    ]) {
      const sideMat = basicMaterial(sideCol);
      const botMat = basicMaterial(botCol);
      box(b, 3.04, 0.15, 0.27, [sideMat, sideMat, sideMat, botMat, sideMat, sideMat], x, 0, 0, true);
    }
    for (const lx of [-1.95, 0, 1.95]) {
      const rim = new T.Mesh(new T.CylinderGeometry(0.105, 0.105, 0.025, 24), celMaterial(0xb4d2de));
      rim.position.set(lx, -0.084, 0);
      b.add(rim);
      const light = new T.Mesh(new T.CircleGeometry(0.083, 24), basicMaterial(0xfffef2));
      light.rotation.x = Math.PI / 2;
      light.position.set(lx, -0.098, 0);
      b.add(light);
    }
  }
}
