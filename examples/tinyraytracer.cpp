/*
# tinyraytracer: understandable ray tracing in about 150 lines of C++

Original code and course by Dmitry V. Sokolov (ssloy), part of his
[computer graphics lecture series](https://github.com/ssloy/tinyrenderer/wiki).
The full written walkthrough lives in the
[project wiki](https://github.com/ssloy/tinyraytracer/wiki/Part-1:-understandable-raytracing).
This file follows that same step by step progression, mapped onto the
final source code, using the wiki's own explanations and diagrams.

What this file actually produces, after all nine core steps below, is
this scene: four shaded spheres (ivory, glass, red rubber, mirror)
sitting on a checkerboard floor:

![what this file actually renders](https://raw.githubusercontent.com/ssloy/tinyraytracer/5e0da1f09fdbc585caa16df4c7b2f527d61536ef/out.jpg)
*/

#include <tuple>
#include <vector>
#include <fstream>
#include <algorithm>
#include <cmath>

/*
## Step 1: write an image to disk

Before any tracing logic exists at all, the first milestone is simply:
allocate an array of colors (the framebuffer), fill it with something,
and write it to a file. No windowing, no keyboard or mouse handling; the
entire "UI" of this renderer is a `.ppm` file opened afterward in an
image viewer.

The wiki's very first version just fills the framebuffer with a plain
color gradient to prove the save-to-disk step works, before any actual
ray tracing exists:

![step 1: a plain gradient written to disk](https://raw.githubusercontent.com/ssloy/tinyraytracer/bd36c9857305b3cbd06f5b768bb48a92df9ae68b/out.jpg)

`vec3` below plays the role of both a 3D point or direction and an RGB
color; one small vector type does double duty for geometry and pixels.

Saving as [PPM](https://en.wikipedia.org/wiki/Netpbm_format) is
deliberate: it's the simplest image format to write by hand (a short text
header followed by raw RGB bytes), with no library required. For PNG or
JPEG output instead, a single-header library like
[stb_image_write.h](https://github.com/nothings/stb) is the usual choice.
*/
struct vec3 {
    float x=0, y=0, z=0;
    float& operator[](const int i) { return i==0 ? x : (1==i ? y : z); }
    const float& operator[](const int i) const { return i==0 ? x : (1==i ? y : z); }
    vec3 operator*(const float v) const { return {x*v, y*v, z*v}; }
    float operator*(const vec3& v) const { return x*v.x + y*v.y + z*v.z; }
    vec3 operator+(const vec3& v) const { return {x+v.x, y+v.y, z+v.z}; }
    vec3 operator-(const vec3& v) const { return {x-v.x, y-v.y, z-v.z}; }
    vec3 operator-() const { return {-x, -y, -z}; }
    float norm() const { return std::sqrt(x*x+y*y+z*z); }
    vec3 normalized() const { return (*this)*(1.f/norm()); }
};

/*
### Cross product, a small extra vector-math tool

$$
\vec{v_1} \times \vec{v_2} =
\begin{pmatrix} y_1z_2 - z_1y_2 \\ z_1x_2 - x_1z_2 \\ x_1y_2 - y_1x_2 \end{pmatrix}
$$

Not used by the main render loop below, but included alongside `vec3` as
part of the general-purpose vector toolkit (useful if you extend the
camera with a custom "up" direction, for example).
*/
vec3 cross(const vec3 v1, const vec3 v2) {
    return { v1.y*v2.z - v1.z*v2.y, v1.z*v2.x - v1.x*v2.z, v1.x*v2.y - v1.y*v2.x };
}

