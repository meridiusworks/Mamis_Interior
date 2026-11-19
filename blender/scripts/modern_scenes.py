"""
Modern studies: a contemporary villa, a 2BHK flat and an open-plan office.

This file is executed by generate_scenes.py (exec in its namespace), so it shares
the materials (M), the Piece mesh builder, the furniture library and the helpers.
Everything is built around the origin so the exported GLBs have clean coordinates.
Blender (x, y, z) maps to three.js (x, z, -y); the front of every model faces -Y.

Objects whose name starts with "Up_" (upper floor, ceiling, roof) are hidden by the
web viewer's section toggle.
"""

# ---------------------------------------------------------------------------
# Extra materials
# ---------------------------------------------------------------------------

make_mat("white_paint", "#efede7", rough=0.9)
make_mat("grey_paint", "#8d8e8a", rough=0.9)
make_mat("sage_paint", "#7d8b72", rough=0.9)
make_mat("fabric_navy", "#2f3a4f", rough=0.95)
make_mat("fabric_rust", "#a4533a", rough=0.95)
make_mat("fabric_mustard", "#c79a3b", rough=0.95)
make_mat("tile_white", "#e8e6e1", rough=0.3)
make_mat("led", "#ffffff", emit="#fff0d2", emit_strength=7.0)
make_mat("screen", "#0e1114", rough=0.2)
make_mat("screen_on", "#1b2a3a", emit="#7fb1e6", emit_strength=1.4, rough=0.2)
make_mat("rubber", "#2a2a28", rough=0.9)


def wardrobe(coll, name, loc, rot=0.0, length=2.4, height=2.4, depth=0.6, mat="oak"):
    p = Piece(name)
    n = max(2, int(length / 0.6))
    for i in range(n):
        x = -length / 2 + length * (i + 0.5) / n
        p.box((x, 0, height / 2 + 0.03), (length / n - 0.012, depth, height - 0.06), M[mat], bevel=0.004)
        p.box((x + length / n * 0.36, -depth / 2 - 0.012, 1.1), (0.014, 0.014, 0.32), M["brass"])
    p.box((0, 0, 0.015), (length, depth - 0.04, 0.03), M["charcoal"])
    return p.build(coll, loc, rot)


def tv_unit(coll, name, loc, rot=0.0, length=2.4):
    p = Piece(name)
    p.box((0, 0, 0.23), (length, 0.42, 0.4), M["walnut"], bevel=0.006)
    p.box((0, 0.19, 1.2), (length * 0.62, 0.05, 0.92), M["oak"], bevel=0.004)
    p.box((0, 0.155, 1.2), (1.45, 0.03, 0.82), M["screen"], bevel=0.003)
    p.box((-length * 0.38, 0.0, 0.5), (0.5, 0.18, 0.1), M["fabric_stone"])
    return p.build(coll, loc, rot)


def monitor(p, x, y, z, rot_z=0.0):
    """Monitor on a stand; the screen faces -Y in local space."""
    p.box((x, y, z + 0.015), (0.26, 0.2, 0.03), M["black_steel"])
    p.box((x, y + 0.04, z + 0.12), (0.04, 0.04, 0.2), M["black_steel"])
    p.box((x, y + 0.04, z + 0.3), (0.58, 0.025, 0.34), M["screen_on"], bevel=0.003)


def jali(p, x0, x1, y, z0, z1, step=0.16, mat="plaster", frame_mat="teak"):
    """Pierced lattice screen: a teak frame with a grid of slim bars."""
    p.box_minmax((x0, y - 0.05, z0), (x0 + 0.06, y + 0.05, z1), M[frame_mat])
    p.box_minmax((x1 - 0.06, y - 0.05, z0), (x1, y + 0.05, z1), M[frame_mat])
    p.box_minmax((x0, y - 0.05, z0), (x1, y + 0.05, z0 + 0.06), M[frame_mat])
    p.box_minmax((x0, y - 0.05, z1 - 0.06), (x1, y + 0.05, z1), M[frame_mat])
    x = x0 + 0.06 + step / 2
    while x < x1 - 0.06:
        p.box_minmax((x - 0.018, y - 0.025, z0 + 0.06), (x + 0.018, y + 0.025, z1 - 0.06), M[mat])
        x += step
    z = z0 + 0.06 + step / 2
    while z < z1 - 0.06:
        p.box_minmax((x0 + 0.06, y - 0.025, z - 0.018), (x1 - 0.06, y + 0.025, z + 0.018), M[mat])
        z += step


def toilet_set(coll, name, loc, rot=0.0):
    p = Piece(name)
    p.box((0, 0.12, 0.2), (0.36, 0.3, 0.4), M["ceramic_white"], bevel=0.04, seg=3)
    p.box((0, 0.3, 0.55), (0.38, 0.16, 0.5), M["ceramic_white"], bevel=0.03, seg=3)
    return p.build(coll, loc, rot)


def vanity(coll, name, loc, rot=0.0, length=1.2):
    p = Piece(name)
    p.box((0, 0, 0.38), (length, 0.5, 0.76), M["walnut"], bevel=0.005)
    p.box((0, 0, 0.78), (length + 0.03, 0.54, 0.04), M["marble"], bevel=0.003)
    p.cyl((0, -0.02, 0.81), 0.2, 0.05, M["ceramic_white"], segs=32)
    p.cyl((0, 0.2, 0.93), 0.012, 0.2, M["brass"], segs=8)
    p.box((0, 0.27, 1.45), (length - 0.1, 0.03, 0.9), M["glass"])
    return p.build(coll, loc, rot)


def workstation_bench(coll, name, loc):
    """Four desks (two facing two) with a divider, monitors and chairs. Local origin = centre."""
    p = Piece(name)
    for sy in (-1, 1):
        for sx in (-1, 1):
            cx, cy = sx * 0.78, sy * 0.42
            p.box((cx, cy, 0.735), (1.5, 0.8, 0.03), M["white_paint"], bevel=0.004)
            for lx in (-0.68, 0.68):
                p.box((cx + lx, cy, 0.36), (0.03, 0.7, 0.72), M["black_steel"])
            monitor(p, cx, cy + sy * 0.18, 0.75)
    p.box((0, 0, 0.9), (3.06, 0.03, 0.34), M["sage_paint"], bevel=0.004)
    pb = p.build(coll, loc)
    for sy in (-1, 1):
        for sx in (-1, 1):
            chair(coll, f"{name}_Chair_{sx}{sy}", (loc[0] + sx * 0.78, loc[1] + sy * 1.2, loc[2]),
                  rot=math.pi if sy < 0 else 0.0, wood="black_steel", fabric="fabric_charcoal")
    return pb


