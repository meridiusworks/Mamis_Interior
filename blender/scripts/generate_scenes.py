"""
ATELIER NOIR — procedural scene generator
=========================================

Builds every 3D asset and still image used by the website from scratch:

* procedural PBR textures (numpy)        -> public/textures/*.jpg
* the "Mutram Veedu" courtyard house    -> public/models/mutram-veedu.glb  (Draco)
* four interior visualisation studies    -> public/images/renders/*.webp
* before / after renovation pairs        -> public/images/renders/*-before.webp
* line drawings (plan / elevation / axo) -> public/images/drawings/*.webp
* the editable source file               -> blender/scenes/atelier-noir.blend

Run headless from the project root (it starts from an empty factory scene and
never touches a file you have open in the Blender UI):

    blender -b --factory-startup --python blender/scripts/generate_scenes.py -- --root .

Options (after the "--"):
    --root PATH        project root (default: two folders above this script)
    --skip-renders     only build, save the .blend and export the GLB
    --only a,b,c       render only the listed image ids
    --samples N        EEVEE samples per render (default 48)
    --res-scale F      scale every render resolution (e.g. 0.5 for drafts)
    --no-export        skip GLB export
"""

import math
import os
import random
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

# ---------------------------------------------------------------------------
# Arguments and paths
# ---------------------------------------------------------------------------

ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def _arg(name, default=None):
    if name in ARGV:
        i = ARGV.index(name)
        if i + 1 < len(ARGV):
            return ARGV[i + 1]
    return default


if not bpy.app.background and "--allow-interactive" not in ARGV:
    raise RuntimeError(
        "generate_scenes.py resets the current file. Run it with `blender -b` "
        "(see the docstring) or pass --allow-interactive to accept that."
    )

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(_arg("--root", os.path.join(SCRIPT_DIR, "..", "..")))
SKIP_RENDERS = "--skip-renders" in ARGV
NO_EXPORT = "--no-export" in ARGV
ONLY = set(filter(None, (_arg("--only", "") or "").split(",")))
SAMPLES = int(_arg("--samples", 48))
RES_SCALE = float(_arg("--res-scale", 1.0))

TEX_DIR = os.path.join(ROOT, "public", "textures")
MODEL_PATH = os.path.join(ROOT, "public", "models", "mutram-veedu.glb")
RENDER_DIR = os.path.join(ROOT, "public", "images", "renders")
DRAWING_DIR = os.path.join(ROOT, "public", "images", "drawings")
BLEND_PATH = os.path.join(ROOT, "blender", "scenes", "atelier-noir.blend")
HDRI_DIR = bpy.utils.system_resource("DATAFILES", path="studiolights/world")

for d in (TEX_DIR, os.path.dirname(MODEL_PATH), RENDER_DIR, DRAWING_DIR, os.path.dirname(BLEND_PATH)):
    os.makedirs(d, exist_ok=True)

T0 = time.time()


def log(msg):
    print(f"[atelier {time.time() - T0:6.1f}s] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Fresh scene
# ---------------------------------------------------------------------------

bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene
SCENE.name = "AtelierNoir"
SCENE.unit_settings.system = "METRIC"
SCENE.unit_settings.scale_length = 1.0
RNG = random.Random(7)


def srgb_to_linear(c):
    c = max(0.0, min(1.0, c))
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


# ---------------------------------------------------------------------------
# Procedural textures (tileable, numpy)
# ---------------------------------------------------------------------------

def value_noise(n, rx, ry, rng):
    """Tileable smooth value noise: rx cells across, ry cells down."""
    g = rng.random((ry, rx)).astype(np.float32)
    xs = np.arange(n) * rx / n
    ys = np.arange(n) * ry / n
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    fx = xs - x0
    fy = ys - y0
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    x1 = (x0 + 1) % rx
    y1 = (y0 + 1) % ry
    a = g[y0][:, x0]
    b = g[y0][:, x1]
    c = g[y1][:, x0]
    d = g[y1][:, x1]
    top = a * (1 - fx) + b * fx
    bot = c * (1 - fx) + d * fx
    return top * (1 - fy)[:, None] + bot * fy[:, None]


def fbm(n, rx, ry, octaves, rng, gain=0.5):
    total = np.zeros((n, n), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        total += amp * value_noise(n, max(1, rx * 2 ** o), max(1, ry * 2 ** o), rng)
        norm += amp
        amp *= gain
    return total / norm


def grid(n):
    u = (np.arange(n) + 0.5) / n
    return np.meshgrid(u, u)  # U along columns, V along rows


def lerp_color(a, b, t):
    a = np.array(hex_rgb(a), np.float32)
    b = np.array(hex_rgb(b), np.float32)
    t = np.clip(t, 0, 1)[..., None]
    return a * (1 - t) + b * t


def normal_from_height(h, strength):
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    nz = np.ones_like(h)
    length = np.sqrt(dx * dx + dy * dy + nz * nz)
    return np.stack([-dx / length, -dy / length, nz / length], -1) * 0.5 + 0.5


def save_texture(name, rgb, non_color=False):
    n = rgb.shape[0]
    img = bpy.data.images.new(name, n, n, alpha=False)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((n, n, 1), np.float32)], -1)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    path = os.path.join(TEX_DIR, name + ".jpg")
    img.filepath_raw = path
    img.file_format = "JPEG"
    try:
        img.save(quality=86)
    except TypeError:
        img.save()
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img


TEX = {}


def tex_wood(name, light, dark, planks=8, boards=2, seed=1, vertical=False, gap=True, n=1024):
    rng = np.random.default_rng(seed)
    U, V = grid(n)
    row = np.floor(V * planks).astype(int)
    shift = rng.random(planks + 1)
    seg = (U + shift[row]) * boards
    board_id = (np.floor(seg).astype(int) + row * 31) % 997
    tone = np.random.default_rng(seed + 9).random(1000)[board_id]
    streak = fbm(n, 2, 40, 4, rng)
    ring = 0.5 + 0.5 * np.sin(2 * np.pi * (V * planks * 3 + streak * 3.0 + tone * 4))
    fine = value_noise(n, 6, 300, rng)
    val = 0.45 * streak + 0.25 * ring + 0.2 * tone + 0.1 * fine
    val = (val - val.min()) / (val.max() - val.min())
    col = lerp_color(dark, light, val)
    height = val * 0.6
    if gap:
        joint = ((V * planks) % 1.0 < 0.010) | ((seg % 1.0) < 0.0035)
        col[joint] *= 0.35
        height[joint] = -0.6
    nrm = normal_from_height(height, 2.2)
    if vertical:
        col = np.transpose(col, (1, 0, 2))
        nrm = np.transpose(nrm, (1, 0, 2))[..., [1, 0, 2]]
    TEX[name] = save_texture(name, col)
    TEX[name + "_normal"] = save_texture(name + "_normal", nrm, non_color=True)


def tex_travertine(n=1024):
    rng = np.random.default_rng(3)
    U, V = grid(n)
    bands = fbm(n, 2, 18, 5, rng)
    cloud = fbm(n, 4, 4, 5, rng)
    pits_n = value_noise(n, 48, 160, rng)
    pits = np.clip((pits_n - 0.80) * 8, 0, 1)
    val = 0.6 * bands + 0.4 * cloud
    col = lerp_color("#b8a588", "#e6dccb", val)
    col *= (1 - 0.35 * pits)[..., None]
    height = val * 0.2 - pits * 0.8
    TEX["travertine"] = save_texture("travertine", col)
    TEX["travertine_normal"] = save_texture("travertine_normal", normal_from_height(height, 3.0), True)


def tex_marble(n=1024):
    rng = np.random.default_rng(5)
    U, V = grid(n)
    warp = fbm(n, 3, 3, 6, rng)
    vein = 1 - np.abs(np.sin(2 * np.pi * (U * 2 + V * 1 + warp * 2.2)))
    vein = vein ** 18
    vein2 = (1 - np.abs(np.sin(2 * np.pi * (U * 3 - V * 2 + warp * 3.4)))) ** 40
    cloud = fbm(n, 6, 6, 4, rng)
    col = lerp_color("#f4f1ec", "#dcd6cc", cloud * 0.7)
    col = col * (1 - 0.55 * vein[..., None]) - 0.25 * vein2[..., None] * np.array([0.5, 0.5, 0.48])
    TEX["marble"] = save_texture("marble", np.clip(col, 0, 1))


def tex_concrete(name="concrete", light="#bdb8ae", dark="#8f8a80", seed=11, n=1024):
    rng = np.random.default_rng(seed)
    cloud = fbm(n, 4, 4, 6, rng)
    pores = np.clip((value_noise(n, 200, 200, rng) - 0.82) * 6, 0, 1)
    col = lerp_color(dark, light, cloud) * (1 - 0.4 * pores)[..., None]
    height = cloud * 0.3 - pores
    TEX[name] = save_texture(name, col)
    TEX[name + "_normal"] = save_texture(name + "_normal", normal_from_height(height, 1.6), True)


def tex_paving(n=1024):
    rng = np.random.default_rng(13)
    U, V = grid(n)
    cols_, rows_ = 2, 4
    row = np.floor(V * rows_).astype(int)
    offset = (row % 2) * 0.5
    cid = np.floor((U * cols_ + offset) % cols_).astype(int) + row * 7
    tone = np.random.default_rng(2).random(64)[cid % 64]
    cloud = fbm(n, 6, 6, 5, rng)
    col = lerp_color("#a99f8c", "#d4cbb9", 0.55 * cloud + 0.45 * tone)
    joint = ((V * rows_) % 1 < 0.006) | (((U * cols_ + offset) % 1) < 0.003)
    col[joint] = np.array(hex_rgb("#6f6a60"))
    height = cloud * 0.2
    height[joint] = -1
    TEX["paving"] = save_texture("paving", col)
    TEX["paving_normal"] = save_texture("paving_normal", normal_from_height(height, 2.0), True)


def tex_plaster(name, light, dark, seed=17, n=512):
    rng = np.random.default_rng(seed)
    cloud = fbm(n, 3, 3, 6, rng, gain=0.6)
    TEX[name] = save_texture(name, lerp_color(dark, light, cloud))


def tex_fabric(name, light, dark, seed=19, n=512, scale=96):
    rng = np.random.default_rng(seed)
    U, V = grid(n)
    weave = 0.5 + 0.25 * np.sin(2 * np.pi * U * scale) + 0.25 * np.sin(2 * np.pi * V * scale)
    slub = value_noise(n, 8, 160, rng)
    cloud = fbm(n, 4, 4, 4, rng)
    val = 0.45 * weave + 0.3 * slub + 0.25 * cloud
    TEX[name] = save_texture(name, lerp_color(dark, light, val))
    if "fabric_normal" not in TEX:
        TEX["fabric_normal"] = save_texture("fabric_normal", normal_from_height(weave * 0.6 + slub * 0.3, 1.2), True)


def tex_brick(n=1024):
    rng = np.random.default_rng(23)
    U, V = grid(n)
    rows_, cols_ = 16, 4
    row = np.floor(V * rows_).astype(int)
    offset = (row % 2) * 0.5
    bid = (np.floor(U * cols_ + offset).astype(int) % cols_) + row * cols_
    tone = np.random.default_rng(4).random(rows_ * cols_ + 8)[bid]
    cloud = fbm(n, 8, 8, 5, rng)
    col = lerp_color("#6e3b2a", "#a8644a", 0.5 * tone + 0.5 * cloud)
    mortar = ((V * rows_) % 1 < 0.10) | (((U * cols_ + offset) % 1) < 0.025)
    col[mortar] = lerp_color("#8d867a", "#b6afa2", cloud)[mortar]
    height = cloud * 0.3
    height[mortar] = -0.8
    TEX["brick"] = save_texture("brick", col)
    TEX["brick_normal"] = save_texture("brick_normal", normal_from_height(height, 2.5), True)


def tex_metal(n=512):
    rng = np.random.default_rng(29)
    streak = value_noise(n, 2, 400, rng) * 0.6 + value_noise(n, 1, 120, rng) * 0.4
    TEX["brushed_metal"] = save_texture("brushed_metal", lerp_color("#8a8780", "#c9c6bf", streak))


def tex_ceramic(n=1024):
    rng = np.random.default_rng(31)
    U, V = grid(n)
    k = 8
    tid = np.floor(U * k).astype(int) + np.floor(V * k).astype(int) * k
    tone = np.random.default_rng(6).random(k * k)[tid]
    glaze = fbm(n, 16, 16, 4, rng)
    col = lerp_color("#4f5d4e", "#8c9a83", 0.6 * tone + 0.4 * glaze)
    joint = ((U * k) % 1 < 0.02) | ((V * k) % 1 < 0.02)
    col[joint] = np.array(hex_rgb("#d9d3c6"))
    height = glaze * 0.4
    height[joint] = -1
    TEX["ceramic"] = save_texture("ceramic", col)
    TEX["ceramic_normal"] = save_texture("ceramic_normal", normal_from_height(height, 2.0), True)


def tex_grass(n=512):
    rng = np.random.default_rng(37)
    cloud = fbm(n, 6, 6, 6, rng, gain=0.6)
    TEX["grass"] = save_texture("grass", lerp_color("#4c5638", "#77805a", cloud))


# --- South Indian palette ---------------------------------------------------

def _paint(col, mask, hex_color):
    col[mask] = np.array(hex_rgb(hex_color), np.float32)


def tex_athangudi(n=1024):
    """Handmade Athangudi-style cement tiles: corner quarter-circles form rings
    across tiles, with a four-petal flower in each centre."""
    rng = np.random.default_rng(41)
    U, V = grid(n)
    k = 4
    s = (U * k) % 1.0
    t = (V * k) % 1.0
    col = lerp_color("#e6d6b4", "#f1e5c9", fbm(n, 8, 8, 4, rng))
    dc = np.minimum(np.minimum(np.hypot(s, t), np.hypot(1 - s, t)), np.minimum(np.hypot(s, 1 - t), np.hypot(1 - s, 1 - t)))
    _paint(col, dc < 0.30, "#7d2a22")
    _paint(col, dc < 0.20, "#e6d6b4")
    _paint(col, dc < 0.12, "#2f6763")
    petals = np.minimum.reduce([np.hypot(s - 0.5 - dx, t - 0.5 - dy) for dx, dy in ((0.15, 0), (-0.15, 0), (0, 0.15), (0, -0.15))])
    _paint(col, petals < 0.11, "#c9912e")
    _paint(col, np.hypot(s - 0.5, t - 0.5) < 0.06, "#7d2a22")
    joint = (s < 0.008) | (t < 0.008)
    _paint(col, joint, "#9a8c72")
    col *= (0.94 + 0.08 * fbm(n, 16, 16, 3, rng))[..., None]
    height = np.zeros((n, n), np.float32)
    height[joint] = -1
    TEX["athangudi"] = save_texture("athangudi", np.clip(col, 0, 1))
    TEX["athangudi_normal"] = save_texture("athangudi_normal", normal_from_height(height, 1.5), True)


def tex_red_oxide(n=512):
    rng = np.random.default_rng(43)
    cloud = fbm(n, 3, 3, 6, rng, gain=0.6)
    TEX["red_oxide"] = save_texture("red_oxide", lerp_color("#7c2a1f", "#a3402d", cloud))


