import * as T from "./vendor/three.module.min.js";

// Unified Warm Cel-Illustration palette and orthographic surface textures.
export const PALETTE = {
  mint: 0x62dfb0,
  mintLight: 0x91f0cc,
  lavender: 0xa58ae9,
  blue: 0x62b3ed,
  blueLight: 0x8fd0ff,
  ink: 0x24344d,
  oak: 0xc9935c,
  oakLight: 0xdca56c,
  oakDark: 0xb17642,
  wallCream: 0xe6edf4,
  wainscotGreen: 0x8db88d,
  wainscotTrim: 0xb6d6ae,
  baseboard: 0x5c7588,
};

let cachedToonGradient = null;
function getToonGradient() {
  if (cachedToonGradient) return cachedToonGradient;
  // Bright 3-step pastel cel ramp so shaded faces stay colorful and warm indoors.
  const ramp = new Uint8Array([192, 228, 255]);
  const tex = new T.DataTexture(ramp, 3, 1, T.RedFormat);
  tex.minFilter = T.NearestFilter;
  tex.magFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cachedToonGradient = tex;
  return tex;
}

export function celMaterial(color, opts = {}) {
  return new T.MeshToonMaterial({
    color,
    gradientMap: getToonGradient(),
    ...opts,
  });
}

export function basicMaterial(color, opts = {}) {
  return new T.MeshBasicMaterial({ color, ...opts });
}

const SHARED_EDGE_MATS = new Map();

export function addInkEdges(root, threshold = 24, opacity = 0.42, color = PALETTE.ink) {
  const key = `${threshold}|${opacity}|${color}`;
  let mat = SHARED_EDGE_MATS.get(key);
  if (!mat) {
    mat = new T.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    SHARED_EDGE_MATS.set(key, mat);
  }
  const attach = mesh => {
    if (!mesh.isMesh || mesh.userData.isEdgeLine || mesh.userData.noInk) return;
    if (mesh.children.some(ch => ch.userData?.isEdgeLine)) return;
    const lines = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, threshold), mat);
    lines.userData.isEdgeLine = true;
    mesh.add(lines);
  };
  if (root.isMesh) attach(root);
  else root.traverse(attach);
  return root;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function drawRoundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function fillRoundedCard(c, x, y, w, h, r, fill, stroke, lineWidth = 4) {
  drawRoundedRect(c, x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lineWidth;
    c.stroke();
  }
}

function drawSparkle(c, x, y, r, color = "#fff6cf") {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
}

