/* ============================================================================
   Coding with Koda  -  shared 3D problem viewer
   ----------------------------------------------------------------------------
   Classic script (no imports). Each course page loads three.js as an ES module
   and calls StaticsApp.start({THREE, OrbitControls, CSS2DRenderer, CSS2DObject}).
   Problems are described declaratively in each course's problems.js; this file turns those
   descriptions into a scene. You should not need to touch this file to add or
   edit a problem. See README.md for the element reference.
   ========================================================================== */
(function () {
  'use strict';

  const App = {};
  window.StaticsApp = App;

  let THREE, OrbitControls, CSS2DRenderer, CSS2DObject;
  let renderer, labelRenderer, scene, camera, persp, ortho, controls;
  let container, sceneRoot, groundGroup;
  let problem = null;          // current problem object
  let built = null;            // { pts, elements:[{group, kind, step, layer}], forces:[...] }
  let params = {};             // current parameter values
  let stepIndex = 1;
  let fbdIndex = -1;           // -1 = full structure, i = fbd list index
  let layersOn = {};
  let fScale = 1;              // scene units per force unit
  let S = {};                  // size table derived from problem.extent
  let labelObjs = [];
  let overlayGroup = null;     // components / resultant
  let rafPending = false;

  const opts = { axes: true, grid: true, dims: true, labels: true,
                 components: false, resultant: false, coords: false, ortho: false };

  const COLORS = {
    force: 0x1f3a93, force2: 0xb03a2e, unknown: 0x7a7a7a, resultant: 0x555555,
    cable: 0x8c6b3f, strut: 0x3f7cc4, spring: 0x6b7b8c, dim: 0x505050, angle: 0x505050,
    guide: 0x6a6a6a, point: 0x222222, x: 0xc0392b, y: 0x1e8449, z: 0x1f5fbf,
    ground: 0xdfe6ee, wall: 0xd9c3a3, weight: 0xa87c4f, plane: 0x5dade2, eyebolt: 0xb59a43
  };
  const AXIS = { x:[1,0,0], '+x':[1,0,0], '-x':[-1,0,0], y:[0,1,0], '+y':[0,1,0], '-y':[0,-1,0],
                 z:[0,0,1], '+z':[0,0,1], '-z':[0,0,-1] };

  /* ------------------------------------------------------------ helpers */
  const V = (a) => Array.isArray(a) ? new THREE.Vector3(a[0], a[1], a[2] || 0)
                 : (a && a.isVector3 ? a.clone() : new THREE.Vector3());
  function P(ref, pts) {
    if (typeof ref === 'string') {
      if (!(ref in pts)) throw new Error('Unknown point "' + ref + '"');
      return V(pts[ref]);
    }
    return V(ref);
  }
  function dirOf(spec, pts, origin) {
    if (typeof spec === 'string') {
      if (AXIS[spec]) return V(AXIS[spec]);
      return P(spec, pts).sub(origin).normalize();           // point name = toward that point
    }
    if (Array.isArray(spec)) return V(spec).normalize();
    if (spec.toward) {
      const from = spec.from ? P(spec.from, pts) : origin;
      return P(spec.toward, pts).sub(from).normalize();
    }
    if (spec.angles) {                                        // coordinate direction angles (deg)
      const c = spec.angles.map(v => (v == null ? null : Math.cos(v * Math.PI / 180)));
      const i = c.indexOf(null);
      if (i >= 0) {
        const rest = c.reduce((acc, v) => acc + (v == null ? 0 : v * v), 0);
        c[i] = (spec.sign == null ? 1 : spec.sign) * Math.sqrt(Math.max(0, 1 - rest));
      }
      return V(c).normalize();
    }
    if (spec.azel) {                                          // azimuth in xy-plane + elevation
      const a = spec.azel;
      const base = V(AXIS[a.from || '+x']), tw = V(AXIS[a.toward || '+y']);
      const az = a.az * Math.PI / 180, el = (a.el || 0) * Math.PI / 180;
      const h = base.multiplyScalar(Math.cos(az)).add(tw.multiplyScalar(Math.sin(az)));
      return h.multiplyScalar(Math.cos(el)).add(new THREE.Vector3(0, 0, Math.sin(el))).normalize();
    }
    if (spec.planar) {                                        // angle from one axis toward another
      const p = spec.planar;
      const base = V(AXIS[p.from]), tw = V(AXIS[p.toward]);
      const a = p.angle * Math.PI / 180;
      return base.multiplyScalar(Math.cos(a)).add(tw.multiplyScalar(Math.sin(a))).normalize();
    }
    if (spec.slope) return new THREE.Vector3(spec.slope[0], spec.slope[1], spec.slope[2] || 0).normalize();
    throw new Error('Bad direction spec: ' + JSON.stringify(spec));
  }
  function mat(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.62, metalness: 0.05 }, extra || {}));
  }
  function downVec() { return V(problem.down || (problem.view === '2d' ? [0, -1, 0] : [0, 0, -1])); }

  /* ------------------------------------------------------------ primitives */
  function cylinderBetween(a, b, r, material, segs) {
    const d = b.clone().sub(a); const len = d.length();
    if (len < 1e-9) return new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, segs || 14, 1), material);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function cone(base, dir, len, r, material) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, 18), material);
    const d = dir.clone().normalize();
    m.position.copy(base).add(d.clone().multiplyScalar(len / 2));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    return m;
  }
  function lineSeg(a, b, color, o) {
    o = o || {};
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const m = o.dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: o.dash || S.dash, gapSize: o.gap || S.gap,
                                       transparent: true, opacity: o.opacity == null ? 1 : o.opacity })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: o.opacity == null ? 1 : o.opacity });
    const l = new THREE.Line(g, m);
    if (o.dashed) l.computeLineDistances();
    return l;
  }
  function polyline(points, color, o) {
    o = o || {};
    const g = new THREE.BufferGeometry().setFromPoints(points);
    const m = o.dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: S.dash, gapSize: S.gap })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: o.opacity == null ? 1 : o.opacity });
    const l = new THREE.Line(g, m);
    if (o.dashed) l.computeLineDistances();
    return l;
  }
  function arrow(from, dir, len, o) {
    o = o || {};
    const grp = new THREE.Group();
    const d = dir.clone().normalize();
    const headLen = o.headLen || Math.min(len * 0.4, S.head * (o.small ? 0.6 : 1));
    const headR = o.headR || S.headR * (o.small ? 0.6 : 1);
    const r = o.r || S.arrowR * (o.small ? 0.6 : 1);
    const shaftLen = Math.max(len - headLen, 1e-4);
    const neck = from.clone().add(d.clone().multiplyScalar(shaftLen));
    if (o.dashed) {                                   // dashed shaft built from short cylinders
      const m = mat(o.color); const dash = S.dash * 1.1, gap = S.gap * 1.1; let t = 0;
      while (t < shaftLen) {
        const a = from.clone().add(d.clone().multiplyScalar(t));
        const b = from.clone().add(d.clone().multiplyScalar(Math.min(t + dash, shaftLen)));
        grp.add(cylinderBetween(a, b, r * 0.8, m, 8)); t += dash + gap;
      }
    } else grp.add(cylinderBetween(from, neck, r, mat(o.color)));
    grp.add(cone(neck, d, headLen, headR, mat(o.color)));
    grp.userData.tip = from.clone().add(d.clone().multiplyScalar(len));
    return grp;
  }
  function label(html, pos, cls, owner) {
    const div = document.createElement('div');
    div.className = 'lbl ' + (cls || '');
    div.innerHTML = '<span class="lbl-in">' + html + '</span>';
    const obj = new CSS2DObject(div);
    obj.position.copy(pos);
    obj.userData.owner = owner || null;
    obj.userData.cls = cls || '';
    labelObjs.push(obj);
    return obj;
  }
  function polygon(points, color, opacity) {
    const geo = new THREE.BufferGeometry();
    const verts = []; const idx = [];
    points.forEach(p => verts.push(p.x, p.y, p.z));
    for (let i = 1; i < points.length - 1; i++) idx.push(0, i, i + 1);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, transparent: true, opacity,
                 side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 }));
    const grp = new THREE.Group(); grp.add(m);
    grp.add(polyline(points.concat([points[0]]), color, { opacity: 0.8 }));
    return grp;
  }

  /* ------------------------------------------------------------ element builders */
  const builders = {
    point(el, pts) {
      const p = P(el.at, pts);
      const grp = new THREE.Group();
      if (!el.noDot) grp.add(new THREE.Mesh(new THREE.SphereGeometry(S.pt * (el.size || 1), 14, 10), mat(COLORS.point)));
      grp.position.copy(p);
      const name = el.label != null ? el.label : (typeof el.at === 'string' ? el.at : '');
      if (name) {
        const off = V(el.offset || [S.pt * 2.2, S.pt * 2.2, S.pt * 1.5]);
        const l = label(name, off, 'lbl-point', grp);
        l.userData.pointName = name; l.userData.coords = p.clone();
        grp.add(l);
      }
      return grp;
    },
    cable(el, pts) {
      const a = P(el.from, pts), b = P(el.to, pts);
      const grp = new THREE.Group();
      grp.add(cylinderBetween(a, b, S.cable * (el.thick || 1), mat(el.color || COLORS.cable, { roughness: 0.85 })));
      if (el.label) {
        const mid = a.clone().add(b).multiplyScalar(el.t == null ? 0.5 : el.t).add(V(el.offset || [0, 0, 0]));
        grp.add(label(el.label, mid, 'lbl-member', grp));
      }
      return grp;
    },
    strut(el, pts) {
      const a = P(el.from, pts), b = P(el.to, pts);
      const grp = new THREE.Group();
      grp.add(cylinderBetween(a, b, S.strut * (el.thick || 1), mat(el.color || COLORS.strut, { roughness: 0.4, metalness: 0.3 }), 18));
      if (el.label) grp.add(label(el.label, a.clone().add(b).multiplyScalar(0.5).add(V(el.offset || [0, 0, 0])), 'lbl-member', grp));
      return grp;
    },
    spring(el, pts) {
      const a = P(el.from, pts), b = P(el.to, pts);
      const axis = b.clone().sub(a); const L = axis.length(); const u = axis.clone().normalize();
      const coils = el.coils || 8, rr = el.radius || S.spring;
      const perp = Math.abs(u.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
      const n1 = new THREE.Vector3().crossVectors(u, perp).normalize();
      const n2 = new THREE.Vector3().crossVectors(u, n1).normalize();
      const lead = Math.min(L * 0.12, rr * 3);
      const pts3 = [a.clone(), a.clone().add(u.clone().multiplyScalar(lead))];
      const N = coils * 16;
      for (let i = 0; i <= N; i++) {
        const t = i / N; const ang = t * coils * Math.PI * 2;
        const s = lead + t * (L - 2 * lead);
        pts3.push(a.clone().add(u.clone().multiplyScalar(s))
          .add(n1.clone().multiplyScalar(Math.cos(ang) * rr)).add(n2.clone().multiplyScalar(Math.sin(ang) * rr)));
      }
      pts3.push(b.clone().sub(u.clone().multiplyScalar(lead)), b.clone());
      const curve = new THREE.CatmullRomCurve3(pts3);
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, N * 2 + 8, S.cable * 0.9, 8, false), mat(el.color || COLORS.spring, { metalness: 0.4, roughness: 0.4 })));
      if (el.label) grp.add(label(el.label, a.clone().add(b).multiplyScalar(0.5).add(V(el.offset || [0, 0, 0])), 'lbl-member', grp));
      return grp;
    },
    pulley(el, pts) {
      const p = P(el.at, pts); const r = el.r || S.pulley;
      const grp = new THREE.Group();
      const axis = V(AXIS[el.axis || 'z']);
      const torus = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 10, 32), mat(0x6c8ebf, { metalness: 0.3, roughness: 0.4 }));
      torus.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, r * 0.25, 28), mat(0x9db4d6, { roughness: 0.5 }));
      disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      grp.add(torus, disc);
      grp.position.copy(p);
      if (el.label) grp.add(label(el.label, V(el.offset || [r * 1.6, r * 0.8, 0]), 'lbl-point', grp));
      return grp;
    },
    weight(el, pts) {
      const top = P(el.at, pts); const dn = downVec();
      const size = el.size || [S.weight, S.weight * 1.4, S.weight];
      const grp = new THREE.Group();
      let body;
      if (el.shape === 'cylinder') body = new THREE.Mesh(new THREE.CylinderGeometry(size[0] / 2, size[0] / 2, size[1], 28), mat(el.color || COLORS.weight));
      else if (el.shape === 'bucket') body = new THREE.Mesh(new THREE.CylinderGeometry(size[0] / 2, size[0] * 0.38, size[1], 28), mat(el.color || 0x7f9fc4, { metalness: 0.3 }));
      else body = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2] || size[0]), mat(el.color || COLORS.weight));
      // body's local "height" axis is Y; align with -down (i.e., up)
      body.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dn.clone().negate());
      body.position.copy(top).add(dn.clone().multiplyScalar(size[1] / 2));
      grp.add(body);
      if (el.shape !== 'cylinder' && el.shape !== 'bucket') {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0x4a3a2a }));
        edges.position.copy(body.position); edges.quaternion.copy(body.quaternion); grp.add(edges);
      }
      if (el.label) grp.add(label(el.label, body.position.clone().add(V(el.offset || [size[0] * 0.9, 0, 0])), 'lbl-point', grp));
      return grp;
    },
    slab(el, pts) {
      const c = P(el.center, pts); const t = el.thickness || S.slabT;
      const n = el.normal || 'z'; let g;
      if (n === 'z') g = new THREE.BoxGeometry(el.w, el.h, t);
      else if (n === 'y') g = new THREE.BoxGeometry(el.w, t, el.h);
      else g = new THREE.BoxGeometry(t, el.w, el.h);
      const m = new THREE.Mesh(g, mat(el.color || COLORS.ground, { transparent: true, opacity: el.opacity == null ? 0.55 : el.opacity, depthWrite: false }));
      m.position.copy(c);
      const grp = new THREE.Group(); grp.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.6 }));
      e.position.copy(c); grp.add(e);
      return grp;
    },
    eyebolt(el, pts) {
      const p = P(el.at, pts); const r = el.r || S.pt * 1.6;
      const grp = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.28, 8, 24), mat(COLORS.eyebolt, { metalness: 0.5, roughness: 0.35 }));
      const n = dirOf(el.normal || 'x', pts, p);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      grp.add(ring);
      if (el.stem) {
        const s = dirOf(el.stem, pts, p);
        grp.add(cylinderBetween(new THREE.Vector3(), s.clone().multiplyScalar(r * 2.2), r * 0.25, mat(COLORS.eyebolt)));
      }
      grp.position.copy(p);
      return grp;
    },
    wire(el, pts) {
      const ps = el.points.map(q => P(q, pts));
      const grp = new THREE.Group(); const r = S.cable * (el.thick || 1.6);
      const material = mat(el.color || 0xc97b2f, { metalness: 0.4, roughness: 0.4 });
      for (let i = 0; i < ps.length - 1; i++) grp.add(cylinderBetween(ps[i], ps[i + 1], r, material));
      for (let i = 0; i < ps.length; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material); s.position.copy(ps[i]); grp.add(s); }
      return grp;
    },
    plane(el, pts) {
      return polygon(el.points.map(q => P(q, pts)), el.color || COLORS.plane, el.opacity == null ? 0.28 : el.opacity);
    },
    guide(el, pts) {
      const a = P(el.from, pts), b = P(el.to, pts);
      const grp = new THREE.Group();
      grp.add(lineSeg(a, b, el.color || COLORS.guide, { dashed: el.dashed !== false, opacity: 0.9 }));
      if (el.label) grp.add(label(el.label, a.clone().add(b).multiplyScalar(0.5).add(V(el.offset || [0, 0, 0])), 'lbl-member', grp));
      return grp;
    },
    label(el, pts) {
      const grp = new THREE.Group();
      grp.add(label(el.text, P(el.at, pts).add(V(el.offset || [0, 0, 0])), el.cls || 'lbl-note', grp));
      return grp;
    },
    dim(el, pts) {
      const a = P(el.from, pts), b = P(el.to, pts);
      const off = V(el.offset || [0, 0, 0]);
      const a2 = a.clone().add(off), b2 = b.clone().add(off);
      const grp = new THREE.Group(); const c = COLORS.dim; const material = mat(c);
      if (off.length() > 1e-9) {
        const ext = off.clone().normalize().multiplyScalar(S.dimTick * 0.5);
        grp.add(lineSeg(a, a2.clone().add(ext), c, { opacity: 0.6 }));
        grp.add(lineSeg(b, b2.clone().add(ext), c, { opacity: 0.6 }));
      }
      const d = b2.clone().sub(a2); const len = d.length(); const u = d.clone().normalize();
      grp.add(lineSeg(a2, b2, c));
      const hl = Math.min(S.dimTick, len * 0.3);
      grp.add(cone(a2.clone().add(u.clone().multiplyScalar(hl)), u.clone().negate(), hl, hl * 0.26, material));
      grp.add(cone(b2.clone().sub(u.clone().multiplyScalar(hl)), u, hl, hl * 0.26, material));
      const mid = a2.clone().add(b2).multiplyScalar(0.5).add(V(el.labelOffset || [0, 0, 0]));
      if (el.label) grp.add(label(el.label, mid, 'lbl-dim', grp));
      return grp;
    },
    angle(el, pts) {
      const at = P(el.at, pts);
      const d1 = dirOf(el.from, pts, at), d2 = dirOf(el.to, pts, at);
      const r = el.radius || S.arc;
      let ang = d1.angleTo(d2);
      let axis = new THREE.Vector3().crossVectors(d1, d2);
      if (axis.length() < 1e-6) { axis = new THREE.Vector3(0, 0, 1); }
      axis.normalize();
      if (el.reflex) ang = 2 * Math.PI - ang, axis.negate();
      const n = 36; const points = [];
      for (let i = 0; i <= n; i++) {
        const q = new THREE.Quaternion().setFromAxisAngle(axis, ang * i / n);
        points.push(at.clone().add(d1.clone().applyQuaternion(q).multiplyScalar(r)));
      }
      const grp = new THREE.Group(); grp.add(polyline(points, COLORS.angle));
      const tipDir = points[n].clone().sub(points[n - 1]).normalize();
      const hl = Math.min(S.dimTick * 0.8, r * 0.35);
      grp.add(cone(points[n].clone().sub(tipDir.clone().multiplyScalar(hl)), tipDir, hl, hl * 0.28, mat(COLORS.angle)));
      if (el.label) {
        const qm = new THREE.Quaternion().setFromAxisAngle(axis, ang / 2);
        const mid = at.clone().add(d1.clone().applyQuaternion(qm).multiplyScalar(r * (el.labelR || 1.45))).add(V(el.labelOffset || [0, 0, 0]));
        grp.add(label(el.label, mid, 'lbl-angle', grp));
      }
      return grp;
    },
    slopeTri(el, pts) {
      // small right triangle showing a slope (run, rise) beside a line
      const at = P(el.at, pts);
      const run = dirOf(el.run, pts, at), rise = dirOf(el.rise, pts, at);
      const k = el.scale || S.arc * 0.9;
      const [nr, nu] = el.ratio; const norm = Math.max(nr, nu);
      const p0 = at.clone(), p1 = at.clone().add(run.clone().multiplyScalar(k * nr / norm)), p2 = p1.clone().add(rise.clone().multiplyScalar(k * nu / norm));
      const grp = new THREE.Group();
      grp.add(polyline([p0, p1, p2, p0], COLORS.dim));
      const lab = el.labels || [String(nr), String(nu), ''];
      const outR = rise.clone().negate(), outU = run.clone();
      if (lab[0]) grp.add(label(lab[0], p0.clone().add(p1).multiplyScalar(0.5).add(outR.multiplyScalar(S.dimTick * 0.9)), 'lbl-dim', grp));
      if (lab[1]) grp.add(label(lab[1], p1.clone().add(p2).multiplyScalar(0.5).add(outU.multiplyScalar(S.dimTick * 0.9)), 'lbl-dim', grp));
      if (lab[2]) grp.add(label(lab[2], p0.clone().add(p2).multiplyScalar(0.5).add(rise.clone().sub(run).normalize().multiplyScalar(S.dimTick * 0.9)), 'lbl-dim', grp));
      return grp;
    },
    force(el, pts) {
      const at = P(el.at, pts); const dir = dirOf(el.dir, pts, at);
      const mag = el.mag == null ? null : el.mag;
      const known = mag != null && !el.unknown;
      const len = el.len || (known ? Math.max(Math.abs(mag) * fScale, S.minArrow) : S.unknownArrow);
      const color = el.color || (known ? COLORS.force : COLORS.unknown);
      const grp = arrow(at, dir, len, { color, dashed: !!el.dashed || !known });
      const tip = grp.userData.tip;
      grp.userData = { kind: 'force', at, dir, mag, tip, name: el.name || el.label || '',
                       vec: known ? dir.clone().multiplyScalar(mag) : null,
                       inResultant: known && el.inResultant !== false };
      if (el.label) grp.add(label(el.label, tip.clone().add(dir.clone().multiplyScalar(S.head * 0.6)).add(V(el.labelOffset || [0, 0, 0])), 'lbl-force', grp));
      return grp;
    }
  };
  const STRUCTURE = new Set(['cable', 'strut', 'spring', 'pulley', 'weight', 'slab', 'eyebolt', 'wire', 'plane']);

  /* ------------------------------------------------------------ scene setup */
  App.start = function (deps) {
    THREE = deps.THREE; OrbitControls = deps.OrbitControls;
    CSS2DRenderer = deps.CSS2DRenderer; CSS2DObject = deps.CSS2DObject;
    container = document.getElementById('viewport');

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xfbfbf9, 1);
    container.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b8c4, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(3, 2, 6); scene.add(sun);
    const sun2 = new THREE.DirectionalLight(0xffffff, 0.45); sun2.position.set(-4, -3, 2); scene.add(sun2);

    persp = new THREE.PerspectiveCamera(30, 1, 0.01, 5000);
    ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
    camera = persp;
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;

    sceneRoot = new THREE.Group(); scene.add(sceneRoot);

    new ResizeObserver(resize).observe(container);
    resize();
    buildUI();
    routeFromHash();
    window.addEventListener('hashchange', routeFromHash);
    animate();
  };

  function resize() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    renderer.setSize(w, h); labelRenderer.setSize(w, h);
    persp.aspect = w / h; persp.updateProjectionMatrix();
    updateOrthoFrustum();
  }
  function updateOrthoFrustum() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    const dist = ortho.position.distanceTo(controls ? controls.target : new THREE.Vector3());
    const halfH = Math.tan(persp.fov * Math.PI / 360) * (dist || 1);
    const halfW = halfH * (w / h);
    ortho.left = -halfW; ortho.right = halfW; ortho.top = halfH; ortho.bottom = -halfH;
    ortho.updateProjectionMatrix();
  }
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  /* ------------------------------------------------------------ problem loading */
  function clearScene() {
    while (sceneRoot.children.length) {
      const c = sceneRoot.children.pop();
      c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
    }
    labelObjs.forEach(l => { if (l.element && l.element.parentNode) l.element.parentNode.removeChild(l.element); });
    labelObjs = []; overlayGroup = null;
  }

  App.load = function (id, keepCamera) {
    const p = (window.PROBLEMS || []).find(q => q.id === id) || (window.PROBLEMS || [])[0];
    if (!p) return;
    const same = problem && problem.id === p.id;
    problem = p;
    if (!same) {
      params = {}; (p.params || []).forEach(q => { params[q.key] = q.value; });
      stepIndex = 1; fbdIndex = -1; layersOn = {};
      (p.layers || []).forEach(l => { layersOn[l.key] = !!l.on; });
      opts.components = false; opts.resultant = false;
    }
    rebuild();
    if (!same || !keepCamera) setView(p.view === '2d' ? 'plane' : 'textbook');
    renderPanel();
    highlightList();
    if (location.hash !== '#' + p.id) history.replaceState(null, '', '#' + p.id);
  };

  function rebuild() {
    clearScene();
    const e = problem.extent || 3;
    S = { arrowR: e * 0.012, head: e * 0.09, headR: e * 0.03, cable: e * 0.008, strut: e * 0.022,
          spring: e * 0.035, dash: e * 0.05, gap: e * 0.03, pt: e * 0.016, dimTick: e * 0.045,
          arc: e * 0.22, minArrow: e * 0.12, unknownArrow: e * 0.42, pulley: e * 0.06,
          weight: e * 0.16, slabT: e * 0.02, axisLen: e * 1.05 };
    let spec;
    try { spec = problem.build(params); }
    catch (err) { console.error(err); showError('This problem\'s build() threw: ' + err.message); return; }
    fScale = spec.forceScale || problem.forceScale || (e * 0.4 / (spec.forceRef || 1));
    const pts = {}; Object.entries(spec.points || {}).forEach(([k, v]) => { pts[k] = V(v); });
    built = { pts, elements: [], forces: [] };

    // ground grid + axes
    groundGroup = new THREE.Group();
    const ax = Object.assign({ x: S.axisLen, y: S.axisLen, z: problem.view === '2d' ? 0 : S.axisLen, neg: 0.0 }, spec.axes || {});
    const axesGrp = new THREE.Group(); axesGrp.userData.kind = 'axes';
    [['x', COLORS.x], ['y', COLORS.y], ['z', COLORS.z]].forEach(([k, col]) => {
      if (!ax[k]) return;
      const d = V(AXIS[k]);
      axesGrp.add(arrow(new THREE.Vector3(), d, ax[k], { color: col, r: S.arrowR * 0.45, headLen: S.head * 0.7, headR: S.headR * 0.55 }));
      if (ax.neg) axesGrp.add(lineSeg(new THREE.Vector3(), d.clone().multiplyScalar(-ax.neg), col, { opacity: 0.5 }));
      axesGrp.add(label('<i>' + k + '</i>', d.clone().multiplyScalar(ax[k] + S.head * 0.9), 'lbl-axis lbl-' + k, axesGrp));
    });
    sceneRoot.add(axesGrp); built.elements.push({ group: axesGrp, kind: 'axes' });

    if (spec.grid !== false) {
      const g = Object.assign({ size: e * 2.4, div: 12 }, spec.grid || {});
      const grid = new THREE.GridHelper(g.size, g.div, 0xc9d1da, 0xe3e8ee);
      grid.rotation.x = Math.PI / 2;                 // GridHelper lies in xz; rotate into xy
      grid.position.copy(V(g.center || [0, 0, 0]));
      grid.material.transparent = true; grid.material.opacity = 0.9;
      const grp = new THREE.Group(); grp.add(grid); grp.userData.kind = 'grid';
      sceneRoot.add(grp); built.elements.push({ group: grp, kind: 'grid' });
    }

    (spec.elements || []).forEach((el, i) => {
      const fn = builders[el.type];
      if (!fn) { console.warn('Unknown element type', el.type); return; }
      let grp;
      try { grp = fn(el, pts); } catch (err) { console.error('element ' + i, el, err); return; }
      grp.userData.kind = grp.userData.kind === 'force' ? 'force' : (STRUCTURE.has(el.type) ? 'structure' : el.type);
      grp.userData.el = el;
      sceneRoot.add(grp);
      built.elements.push({ group: grp, kind: grp.userData.kind, step: el.step, layer: el.layer, fbdOnly: el.fbdOnly, hideInFbd: el.hideInFbd });
      if (grp.userData.kind === 'force') built.forces.push(grp);
    });

    // free-body diagrams
    fbdList().forEach((f, fi) => {
      const at = P(f.particle, pts);
      const grp = new THREE.Group(); grp.userData.kind = 'fbd';
      const dot = new THREE.Mesh(new THREE.SphereGeometry(S.pt * 1.6, 16, 12), mat(0x222222)); dot.position.copy(at); grp.add(dot);
      grp.add(label('<b>' + f.particle + '</b>', at.clone().add(V([S.pt * 3, -S.pt * 3, -S.pt * 3])), 'lbl-point', grp));
      (f.forces || []).forEach(ff => {
        const dir = dirOf(ff.dir || ff.toward, pts, at);
        const known = ff.mag != null;
        const len = ff.len || (known ? Math.max(Math.abs(ff.mag) * fScale, S.minArrow) : S.unknownArrow);
        const a = arrow(at, dir, len, { color: ff.color || (known ? COLORS.force : COLORS.force2), dashed: !known && ff.dashed !== false });
        grp.add(a);
        if (ff.label) grp.add(label(ff.label, a.userData.tip.clone().add(dir.clone().multiplyScalar(S.head * 0.6)).add(V(ff.labelOffset || [0, 0, 0])), 'lbl-force', grp));
      });
      sceneRoot.add(grp); built.elements.push({ group: grp, kind: 'fbd', fbd: fi });
    });

    buildOverlay();
    applyVisibility();
    updateCoordLabels();
  }

  function buildOverlay() {
    if (overlayGroup) { sceneRoot.remove(overlayGroup); overlayGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); labelObjs = labelObjs.filter(l => !l.userData.overlay); }
    overlayGroup = new THREE.Group(); overlayGroup.userData.kind = 'overlay';
    const compGrp = new THREE.Group(), resGrp = new THREE.Group();
    const cols = [COLORS.x, COLORS.y, COLORS.z];
    const subs = ['x', 'y', 'z'];
    built.forces.forEach(f => {
      const u = f.userData; if (!u.vec) return;
      let start = u.at.clone();
      const comps = [u.vec.x, u.vec.y, u.vec.z];
      // component arrows head-to-tail
      comps.forEach((c, i) => {
        if (Math.abs(c) < 1e-9) return;
        const d = new THREE.Vector3(); d.setComponent(i, Math.sign(c));
        const len = Math.abs(c) * fScale;
        const a = arrow(start, d, len, { color: cols[i], dashed: true, small: true });
        compGrp.add(a);
        let nm = u.name || 'F';
        nm = nm.endsWith('</sub>') ? nm.replace(/<\/sub>$/, subs[i] + '</sub>') : nm + '<sub>' + subs[i] + '</sub>';
        const l = label(nm, a.userData.tip.clone().add(d.clone().multiplyScalar(S.head * 0.5)), 'lbl-comp lbl-' + subs[i], compGrp);
        l.userData.overlay = true; compGrp.add(l);
        start = a.userData.tip;
      });
      // projection box edges (tip -> foot in xy-plane -> axes)
      const tip = u.tip.clone(); const foot = new THREE.Vector3(tip.x, tip.y, u.at.z);
      if (problem.view !== '2d' && Math.abs(tip.z - u.at.z) > 1e-9) compGrp.add(lineSeg(tip, foot, COLORS.guide, { dashed: true, opacity: 0.7 }));
      compGrp.add(lineSeg(foot, new THREE.Vector3(u.at.x, tip.y, u.at.z), COLORS.guide, { dashed: true, opacity: 0.7 }));
      compGrp.add(lineSeg(foot, new THREE.Vector3(tip.x, u.at.y, u.at.z), COLORS.guide, { dashed: true, opacity: 0.7 }));
    });
    // resultant of all known forces sharing a point of application
    const byPoint = {};
    built.forces.forEach(f => { const u = f.userData; if (!u.inResultant) return; const k = u.at.toArray().map(v => v.toFixed(4)).join(','); (byPoint[k] = byPoint[k] || []).push(f); });
    Object.values(byPoint).forEach(list => {
      if (list.length < 2) return;
      const sum = new THREE.Vector3(); list.forEach(f => sum.add(f.userData.vec));
      const m = sum.length(); if (m < 1e-9) return;
      const at = list[0].userData.at;
      const a = arrow(at, sum.clone().normalize(), Math.max(m * fScale, S.minArrow * 0.5), { color: COLORS.resultant, dashed: true });
      resGrp.add(a);
      const l = label(problem.resultantLabel || 'F<sub>R</sub>', a.userData.tip.clone().add(sum.clone().normalize().multiplyScalar(S.head * 0.6)), 'lbl-force lbl-res', resGrp);
      l.userData.overlay = true; resGrp.add(l);
      // head-to-tail polygon
      let s = at.clone();
      list.forEach(f => { const v = f.userData.vec.clone().multiplyScalar(fScale); const e2 = s.clone().add(v); if (s.distanceTo(at) > 1e-9) resGrp.add(lineSeg(s, e2, COLORS.resultant, { dashed: true, opacity: 0.55 })); s = e2; });
    });
    compGrp.userData.kind = 'components'; resGrp.userData.kind = 'resultant';
    overlayGroup.add(compGrp, resGrp); sceneRoot.add(overlayGroup);
    overlayGroup.userData.comp = compGrp; overlayGroup.userData.res = resGrp;
  }

  function fbdList() { const f = problem && problem.fbd; return typeof f === 'function' ? (f(params) || []) : (f || []); }

  function isVisibleUp(o) { while (o) { if (o.visible === false) return false; o = o.parent; } return true; }

  function applyVisibility() {
    if (!built) return;
    const inFbd = fbdIndex >= 0;
    built.elements.forEach(it => {
      let v = true;
      if (it.kind === 'axes') v = opts.axes;
      else if (it.kind === 'grid') v = opts.grid;
      else if (it.kind === 'fbd') v = inFbd && it.fbd === fbdIndex;
      else {
        if (it.step != null && it.step > stepIndex) v = false;
        if (it.layer && !layersOn[it.layer]) v = false;
        if (it.kind === 'dim' && !opts.dims) v = false;
        if (inFbd) {
          if (it.kind === 'structure' || it.kind === 'force' || it.kind === 'dim' || it.kind === 'guide' || it.kind === 'point' || it.kind === 'slopeTri' || it.kind === 'label') v = false;
          if (it.hideInFbd) v = false;
        }
        if (it.fbdOnly && !inFbd) v = false;
      }
      it.group.visible = v;
    });
    if (overlayGroup) {
      overlayGroup.userData.comp.visible = opts.components && !inFbd;
      overlayGroup.userData.res.visible = opts.resultant && !inFbd && !!problem.allowResultant;
    }
    labelObjs.forEach(l => { l.visible = opts.labels && isVisibleUp(l.userData.owner || l.parent); });
  }

  function updateCoordLabels() {
    labelObjs.forEach(l => {
      if (!l.userData.pointName) return;
      const c = l.userData.coords;
      const f = v => (Math.round(v * 1000) / 1000).toString().replace('-', '−');
      const show = opts.coords && !problem.hideCoords;
      l.element.innerHTML = '<span class="lbl-in">' + l.userData.pointName + (show ? ' <span class="coords">(' + [c.x, c.y, c.z].slice(0, problem.view === '2d' ? 2 : 3).map(f).join(', ') + ')</span>' : '') + '</span>';
    });
  }

  /* ------------------------------------------------------------ camera views */
  function setView(name) {
    const e = problem.extent || 3; const c = V(problem.center || [0, 0, 0]);
    let dir, up = new THREE.Vector3(0, 0, 1);
    const dist = e * 3.4;
    switch (name) {
      case 'textbook': dir = new THREE.Vector3(2.0, 1.3, 1.1); break;
      case 'top':      dir = new THREE.Vector3(0.001, -0.001, 1); break;
      case 'alongx':   dir = new THREE.Vector3(1, 0.001, 0.001); break;
      case 'alongy':   dir = new THREE.Vector3(0.001, 1, 0.001); break;
      case 'plane':    dir = new THREE.Vector3(0, 0, 1); up = new THREE.Vector3(0, 1, 0); break;
      case 'tilt':     dir = new THREE.Vector3(0.9, -1.1, 1.6); up = new THREE.Vector3(0, 1, 0); break;
      default:         dir = new THREE.Vector3(2.0, 1.3, 1.1);
    }
    if (problem.view === '2d' && name !== 'tilt') up = new THREE.Vector3(0, 1, 0);
    dir.normalize().multiplyScalar(dist);
    [persp, ortho].forEach(cam => { cam.up.copy(up); cam.position.copy(c).add(dir); cam.lookAt(c); });
    controls.target.copy(c);
    controls.update();
    updateOrthoFrustum();
  }
  function setProjection(useOrtho) {
    const from = camera, to = useOrtho ? ortho : persp;
    if (from === to) return;
    to.position.copy(from.position); to.up.copy(from.up); to.quaternion.copy(from.quaternion);
    camera = to;
    controls.dispose();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    controls.target.copy(V(problem.center || [0, 0, 0]));
    controls.update();
    updateOrthoFrustum();
  }

  /* ------------------------------------------------------------ UI */
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'class') n.className = v; else if (k === 'html') n.innerHTML = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v); });
    (children || []).forEach(ch => n.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch));
    return n;
  }
  function showError(msg) { const p = document.getElementById('panel'); p.innerHTML = '<div class="error">' + msg + '</div>'; }

  function buildUI() {
    const list = document.getElementById('problem-list'); list.innerHTML = '';
    const sel = document.getElementById('problem-select'); sel.innerHTML = '';
    const groups = [];
    (window.PROBLEMS || []).forEach(p => { let g = groups.find(x => x.name === p.group); if (!g) { g = { name: p.group, items: [] }; groups.push(g); } g.items.push(p); });
    groups.forEach(g => {
      list.appendChild(el('div', { class: 'group-title' }, [g.name]));
      const og = el('optgroup', { label: g.name });
      g.items.forEach(p => {
        list.appendChild(el('a', { class: 'item', href: '#' + p.id, 'data-id': p.id },
          [el('span', { class: 'item-title' }, [p.title]), el('span', { class: 'tag' }, [p.view === '2d' ? '2D' : '3D'])]));
        og.appendChild(el('option', { value: p.id }, [p.title]));
      });
      sel.appendChild(og);
    });
    sel.addEventListener('change', () => { location.hash = '#' + sel.value; });
    document.getElementById('toggle-panel').addEventListener('click', () => document.body.classList.toggle('panel-hidden'));
  }
  function highlightList() {
    document.querySelectorAll('#problem-list .item').forEach(a => a.classList.toggle('active', a.dataset.id === problem.id));
    const sel = document.getElementById('problem-select'); if (sel.value !== problem.id) sel.value = problem.id;
  }
  function routeFromHash() {
    const id = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    App.load(id);
  }

  function renderPanel() {
    const p = problem; const panel = document.getElementById('panel'); panel.innerHTML = '';
    panel.appendChild(el('div', { class: 'p-head' }, [
      el('div', { class: 'p-source' }, [p.source || '']),
      el('h2', {}, [p.title])
    ]));
    if (p.statement) panel.appendChild(el('div', { class: 'p-statement', html: p.statement }));
    if (p.parts && p.parts.length) panel.appendChild(el('ol', { class: 'p-parts', type: 'a' }, p.parts.map(t => el('li', { html: t }))));
    if (p.note) panel.appendChild(el('div', { class: 'p-note', html: p.note }));

    // steps
    if (p.steps && p.steps.length) {
      const box = el('div', { class: 'ctl-box' });
      box.appendChild(el('div', { class: 'ctl-title' }, ['Build it step by step']));
      const cap = el('div', { class: 'step-cap', html: '' });
      const counter = el('span', { class: 'step-n' });
      const upd = () => { counter.textContent = 'Step ' + stepIndex + ' of ' + p.steps.length; cap.innerHTML = p.steps[stepIndex - 1]; applyVisibility(); };
      const prev = el('button', { class: 'btn', onclick: () => { if (stepIndex > 1) { stepIndex--; upd(); } } }, ['◀ Back']);
      const next = el('button', { class: 'btn', onclick: () => { if (stepIndex < p.steps.length) { stepIndex++; upd(); } } }, ['Next ▶']);
      box.appendChild(el('div', { class: 'step-row' }, [prev, counter, next]));
      box.appendChild(cap); panel.appendChild(box); upd();
    }

    // views
    const vb = el('div', { class: 'ctl-box' });
    vb.appendChild(el('div', { class: 'ctl-title' }, ['View']));
    const views = p.view === '2d'
      ? [['plane', 'Plane view'], ['tilt', 'Tilt it (it is flat!)']]
      : [['textbook', 'Textbook view'], ['top', 'Look down z'], ['alongx', 'Look along x'], ['alongy', 'Look along y']];
    const vrow = el('div', { class: 'btn-row' });
    views.forEach(([k, t]) => vrow.appendChild(el('button', { class: 'btn', onclick: () => setView(k) }, [t])));
    vb.appendChild(vrow);
    vb.appendChild(checkbox('Orthographic (no perspective)', opts.ortho, v => { opts.ortho = v; setProjection(v); }));
    vb.appendChild(el('div', { class: 'hint' }, ['Drag to rotate, scroll to zoom, right-drag (or two fingers) to pan.']));
    panel.appendChild(vb);

    // layers / toggles
    const tb = el('div', { class: 'ctl-box' });
    tb.appendChild(el('div', { class: 'ctl-title' }, ['Show']));
    tb.appendChild(checkbox('Axes', opts.axes, v => { opts.axes = v; applyVisibility(); }));
    tb.appendChild(checkbox('Grid', opts.grid, v => { opts.grid = v; applyVisibility(); }));
    tb.appendChild(checkbox('Dimensions', opts.dims, v => { opts.dims = v; applyVisibility(); }));
    tb.appendChild(checkbox('Labels', opts.labels, v => { opts.labels = v; applyVisibility(); }));
    if (!p.noComponents && built && built.forces.some(f => f.userData.vec)) {
      tb.appendChild(checkbox('Rectangular components of each known force (no numbers)', opts.components, v => { opts.components = v; applyVisibility(); }));
    }
    if (p.allowResultant) tb.appendChild(checkbox('Vector sum of the known forces, head to tail (no numbers)', opts.resultant, v => { opts.resultant = v; applyVisibility(); }));
    (p.layers || []).forEach(l => tb.appendChild(checkbox(l.label, !!layersOn[l.key], v => { layersOn[l.key] = v; applyVisibility(); })));
    if (!p.hideCoords) tb.appendChild(checkbox('Reveal point coordinates (try reading them off the figure first)', opts.coords, v => { opts.coords = v; updateCoordLabels(); }));
    panel.appendChild(tb);

    // free-body diagrams
    const fbds = fbdList();
    if (fbds.length) {
      const fb = el('div', { class: 'ctl-box' });
      fb.appendChild(el('div', { class: 'ctl-title' }, ['Free-body diagram']));
      const row = el('div', { class: 'btn-row' });
      const btns = [];
      const mk = (idx, text) => { const b = el('button', { class: 'btn' + (fbdIndex === idx ? ' on' : ''), onclick: () => { fbdIndex = idx; btns.forEach((bb, i) => bb.classList.toggle('on', (i - 1) === idx)); applyVisibility(); } }, [text]); btns.push(b); return b; };
      row.appendChild(mk(-1, 'Whole structure'));
      fbds.forEach((f, i) => row.appendChild(mk(i, f.title || ('Particle ' + f.particle))));
      fb.appendChild(row);
      fb.appendChild(el('div', { class: 'hint' }, ['Unknown forces are drawn dashed, with a made-up length. Their directions are the point.']));
      panel.appendChild(fb);
    }

    // params
    if (p.params && p.params.length) {
      const pb = el('div', { class: 'ctl-box' });
      pb.appendChild(el('div', { class: 'ctl-title' }, ['Change the givens']));
      p.params.forEach(q => {
        const row = el('div', { class: 'param' });
        const lab = el('label', { html: q.label });
        const num = el('input', { type: 'number', min: q.min, max: q.max, step: q.step || 1, value: params[q.key] });
        const rng = el('input', { type: 'range', min: q.min, max: q.max, step: q.step || 1, value: params[q.key] });
        const onchg = (v) => { v = Number(v); if (isNaN(v)) return; params[q.key] = v; num.value = v; rng.value = v; scheduleRebuild(); };
        num.addEventListener('input', () => onchg(num.value)); rng.addEventListener('input', () => onchg(rng.value));
        row.appendChild(lab); row.appendChild(el('div', { class: 'param-inputs' }, [rng, num]));
        pb.appendChild(row);
      });
      pb.appendChild(el('button', { class: 'btn', onclick: () => { p.params.forEach(q => { params[q.key] = q.value; }); rebuild(); renderPanel(); } }, ['Reset to the sheet values']));
      panel.appendChild(pb);
    }

    if (p.think && p.think.length) {
      const th = el('div', { class: 'ctl-box think' });
      th.appendChild(el('div', { class: 'ctl-title' }, ['While you look']));
      th.appendChild(el('ul', {}, p.think.map(t => el('li', { html: t }))));
      panel.appendChild(th);
    }
  }
  function checkbox(text, on, cb) {
    const input = el('input', { type: 'checkbox' }); input.checked = !!on;
    input.addEventListener('change', () => cb(input.checked));
    return el('label', { class: 'chk' }, [input, el('span', { html: text })]);
  }
  function scheduleRebuild() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(() => { rafPending = false; rebuild(); });
  }
})();