/*
## Materials, introduced gradually across steps 4, 5, 7, and 8

Once tracing a bare sphere works, the next question is how to shade it.
A `Material` bundles everything a surface needs for that:

| Field | Meaning |
|---|---|
| `refractive_index` | Used by Snell's law for glass-like transparency |
| `albedo[4]` | Relative weights of diffuse, specular, reflection, refraction |
| `diffuse_color` | Base RGB color |
| `specular_exponent` | Shininess: how tight the specular highlight is |

The wiki builds this up one idea at a time (plain color, then diffuse
lighting, then specular, then reflection, then refraction). In the
finished file it all collapses into these four numbers per material.
*/
struct Material {
    float refractive_index = 1;
    float albedo[4] = {2,0,0,0};
    vec3 diffuse_color = {0,0,0};
    float specular_exponent = 0;
};

/*
## Step 2: the crucial one, representing a sphere

Everything starts with the simplest non-trivial 3D shape: a sphere needs
only a center point and a radius. A `Material` field is added here so
that each sphere can look different once shading exists later on.
*/
struct Sphere {
    vec3 center;
    float radius;
    Material material;
};

/*
## Step 3: add more spheres

Going from one sphere to several requires almost no new ideas, just a
list of them, each checked in turn, keeping whichever hit is closest to
the camera. That loop lives in `scene_intersect()` further down. Here is
the wiki's result right after adding the extra spheres, still with flat,
unlit shading:

![step 3: several spheres, still unlit](https://raw.githubusercontent.com/ssloy/tinyraytracer/c19c430151cb659372b4988876173b022164e371/out.jpg)

Four materials are defined here for four spheres:

- ivory: mostly diffuse, a little specular shine
- glass: mostly refractive (`albedo[3]=0.8`), with some reflection
- red_rubber: nearly pure diffuse, dull highlight
- mirror: almost entirely reflective, with a very tight, bright
  specular highlight (`specular_exponent=1425`)

Everything is `constexpr`; the whole scene is baked in at compile time,
which is part of what keeps this program so small.
*/
constexpr Material      ivory = {1.0, {0.9, 0.5, 0.1, 0.0}, {0.4, 0.4, 0.3},   50.};
constexpr Material      glass = {1.5, {0.0, 0.9, 0.1, 0.8}, {0.6, 0.7, 0.8},  125.};
constexpr Material red_rubber = {1.0, {1.4, 0.3, 0.0, 0.0}, {0.3, 0.1, 0.1},   10.};
constexpr Material     mirror = {1.0, {0.0, 16.0, 0.8, 0.0}, {1.0, 1.0, 1.0}, 1425.};

constexpr Sphere spheres[] = {
    {{-3,    0,   -16}, 2,      ivory},
    {{-1.0, -1.5, -12}, 2,      glass},
    {{ 1.5, -0.5, -18}, 3, red_rubber},
    {{ 7,    5,   -18}, 4,     mirror}
};

/*
## Step 4: lighting

Real global illumination is hard to compute, so the wiki reaches for a
classic non-physical but visually convincing trick instead: model light
sources as simple points, and shade each surface point according to the
angle between its normal and the direction toward each light.

The intuition given is seasonal: it's cold in winter and hot in summer
because the sun's rays strike the ground at a shallower angle. The same
idea shows up here as a dot product, since for unit vectors
$\vec{L}\cdot\vec{N} = \cos\theta$ between them, which is exactly "how
directly is this point facing the light."

Adding just this diffuse term produces:

![step 4: diffuse lighting added](https://raw.githubusercontent.com/ssloy/tinyraytracer/9a728fff2bbebb1eedd86e1ac89f657d43191609/out.jpg)
*/
constexpr vec3 lights[] = {
    {-20, 20, 20},
    { 30, 50, -25},
    { 30, 20, 30}
};

/*
## Step 7: reflections

$$
\vec{R} = \vec{I} - 2(\vec{I}\cdot\vec{N})\vec{N}
$$

The wiki's punchline here is that mirror reflections take only a few
extra lines once everything else already exists: compute the reflected
direction with this formula, nudge the new ray's origin off the surface
slightly to avoid immediately re-hitting it, and recursively call the
ray-casting function again along that new direction. The same formula is
reused inside the specular-highlight term in step 5, since a highlight is
really just "how closely does the reflected light ray point back at the
camera."

Result after this step, using a recursion depth of 4:

![step 7: reflections added](https://raw.githubusercontent.com/ssloy/tinyraytracer/c80479d1d22fe98f41b584972affeb43422a23a6/out.jpg)
*/
vec3 reflect(const vec3 &I, const vec3 &N) {
    return I - N*2.f*(I*N);
}