def tex_roof_tiles(n=1024):
    """Interlocking Mangalore clay tiles: rows along U, two ribs per tile."""
    rng = np.random.default_rng(47)
    U, V = grid(n)
    rows, per_row = 10, 8
    row = np.floor(V * rows).astype(int)
    fv = (V * rows) % 1.0
    tid = np.floor(U * per_row).astype(int) + row * per_row
    tone = np.random.default_rng(8).random(rows * per_row + 4)[tid]
    rib = np.abs(np.sin(np.pi * ((U * per_row * 2) % 1.0)))
    shade = 0.55 + 0.45 * fv  # darker where the row above overlaps
    cloud = fbm(n, 8, 8, 4, rng)
    col = lerp_color("#8a3d22", "#cf7a4b", 0.45 * tone + 0.25 * cloud + 0.3 * rib) * shade[..., None]
    height = rib * 0.35 + fv * 0.8
    TEX["roof_tiles"] = save_texture("roof_tiles", np.clip(col, 0, 1))
    TEX["roof_tiles_normal"] = save_texture("roof_tiles_normal", normal_from_height(height, 2.5), True)


def tex_granite_black(n=512):
    rng = np.random.default_rng(53)
    cloud = fbm(n, 6, 6, 4, rng)
    speck = value_noise(n, 180, 180, rng)
    col = lerp_color("#151516", "#2c2b2a", cloud)
    col[speck > 0.86] = np.array(hex_rgb("#6f6b66"))
    col[speck > 0.95] = np.array(hex_rgb("#b9b2a6"))
    TEX["granite_black"] = save_texture("granite_black", col)


def tex_cane(n=512):
    """Open cane weave for chairs and the oonjal back."""
    U, V = grid(n)
    k = 18
    a = np.abs(np.sin(np.pi * (U + V) * k))
    b = np.abs(np.sin(np.pi * (U - V) * k))
    c = np.abs(np.sin(np.pi * V * k * 1.4))
    strand = np.maximum.reduce([a, b, c])
    col = lerp_color("#4a3320", "#dcbf87", np.clip((strand - 0.45) * 2.2, 0, 1))
    TEX["cane"] = save_texture("cane", col)
    TEX["cane_normal"] = save_texture("cane_normal", normal_from_height(strand, 2.0), True)


def tex_silk(n=512):
    """Deep red silk with a gold zari border, after Kanchipuram weaves."""
    rng = np.random.default_rng(59)
    U, V = grid(n)
    sheen = 0.5 + 0.5 * np.sin(2 * np.pi * U * 120) * 0.3 + 0.2 * fbm(n, 4, 4, 3, rng)
    col = lerp_color("#6e0f1d", "#a8243a", sheen)
    band = ((V > 0.06) & (V < 0.16)) | ((V > 0.84) & (V < 0.94))
    gold = lerp_color("#9c7a33", "#e2c06a", 0.5 + 0.5 * np.sin(2 * np.pi * U * 40))
    col[band] = gold[band]
    motif = np.hypot(((U * 16) % 1) - 0.5, ((V * 16) % 1) - 0.5) < 0.12
    col[motif & ~band & (V > 0.2) & (V < 0.8)] = np.array(hex_rgb("#c9a14a"))
    TEX["silk_red"] = save_texture("silk_red", col)


def tex_kolam(n=1024):
    """Red oxide floor with a rice-flour pulli kolam centred on the tile corner,
    so a 2.4 m square placed on the 2.4 m UV grid shows one whole kolam."""
    rng = np.random.default_rng(61)
    U, V = grid(n)
    X = ((U + 0.5) % 1.0) - 0.5
    Y = ((V + 0.5) % 1.0) - 0.5
    col = lerp_color("#7c2a1f", "#a3402d", fbm(n, 3, 3, 5, rng, gain=0.6))
    ink = np.zeros((n, n), bool)
    sp = 0.1
    inside = (np.abs(X) + np.abs(Y)) < 0.36
    gx = X / sp - np.round(X / sp)
    gy = Y / sp - np.round(Y / sp)
    ink |= inside & (np.hypot(gx, gy) * sp < 0.011)  # pulli (dots)
    d1 = np.abs(((X + Y) / sp + 0.5) % 1.0 - 0.5) * sp
    d2 = np.abs(((X - Y) / sp + 0.5) % 1.0 - 0.5) * sp
    ink |= inside & ((d1 < 0.004) | (d2 < 0.004)) & (np.hypot(gx, gy) * sp > 0.025)  # lattice weaving between dots
    ink |= np.abs(np.abs(X) + np.abs(Y) - 0.38) < 0.005  # diamond border
    r = np.hypot(X, Y)
    ang = np.arctan2(Y, X)
    petal = np.abs(r - (0.43 + 0.035 * np.cos(8 * ang))) < 0.005
    ink |= petal & (r < 0.48)
    ink |= np.abs(r - 0.47) < 0.003
    chalk = lerp_color("#d9d2c6", "#fbf7ef", value_noise(n, 300, 300, rng))
    col[ink] = chalk[ink]
    TEX["kolam_floor"] = save_texture("kolam_floor", col)


log("generating textures")
tex_wood("oak", "#c9a47a", "#8d6844", planks=8, boards=2, seed=1)
tex_wood("walnut", "#7a5238", "#3f2a1d", planks=6, boards=1, seed=2, gap=False)
tex_wood("timber_cladding", "#9b8063", "#5c4a39", planks=14, boards=1, seed=3, vertical=True)
tex_travertine()
tex_marble()
tex_concrete()
tex_concrete("concrete_raw", "#9c978e", "#6b675f", seed=12)
tex_paving()
tex_plaster("plaster", "#f1ece2", "#ddd5c6")
tex_plaster("plaster_aged", "#d8cfae", "#a99f7e", seed=18)
tex_fabric("fabric_ivory", "#efe9dd", "#cdc4b3", seed=19)
tex_fabric("fabric_olive", "#7d8261", "#4a4e36", seed=20)
tex_fabric("fabric_charcoal", "#4a4945", "#262522", seed=21)
tex_fabric("fabric_stone", "#c8bba4", "#97896f", seed=22)
tex_fabric("wool_rug", "#ddd3c1", "#b3a68f", seed=24, scale=48)
tex_brick()
tex_metal()
tex_ceramic()
tex_grass()
tex_wood("teak", "#b07a45", "#6b4423", planks=6, boards=1, seed=5)
tex_athangudi()
tex_red_oxide()
tex_roof_tiles()
tex_granite_black()
tex_cane()
tex_silk()
tex_kolam()
tex_plaster("plaster_ochre", "#e8c98f", "#cfa766", seed=63)

# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

M = {}


def make_mat(key, color="#ffffff", tex=None, normal=None, rough=0.6, metal=0.0, tile=1.0,
             alpha=1.0, emit=None, emit_strength=0.0, normal_strength=0.6):
    m = bpy.data.materials.new("AN_" + key)
    try:
        m.use_nodes = True
    except AttributeError:
        pass
    nt = m.node_tree
    p = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    if tex:
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = TEX[tex]
        node.location = (-420, 260)
        nt.links.new(node.outputs["Color"], p.inputs["Base Color"])
    else:
        rgb = hex_rgb(color)
        p.inputs["Base Color"].default_value = (*[srgb_to_linear(c) for c in rgb], 1)
    if normal:
        nimg = nt.nodes.new("ShaderNodeTexImage")
        nimg.image = TEX[normal]
        nimg.location = (-620, -200)
        nmap = nt.nodes.new("ShaderNodeNormalMap")
        nmap.inputs["Strength"].default_value = normal_strength
        nmap.location = (-300, -200)
        nt.links.new(nimg.outputs["Color"], nmap.inputs["Color"])
        nt.links.new(nmap.outputs["Normal"], p.inputs["Normal"])
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if alpha < 1:
        p.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
        if hasattr(m, "use_transparent_shadow"):
            m.use_transparent_shadow = True
    if emit:
        p.inputs["Emission Color"].default_value = (*[srgb_to_linear(c) for c in hex_rgb(emit)], 1)
        p.inputs["Emission Strength"].default_value = emit_strength
    m["tile"] = tile
    m.diffuse_color = (*[srgb_to_linear(c) for c in hex_rgb(color)], alpha)
    M[key] = m
    return m


make_mat("oak", tex="oak", normal="oak_normal", rough=0.55, tile=2.4)
make_mat("walnut", tex="walnut", normal="walnut_normal", rough=0.45, tile=1.6, normal_strength=0.3)
make_mat("cladding", tex="timber_cladding", normal="timber_cladding_normal", rough=0.75, tile=3.0)
make_mat("travertine", tex="travertine", normal="travertine_normal", rough=0.7, tile=2.2)
make_mat("marble", tex="marble", rough=0.18, tile=1.8)
make_mat("concrete", tex="concrete", normal="concrete_normal", rough=0.85, tile=3.0, normal_strength=0.4)
make_mat("concrete_raw", tex="concrete_raw", normal="concrete_normal", rough=0.9, tile=2.0, normal_strength=0.8)
make_mat("polished_concrete", tex="concrete", rough=0.28, tile=4.0)
make_mat("paving", tex="paving", normal="paving_normal", rough=0.75, tile=3.0)
make_mat("plaster", tex="plaster", rough=0.9, tile=2.5)
make_mat("plaster_aged", tex="plaster_aged", rough=0.85, tile=2.5)
make_mat("fabric_ivory", tex="fabric_ivory", normal="fabric_normal", rough=0.95, tile=0.5)
make_mat("fabric_olive", tex="fabric_olive", normal="fabric_normal", rough=0.9, tile=0.5)
make_mat("fabric_charcoal", tex="fabric_charcoal", normal="fabric_normal", rough=0.95, tile=0.5)
make_mat("fabric_stone", tex="fabric_stone", normal="fabric_normal", rough=0.95, tile=0.5)
make_mat("wool_rug", tex="wool_rug", normal="fabric_normal", rough=1.0, tile=1.0)
make_mat("brick", tex="brick", normal="brick_normal", rough=0.9, tile=2.0)
make_mat("brushed_metal", tex="brushed_metal", rough=0.35, metal=1.0, tile=1.0)
make_mat("ceramic", tex="ceramic", normal="ceramic_normal", rough=0.25, tile=1.2)
make_mat("grass", tex="grass", rough=1.0, tile=6.0)
make_mat("bronze", "#3b3127", rough=0.4, metal=1.0)
make_mat("brass", "#b08d57", rough=0.3, metal=1.0)
make_mat("black_steel", "#1d1d1b", rough=0.5, metal=0.8)
make_mat("glass", "#cfd8d6", rough=0.04, alpha=0.16)
make_mat("glass_dirty", "#9ea39b", rough=0.4, alpha=0.55)
make_mat("water", "#1f4b4f", rough=0.04, alpha=0.82)
make_mat("pool_liner", "#4d6a68", rough=0.6)
make_mat("leaves", "#4e5a3a", rough=0.8)
make_mat("leaves_light", "#6f7a4d", rough=0.8)
make_mat("bark", "#4a3d31", rough=0.9)
make_mat("ceramic_white", "#ece6db", rough=0.35)
make_mat("ceramic_black", "#22211f", rough=0.4)
make_mat("linen", "#ebe5d8", rough=0.95)
make_mat("charcoal", "#252421", rough=0.7)
make_mat("stone_dark", "#55524b", rough=0.6)
make_mat("art_olive", "#6f735d", rough=0.9)
make_mat("art_stone", "#c4b59b", rough=0.9)
make_mat("art_ink", "#2a2a27", rough=0.9)
make_mat("lamp_glow", "#ffffff", emit="#ffd9a8", emit_strength=8.0, rough=0.5)
make_mat("lamp_shade", "#efe6d3", emit="#ffd9a8", emit_strength=1.2, rough=0.9)
make_mat("fluorescent", "#ffffff", emit="#e8f0ff", emit_strength=10.0)
make_mat("vinyl_old", "#9b927b", rough=0.6)
make_mat("cardboard", "#a88a62", rough=0.95)
make_mat("paint_old", "#cfc7a8", rough=0.9)
make_mat("book_a", "#7b6a52", rough=0.8)
make_mat("book_b", "#3e3c35", rough=0.8)
make_mat("book_c", "#b9ad98", rough=0.8)
make_mat("book_d", "#77796c", rough=0.8)
make_mat("leather", "#5a3a26", rough=0.55)
make_mat("teak", tex="teak", normal="teak_normal", rough=0.5, tile=1.6, normal_strength=0.3)
make_mat("athangudi", tex="athangudi", normal="athangudi_normal", rough=0.3, tile=1.2)
make_mat("red_oxide", tex="red_oxide", rough=0.18, tile=3.0)
make_mat("kolam_floor", tex="kolam_floor", rough=0.25, tile=2.4)
make_mat("roof_tiles", tex="roof_tiles", normal="roof_tiles_normal", rough=0.75, tile=2.5, normal_strength=1.0)
make_mat("granite_black", tex="granite_black", rough=0.12, tile=1.5)
make_mat("cane", tex="cane", normal="cane_normal", rough=0.7, tile=0.4)
make_mat("silk_red", tex="silk_red", rough=0.45, tile=0.8)
make_mat("plaster_ochre", tex="plaster_ochre", rough=0.9, tile=2.5)
make_mat("copper", "#b4673f", rough=0.3, metal=1.0)
make_mat("flame", "#ffffff", emit="#ffb347", emit_strength=25.0)
make_mat("marigold", "#e8901c", rough=0.8)
make_mat("jasmine", "#f6f2e6", rough=0.8)
make_mat("tulsi", "#3f5a2c", rough=0.8)
make_mat("banana_leaf", "#5f8a35", rough=0.6)
make_mat("coconut", "#6b4a2b", rough=0.7)
make_mat("art_red", "#8e1f24", rough=0.6)
make_mat("vitrified", "#d9d2c3", rough=0.3)
make_mat("laterite", "#9c5a3c", rough=0.95)

# ---------------------------------------------------------------------------
# Mesh builder: one object per element, faces carry material indices
# ---------------------------------------------------------------------------


