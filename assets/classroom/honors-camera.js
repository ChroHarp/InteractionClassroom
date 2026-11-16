// Dual-layer 3D projection for the Honors Board transition:
// Layer 1 (roomLandmarks): collinear right-wall perspective planes + surrounding room.
// Layer 2 (cabinetLandmarks): independent foreground 3D Maker Cabinet box + potted plant
// with back-face-culled side faces so the cabinet stays rigid without warping into the wall.

const width = 1672;
const height = 941;
const boardCenterX = 835.5;
const boardCenterY = 465.5;
const boardWidth = 829;
const boardHeight = 397;
const wallDepth = 0.79;

// Format: [panoramaX, panoramaY, frontX, frontY, relativeDepthZ]
// Indices 0..34 form a 7x5 rectilinear grid covering [0..1672, 0..941] on honors-front.webp.
const roomLandmarks = [
  // Row 0: uy = 0 (indices 0..4)
  [972, 155, 0, 0, 0.92], [1114, 130, 421, 0, 0.84], [1255, 102, 835, 0, 0.77], [1423, 66, 1250, 0, 0.7], [1672, 20, 1672, 0, 0.58],
  // Row 1: uy = 95 ceiling-wall junction (5..9)
  [972, 260, 0, 95, 0.94], [1114, 249, 421, 95, 0.86], [1255, 232, 835, 95, 0.79], [1423, 211, 1250, 95, 0.72], [1672, 180, 1672, 95, 0.58],
  // Row 2: uy = 267 honors top line (10..14)
  [972, 317, 0, 267, 0.94], [1114, 307, 421, 267, 0.86], [1255, 297, 835, 267, 0.79], [1423, 286, 1250, 267, 0.72], [1672, 269, 1672, 267, 0.58],
  // Row 3: uy = 465 honors midline (15..19)
  [972, 401, 0, 465, 0.94], [1114, 399, 421, 465, 0.86], [1255, 397, 835, 465, 0.79], [1423, 394, 1250, 465, 0.72], [1672, 390, 1672, 465, 0.58],
  // Row 4: uy = 664 wainscoting top line (20..24)
  [972, 486, 0, 664, 0.94], [1114, 491, 421, 664, 0.86], [1255, 496, 835, 664, 0.79], [1423, 502, 1250, 664, 0.72], [1672, 514, 1672, 664, 0.58],
  // Row 5: uy = 882 wall baseboard line (25..29)
  [972, 562, 0, 882, 0.94], [1114, 582, 421, 882, 0.86], [1255, 602, 835, 882, 0.79], [1423, 626, 1250, 882, 0.72], [1672, 662, 1672, 882, 0.58],
  // Row 6: uy = 941 front bottom edge (30..34)
  [972, 592, 0, 941, 0.92], [1114, 612, 421, 941, 0.84], [1255, 634, 835, 941, 0.77], [1423, 660, 1250, 941, 0.7], [1672, 700, 1672, 941, 0.58],
  // Outer panorama extensions (35..52) for full-frame 3D parallax sweep
  [0, 0, -2600, -450, 0.65], [500, 0, -1300, -240, 0.85], [972, 0, 0, -420, 0.92], [1114, 0, 421, -340, 0.84],
  [1255, 0, 835, -260, 0.77], [1423, 0, 1250, -170, 0.7], [1672, 0, 1672, -55, 0.58], [0, 470, -2600, 620, 0.65],
  [643, 318, -920, 260, 1.0], [643, 481, -920, 635, 1.0], [940, 263, -100, 95, 0.96], [940, 481, -100, 664, 0.96],
  [780, 560, -560, 882, 0.72], [1034, 675, 185, 1200, 0.56], [0, 941, -2700, 2000, 0.48], [750, 941, -780, 2100, 0.46],
  [1255, 941, 835, 2050, 0.46], [1672, 941, 1672, 1650, 0.48],
];