/*
## Step 8: refractions

If reflection works, refraction turns out to be easy too: one extra
function implementing [Snell's law](https://en.wikipedia.org/wiki/Snell%27s_law),
plus a few more lines inside the main recursive function. This is what
lets the glass sphere both reflect and transmit light at once:

![step 8: refractions added, glass sphere in front](https://raw.githubusercontent.com/ssloy/tinyraytracer/b69793bf6e8be54973cad1b18185a67dbf11bad1/out.jpg)

$$
\eta_i \sin\theta_i = \eta_t \sin\theta_t
$$

Implementation notes:
- `cosi` is the cosine of the incoming angle against the surface normal.
- A negative `cosi` means the ray is exiting the material rather than
  entering it, so the normal and the two refractive indices are swapped,
  and the function recurses once to redo the math consistently.
- `k` is the value under the square root of the refraction formula. If
  it's negative, there's no real solution: this is total internal
  reflection, the same effect that makes the surface look mirror-like
  when viewed from underwater instead of letting you see through it. The
  function still needs to return something in that case, even though the
  result has no physical meaning.
*/
vec3 refract(const vec3 &I, const vec3 &N, const float eta_t, const float eta_i=1.f) { // Snell's law
    float cosi = - std::max(-1.f, std::min(1.f, I*N));
    if (cosi<0) return refract(I, -N, eta_i, eta_t); // if the ray comes from the inside the object, swap the air and the media
    float eta = eta_i / eta_t;
    float k = 1 - eta*eta*(1 - cosi*cosi);
    return k<0 ? vec3{1,0,0} : I*eta + N*(eta*cosi - std::sqrt(k)); // k<0 = total reflection, no ray to refract. I refract it anyways, this has no physical meaning
}

/*
## Step 2, continued: ray-sphere intersection

This is the one genuinely non-trivial geometric calculation in the whole
project. The wiki links to an external
[derivation](http://www.lighthouse3d.com/tutorials/maths/ray-sphere-intersection/)
and includes this diagram of the setup:

![ray-sphere intersection diagram](https://upload.wikimedia.org/wikipedia/commons/8/83/Ray_trace_diagram.svg)

1. `L` is the vector from the ray origin to the sphere center.
2. `tca` projects `L` onto the ray direction: the distance along the ray
   to the point nearest the sphere center.
3. `d2` is the squared perpendicular distance from that nearest point to
   the center (Pythagoras: $d^2 = \|L\|^2 - t_{ca}^2$). If it exceeds the
   squared radius, the ray misses the sphere entirely.
4. `thc` is the half length of the chord the ray cuts through the sphere;
   `t0` and `t1` are the entry and exit distances along the ray.

The `.001` offsets exist to avoid self-intersection artifacts: a ray
leaving a surface could otherwise immediately re-hit that same surface
because of floating-point rounding.
*/
std::tuple<bool,float> ray_sphere_intersect(const vec3 &orig, const vec3 &dir, const Sphere &s) { // ret value is a pair [intersection found, distance]
    vec3 L = s.center - orig;
    float tca = L*dir;
    float d2 = L*L - tca*tca;
    if (d2 > s.radius*s.radius) return {false, 0};
    float thc = std::sqrt(s.radius*s.radius - d2);
    float t0 = tca-thc, t1 = tca+thc;
    if (t0>.001) return {true, t0}; // offset the original point by .001 to avoid occlusion by the object itself
    if (t1>.001) return {true, t1};
    return {false, 0};
}