def conference_table(coll, name, loc, length=3.8, width=1.3):
    p = Piece(name)
    p.box((0, 0, 0.73), (length, width, 0.06), M["walnut"], bevel=0.01, seg=3)
    for s in (-1, 1):
        p.box((s * (length / 2 - 0.5), 0, 0.36), (0.12, width - 0.4, 0.7), M["black_steel"], bevel=0.006)
    p.box((0, 0, 0.765), (0.5, 0.35, 0.012), M["black_steel"])
    return p.build(coll, loc)


# ---------------------------------------------------------------------------
# 1. Modern villa (exported to GLB)
# ---------------------------------------------------------------------------

log("building modern villa")
MV = new_coll("Modern_Villa")
MV_HOT = new_coll("MV_Hotspots", MV)
MV_LIGHTS = new_coll("MV_RenderLights")

GZ = 0.3                 # ground-floor finished level
FZ = GZ + 0.02
G_TOP = 3.5              # underside of the first-floor slab
UZ = 3.8                 # first-floor level (top of slab)
U_TOP = 6.8              # underside of the roof slab

lawn = Piece("MV_Lawn")
lawn.cyl((0, 0, -0.02), 32, 0.04, M["grass"], segs=96)
lawn.build(MV)

plinth = Piece("MV_Plinth")
plinth.box_minmax((-10.0, -8.6, 0), (10.0, 7.6, GZ), M["paving"])
plinth.box_minmax((-10.05, -8.65, GZ - 0.06), (10.05, 7.65, GZ), M["granite_black"])
plinth.build(MV)

drive = Piece("MV_Path")
drive.box_minmax((1.0, -22.0, 0.0), (3.9, -8.6, 0.04), M["paving"])
drive.box_minmax((-18.0, -19.4, 0.0), (-6.0, -12.0, 0.03), M["paving"])        # car parking pad
drive.build(MV)

# --- Ground-floor floors and walls
gf_floor = Piece("MV_GF_Floors")
gf_floor.box_minmax((-8.5, -5.0, GZ), (7.5, 4.5, FZ), M["travertine"])
gf_floor.box_minmax((1.0, -7.4, GZ), (4.6, -5.0, FZ), M["athangudi"])                  # porch
gf_floor.box_minmax((-1.0, -4.95, FZ), (2.5, -1.0, FZ + 0.004), M["athangudi"])         # foyer inlay
gf_floor.build(MV)

gw = Piece("MV_GF_Walls")
glass_gf = Piece("MV_GF_Glass")
frames_gf = Piece("MV_GF_Frames")
wall(gw, "x", -8.5, 7.5, -5.0, -4.75, GZ, G_TOP, M["white_paint"],
     openings=[(-7.6, 0.0, GZ, 3.4), (2.0, 3.7, GZ, 3.0), (4.7, 7.0, GZ + 0.6, 3.2)])
glazing(glass_gf, frames_gf, "x", -7.6, 0.0, -4.875, GZ, 3.4, mullions=4, transom=[2.5], frame=0.06, frame_mat=M["black_steel"])
glazing(glass_gf, frames_gf, "x", 4.7, 7.0, -4.875, GZ + 0.6, 3.2, mullions=1, frame=0.06, frame_mat=M["black_steel"])
wall(gw, "y", -5.0, 4.5, 7.25, 7.5, GZ, G_TOP, M["white_paint"], openings=[(-3.4, -0.6, GZ + 0.6, 3.2), (1.6, 3.6, GZ + 0.6, 3.2)])
glazing(glass_gf, frames_gf, "y", -3.4, -0.6, 7.375, GZ + 0.6, 3.2, mullions=2, frame=0.06, frame_mat=M["black_steel"])
glazing(glass_gf, frames_gf, "y", 1.6, 3.6, 7.375, GZ + 0.6, 3.2, mullions=1, frame=0.06, frame_mat=M["black_steel"])
wall(gw, "y", -5.0, 4.5, -8.5, -8.25, GZ, G_TOP, M["white_paint"], openings=[(-3.8, -0.8, GZ + 0.1, 3.4), (1.2, 3.4, GZ + 0.6, 3.0)])
glazing(glass_gf, frames_gf, "y", -3.8, -0.8, -8.375, GZ + 0.1, 3.4, mullions=2, frame=0.06, frame_mat=M["black_steel"])
glazing(glass_gf, frames_gf, "y", 1.2, 3.4, -8.375, GZ + 0.6, 3.0, mullions=1, frame=0.06, frame_mat=M["black_steel"])
wall(gw, "x", -8.5, 7.5, 4.25, 4.5, GZ, G_TOP, M["white_paint"], openings=[(-7.2, -3.2, GZ + 0.6, 3.2), (3.8, 6.8, GZ + 0.6, 3.2)])
glazing(glass_gf, frames_gf, "x", -7.2, -3.2, 4.375, GZ + 0.6, 3.2, mullions=2, frame=0.06, frame_mat=M["black_steel"])
glazing(glass_gf, frames_gf, "x", 3.8, 6.8, 4.375, GZ + 0.6, 3.2, mullions=2, frame=0.06, frame_mat=M["black_steel"])
wall(gw, "y", 2.4, 4.25, 2.44, 2.56, GZ, G_TOP, M["sage_paint"])                       # kitchen / stair divider
gw.box_minmax((3.7, -5.0, GZ), (7.5, -4.74, GZ + 0.6), M["laterite"])                   # stone plinth under the dining window
gw.build(MV)
glass_gf.build(MV, shadow=False)
frames_gf.build(MV)

