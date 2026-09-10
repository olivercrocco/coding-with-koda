# Coding with Koda: Statics in 3D

A small website that shows CE 2450 statics problems as interactive 3D figures.
Students can rotate each figure, look straight down any axis, switch off
perspective, turn on the rectangular components of each force, step through a
vector construction, change the given values, and switch between the whole
structure and the free-body diagram of a particle. The site draws the givens
only. It never shows an answer.

Everything is static HTML and JavaScript. There is no build step, no
framework and no server-side code. Three.js is loaded from a CDN, so the page
needs an internet connection the first time it opens.

## Files

| File          | What it is                                                   |
|---------------|--------------------------------------------------------------|
| `index.html`  | Page shell, styles, and the three.js loader                  |
| `engine.js`   | The viewer. Turns a problem description into a 3D scene      |
| `problems.js` | The problems. This is the file you edit to add or change one |
| `README.md`   | This file                                                    |

## How we work on it together

The code lives in the GitHub repository `olivercrocco/coding-with-koda`. The
Netlify site is connected to that repository, so every change saved to the
`main` branch is live at the public address within about a minute. Nobody has
to upload anything by hand.

To add or change a problem without installing anything: open `problems.js` on
GitHub, click the pencil icon, edit, and choose "Commit changes". Netlify
rebuilds on its own. To work locally instead, clone the repository, edit, and
run the local server below to check the result before committing.

If a change should be reviewed first, create a branch and open a pull request.
Netlify attaches a preview link to every pull request, so the new problem can
be checked in the browser before it goes live.

## Running it

Open `index.html` in a browser. Double-clicking the file works in Chrome,
Edge and Safari because the three.js modules come from a CDN. If a browser
blocks it, serve the folder instead:

```bash
cd "statics-3d" && python3 -m http.server 8765
```

and open `http://localhost:8765`.

## Putting it online for free (no domain purchase)

Any static host works. Two easy routes:

1. GitHub Pages. Create a repository, upload the four files, then in
   Settings, Pages, choose "Deploy from a branch" and the main branch. The
   site appears at `https://<username>.github.io/<repository>/`.
2. Netlify Drop. Go to `https://app.netlify.com/drop` and drag the folder
   onto the page. You get a `https://<something>.netlify.app` address at once.

Add `<meta name="robots" content="noindex">` (already in `index.html`) if the
site should stay out of search engines. Sharing the link with classmates is
then enough.

Before posting problems publicly, check with the professor. The recitation
problems are the instructor's, and the homework figures come from Hibbeler's
textbook through Mastering Engineering. This site redraws the geometry rather
than copying the book's artwork, but the problem statements are still theirs.

## Adding a problem

Every problem is one object in the `PROBLEMS` array in `problems.js`. Copy
the closest existing one and change it. The parts:

```js
{
  id: 'hw-3-12',                       // unique, used in the page address (#hw-3-12)
  group: 'Mastering Engineering, Chapter 3',
  title: 'Problem 3.12: ...',
  source: 'where it comes from',
  view: '3d',                          // or '2d' for a planar figure (x right, y up)
  extent: 4,                           // rough radius of the figure, in its own units
  center: [0, 2, 1],                   // where the camera looks
  statement: 'Problem text. HTML is allowed: <b>F</b><sub>1</sub>.',
  parts: ['a) ...', 'b) ...'],         // optional
  note: 'shown in a yellow box',       // optional
  params: [{ key: 'W', label: 'Weight (lb)', min: 50, max: 500, step: 10, value: 200 }],
  allowResultant: true,                // offers the "vector sum" checkbox
  hideCoords: true,                    // hides the "reveal coordinates" checkbox
  think: ['a prompt', 'another'],      // optional, shown under "While you look"
  fbd: [ { particle: 'A', title: 'Ring A',
           forces: [ { toward: 'B', label: 'T<sub>AB</sub>' },
                     { dir: [0, 0, -1], mag: 200, label: '200 lb' } ] } ],
  build(p) {                           // p holds the current slider values
    const A = [0, 0, 0], B = [2, 3, 4];
    return {
      points: { A, B },                // named points, usable everywhere below
      axes: { x: 4, y: 4, z: 5, neg: 2 },
      grid: { size: 10, div: 10, center: [0, 0, 0] },   // or false
      forceScale: 1.5 / 200,           // scene units per force unit
      elements: [ ... ]
    };
  }
}
```

