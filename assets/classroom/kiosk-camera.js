// Each row matches a landmark in the panorama to the same landmark in the front view.
const landmarks = [
  [0, 0, 0, 0], [300, 0, 520, 0], [575, 0, 1090, 0], [938, 0, 1540, 0],
  [1672, 0, 1672, 0], [1672, 480, 1672, 490], [1672, 941, 1672, 941], [895, 941, 1450, 941],
  [540, 941, 1080, 941], [200, 941, 500, 941], [0, 941, 0, 941], [0, 450, 0, 405],
  [43, 302, 158, 117], [101, 306, 263, 130], [103, 441, 265, 345], [45, 444, 156, 351],
  [120, 410, 430, 224], [241, 403, 626, 222], [292, 690, 644, 631], [166, 717, 420, 643],
  [112, 851, 399, 822], [295, 818, 653, 795], [293, 855, 658, 861], [111, 884, 397, 863],
  [154, 194, 336, 77], [360, 235, 763, 81], [570, 285, 1146, 157], [569, 475, 1148, 417],
  [368, 482, 765, 428], [146, 542, 331, 455], [284, 576, 654, 524], [548, 541, 1132, 479],
  [546, 652, 1121, 608], [378, 757, 790, 752], [657, 323, 1271, 215], [928, 314, 1642, 191],
  [937, 478, 1656, 405], [650, 481, 1268, 404], [772, 677, 1258, 646], [1260, 682, 1666, 584],
  [1150, 759, 1670, 759], [155, 434, 444, 265], [242, 436, 618, 265], [278, 655, 617, 586],
  [194, 672, 443, 588], [219, 550, 535, 427], [199, 422, 532, 242], [242, 684, 534, 614],
  [23, 730, 45, 615], [362, 338, 764, 230], [570, 382, 1147, 310],
];
const triangles = [
  [25, 1, 2], [35, 3, 4], [3, 34, 2], [50, 34, 37], [35, 34, 3], [5, 39, 37],
  [31, 32, 28], [11, 48, 10], [23, 9, 10], [26, 25, 2], [34, 26, 2], [26, 34, 50],
  [1, 24, 0], [12, 11, 0], [24, 12, 0], [12, 24, 13], [25, 17, 1], [17, 46, 1],
  [5, 36, 4], [36, 35, 4], [36, 5, 37], [34, 36, 37], [36, 34, 35], [38, 7, 8],
  [32, 38, 8], [39, 38, 37], [38, 31, 37], [31, 38, 32], [7, 40, 6], [40, 5, 6],
  [40, 39, 5], [38, 40, 7], [40, 38, 39], [50, 27, 28], [27, 31, 28], [27, 50, 37],
  [31, 27, 37], [19, 48, 29], [49, 26, 50], [26, 49, 25], [49, 50, 28], [49, 17, 25],
  [12, 15, 11], [48, 15, 29], [15, 48, 11], [15, 12, 13], [19, 20, 48], [20, 23, 10],
  [48, 20, 10], [20, 19, 47], [20, 9, 23], [44, 19, 29], [19, 44, 47], [17, 42, 46],
  [42, 49, 28], [49, 42, 17], [43, 18, 47], [14, 15, 13], [14, 41, 29], [15, 14, 29],
  [41, 45, 29], [45, 44, 29], [45, 43, 47], [44, 45, 47], [45, 41, 46], [42, 45, 46],
  [45, 42, 28], [9, 22, 8], [16, 14, 13], [14, 16, 41], [24, 16, 13], [41, 16, 46],
  [46, 16, 1], [16, 24, 1], [30, 45, 28], [45, 30, 43], [30, 18, 43], [33, 32, 8],
  [22, 33, 8], [32, 33, 28], [33, 30, 28], [30, 33, 18], [33, 21, 18], [21, 33, 22],
  [18, 21, 47], [21, 20, 47], [20, 21, 9], [21, 22, 9],
];
const views = [0, 2].map(index => landmarks.map(point => point.slice(index, index + 2)));
const width = 1672;
const height = 941;
const mix = (a, b, t) => a + (b - a) * t;

function warp(context, image, points, destination) {
  for (const [i, j, k] of triangles) {
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
    const a = (dx * vy - ex * uy) / determinant;
    const b = (dy * vy - ey * uy) / determinant;
    const c = (ex * ux - dx * vx) / determinant;
    const d = (ey * ux - dy * vx) / determinant;

    context.save();
    context.beginPath();
    // Expand the clip slightly to cover antialiased seams between triangles.
    const vertices = [destination[i], destination[j], destination[k]];
    const centerX = (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3;
    const centerY = (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3;
    for (const [x, y] of vertices) {
      const amount = .65 / Math.max(1, Math.hypot(x - centerX, y - centerY));
      context.lineTo(x + (x - centerX) * amount, y + (y - centerY) * amount);
    }
    context.closePath();
    context.clip();
    context.transform(a, b, c, d, p - a * x - c * y, q - b * x - d * y);
    context.drawImage(image, 0, 0, width, height);
    context.restore();
  }
}

export function createKioskCamera(viewport, panorama) {
  const canvas = document.createElement("canvas");
  canvas.className = "kiosk-camera";
  canvas.setAttribute("aria-hidden", "true");
  canvas.hidden = true;
  viewport.append(canvas);
  const context = canvas.getContext("2d");
  const layer = document.createElement("canvas");
  const buffer = layer.getContext("2d");
  const front = new Image();
  front.src = new URL("room/kiosk-front.webp", import.meta.url).href;
  let pending;
  let ready = false;
  let frame = 0;
  let progress = 0;

  Promise.all([panorama.decode(), front.decode()]).then(() => {
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
    const scale = Math.max(w / width, h / height);
    const left = Math.max(w - width * scale, Math.min(0, w / 2 - 530 * scale));
    const top = (h - height * scale) / 2;
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    context.clearRect(0, 0, w, h);
    if (t === 1) {
      context.drawImage(front, left, top, width * scale, height * scale);
      return;
    }
    const destination = landmarks.map(([x, y, u, v]) => [
      mix(source.left + x * source.width / width, left + u * scale, t),
      mix(source.top + y * source.height / height, top + v * scale, t),
    ]);
    // Blend in a short interval to limit double edges where the illustrations differ.
    const blend = Math.max(0, Math.min(1, (t - .41) / .23));
    if (blend === 1) {
      warp(context, front, views[1], destination);
      return;
    }
    warp(context, panorama, views[0], destination);
    if (!blend) return;
    buffer.setTransform(resolution, 0, 0, resolution, 0, 0);
    buffer.clearRect(0, 0, w, h);
    warp(buffer, front, views[1], destination);
    context.globalAlpha = blend * blend * (3 - 2 * blend);
    context.drawImage(layer, 0, 0, w, h);
    context.globalAlpha = 1;
  }

  function update(show, duration, source) {
    pending = show ? [show, duration, source] : null;
    if (!ready || !context || !buffer) return;
    cancelAnimationFrame(frame);
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