# entrance door and canopy
door = Piece("MV_Door")
door.box_minmax((2.05, -5.0, FZ), (3.65, -4.9, 2.95), M["teak"], bevel=0.006)
door.box_minmax((3.3, -5.04, 1.0), (3.34, -5.0, 2.0), M["brass"])
door.box_minmax((2.0, -5.0, 2.95), (3.7, -4.9, 3.0), M["black_steel"])
door.build(MV)
canopy = Piece("MV_Canopy")
canopy.box_minmax((1.0, -7.6, 3.3), (4.7, -5.8, 3.5), M["white_paint"], bevel=0.01)
for x in (1.15, 4.55):
    canopy.cyl((x, -7.45, 1.8), 0.05, 3.0 - 0.3 + 0.1, M["black_steel"], segs=16)
canopy.build(MV)
screen = Piece("MV_Jali")
jali(screen, 4.9, 7.3, -5.45, GZ, 3.4)
screen.build(MV)
bench = Piece("MV_PorchBench")
bench.box_minmax((-1.6, -5.5, FZ + 0.4), (0.6, -5.05, FZ + 0.46), M["teak"], bevel=0.005)
bench.box_minmax((-1.5, -5.45, FZ), (-1.42, -5.1, FZ + 0.4), M["black_steel"])
bench.box_minmax((0.42, -5.45, FZ), (0.5, -5.1, FZ + 0.4), M["black_steel"])
bench.build(MV)

# --- Ground-floor furniture
rug(MV, "MV_Rug", (-4.2, 0.4, FZ), w=4.4, d=3.4, mat="fabric_stone")
sofa(MV, "MV_Sofa", (-4.2, 2.7, FZ), rot=0.0, length=3.4, fabric="fabric_navy", base="walnut")
for i, (x, y, r) in enumerate([(-6.9, 0.4, -75), (-1.6, 0.4, 75)]):
    lounge_chair(MV, f"MV_Chair_{i}", (x, y, FZ), rot=math.radians(r), fabric="fabric_mustard", wood="walnut")
coffee_table(MV, "MV_CoffeeTable", (-4.2, 0.5, FZ), r=0.62, top="marble", base="travertine")
side_table(MV, "MV_SideTable", (-6.3, 3.0, FZ))
floor_lamp(MV, "MV_FloorLamp", (-6.6, 3.7, FZ))
artwork(MV, "MV_Art", (-4.2, 4.2, 1.9), w=2.2, h=1.3)
plant(MV, "MV_Plant_A", (-8.0, -4.4, FZ), h=1.9, pot="concrete")
plant(MV, "MV_Plant_B", (-0.4, -4.4, FZ), h=1.5, pot="concrete")
tulsi = Piece("MV_Console")
tulsi.box_minmax((-8.25, 0.9, FZ + 0.74), (-7.85, 2.5, FZ + 0.78), M["teak"], bevel=0.004)
tulsi.box_minmax((-8.25, 0.9, FZ), (-7.85, 2.5, FZ + 0.74), M["walnut"], bevel=0.004)
tulsi.build(MV)
kuthuvilakku(MV, "MV_Lamp", (-8.05, 1.7, FZ + 0.78), h=0.6)
dining_table(MV, "MV_DiningTable", (5.2, -2.5, FZ), length=2.8, width=1.1, top="oak", legs="black_steel")
for i, x in enumerate((4.4, 5.2, 6.0)):
    chair(MV, f"MV_DChair_N{i}", (x, -1.8, FZ), rot=0.0, wood="oak", fabric="fabric_rust")
    chair(MV, f"MV_DChair_S{i}", (x, -3.2, FZ), rot=math.pi, wood="oak", fabric="fabric_rust")
linear_pendant(MV, "MV_DiningPendant", (5.2, -2.5, G_TOP), length=2.4, drop=1.4)
cabinetry(MV, "MV_Kitchen", (5.15, 3.94, FZ), rot=0.0, length=4.6, splash="ceramic", wood="oak", top="granite_black")
kitchen_island(MV, "MV_Island", (5.2, 1.9, FZ), length=2.6, width=1.0, top="marble", wood="walnut")
for i, x in enumerate((4.4, 5.2, 6.0)):
    stool(MV, f"MV_Stool_{i}", (x, 1.15, FZ), seat="leather")
    pendant(MV, f"MV_KPendant_{i}", (x, 1.9, G_TOP), drop=1.5, r=0.15, shade="brass")

# --- Staircase (oak treads with a steel rail)
STEPS = 17
RISE = (UZ - FZ) / STEPS
RUN = 0.27
stair = Piece("MV_Stair")
for i in range(STEPS):
    y0 = -0.5 + i * RUN
    stair.box_minmax((0.3, y0, FZ), (1.5, y0 + RUN, FZ + (i + 1) * RISE), M["oak"], bevel=0.004)
ang = math.atan2(RISE, RUN)
ln = math.hypot(STEPS * RISE, STEPS * RUN)
stair.box((1.46, -0.5 + STEPS * RUN / 2, FZ + STEPS * RISE / 2 + 0.95), (0.04, ln, 0.04), M["black_steel"], rot=(ang, 0, 0))
for i in range(0, STEPS, 2):
    stair.box_minmax((1.44, -0.5 + i * RUN, FZ + (i + 1) * RISE), (1.48, -0.5 + i * RUN + 0.04, FZ + (i + 1) * RISE + 0.95), M["black_steel"])
stair.build(MV)

# --- First-floor slab (with the stair opening), walls, roof. All names start with "Up_".
slab = Piece("Up_Slab")
HX0, HX1, HY0, HY1 = 0.2, 1.6, -0.6, 4.1
for lo, hi in [((-8.75, -5.25), (HX0, 4.75)), ((HX1, -5.25), (7.75, 4.75)), ((HX0, -5.25), (HX1, HY0)), ((HX0, HY1), (HX1, 4.75))]:
    slab.box_minmax((lo[0], lo[1], G_TOP), (hi[0], hi[1], UZ), M["concrete"])
slab.box_minmax((-5.5, -5.85, G_TOP), (7.5, -5.25, UZ), M["concrete"])
slab.box_minmax((-8.8, -5.3, UZ - 0.06), (7.8, 4.8, UZ - 0.0), M["white_paint"])
slab.build(MV)