/*
## Step 9: beyond the spheres, finding the nearest surface overall

Spheres are the easiest nontrivial 3D shape to intersect, but they don't
have to be the only geometry in the scene. This step adds a checkerboard
floor plane (`y = -4`) alongside the spheres, checking every object the
ray could hit and keeping whichever is closest (`nearest_dist`).

The checkerboard pattern comes from a simple trick: sum the scaled,
offset integer coordinates of the hit point and look at the lowest bit
(`& 1`) to alternate between two colors, the same logic behind any
chessboard-style tiling.

The return value, a hit flag plus the hit point, surface normal, and
material, is exactly what the shading function below needs.
*/
std::tuple<bool,vec3,vec3,Material> scene_intersect(const vec3 &orig, const vec3 &dir) {
    vec3 pt, N;
    Material material;
    float nearest_dist = 1e10;
    if (std::abs(dir.y)>.001) { // intersect the ray with the checkerboard, avoid division by zero
        float d = -(orig.y+4)/dir.y; // the checkerboard plane has equation y = -4
        vec3 p = orig + dir*d;
        if (d>.001 && d<nearest_dist && std::abs(p.x)<10 && p.z<-10 && p.z>-30) {
            nearest_dist = d;
            pt = p;
            N = {0,1,0};
            material.diffuse_color = (int(.5*pt.x+1000) + int(.5*pt.z)) & 1 ? vec3{.3, .3, .3} : vec3{.3, .2, .1};
        }
    }

    for (const Sphere &s : spheres) { // intersect the ray with all spheres
        auto [intersection, d] = ray_sphere_intersect(orig, dir, s);
        if (!intersection || d > nearest_dist) continue;
        nearest_dist = d;
        pt = orig + dir*nearest_dist;
        N = (pt - s.center).normalized();
        material = s.material;
    }
    return { nearest_dist<1000, pt, N, material };
}

/*
## Steps 4 through 8, combined: `cast_ray`, the recursive heart of the tracer

This single function is where every lighting effect from the wiki gets
layered together. For a ray that hits something, it blends four
contributions, weighted by the surface material's albedo:

1. Diffuse lighting (step 4): brightness from each light scales with
   $\max(0, \vec{L}\cdot\vec{N})$, so surfaces facing a light directly are
   brightest and surfaces facing away get none. This alone gives the
   classic matte look.
2. Specular highlights (step 5): the
   [Phong reflection model](https://en.wikipedia.org/wiki/Phong_reflection_model)
   adds a shiny highlight wherever the reflected light direction nearly
   lines up with the view direction, sharpened by `specular_exponent`.
   The wiki includes this diagram of the model:

   ![Phong reflection model diagram](https://upload.wikimedia.org/wikipedia/commons/6/6b/Phong_components_version_4.png)

   Adding just this term (still without shadows or reflections) gives:

   ![step 5: specular highlights added](https://raw.githubusercontent.com/ssloy/tinyraytracer/f5ec45c2541feb86b6a30cc3bb04917d60d13e9b/out.jpg)

3. Reflection (step 7): recursively traces a mirror-reflected ray using
   the `reflect()` formula defined above.
4. Refraction (step 8): recursively traces a ray bent through the surface
   using `refract()` (Snell's law), defined above.

Recursion stops once `depth > 4`, which is what keeps light bouncing
between two mirrors from recursing forever. The wiki specifically
suggests experimenting with that cutoff to see how the image changes.

### Shadows (step 6)

Before counting a light's contribution, a shadow ray is cast from the hit
point toward that light. If it hits something closer than the light
itself, the point is considered in shadow with respect to that light and
its contribution is skipped (`continue`). The wiki notes that this whole
effect takes only a handful of lines to add:

![step 6: shadows added](https://raw.githubusercontent.com/ssloy/tinyraytracer/ef70d1356169dacb3183ad4fcb4c23f1d7003e1b/out.jpg)

### Background

A ray that hits nothing, or recursion bottoming out, returns a flat sky
color, `{0.2, 0.7, 0.8}`, instead of continuing to trace.
*/
vec3 cast_ray(const vec3 &orig, const vec3 &dir, const int depth=0) {
    auto [hit, point, N, material] = scene_intersect(orig, dir);
    if (depth>4 || !hit)
        return {0.2, 0.7, 0.8}; // background color

    vec3 reflect_dir = reflect(dir, N).normalized();
    vec3 refract_dir = refract(dir, N, material.refractive_index).normalized();
    vec3 reflect_color = cast_ray(point, reflect_dir, depth + 1);
    vec3 refract_color = cast_ray(point, refract_dir, depth + 1);

    float diffuse_light_intensity = 0, specular_light_intensity = 0;
    for (const vec3 &light : lights) { // checking if the point lies in the shadow of the light
        vec3 light_dir = (light - point).normalized();
        auto [hit, shadow_pt, trashnrm, trashmat] = scene_intersect(point, light_dir);
        if (hit && (shadow_pt-point).norm() < (light-point).norm()) continue;
        diffuse_light_intensity  += std::max(0.f, light_dir*N);
        specular_light_intensity += std::pow(std::max(0.f, -reflect(-light_dir, N)*dir), material.specular_exponent);
    }
    return material.diffuse_color * diffuse_light_intensity * material.albedo[0] +
           vec3{1., 1., 1.}*specular_light_intensity * material.albedo[1] +
           reflect_color*material.albedo[2] +
           refract_color*material.albedo[3];
}