const ROOM_FRONT_TRIANGLES = 48;
const roomTriangles = [
  [0, 1, 6], [0, 6, 5], [1, 2, 7], [1, 7, 6], [2, 3, 8], [2, 8, 7], [3, 4, 9], [3, 9, 8],
  [5, 6, 11], [5, 11, 10], [6, 7, 12], [6, 12, 11], [7, 8, 13], [7, 13, 12], [8, 9, 14], [8, 14, 13],
  [10, 11, 16], [10, 16, 15], [11, 12, 17], [11, 17, 16], [12, 13, 18], [12, 18, 17], [13, 14, 19], [13, 19, 18],
  [15, 16, 21], [15, 21, 20], [16, 17, 22], [16, 22, 21], [17, 18, 23], [17, 23, 22], [18, 19, 24], [18, 24, 23],
  [20, 21, 26], [20, 26, 25], [21, 22, 27], [21, 27, 26], [22, 23, 28], [22, 28, 27], [23, 24, 29], [23, 29, 28],
  [25, 26, 31], [25, 31, 30], [26, 27, 32], [26, 32, 31], [27, 28, 33], [27, 33, 32], [28, 29, 34], [28, 34, 33],
  [37, 38, 1], [37, 1, 0], [38, 39, 2], [38, 2, 1], [39, 40, 3], [39, 3, 2], [40, 41, 4], [40, 4, 3],
  [35, 36, 43], [36, 37, 43], [37, 45, 43], [37, 0, 45], [45, 0, 5], [35, 43, 42], [42, 43, 44], [43, 45, 46],
  [43, 46, 44], [45, 5, 10], [45, 10, 46], [46, 10, 15], [46, 15, 20], [46, 20, 25], [46, 25, 30], [42, 44, 49],
  [44, 47, 49], [44, 46, 47], [46, 30, 47], [47, 50, 49], [47, 30, 48], [47, 48, 50], [30, 31, 48], [31, 32, 48],
  [48, 32, 51], [48, 51, 50], [32, 33, 51], [33, 34, 51], [34, 52, 51],
];

// Layer 2: Foreground 3D Maker Cabinet box + potted plant (depth z = 0.52..0.60)
const cabinetLandmarks = [
  // Back-top edge (0..3)
  [1365, 488, 1262, 620, 0.6], [1465, 498, 1396, 620, 0.59], [1555, 508, 1532, 620, 0.58], [1652, 518, 1668, 620, 0.56],
  // Plant crown top edge (4..6)
  [1522, 442, 1515, 542, 0.59], [1585, 442, 1592, 542, 0.58], [1652, 442, 1668, 542, 0.56],
  // Front-top edge (7..10)
  [1296, 515, 1286, 646, 0.56], [1410, 524, 1412, 646, 0.55], [1505, 532, 1538, 646, 0.54], [1612, 540, 1666, 646, 0.53],
  // Front-bottom edge (11..14)
  [1296, 704, 1286, 940, 0.55], [1410, 720, 1412, 940, 0.54], [1505, 738, 1538, 940, 0.53], [1612, 758, 1666, 940, 0.52],
  // Side-back-bottom corners (15..16)
  [1365, 672, 1262, 915, 0.59], [1652, 738, 1668, 915, 0.55],
];

const cabinetMainTriangles = [
  [1, 4, 2], [4, 5, 2], [2, 5, 3], [5, 6, 3],
  [0, 1, 8], [0, 8, 7], [1, 2, 9], [1, 9, 8], [2, 3, 10], [2, 10, 9],
  [7, 8, 12], [7, 12, 11], [8, 9, 13], [8, 13, 12], [9, 10, 14], [9, 14, 13],
];
const cabinetRightSideTriangles = [[10, 3, 16], [10, 16, 14]];
const cabinetLeftSideTriangles = [[0, 7, 11], [0, 11, 15]];

const roomFrontTriangles = roomTriangles.slice(0, ROOM_FRONT_TRIANGLES);
const roomViews = [0, 2].map(index => roomLandmarks.map(point => point.slice(index, index + 2)));
const cabinetViews = [0, 2].map(index => cabinetLandmarks.map(point => point.slice(index, index + 2)));

