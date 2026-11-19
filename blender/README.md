# Blender asset pipeline

Everything 3D on the website is produced by **one script**:
[`scripts/generate_scenes.py`](scripts/generate_scenes.py). It starts from an empty factory scene, so it's
reproducible and never touches a file you have open in Blender.

## What it builds

| Output | Path |
| --- | --- |
| Procedural PBR textures (Athangudi tiles, red oxide, Mangalore roof tiles, teak, black granite, cane, silk, kolam floor, plaster…) | `public/textures/*.jpg` |
| **Mutram Veedu**: a Chettinad-style courtyard house, Draco-compressed GLB (~2.1 MB, ~27k faces, 8 hotspot empties) | `public/models/mutram-veedu.glb` |
| Four more interiors: Adyar flat, Madurai hotel lobby, office, Mylapore Madras-terrace renovation | `public/images/renders/*.webp` |
| Before/after pairs from identical cameras | `public/images/renders/*-before.webp` |
| Plans, roof plan, elevation and axonometric (Workbench render of the model) | `public/images/drawings/*.webp` |
| Half-width `-sm.webp` copies for responsive `srcset` | next to each image |
| Editable source file | `blender/scenes/atelier-noir.blend` |

`scripts/modern_scenes.py` (run from `generate_scenes.py`) adds three modern models, each exported as its own Draco
GLB: `modern-villa.glb`, `modern-flat.glb` and `modern-office.glb`. The flat and the office are cutaways: the front
wall is cut low and the ceiling is a separate `Up_` object that the viewer's section button hides. In the villa, every
object whose name starts with `Up_` (upper floor, stair rail, roof) is hidden by the section button. Hotspots are
`Hotspot_*` empties; their text and camera positions are in `src/data/hotspots-modern.json`. The villa's hero and the
fallback stills are `modern-villa-day`, `modern-villa-dusk`, `modern-villa-living`, `modern-flat-aerial` and
`modern-office-aerial`.

The courtyard house in `mutram-veedu.glb` has: a raised laterite plinth, a thinnai verandah with six octagonal teak pillars, a carved teak
double door with brass studs and a kolam, a four-sided clay-tile roof that drains into a sunken mutram with a tulsi
madam, an oonjal hall, a dining and kitchen wing with brass vessels and an aattukal, a pooja niche, coconut and banana
trees, jasmine, a compound wall and a well.

## Run it

Use Blender 4.2 or later; this was developed and tested on **Blender 5.2.3**. Run from the project root:

```bash
# Everything: textures, .blend, GLB, ~33 renders, drawings, -sm variants (~5 min on an integrated GPU)
blender -b --factory-startup --python blender/scripts/generate_scenes.py -- --root .

# Only rebuild the model + textures + .blend (about 20 s)
blender -b --factory-startup --python blender/scripts/generate_scenes.py -- --root . --skip-renders

# Re-render a few images as quick drafts
blender -b --factory-startup --python blender/scripts/generate_scenes.py -- --root . --no-export --only mutram-courtyard,mutram-oonjal --res-scale 0.5 --samples 16
```

`npm run blender:build` and `npm run blender:model` wrap the first two commands; they need `blender` on your `PATH`.

Options after `--`: `--root PATH`, `--skip-renders`, `--no-export`, `--only id1,id2`, `--samples N` (EEVEE,
default 48), `--res-scale F`, `--thumbs` (regenerate `-sm` images only, with `--skip-renders`).

## How the web viewer uses the model

* Blender object names survive the glTF export. Empties named `Hotspot_*` become clickable hotspots. Their
  descriptions and camera positions live in `src/data/hotspots.json`. Coordinates: Blender `(x, y, z)` maps to
  three.js `(x, z, -y)`.
* `House_Roof` and `House_VerandahRoof` are hidden by the viewer's section (layers) button so you can look inside.
* Lamp materials (`AN_lamp_glow`, `AN_lamp_shade`, `AN_flame`) glow brighter in the Dusk lighting preset.
* The Draco decoder is self-hosted in `public/draco/`.

## Editing

The script is organised top-down: texture generators → materials → mesh builder (`Piece`) → furniture library
(oonjal, kuthuvilakku, uruli, tulsi madam, carved door, coconut tree…) → scenes → save/export → renders. Changing
a dimension and re-running regenerates the model, renderings and drawings together, so they always agree.

The lighting HDRIs come from Blender's bundled CC0 studio lights (Poly Haven). The website copies three of them to
`public/env/`; see `public/env/LICENSE-polyhaven-cc0.txt`.
