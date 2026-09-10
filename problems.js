/* ============================================================================
   Statics in 3D  -  problem catalogue
   ----------------------------------------------------------------------------
   Every problem is one object in the PROBLEMS array. The viewer never shows
   answers: it draws the givens, and lets students rotate, toggle and vary them.

   Fields
     id, group, title, source, view ('2d' | '3d'), extent (scene radius),
     center [x,y,z], statement (HTML), parts [HTML...], note (HTML),
     params [{key,label,min,max,step,value}]  -> sliders; build(p) receives them
     steps [caption...]  -> elements with step:n appear from that step on
     layers [{key,label,on}] -> elements with layer:key get a checkbox
     allowResultant, resultantLabel, noComponents, hideCoords
     fbd: [ {particle:'A', title, forces:[{toward:'B'|dir:[..], label, mag?}]} ]
          (or a function of the params that returns that array)
     build(p) -> { points:{A:[x,y,z]...}, axes:{x,y,z,neg}, grid:{size,div,center}|false,
                   forceScale (scene units per force unit), elements:[...] }

   Element types (see README.md for every option)
     point cable strut spring pulley weight slab eyebolt wire plane guide label
     dim angle slopeTri force
   Directions can be written as an axis name ('+x','-y',...), a vector [x,y,z],
   a point name (toward that point), {toward:'B', from:'A'}, {angles:[a,b,g]}
   (coordinate direction angles, one may be null), {azel:{az,el,from,toward}},
   {planar:{from:'-y', toward:'-x', angle:30}}, or {slope:[run, rise]}.
   ========================================================================== */

const R = Math.PI / 180;
const fmt = (v) => String(Math.round(v * 100) / 100).replace('-', '−');