const mix = (a, b, t) => a + (b - a) * t;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const panoWainY = x => 493 + (514 - 493) * ((x - 1150) / (1665 - 1150));
const panoBaseY = x => 587.5 + 0.14286 * (x - 1150);

function makeCanvas(w = width, h = height) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")];
}

function copyPixel(dst, sx, sy, dx, dy) {
  const s = (sy * width + sx) * 4;
  const d = (dy * width + dx) * 4;
  dst[d] = dst[s];
  dst[d + 1] = dst[s + 1];
  dst[d + 2] = dst[s + 2];
  dst[d + 3] = 255;
}

function copyPixelFrom(src, dst, sx, sy, dx, dy) {
  const s = (sy * width + sx) * 4;
  const d = (dy * width + dx) * 4;
  dst[d] = src[s];
  dst[d + 1] = src[s + 1];
  dst[d + 2] = src[s + 2];
  dst[d + 3] = 255;
}

function buildCleanPanorama(src) {
  const [canvas, ctx] = makeCanvas();
  ctx.drawImage(src, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const out = imgData.data;
  const raw = new Uint8ClampedArray(out);
  const refX0 = 1170;
  const refW = 100;

  for (let x = 1303; x < width; x++) {
    const rxOff = (x - 1303) % (2 * refW);
    const rx = refX0 + (rxOff < refW ? rxOff : 2 * refW - 1 - rxOff);
    const rxWain = panoWainY(rx);
    const rxBase = panoBaseY(rx);
    const txWain = Math.round(panoWainY(x));
    const txBase = Math.round(panoBaseY(x));
    const yBtop = txBase - 5;
    const yBbot = txBase + 7;

    if (x >= 1335 && x <= 1424) {
      const sxFrame = 1218 + ((x - 1335) % 24);
      const dyFr = Math.round(0.0356 * (x - sxFrame));
      for (let y = 485; y <= txWain; y++) {
        const sy = clamp(y - dyFr, 480, 506);
        copyPixelFrom(raw, out, sxFrame, sy, x, y);
      }
    } else if (x >= 1425 && x < 1520) {
      const sxW = 1426 + (x % 5);
      for (let y = 486; y < txWain; y++) {
        copyPixelFrom(raw, out, sxW, Math.min(498, y), x, y);
      }
    } else if (x >= 1520 && x <= 1654) {
      const sxPb = 1516 + (x % 5);
      const dyPb = Math.round(-0.017 * (x - sxPb));
      for (let y = 442; y < txWain; y++) {
        const sy = clamp(y - dyPb, 440, 504);
        if (sy < 470) {
          copyPixelFrom(raw, out, sxPb, sy, x, y);
        } else {
          const wy = 474 + Math.floor(((y - 470) * 22) / Math.max(1, txWain - 470));
          copyPixelFrom(raw, out, 1440 + (x % 40), Math.min(496, wy), x, y);
        }
      }
    }

    if (x < 1656) {
      for (let y = txWain; y < yBtop; y++) {
        const frac = (y - txWain) / Math.max(1, yBtop - txWain);
        const sy = Math.round(rxWain + frac * (rxBase - 5 - rxWain));
        copyPixelFrom(raw, out, rx, sy, x, y);
      }
      for (let y = yBtop; y < yBbot; y++) {
        const frac = (y - yBtop) / Math.max(1, yBbot - yBtop);
        const sy = Math.round(rxBase - 5 + frac * 12);
        copyPixelFrom(raw, out, rx, sy, x, y);
      }
      const floorEnd = Math.round(702 + (56 * (x - 1303)) / 353);
      const fw = 26;
      const foff = (x - 1303) % (2 * fw);
      const fx = 1300 - (foff < fw ? foff : 2 * fw - 1 - foff);
      const fxBase = Math.round(panoBaseY(fx)) + 7;
      for (let y = yBbot; y < floorEnd; y++) {
        const sy = Math.min(684, fxBase + ((y - yBbot) % 72));
        copyPixelFrom(raw, out, fx, sy, x, y);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function buildCleanFront(src) {
  const [canvas, ctx] = makeCanvas();
  ctx.drawImage(src, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const out = imgData.data;
  const wallX0 = 350;
  const wallW = 68;
  const wainX0 = 1120;
  const wainW = 125;

  for (let x = 1258; x < width; x++) {
    if (x >= 1510) {
      const pxSrc = 1320 + ((x - 1510) % 140);
      for (let y = 540; y < 580; y++) copyPixel(out, pxSrc, y, x, y);
    }
    const wxOff = (x - 1258) % (2 * wallW);
    const wx = wallX0 + (wxOff < wallW ? wxOff : 2 * wallW - 1 - wxOff);
    for (let y = 580; y < 664; y++) copyPixel(out, wx, y, x, y);

    const rxOff = (x - 1258) % (2 * wainW);
    const rx = wainX0 + (rxOff < wainW ? rxOff : 2 * wainW - 1 - rxOff);
    for (let y = 664; y < height; y++) copyPixel(out, rx, y, x, y);
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function buildCabinetLayer(src, bodyPoly, plantBox, potBox) {
  const [maskCanvas, maskCtx] = makeCanvas();
  maskCtx.fillStyle = "#fff";
  maskCtx.beginPath();
  bodyPoly.forEach(([x, y], index) => (index === 0 ? maskCtx.moveTo(x, y) : maskCtx.lineTo(x, y)));
  maskCtx.closePath();
  maskCtx.fill();

  const [canvas, ctx] = makeCanvas();
  ctx.drawImage(src, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height).data;
  const data = imgData.data;

  const [px0, py0, px1, py1] = plantBox;
  const [ux0, uy0, ux1, uy1] = potBox;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let alpha = maskData[i + 3];
      if (!alpha && x >= px0 && x < px1 && y >= py0 && y < py1) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (r + g + b) / 3;
        const isLeaf = (g >= r + 4 && g >= b - 3) || (lum < 105 && b <= g + 12);
        const inPot = x >= ux0 && x < ux1 && y >= uy0 && y < uy1 && lum > 165 && Math.abs(r - b) < 22;
        if (isLeaf || inPot) alpha = 255;
      }
      data[i + 3] = alpha;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function buildSceneLayers(panorama, front) {
  const panoBodyPoly = [
    [1299, 515], [1365, 488], [1530, 504], [1652, 518],
    [1652, 738], [1630, 738], [1630, 730], [1614, 744],
    [1614, 756], [1592, 756], [1592, 742],
    [1322, 690], [1322, 702], [1302, 702], [1299, 688],
  ];
  const frontBodyPoly = [
    [1262, 620], [1670, 620], [1670, 938], [1644, 938], [1644, 926],
    [1312, 926], [1312, 938], [1286, 938], [1286, 924], [1262, 914],
  ];
  return {
    cleanPanorama: buildCleanPanorama(panorama),
    cleanFront: buildCleanFront(front),
    panoCabinet: buildCabinetLayer(panorama, panoBodyPoly, [1522, 442, 1650, 522], [1568, 490, 1618, 520]),
    frontCabinet: buildCabinetLayer(front, frontBodyPoly, [1512, 542, 1668, 624], [1582, 584, 1638, 622]),
  };
}

function warp(context, image, points, destination, list) {
  for (const [i, j, k] of list) {
    const [x, y] = points[i];
    const ux = points[j][0] - x;
    const uy = points[j][1] - y;
    const vx = points[k][0] - x;
    const vy = points[k][1] - y;
    const [p, q] = destination[i];
    const dx = destination[j][0] - p;
    const dy = destination[j][1] - q;
    const ex = destination[k][0] - p;
    const ey = destination[k][1] - q;
    const determinant = ux * vy - vx * uy;
    if (Math.abs(determinant) < 1e-4) continue;
    const a = (dx * vy - ex * uy) / determinant;
    const b = (dy * vy - ey * uy) / determinant;
    const c = (ex * ux - dx * vx) / determinant;
    const d = (ey * ux - dy * vx) / determinant;

    context.save();
    context.beginPath();
    const vertices = [destination[i], destination[j], destination[k]];
    const centerX = (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3;
    const centerY = (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3;
    for (const [vx0, vy0] of vertices) {
      const amount = 0.65 / Math.max(1, Math.hypot(vx0 - centerX, vy0 - centerY));
      context.lineTo(vx0 + (vx0 - centerX) * amount, vy0 + (vy0 - centerY) * amount);
    }
    context.closePath();
    context.clip();
    context.transform(a, b, c, d, p - a * x - c * y, q - b * x - d * y);
    context.drawImage(image, 0, 0, width, height);
    context.restore();
  }
}

function targetPose(w, h) {
  const narrow = w <= 720;
  const coverScale = Math.max(w / width, h / height);
  if (narrow) {
    const fitWidth = (0.94 * w) / boardWidth;
    const fitHeight = (0.42 * h) / boardHeight;
    const scale = Math.max(w / width, Math.min(fitWidth, fitHeight, coverScale));
    const left = clamp(w * 0.5 - boardCenterX * scale, w - width * scale, 0);
    const headerBottom = h < 520 ? 50 : 94;
    const idealTop = headerBottom + 4 - 267 * scale;
    const minTop = h - height * scale;
    const top = minTop >= 0 ? 0 : clamp(idealTop, minTop, 0);
    return { left, top, scale };
  }
  const fitWidth = (0.65 * w) / boardWidth;
  const fitHeight = (0.72 * Math.max(200, h - 140)) / boardHeight;
  const scale = Math.max(coverScale, Math.min(fitWidth, fitHeight));
  const left = clamp(w * 0.34 - boardCenterX * scale, w - width * scale, 0);
  const top = clamp(h * 0.48 - boardCenterY * scale, h - height * scale, 0);
  return { left, top, scale };
}

function projectPoints(list, source, left, top, scale, t, lockEdges) {
  const arc = Math.sin(Math.PI * t);
  const parallaxScale = scale * arc;
  return list.map(([px, py, ux, uy, z]) => {
    const sx0 = source.left + (px * source.width) / width;
    const sy0 = source.top + (py * source.height) / height;
    const sx1 = left + ux * scale;
    const sy1 = top + uy * scale;
    const tp = t > 0 && t < 1 ? (t / wallDepth) / ((1 - t) / z + t / wallDepth) : t;
    const depthOffset = 1 / z - 1 / wallDepth;
    const edgeX = lockEdges && (px === 0 || px === width) ? 0 : 1;
    const edgeY = lockEdges && (py === 0 || py === height) ? 0 : 1;
    const dx = -55 * parallaxScale * depthOffset * edgeX;
    const dy = 35 * parallaxScale * depthOffset * edgeY;
    return [mix(sx0, sx1, tp) + dx, mix(sy0, sy1, tp) + dy];
  });
}

function featherEdges(buffer, destination, w, h) {
  const [leftTopX] = destination[0];
  const [, bottomY] = destination[32];
  buffer.save();
  buffer.globalCompositeOperation = "destination-in";
  if (leftTopX > 2) {
    const grad = buffer.createLinearGradient(leftTopX - 4, 0, leftTopX + 28, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    buffer.fillStyle = grad;
    buffer.fillRect(0, 0, w, h);
  }
  if (bottomY < h - 2) {
    const grad = buffer.createLinearGradient(0, bottomY - 28, 0, bottomY + 4);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    buffer.fillStyle = grad;
    buffer.fillRect(0, 0, w, h);
  }
  buffer.restore();
}

/** Creates the dual-layer 3D-perspective and depth-parallax transition canvas for the Honors Board. */
export function createHonorsCamera(viewport, panorama) {
  const canvas = document.createElement("canvas");
  canvas.className = "honors-camera";
  canvas.setAttribute("aria-hidden", "true");
  canvas.hidden = true;
  viewport.append(canvas);
  const context = canvas.getContext("2d");
  const layer = document.createElement("canvas");
  const buffer = layer.getContext("2d");
  const front = new Image();
  front.src = new URL("room/honors-front.webp", import.meta.url).href;
  let layers = null;
  let pending;
  let ready = false;
  let frame = 0;
  let progress = 0;

  Promise.all([panorama.decode(), front.decode()]).then(() => {
    try {
      layers = buildSceneLayers(panorama, front);
    } catch {
      layers = null;
    }
    ready = true;
    if (pending) update(...pending);
  }, () => {});

  function draw(source, t) {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    const resolution = Math.min(devicePixelRatio, 1.5);
    const pixelWidth = Math.round(w * resolution);
    const pixelHeight = Math.round(h * resolution);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = layer.width = pixelWidth;
      canvas.height = layer.height = pixelHeight;
    }
    const { left, top, scale } = targetPose(w, h);
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.clearRect(0, 0, w, h);
    if (t === 1) {
      context.drawImage(front, left, top, width * scale, height * scale);
      return;
    }

    const roomDst = projectPoints(roomLandmarks, source, left, top, scale, t, true);
    const cabDst = projectPoints(cabinetLandmarks, source, left, top, scale, t, false);
    const rawBlend = clamp((t - 0.68) / 0.2, 0, 1);
    const blend = rawBlend * rawBlend * (3 - 2 * rawBlend);
    const bgPano = layers?.cleanPanorama ?? panorama;
    const bgFront = layers?.cleanFront ?? front;

    // Layer 1: Background room plane (collinear wall + floor)
    warp(context, bgPano, roomViews[0], roomDst, roomTriangles);
    if (blend > 0) {
      buffer.setTransform(resolution, 0, 0, resolution, 0, 0);
      buffer.clearRect(0, 0, w, h);
      warp(buffer, bgFront, roomViews[1], roomDst, roomFrontTriangles);
      if (t < 0.92) featherEdges(buffer, roomDst, w, h);
      context.globalAlpha = blend;
      context.drawImage(layer, 0, 0, w, h);
      context.globalAlpha = 1;
    }

    // Layer 2: Foreground 3D Maker Cabinet box with back-face-culled side faces
    if (!layers) return;
    const showRightSide = cabDst[3][0] > cabDst[10][0] + 0.5;
    const showLeftSide = cabDst[0][0] < cabDst[7][0] - 0.5;

    if (blend < 1) {
      if (showRightSide) {
        context.globalAlpha = 1 - blend;
        warp(context, layers.panoCabinet, cabinetViews[0], cabDst, cabinetRightSideTriangles);
        context.globalAlpha = 1;
      }
      warp(context, layers.panoCabinet, cabinetViews[0], cabDst, cabinetMainTriangles);
    }
    if (blend > 0) {
      buffer.setTransform(resolution, 0, 0, resolution, 0, 0);
      buffer.clearRect(0, 0, w, h);
      if (showLeftSide) {
        warp(buffer, layers.frontCabinet, cabinetViews[1], cabDst, cabinetLeftSideTriangles);
      }
      warp(buffer, layers.frontCabinet, cabinetViews[1], cabDst, cabinetMainTriangles);
      context.globalAlpha = blend;
      context.drawImage(layer, 0, 0, w, h);
      context.globalAlpha = 1;
    }
  }

  function update(show, duration, source) {
    pending = show ? [show, duration, source] : null;
    if (!ready || !context || !buffer) return;
    cancelAnimationFrame(frame);
    canvas.style.zIndex = show ? "1" : "";
    if (!show && progress === 0) {
      canvas.hidden = true;
      return;
    }
    const from = progress;
    const to = Number(show);
    const start = performance.now();

    function render(now) {
      const elapsed = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      progress = mix(from, to, eased);
      canvas.hidden = progress === 0;
      if (!canvas.hidden) draw(source, progress);
      if (elapsed < 1) frame = requestAnimationFrame(render);
    }
    render(start);
  }

  return { update };
}