class Piece:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.done = self.bm.faces.layers.int.new("an_done")
        self.uvswap = self.bm.faces.layers.int.new("an_uvswap")
        self.mats = []

    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _tag(self, mat):
        """Assign `mat` to faces created since the last call (bmesh reuses freed slots, so
        new faces are found by an attribute flag rather than by position)."""
        mi = self._mi(mat)
        for f in self.bm.faces:
            if not f[self.done]:
                f.material_index = mi
                f.smooth = True
                f[self.done] = 1

    @staticmethod
    def _matrix(center, rot, scale):
        mat = Matrix.Translation(Vector(center))
        if rot:
            mat = mat @ Euler(rot).to_matrix().to_4x4()
        return mat @ Matrix.Diagonal((*scale, 1.0))

    def box(self, center, size, mat, bevel=0.0, seg=2, rot=None):
        res = bmesh.ops.create_cube(self.bm, size=1.0, matrix=self._matrix(center, rot, size))
        if bevel > 0:
            edges = list({e for v in res["verts"] for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=edges, offset=min(bevel, 0.45 * min(size)), segments=seg,
                            profile=0.5, affect="EDGES", clamp_overlap=True)
        self._tag(mat)

    def box_matrix(self, matrix, size, mat):
        """Box placed by a full transform matrix (used for fronds and leaves)."""
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=matrix @ Matrix.Diagonal((*size, 1.0)))
        self._tag(mat)

    def box_minmax(self, lo, hi, mat, **kw):
        c = [(a + b) / 2 for a, b in zip(lo, hi)]
        s = [abs(b - a) for a, b in zip(lo, hi)]
        if min(s) > 1e-4:
            self.box(c, s, mat, **kw)

    def cyl(self, center, r, depth, mat, segs=32, r2=None, rot=None):
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r,
                              radius2=r if r2 is None else r2, depth=depth,
                              matrix=self._matrix(center, rot, (1, 1, 1)))
        self._tag(mat)

    def sphere(self, center, r, mat, subdiv=2, scale=(1, 1, 1), jitter=0.0):
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=r,
                                         matrix=self._matrix(center, None, scale))
        if jitter:
            for v in res["verts"]:
                v.co += Vector((RNG.uniform(-1, 1), RNG.uniform(-1, 1), RNG.uniform(-1, 1))) * jitter * r
        self._tag(mat)

    def torus(self, center, R, r, mat, seg=64, ring=12):
        cx, cy, cz = center
        verts = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            row = []
            for j in range(ring):
                b = 2 * math.pi * j / ring
                d = R + r * math.cos(b)
                row.append(self.bm.verts.new((cx + d * math.cos(a), cy + d * math.sin(a), cz + r * math.sin(b))))
            verts.append(row)
        for i in range(seg):
            for j in range(ring):
                self.bm.faces.new((verts[i][j], verts[(i + 1) % seg][j],
                                   verts[(i + 1) % seg][(j + 1) % ring], verts[i][(j + 1) % ring]))
        self._tag(mat)

    def hexa(self, bottom, top, top_mat, side_mat, uv_swap=False):
        """Eight-corner solid (e.g. a sloped roof slab). `bottom` and `top` are
        four corners each, counter-clockwise from above. The top face gets
        `top_mat`; `uv_swap` turns its texture 90 degrees (tile rows along Y)."""
        b = [self.bm.verts.new(c) for c in bottom]
        t = [self.bm.verts.new(c) for c in top]
        quads = [(t[0], t[1], t[2], t[3]), (b[3], b[2], b[1], b[0])]
        quads += [(b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]) for i in range(4)]
        faces = [self.bm.faces.new(q) for q in quads]
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        top_i, side_i = self._mi(top_mat), self._mi(side_mat)
        for i, f in enumerate(faces):
            f.material_index = top_i if i == 0 else side_i
            f.smooth = False
            f[self.done] = 1
            f[self.uvswap] = 1 if (uv_swap and i == 0) else 0

    def build(self, coll, loc=(0, 0, 0), rot_z=0.0, shadow=True):
        bm = self.bm
        bm.normal_update()
        uv = bm.loops.layers.uv.verify()
        off = Vector(loc) if rot_z == 0 else Vector((0, 0, 0))
        for f in bm.faces:
            tile = self.mats[f.material_index].get("tile", 1.0) if self.mats else 1.0
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            for lp in f.loops:
                co = lp.vert.co + off
                if ax == 0:
                    u, v = co.y, co.z
                elif ax == 1:
                    u, v = co.x, co.z
                else:
                    u, v = co.x, co.y
                if f[self.uvswap]:
                    u, v = v, u
                lp[uv].uv = (u / tile, v / tile)
        me = bpy.data.meshes.new(self.name)
        bm.to_mesh(me)
        bm.free()
        for m in self.mats:
            me.materials.append(m)
        me.set_sharp_from_angle(angle=math.radians(46))
        ob = bpy.data.objects.new(self.name, me)
        ob.location = loc
        ob.rotation_euler = (0, 0, rot_z)
        coll.objects.link(ob)
        if not shadow:
            ob.visible_shadow = False
        return ob


def new_coll(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or SCENE.collection).children.link(c)
    return c


def add_light(coll, name, kind, loc, energy, color="#ffe6c7", size=1.0, rot=None, size_y=None):
    ld = bpy.data.lights.new(name, kind)
    ld.energy = energy
    ld.color = [srgb_to_linear(c) for c in hex_rgb(color)]
    if kind == "AREA":
        ld.shape = "RECTANGLE"
        ld.size = size
        ld.size_y = size_y or size
    elif kind in ("POINT", "SPOT"):
        ld.shadow_soft_size = size
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    if rot:
        ob.rotation_euler = rot
    coll.objects.link(ob)
    return ob


def add_empty(coll, name, loc):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "SPHERE"
    ob.empty_display_size = 0.3
    ob.location = loc
    coll.objects.link(ob)
    return ob


# ---------------------------------------------------------------------------
# Architecture helpers
# ---------------------------------------------------------------------------


def wall(pc, run, a0, a1, t0, t1, z0, z1, mat, openings=(), bevel=0.0):
    """Wall running along `run` ('x' or 'y') with rectangular openings (a0, a1, za, zb)."""

    def put(a_lo, a_hi, zl, zh):
        if a_hi - a_lo < 1e-3 or zh - zl < 1e-3:
            return
        if run == "x":
            pc.box_minmax((a_lo, t0, zl), (a_hi, t1, zh), mat, bevel=bevel)
        else:
            pc.box_minmax((t0, a_lo, zl), (t1, a_hi, zh), mat, bevel=bevel)

    cur = a0
    for (oa, ob, za, zb) in sorted(openings):
        put(cur, oa, z0, z1)
        put(oa, ob, z0, za)
        put(oa, ob, zb, z1)
        cur = ob
    put(cur, a1, z0, z1)


def glazing(glass_pc, frame_pc, run, a0, a1, t, z0, z1, mullions=0, transom=None,
            frame=0.05, glass_mat=None, frame_mat=None):
    """Glass pane with a slim frame; t is the wall-plane coordinate."""
    glass_mat = glass_mat or M["glass"]
    frame_mat = frame_mat or M["bronze"]

    def b(pc, lo_a, hi_a, lo_z, hi_z, depth, mat):
        if run == "x":
            pc.box_minmax((lo_a, t - depth / 2, lo_z), (hi_a, t + depth / 2, hi_z), mat)
        else:
            pc.box_minmax((t - depth / 2, lo_a, lo_z), (t + depth / 2, hi_a, hi_z), mat)

    b(glass_pc, a0, a1, z0, z1, 0.02, glass_mat)
    b(frame_pc, a0, a1, z0, z0 + frame, 0.09, frame_mat)
    b(frame_pc, a0, a1, z1 - frame, z1, 0.09, frame_mat)
    b(frame_pc, a0, a0 + frame, z0, z1, 0.09, frame_mat)
    b(frame_pc, a1 - frame, a1, z0, z1, 0.09, frame_mat)
    for i in range(1, mullions + 1):
        a = a0 + (a1 - a0) * i / (mullions + 1)
        b(frame_pc, a - frame / 2, a + frame / 2, z0, z1, 0.09, frame_mat)
    for zt in (transom or []):
        b(frame_pc, a0, a1, zt - frame / 2, zt + frame / 2, 0.09, frame_mat)


# ---------------------------------------------------------------------------
# Furniture library (local coordinates: origin on the floor, front faces -Y)
# ---------------------------------------------------------------------------


def sofa(coll, name, loc, rot=0.0, length=3.0, depth=0.98, fabric="fabric_ivory", base="walnut"):
    p = Piece(name)
    f, b = M[fabric], M[base]
    p.box((0, 0, 0.06), (length - 0.1, depth - 0.1, 0.12), b, bevel=0.01)
    arm = 0.2
    for s in (-1, 1):
        p.box((s * (length / 2 - arm / 2), 0, 0.42), (arm, depth, 0.6), f, bevel=0.05, seg=3)
    p.box((0, depth / 2 - 0.11, 0.48), (length, 0.22, 0.72), f, bevel=0.05, seg=3)
    inner = length - 2 * arm
    n = 3 if length > 2.4 else 2
    cw = inner / n
    for i in range(n):
        x = -inner / 2 + cw * (i + 0.5)
        p.box((x, -0.1, 0.32), (cw - 0.015, depth - 0.24, 0.2), f, bevel=0.06, seg=3)
        p.box((x, depth / 2 - 0.3, 0.62), (cw - 0.02, 0.2, 0.42), f, bevel=0.07, seg=3, rot=(math.radians(-8), 0, 0))
    return p.build(coll, loc, rot)


def lounge_chair(coll, name, loc, rot=0.0, fabric="fabric_stone", wood="walnut"):
    p = Piece(name)
    f, w = M[fabric], M[wood]
    for sx in (-1, 1):
        p.box((sx * 0.38, 0, 0.3), (0.05, 0.8, 0.05), w, bevel=0.01)
        for sy in (-1, 1):
            p.cyl((sx * 0.38, sy * 0.36, 0.15), 0.022, 0.3, w, segs=12)
        p.box((sx * 0.38, 0.05, 0.55), (0.05, 0.6, 0.04), w, bevel=0.01)
        p.cyl((sx * 0.38, -0.2, 0.43), 0.018, 0.24, w, segs=12)
    p.box((0, -0.02, 0.37), (0.72, 0.72, 0.16), f, bevel=0.05, seg=3)
    p.box((0, 0.33, 0.62), (0.72, 0.16, 0.5), f, bevel=0.06, seg=3, rot=(math.radians(-14), 0, 0))
    return p.build(coll, loc, rot)


def coffee_table(coll, name, loc, r=0.6, top="marble", base="travertine"):
    p = Piece(name)
    p.cyl((0, 0, 0.35), r, 0.05, M[top], segs=48)
    p.cyl((0, 0, 0.165), r * 0.55, 0.33, M[base], segs=40)
    return p.build(coll, loc)


def side_table(coll, name, loc, mat="travertine"):
    p = Piece(name)
    p.cyl((0, 0, 0.26), 0.24, 0.52, M[mat], segs=32)
    return p.build(coll, loc)


def dining_table(coll, name, loc, rot=0.0, length=2.6, width=1.0, top="oak", legs="walnut"):
    p = Piece(name)
    p.box((0, 0, 0.725), (length, width, 0.05), M[top], bevel=0.008)
    for s in (-1, 1):
        p.box((s * (length / 2 - 0.4), 0, 0.35), (0.08, width - 0.3, 0.7), M[legs], bevel=0.01)
    return p.build(coll, loc, rot)


def chair(coll, name, loc, rot=0.0, wood="oak", fabric="fabric_charcoal"):
    p = Piece(name)
    w, f = M[wood], M[fabric]
    p.box((0, 0, 0.44), (0.46, 0.46, 0.04), w, bevel=0.008)
    p.box((0, 0, 0.48), (0.42, 0.42, 0.05), f, bevel=0.02, seg=3)
    p.box((0, 0.21, 0.69), (0.44, 0.035, 0.36), w, bevel=0.008, rot=(math.radians(-6), 0, 0))
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.cyl((sx * 0.19, sy * 0.19, 0.21), 0.017, 0.42, w, segs=10)
    return p.build(coll, loc, rot)


def kitchen_island(coll, name, loc, rot=0.0, length=2.8, width=1.05, top="marble", wood="walnut"):
    p = Piece(name)
    p.box((0, 0, 0.47), (length - 0.1, width - 0.1, 0.82), M[wood], bevel=0.006)
    p.box((0, 0, 0.04), (length - 0.2, width - 0.2, 0.08), M["charcoal"])
    p.box((0, 0, 0.9), (length, width, 0.04), M[top], bevel=0.004)
    for s in (-1, 1):
        p.box((s * (length / 2 - 0.02), 0, 0.46), (0.04, width, 0.88), M[top], bevel=0.003)
    return p.build(coll, loc, rot)


def stool(coll, name, loc, seat="leather"):
    p = Piece(name)
    p.cyl((0, 0, 0.66), 0.18, 0.05, M[seat], segs=32)
    p.cyl((0, 0, 0.33), 0.025, 0.62, M["brass"], segs=12)
    p.cyl((0, 0, 0.015), 0.2, 0.03, M["brass"], segs=32)
    p.torus((0, 0, 0.24), 0.16, 0.01, M["brass"], seg=32, ring=6)
    return p.build(coll, loc)


def cabinetry(coll, name, loc, rot=0.0, length=5.0, height=2.6, depth=0.62, splash="marble", wood="walnut", top=None):
    """Tall walnut columns at each end, low run with marble top and backsplash in between."""
    p = Piece(name)
    col_w = 1.2
    for s in (-1, 1):
        cx = s * (length / 2 - col_w / 2)
        for i in range(2):
            x = cx - col_w / 4 + i * col_w / 2
            p.box((x, 0, height / 2 + 0.04), (col_w / 2 - 0.008, depth, height - 0.08), M[wood], bevel=0.003)
        p.box((cx, 0, 0.04), (col_w, depth - 0.06, 0.08), M["charcoal"])
    run = length - 2 * col_w
    n = max(2, int(run / 0.6))
    for i in range(n):
        x = -run / 2 + run * (i + 0.5) / n
        p.box((x, 0, 0.47), (run / n - 0.008, depth, 0.78), M[wood], bevel=0.003)
    p.box((0, 0, 0.04), (run, depth - 0.06, 0.08), M["charcoal"])
    p.box((0, -0.01, 0.885), (run, depth + 0.02, 0.03), M[top or splash])
    p.box((0, depth / 2 - 0.01, 1.35), (run, 0.02, 0.9), M[splash])
    p.box((0, depth / 2 - 0.15, 1.8), (run, 0.3, 0.04), M["oak"], bevel=0.004)
    p.box((0, depth / 2 - 0.15, 2.25), (run, 0.3, 0.04), M["oak"], bevel=0.004)
    for i, x in enumerate((-0.9, -0.55, 0.4, 0.75)):
        p.cyl((x, depth / 2 - 0.15, 1.82 + 0.09), 0.07 + 0.02 * (i % 2), 0.18, M["ceramic_white" if i % 2 else "ceramic_black"], segs=24)
    return p.build(coll, loc, rot)


def pendant(coll, name, loc, drop=1.2, r=0.2, shade="brass", glow=True):
    """loc is the ceiling attachment point."""
    p = Piece(name)
    x, y, z = loc
    p.cyl((0, 0, -drop / 2), 0.004, drop, M["black_steel"], segs=6)
    p.cyl((0, 0, -drop - 0.11), r * 0.25, 0.22, M[shade], segs=32, r2=r)
    if glow:
        p.sphere((0, 0, -drop - 0.2), r * 0.32, M["lamp_glow"], subdiv=2)
    return p.build(coll, loc)


def linear_pendant(coll, name, loc, length=2.4, drop=1.0):
    p = Piece(name)
    for s in (-1, 1):
        p.cyl((s * length * 0.4, 0, -drop / 2), 0.003, drop, M["black_steel"], segs=6)
    p.box((0, 0, -drop - 0.03), (length, 0.07, 0.06), M["black_steel"], bevel=0.005)
    p.box((0, 0, -drop - 0.062), (length - 0.04, 0.05, 0.005), M["lamp_glow"])
    return p.build(coll, loc)


def rug(coll, name, loc, w=3.2, d=2.4, rot=0.0, mat="wool_rug"):
    p = Piece(name)
    p.box((0, 0, 0.008), (w, d, 0.016), M[mat], bevel=0.006)
    return p.build(coll, loc, rot)


def bed(coll, name, loc, rot=0.0, width=1.9, length=2.15):
    p = Piece(name)
    p.box((0, 0, 0.15), (width + 0.3, length + 0.1, 0.26), M["walnut"], bevel=0.01)
    p.box((0, 0, 0.4), (width, length, 0.24), M["linen"], bevel=0.06, seg=3)
    p.box((0, -length * 0.18, 0.53), (width + 0.06, length * 0.62, 0.05), M["fabric_stone"], bevel=0.02, seg=3)
    for s in (-1, 1):
        p.box((s * width / 4, length / 2 - 0.28, 0.6), (width / 2 - 0.1, 0.38, 0.16), M["linen"], bevel=0.07, seg=3)
    p.box((0, length / 2 + 0.06, 0.65), (width + 0.7, 0.08, 1.1), M["fabric_olive"], bevel=0.03, seg=3)
    for s in (-1, 1):
        p.box((s * (width / 2 + 0.6), length / 2 - 0.25, 0.25), (0.5, 0.42, 0.5), M["walnut"], bevel=0.01)
        p.cyl((s * (width / 2 + 0.6), length / 2 - 0.25, 0.75), 0.09, 0.5, M["ceramic_white"], segs=24, r2=0.03)
        p.sphere((s * (width / 2 + 0.6), length / 2 - 0.25, 1.08), 0.13, M["lamp_shade"], subdiv=3)
    return p.build(coll, loc, rot)