window.PROBLEMS = [

  /* ===================================================================== */
  /*  CE 2450 Recitation, Week 3                                            */
  /* ===================================================================== */
  {
    id: 'w3-p1',
    group: 'CE 2450 Recitation, Week 3',
    title: 'Problem 1: three forces at a bracket',
    source: 'Recitation Week 3 problem set (adapted from a previous CE 2450 exam)',
    view: '2d', extent: 1.4, center: [0.1, 0.2, 0],
    statement: 'Three forces are applied at the bracket in the figure. A force <b>P</b> = P<b>i</b> acts along the x-axis, where positive P indicates the +x direction and negative P indicates the −x direction.',
    parts: [
      'Determine the range of values of P such that the magnitude of the resultant force does not exceed 1000 N.',
      'Determine the value of P for which the magnitude of the resultant force is a minimum.'
    ],
    params: [{ key: 'P', label: 'P (N)', min: -2000, max: 2000, step: 10, value: 400 }],
    allowResultant: true, resultantLabel: '<b>F</b><sub>R</sub>',
    think: [
      'Slide P and watch the vector sum. Along which line does its tip move? Why that line?',
      'Tilt the view: every vector here lies in one plane, so this is a two-dimensional problem even though the site draws it in space.'
    ],
    build(p) {
      const s = p.P >= 0 ? 1 : -1;
      const f2 = { planar: { from: '-y', toward: '-x', angle: 30 } };
      return {
        points: { O: [0, 0, 0] },
        axes: { x: 1.5, y: 1.5, z: 0, neg: 1.1 },
        grid: false,
        forceScale: 1 / 1300,
        elements: [
          { type: 'strut', from: [-0.55, 0, 0], to: [0, 0, 0], color: 0x8fa3b8, thick: 1.5 },
          { type: 'force', at: 'O', dir: { slope: [0.9, 1.2] }, mag: 1500, name: 'F<sub>1</sub>', label: '<b>F</b><sub>1</sub> = 1500 N' },
          { type: 'slopeTri', at: [0.36, 0.48, 0], run: '+x', rise: '+y', ratio: [0.9, 1.2], labels: ['0.9', '1.2', ''], scale: 0.22 },
          { type: 'force', at: 'O', dir: f2, mag: 600, name: 'F<sub>2</sub>', label: '<b>F</b><sub>2</sub> = 600 N' },
          { type: 'angle', at: 'O', from: '-y', to: f2, label: '30°', radius: 0.24, labelR: 1.3 },
          { type: 'force', at: 'O', dir: [s, 0, 0], mag: Math.abs(p.P), name: 'P', label: '<b>P</b> = ' + fmt(p.P) + ' N', color: 0x8e44ad }
        ]
      };
    }
  },

  {
    id: 'w3-p2',
    group: 'CE 2450 Recitation, Week 3',
    title: 'Problem 2: three forces in space',
    source: 'Recitation Week 3 problem set (adapted from a previous CE 2450 exam)',
    view: '3d', extent: 1.3, center: [0, 0, 0.2],
    statement: 'Consider the three forces shown in the diagram.',
    parts: [
      'Express the forces <b>F</b><sub>1</sub> and <b>F</b><sub>2</sub> in Cartesian-vector form.',
      'If the resultant of the three forces <b>F</b><sub>1</sub>, <b>F</b><sub>2</sub>, and <b>F</b><sub>3</sub> is 400 N in the positive y-direction, determine the magnitude and coordinate direction angles of <b>F</b><sub>3</sub>.'
    ],
    note: '<b>F</b><sub>3</sub> is drawn in an arbitrary direction, exactly as on the sheet: its direction is part of what you are asked to find. The angle γ of <b>F</b><sub>2</sub> is drawn but not given.',
    params: [
      { key: 'F1', label: 'F<sub>1</sub> (N)', min: 100, max: 1500, step: 10, value: 800 },
      { key: 'a1', label: 'Angle of <b>F</b><sub>1</sub> from +y (°)', min: 0, max: 90, step: 1, value: 35 },
      { key: 'F2', label: 'F<sub>2</sub> (N)', min: 100, max: 1500, step: 10, value: 800 },
      { key: 'alpha', label: 'α of <b>F</b><sub>2</sub>, from +x (°)', min: 0, max: 180, step: 1, value: 70 },
      { key: 'b2', label: 'Angle of <b>F</b><sub>2</sub> from −y (°)', min: 0, max: 90, step: 1, value: 50 }
    ],
    allowResultant: true, resultantLabel: '<b>F</b><sub>1</sub> + <b>F</b><sub>2</sub>',
    think: [
      'Look straight down the z-axis. Which force flattens onto the grid? What does that say about its z-component?',
      'Turn on the components of <b>F</b><sub>2</sub>. Two of its three coordinate direction angles are given. What fixes the third?'
    ],
    build(p) {
      const d1 = { azel: { az: p.a1, from: '+y', toward: '+x', el: 0 } };
      const beta = 180 - p.b2;
      const d2 = { angles: [p.alpha, beta, null], sign: 1 };
      const k = 1 / 800;
      const L1 = p.F1 * k, L2 = p.F2 * k;
      const tip1 = [L1 * Math.sin(p.a1 * R), L1 * Math.cos(p.a1 * R), 0];
      const ca = Math.cos(p.alpha * R), cb = Math.cos(beta * R);
      const cg = Math.sqrt(Math.max(0, 1 - ca * ca - cb * cb));
      const tip2 = [L2 * ca, L2 * cb, L2 * cg];
      const foot2 = [tip2[0], tip2[1], 0];
      return {
        points: { O: [0, 0, 0] },
        axes: { x: 1.5, y: 1.5, z: 1.5, neg: 1.0 },
        grid: false,
        forceScale: k,
        elements: [
          { type: 'force', at: 'O', dir: d1, mag: p.F1, name: 'F<sub>1</sub>', label: '<b>F</b><sub>1</sub> = ' + p.F1 + ' N' },
          { type: 'angle', at: 'O', from: '+y', to: d1, label: p.a1 + '°', radius: 0.45 },
          { type: 'guide', from: tip1, to: [0, tip1[1], 0] },
          { type: 'guide', from: tip1, to: [tip1[0], 0, 0] },
          { type: 'force', at: 'O', dir: d2, mag: p.F2, name: 'F<sub>2</sub>', label: '<b>F</b><sub>2</sub> = ' + p.F2 + ' N' },
          { type: 'angle', at: 'O', from: '+x', to: d2, label: p.alpha + '°', radius: 0.38 },
          { type: 'angle', at: 'O', from: '-y', to: d2, label: p.b2 + '°', radius: 0.52 },
          { type: 'angle', at: 'O', from: '+z', to: d2, label: 'γ', radius: 0.3 },
          { type: 'guide', from: tip2, to: foot2 },
          { type: 'guide', from: foot2, to: [0, 0, 0] },
          { type: 'guide', from: foot2, to: [tip2[0], 0, 0] },
          { type: 'guide', from: foot2, to: [0, tip2[1], 0] },
          { type: 'force', at: 'O', dir: [-0.35, 0.75, 0.6], unknown: true, name: 'F<sub>3</sub>', label: '<b>F</b><sub>3</sub> = ?', len: 1.0 }
        ]
      };
    }
  },

  {
    id: 'w3-ap',
    group: 'CE 2450 Recitation, Week 3',
    title: 'Additional practice: build F from its components',
    source: 'Recitation Week 3 additional practice',
    view: '3d', extent: 1.4, center: [-0.2, 0.4, 0.3],
    noComponents: true,
    statement: 'In a right-handed 3D Cartesian coordinate system, the positive x-axis points toward you and the positive y-axis points to the right. Where should the positive z-axis point? Then construct the force vector <b>F</b> step by step. The force has components F<sub>x</sub> = −650 N, F<sub>y</sub> = 900 N, and F<sub>z</sub> = 700 N.',
    parts: [
      'Draw the y-component vector <b>F</b><sub>y</sub>. From its head, draw the x-component vector <b>F</b><sub>x</sub> (head-to-tail).',
      'Draw and label the vector <b>F</b>′ = <b>F</b><sub>x</sub> + <b>F</b><sub>y</sub>.',
      'Determine the magnitude of <b>F</b>′ and θ, where θ is the angle between the y-component <b>F</b><sub>y</sub> and <b>F</b>′.',
      'From the head of <b>F</b>′, draw the z-component vector <b>F</b><sub>z</sub>. Then draw and label the resultant force <b>F</b> = <b>F</b>′ + <b>F</b><sub>z</sub>.',
      'Determine the magnitude of <b>F</b> and the angle ϕ, where ϕ is the angle between the vectors <b>F</b> and <b>F</b>′.',
      'Now construct the same vector addition in the reverse order: draw <b>F</b><sub>z</sub> first, then draw <b>F</b>′ head-to-tail. Draw and label <b>F</b>, and show the coordinate direction angle γ between <b>F</b> and the positive z-axis. Express F<sub>z</sub> in terms of F and γ.'
    ],
    steps: [
      '<b>F</b><sub>y</sub> starts at the origin. <b>F</b><sub>x</sub> starts where <b>F</b><sub>y</sub> ends (head-to-tail). Both lie in the xy-plane.',
      '<b>F</b>′ = <b>F</b><sub>x</sub> + <b>F</b><sub>y</sub> runs from the tail of the first to the head of the second. It closes the triangle in the xy-plane.',
      'θ is the angle between <b>F</b><sub>y</sub> and <b>F</b>′. The triangle from step 2 is a right triangle: use it.',
      '<b>F</b><sub>z</sub> rises straight up from the head of <b>F</b>′. <b>F</b> = <b>F</b>′ + <b>F</b><sub>z</sub> runs from the origin to its head.',
      'ϕ is the angle between <b>F</b> and <b>F</b>′. This triangle is vertical and it is also a right triangle.',
      'Reverse order: <b>F</b><sub>z</sub> first, then <b>F</b>′ from its head. Same <b>F</b>. γ is the angle between <b>F</b> and the +z-axis: a coordinate direction angle.'
    ],
    params: [
      { key: 'Fx', label: 'F<sub>x</sub> (N)', min: -1500, max: 1500, step: 10, value: -650 },
      { key: 'Fy', label: 'F<sub>y</sub> (N)', min: -1500, max: 1500, step: 10, value: 900 },
      { key: 'Fz', label: 'F<sub>z</sub> (N)', min: -1500, max: 1500, step: 10, value: 700 }
    ],
    think: [
      'Look along x, then along y, then along z. In each view one component vanishes. Which, and why?',
      'Make F<sub>x</sub> positive with the slider. Which way does the construction swing? Now make F<sub>z</sub> negative.'
    ],
    build(p) {
      const k = 1 / 1000;
      const fx = p.Fx * k, fy = p.Fy * k, fz = p.Fz * k;
      const sx = Math.sign(p.Fx) || 1, sy = Math.sign(p.Fy) || 1, sz = Math.sign(p.Fz) || 1;
      const O = [0, 0, 0], A = [0, fy, 0], B = [fx, fy, 0], C = [fx, fy, fz], Z = [0, 0, fz];
      const Fp = Math.hypot(p.Fx, p.Fy), F = Math.hypot(p.Fx, p.Fy, p.Fz);
      return {
        points: { O, A, B, C, Z },
        axes: { x: 1.5, y: 1.5, z: 1.5, neg: 1.0 },
        grid: false,
        forceScale: k,
        elements: [
          { type: 'force', at: 'O', dir: [0, sy, 0], mag: Math.abs(p.Fy), name: 'F<sub>y</sub>', label: '<b>F</b><sub>y</sub>', color: 0x1e8449, step: 1, inResultant: false },
          { type: 'force', at: 'A', dir: [sx, 0, 0], mag: Math.abs(p.Fx), name: 'F<sub>x</sub>', label: '<b>F</b><sub>x</sub>', color: 0xc0392b, step: 1, inResultant: false },
          { type: 'guide', from: 'B', to: [fx, 0, 0], step: 1 },
          { type: 'force', at: 'O', dir: { toward: 'B' }, mag: Fp, name: 'F′', label: '<b>F</b>′', color: 0x7d3c98, step: 2, inResultant: false },
          { type: 'angle', at: 'O', from: [0, sy, 0], to: { toward: 'B' }, label: 'θ', radius: 0.36, step: 3 },
          { type: 'force', at: 'B', dir: [0, 0, sz], mag: Math.abs(p.Fz), name: 'F<sub>z</sub>', label: '<b>F</b><sub>z</sub>', color: 0x1f5fbf, step: 4, inResultant: false },
          { type: 'force', at: 'O', dir: { toward: 'C' }, mag: F, name: 'F', label: '<b>F</b>', color: 0x1f3a93, step: 4, inResultant: false },
          { type: 'angle', at: 'O', from: { toward: 'B' }, to: { toward: 'C' }, label: 'ϕ', radius: 0.55, step: 5 },
          { type: 'force', at: 'O', dir: [0, 0, sz], mag: Math.abs(p.Fz), name: 'F<sub>z</sub>', label: '<b>F</b><sub>z</sub>', color: 0x1f5fbf, step: 6, inResultant: false },
          { type: 'force', at: 'Z', dir: { toward: 'C' }, mag: Fp, name: 'F′', label: '<b>F</b>′', color: 0x7d3c98, step: 6, inResultant: false },
          { type: 'angle', at: 'O', from: '+z', to: { toward: 'C' }, label: 'γ', radius: 0.62, step: 6 },
          { type: 'guide', from: 'Z', to: [0, fy, fz], step: 6 },
          { type: 'guide', from: [0, fy, fz], to: 'C', step: 6 },
          { type: 'guide', from: [0, fy, fz], to: 'A', step: 6 }
        ]
      };
    }
  },

  /* ===================================================================== */
  /*  Mastering Engineering homework, Chapter 2                              */
  /* ===================================================================== */
  {
    id: 'hw-2-94',
    group: 'Mastering Engineering, Chapter 2',
    title: 'Problem 2.94: resultant of two cable forces at an eyebolt',
    source: 'Statics homework (Hibbeler, Mastering Engineering)',
    view: '3d', extent: 3.4, center: [-0.4, -0.9, 1.3],
    statement: 'Determine the magnitude and coordinate direction angles of the resultant force acting at A. Given that F<sub>B</sub> = 580 N and F<sub>C</sub> = 450 N.',
    note: 'Mastering randomizes the two magnitudes, so type your own values below if yours differ.',
    params: [
      { key: 'FB', label: 'F<sub>B</sub> (N)', min: 0, max: 1500, step: 5, value: 580 },
      { key: 'FC', label: 'F<sub>C</sub> (N)', min: 0, max: 1500, step: 5, value: 450 }
    ],
    allowResultant: true,
    think: [
      'Before revealing coordinates, read x, y and z for A, B and C off the dimension lines. Then check yourself.',
      'Look along y and along x. In each view, which cable looks steeper? Compare with the z-components you compute.'
    ],
    build(p) {
      const A = [0.5, -1.5, 0], B = [-1.5, -2.5, 2], C = [-1.5, 0.5, 3.5];
      return {
        points: { A, B, C },
        axes: { x: 2.6, y: 2.2, z: 4.2, neg: 2.4 },
        grid: { size: 7, div: 14, center: [0, -1, 0] },
        forceScale: 1.6 / 580,
        elements: [
          { type: 'slab', center: [0, -1, -0.03], normal: 'z', w: 4.6, h: 4.8, color: 0xe6ebf0, opacity: 0.5 },
          { type: 'eyebolt', at: 'A', normal: 'y', stem: '-z' },
          { type: 'point', at: 'A', offset: [0.15, -0.35, 0.1] }, { type: 'point', at: 'B', offset: [0, -0.3, 0.25] }, { type: 'point', at: 'C', offset: [0, 0.3, 0.25] },
          { type: 'cable', from: 'A', to: 'B', thick: 0.9 }, { type: 'cable', from: 'A', to: 'C', thick: 0.9 },
          { type: 'force', at: 'A', dir: { toward: 'B' }, mag: p.FB, name: 'F<sub>B</sub>', label: '<b>F</b><sub>B</sub> = ' + p.FB + ' N' },
          { type: 'force', at: 'A', dir: { toward: 'C' }, mag: p.FC, name: 'F<sub>C</sub>', label: '<b>F</b><sub>C</sub> = ' + p.FC + ' N', color: 0xb03a2e },
          { type: 'guide', from: 'B', to: [-1.5, -2.5, 0] },
          { type: 'guide', from: 'C', to: [-1.5, 0.5, 0] },
          { type: 'guide', from: [-1.5, -2.5, 0], to: [-1.5, 0.5, 0], dashed: false },
          { type: 'guide', from: [-1.5, -2.5, 0], to: [0.5, -2.5, 0], dashed: false },
          { type: 'guide', from: [-1.5, 0.5, 0], to: [0, 0.5, 0], dashed: false },
          { type: 'guide', from: [0.5, 0, 0], to: [0.5, -2.5, 0], dashed: false },
          { type: 'guide', from: [0, -1.5, 0], to: [1.5, -1.5, 0], dashed: false },
          { type: 'guide', from: [1.5, 0, 0], to: [1.5, -2.5, 0], dashed: false },
          { type: 'dim', from: [-1.5, -2.5, 0], to: 'B', label: '2 m', offset: [0, -0.4, 0] },
          { type: 'dim', from: [-1.5, 0.5, 0], to: 'C', label: '3.5 m', offset: [0, 0.45, 0] },
          { type: 'dim', from: [0, 0.5, 0], to: [-1.5, 0.5, 0], label: '1.5 m', offset: [0, 0.45, 0] },
          { type: 'dim', from: [0, 0, 0], to: [0, 0.5, 0], label: '0.5 m', offset: [0.4, 0, 0] },
          { type: 'dim', from: [0, -2.5, 0], to: [0.5, -2.5, 0], label: '0.5 m', offset: [0, -0.4, 0] },
          { type: 'dim', from: [1.5, 0, 0], to: [1.5, -1.5, 0], label: '1.5 m', offset: [0.4, 0, 0] },
          { type: 'dim', from: [1.5, -1.5, 0], to: [1.5, -2.5, 0], label: '1 m', offset: [0.4, 0, 0] }
        ]
      };
    }
  },

  {
    id: 'hw-f2-16',
    group: 'Mastering Engineering, Chapter 2',
    title: 'Fundamental Problem 2.16: a force as a Cartesian vector',
    source: 'Statics homework (Hibbeler, Mastering Engineering)',
    view: '3d', extent: 6.2, center: [0, 3.5, 1.2],
    statement: 'Consider the force shown in the figure. Express the force as a Cartesian vector.',
    params: [{ key: 'F', label: 'F (N)', min: 100, max: 2000, step: 10, value: 900 }],
    think: [
      'Two of the dimensions are on the far side of an axis. Which components of the position vector come out negative?',
      'Turn on the rectangular components. Whatever the magnitude of F, the three components keep the same ratios. Why?'
    ],
    build(p) {
      const A = [2, 0, 4], B = [-2, 7, 0];
      return {
        points: { A, B },
        axes: { x: 3.8, y: 8.6, z: 5.2, neg: 3.0 },
        grid: { size: 12, div: 12, center: [0, 3, 0] },
        forceScale: 2.8 / 900,
        elements: [
          { type: 'slab', center: [0, 3.5, -0.03], normal: 'z', w: 6.5, h: 9.5, opacity: 0.45 },
          { type: 'strut', from: [2, 0, 0], to: [2, 0, 4], color: 0x9aa5b1, thick: 0.6 },
          { type: 'eyebolt', at: 'A', normal: 'y' }, { type: 'eyebolt', at: 'B', normal: 'z', stem: '-z' },
          { type: 'point', at: 'A', offset: [0.1, -0.5, 0.3] }, { type: 'point', at: 'B', offset: [-0.2, 0.3, 0.4] },
          { type: 'cable', from: 'A', to: 'B', thick: 0.7 },
          { type: 'force', at: 'A', dir: { toward: 'B' }, mag: p.F, name: 'F', label: '<b>F</b> = ' + p.F + ' N' },
          { type: 'guide', from: [2, 0, 0], to: [2, 7, 0], dashed: false },
          { type: 'guide', from: [2, 7, 0], to: 'B', dashed: false },
          { type: 'guide', from: [0, 7, 0], to: [-2, 7, 0], dashed: false },
          { type: 'guide', from: [0, 0, 0], to: [2, 0, 0], dashed: false },
          { type: 'dim', from: [2, 0, 0], to: 'A', label: '4 m', offset: [0.6, -0.4, 0] },
          { type: 'dim', from: [0, 0, 0], to: [2, 0, 0], label: '2 m', offset: [0, -0.8, 0] },
          { type: 'dim', from: [2, 0, 0], to: [2, 7, 0], label: '7 m', offset: [0.9, 0, 0] },
          { type: 'dim', from: [0, 7, 0], to: [-2, 7, 0], label: '2 m', offset: [0, 0.9, 0] }
        ]
      };
    }
  },

  {
    id: 'hw-wire',
    group: 'Mastering Engineering, Chapter 2',
    title: 'Position vector along a bent wire',
    source: 'Statics homework (Hibbeler, Mastering Engineering)',
    view: '3d', extent: 5.8, center: [2.5, 2, -0.3],
    hideCoords: true,
    statement: 'Determine the distance between the end points A and B on the wire by first formulating a position vector from A to B and then determining its magnitude.',
    layers: [{ key: 'rAB', label: 'Show the straight line from A to B (the vector r<sub>AB</sub>)', on: false }],
    think: [
      'Trace the wire from A to B one straight piece at a time. Each piece is a small position vector, and adding them is the whole job.',
      'Look down z: the 30° and 60° angles live in the ground plane. Look along y: the 1 in. and 2 in. pieces are the only vertical ones.'
    ],
    build() {
      const A1 = [-3 * Math.sin(30 * R), 3 * Math.cos(30 * R), 0], A = [A1[0], A1[1], 1];
      const B1 = [8 * Math.sin(60 * R), 8 * Math.cos(60 * R), 0], B = [B1[0], B1[1], -2];
      const O = [0, 0, 0];
      return {
        points: { A, B, O, A1, B1 },
        axes: { x: 8, y: 7, z: 3, neg: 0 },
        grid: { size: 16, div: 16, center: [2, 2, 0] },
        elements: [
          { type: 'wire', points: [A, A1, O, B1, B] },
          { type: 'point', at: 'A', offset: [0, 0, 0.45] }, { type: 'point', at: 'B', offset: [0.4, 0, -0.35] },
          { type: 'point', at: 'A1', label: '', noDot: true }, { type: 'point', at: 'B1', label: '', noDot: true },
          { type: 'guide', from: 'A1', to: [0, A1[1], 0] },
          { type: 'guide', from: 'B1', to: [B1[0], 0, 0] },
          { type: 'guide', from: 'B1', to: [0, B1[1], 0] },
          { type: 'dim', from: 'O', to: 'A1', label: '3 in.', offset: [-0.6, 0, 0.5] },
          { type: 'dim', from: 'A1', to: 'A', label: '1 in.', offset: [0, 0.9, 0] },
          { type: 'dim', from: 'O', to: 'B1', label: '8 in.', offset: [0.7, -0.6, 0] },
          { type: 'dim', from: 'B1', to: 'B', label: '2 in.', offset: [0.9, 0, 0] },
          { type: 'angle', at: 'O', from: '+y', to: { toward: 'A1' }, label: '30°', radius: 1.6 },
          { type: 'angle', at: 'O', from: '+y', to: { toward: 'B1' }, label: '60°', radius: 2.3 },
          { type: 'guide', from: 'A', to: 'B', layer: 'rAB', label: '<b>r</b><sub>AB</sub>', offset: [0, 0, 0.4] }
        ]
      };
    }
  },

  {
    id: 'hw-derrick',
    group: 'Mastering Engineering, Chapter 2',
    title: 'Shear-leg derrick: cable force as a Cartesian vector',
    source: 'Statics homework (Hibbeler, Mastering Engineering)',
    view: '3d', extent: 42, center: [8, 14, 12],
    statement: 'The cable attached to the shear-leg derrick exerts a force on the derrick of F = 350 lb. If z = 35 ft, express this force as a Cartesian vector.',
    params: [
      { key: 'z', label: 'Height z (ft)', min: 10, max: 60, step: 1, value: 35 },
      { key: 'F', label: 'F (lb)', min: 50, max: 1000, step: 10, value: 350 }
    ],
    think: [
      'Look down z: the 30° angle and the 50 ft length are both in the ground plane. That fixes B.',
      'Slide z. The force keeps its magnitude but its three components trade off. Which grows when the others shrink?'
    ],
    build(p) {
      const A = [0, 0, p.z], B = [50 * Math.sin(30 * R), 50 * Math.cos(30 * R), 0], O = [0, 0, 0];
      return {
        points: { A, B, O },
        axes: { x: 48, y: 58, z: p.z + 12, neg: 0 },
        grid: { size: 100, div: 10, center: [10, 15, 0] },
        forceScale: 15 / 350,
        elements: [
          { type: 'strut', from: [22, -9, 0], to: 'A', color: 0x5f8a72, thick: 1.4 },
          { type: 'strut', from: [-9, 22, 0], to: 'A', color: 0x5f8a72, thick: 1.4 },
          { type: 'cable', from: 'A', to: [-40, -32, 0], thick: 0.7 },
          { type: 'plane', points: ['O', 'A', 'B'] },
          { type: 'cable', from: 'A', to: 'B', thick: 0.8 },
          { type: 'point', at: 'A', offset: [0, 0, 3.5] }, { type: 'point', at: 'B', offset: [2.5, 2.5, -2] },
          { type: 'force', at: 'A', dir: { toward: 'B' }, mag: p.F, name: 'F', label: '<b>F</b> = ' + p.F + ' lb' },
          { type: 'dim', from: 'O', to: 'A', label: 'z = ' + p.z + ' ft', offset: [-7, -7, 0] },
          { type: 'dim', from: 'O', to: 'B', label: '50 ft', offset: [5, -3, 0] },
          { type: 'angle', at: 'O', from: '+x', to: { toward: 'B' }, label: '30°', radius: 15 }
        ]
      };
    }
  },

  /* ===================================================================== */
  /*  Chapter 3 notebook: equilibrium of a particle                          */
  /* ===================================================================== */
  {
    id: 'nb-ex1',
    group: 'Chapter 3 notebook: equilibrium of a particle',
    title: 'Example 1: two cylinders and a pulley',
    source: 'Chapter 3 notebook, page 1',
    view: '2d', extent: 2.5, center: [0.35, 0.05, 0],
    statement: 'If the mass of cylinder C is 40 kg, determine the mass of cylinder A in order to hold the assembly in the position shown.',
    params: [{ key: 'mC', label: 'Mass of C (kg)', min: 5, max: 100, step: 1, value: 40 }],
    fbd: [{ particle: 'E', title: 'Ring E', forces: [
      { toward: 'D', label: 'T<sub>ED</sub>' }, { toward: 'Bt', label: 'T<sub>EB</sub>' }, { dir: [0, -1, 0], label: 'W<sub>A</sub>' }
    ] }],
    think: [
      'A frictionless pulley changes the direction of a cable but not its tension. Which weight does ring E actually feel through EB?',
      'The 3-4-5 triangle is not an angle in degrees. It gives you the two components of the cable direction directly.'
    ],
    build(p) {
      const E = [0, 0, 0], D = [-1.6, 1.2, 0], B = [1.9, 1.1, 0], r = 0.17;
      const dx = B[0] - E[0], dy = B[1] - E[1], L = Math.hypot(dx, dy);
      const Bt = [B[0] - dy / L * r, B[1] + dx / L * r, 0];
      const Br = [B[0] + r, B[1], 0];
      return {
        points: { E, D, B, Bt, Br, A: [0, -0.95, 0], C: [Br[0], 0.15, 0] },
        axes: { x: 0, y: 0, z: 0 },
        grid: false,
        elements: [
          { type: 'slab', center: [-1.6, 1.34, 0], normal: 'z', w: 0.7, h: 0.2, color: 0xcfd6de, opacity: 0.95 },
          { type: 'slab', center: [1.9, 1.5, 0], normal: 'z', w: 0.7, h: 0.2, color: 0xcfd6de, opacity: 0.95 },
          { type: 'strut', from: [1.9, 1.45, 0], to: 'B', color: 0x8c9aa8, thick: 0.5 },
          { type: 'pulley', at: 'B', axis: 'z', r: r, label: 'B', offset: [0.22, 0.12, 0] },
          { type: 'eyebolt', at: 'D', normal: 'z' },
          { type: 'cable', from: 'E', to: 'D' }, { type: 'cable', from: 'E', to: 'Bt' }, { type: 'cable', from: 'Br', to: 'C' }, { type: 'cable', from: 'E', to: 'A' },
          { type: 'point', at: 'E', offset: [0.13, -0.13, 0] }, { type: 'point', at: 'D', offset: [-0.22, 0.05, 0], noDot: true },
          { type: 'point', at: 'Bt', label: '', noDot: true }, { type: 'point', at: 'Br', label: '', noDot: true },
          { type: 'weight', at: 'A', shape: 'cylinder', size: [0.42, 0.72], label: 'A', offset: [-0.45, 0, 0] },
          { type: 'weight', at: 'C', shape: 'cylinder', size: [0.42, 0.72], label: 'C, ' + p.mC + ' kg', color: 0x7fa7d6, offset: [0.3, 0, 0] },
          { type: 'slopeTri', at: [-0.8, 0.6, 0], run: '-x', rise: '+y', ratio: [4, 3], labels: ['4', '3', '5'], scale: 0.36 },
          { type: 'angle', at: 'E', from: '+x', to: { toward: 'Bt' }, label: '30°', radius: 0.5 }
        ]
      };
    }
  },

  {
    id: 'nb-ex2',
    group: 'Chapter 3 notebook: equilibrium of a particle',
    title: 'Example 2: wire system holding a bucket',
    source: 'Chapter 3 notebook, page 2',
    view: '2d', extent: 2.6, center: [0.2, -0.45, 0],
    statement: 'Determine the maximum weight of the bucket that the wire system can support so that no single wire develops a tension exceeding 100 lb.',
    fbd: [
      { particle: 'B', title: 'Knot B', forces: [{ toward: 'A', label: 'T<sub>BA</sub>' }, { toward: 'C', label: 'T<sub>BC</sub>' }, { toward: 'E', label: 'T<sub>BE</sub>' }] },
      { particle: 'E', title: 'Knot E', forces: [{ toward: 'B', label: 'T<sub>EB</sub>' }, { toward: 'D', label: 'T<sub>ED</sub>' }, { dir: [0, -1, 0], label: 'W' }] }
    ],
    think: [
      'Two knots, two free-body diagrams. Which one contains the bucket weight, and which one must you solve first?',
      'Every tension comes out as some multiple of W. The largest multiple is the one that hits 100 lb first.'
    ],
    build() {
      const A = [-2, 0, 0], B = [0, 0, 0], C = [2.2, 2.2 * Math.tan(30 * R), 0];
      const E = [0.9, -1.2, 0], D = [2.2, -1.2 + (2.2 - 0.9) * Math.tan(30 * R), 0];
      return {
        points: { A, B, C, D, E, Bk: [0.9, -1.95, 0] },
        axes: { x: 0, y: 0, z: 0 },
        grid: false,
        elements: [
          { type: 'slab', center: [-2.16, 0, 0], normal: 'z', w: 0.32, h: 1.1, color: 0xd8b48a, opacity: 0.95 },
          { type: 'slab', center: [2.36, 0.3, 0], normal: 'z', w: 0.32, h: 3.4, color: 0xd8b48a, opacity: 0.95 },
          { type: 'cable', from: 'A', to: 'B' }, { type: 'cable', from: 'B', to: 'C' }, { type: 'cable', from: 'B', to: 'E' },
          { type: 'cable', from: 'E', to: 'D' }, { type: 'cable', from: 'E', to: 'Bk' },
          { type: 'eyebolt', at: 'A', normal: 'z' }, { type: 'eyebolt', at: 'C', normal: 'z' }, { type: 'eyebolt', at: 'D', normal: 'z' },
          { type: 'point', at: 'A', offset: [0.05, -0.24, 0], noDot: true }, { type: 'point', at: 'B', offset: [-0.12, 0.18, 0] },
          { type: 'point', at: 'C', offset: [0, -0.24, 0], noDot: true }, { type: 'point', at: 'D', offset: [0, -0.24, 0], noDot: true },
          { type: 'point', at: 'E', offset: [0.16, -0.08, 0] },
          { type: 'weight', at: 'Bk', shape: 'bucket', size: [0.4, 0.4], color: 0x7f9fc4 },
          { type: 'angle', at: 'B', from: '+x', to: { toward: 'C' }, label: '30°', radius: 0.55 },
          { type: 'angle', at: 'E', from: '+x', to: { toward: 'D' }, label: '30°', radius: 0.5 },
          { type: 'slopeTri', at: [0.3, -0.4, 0], run: '+x', rise: '-y', ratio: [3, 4], labels: ['3', '4', '5'], scale: 0.3 }
        ]
      };
    }
  },

  {
    id: 'nb-ex3',
    group: 'Chapter 3 notebook: equilibrium of a particle',
    title: 'Example 3: block hanging from two springs',
    source: 'Chapter 3 notebook, page 3',
    view: '2d', extent: 1.15, center: [-0.1, 0.15, 0],
    statement: 'The 30-kg block is supported by two springs having the stiffness shown. Determine the unstretched length of each spring after the block is removed.',
    params: [{ key: 'm', label: 'Mass of the block (kg)', min: 5, max: 100, step: 1, value: 30 }],
    fbd: [{ particle: 'A', title: 'Ring A', forces: [{ toward: 'C', label: 'F<sub>AC</sub>' }, { toward: 'B', label: 'F<sub>AB</sub>' }, { dir: [0, -1, 0], label: 'W' }] }],
    think: [
      'The springs are drawn stretched. Their unstretched lengths are shorter than the lengths you can read from the dimensions. By how much is the whole question.',
      'The two springs pull on A along their own axes. The 0.6 m, 0.4 m and 0.5 m dimensions give you those directions without any angles.'
    ],
    build(p) {
      const A = [0, 0, 0], C = [-0.6, 0.5, 0], B = [0.4, 0.5, 0];
      return {
        points: { A, B, C, Bk: [0, -0.13, 0] },
        axes: { x: 0, y: 0, z: 0 },
        grid: false,
        elements: [
          { type: 'slab', center: [-0.1, 0.56, 0], normal: 'z', w: 1.45, h: 0.1, color: 0xcfd6de, opacity: 0.95 },
          { type: 'spring', from: 'C', to: 'A', coils: 9, radius: 0.035, label: 'k<sub>AC</sub> = 1.5 kN/m', offset: [-0.22, -0.03, 0] },
          { type: 'spring', from: 'B', to: 'A', coils: 7, radius: 0.035, label: 'k<sub>AB</sub> = 1.2 kN/m', offset: [0.24, -0.04, 0] },
          { type: 'cable', from: 'A', to: 'Bk', thick: 1.2, color: 0x555555 },
          { type: 'weight', at: 'Bk', shape: 'box', size: [0.22, 0.16, 0.18], label: p.m + ' kg', color: 0x4a4a4a, offset: [0.22, 0, 0] },
          { type: 'point', at: 'A', offset: [-0.08, -0.05, 0] }, { type: 'point', at: 'B', offset: [0.06, 0.06, 0], noDot: true }, { type: 'point', at: 'C', offset: [-0.08, 0.06, 0], noDot: true },
          { type: 'dim', from: 'C', to: [0, 0.5, 0], label: '0.6 m', offset: [0, 0.15, 0] },
          { type: 'dim', from: [0, 0.5, 0], to: 'B', label: '0.4 m', offset: [0, 0.15, 0] },
          { type: 'dim', from: [0.4, 0.5, 0], to: [0.4, 0, 0], label: '0.5 m', offset: [0.2, 0, 0] },
          { type: 'guide', from: [0, 0.5, 0], to: 'A' }, { type: 'guide', from: 'A', to: [0.4, 0, 0] }
        ]
      };
    }
  },

  {
    id: 'nb-ex4',
    group: 'Chapter 3 notebook: equilibrium of a particle',
    title: 'Example 4: three cables holding a 300-lb load',
    source: 'Chapter 3 notebook, page 4',
    view: '3d', extent: 3.2, center: [0, 0.2, 0.9],
    statement: 'Determine the tension developed in cables AB, AC, and AD.',
    params: [{ key: 'W', label: 'Load at A (lb)', min: 50, max: 1000, step: 10, value: 300 }],
    fbd: (p) => [{ particle: 'A', title: 'Ring A', forces: [
      { toward: 'B', label: 'T<sub>AB</sub>' }, { toward: 'C', label: 'T<sub>AC</sub>' }, { toward: 'D', label: 'T<sub>AD</sub>' },
      { dir: [0, 0, -1], mag: p.W, label: p.W + ' lb' }
    ] }],
    think: [
      'Three angles belong to AD and two to AC. Which are coordinate direction angles, and which are an azimuth and an elevation?',
      'Cable AB lies along an axis. That makes one of the three unit vectors trivial.'
    ],
    build(p) {
      const uAD = [Math.cos(120 * R), Math.cos(120 * R), Math.cos(45 * R)];
      const uAC = [Math.cos(60 * R) * Math.sin(30 * R), Math.cos(60 * R) * Math.cos(30 * R), Math.sin(60 * R)];
      const A = [0, 0, 0], B = [3, 0, 0], D = uAD.map(v => 3 * v), C = uAC.map(v => 3.2 * v);
      const Cf = [C[0], C[1], 0], Cy = [0, C[1], 0];
      return {
        points: { A, B, C, D, Cf, Cy },
        axes: { x: 3.8, y: 3.6, z: 3.4, neg: 1.8 },
        grid: { size: 8, div: 8 },
        forceScale: 1.3 / 300,
        elements: [
          { type: 'cable', from: 'A', to: 'B' }, { type: 'cable', from: 'A', to: 'C' }, { type: 'cable', from: 'A', to: 'D' },
          { type: 'eyebolt', at: 'B', normal: 'x' }, { type: 'eyebolt', at: 'C', normal: 'y' }, { type: 'eyebolt', at: 'D', normal: 'y' },
          { type: 'point', at: 'A', offset: [0.15, 0.15, -0.28] }, { type: 'point', at: 'B', offset: [0.2, -0.2, 0.2] },
          { type: 'point', at: 'C', offset: [0, 0.2, 0.25] }, { type: 'point', at: 'D', offset: [0, -0.25, 0.25] },
          { type: 'point', at: 'Cf', label: '', noDot: true }, { type: 'point', at: 'Cy', label: '', noDot: true },
          { type: 'force', at: 'A', dir: [0, 0, -1], mag: p.W, name: 'W', label: p.W + ' lb', inResultant: false },
          { type: 'plane', points: ['A', 'C', 'Cf'] },
          { type: 'plane', points: ['A', 'Cf', 'Cy'], color: 0x2e86c1, opacity: 0.35 },
          { type: 'guide', from: 'C', to: 'Cf' },
          { type: 'angle', at: 'A', from: '+z', to: { toward: 'D' }, label: '45°', radius: 0.95 },
          { type: 'angle', at: 'A', from: '-y', to: { toward: 'D' }, label: '60°', radius: 0.75 },
          { type: 'angle', at: 'A', from: '+x', to: { toward: 'D' }, label: '120°', radius: 0.55 },
          { type: 'angle', at: 'A', from: { toward: 'Cf' }, to: { toward: 'C' }, label: '60°', radius: 0.9 },
          { type: 'angle', at: 'A', from: '+y', to: { toward: 'Cf' }, label: '30°', radius: 1.25 }
        ]
      };
    }
  },

  {
    id: 'nb-ex5',
    group: 'Chapter 3 notebook: equilibrium of a particle',
    title: 'Example 5: two cables and a strut holding a crate',
    source: 'Chapter 3 notebook, page 5',
    view: '3d', extent: 5.2, center: [0, 3, 3],
    statement: 'Determine the tension developed in cables AB and AC and the force developed along strut AD for equilibrium of the 400-lb crate.',
    params: [{ key: 'W', label: 'Crate weight (lb)', min: 50, max: 1000, step: 10, value: 400 }],
    fbd: (p) => [{ particle: 'A', title: 'Point A', forces: [
      { toward: 'B', label: 'T<sub>AB</sub>' }, { toward: 'C', label: 'T<sub>AC</sub>' }, { toward: 'D', label: 'F<sub>AD</sub>' },
      { dir: [0, 0, -1], mag: p.W, label: p.W + ' lb' }
    ] }],
    think: [
      'Look along y to see the wall face-on: B, C and D all sit on it. Look along x to see how far A stands off the wall.',
      'A strut can push or pull. The free-body diagram assumes one sense for F<sub>AD</sub>; the sign of your answer tells you whether that was right.'
    ],
    build(p) {
      const D = [0, 0, 0], A = [0, 6, 2.5], B = [-2, 0, 4], C = [2, 0, 5.5], Ck = [0, 6, 1.2];
      return {
        points: { A, B, C, D, Ck },
        axes: { x: 4.8, y: 8.8, z: 7.2, neg: 2.6 },
        grid: { size: 14, div: 14, center: [0, 3, 0] },
        forceScale: 1.8 / 400,
        elements: [
          { type: 'slab', center: [0, -0.05, 3.2], normal: 'y', w: 7.5, h: 8, color: 0xd9c3a3, opacity: 0.55 },
          { type: 'strut', from: 'D', to: 'A', thick: 1.2 },
          { type: 'cable', from: 'A', to: 'B' }, { type: 'cable', from: 'A', to: 'C' }, { type: 'cable', from: 'A', to: 'Ck', thick: 0.8 },
          { type: 'eyebolt', at: 'B', normal: 'y' }, { type: 'eyebolt', at: 'C', normal: 'y' },
          { type: 'point', at: 'A', offset: [0.25, 0.25, 0.25] }, { type: 'point', at: 'B', offset: [0, -0.3, 0.35] },
          { type: 'point', at: 'C', offset: [0.25, -0.3, 0.25] }, { type: 'point', at: 'D', offset: [0.35, 0.25, -0.45] },
          { type: 'weight', at: 'Ck', shape: 'box', size: [1.0, 1.0, 1.0], label: p.W + ' lb', offset: [0, 0.95, 0] },
          { type: 'guide', from: 'B', to: [-2, 0, 0] }, { type: 'guide', from: 'C', to: [2, 0, 0] }, { type: 'guide', from: [0, 6, 0], to: 'A' },
          { type: 'guide', from: 'D', to: [0, 6, 0], dashed: false }, { type: 'guide', from: [0, 6, 0], to: [3.2, 6, 0], dashed: false },
          { type: 'guide', from: [0, 0, 5.5], to: [2, 0, 5.5] }, { type: 'guide', from: [0, 0, 4], to: [-2, 0, 4] },
          { type: 'dim', from: [0, 0, 5.5], to: 'C', label: '2 ft', offset: [0, 0, 0.7] },
          { type: 'dim', from: [0, 0, 4], to: 'B', label: '2 ft', offset: [0, 0, 2.6] },
          { type: 'dim', from: [2, 0, 0], to: 'C', label: '5.5 ft', offset: [1.3, 0, 0] },
          { type: 'dim', from: [-2, 0, 0], to: 'B', label: '4 ft', offset: [-1.1, 0, 0] },
          { type: 'dim', from: 'D', to: [0, 6, 0], label: '6 ft', offset: [2.4, 0, 0] },
          { type: 'dim', from: [0, 6, 0], to: 'A', label: '2.5 ft', offset: [0, 1.1, 0] }
        ]
      };
    }
  },

  {
    id: 'nb-think',
    group: 'Chapter 3 notebook: equilibrium of a particle',
    title: 'Think: spring, two cables, and a crate over a pulley',
    source: 'Chapter 3 notebook, page 6',
    view: '3d', extent: 5.6, center: [1.2, 0, -1.2],
    statement: 'The system below is in equilibrium.',
    parts: [
      'Determine the forces developed in the spring OA and the cables OB and OC required for equilibrium of the 360-lb crate.',
      'If the spring constant is k<sub>AO</sub> = 3 × 10<sup>3</sup> lb/ft, determine the unstretched length of the spring. (Assume the spring can stretch or compress vertically only.)'
    ],
    note: 'The notebook figure is a modified textbook drawing and its dimension chain for B reads two ways. This model uses B = (−3, 1, 2) ft and C = (−2, −2, 1) ft, with the pulley D on the +x axis. If your class notes give other coordinates, change them at the top of this problem’s build() in problems.js.',
    params: [{ key: 'W', label: 'Crate weight (lb)', min: 50, max: 1000, step: 10, value: 360 }],
    fbd: [{ particle: 'O', title: 'Ring O', forces: [
      { toward: 'B', label: 'T<sub>OB</sub>' }, { toward: 'C', label: 'T<sub>OC</sub>' },
      { dir: [1, 0, 0], label: 'T<sub>OD</sub>' }, { dir: [0, 0, -1], label: 'F<sub>OA</sub> (spring)' }
    ] }],
    think: [
      'Cable OD runs over a frictionless pulley to the crate. What is its tension, and in which direction does it pull O?',
      'The spring is vertical, so it can only supply a z-force. Which two unknowns must therefore balance every x- and y-component by themselves?'
    ],
    build(p) {
      const O = [0, 0, 0], A = [0, 0, -4], B = [-3, 1, 2], C = [-2, -2, 1];
      const r = 0.32, Dc = [4.6, 0, -r], Dt = [4.6, 0, 0], Ds = [4.6 + r, 0, -r], E = [4.6 + r, 0, -2.7];
      return {
        points: { O, A, B, C, D: Dc, E, Dt, Ds },
        axes: { x: 6.8, y: 4.5, z: 3.6, neg: 3.6 },
        grid: { size: 12, div: 12 },
        forceScale: 1.5 / 360,
        elements: [
          { type: 'spring', from: 'O', to: 'A', coils: 10, radius: 0.17 },
          { type: 'point', at: 'O', offset: [0.3, 0.3, -0.35] }, { type: 'point', at: 'A', offset: [0.35, 0, -0.3] },
          { type: 'point', at: 'B', offset: [0, 0.3, 0.35] }, { type: 'point', at: 'C', offset: [-0.35, 0, 0.35] },
          { type: 'point', at: 'Dt', label: '', noDot: true }, { type: 'point', at: 'Ds', label: '', noDot: true },
          { type: 'cable', from: 'O', to: 'B' }, { type: 'cable', from: 'O', to: 'C' },
          { type: 'cable', from: 'O', to: 'Dt' }, { type: 'cable', from: 'Ds', to: 'E' },
          { type: 'pulley', at: 'D', axis: 'y', r: r, label: 'D', offset: [-0.25, 0, 0.7] },
          { type: 'eyebolt', at: 'B', normal: 'z', stem: '+z' }, { type: 'eyebolt', at: 'C', normal: 'z', stem: '+z' },
          { type: 'weight', at: 'E', shape: 'box', size: [1.3, 1.3, 1.3], label: 'E, ' + p.W + ' lb', offset: [1.1, 0, 0] },
          { type: 'guide', from: 'B', to: [-3, 1, 0] }, { type: 'guide', from: 'C', to: [-2, -2, 0] },
          { type: 'guide', from: [-2, -2.6, 0], to: [-2, 1.6, 0], dashed: false },
          { type: 'guide', from: [-3, 0, 0], to: [-3, 1, 0], dashed: false },
          { type: 'guide', from: [0, -2, 0], to: [-2, -2, 0], dashed: false },
          { type: 'guide', from: [0, 1, 0], to: [-3, 1, 0], dashed: false },
          { type: 'dim', from: 'O', to: 'A', label: '4 ft', offset: [0, 1.0, 0] },
          { type: 'dim', from: [-2, -2, 0], to: 'C', label: '1 ft', offset: [-0.5, -0.5, 0] },
          { type: 'dim', from: [-3, 1, 0], to: 'B', label: '2 ft', offset: [0, 0.9, 0] },
          { type: 'dim', from: [0, -2, 0], to: [-2, -2, 0], label: '2 ft', offset: [0, -0.8, 0] },
          { type: 'dim', from: [0, 1, 0], to: [-2, 1, 0], label: '2 ft', offset: [0, 0.9, 0] },
          { type: 'dim', from: [-2, 1, 0], to: [-3, 1, 0], label: '1 ft', offset: [0, 0.9, 0] },
          { type: 'dim', from: [-2, 0, 0], to: [-2, -2, 0], label: '2 ft', offset: [-0.9, 0, 0] },
          { type: 'dim', from: [-3, 0, 0], to: [-3, 1, 0], label: '1 ft', offset: [-0.9, 0, 0] }
        ]
      };
    }
  }
];