uw = Piece("Up_Walls")
uf = Piece("Up_Facade")
glass_up = Piece("Up_Glass")
frames_up = Piece("Up_Frames")
wall(uf, "x", -5.5, 7.5, -5.8, -5.55, UZ, U_TOP, M["cladding"], openings=[(-4.9, -0.8, UZ + 0.7, U_TOP - 0.5), (2.9, 7.0, UZ + 0.7, U_TOP - 0.5)])
glazing(glass_up, frames_up, "x", -4.9, -0.8, -5.675, UZ + 0.7, U_TOP - 0.5, mullions=2, frame=0.05, frame_mat=M["black_steel"])
glazing(glass_up, frames_up, "x", 2.9, 7.0, -5.675, UZ + 0.7, U_TOP - 0.5, mullions=2, frame=0.05, frame_mat=M["black_steel"])
wall(uw, "y", -5.55, 4.5, 7.25, 7.5, UZ, U_TOP, M["white_paint"], openings=[(-3.8, -1.2, UZ + 0.7, U_TOP - 0.5), (1.4, 3.6, UZ + 0.7, U_TOP - 0.5)])
glazing(glass_up, frames_up, "y", -3.8, -1.2, 7.375, UZ + 0.7, U_TOP - 0.5, mullions=2, frame=0.05, frame_mat=M["black_steel"])
glazing(glass_up, frames_up, "y", 1.4, 3.6, 7.375, UZ + 0.7, U_TOP - 0.5, mullions=1, frame=0.05, frame_mat=M["black_steel"])
wall(uw, "y", -5.55, 4.5, -5.5, -5.25, UZ, U_TOP, M["white_paint"], openings=[(-3.4, -0.6, UZ + 0.7, U_TOP - 0.5)])
glazing(glass_up, frames_up, "y", -3.4, -0.6, -5.375, UZ + 0.7, U_TOP - 0.5, mullions=2, frame=0.05, frame_mat=M["black_steel"])
wall(uw, "x", -5.5, 7.5, 4.25, 4.5, UZ, U_TOP, M["white_paint"], openings=[(-4.6, -1.0, UZ + 0.7, U_TOP - 0.5), (3.2, 6.8, UZ + 0.7, U_TOP - 0.5)])
glazing(glass_up, frames_up, "x", -4.6, -1.0, 4.375, UZ + 0.7, U_TOP - 0.5, mullions=2, frame=0.05, frame_mat=M["black_steel"])
glazing(glass_up, frames_up, "x", 3.2, 6.8, 4.375, UZ + 0.7, U_TOP - 0.5, mullions=2, frame=0.05, frame_mat=M["black_steel"])
wall(uw, "y", -5.55, 4.25, -0.06, 0.06, UZ, U_TOP, M["white_paint"], openings=[(-3.6, -2.5, UZ, UZ + 2.2)])
wall(uw, "y", -5.55, 4.25, 2.14, 2.26, UZ, U_TOP, M["white_paint"], openings=[(-3.6, -2.5, UZ, UZ + 2.2)])
uw.box_minmax((-5.5, -5.55, UZ), (-5.25, 4.25, U_TOP), M["white_paint"])         # west wall
uw.build(MV)
uf.build(MV)
glass_up.build(MV, shadow=False)
frames_up.build(MV)
rail = Piece("Up_StairRail")
for lo, hi in [((HX0, HY0 - 0.02), (HX1, HY0 + 0.02)), ((HX0 - 0.02, HY0), (HX0 + 0.02, HY1 - 1.0))]:
    rail.box_minmax((lo[0], lo[1], UZ + 0.95), (hi[0], hi[1], UZ + 1.0), M["black_steel"])
    for t in range(0, 6):
        fx = lo[0] + (hi[0] - lo[0]) * t / 5
        fy = lo[1] + (hi[1] - lo[1]) * t / 5
        rail.box_minmax((fx - 0.012, fy - 0.012, UZ), (fx + 0.012, fy + 0.012, UZ + 0.95), M["black_steel"])
rail.build(MV)
roof = Piece("Up_Roof")
roof.box_minmax((-6.2, -6.5, U_TOP), (8.2, 5.2, U_TOP + 0.3), M["white_paint"], bevel=0.01)
roof.box_minmax((-6.2, -6.5, U_TOP + 0.3), (8.2, -6.35, U_TOP + 0.55), M["white_paint"])
roof.box_minmax((8.05, -6.5, U_TOP + 0.3), (8.2, 5.2, U_TOP + 0.55), M["white_paint"])
roof.box_minmax((-6.2, 5.05, U_TOP + 0.3), (8.2, 5.2, U_TOP + 0.55), M["white_paint"])
roof.box_minmax((-6.2, -6.5, U_TOP + 0.3), (-6.05, 5.2, U_TOP + 0.55), M["white_paint"])
roof.box_minmax((3.0, 0.5, U_TOP + 0.3), (5.6, 3.5, U_TOP + 0.38), M["black_steel"])      # solar panels
roof.cyl((-3.5, 2.4, U_TOP + 0.75), 0.55, 0.9, M["black_steel"], segs=24)                  # water tank
roof.build(MV)

# --- First-floor furniture
bed(MV, "Up_MasterBed", (-2.75, 3.25, UZ), rot=0.0, width=1.8, length=2.1)
rug(MV, "Up_MasterRug", (-2.75, 1.4, UZ), w=3.0, d=2.4, mat="fabric_stone")
wardrobe(MV, "Up_MasterWardrobe", (-5.0, -1.0, UZ), rot=math.pi / 2, length=3.2, height=2.5, mat="walnut")
lounge_chair(MV, "Up_ReadingChair", (-3.0, -4.5, UZ), rot=math.radians(-20), fabric="fabric_mustard", wood="walnut")
plant(MV, "Up_MasterPlant", (-1.4, -4.8, UZ), h=1.4, pot="concrete")
artwork(MV, "Up_MasterArt", (-2.75, 4.2, UZ + 1.9), w=1.6, h=1.0, palette=("art_stone", "art_olive", "art_ink"))
bed(MV, "Up_Bed2", (5.0, 3.1, UZ), rot=0.0, width=1.5, length=2.0)
wardrobe(MV, "Up_Wardrobe2", (6.95, -0.6, UZ), rot=-math.pi / 2, length=2.4, height=2.4, mat="oak")
desk(MV, "Up_Desk", (5.0, -5.0, UZ), rot=math.pi, length=1.8)
chair(MV, "Up_DeskChair", (5.0, -4.2, UZ), rot=0.0, wood="black_steel", fabric="fabric_charcoal")
rug(MV, "Up_Rug2", (5.0, 0.8, UZ), w=2.6, d=2.0, mat="fabric_stone")
plant(MV, "Up_LandingPlant", (1.1, -5.0, UZ), h=1.6, pot="concrete")