def plant(coll, name, loc, h=1.2, pot="concrete", leaves="leaves"):
    p = Piece(name)
    pr = 0.18 + h * 0.08
    p.cyl((0, 0, pr * 0.9), pr, pr * 1.8, M[pot], segs=32, r2=pr * 0.8)
    p.cyl((0, 0, pr * 1.8 + h * 0.25), 0.02, h * 0.5, M["bark"], segs=8)
    for i in range(6):
        a = i * 2.4
        rr = h * RNG.uniform(0.16, 0.24)
        c = (math.cos(a) * h * 0.15, math.sin(a) * h * 0.15, pr * 1.8 + h * RNG.uniform(0.45, 0.85))
        p.sphere(c, rr, M[leaves if i % 2 else "leaves_light"], subdiv=2, jitter=0.03)
    return p.build(coll, loc)


def tree(coll, name, loc, h=6.0, kind=None):
    """'cypress' = slender columnar evergreen, 'olive' = multi-stem canopy."""
    kind = kind or ("cypress" if RNG.random() < 0.5 else "olive")
    p = Piece(name)
    if kind == "cypress":
        p.cyl((0, 0, 0.4), 0.09, 0.8, M["bark"], segs=10)
        p.sphere((0, 0, h * 0.5), h * 0.13, M["leaves"], subdiv=3, scale=(1, 1, 3.6), jitter=0.04)
        p.sphere((0.05, 0.04, h * 0.42), h * 0.12, M["leaves"], subdiv=2, scale=(1, 1, 2.8), jitter=0.05)
    else:
        for i in range(3):
            a = i * 2.1
            tilt = (math.sin(a) * 0.25, -math.cos(a) * 0.25, 0)
            p.cyl((math.cos(a) * 0.2, math.sin(a) * 0.2, h * 0.24), 0.07, h * 0.5, M["bark"], segs=8, r2=0.04, rot=tilt)
        for i in range(11):
            a = i * 1.7
            rad = h * (0.1 + 0.12 * (i % 3) / 2)
            rr = h * RNG.uniform(0.11, 0.15)
            c = (math.cos(a) * rad, math.sin(a) * rad, h * RNG.uniform(0.55, 0.82))
            p.sphere(c, rr, M["leaves_light" if i % 3 else "leaves"], subdiv=2, scale=(1, 1, 0.7), jitter=0.03)
    return p.build(coll, loc)


def floor_lamp(coll, name, loc):
    p = Piece(name)
    p.cyl((0, 0, 0.012), 0.16, 0.024, M["black_steel"], segs=24)
    p.cyl((0, 0, 0.75), 0.012, 1.5, M["black_steel"], segs=8)
    p.cyl((0, 0, 1.5), 0.22, 0.3, M["lamp_shade"], segs=32, r2=0.18)
    return p.build(coll, loc)


def artwork(coll, name, loc, rot=0.0, w=1.6, h=1.1, palette=("art_stone", "art_olive", "art_ink")):
    """Abstract composition panel; front faces -Y in local space."""
    p = Piece(name)
    p.box((0, 0, 0), (w + 0.06, 0.04, h + 0.06), M["charcoal"])
    p.box((0, -0.025, 0), (w, 0.01, h), M[palette[0]])
    p.box((-w * 0.18, -0.032, -h * 0.12), (w * 0.38, 0.006, h * 0.56), M[palette[1]])
    p.cyl((w * 0.22, -0.034, h * 0.14), h * 0.16, 0.006, M[palette[2]], segs=48, rot=(math.pi / 2, 0, 0))
    return p.build(coll, loc, rot)


def sculpture(coll, name, loc):
    p = Piece(name)
    p.cyl((0, 0, 0.1), 0.12, 0.2, M["ceramic_black"], segs=32, r2=0.08)
    p.sphere((0, 0, 0.28), 0.1, M["ceramic_white"], subdiv=3, scale=(1, 1, 0.8))
    p.cyl((0.22, 0.05, 0.08), 0.06, 0.16, M["ceramic_white"], segs=24)
    return p.build(coll, loc)


def books(p, x, y, z, length, rng_seed=0):
    rr = random.Random(rng_seed)
    cur = x
    while cur < x + length:
        bw = rr.uniform(0.025, 0.05)
        bh = rr.uniform(0.2, 0.3)
        p.box((cur + bw / 2, y, z + bh / 2), (bw, 0.2, bh), M[rr.choice(["book_a", "book_b", "book_c", "book_d"])])
        cur += bw + 0.002
        if rr.random() < 0.12:
            cur += rr.uniform(0.1, 0.25)


def shelving(coll, name, loc, rot=0.0, length=2.4, height=2.2, wood="oak"):
    p = Piece(name)
    w = M[wood]
    levels = 5
    for i in range(levels):
        z = 0.05 + i * (height - 0.1) / (levels - 1)
        p.box((0, 0, z), (length, 0.32, 0.035), w, bevel=0.004)
        if i < levels - 1:
            books(p, -length / 2 + 0.1, 0, z + 0.02, length * 0.55, rng_seed=i + len(name))
    for s in (-1, 0, 1):
        p.box((s * (length / 2 - 0.02), 0, height / 2), (0.035, 0.32, height), w, bevel=0.004)
    return p.build(coll, loc, rot)


