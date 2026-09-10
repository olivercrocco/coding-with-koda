# Coding with Koda

Interactive figures for engineering courses. Each course has its own page,
and each page draws the course's problems as 3D scenes that students can
rotate, take apart, and change. The pages show the givens only. They never
show an answer.

The first course page is CE 2450 Statics: force vectors and equilibrium of a
particle, with problems from the Fall 2026 recitations, the Mastering
Engineering homework, and the Chapter 3 notebook.

Everything is static HTML and JavaScript. There is no build step, no framework
and no server-side code. Three.js comes from a CDN, so a page needs an
internet connection the first time it opens.

## Layout

| Path                  | What it is                                                     |
|-----------------------|----------------------------------------------------------------|
| `index.html`          | Home page: the site name and a card for each course            |
| `ce-2450/index.html`  | The CE 2450 Statics page                                       |
| `ce-2450/problems.js` | The CE 2450 problems. Edit this to add or change a problem     |
| `viewer/engine.js`    | The shared 3D viewer. Turns a problem description into a scene |
| `viewer/viewer.css`   | Shared styles for every course page                            |
| `netlify.toml`        | Tells Netlify to publish the folder as it is                   |

## How we work on it together

The code lives in the GitHub repository `olivercrocco/coding-with-koda`, and
the Netlify project `coding-with-koda` publishes it at
`https://coding-with-koda.netlify.app`. Every change saved to the `main`
branch is live about a minute later. Nobody uploads anything by hand.

To add or change a problem without installing anything, open
`ce-2450/problems.js` on GitHub, click the pencil icon, make the edit, and
choose "Commit changes". To work on your own computer instead, clone the
repository, edit, and check the result with the local server below before
committing.

When a change should be reviewed first, commit it to a new branch and open a
pull request. Netlify attaches a preview link to every pull request, so the
new problem can be tried in the browser before it goes live.

## Running it locally

From the repository folder:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`. Use the server rather than double-clicking
an HTML file, since browsers restrict pages opened straight from disk.

## Adding a course

1. Copy the `ce-2450` folder and name the copy after the new course code.
2. In the copy's `index.html`, change the `<title>` and the `<h1>`.
3. Replace the problems in the copy's `problems.js`.
4. Add a card for the course to the home page, the top-level `index.html`.

The course pages share `viewer/engine.js` and `viewer/viewer.css`, so an
improvement to the viewer reaches every course at once.

## Hosting

One-time setup in the Netlify dashboard: open the project `coding-with-koda`,
go to Site configuration, Build and deploy, Continuous deployment, and choose
Link repository, GitHub, and this repository. Leave the build command empty;
`netlify.toml` already sets the publish directory.

Every page carries `<meta name="robots" content="noindex">`, which keeps the
site out of search engines while still letting anyone with the link open it.

Before sharing widely, check with the professor. The recitation problems are
the instructor's, and the homework problems come from Hibbeler's textbook
through Mastering Engineering. The site redraws the geometry rather than
copying the book's artwork, but the problem statements are still theirs.

## Adding a problem

Every problem is one object in the `PROBLEMS` array in the course's
`problems.js` (for CE 2450, `ce-2450/problems.js`). Copy the closest existing
one and change it. The parts:

```js
{
  id: 'hw-3-12',                       // unique, used in the page address (#hw-3-12)
  group: 'Mastering Engineering, Chapter 3',   // sidebar heading
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