`fbd` may also be a function of the parameters, `fbd: (p) => [...]`, when a
known force in the free-body diagram should follow a slider.

### Elements

Positions can be a point name (`'A'`) or a vector (`[x, y, z]`).

| Type       | Fields                                                                 |
|------------|------------------------------------------------------------------------|
| `point`    | `at`, `label` (defaults to the point name), `offset`, `noDot`           |
| `cable`    | `from`, `to`, `thick`, `color`, `label`, `offset`                       |
| `strut`    | `from`, `to`, `thick`, `color`, `label`                                 |
| `spring`   | `from`, `to`, `coils`, `radius`, `label`, `offset`                      |
| `pulley`   | `at`, `axis` (`'x'`,`'y'`,`'z'`), `r`, `label`, `offset`                |
| `weight`   | `at` (top of the body), `shape` (`box`, `cylinder`, `bucket`), `size`, `label`, `offset`, `color` |
| `slab`     | `center`, `normal`, `w`, `h`, `thickness`, `color`, `opacity` (walls, floors, ceilings) |
| `eyebolt`  | `at`, `normal`, `stem`                                                  |
| `wire`     | `points` (a bent wire through them), `thick`, `color`                   |
| `plane`    | `points` (3 or 4), `color`, `opacity` (the shaded triangles in figures) |
| `guide`    | `from`, `to`, `dashed` (default true), `label`                          |
| `label`    | `at`, `text`, `offset`                                                  |
| `dim`      | `from`, `to`, `label`, `offset` (moves the line off the geometry)       |
| `angle`    | `at`, `from` (direction), `to` (direction), `label`, `radius`           |
| `slopeTri` | `at`, `run`, `rise` (directions), `ratio` `[run, rise]`, `labels`, `scale` |
| `force`    | `at`, `dir`, `mag`, `name`, `label`, `color`, `unknown`, `len`, `dashed`, `inResultant` |

Any element can carry `step: n` (shown from step n on, when the problem has a
`steps` list) or `layer: 'key'` (shown when the checkbox for that layer, from
the problem's `layers` list, is on).

### Directions

Wherever a direction is expected (`dir`, `from`, `to`, `run`, `rise`):

| Form                                            | Meaning                                              |
|-------------------------------------------------|------------------------------------------------------|
| `'+x'`, `'-y'`, `'z'` ...                        | along an axis                                        |
| `[1, 2, -0.5]`                                  | any vector (it is normalised)                        |
| `'B'`                                           | toward point B                                       |
| `{ toward: 'B', from: 'A' }`                    | from A toward B                                      |
| `{ angles: [70, 130, null], sign: 1 }`          | coordinate direction angles; the null one is derived |
| `{ azel: { az: 35, from: '+y', toward: '+x', el: 20 } }` | azimuth in the xy-plane, then elevation        |
| `{ planar: { from: '-y', toward: '-x', angle: 30 } }`    | a 2D angle from one axis toward another        |
| `{ slope: [0.9, 1.2] }`                         | a slope triangle in the xy-plane                     |

## Coordinate convention

The viewer uses the textbook convention: z is up, y runs to the right, and x
comes out of the page toward the viewer. The "Textbook view" button puts the
camera where the book's artist stood. For `'2d'` problems the figure lies in
the xy-plane with x to the right and y up, exactly like the two-dimensional
figures in the book, and "Tilt it" shows that it really is flat.