def lounger(coll, name, loc, rot=0.0):
    p = Piece(name)
    p.box((0, 0, 0.18), (0.7, 2.0, 0.06), M["teak"], bevel=0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.box((sx * 0.3, sy * 0.85, 0.08), (0.06, 0.06, 0.16), M["teak"])
    p.box((0, -0.15, 0.25), (0.66, 1.6, 0.08), M["fabric_ivory"], bevel=0.03, seg=3)
    p.box((0, 0.72, 0.4), (0.66, 0.5, 0.08), M["fabric_ivory"], bevel=0.03, seg=3, rot=(math.radians(35), 0, 0))
    return p.build(coll, loc, rot)


def desk(coll, name, loc, rot=0.0, length=1.8):
    p = Piece(name)
    p.box((0, 0, 0.735), (length, 0.8, 0.03), M["oak"], bevel=0.005)
    for s in (-1, 1):
        p.box((s * (length / 2 - 0.08), 0, 0.36), (0.03, 0.7, 0.72), M["black_steel"])
    p.box((0.4, 0.15, 0.76), (0.32, 0.24, 0.02), M["book_c"])
    p.cyl((-0.6, 0.2, 0.95), 0.012, 0.4, M["black_steel"], segs=8)
    p.cyl((-0.6, 0.12, 1.15), 0.09, 0.08, M["lamp_shade"], segs=24, r2=0.05, rot=(math.radians(30), 0, 0))
    return p.build(coll, loc, rot)


def reception_desk(coll, name, loc, rot=0.0, length=3.4):
    p = Piece(name)
    p.box((0, 0, 0.53), (length, 0.85, 1.06), M["travertine"], bevel=0.01)
    p.box((0, 0.1, 1.075), (length - 0.2, 0.55, 0.03), M["walnut"], bevel=0.004)
    p.box((0, -0.43, 0.06), (length - 0.1, 0.02, 0.12), M["brass"])
    return p.build(coll, loc, rot)



# ---------------------------------------------------------------------------
# South Indian pieces
# ---------------------------------------------------------------------------


def pillar(p, x, y, z0, z1, r=0.13, wood="teak"):
    """Chettinad-style pillar: granite base, octagonal teak shaft, brass band, bracket."""
    p.box((x, y, z0 + 0.14), (0.42, 0.42, 0.28), M["granite_black"], bevel=0.01)
    p.cyl((x, y, z0 + 0.33), r * 1.35, 0.1, M[wood], segs=8, r2=r)
    p.cyl((x, y, (z0 + 0.38 + z1 - 0.3) / 2), r, z1 - 0.3 - z0 - 0.38, M[wood], segs=8)
    p.cyl((x, y, z1 - 0.27), r * 1.15, 0.06, M["brass"], segs=16)
    p.cyl((x, y, z1 - 0.17), r, 0.14, M[wood], segs=8, r2=r * 1.6)
    p.box((x, y, z1 - 0.05), (0.62, 0.3, 0.1), M[wood], bevel=0.01)


def oonjal(coll, name, loc, rot=0.0, hang=3.2):
    """Teak swing on brass chains; `hang` = height of the beam above the floor."""
    p = Piece(name)
    seat_z = 0.55
    p.box((0, 0, seat_z), (1.8, 0.75, 0.07), M["teak"], bevel=0.012)
    p.box((0, 0.34, seat_z + 0.12), (1.8, 0.05, 0.18), M["teak"], bevel=0.008)
    p.box((0, -0.02, seat_z + 0.06), (1.5, 0.62, 0.05), M["silk_red"], bevel=0.02, seg=3)
    p.cyl((0.62, 0.22, seat_z + 0.15), 0.08, 0.5, M["silk_red"], segs=20, rot=(0, math.pi / 2, 0))
    length = hang - seat_z
    for sx in (-0.82, 0.82):
        for sy in (-0.3, 0.3):
            p.cyl((sx, sy, seat_z + length / 2), 0.011, length, M["brass"], segs=8)
            for k in range(1, int(length / 0.45)):
                p.sphere((sx, sy, seat_z + k * 0.45), 0.028, M["brass"], subdiv=1)
    p.box((0, 0, hang + 0.05), (2.2, 0.16, 0.12), M["teak"])
    return p.build(coll, loc, rot)


def kuthuvilakku(coll, name, loc, h=0.9, lit=True):
    """Brass oil lamp with five wicks."""
    p = Piece(name)
    b = M["brass"]
    p.cyl((0, 0, 0.02), 0.15, 0.04, b, segs=32)
    p.cyl((0, 0, 0.09), 0.13, 0.1, b, segs=32, r2=0.04)
    p.cyl((0, 0, h * 0.5), 0.018, h * 0.8, b, segs=12)
    for z in (h * 0.25, h * 0.45, h * 0.65):
        p.sphere((0, 0, z), 0.04, b, subdiv=2)
    p.cyl((0, 0, h * 0.9), 0.06, 0.06, b, segs=24, r2=0.13)
    p.cyl((0, 0, h * 0.94), 0.13, 0.02, b, segs=24)
    p.cyl((0, 0, h * 1.02), 0.015, 0.14, b, segs=8)
    p.sphere((0, 0, h * 1.1), 0.03, b, subdiv=2)
    if lit:
        for k in range(5):
            a = k * 2 * math.pi / 5
            p.sphere((math.cos(a) * 0.11, math.sin(a) * 0.11, h * 0.97), 0.014, M["flame"], subdiv=2, scale=(1, 1, 2.2))
    return p.build(coll, loc)


def uruli(coll, name, loc, r=0.45):
    """Wide brass bowl with water and floating marigold and jasmine."""
    p = Piece(name)
    p.cyl((0, 0, 0.06), r * 0.45, 0.12, M["brass"], segs=32)
    p.cyl((0, 0, 0.2), r * 0.6, 0.16, M["brass"], segs=48, r2=r)
    p.cyl((0, 0, 0.27), r * 0.95, 0.01, M["water"], segs=48)
    rr = random.Random(len(name))
    for k in range(14):
        a = rr.uniform(0, 2 * math.pi)
        d = rr.uniform(0, r * 0.75)
        p.sphere((math.cos(a) * d, math.sin(a) * d, 0.285), 0.035, M["marigold" if k % 3 else "jasmine"], subdiv=1, scale=(1, 1, 0.5))
    return p.build(coll, loc)


def tulsi_madam(coll, name, loc):
    p = Piece(name)
    p.box((0, 0, 0.1), (1.0, 1.0, 0.2), M["granite_black"], bevel=0.01)
    p.box((0, 0, 0.3), (0.8, 0.8, 0.2), M["red_oxide"], bevel=0.01)
    p.box((0, 0, 0.75), (0.6, 0.6, 0.7), M["plaster"], bevel=0.02)
    p.box((0, -0.301, 0.75), (0.3, 0.01, 0.4), M["plaster_ochre"])
    p.box((0, 0, 1.13), (0.7, 0.7, 0.06), M["red_oxide"], bevel=0.01)
    for k in range(7):
        a = k * 0.9
        p.sphere((math.cos(a) * 0.12, math.sin(a) * 0.12, 1.3 + 0.08 * (k % 3)), 0.11, M["tulsi"], subdiv=2, jitter=0.15)
    return p.build(coll, loc)


def carved_door(coll, name, loc, width=1.8, height=2.5, open_angle=70.0):
    """Teak double door with raised panels, brass studs and ring handles; leaves open inward (+Y)."""
    frame = Piece(name + "_Frame")
    t = 0.32
    frame.box((-width / 2 - 0.14, 0, height / 2), (0.28, t, height), M["teak"], bevel=0.01)
    frame.box((width / 2 + 0.14, 0, height / 2), (0.28, t, height), M["teak"], bevel=0.01)
    frame.box((0, 0, height + 0.18), (width + 0.56, t, 0.36), M["teak"], bevel=0.01)
    frame.box((0, -0.17, height + 0.18), (width * 0.6, 0.03, 0.2), M["brass"])
    frame.box((0, 0, 0.04), (width + 0.56, t + 0.06, 0.08), M["granite_black"])
    frame.build(coll, loc)
    fx, fy, fz = loc
    leaf_w = width / 2
    for side in (-1, 1):
        leaf = Piece(f"{name}_Leaf_{'L' if side < 0 else 'R'}")
        cx = -side * leaf_w / 2  # hinge at local x=0; the leaf extends toward the centre
        leaf.box((cx, 0, height / 2), (leaf_w - 0.01, 0.07, height - 0.02), M["teak"], bevel=0.006)
        for row in range(4):
            z = 0.6 + row * (height - 0.5) / 4
            leaf.box((cx, -0.045, z), (leaf_w * 0.7, 0.03, 0.42), M["teak"], bevel=0.012)
            for col in (-1, 1):
                leaf.sphere((cx + col * leaf_w * 0.4, -0.05, z - 0.25), 0.022, M["brass"], subdiv=1)
        leaf.cyl((cx - side * leaf_w * 0.35, -0.06, height * 0.5), 0.07, 0.015, M["brass"], segs=24, rot=(math.pi / 2, 0, 0))
        hinge = (fx + side * width / 2, fy, fz)
        leaf.build(coll, hinge, rot_z=-side * math.radians(open_angle))


def coconut_tree(coll, name, loc, h=9.0, lean=(1.0, 0.3)):
    p = Piece(name)
    pts = []
    n = 10
    for i in range(n + 1):
        f = i / n
        pts.append(Vector((lean[0] * f * f * h * 0.18, lean[1] * f * f * h * 0.18, f * h)))
    for i in range(n):
        a, b = pts[i], pts[i + 1]
        d = b - a
        rot = d.to_track_quat("Z", "Y").to_euler()
        p.cyl(tuple((a + b) / 2), 0.17 - 0.05 * i / n, d.length * 1.02, M["bark"], segs=10,
              r2=0.16 - 0.05 * (i + 1) / n, rot=tuple(rot))
    top = pts[-1]
    for k in range(18):
        yaw = k * 2 * math.pi / 18 + RNG.uniform(-0.12, 0.12)
        rise = math.radians(RNG.uniform(-5, 35))
        m = Matrix.Translation(top) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(-rise, 4, "Y")
        # Three segments that droop progressively; each is a shallow V of two leaflet blades.
        for seg, (length, width, bend) in enumerate(((1.3, 0.9, 0.25), (1.3, 0.85, 0.45), (1.1, 0.6, 0.6))):
            m = m @ Matrix.Rotation(bend, 4, "Y")
            c = m @ Matrix.Translation((length / 2, 0, 0))
            for side, mat in ((0.32, "leaves"), (-0.32, "leaves_light")):
                p.box_matrix(c @ Matrix.Rotation(side, 4, "X") @ Matrix.Translation((0, side * width * 0.5, 0)),
                             (length, width * 0.55, 0.012), M[mat])
            m = m @ Matrix.Translation((length, 0, 0))
    for k in range(6):
        a = k * 1.05
        p.sphere((top.x + math.cos(a) * 0.2, top.y + math.sin(a) * 0.2, top.z - 0.25), 0.13,
                 M["coconut" if k % 2 else "leaves_light"], subdiv=2)
    return p.build(coll, loc)


def banana_plant(coll, name, loc, h=2.6):
    p = Piece(name)
    p.cyl((0, 0, h * 0.27), 0.11, h * 0.55, M["leaves_light"], segs=12, r2=0.08)
    top = Vector((0, 0, h * 0.52))
    for k in range(7):
        yaw = k * 2.4
        pitch = math.radians(RNG.uniform(25, 55))
        m = Matrix.Translation(top) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(-pitch, 4, "Y") @ Matrix.Translation((0.75, 0, 0))
        p.box_matrix(m, (1.5, 0.5, 0.012), M["banana_leaf"])
    return p.build(coll, loc)


def well(coll, name, loc):
    p = Piece(name)
    p.cyl((0, 0, 0.42), 0.95, 0.84, M["plaster"], segs=40)
    p.cyl((0, 0, 0.86), 1.0, 0.06, M["granite_black"], segs=40)
    p.cyl((0, 0, 0.84), 0.75, 0.05, M["water"], segs=40)
    for sx in (-0.85, 0.85):
        p.box((sx, 0, 1.55), (0.14, 0.14, 1.4), M["teak"], bevel=0.01)
    p.box((0, 0, 2.25), (1.9, 0.12, 0.12), M["teak"], bevel=0.01)
    p.torus((0, 0, 2.05), 0.12, 0.025, M["black_steel"], seg=24, ring=8)
    p.cyl((0, 0, 1.45), 0.006, 1.1, M["linen"], segs=6)
    p.sphere((0.6, 0.55, 1.0), 0.13, M["brass"], subdiv=2, scale=(1, 1, 0.9))
    p.cyl((0.6, 0.55, 1.14), 0.05, 0.06, M["brass"], segs=16, r2=0.07)
    return p.build(coll, loc)


def brass_vessels(p, x, y, z, count=5, seed=0):
    rr = random.Random(seed)
    for k in range(count):
        r = rr.uniform(0.07, 0.13)
        mat = M["brass" if k % 3 else "copper"]
        cx = x + k * 0.28
        if k % 2:
            p.sphere((cx, y, z + r * 0.9), r, mat, subdiv=2, scale=(1, 1, 0.85))
            p.cyl((cx, y, z + r * 1.75), r * 0.45, r * 0.4, mat, segs=16, r2=r * 0.6)
        else:
            p.cyl((cx, y, z + r * 0.7), r, r * 1.4, mat, segs=20, r2=r * 0.85)


def tanjore_art(coll, name, loc, rot=0.0, w=0.9, h=1.2):
    """Gilded frame around a deep red panel — an abstract nod to Thanjavur painting."""
    p = Piece(name)
    p.box((0, 0, 0), (w + 0.16, 0.06, h + 0.16), M["brass"], bevel=0.01)
    p.box((0, -0.032, 0), (w, 0.01, h), M["art_red"])
    p.cyl((0, -0.04, h * 0.12), w * 0.3, 0.01, M["brass"], segs=48, rot=(math.pi / 2, 0, 0))
    p.box((0, -0.04, -h * 0.22), (w * 0.5, 0.012, h * 0.4), M["brass"])
    p.sphere((0, -0.045, h * 0.12), w * 0.12, M["art_olive"], subdiv=2, scale=(1, 0.3, 1))
    return p.build(coll, loc, rot)


def low_table(coll, name, loc, rot=0.0, w=1.1, d=0.6, h=0.42, top="teak"):
    p = Piece(name)
    p.box((0, 0, h - 0.025), (w, d, 0.05), M[top], bevel=0.008)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.cyl((sx * (w / 2 - 0.07), sy * (d / 2 - 0.07), (h - 0.05) / 2), 0.025, h - 0.05, M["teak"], segs=12)
    return p.build(coll, loc, rot)


# ---------------------------------------------------------------------------
# Generic interior room (used by the four visualisation studies)
# ---------------------------------------------------------------------------


def room_shell(coll, prefix, ox, w, d, h, floor, walls, ceiling, windows, side_wall_mats=None,
               glass_mat=None, mullions=1, transoms=None, roof_coll=None, frame_mat="bronze"):
    """Room spanning x[ox, ox+w], y[0, d]; window wall at y=d. Returns the window glass objects."""
    t = 0.3
    shell = Piece(prefix + "_Shell")
    shell.box_minmax((ox - t, -t, -0.3), (ox + w + t, d + t, 0.0), M[floor])
    left = M[(side_wall_mats or {}).get("left", walls)]
    right = M[(side_wall_mats or {}).get("right", walls)]
    front = M[(side_wall_mats or {}).get("front", walls)]
    back = M[(side_wall_mats or {}).get("back", walls)]
    wall(shell, "y", -t, d + t, ox - t, ox, 0, h, left)
    wall(shell, "y", -t, d + t, ox + w, ox + w + t, 0, h, right)
    wall(shell, "x", ox, ox + w, -t, 0, 0, h, front)
    wall(shell, "x", ox, ox + w, d, d + t, 0, h, back, openings=[(ox + a, ox + b, za, zb) for a, b, za, zb in windows])
    shell_ob = shell.build(coll)

    roof = Piece(prefix + "_Ceiling")
    roof.box_minmax((ox - t, -t, h), (ox + w + t, d + t, h + 0.3), M[ceiling])
    roof_ob = roof.build(roof_coll or coll)

    glass = Piece(prefix + "_Glass")
    frames = Piece(prefix + "_Frames")
    for a, b, za, zb in windows:
        glazing(glass, frames, "x", ox + a, ox + b, d + t / 2, za, zb, mullions=mullions,
                transom=transoms, glass_mat=glass_mat, frame_mat=M[frame_mat])
    glass_ob = glass.build(coll, shadow=False)
    frames.build(coll)

    ground = Piece(prefix + "_Exterior")
    ground.box_minmax((ox - 30, d + t, -0.4), (ox + w + 30, d + 40, -0.3), M["grass"])
    ground.box_minmax((ox - 2, d + t, -0.31), (ox + w + 2, d + t + 4, -0.29), M["paving"])
    ground.build(coll)
    for i in range(4):
        tree(coll, f"{prefix}_Tree_{i}", (ox + w * (0.1 + 0.27 * i), d + 9 + (i % 2) * 5, -0.3), h=7 + i)
    return shell_ob, roof_ob, glass_ob


# ---------------------------------------------------------------------------
# Scene 1 — Mutram Veedu, a Chettinad-style courtyard house (exported to GLB)
# ---------------------------------------------------------------------------

log("building Mutram Veedu")
VILLA = new_coll("House_MutramVeedu")
V_SITE = new_coll("House_Site", VILLA)
V_ARCH = new_coll("House_Architecture", VILLA)
V_ROOF = new_coll("House_Roof", VILLA)
V_UPPER = new_coll("House_Upper", VILLA)            # kept for drawing helpers; empty
V_INT = new_coll("House_Interior", VILLA)
V_SUITE = new_coll("House_Pooja", VILLA)
V_EXT = new_coll("House_Garden", VILLA)
V_HOT = new_coll("House_Hotspots", VILLA)
V_LIGHTS = new_coll("House_RenderLights")          # not exported
RENDER_ONLY = new_coll("RenderOnly_Ground")         # not exported

PZ = 0.75          # plinth top
F = PZ + 0.02      # finished floor
WALL_TOP = 3.9

# --- Site, compound wall, path
ground = Piece("House_Lawn")
ground.cyl((0, 0, -0.02), 30, 0.04, M["grass"], segs=96)
ground.build(V_SITE)
big = Piece("Render_Ground")
big.box_minmax((-200, -200, -0.08), (200, 200, -0.05), M["grass"])
big.build(RENDER_ONLY)

compound = Piece("House_CompoundWall")
for lo, hi in [((-15, -14.7), (-2.3, -14.4)), ((2.3, -14.7), (15, -14.4)), ((-15, -14.7), (-14.7, 12.5)),
               ((14.7, -14.7), (15, 12.5)), ((-15, 12.2), (15, 12.5))]:
    compound.box_minmax((lo[0], lo[1], 0), (hi[0], hi[1], 0.95), M["plaster"])
    compound.box_minmax((lo[0] - 0.04, lo[1] - 0.04, 0.95), (hi[0] + 0.04, hi[1] + 0.04, 1.03), M["roof_tiles"])
for sx in (-2.55, 2.55):
    compound.box((sx, -14.55, 0.8), (0.5, 0.5, 1.6), M["plaster_ochre"], bevel=0.01)
    compound.sphere((sx, -14.55, 1.72), 0.14, M["brass"], subdiv=2)
compound.build(V_SITE)

path = Piece("House_Path")
for i in range(9):
    path.box((0, -14.0 + i * 0.8, 0.02), (2.2, 0.7, 0.05), M["paving"], bevel=0.008)
path.build(V_SITE)

# --- Plinth, steps, floors
plinth = Piece("House_Plinth")
# Solid plinth with a hole where the mutram is sunk 0.25 m below the floors.
HX, HY0, HY1 = 2.6, 0.2, 5.0
for lo, hi in [((-9.2, -6.4), (9.2, HY0)), ((-9.2, HY1), (9.2, 8.4)), ((-9.2, HY0), (-HX, HY1)), ((HX, HY0), (9.2, HY1))]:
    plinth.box_minmax((lo[0], lo[1], 0), (hi[0], hi[1], PZ - 0.05), M["laterite"])
for lo, hi in [((-9.25, -6.45), (9.25, HY0)), ((-9.25, HY1), (9.25, 8.45)), ((-9.25, HY0), (-HX, HY1)), ((HX, HY0), (9.25, HY1))]:
    plinth.box_minmax((lo[0], lo[1], PZ - 0.05), (hi[0], hi[1], PZ), M["granite_black"])
plinth.box_minmax((-HX, HY0, 0), (HX, HY1, 0.45), M["laterite"])
for i, (y0, z1) in enumerate([(-7.45, 0.25), (-7.1, 0.5), (-6.75, PZ)]):
    plinth.box_minmax((-1.6, y0, 0), (1.6, -6.4, z1), M["granite_black"])
plinth.build(V_ARCH)

floors = Piece("House_Floors")
floors.box_minmax((-9.2, -6.4, PZ), (9.2, -3.5, F), M["red_oxide"])                 # verandah
floors.box_minmax((-8.9, -3.2, PZ), (-2.6, 8.1, F), M["athangudi"])                 # hall wing
floors.box_minmax((2.6, -3.2, PZ), (8.9, 8.1, F), M["red_oxide"])                   # dining / kitchen wing
floors.box_minmax((-2.6, -3.2, PZ), (2.6, 0.2, F), M["athangudi"])                  # entrance corridor
floors.box_minmax((-2.6, 5.0, PZ), (2.6, 8.1, F), M["athangudi"])                   # back corridor
floors.box_minmax((-2.6, 0.2, 0.45), (2.6, 5.0, 0.52), M["paving"])                 # sunken mutram
for lo, hi in [((-2.6, 0.2), (-2.45, 5.0)), ((2.45, 0.2), (2.6, 5.0)), ((-2.6, 0.2), (2.6, 0.35)), ((-2.6, 4.85), (2.6, 5.0))]:
    floors.box_minmax((lo[0], lo[1], 0.52), (hi[0], hi[1], F), M["granite_black"])
floors.build(V_ARCH)

kolam = Piece("House_Kolam")
kolam.box_minmax((-1.2, -6.0, F), (1.2, -3.6, F + 0.004), M["kolam_floor"])         # one kolam per 2.4 m UV tile
kolam.build(V_ARCH)

# --- Walls with door and window openings
walls = Piece("House_Walls")
wall(walls, "x", -9.2, 9.2, -3.5, -3.2, PZ, WALL_TOP, M["plaster"],
     openings=[(-1.2, 1.2, F, 3.45), (-6.6, -4.6, 1.55, 3.0), (4.6, 6.6, 1.55, 3.0)])
for x0, x1 in ((-9.2, -8.9), (8.9, 9.2)):
    wall(walls, "y", -3.2, 8.4, x0, x1, PZ, WALL_TOP, M["plaster"], openings=[(0.0, 1.6, 1.5, 2.9), (4.0, 5.6, 1.5, 2.9)])
wall(walls, "x", -9.2, 9.2, 8.1, 8.4, PZ, WALL_TOP, M["plaster"],
     openings=[(-1.0, 1.0, 1.35, 2.75), (-6.5, -4.5, 1.5, 2.9), (4.5, 6.5, 1.5, 2.9)])
for x0, x1 in ((-9.21, -1.2), (1.2, 9.21)):
    walls.box_minmax((x0, -3.51, PZ), (x1, -3.49, 1.05), M["plaster_ochre"])     # ochre dado band
walls.build(V_ARCH)


def grill_window(frame_pc, run, a0, a1, t, z0, z1):
    """Teak window frame, iron bars and two shutters folded open against the outside wall."""
    def b(lo_a, hi_a, lo_z, hi_z, depth, off, mat):
        if run == "x":
            frame_pc.box_minmax((lo_a, t + off - depth / 2, lo_z), (hi_a, t + off + depth / 2, hi_z), mat)
        else:
            frame_pc.box_minmax((t + off - depth / 2, lo_a, lo_z), (t + off + depth / 2, hi_a, hi_z), mat)
    for lo_a, hi_a, lo_z, hi_z in [(a0, a1, z0, z0 + 0.09), (a0, a1, z1 - 0.09, z1), (a0, a0 + 0.09, z0, z1), (a1 - 0.09, a1, z0, z1)]:
        b(lo_a, hi_a, lo_z, hi_z, 0.34, 0, M["teak"])
    a = a0 + 0.16
    while a < a1 - 0.12:
        b(a - 0.012, a + 0.012, z0, z1, 0.024, 0, M["black_steel"])
        a += 0.13
    sign = -1 if (run == "x" and t < 0) or (run == "y" and t < 0) else 1
    width = (a1 - a0) / 2
    b(a0 - width, a0, z0, z1, 0.04, sign * 0.2, M["teak"])
    b(a1, a1 + width, z0, z1, 0.04, sign * 0.2, M["teak"])


frames = Piece("House_Windows")
for a0, a1 in ((-6.6, -4.6), (4.6, 6.6)):
    grill_window(frames, "x", a0, a1, -3.35, 1.55, 3.0)
for t in (-9.05, 9.05):
    for a0, a1 in ((0.0, 1.6), (4.0, 5.6)):
        grill_window(frames, "y", a0, a1, t, 1.5, 2.9)
for a0, a1 in ((-6.5, -4.5), (4.5, 6.5)):
    grill_window(frames, "x", a0, a1, 8.25, 1.5, 2.9)
frames.build(V_ARCH)

carved_door(V_ARCH, "House_MainDoor", (0, -3.35, F), width=1.8, height=2.5, open_angle=72)

# --- Thinnai verandah: raised seats and pillars
thinnai = Piece("House_Thinnai")
for x0, x1 in ((-8.9, -2.1), (2.1, 8.9)):
    thinnai.box_minmax((x0, -5.0, F), (x1, -3.5, 1.25), M["plaster"])
    thinnai.box_minmax((x0 - 0.03, -5.05, 1.25), (x1 + 0.03, -3.5, 1.3), M["red_oxide"])
    thinnai.box_minmax((x0, -5.01, F), (x1, -4.99, 0.95), M["plaster_ochre"])
for x in (-8.6, -5.2, -1.9, 1.9, 5.2, 8.6):
    pillar(thinnai, x, -6.05, F, 3.0)
thinnai.box_minmax((-9.3, -6.15, 2.93), (9.3, -5.95, 3.05), M["teak"])
thinnai.cyl((-7.4, -4.25, 1.4), 0.1, 0.9, M["silk_red"], segs=20, rot=(0, math.pi / 2, 0))
thinnai.build(V_ARCH)

# --- Courtyard pillars and beams
court = Piece("House_MutramPillars")
for x, y in [(-2.6, 0.2), (2.6, 0.2), (-2.6, 5.0), (2.6, 5.0), (-2.6, 2.6), (2.6, 2.6)]:
    pillar(court, x, y, F, 3.72)
for lo, hi in [((-2.75, 0.12), (2.75, 0.28)), ((-2.75, 4.92), (2.75, 5.08)), ((-2.68, 0.2), (-2.52, 5.0)), ((2.52, 0.2), (2.68, 5.0))]:
    court.box_minmax((lo[0], lo[1], 3.62), (hi[0], hi[1], 3.8), M["teak"])
court.box_minmax((-8.9, 2.92, 3.45), (-2.6, 3.08, 3.62), M["teak"])                 # oonjal beam
court.build(V_ARCH)

# --- Clay-tile roof: outer slopes to the eaves, inner slopes draining into the mutram
O = (-9.7, -3.75, 9.7, 8.9, 3.8)     # outer eaves (x0, y0, x1, y1, z)
R = (-6.0, -1.4, 6.0, 6.6, 5.3)      # ridge ring
C = (-2.75, 0.05, 2.75, 5.15, 3.9)   # courtyard opening
TH = 0.15


def ring_corners(r):
    x0, y0, x1, y1, z = r
    return [Vector((x0, y0, z)), Vector((x1, y0, z)), Vector((x1, y1, z)), Vector((x0, y1, z))]


roof = Piece("House_Roof")
o, rr_, c = ring_corners(O), ring_corners(R), ring_corners(C)
for i in range(4):
    j = (i + 1) % 4
    swap = i in (1, 3)                       # left/right slopes: tile rows run along Y
    for lower, upper in ((o, rr_), (c, rr_)):
        top = [lower[i], lower[j], upper[j], upper[i]]
        if lower is c:
            top = [upper[i], upper[j], lower[j], lower[i]]
        # Keep counter-clockwise order seen from above.
        area = sum((top[k].x * top[(k + 1) % 4].y - top[(k + 1) % 4].x * top[k].y) for k in range(4))
        if area < 0:
            top = top[::-1]
        bottom = [v - Vector((0, 0, TH)) for v in top]
        roof.hexa(bottom, top, M["roof_tiles"], M["teak"], uv_swap=swap)
for i in range(4):
    a, b_ = rr_[i], rr_[(i + 1) % 4]
    mid = (a + b_) / 2
    d = b_ - a
    roof.cyl(tuple(mid + Vector((0, 0, 0.04))), 0.09, d.length + 0.1, M["laterite"], segs=12,
             rot=tuple(d.to_track_quat("Z", "Y").to_euler()))
roof.build(V_ROOF)

verandah_roof = Piece("House_VerandahRoof")
top = [Vector((-9.5, -6.9, 3.0)), Vector((9.5, -6.9, 3.0)), Vector((9.5, -3.45, 3.78)), Vector((-9.5, -3.45, 3.78))]
verandah_roof.hexa([v - Vector((0, 0, 0.12)) for v in top], top, M["roof_tiles"], M["teak"])
verandah_roof.build(V_ROOF)

# --- Hall: oonjal, cane chairs, teapoy, lamp, art, chest
oonjal(V_INT, "Hall_Oonjal", (-6.2, 3.0, F), rot=math.pi / 2, hang=3.45 - F)
lounge_chair(V_INT, "Hall_CaneChair_A", (-3.6, 1.2, F), rot=math.radians(-60), fabric="cane", wood="teak")
lounge_chair(V_INT, "Hall_CaneChair_B", (-3.6, 4.8, F), rot=math.radians(-120), fabric="cane", wood="teak")
low_table(V_INT, "Hall_Teapoy", (-4.3, 3.0, F), rot=math.pi / 2)
rug(V_INT, "Hall_Jamakkalam", (-5.0, 3.0, F), w=3.4, d=2.4, rot=math.pi / 2, mat="fabric_stone")
kuthuvilakku(V_INT, "Hall_Kuthuvilakku", (-8.3, 0.6, F), h=1.1)
tanjore_art(V_INT, "Hall_TanjoreArt", (-8.86, 3.0, 2.35), rot=math.pi / 2, w=1.0, h=1.3)
chest = Piece("Hall_Petti")
chest.box((0, 0, 0.35), (1.2, 0.6, 0.6), M["teak"], bevel=0.015)
for sx in (-0.58, 0.58):
    chest.box((sx, -0.31, 0.35), (0.06, 0.02, 0.62), M["brass"])
chest.box((0, -0.31, 0.5), (0.12, 0.02, 0.14), M["brass"])
chest.build(V_INT, (-8.3, 6.8, F), rot_z=math.pi / 2)
uruli(V_INT, "Entrance_Uruli", (0, -1.6, F), r=0.5)
plant(V_INT, "Hall_Plant", (-8.3, -2.6, F), h=1.3, pot="ceramic_black")

# --- Dining and kitchen wing
dining_table(V_INT, "Dining_Table", (5.6, 2.6, F), rot=math.pi / 2, length=2.4, width=1.0, top="teak", legs="teak")
for i, y in enumerate((1.9, 2.6, 3.3)):
    chair(V_INT, f"Dining_Chair_W{i}", (4.75, y, F), rot=math.pi / 2, wood="teak", fabric="cane")
    chair(V_INT, f"Dining_Chair_E{i}", (6.45, y, F), rot=-math.pi / 2, wood="teak", fabric="cane")
pendant(V_INT, "Dining_Lamp", (5.6, 2.6, 5.05), drop=2.75, r=0.22, shade="brass")
cabinetry(V_INT, "Kitchen_Counter", (5.8, 7.79, F), length=5.4, wood="teak", splash="ceramic", top="granite_black")
vessels = Piece("Kitchen_Vessels")
brass_vessels(vessels, 4.0, 7.62, F + 0.9, count=5, seed=3)
brass_vessels(vessels, 4.6, 7.66, F + 1.82, count=4, seed=4)
grinder = Vector((8.3, 5.4, F))
vessels.cyl(tuple(grinder + Vector((0, 0, 0.22))), 0.32, 0.44, M["granite_black"], segs=24)
vessels.cyl(tuple(grinder + Vector((0, 0, 0.5))), 0.09, 0.3, M["granite_black"], segs=16)
vessels.build(V_INT)
plant(V_INT, "Dining_Plant", (8.3, -2.6, F), h=1.6, pot="ceramic_white")

# --- Courtyard
tulsi_madam(V_INT, "Mutram_TulsiMadam", (0, 2.6, 0.52))
for x, y in ((-2.0, 0.8), (2.0, 4.4)):
    plant(V_INT, f"Mutram_Plant_{x:+.0f}", (x, y, 0.52), h=1.0, pot="laterite")

# --- Pooja niche (behind the back corridor)
pooja = Piece("Pooja_Niche")
pooja.box_minmax((-1.15, 8.4, 1.25), (1.15, 8.8, 2.85), M["plaster"])                 # niche shell
pooja.box_minmax((-1.0, 8.6, 1.35), (1.0, 8.65, 2.75), M["teak"])                     # back panel
pooja.box_minmax((-1.0, 8.15, 1.35), (1.0, 8.6, 1.42), M["teak"])                     # shelf
pooja.box_minmax((-1.12, 8.08, 2.75), (1.12, 8.2, 2.9), M["brass"])                   # brass lintel
pooja.build(V_SUITE)
tanjore_art(V_SUITE, "Pooja_Panel", (0, 8.55, 2.05), w=0.7, h=0.9)
for x in (-0.55, 0.55):
    kuthuvilakku(V_SUITE, f"Pooja_Lamp_{'L' if x < 0 else 'R'}", (x, 8.35, 1.42), h=0.45)
for x in (-1.5, 1.5):
    kuthuvilakku(V_SUITE, f"Pooja_FloorLamp_{'L' if x < 0 else 'R'}", (x, 7.75, F), h=1.05)

# --- Garden
for i, (x, y, h, lean) in enumerate([(-12.0, -10.5, 10.0, (0.8, -0.2)), (12.5, -9.0, 9.0, (-0.6, 0.3)), (-12.5, 4.0, 11.0, (0.5, 0.5)),
                                      (12.0, 6.0, 9.5, (-0.4, -0.4)), (5.5, 10.8, 10.0, (0.3, -0.8)), (-6.0, 10.5, 8.5, (-0.6, -0.5))]):
    coconut_tree(V_EXT, f"Coconut_{i}", (x, y, 0), h=h, lean=lean)
for i, (x, y) in enumerate([(10.5, -3.0), (11.6, -1.4), (-11.0, -2.5), (-10.6, -4.2)]):
    banana_plant(V_EXT, f"Banana_{i}", (x, y, 0), h=2.6 + 0.3 * (i % 2))
for i, (x, y) in enumerate([(-3.4, -13.6), (3.4, -13.6), (-8.0, -8.0), (8.0, -8.0)]):
    plant(V_EXT, f"Jasmine_{i}", (x, y, 0), h=1.1, pot="laterite", leaves="leaves_light")
well(V_EXT, "Garden_Well", (-11.8, 8.6, 0))

# --- Hotspots for the web viewer (named empties travel through glTF as nodes)
HOTSPOTS = {
    "Hotspot_Thinnai": (-5.0, -4.3, 1.7),
    "Hotspot_Door": (0.0, -3.7, 2.3),
    "Hotspot_Mutram": (0.0, 2.6, 2.0),
    "Hotspot_Oonjal": (-6.2, 3.0, 1.6),
    "Hotspot_Kitchen": (5.8, 7.0, 1.7),
    "Hotspot_Pooja": (0.0, 8.0, 2.1),
    "Hotspot_Roof": (-6.0, -1.4, 5.5),
    "Hotspot_Garden": (12.0, -8.5, 3.0),
}
for k, v in HOTSPOTS.items():
    add_empty(V_HOT, k, v)

# --- Render-only lights (dusk and interiors)
add_light(V_LIGHTS, "House_Hall_Fill", "AREA", (-5.8, 3.0, 3.3), 260, size=3.0, size_y=2.0)
add_light(V_LIGHTS, "House_Dining_Fill", "AREA", (5.8, 4.0, 3.3), 260, size=3.0, size_y=3.0)
add_light(V_LIGHTS, "House_Verandah", "AREA", (0, -4.9, 2.9), 220, size=8.0, size_y=1.0)
for i, (x, y, z) in enumerate([(-8.3, 0.6, 1.95), (-0.55, 8.35, 1.95), (0.55, 8.35, 1.95), (-1.5, 7.75, 1.9), (1.5, 7.75, 1.9), (5.6, 2.6, 2.1)]):
    add_light(V_LIGHTS, f"House_Lamp_{i}", "POINT", (x, y, z), 35, color="#ffb35c", size=0.05)

# ---------------------------------------------------------------------------
# Scene 2 — Oonjal Flat, an Adyar apartment (with a "before" state)
# ---------------------------------------------------------------------------

log("building interior studies")
ARD = new_coll("Study_AdyarFlat")
ARD_FURN = new_coll("Adyar_After", ARD)
ARD_BEFORE = new_coll("Adyar_Before", ARD)
ARD_CEIL = new_coll("Adyar_Ceiling", ARD)
ARD_L = new_coll("Adyar_Lights", ARD)
ox = 200.0
w, d, h = 7.6, 6.2, 3.4
ard_shell, _, _ = room_shell(ARD, "Adyar", ox, w, d, h, "athangudi", "plaster", "plaster",
                             [(1.1, 2.3, 0.1, 3.0), (3.2, 4.4, 0.1, 3.0), (5.3, 6.5, 0.1, 3.0)],
                             mullions=1, transoms=[2.3], roof_coll=ARD_CEIL, frame_mat="teak")
dado = Piece("Adyar_Dado")
dado.box_minmax((ox, 0, 0), (ox + 0.025, d, 0.9), M["plaster_ochre"])
dado.box_minmax((ox + w - 0.025, 0, 0), (ox + w, d, 0.9), M["plaster_ochre"])
dado.build(ARD)
rug(ARD_FURN, "Adyar_Rug", (ox + 2.6, 3.1, 0), w=3.2, d=2.6, rot=math.pi / 2, mat="fabric_stone")
sofa(ARD_FURN, "Adyar_Sofa", (ox + 0.62, 3.1, 0), rot=math.pi / 2, length=2.8, fabric="fabric_olive", base="teak")
low_table(ARD_FURN, "Adyar_Teapoy", (ox + 2.3, 3.1, 0), rot=math.pi / 2, w=1.2, d=0.7)
uruli(ARD_FURN, "Adyar_TableUruli", (ox + 2.3, 3.1, 0.42), r=0.22)
lounge_chair(ARD_FURN, "Adyar_CaneChair_A", (ox + 3.8, 2.3, 0), rot=math.radians(-110), fabric="cane", wood="teak")
lounge_chair(ARD_FURN, "Adyar_CaneChair_B", (ox + 3.8, 3.9, 0), rot=math.radians(-70), fabric="cane", wood="teak")
oonjal(ARD_FURN, "Adyar_Oonjal", (ox + 5.9, 4.6, 0), rot=0.0, hang=h - 0.08)
kuthuvilakku(ARD_FURN, "Adyar_Lamp", (ox + 0.5, 1.0, 0), h=1.0)
tanjore_art(ARD_FURN, "Adyar_TanjoreArt", (ox + 0.04, 3.1, 1.95), rot=math.pi / 2, w=1.0, h=1.2)
plant(ARD_FURN, "Adyar_Plant", (ox + 7.1, 5.7, 0), h=1.6, pot="copper")
shelving(ARD_FURN, "Adyar_Shelving", (ox + 4.9, 0.2, 0), rot=math.pi, length=2.6, height=2.6, wood="teak")
uruli(ARD_FURN, "Adyar_FloorUruli", (ox + 3.6, 5.6, 0), r=0.42)
pendant(ARD_FURN, "Adyar_Pendant", (ox + 2.4, 3.1, h), drop=1.4, r=0.26, shade="brass")
pb = Piece("Adyar_BeforeClutter")
pb.box_minmax((ox, 0, 0.0), (ox + w, d, 0.012), M["vitrified"])
for i in range(5):
    pb.box((ox + 1 + i * 1.1, 1.2 + (i % 2) * 2.5, 0.25), (0.6, 0.45, 0.5), M["cardboard"], rot=(0, 0, 0.3 * i))
pb.box((ox + 6.6, 1.0, 0.45), (0.8, 0.5, 0.9), M["cardboard"])
pb.cyl((ox + 3.8, 3.1, h - 0.15), 0.07, 0.3, M["fluorescent"], segs=12)
pb.build(ARD_BEFORE)
add_light(ARD_L, "Adyar_Fill", "AREA", (ox + 3.8, 3.0, h - 0.05), 260, size=3.0)

# ---------------------------------------------------------------------------
# Scene 3 — Hotel Mallipoo lobby, Madurai
# ---------------------------------------------------------------------------

SAL = new_coll("Study_HotelMallipoo")
SAL_CEIL = new_coll("Mallipoo_Ceiling", SAL)
SAL_L = new_coll("Mallipoo_Lights", SAL)
ox = 400.0
w, d, h = 16.0, 11.0, 5.6
room_shell(SAL, "Mallipoo", ox, w, d, h, "athangudi", "plaster_ochre", "teak",
           [(1.0, 5.0, 0.0, 5.0), (6.0, 10.0, 0.0, 5.0), (11.0, 15.0, 0.0, 5.0)],
           side_wall_mats={"front": "teak", "left": "travertine"}, mullions=2, transoms=[3.2], roof_coll=SAL_CEIL,
           frame_mat="teak")
cols = Piece("Mallipoo_Pillars")
for x in (5.5, 10.5):
    for y in (3.5, 8.0):
        pillar(cols, ox + x, y, 0.0, h, r=0.26)
cols.build(SAL)
reception_desk(SAL, "Mallipoo_Reception", (ox + 13.0, 3.0, 0), rot=math.radians(90))
kuthuvilakku(SAL, "Mallipoo_GrandLamp", (ox + 14.4, 5.0, 0), h=1.7)
tanjore_art(SAL, "Mallipoo_TanjoreArt", (ox + 15.97, 7.0, 2.6), rot=-math.pi / 2, w=2.2, h=2.6)
rug(SAL, "Mallipoo_Rug", (ox + 6.0, 6.0, 0), w=6.0, d=4.0, mat="fabric_stone")
sofa(SAL, "Mallipoo_Sofa_A", (ox + 6.0, 4.3, 0), rot=math.pi, length=3.2, fabric="silk_red", base="teak")
sofa(SAL, "Mallipoo_Sofa_B", (ox + 6.0, 7.7, 0), length=3.2, fabric="silk_red", base="teak")
for i, (x, y, r) in enumerate([(3.6, 5.2, 110), (3.6, 6.8, 70), (8.4, 5.2, -110), (8.4, 6.8, -70)]):
    lounge_chair(SAL, f"Mallipoo_CaneChair_{i}", (ox + x, y, 0), rot=math.radians(r), fabric="cane", wood="teak")
uruli(SAL, "Mallipoo_Uruli", (ox + 6.0, 6.0, 0), r=0.85)
for i, (x, y, drop) in enumerate([(5.2, 5.4, 2.2), (6.0, 6.6, 2.6), (6.8, 5.6, 2.0), (5.6, 6.9, 1.8), (6.6, 6.2, 2.4)]):
    pendant(SAL, f"Mallipoo_BellLamp_{i}", (ox + x, y, h), drop=drop, r=0.2, shade="brass")
for i, (x, y) in enumerate([(1.0, 1.0), (15.0, 9.8), (1.0, 9.8), (11.4, 1.2)]):
    plant(SAL, f"Mallipoo_Plant_{i}", (ox + x, y, 0), h=2.4, pot="copper")
add_light(SAL_L, "Mallipoo_Lamps", "POINT", (ox + 6.0, 6.0, h - 2.6), 700, color="#ffc98a", size=1.0)
add_light(SAL_L, "Mallipoo_Desk", "AREA", (ox + 13.0, 3.0, h - 0.1), 400, size=3.0)

# ---------------------------------------------------------------------------
# Scene 4 — Halden workspace (also used for the studio page)
# ---------------------------------------------------------------------------

HAL = new_coll("Study_HaldenWorkspace")
HAL_CEIL = new_coll("Halden_Ceiling", HAL)
HAL_L = new_coll("Halden_Lights", HAL)
ox = 600.0
w, d, h = 14.0, 9.0, 3.8
room_shell(HAL, "Halden", ox, w, d, h, "polished_concrete", "plaster", "concrete",
           [(1.0, 13.0, 0.9, 3.3)], side_wall_mats={"left": "cladding"}, mullions=5, roof_coll=HAL_CEIL)
dining_table(HAL, "Halden_LongTable", (ox + 6.0, 4.2, 0), length=6.0, width=1.2)
for i in range(5):
    x = ox + 3.6 + i * 1.2
    chair(HAL, f"Halden_Chair_N{i}", (x, 4.95, 0), wood="walnut", fabric="fabric_stone")
    chair(HAL, f"Halden_Chair_S{i}", (x, 3.45, 0), rot=math.pi, wood="walnut", fabric="fabric_stone")
linear_pendant(HAL, "Halden_Pendant_A", (ox + 4.6, 4.2, h), length=2.6, drop=1.6)
linear_pendant(HAL, "Halden_Pendant_B", (ox + 7.4, 4.2, h), length=2.6, drop=1.6)
for i in range(3):
    desk(HAL, f"Halden_Desk_{i}", (ox + 3.0 + i * 3.6, 7.9, 0), rot=math.pi)
    chair(HAL, f"Halden_DeskChair_{i}", (ox + 3.0 + i * 3.6, 7.2, 0), rot=math.pi, wood="black_steel", fabric="fabric_charcoal")
shelving(HAL, "Halden_Shelving", (ox + 7.0, 0.18, 0), rot=math.pi, length=6.0, height=2.6)
mtable = Piece("Halden_MaterialTable")
mtable.box((0, 0, 0.9), (2.0, 0.9, 0.04), M["walnut"], bevel=0.004)
mtable.box((0, 0, 0.44), (1.8, 0.7, 0.88), M["charcoal"])
for i, mk in enumerate(["travertine", "marble", "oak", "ceramic", "brushed_metal", "fabric_olive"]):
    mtable.box((-0.75 + i * 0.3, -0.05 + (i % 2) * 0.12, 0.935), (0.24, 0.2, 0.03), M[mk], bevel=0.003)
mtable.build(HAL, (ox + 12.0, 2.2, 0))
for i, (x, y) in enumerate([(0.8, 0.8), (13.2, 8.4), (0.8, 8.4)]):
    plant(HAL, f"Halden_Plant_{i}", (ox + x, y, 0), h=1.9, pot="concrete")
add_light(HAL_L, "Halden_Fill", "AREA", (ox + 7.0, 4.5, h - 0.05), 400, size=6.0, size_y=3.0)

# ---------------------------------------------------------------------------
# Scene 5 — Mylapore house renovation, Madras-terrace roof (before + after)
# ---------------------------------------------------------------------------

LOF = new_coll("Study_MylaporeHouse")
LOF_AFTER = new_coll("Mylapore_After", LOF)
LOF_BEFORE = new_coll("Mylapore_Before", LOF)
LOF_CEIL = new_coll("Mylapore_Ceiling", LOF)
LOF_L = new_coll("Mylapore_Lights", LOF)
ox = 800.0
w, d, h = 10.0, 7.0, 4.2
loft_shell, _, loft_glass = room_shell(LOF, "Mylapore", ox, w, d, h, "red_oxide", "plaster", "brick",
                                       [(0.8, 4.4, 0.6, 3.8), (5.6, 9.2, 0.6, 3.8)],
                                       side_wall_mats={"left": "brick"}, mullions=3, transoms=[1.6, 2.7],
                                       roof_coll=LOF_CEIL, frame_mat="teak")
rafters = Piece("Mylapore_TerraceRafters")   # Madras terrace: teak joists carrying brick and lime
x = 0.4
while x < w:
    rafters.box_minmax((ox + x - 0.06, 0, h - 0.2), (ox + x + 0.06, d, h), M["teak"])
    x += 0.6
for y in (2.3, 4.7):
    rafters.box_minmax((ox, y - 0.15, h - 0.5), (ox + w, y + 0.15, h - 0.2), M["teak"])
rafters.build(LOF)
rug(LOF_AFTER, "Mylapore_Rug", (ox + 3.0, 3.8, 0), w=3.8, d=3.0, mat="fabric_stone")
sofa(LOF_AFTER, "Mylapore_Sofa", (ox + 3.0, 2.3, 0), rot=math.pi, length=3.2, fabric="fabric_stone", base="teak")
oonjal(LOF_AFTER, "Mylapore_Oonjal", (ox + 1.4, 5.4, 0), rot=math.radians(90), hang=h - 0.52)
low_table(LOF_AFTER, "Mylapore_Teapoy", (ox + 3.0, 3.8, 0), w=1.2, d=0.7)
kitchen_island(LOF_AFTER, "Mylapore_Island", (ox + 7.6, 3.4, 0), rot=math.pi / 2, length=2.6, top="granite_black", wood="teak")
for i, y in enumerate((2.6, 3.4, 4.2)):
    stool(LOF_AFTER, f"Mylapore_Stool_{i}", (ox + 6.85, y, 0), seat="cane")
    pendant(LOF_AFTER, f"Mylapore_Pendant_{i}", (ox + 7.6, y, h - 0.5), drop=1.5, r=0.15, shade="brass")
cabinetry(LOF_AFTER, "Mylapore_Kitchen", (ox + 9.68, 3.4, 0), rot=-math.pi / 2, length=4.6, splash="ceramic", wood="teak", top="granite_black")
vessels = Piece("Mylapore_Vessels")
brass_vessels(vessels, ox + 9.55, 1.6, 0.9, count=1, seed=1)
for k in range(4):
    vessels.cyl((ox + 9.6, 2.3 + k * 0.3, 2.05), 0.08 + 0.02 * (k % 2), 0.22, M["brass" if k % 2 else "copper"], segs=16)
vessels.build(LOF_AFTER)
shelving(LOF_AFTER, "Mylapore_Shelving", (ox + 0.2, 1.6, 0), rot=-math.pi / 2, length=2.4, height=2.6, wood="teak")
kuthuvilakku(LOF_AFTER, "Mylapore_Lamp", (ox + 4.9, 2.0, 0), h=1.0)
plant(LOF_AFTER, "Mylapore_Plant_A", (ox + 0.6, 6.4, 0), h=2.2, pot="copper")
banana_plant(LOF_AFTER, "Mylapore_Banana", (ox + 5.2, 6.4, 0), h=2.2)
lb = Piece("Mylapore_BeforeState")
lb.box_minmax((ox, 0, 0), (ox + w, d, 0.015), M["concrete_raw"])
lb.box_minmax((ox + 0.001, 0, 0), (ox + 0.02, d, h - 0.01), M["paint_old"])
for i in range(7):
    lb.box((ox + 1.0 + i * 1.2, 1.5 + (i * 1.7) % 4.0, 0.3), (0.7, 0.5, 0.6), M["cardboard"], rot=(0, 0, 0.4 * i))
for xx in (2.0, 5.0, 8.0):
    lb.box((ox + xx, 3.5, h - 0.6), (0.12, 1.5, 0.05), M["fluorescent"])
lb.box((ox + 3.2, 4.6, 1.0), (0.06, 0.6, 2.0), M["bark"], rot=(0.25, 0, 0))
lb.box_minmax((ox + 6.0, 0.3, 0), (ox + 9.8, 0.9, 0.9), M["vinyl_old"])
lb.build(LOF_BEFORE)
add_light(LOF_L, "Mylapore_Fill", "AREA", (ox + 5.0, 3.5, h - 0.6), 380, color="#ffe2bd", size=6.0, size_y=3.0)

# ---------------------------------------------------------------------------
# Scene 6 — Material board (studio photography of the sample library)
# ---------------------------------------------------------------------------

BRD = new_coll("Study_MaterialBoard")
ox = 1000.0
board = Piece("Board_Table")
board.box_minmax((ox - 3, -3, -0.05), (ox + 3, 3, 0.0), M["plaster"])
board.build(BRD)
samples = Piece("Board_Samples")
layout = [("athangudi", -0.9, 0.5, 0.6, 0.6, 0.03, 0.1), ("red_oxide", -0.25, 0.65, 0.45, 0.45, 0.03, -0.15),
          ("teak", 0.45, 0.45, 0.7, 0.2, 0.03, 0.05), ("granite_black", 0.55, 0.15, 0.6, 0.18, 0.03, -0.05),
          ("roof_tiles", -0.75, -0.05, 0.45, 0.35, 0.04, 0.2), ("brushed_metal", -0.15, 0.1, 0.35, 0.12, 0.01, 0.3),
          ("ceramic", 0.05, -0.35, 0.4, 0.4, 0.015, -0.1), ("silk_red", 0.65, -0.3, 0.4, 0.3, 0.012, 0.25),
          ("cane", 0.7, -0.4, 0.35, 0.25, 0.012, 0.1), ("laterite", -0.6, -0.6, 0.3, 0.12, 0.08, -0.2),
          ("plaster_ochre", -0.15, -0.75, 0.5, 0.25, 0.03, 0.0), ("kolam_floor", 0.3, -0.75, 0.3, 0.2, 0.012, -0.3)]
for mk, x, y, sx, sy, sz, rz in layout:
    samples.box((ox + x, y, sz / 2), (sx, sy, sz), M[mk], bevel=0.003, rot=(0, 0, rz))
samples.cyl((ox - 0.35, 0.75 - 0.4, 0.06), 0.06, 0.12, M["brass"], segs=32)
samples.sphere((ox + 0.15, 0.62, 0.07), 0.07, M["ceramic_black"], subdiv=3)
samples.build(BRD)

# ---------------------------------------------------------------------------
# Scenes 7-9 — modern villa, flat and office (see modern_scenes.py)
# ---------------------------------------------------------------------------

_modern = os.path.join(SCRIPT_DIR, "modern_scenes.py")
exec(compile(open(_modern, encoding="utf-8").read(), _modern, "exec"), globals())

# ---------------------------------------------------------------------------
# World, sun, render configuration
# ---------------------------------------------------------------------------

world = bpy.data.worlds.new("AN_World")
SCENE.world = world
try:
    world.use_nodes = True
except AttributeError:
    pass
wnt = world.node_tree
bg = next(n for n in wnt.nodes if n.type == "BACKGROUND")
env = wnt.nodes.new("ShaderNodeTexEnvironment")
mapping = wnt.nodes.new("ShaderNodeMapping")
coord = wnt.nodes.new("ShaderNodeTexCoord")
wnt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
wnt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
sky = wnt.nodes.new("ShaderNodeTexSky")
sky.sky_type = "MULTIPLE_SCATTERING"
sky.sun_disc = False
HDRI = {}


def set_world(name, strength=1.0, rot_z=0.0, sun=None):
    """'sky' = physical sky matched to the sun lamp; anything else = a bundled CC0 HDRI."""
    for link in list(bg.inputs["Color"].links):
        wnt.links.remove(link)
    if name == "paper":
        bg.inputs["Color"].default_value = (0.78, 0.76, 0.72, 1.0)
    elif name == "sky":
        elev, azim = sun[0], sun[1]
        sky.sun_elevation = math.radians(max(elev, 0.5))
        sky.sun_rotation = math.radians(90 - azim)
        wnt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    else:
        if name not in HDRI:
            HDRI[name] = bpy.data.images.load(os.path.join(HDRI_DIR, name + ".exr"), check_existing=True)
        env.image = HDRI[name]
        mapping.inputs["Rotation"].default_value = (0, 0, math.radians(rot_z))
        wnt.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength


sun_data = bpy.data.lights.new("AN_Sun", "SUN")
sun_data.angle = math.radians(1.5)
SUN = bpy.data.objects.new("AN_Sun", sun_data)
SCENE.collection.objects.link(SUN)


def set_sun(elev, azim, energy=4.0, color="#fff2e0"):
    """azim: compass direction the light comes FROM, degrees (0 = +Y)."""
    SUN.rotation_euler = (Vector((0, 0, -1)).rotation_difference(
        -Vector((math.sin(math.radians(azim)) * math.cos(math.radians(elev)),
                 math.cos(math.radians(azim)) * math.cos(math.radians(elev)),
                 math.sin(math.radians(elev)))))).to_euler()
    sun_data.energy = energy
    sun_data.color = [srgb_to_linear(c) for c in hex_rgb(color)]


cam_data = bpy.data.cameras.new("AN_Camera")
CAM = bpy.data.objects.new("AN_Camera", cam_data)
SCENE.collection.objects.link(CAM)
SCENE.camera = CAM

r = SCENE.render
r.engine = "BLENDER_EEVEE"
r.image_settings.file_format = "WEBP"
r.image_settings.quality = 82
r.image_settings.color_mode = "RGB"
r.film_transparent = False
ee = SCENE.eevee
ee.taa_render_samples = SAMPLES
for attr, val in (("use_raytracing", True), ("use_shadows", True), ("shadow_ray_count", 2), ("shadow_step_count", 8)):
    if hasattr(ee, attr):
        setattr(ee, attr, val)
if hasattr(ee, "ray_tracing_options"):
    ee.ray_tracing_options.resolution_scale = "2"
SCENE.view_settings.view_transform = "AgX"

STUDIES = {"villa": VILLA, "ardoise": ARD, "saltstone": SAL, "halden": HAL, "loft": LOF, "board": BRD,
           "mvilla": MV, "mflat": MF, "moffice": MO}

# ---------------------------------------------------------------------------
# Save the source file and export the web model (before any render-time state)
# ---------------------------------------------------------------------------

blend_saved = False
try:
    bpy.ops.file.make_paths_relative()
except RuntimeError:
    pass
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH, compress=True)
blend_saved = True
log(f"saved {BLEND_PATH}")