# --- Garden: coconut palms, plants, a pool and loungers
for i, (x, y, h, lean) in enumerate([(-14, -9, 9.5, (1.0, 0.3)), (-13, 5, 8.6, (-0.8, 0.4)), (-17, -1, 10.0, (0.6, -0.6)),
                                     (13.5, 9.5, 9.0, (0.9, 0.2)), (17.5, -6, 8.8, (-1.0, 0.1)), (9.5, -13, 8.2, (0.5, 0.8)),
                                     (-9.5, 9.0, 8.4, (0.2, -0.8))]):
    coconut_tree(MV, f"MV_Coconut_{i}", (x, y, 0), h=h, lean=lean)
for i, (x, y) in enumerate([(-9.2, -7.4), (9.0, -7.4), (8.8, 6.6), (-9.2, 6.6)]):
    plant(MV, f"MV_PorchPlant_{i}", (x, y, GZ), h=1.7, pot="concrete" if i % 2 else "copper")
for i, (x, y) in enumerate([(-6.0, -13.0), (-2.0, 9.0), (5.0, 10.0)]):
    banana_plant(MV, f"MV_Banana_{i}", (x, y, 0), h=2.6)
pool = Piece("MV_Pool")
pool.box_minmax((9.0, -4.6, -0.3), (16.8, 0.8, -0.28), M["pool_liner"])
pool.box_minmax((9.0, -4.6, -0.28), (16.8, 0.8, 0.045), M["water"])
for lo, hi in [((8.6, -5.0), (17.2, -4.6)), ((8.6, 0.8), (17.2, 1.2)), ((8.6, -4.6), (9.0, 0.8)), ((16.8, -4.6), (17.2, 0.8))]:
    pool.box_minmax((lo[0], lo[1], 0.0), (hi[0], hi[1], 0.06), M["travertine"])
pool.build(MV, shadow=False)
lounger(MV, "MV_Lounger_A", (12.0, 2.4, 0.0), rot=math.pi / 2)
lounger(MV, "MV_Lounger_B", (13.6, 2.4, 0.0), rot=math.pi / 2)
bnd = Piece("MV_Boundary")
for lo, hi in [((-18, -19.8), (-2.4, -19.5)), ((2.4, -19.8), (18, -19.5)), ((-18, -19.8), (-17.7, 12)), ((17.7, -19.8), (18, 12)), ((-18, 11.7), (18, 12))]:
    bnd.box_minmax((lo[0], lo[1], 0), (hi[0], hi[1], 1.7), M["white_paint"])
    bnd.box_minmax((lo[0] - 0.04, lo[1] - 0.04, 1.7), (hi[0] + 0.04, hi[1] + 0.04, 1.78), M["granite_black"])
for sx in (-2.6, 2.6):
    bnd.box((sx, -19.65, 1.0), (0.5, 0.5, 2.0), M["laterite"], bevel=0.01)
bnd.box_minmax((-2.2, -19.7, 0.0), (2.2, -19.6, 1.8), M["teak"])
bnd.build(MV)

# hotspot markers (targets for the viewer's camera moves)
for hid, loc in [("Facade", (-1.0, -5.8, 5.4)), ("Entrance", (2.9, -6.2, 1.9)), ("Living", (-4.2, 0.6, 1.5)),
                 ("Kitchen", (5.2, 2.2, 1.5)), ("Master", (-2.75, 2.2, 5.0)), ("Pool", (13.0, -2.0, 0.6)),
                 ("Roof", (2.0, 0.0, 7.1))]:
    add_empty(MV_HOT, f"Hotspot_{hid}", loc)

for i, (x, y, z, e) in enumerate([(-4.2, 0.5, 3.2, 700), (5.2, -1.0, 3.2, 600), (-2.7, 1.5, UZ + 2.6, 450), (5.0, 0.8, UZ + 2.6, 400)]):
    add_light(MV_LIGHTS, f"MV_Light_{i}", "POINT", (x, y, z), e, color="#ffc58a", size=0.4)
add_light(MV_LIGHTS, "MV_Porch", "AREA", (2.9, -6.4, 3.2), 120, color="#ffb870", size=2.0, size_y=1.0)
MV_LIGHTS.hide_render = True

# ---------------------------------------------------------------------------
# 2. Modern 2BHK flat (cutaway; exported to GLB)
# ---------------------------------------------------------------------------

log("building modern flat")
MF = new_coll("Modern_Flat")
MF_HOT = new_coll("MF_Hotspots", MF)
MF_CEIL = new_coll("MF_Ceiling", MF)
FH = 3.0                          # clear height
FW, FD = 13.0, 9.0               # clear plan x, y
CUT = 1.1                         # the front wall is cut low so the model can be seen into

base = Piece("MF_Base")
base.box_minmax((-1.6, -1.8, -0.5), (FW + 1.6, FD + 1.6, 0.0), M["concrete"])
base.build(MF)

ff = Piece("MF_Floors")
ff.box_minmax((0, 0, 0), (FW, FD, 0.02), M["oak"])                                  # living + dining + bedrooms
ff.box_minmax((5.46, 0, 0.02), (7.54, 3.2, 0.024), M["athangudi"])                 # foyer
ff.box_minmax((5.46, 3.2, 0.0), (7.54, FD, 0.024), M["ceramic"])                   # kitchen
ff.box_minmax((11.2, 0, 0.02), (FW, 2.6, 0.026), M["ceramic"])                     # bathroom
ff.build(MF)