/*
## Step 2, continued: the camera, and steps 1 and 3's render loop tying it together

The camera setup is deliberately minimal:

- fixed at the origin, `(0, 0, 0)`
- looking down the $-z$ axis
- defined by a picture width, height, and field of view angle

Here is the wiki's own diagram of the setup, viewed from above (the $y$
axis points out of the page):

![camera geometry, top-down view](https://raw.githubusercontent.com/ssloy/tinyraytracer/master/trace.png)

The screen sits conceptually at $z=-1$; the field of view determines how
wide a slice of the world that screen spans. Working through the triangle
in the diagram gives $\tan(\text{fov}/2) = (\text{screen width}/2)$ when
the screen-to-camera distance is 1, since the screen is placed exactly
one unit away. That relationship is what maps a pixel's position to a
world-space ray direction, matching the `dir_x`, `dir_y`, and `dir_z`
computation below (this version folds the aspect ratio into `dir_z`
instead of `dir_x`, but it's the same underlying idea).

Each pixel becomes one ray, `cast_ray()` is called once per ray (steps 4
through 8 handle everything about what happens after that), and the
resulting colors fill the framebuffer from step 1, which then gets
written to `out.ppm` exactly as it was back at the very first step, just
with far more interesting colors in it now.

`#pragma omp parallel for` lets each pixel be computed on a separate
thread when compiled with OpenMP support; ray tracing is "embarrassingly
parallel" since no pixel depends on any other.
*/
int main() {
    constexpr int   width  = 1024;
    constexpr int   height = 768;
    constexpr float fov    = 1.05; // 60 degrees field of view in radians
    std::vector<vec3> framebuffer(width*height);

#pragma omp parallel for
    for (int pix = 0; pix<width*height; pix++) { // actual rendering loop
        float dir_x =  (pix%width + 0.5) -  width/2.;
        float dir_y = -(pix/width + 0.5) + height/2.;    // this flips the image at the same time
        float dir_z = -height/(2.*tan(fov/2.));
        framebuffer[pix] = cast_ray(vec3{0,0,0}, vec3{dir_x, dir_y, dir_z}.normalized());
    }

    std::ofstream ofs("./out.ppm", std::ios::binary);
    ofs << "P6\n" << width << " " << height << "\n255\n";
    for (vec3 &color : framebuffer) {
        float max = std::max(1.f, std::max(color[0], std::max(color[1], color[2])));
        for (int chan : {0,1,2})
            ofs << (char)(255 * color[chan]/max);
    }
    return 0;
}

/*
---
Created with Claude and the Explicode skill. Content may not be fully
accurate but serves as an example.
*/