def export_glb(coll, path):
    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    export_objs = [o for o in coll.all_objects if o.type in {"MESH", "EMPTY"}]
    for ob in export_objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = export_objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_image_format="AUTO",
    )
    faces = sum(len(o.data.polygons) for o in export_objs if o.type == "MESH")
    log(f"exported {path} ({os.path.getsize(path) / 1e6:.2f} MB, {len(export_objs)} nodes, {faces} faces)")


if not NO_EXPORT:
    models_dir = os.path.dirname(MODEL_PATH)
    export_glb(VILLA, MODEL_PATH)
    export_glb(MV, os.path.join(models_dir, "modern-villa.glb"))
    export_glb(MF, os.path.join(models_dir, "modern-flat.glb"))
    export_glb(MO, os.path.join(models_dir, "modern-office.glb"))

# ---------------------------------------------------------------------------
# Renders
# ---------------------------------------------------------------------------


def look_at(loc, target):
    CAM.location = loc
    d = Vector(target) - Vector(loc)
    CAM.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def show_only(key, hidden=()):
    for k, c in STUDIES.items():
        c.hide_render = k != key
    RENDER_ONLY.hide_render = key not in ("villa", "mvilla")
    V_LIGHTS.hide_render = True
    MV_LIGHTS.hide_render = True
    for c in hidden:
        c.hide_render = True