mw = Piece("MF_Walls")
mg = Piece("MF_Glass")
mfr = Piece("MF_Frames")
T = 0.23
wall(mw, "x", -T, FW + T, -T, 0.0, 0, CUT, M["white_paint"], openings=[(5.9, 7.1, 0, CUT)])     # cut front wall
mw.box_minmax((-T, -T, CUT), (FW + T, 0.0, CUT + 0.03), M["black_steel"])
wall(mw, "y", -T, FD + T, -T, 0.0, 0, FH, M["white_paint"], openings=[(6.0, 8.0, 0.9, 2.5)])    # left
wall(mw, "y", -T, FD + T, FW, FW + T, 0, FH, M["white_paint"], openings=[(0.8, 3.4, 0.9, 2.6), (5.8, 8.3, 0.9, 2.6)])   # right
wall(mw, "x", -T, FW + T, FD, FD + T, 0, FH, M["white_paint"], openings=[(0.6, 4.8, 0.9, 2.6), (8.2, 12.6, 0.9, 2.6)])   # back
glazing(mg, mfr, "y", 6.0, 8.0, -T / 2, 0.9, 2.5, mullions=1, frame=0.05, frame_mat=M["black_steel"])
glazing(mg, mfr, "y", 0.8, 3.4, FW + T / 2, 0.9, 2.6, mullions=2, frame=0.05, frame_mat=M["black_steel"])
glazing(mg, mfr, "y", 5.8, 8.3, FW + T / 2, 0.9, 2.6, mullions=2, frame=0.05, frame_mat=M["black_steel"])
glazing(mg, mfr, "x", 0.6, 4.8, FD + T / 2, 0.9, 2.6, mullions=3, frame=0.05, frame_mat=M["black_steel"])
glazing(mg, mfr, "x", 8.2, 12.6, FD + T / 2, 0.9, 2.6, mullions=3, frame=0.05, frame_mat=M["black_steel"])
P = 0.06
wall(mw, "y", 0, FD, 5.4 - P, 5.4 + P, 0, FH, M["white_paint"], openings=[(1.0, 3.2, 0, 2.3), (6.0, 8.2, 0, 2.2)])          # living/dining | middle
wall(mw, "y", 0, FD, 7.6 - P, 7.6 + P, 0, FH, M["white_paint"], openings=[(3.0, 4.0, 0, 2.1), (5.3, 6.3, 0, 2.1)])         # middle | bedrooms
wall(mw, "x", 7.66, FW, 4.8 - P, 4.8 + P, 0, FH, M["white_paint"])                                                       # master | bedroom 2
wall(mw, "y", 0, 2.6, 11.2 - P, 11.2 + P, 0, FH, M["white_paint"])                                                        # master | bath
wall(mw, "x", 11.2, FW, 2.6 - P, 2.6 + P, 0, FH, M["white_paint"], openings=[(11.5, 12.4, 0, 2.1)])                      # bath front
wall(mw, "x", 5.46, 7.54, 3.2 - P, 3.2 + P, 0, FH, M["white_paint"], openings=[(5.9, 6.9, 0, 2.2)])                       # foyer | kitchen
mw.build(MF)
mg.build(MF, shadow=False)
mfr.build(MF)

accent = Piece("MF_TeakPanel")
accent.box_minmax((0.0, 0.9, 0.02), (0.07, 4.1, 2.6), M["teak"])                     # TV wall panel
accent.box_minmax((FW - 0.07, 0.0, 0.02), (FW, 4.8, 2.5), M["sage_paint"])           # headboard wall
accent.box_minmax((0.0, 5.2, 0.02), (0.05, 8.8, 0.9), M["tile_white"])
accent.build(MF)

# living
rug(MF, "MF_Rug", (2.6, 2.5, 0.02), w=3.2, d=3.6, mat="fabric_stone")
tv_unit(MF, "MF_TVUnit", (0.32, 2.5, 0.02), rot=math.pi / 2, length=2.8)
sofa(MF, "MF_Sofa", (4.3, 2.5, 0.02), rot=-math.pi / 2, length=2.8, fabric="fabric_navy", base="walnut")
coffee_table(MF, "MF_CoffeeTable", (2.4, 2.5, 0.02), r=0.55, top="marble", base="travertine")
lounge_chair(MF, "MF_Chair_A", (2.4, 0.8, 0.02), rot=math.pi, fabric="fabric_mustard", wood="walnut")
lounge_chair(MF, "MF_Chair_B", (2.4, 4.2, 0.02), rot=0.0, fabric="fabric_mustard", wood="walnut")
floor_lamp(MF, "MF_FloorLamp", (4.7, 0.7, 0.02))
plant(MF, "MF_Plant_A", (0.6, 0.6, 0.02), h=1.7, pot="concrete")
artwork(MF, "MF_Art", (4.95, 2.5, 1.7), rot=-math.pi / 2, w=1.8, h=1.1)
# dining
dining_table(MF, "MF_DiningTable", (2.7, 7.2, 0.02), length=2.0, width=0.95, top="oak", legs="black_steel")
for i, x in enumerate((2.1, 3.3)):
    chair(MF, f"MF_DChair_N{i}", (x, 7.95, 0.02), rot=0.0, wood="oak", fabric="fabric_rust")
    chair(MF, f"MF_DChair_S{i}", (x, 6.45, 0.02), rot=math.pi, wood="oak", fabric="fabric_rust")