function drawStarfieldBand(c, w, h, curvePoints, seedInit = 19) {
  let seed = seedInit;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Base upper cream wall so lower margin blends invisibly into classroom wall
  c.fillStyle = "#e6edf4";
  c.fillRect(0, 0, w, h);

  const traceWave = yOffset => {
    c.beginPath();
    c.moveTo(curvePoints[0][0], 0);
    c.lineTo(curvePoints[curvePoints.length - 1][0], 0);
    for (let i = curvePoints.length - 1; i >= 0; i--) {
      const [px, py] = curvePoints[i];
      if (i === curvePoints.length - 1) {
        c.lineTo(px, py + yOffset);
      } else {
        const [nx, ny] = curvePoints[i + 1];
        const mx = (px + nx) * 0.5;
        const my = (py + ny) * 0.5 + yOffset;
        c.quadraticCurveTo(nx, ny + yOffset, mx, my);
      }
    }
    c.lineTo(curvePoints[0][0], curvePoints[0][1] + yOffset);
    c.closePath();
  };

  // Soft outer lavender glow ribbon along the lower curve edge
  traceWave(22);
  c.fillStyle = "#7e86d9";
  c.fill();

  traceWave(10);
  c.fillStyle = "#4b55b3";
  c.fill();

  // Deep indigo sky body clipped for clean inner stars & nebula
  c.save();
  traceWave(0);
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#18204c");
  grad.addColorStop(0.65, "#23306d");
  grad.addColorStop(1, "#394899");
  c.fillStyle = grad;
  c.fill();
  c.clip();

  // Subtle flowing star-nebula swath
  c.fillStyle = "rgba(130, 146, 232, 0.22)";
  c.beginPath();
  c.moveTo(0, h * 0.72);
  c.bezierCurveTo(w * 0.3, h * 0.42, w * 0.65, h * 0.85, w, h * 0.56);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fill();

  for (let i = 0; i < Math.round(w / 14); i++) {
    const sx = rand() * w;
    const sy = rand() * h * 0.86;
    const sr = 1 + rand() * 1.9;
    c.fillStyle = rand() > 0.35 ? "rgba(255,255,245,0.85)" : "rgba(182,216,255,0.75)";
    c.beginPath();
    c.arc(sx, sy, sr, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawPlanet(c, x, y, r, kind) {
  c.save();
  c.translate(x, y);

  // Subtle outer halo
  const halo = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.38);
  halo.addColorStop(0, "rgba(255,255,255,0.16)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = halo;
  c.beginPath();
  c.arc(0, 0, r * 1.38, 0, Math.PI * 2);
  c.fill();

  const drawBody = (baseA, baseB, details) => {
    c.save();
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.clip();
    const g = c.createLinearGradient(-r * 0.7, -r * 0.7, r * 0.8, r * 0.8);
    g.addColorStop(0, baseA);
    g.addColorStop(1, baseB);
    c.fillStyle = g;
    c.fillRect(-r, -r, r * 2, r * 2);
    details?.();
    // Cel rim shade on lower-right
    c.fillStyle = "rgba(18, 22, 58, 0.24)";
    c.beginPath();
    c.arc(0, 0, r, -0.35, 2.75);
    c.arc(-r * 0.28, -r * 0.28, r * 0.98, 2.6, -0.45, true);
    c.fill();
    c.restore();
    // Crisp cel outline
    c.strokeStyle = "#202b54";
    c.lineWidth = Math.max(2.5, r * 0.08);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
  };

  if (kind === "mercury") {
    drawBody("#cbd4de", "#7e8a9c", () => {
      c.fillStyle = "rgba(85,95,112,0.45)";
      for (const [cx, cy, cr] of [[-0.35, -0.2, 0.22], [0.28, 0.25, 0.26], [0.1, -0.45, 0.14]]) {
        c.beginPath();
        c.arc(cx * r, cy * r, cr * r, 0, Math.PI * 2);
        c.fill();
      }
    });
  } else if (kind === "venus") {
    drawBody("#ffe2a8", "#d78b46", () => {
      c.fillStyle = "rgba(255,244,205,0.45)";
      c.fillRect(-r, -r * 0.45, r * 2, r * 0.25);
      c.fillRect(-r, r * 0.12, r * 2, r * 0.22);
    });
  } else if (kind === "earth") {
    drawBody("#68c7ff", "#2569b8", () => {
      c.fillStyle = "#62cc7e";
      c.beginPath();
      c.ellipse(-r * 0.28, -r * 0.15, r * 0.42, r * 0.34, 0.3, 0, Math.PI * 2);
      c.ellipse(r * 0.35, r * 0.22, r * 0.32, r * 0.26, -0.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.75)";
      c.beginPath();
      c.ellipse(-r * 0.1, -r * 0.52, r * 0.48, r * 0.14, 0.1, 0, Math.PI * 2);
      c.fill();
    });
  } else if (kind === "mars") {
    drawBody("#f48c62", "#ba4a2e", () => {
      c.fillStyle = "rgba(140,42,24,0.42)";
      c.beginPath();
      c.arc(r * 0.25, -r * 0.1, r * 0.35, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#fff1e4";
      c.beginPath();
      c.ellipse(0, -r * 0.85, r * 0.35, r * 0.15, 0, 0, Math.PI * 2);
      c.fill();
    });
  } else if (kind === "jupiter") {
    drawBody("#f8d7a8", "#cc834b", () => {
      const bands = [[-0.55, 0.18, "#d4864b"], [-0.18, 0.22, "#f7e2be"], [0.22, 0.20, "#c8713c"], [0.58, 0.16, "#e8b47c"]];
      for (const [by, bh, col] of bands) {
        c.fillStyle = col;
        c.fillRect(-r, by * r, r * 2, bh * r);
      }
      c.fillStyle = "#df5e3e";
      c.beginPath();
      c.ellipse(r * 0.26, r * 0.28, r * 0.25, r * 0.16, 0, 0, Math.PI * 2);
      c.fill();
    });
  } else if (kind === "saturn") {
    // Back half of ring
    c.save();
    c.rotate(-0.26);
    c.strokeStyle = "#f4dc9e";
    c.lineWidth = r * 0.24;
    c.beginPath();
    c.ellipse(0, 0, r * 1.72, r * 0.42, 0, Math.PI, Math.PI * 2);
    c.stroke();
    c.restore();

    drawBody("#fce4b4", "#cfa05b", () => {
      c.fillStyle = "rgba(255,248,225,0.45)";
      c.fillRect(-r, -r * 0.28, r * 2, r * 0.2);
      c.fillRect(-r, r * 0.18, r * 2, r * 0.15);
    });

    // Front half of ring
    c.save();
    c.rotate(-0.26);
    c.strokeStyle = "#f4dc9e";
    c.lineWidth = r * 0.24;
    c.beginPath();
    c.ellipse(0, 0, r * 1.72, r * 0.42, 0, 0, Math.PI);
    c.stroke();
    c.strokeStyle = "#c89d58";
    c.lineWidth = r * 0.06;
    c.beginPath();
    c.ellipse(0, 0, r * 1.54, r * 0.36, 0, 0, Math.PI);
    c.stroke();
    c.restore();
  } else if (kind === "uranus") {
    drawBody("#aaf3f7", "#53b8cf", () => {
      c.fillStyle = "rgba(255,255,255,0.28)";
      c.fillRect(-r, -r * 0.2, r * 2, r * 0.22);
    });
    c.save();
    c.rotate(0.45);
    c.strokeStyle = "rgba(220,252,255,0.75)";
    c.lineWidth = Math.max(2, r * 0.09);
    c.beginPath();
    c.ellipse(0, 0, r * 1.45, r * 0.26, 0, -0.2, Math.PI + 0.2);
    c.stroke();
    c.restore();
  } else if (kind === "neptune") {
    drawBody("#6da8ff", "#2c54bd", () => {
      c.fillStyle = "rgba(195,226,255,0.35)";
      c.fillRect(-r, -r * 0.3, r * 2, r * 0.16);
      c.fillRect(-r, r * 0.22, r * 2, r * 0.14);
    });
  } else if (kind === "pluto") {
    drawBody("#ead7bd", "#a98c6f", () => {
      c.fillStyle = "rgba(255,244,225,0.45)";
      c.beginPath();
      c.arc(-r * 0.18, r * 0.12, r * 0.36, 0, Math.PI * 2);
      c.fill();
    });
  }
  c.restore();
}

export function surfaces() {
  // 1. Warm honey oak planks
  const floor = canvasTexture(1024, 1024, (c, w, h) => {
    let seed = 347;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    c.fillStyle = "#ba8759";
    c.fillRect(0, 0, w, h);
    const tones = [
      [219, 174, 128],
      [212, 165, 118],
      [226, 182, 136],
      [205, 158, 112],
    ];
    for (let row = 0; row < 8; row++) {
      for (let k = -1; k < 3; k++) {
        const x = k * 512 + (row % 2) * 256;
        const y = row * 128;
        const [r, g, b] = tones[Math.floor(rand() * tones.length)];
        c.fillStyle = `rgb(${r},${g},${b})`;
        c.fillRect(x + 2, y + 2, 508, 124);
        for (let i = 0; i < 24; i++) {
          const gy = y + 6 + rand() * 116;
          c.strokeStyle = `rgba(130, 82, 46, ${0.04 + rand() * 0.08})`;
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(x + 2, gy);
          c.bezierCurveTo(x + 170, gy + (rand() - 0.5) * 10, x + 340, gy + (rand() - 0.5) * 10, x + 508, gy);
          c.stroke();
        }
        c.fillStyle = "rgba(255, 244, 219, 0.32)";
        c.fillRect(x + 2, y + 2, 508, 3);
      }
    }
  });
  floor.wrapS = floor.wrapT = T.RepeatWrapping;
  floor.repeat.set(3, 5);

  // 2. Seamless corner galaxy & 9-planet mural (Back corner transition + Right wall frieze)
  const solarMuralBack = canvasTexture(1600, 420, (c, w, h) => {
    const pts = [
      [w * 0.42, 0],
      [w * 0.58, h * 0.30],
      [w * 0.78, h * 0.62],
      [w, h * 0.78],
    ];
    drawStarfieldBand(c, w, h, pts, 71);
    drawSparkle(c, w * 0.68, h * 0.24, 14);
    drawSparkle(c, w * 0.87, h * 0.42, 18);
    drawSparkle(c, w * 0.94, h * 0.20, 10);
  });

  const solarMuralRight = canvasTexture(3200, 420, (c, w, h) => {
    const pts = [
      [0, h * 0.78],
      [w * 0.16, h * 0.86],
      [w * 0.36, h * 0.74],
      [w * 0.58, h * 0.84],
      [w * 0.78, h * 0.75],
      [w, h * 0.80],
    ];
    drawStarfieldBand(c, w, h, pts, 109);
    const planets = [
      [0.06, 0.45, 24, "mercury"],
      [0.13, 0.44, 34, "venus"],
      [0.20, 0.45, 44, "earth"],
      [0.27, 0.44, 32, "mars"],
      [0.36, 0.44, 72, "jupiter"],
      [0.48, 0.43, 58, "saturn"],
      [0.59, 0.45, 42, "uranus"],
      [0.67, 0.44, 40, "neptune"],
      [0.74, 0.46, 22, "pluto"],
    ];
    for (const [fx, fy, r, kind] of planets) {
      drawPlanet(c, w * fx, h * fy, r, kind);
    }
    for (const [sx, sy, sr] of [[0.03, 0.25, 13], [0.16, 0.22, 11], [0.31, 0.20, 15], [0.42, 0.22, 12], [0.54, 0.18, 15], [0.71, 0.24, 14], [0.81, 0.28, 12], [0.90, 0.22, 14], [0.96, 0.36, 10]]) {
      drawSparkle(c, w * sx, h * sy, sr);
    }
  });

  // 3. Chalkboard: Math curve, integral & learning motto
  const blackboard = canvasTexture(1400, 780, (c, w, h) => {
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#195a46");
    bg.addColorStop(1, "#134739");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    // Subtle chalk smudge bands
    c.fillStyle = "rgba(255,255,255,0.03)";
    c.fillRect(90, 90, 560, 520);
    c.fillRect(740, 140, 520, 390);

    // Coordinate axes & cubic curve
    c.strokeStyle = "#e3f2d7";
    c.lineWidth = 6;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(110, 440);
    c.lineTo(660, 440);
    c.moveTo(355, 630);
    c.lineTo(355, 100);
    // Axis arrows
    c.moveTo(642, 426);
    c.lineTo(664, 440);
    c.lineTo(642, 454);
    c.moveTo(341, 120);
    c.lineTo(355, 96);
    c.lineTo(369, 120);
    c.stroke();

    c.lineWidth = 4;
    for (let i = -3; i <= 4; i++) {
      if (i === 0) continue;
      const tx = 355 + i * 65;
      c.beginPath();
      c.moveTo(tx, 430);
      c.lineTo(tx, 450);
      c.stroke();
    }
    c.strokeStyle = "#f6ffe8";
    c.lineWidth = 7;
    c.beginPath();
    for (let i = -185; i <= 215; i += 4) {
      const px = 355 + i;
      const py = 440 - (i * i * i) / 42000;
      if (i === -185) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();

    // Calculus equation
    c.fillStyle = "#f2fbe8";
    c.font = "italic 104px Georgia, serif";
    c.fillText("∫ x² dx", 770, 345);
    c.font = "italic 46px Georgia, serif";
    c.fillStyle = "#cdebd1";
    c.fillText("= ⅓ x³ + C", 805, 435);

    // Core motto along lower board
    c.fillStyle = "#a2e0c2";
    c.font = "bold 36px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.textAlign = "center";
    c.fillText("觀察 · 提問 · 探究 · 實作　　OBSERVE · QUESTION · EXPLORE", w / 2, 712);
  });

  // 4. Three-Year Curriculum Timetable (courses-board.webp) matching course_map.png
  const courses = canvasTexture(1360, 960, (c, w, h) => {
    c.fillStyle = "#f5f8fc";
    c.fillRect(0, 0, w, h);

    // Header strip
    c.fillStyle = "#213f59";
    c.fillRect(0, 0, w, 108);
    c.fillStyle = "#ffffff";
    c.font = "bold 46px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.textAlign = "left";
    c.fillText("平興數資 · 三年課程規劃表", 46, 67);
    c.fillStyle = "#91e8cc";
    c.font = "bold 24px sans-serif";
    c.textAlign = "right";
    c.fillText("CURRICULUM TIMETABLE", w - 46, 65);

    const padX = 42;
    const gap = 22;
    const colW = (w - padX * 2 - gap * 2) / 3;
    const colX = i => padX + i * (colW + gap);

    // Grade column headers & subtle column frames
    const grades = [
      { title: "七年級｜啟發與試探", bg: "#796ec8", border: "#b9b2e8", tint: "#f3f1fc" },
      { title: "八年級｜實作與探究", bg: "#73a142", border: "#b5d295", tint: "#f4f9ee" },
      { title: "九年級｜適性分流", bg: "#3979b8", border: "#9cc2e6", tint: "#eff6fc" },
    ];
    grades.forEach((g, i) => {
      const x = colX(i);
      fillRoundedCard(c, x, 130, colW, 695, 16, g.tint, g.border, 4);
      fillRoundedCard(c, x, 130, colW, 74, 16, g.bg, null);
      c.fillStyle = g.bg;
      c.fillRect(x, 180, colW, 24);
      c.fillStyle = "#ffffff";
      c.font = "bold 30px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      c.textAlign = "center";
      c.fillText(g.title, x + colW / 2, 178);
    });

    const drawCourseBar = (colStart, colSpan, row, label, fill, stroke, textCol = "#1f3042") => {
      const x = colX(colStart) + 12;
      const bw = colSpan * colW + (colSpan - 1) * gap - 24;
      const y = 222 + row * 84;
      const bh = 68;
      fillRoundedCard(c, x, y, bw, bh, 12, fill, stroke, 3.5);
      c.fillStyle = textCol;
      c.font = "bold 27px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(label, x + bw / 2, y + bh / 2);
      c.textBaseline = "alphabetic";
    };

    // Timetable rows matching images/course_map.png
    drawCourseBar(0, 1, 0, "團體輔導 / 創造力 / 1", "#f4a399", "#c95248");
    drawCourseBar(1, 1, 0, "團體輔導 / 科學閱讀 / 1", "#f4a399", "#c95248");

    drawCourseBar(0, 2, 1, "數學 / 3", "#8cc7f7", "#3f86c9");
    drawCourseBar(2, 1, 1, "數學 / 4", "#8cc7f7", "#3f86c9");

    drawCourseBar(0, 2, 2, "數學專題 / 2", "#78bbf4", "#377ec2");
    drawCourseBar(2, 1, 2, "數學專題 / 1", "#78bbf4", "#377ec2");

    drawCourseBar(1, 2, 3, "幾何專題 / 1", "#69b1ef", "#2f74b8");

    drawCourseBar(0, 1, 4, "生物實驗 / 2", "#bae37d", "#6e9e35");
    drawCourseBar(1, 2, 4, "理化 / 4", "#bae37d", "#6e9e35");

    drawCourseBar(0, 1, 5, "科技專題 / 1", "#fac26e", "#ce7f26");
    drawCourseBar(1, 2, 5, "理化實驗 / 1", "#bae37d", "#6e9e35");

    drawCourseBar(0, 2, 6, "獨立研究 / 2", "#bea9f4", "#7459bd");
    drawCourseBar(2, 1, 6, "升學與競賽適性輔導", "#d6e2ee", "#7292b0");

    // Bottom cross-grade footer bar
    fillRoundedCard(c, padX, 845, w - padX * 2, 76, 16, "#4d95a6", "#2c6a7a", 4);
    c.fillStyle = "#ffffff";
    c.font = "bold 30px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("校外教學  ·  專題講座  ·  成果發表  ·  薪火相傳  ·  學科競賽", w / 2, 883);
    c.textBaseline = "alphabetic";
  });

  // 5. Cork Bulletin Board for Latest News (entry-sign.webp)
  const entry = canvasTexture(1120, 780, (c, w, h) => {
    let seed = 91;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    c.fillStyle = "#c99259";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = rand() > 0.5 ? "rgba(150,96,48,0.16)" : "rgba(235,194,142,0.18)";
      c.fillRect(rand() * w, rand() * h, 4 + rand() * 5, 3 + rand() * 4);
    }
    // Inner recessed edge shadow
    c.strokeStyle = "rgba(88, 52, 24, 0.35)";
    c.lineWidth = 18;
    c.strokeRect(9, 9, w - 18, h - 18);

    // Header banner pinned at top center
    fillRoundedCard(c, 190, 32, w - 380, 78, 14, "#245763", "#183944", 4);
    c.fillStyle = "#9cf3d3";
    c.font = "bold 40px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.textAlign = "center";
    c.fillText("最新消息 · NEWS", w / 2, 85);

    const notes = [
      { x: 64, y: 145, w: 465, h: 265, rot: -0.025, bg: "#fff8df", pin: "#e65a5a", tag: "升學捷報", title: "錄取中大壢中數資班", lines: ["兩位應屆畢業生錄取，", "憑全國科展第三名優先錄取"] },
      { x: 585, y: 148, w: 465, h: 265, rot: 0.022, bg: "#ebfcf5", pin: "#3a9ad9", tag: "全國科展", title: "第 66 屆全國科展佳作", lines: ["「贏在氣泡點」微細氣泡管", "榮獲應用科學科（三）佳作"] },
      { x: 70, y: 448, w: 465, h: 265, rot: 0.018, bg: "#eef5ff", pin: "#4ab875", tag: "發明競賽", title: "2026 IEYI 台灣賽雙銅牌", lines: ["「智能提醒櫃」與「自動清洗籠」", "兩件原創作品榮獲銅牌肯定"] },
      { x: 588, y: 444, w: 465, h: 265, rot: -0.02, bg: "#fdf2f8", pin: "#eeb536", tag: "探索指南", title: "點擊閱讀完整公告與聯絡", lines: ["校外探索 · 招生資訊", "線上即時諮詢入口"] },
    ];

    for (const n of notes) {
      c.save();
      c.translate(n.x + n.w / 2, n.y + n.h / 2);
      c.rotate(n.rot);
      // Paper shadow
      fillRoundedCard(c, -n.w / 2 + 8, -n.h / 2 + 10, n.w, n.h, 12, "rgba(62,38,18,0.28)", null);
      // Note card
      fillRoundedCard(c, -n.w / 2, -n.h / 2, n.w, n.h, 12, n.bg, "#3a4c60", 4);
      // Tag chip
      fillRoundedCard(c, -n.w / 2 + 24, -n.h / 2 + 28, 136, 40, 8, n.pin, null);
      c.fillStyle = "#ffffff";
      c.font = "bold 22px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      c.textAlign = "center";
      c.fillText(n.tag, -n.w / 2 + 92, -n.h / 2 + 56);
      // Title
      c.fillStyle = "#223447";
      c.font = "bold 30px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      c.textAlign = "left";
      c.fillText(n.title, -n.w / 2 + 24, -n.h / 2 + 118);
      // Lines
      c.fillStyle = "#4d647a";
      c.font = "23px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
      n.lines.forEach((ln, idx) => {
        c.fillText(ln, -n.w / 2 + 24, -n.h / 2 + 168 + idx * 42);
      });
      // Pushpin at top center
      c.fillStyle = "#1d2a3d";
      c.beginPath();
      c.arc(2, -n.h / 2 + 20, 14, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = n.pin;
      c.beginPath();
      c.arc(0, -n.h / 2 + 16, 13, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.65)";
      c.beginPath();
      c.arc(-4, -n.h / 2 + 12, 4, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  });

  // 6. Learning Moments Photo Wall (photos-board.webp) with 2x2 frames for 16:9 activity photos
  const gallery = canvasTexture(1280, 840, (c, w, h) => {
    c.fillStyle = "#d9ecf7";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#264963";
    c.font = "bold 36px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.textAlign = "left";
    c.fillText("探索紀事 · LEARNING MOMENTS", 56, 62);

    const frames = [
      { cx: 340, cy: 278, col: "#f39e96" },
      { cx: 940, cy: 278, col: "#74d4ae" },
      { cx: 340, cy: 642, col: "#b19ce8" },
      { cx: 940, cy: 642, col: "#72b8f0" },
    ];
    const frameW = 524;
    const frameH = 330;
    for (const f of frames) {
      fillRoundedCard(c, f.cx - frameW / 2, f.cy - frameH / 2, frameW, frameH, 16, f.col, "#2a3e59", 5);
      fillRoundedCard(c, f.cx - 242, f.cy - 148, 484, 296, 10, "#1d3254", "#2a3e59", 3);
    }
  });

  // 7. 16:9 Landscape Kiosk Screen Backdrop (kiosk-screen.webp)
  const kioskScreen = canvasTexture(1024, 576, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#173454");
    grad.addColorStop(0.55, "#214b73");
    grad.addColorStop(1, "#1e657a");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);

    // Subtle UI grid lines
    c.strokeStyle = "rgba(155, 232, 240, 0.10)";
    c.lineWidth = 2;
    for (let x = 64; x < w; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 64; y < h; y += 64) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }

    // Left clean badge area for logo-2025.webp
    fillRoundedCard(c, 52, 72, 368, 432, 24, "#ffffff", "#7ae4c6", 5);

    // Right video CTA card
    fillRoundedCard(c, 456, 72, 516, 432, 24, "rgba(18, 35, 58, 0.58)", "rgba(146, 238, 220, 0.45)", 3);

    // Glowing play circle
    c.fillStyle = "rgba(104, 236, 198, 0.22)";
    c.beginPath();
    c.arc(714, 218, 86, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#62dfb0";
    c.strokeStyle = "#dffef4";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(714, 218, 66, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Play triangle
    c.fillStyle = "#163047";
    c.beginPath();
    c.moveTo(695, 184);
    c.lineTo(750, 218);
    c.lineTo(695, 252);
    c.closePath();
    c.fill();

    // Title & CTA button
    c.fillStyle = "#f2fbff";
    c.textAlign = "center";
    c.font = "bold 40px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.fillText("平興數資・探索教室", 714, 354);
    c.fillStyle = "#9ee9db";
    c.font = "24px sans-serif";
    c.fillText("GIFTED CLASS INTRO VIDEO", 714, 396);

    fillRoundedCard(c, 548, 424, 332, 50, 25, "#316e8a", "#8ef1d5", 2.5);
    c.fillStyle = "#ffffff";
    c.font = "bold 24px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    c.fillText("點擊播放介紹影片", 714, 457);
  });

  return {
    floor,
    "solar-back.webp": solarMuralBack,
    "solar-right.webp": solarMuralRight,
    "blackboard.webp": blackboard,
    "courses-board.webp": courses,
    "entry-sign.webp": entry,
    "photos-board.webp": gallery,
    "kiosk-screen.webp": kioskScreen,
  };
}