def render(rid, out_dir, res=(1600, 1000)):
    if ONLY and rid not in ONLY:
        return
    r.resolution_x = int(res[0] * RES_SCALE)
    r.resolution_y = int(res[1] * RES_SCALE)
    r.resolution_percentage = 100
    r.filepath = os.path.join(out_dir, rid + ".webp")
    t = time.time()
    bpy.ops.render.render(write_still=True)
    log(f"rendered {rid} in {time.time() - t:.1f}s")


def photo(rid, study, loc, target, lens=24, res=(1600, 1000), world="sky", world_strength=1.0,
          world_rot=0, sun=(35, 220, 4.0, "#fff2e0"), exposure=0.0, extra_lights=None, hidden=(),
          before=None):
    if ONLY and rid not in ONLY:
        return
    show_only(study, hidden)
    if extra_lights is not None:
        extra_lights.hide_render = False
    swaps = []
    if before:
        for c in before.get("show", []):
            c.hide_render = False
        for c in before.get("hide", []):
            c.hide_render = True
        for ob, mat in before.get("swaps", []):
            swaps.append((ob, list(ob.data.materials)))
            for i in range(len(ob.data.materials)):
                ob.data.materials[i] = mat
    SCENE.render.engine = "BLENDER_EEVEE"
    SCENE.view_settings.view_transform = "AgX"
    SCENE.view_settings.exposure = exposure
    cam_data.type = "PERSP"
    cam_data.lens = lens
    cam_data.clip_end = 1000
    cam_data.sensor_width = 36
    look_at(loc, target)
    set_sun(*sun)
    set_world(world, world_strength * (0.25 if world == "sky" else 1.0), world_rot, sun)
    try:
        SCENE.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    render(rid, RENDER_DIR, res)
    for ob, mats in swaps:
        for i, m in enumerate(mats):
            ob.data.materials[i] = m