sideboard = Piece("MF_Sideboard")
sideboard.box_minmax((4.55, 6.2, 0.02), (5.3, 8.4, 0.85), M["walnut"], bevel=0.005)
sideboard.box_minmax((4.55, 6.2, 0.85), (5.3, 8.4, 0.89), M["marble"])
sideboard.build(MF)
linear_pendant(MF_CEIL, "Up_MF_DiningPendant", (2.7, 7.2, FH), length=1.8, drop=1.2)
# foyer + pooja
pooja = Piece("MF_Pooja")
pooja.box_minmax((7.2, 0.7, 0.02), (7.54, 2.1, 0.9), M["teak"], bevel=0.005)
pooja.box_minmax((7.2, 0.7, 0.9), (7.54, 2.1, 1.0), M["granite_black"])
pooja.box_minmax((7.3, 0.8, 1.0), (7.54, 2.0, 1.9), M["teak"], bevel=0.004)
pooja.box_minmax((7.42, 0.9, 1.15), (7.54, 1.9, 1.75), M["art_red"])
pooja.build(MF)
kuthuvilakku(MF, "MF_Vilakku", (7.35, 1.4, 1.0), h=0.45)
shoe = Piece("MF_ShoeUnit")
shoe.box_minmax((5.5, 0.2, 0.02), (5.9, 1.6, 1.1), M["oak"], bevel=0.004)
shoe.box_minmax((5.5, 0.2, 1.1), (5.9, 1.6, 1.14), M["marble"])
shoe.build(MF)
# kitchen
cabinetry(MF, "MF_Kitchen", (6.5, 8.69, 0.02), rot=0.0, length=2.0, height=2.4, splash="ceramic", wood="walnut", top="granite_black")
kit_side = Piece("MF_KitchenSide")
kit_side.box_minmax((5.5, 3.5, 0.02), (6.1, 8.2, 0.9), M["oak"], bevel=0.004)
kit_side.box_minmax((5.46, 3.5, 0.9), (6.12, 8.2, 0.94), M["granite_black"])
kit_side.box_minmax((5.5, 3.5, 1.5), (5.9, 8.2, 2.3), M["oak"], bevel=0.004)
kit_side.build(MF)
vessels = Piece("MF_Vessels")
brass_vessels(vessels, 5.8, 5.0, 0.94, count=4, seed=3)
vessels.build(MF)
# master bedroom + bath
bed(MF, "MF_MasterBed", (9.5, 3.5, 0.02), rot=0.0, width=1.6, length=2.1)
wardrobe(MF, "MF_MasterWardrobe", (7.97, 1.5, 0.02), rot=math.pi / 2, length=2.4, height=2.5, mat="walnut")
rug(MF, "MF_MasterRug", (9.5, 1.9, 0.02), w=2.6, d=2.0, mat="fabric_stone")
lounge_chair(MF, "MF_MasterChair", (10.4, 0.9, 0.02), rot=math.radians(150), fabric="fabric_stone", wood="walnut")
toilet_set(MF, "MF_WC", (12.5, 2.2, 0.024), rot=math.pi)
vanity(MF, "MF_Vanity", (11.7, 0.35, 0.024), rot=0.0, length=1.0)
shower = Piece("MF_Shower")
shower.box_minmax((12.3, 0.1, 0.024), (12.9, 0.7, 0.07), M["tile_white"])
shower.box_minmax((12.3, 0.7, 0.0), (12.33, 1.7, 2.0), M["glass"])
shower.box_minmax((12.3, 1.7, 0.0), (12.9, 1.73, 2.0), M["glass"])
shower.build(MF)
# bedroom 2 / study
bed(MF, "MF_Bed2", (10.4, 7.8, 0.02), rot=0.0, width=1.5, length=2.0)
wardrobe(MF, "MF_Wardrobe2", (7.97, 7.9, 0.02), rot=math.pi / 2, length=1.5, height=2.4, mat="oak")
desk(MF, "MF_Desk", (12.6, 6.0, 0.02), rot=-math.pi / 2, length=1.5)
chair(MF, "MF_DeskChair", (11.8, 6.0, 0.02), rot=math.pi / 2, wood="black_steel", fabric="fabric_charcoal")
plant(MF, "MF_Plant_B", (12.5, 5.3, 0.02), h=1.4, pot="concrete")
# ceiling (hidden by the section toggle)
fceil = Piece("Up_MF_Ceiling")
fceil.box_minmax((-T, -T, FH), (FW + T, FD + T, FH + 0.2), M["white_paint"])
fceil.build(MF_CEIL)
for hid, loc in [("Living", (2.6, 2.5, 0.9)), ("Dining", (2.7, 7.2, 0.9)), ("Kitchen", (6.5, 7.8, 1.0)),
                 ("Pooja", (7.4, 1.4, 1.4)), ("Master", (9.5, 3.0, 0.8)), ("Study", (11.5, 6.4, 0.9))]:
    add_empty(MF_HOT, f"Hotspot_{hid}", loc)
MF_L = new_coll("MF_Lights", MF)
add_light(MF_L, "MF_Fill", "AREA", (FW / 2, FD / 2, FH - 0.2), 900, size=8.0, size_y=5.0)

# ---------------------------------------------------------------------------
# 3. Modern open-plan office (cutaway; exported to GLB)
# ---------------------------------------------------------------------------

log("building modern office")
MO = new_coll("Modern_Office")
MO_HOT = new_coll("MO_Hotspots", MO)
MO_CEIL = new_coll("MO_Ceiling", MO)
OW, OD, OH = 20.0, 11.0, 3.2

obase = Piece("MO_Base")
obase.box_minmax((-1.6, -1.8, -0.5), (OW + 1.6, OD + 1.6, 0.0), M["concrete"])
obase.build(MO)
ofl = Piece("MO_Floors")
ofl.box_minmax((0, 0, 0), (OW, OD, 0.02), M["polished_concrete"])
ofl.box_minmax((0, 0, 0.02), (6.5, 4.6, 0.024), M["oak"])                               # reception
ofl.box_minmax((6.5, 7.6, 0.02), (13.2, OD, 0.024), M["oak"])                           # lounge
ofl.box_minmax((13.2, 7.6, 0.02), (OW, OD, 0.024), M["ceramic"])                         # pantry
ofl.build(MO)
ow = Piece("MO_Walls")
og = Piece("MO_Glass")
ofr = Piece("MO_Frames")
wall(ow, "x", -T, OW + T, -T, 0.0, 0, CUT, M["white_paint"])
ow.box_minmax((-T, -T, CUT), (OW + T, 0.0, CUT + 0.03), M["black_steel"])
wall(ow, "y", -T, OD + T, -T, 0.0, 0, OH, M["white_paint"], openings=[(1.2, 3.4, 0.9, 2.6)])
ow.box_minmax((-T, -T, 0), (0.0, 0.0, OH), M["white_paint"])
wall(ow, "y", -T, OD + T, OW, OW + T, 0, OH, M["white_paint"], openings=[(1.0, 5.0, 0.9, 2.7), (7.0, 10.0, 0.9, 2.7)])
wall(ow, "x", -T, OW + T, OD, OD + T, 0, OH, M["white_paint"], openings=[(0.6, 19.4, 0.3, OH - 0.2)])
glazing(og, ofr, "y", 1.2, 3.4, -T / 2, 0.9, 2.6, mullions=2, frame=0.05, frame_mat=M["black_steel"])
glazing(og, ofr, "y", 1.0, 5.0, OW + T / 2, 0.9, 2.7, mullions=3, frame=0.05, frame_mat=M["black_steel"])
glazing(og, ofr, "y", 7.0, 10.0, OW + T / 2, 0.9, 2.7, mullions=3, frame=0.05, frame_mat=M["black_steel"])
glazing(og, ofr, "x", 0.6, 19.4, OD + T / 2, 0.3, OH - 0.2, mullions=11, frame=0.06, frame_mat=M["black_steel"])
ow.build(MO)
og.build(MO, shadow=False)
ofr.build(MO)
# reception: slatted teak feature wall, desk, waiting sofa
slats = Piece("MO_SlatWall")
slats.box_minmax((1.0, 3.5, 0.02), (5.6, 3.62, 2.7), M["charcoal"])
x = 1.05
while x < 5.6:
    slats.box_minmax((x, 3.44, 0.02), (x + 0.07, 3.5, 2.7), M["teak"])
    x += 0.13