def drawing(rid, study, loc, target, ortho_scale, res=(1600, 1000), hide_objects=(), hidden=()):
    if ONLY and rid not in ONLY:
        return
    show_only(study, hidden)
    for ob in hide_objects:
        ob.hide_render = True
    SCENE.render.engine = "BLENDER_WORKBENCH"
    sh = SCENE.display.shading
    sh.light = "STUDIO"
    sh.color_type = "SINGLE"
    sh.single_color = (0.93, 0.92, 0.89)
    sh.show_cavity = True
    sh.cavity_type = "BOTH"
    sh.show_object_outline = True
    sh.object_outline_color = (0.09, 0.09, 0.08)
    sh.show_shadows = False
    sh.shadow_intensity = 0.25
    SCENE.display.shadow_focus = 0.4
    SCENE.view_settings.view_transform = "Standard"
    SCENE.view_settings.exposure = 0.0
    set_world("studio", 1.0)
    world.color = (1.0, 1.0, 1.0)
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    look_at(loc, target)
    render(rid, DRAWING_DIR, res)
    for ob in hide_objects:
        ob.hide_render = False


if not SKIP_RENDERS:
    log("rendering photography")
    DAY = (32, 215, 4.5, "#fff1df")
    HIGH = (62, 200, 4.5, "#fff1df")          # high sun so light falls into the mutram
    # Mutram Veedu
    photo("mutram-exterior-day", "villa", (-9.5, -13.6, 1.9), (1.0, -3.0, 2.6), lens=24, res=(1920, 1200), sun=DAY)
    photo("mutram-exterior-dusk", "villa", (11.0, -13.4, 1.8), (-1.0, -3.2, 2.5), lens=24, res=(1920, 1200),
          sun=(4, 250, 2.0, "#ff9a5c"), world="sky", world_strength=0.12, exposure=0.7, extra_lights=V_LIGHTS)
    photo("mutram-courtyard", "villa", (-1.9, -2.7, 2.2), (0.6, 4.6, 1.7), lens=20, sun=HIGH, exposure=0.5,
          extra_lights=V_LIGHTS)
    photo("mutram-oonjal", "villa", (-2.8, 0.1, 1.7), (-7.6, 4.2, 1.4), lens=22, sun=HIGH, exposure=0.7,
          extra_lights=V_LIGHTS)
    photo("mutram-kitchen", "villa", (2.9, 0.5, 1.8), (7.4, 7.3, 1.3), lens=22, sun=HIGH, exposure=0.7,
          extra_lights=V_LIGHTS)
    photo("mutram-thinnai", "villa", (7.6, -6.9, 1.7), (-2.0, -4.3, 1.8), lens=24, res=(1000, 1300),
          sun=(24, 240, 4.5, "#ffe2bf"), exposure=0.2)
    photo("mutram-door", "villa", (0.7, -9.0, 1.7), (0.0, -3.6, 1.6), lens=32, res=(1000, 1300),
          sun=(30, 200, 4.5, "#ffe9cf"), exposure=0.3)
    photo("mutram-pooja", "villa", (0.0, 5.7, 1.6), (0.0, 8.4, 1.9), lens=30, res=(1000, 1300), sun=HIGH,
          exposure=0.6, extra_lights=V_LIGHTS)
    photo("mutram-aerial", "villa", (-22, -30, 21), (0.0, -0.5, 1.5), lens=35, sun=DAY)
    # Modern villa, flat and office (fallback images for the 3D viewer, hero and gallery)
    photo("modern-villa-day", "mvilla", (-15.5, -17.5, 3.6), (1.0, -1.0, 3.4), lens=24, res=(1920, 1200),
          sun=(38, 215, 4.5, "#fff1df"), exposure=0.2)
    photo("modern-villa-dusk", "mvilla", (14.0, -22.0, 3.0), (-1.0, -2.0, 3.6), lens=26, res=(1920, 1200),
          sun=(4, 250, 2.0, "#ff9a5c"), world="sky", world_strength=0.12, exposure=0.8, extra_lights=MV_LIGHTS)
    photo("modern-villa-living", "mvilla", (0.9, -2.8, 1.7), (-6.5, 2.6, 1.3), lens=20, sun=(45, 190, 4.0),
          exposure=0.8, extra_lights=MV_LIGHTS, hidden=[])
    photo("modern-flat-aerial", "mflat", (14.0, -13.5, 11.5), (6.0, 4.0, 0.6), lens=30, res=(1920, 1200),
          sun=(55, 200, 3.0), world="paper", world_strength=1.4, exposure=0.1, hidden=[MF_CEIL])
    photo("modern-office-aerial", "moffice", (24.0, -15.5, 13.0), (9.5, 4.5, 0.6), lens=30, res=(1920, 1200),
          sun=(55, 200, 3.0), world="paper", world_strength=1.4, exposure=0.1, hidden=[MO_CEIL])
    # Oonjal Flat, Adyar
    ard_cam = dict(loc=(200 + 7.1, 0.5, 1.5), target=(200 + 2.0, 4.6, 1.15), lens=20)
    photo("adyar-living", "ardoise", **ard_cam, sun=(28, 20, 4.0), world="sky", exposure=0.5,
          hidden=[ARD_BEFORE], extra_lights=ARD_L)
    photo("adyar-living-before", "ardoise", **ard_cam, sun=(28, 20, 2.2, "#e8eef5"), world="sky",
          world_strength=0.12, exposure=0.5,
          before={"hide": [ARD_FURN], "show": [ARD_BEFORE], "swaps": [(ard_shell, M["plaster_aged"])]})
    photo("adyar-detail", "ardoise", (200 + 3.2, 1.9, 1.0), (200 + 2.3, 3.1, 0.45), lens=45,
          res=(1000, 1300), sun=(28, 20, 4.0), world="sky", exposure=0.5, hidden=[ARD_BEFORE], extra_lights=ARD_L)
    photo("adyar-oonjal", "ardoise", (200 + 1.6, 1.0, 1.45), (200 + 5.9, 4.8, 1.2), lens=24, sun=(28, 20, 4.0),
          world="sky", exposure=0.5, hidden=[ARD_BEFORE], extra_lights=ARD_L)
    # Hotel Mallipoo
    photo("mallipoo-lobby", "saltstone", (400 + 15.3, 0.7, 1.7), (400 + 5.5, 9.0, 2.4), lens=18,
          res=(1920, 1200), sun=(30, 10, 4.0), world="sky", exposure=0.1, extra_lights=SAL_L)
    photo("mallipoo-lounge", "saltstone", (400 + 3.0, 2.2, 1.3), (400 + 6.6, 6.4, 0.6), lens=28,
          sun=(30, 10, 4.0), world="sky", exposure=0.1, extra_lights=SAL_L)
    photo("mallipoo-reception", "saltstone", (400 + 9.5, 1.3, 1.45), (400 + 13.6, 4.4, 1.1), lens=32,
          res=(1000, 1300), sun=(30, 10, 4.0), world="sky", exposure=0.1, extra_lights=SAL_L)
    # Workspace (office, unchanged)
    photo("halden-workspace", "halden", (600 + 13.4, 0.6, 1.6), (600 + 4.5, 6.5, 1.0), lens=20,
          sun=(30, 330, 4.0), world="sky", exposure=0.5, extra_lights=HAL_L)
    photo("halden-table", "halden", (600 + 3.4, 1.4, 1.35), (600 + 7.0, 4.6, 0.75), lens=32,
          sun=(30, 330, 4.0), world="sky", exposure=0.5, extra_lights=HAL_L)
    photo("halden-studio", "halden", (600 + 0.9, 8.4, 1.6), (600 + 10.0, 2.0, 1.0), lens=22,
          sun=(30, 330, 4.0), world="sky", exposure=0.5, extra_lights=HAL_L)
    photo("halden-materials", "halden", (600 + 11.6, 1.2, 1.5), (600 + 12.0, 2.2, 0.92), lens=40,
          res=(1000, 1300), sun=(30, 330, 4.0), world="sky", exposure=0.5, extra_lights=HAL_L)
    # Mylapore house — after and before
    loft_a = dict(loc=(800 + 9.4, 0.5, 1.6), target=(800 + 3.2, 5.8, 1.7), lens=20)
    loft_b = dict(loc=(800 + 0.7, 0.8, 1.5), target=(800 + 7.0, 5.6, 1.4), lens=22)
    after = dict(sun=(30, 15, 4.0), world="sky", exposure=0.5, hidden=[LOF_BEFORE], extra_lights=LOF_L)
    before = dict(sun=(30, 15, 2.0, "#e6edf5"), world="sky", world_strength=0.12, exposure=0.4,
                  before={"hide": [LOF_AFTER], "show": [LOF_BEFORE], "swaps": [(loft_glass, M["glass_dirty"])]})
    photo("mylapore-living", "loft", **loft_a, **after)
    photo("mylapore-living-before", "loft", **loft_a, **before)
    photo("mylapore-kitchen", "loft", **loft_b, **after)
    photo("mylapore-kitchen-before", "loft", **loft_b, **before)
    # Material board
    photo("material-board", "board", (1000 + 0.0, -1.5, 2.2), (1000 + 0.0, 0.0, 0.0), lens=40, res=(1600, 1000),
          sun=(60, 200, 3.0), world="studio", exposure=0.4)
    photo("material-board-low", "board", (1000 + 1.3, -1.2, 0.45), (1000 - 0.2, 0.2, 0.0), lens=55,
          res=(1000, 1300), sun=(40, 230, 3.0), world="studio", exposure=0.4)

    log("rendering drawings")
    drawing("mutram-plan", "villa", (0.0, 1.0, 60), (0.0, 1.0001, 0), 30,
            hide_objects=list(V_ROOF.all_objects) + list(V_EXT.all_objects))
    drawing("mutram-roof-plan", "villa", (0.0, 1.0, 60), (0.0, 1.0001, 0), 30, hidden=[V_EXT])
    drawing("mutram-elevation", "villa", (0.0, -60, 2.8), (0.0, 0, 2.8), 26, hidden=[V_EXT])
    drawing("mutram-axonometric", "villa", (-28, -34, 30), (0.0, 0.5, 1.5), 32, hidden=[V_EXT])
    for key, name, ox, w, d, ceil in (("ardoise", "adyar", 200, 7.6, 6.2, ARD_CEIL), ("saltstone", "mallipoo", 400, 16, 11, SAL_CEIL),
                                      ("halden", "halden", 600, 14, 9, HAL_CEIL), ("loft", "mylapore", 800, 10, 7, LOF_CEIL)):
        extra = [ARD_BEFORE] if key == "ardoise" else [LOF_BEFORE] if key == "loft" else []
        drawing(f"{name}-plan", key, (ox + w / 2, d / 2, 60), (ox + w / 2, d / 2 + 0.0001, 0), max(w, d) * 1.25,
                hidden=[ceil] + extra)


def make_small_variants():
    """Half-width '-sm.webp' copies for responsive srcset."""
    settings = SCENE.render.image_settings
    settings.file_format = "WEBP"
    settings.quality = 78
    # save_render() applies the view transform; keep the pixels untouched.
    SCENE.view_settings.view_transform = "Standard"
    SCENE.view_settings.look = "None"
    SCENE.view_settings.exposure = 0.0
    for folder in (RENDER_DIR, DRAWING_DIR):
        for fname in sorted(os.listdir(folder)):
            if not fname.endswith(".webp") or fname.endswith("-sm.webp"):
                continue
            img = bpy.data.images.load(os.path.join(folder, fname))
            w, h = img.size
            img.scale(w // 2, h // 2)
            img.save_render(os.path.join(folder, fname.replace(".webp", "-sm.webp")), scene=SCENE)
            bpy.data.images.remove(img)
    log("wrote -sm variants")


if not SKIP_RENDERS or "--thumbs" in ARGV:
    make_small_variants()

log("done")