slats.box_minmax((2.4, 3.4, 1.6), (4.2, 3.44, 1.92), M["brass"])
slats.build(MO)
reception_desk(MO, "MO_Reception", (3.3, 1.9, 0.02), rot=0.0, length=3.2)
sofa(MO, "MO_WaitSofa", (0.75, 2.2, 0.02), rot=math.pi / 2, length=2.2, fabric="fabric_navy", base="walnut")
coffee_table(MO, "MO_WaitTable", (2.0, 2.2, 0.02), r=0.4, top="marble", base="travertine")
plant(MO, "MO_Plant_R", (5.7, 0.7, 0.02), h=1.9, pot="concrete")
for i, x in enumerate((2.3, 3.3, 4.3)):
    pendant(MO_CEIL, f"Up_MO_RecPendant_{i}", (x, 1.9, OH), drop=1.9, r=0.18, shade="brass")
# workstations
for i, (x, y) in enumerate([(9.8, 2.2), (15.4, 2.2), (9.8, 5.4), (15.4, 5.4)]):
    workstation_bench(MO, f"MO_Bench_{i}", (x, y, 0.02))
cab = Piece("MO_Storage")
cab.box_minmax((18.2, 0.4, 0.02), (19.8, 0.95, 1.2), M["oak"], bevel=0.004)
cab.box_minmax((18.2, 0.4, 1.2), (19.8, 0.95, 1.23), M["white_paint"])
cab.build(MO)
# meeting room (glass box)
gl = Piece("MO_MeetGlass")
mf_ = Piece("MO_MeetFrames")
glazing(gl, mf_, "x", 0.2, 6.4, 5.4, 0.02, 2.6, mullions=2, frame=0.04, frame_mat=M["black_steel"])
glazing(gl, mf_, "y", 5.4, 10.8, 6.4, 0.02, 2.6, mullions=2, frame=0.04, frame_mat=M["black_steel"])
gl.build(MO, shadow=False)
mf_.build(MO)
conference_table(MO, "MO_ConfTable", (3.3, 8.2, 0.02), length=3.8, width=1.3)
for i in range(4):
    x = 1.8 + i * 1.0
    chair(MO, f"MO_ConfChair_S{i}", (x + 0.5, 7.35, 0.02), rot=math.pi, wood="black_steel", fabric="fabric_charcoal")
    chair(MO, f"MO_ConfChair_N{i}", (x + 0.5, 9.05, 0.02), rot=0.0, wood="black_steel", fabric="fabric_charcoal")
screen_w = Piece("MO_ConfScreen")
screen_w.box_minmax((1.4, 10.72, 0.8), (5.2, 10.78, 2.2), M["screen_on"], bevel=0.004)
screen_w.build(MO)
linear_pendant(MO_CEIL, "Up_MO_ConfPendant", (3.3, 8.2, OH), length=3.0, drop=1.6)
# lounge with oonjal
rug(MO, "MO_LoungeRug", (9.8, 9.2, 0.02), w=4.2, d=2.8, mat="fabric_stone")
sofa(MO, "MO_LoungeSofa", (9.8, 10.2, 0.02), rot=0.0, length=3.0, fabric="fabric_rust", base="walnut")
lounge_chair(MO, "MO_LoungeChair_A", (8.2, 8.6, 0.02), rot=math.radians(-60), fabric="fabric_mustard", wood="walnut")
lounge_chair(MO, "MO_LoungeChair_B", (11.4, 8.6, 0.02), rot=math.radians(60), fabric="fabric_mustard", wood="walnut")
coffee_table(MO, "MO_LoungeTable", (9.8, 9.0, 0.02), r=0.5, top="marble", base="travertine")
oonjal(MO, "MO_Oonjal", (12.3, 10.0, 0.02), rot=0.0, hang=OH - 0.1)
shelving(MO, "MO_Library", (7.3, 10.8, 0.02), rot=math.pi, length=1.6, height=2.4, wood="walnut")
plant(MO, "MO_Plant_L", (6.9, 7.9, 0.02), h=1.9, pot="copper")
# pantry
cabinetry(MO, "MO_Pantry", (16.6, 10.69, 0.02), rot=0.0, length=5.0, height=2.5, splash="ceramic", wood="oak", top="granite_black")
kitchen_island(MO, "MO_PantryIsland", (16.6, 8.7, 0.02), length=2.8, width=1.0, top="marble", wood="walnut")
for i, x in enumerate((15.6, 16.6, 17.6)):
    stool(MO, f"MO_PantryStool_{i}", (x, 7.9, 0.02), seat="leather")
oceil = Piece("Up_MO_Ceiling")
oceil.box_minmax((-T, -T, OH), (OW + T, OD + T, OH + 0.2), M["white_paint"])
oceil.build(MO_CEIL)
for hid, loc in [("Reception", (3.3, 2.4, 1.2)), ("Workspace", (12.6, 3.8, 1.0)), ("Meeting", (3.3, 8.2, 1.0)),
                 ("Lounge", (10.0, 9.2, 0.9)), ("Pantry", (16.6, 9.0, 1.1))]:
    add_empty(MO_HOT, f"Hotspot_{hid}", loc)
MO_L = new_coll("MO_Lights", MO)
add_light(MO_L, "MO_Fill", "AREA", (OW / 2, OD / 2, OH - 0.2), 1400, size=14.0, size_y=7.0)
