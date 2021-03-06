#version 410 core

#define MAX_LIGHTS 100

in vec3 ray_tp;
in vec3 ray_tv;

uniform mat4 worldToScreen;
uniform mat4 transform;

uniform vec3 lightPos[MAX_LIGHTS];
uniform vec3 lightColor[MAX_LIGHTS];
uniform int lightNum;

uniform float time;

out vec4 frag_color;

const int MARCH_MAX = 128;
const float MARCH_MIN_DIST = 0.0f;
const float MARCH_MAX_DIST = 40.0f;
const float EPSILON = 0.001f;

const vec4 materials[2] = vec4[](
    vec4(0.0), // Null Color
    vec4(0.2, 0.0, 1.0, 1.0) // Deep Purple
);
const float PI = 3.14159;

vec2 fold(vec2 p, float rad){
    vec2 n = vec2(cos(-rad), sin(-rad));
    p -= 2.0 * min(0.0, dot(p,n)) * n;
    return p;
}

vec3 tri_fold(vec3 pt) {
    pt.xy = fold(pt.xy, PI / 6.0 - cos(time * 0.4) / 2.0);
    pt.xy = fold(pt.xy, -PI / 3.0);
    pt.yz = fold(pt.yz, -PI / 6.0 + sin(time * 0.4) / 4.0);
    pt.yz = fold(pt.yz, PI / 3.0);
    return pt;
}

vec3 tri_curve(vec3 pt)
{
    for (int i = 0; i < 8; i++) {
        pt *= 2.0;
        pt.x -= 2.6;
        pt = tri_fold(pt);
    }
    return pt;
}

float ifs(vec3 p){
    p = tri_curve(p);
    return (length(p * 0.004) - 0.015);
}

// Distance field representing our scene.
float scene(vec3 p) {
    // Scale down 30% and translate 1.0 on x to center in box
    return ifs((p + vec3(1.0, 0.0, 0.0)) * 1.3) / 1.3;
}


float ray_march(vec3 ro, vec3 rv, out int steps) {
    float dist1 = dot(rv, ro);
    float discrim = dist1 * dist1 - dot(ro, ro) + 1;

    if (discrim < 0.0)
        discard;
    discrim = sqrt(discrim);
    float dist2 = -dist1 - discrim;
    dist1 = -dist1 + discrim;

    float depth = max(min(dist1, dist2), 0.0);
    float max_depth = max(dist1, dist2);
    if (max_depth < 0.0)
        discard;

    for (int i = 0; i < MARCH_MAX; ++i)
    {
        float min_distance = scene(ro + rv * depth);
        depth += min_distance;
        if (min_distance < EPSILON || depth >= max_depth) {
            steps = i;
            break;
        }
    }
    if (depth > max_depth)
        discard;
    return depth;
}

/* Lighting */

// 1 for less accurate but faster normal, 0 for accurate but slower version.

#if 1

vec3 get_normal(vec3 p) {
    float ref = scene(p);
    return normalize(vec3(
        scene(vec3(p.x + EPSILON, p.y, p.z)) - ref,
        scene(vec3(p.x, p.y + EPSILON, p.z)) - ref,
        scene(vec3(p.x, p.y, p.z + EPSILON)) - ref
    ));
}

#else

vec3 get_normal(vec3 p) {
    return normalize(vec3(
        scene(vec3(p.x + EPSILON, p.y, p.z)) - scene(vec3(p.x - EPSILON, p.y, p.z)),
        scene(vec3(p.x, p.y + EPSILON, p.z)) - scene(vec3(p.x, p.y - EPSILON, p.z)),
        scene(vec3(p.x, p.y, p.z  + EPSILON)) - scene(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

#endif

float ambient_occulsion(vec3 normal, vec3 pos, int steps)
{
    float x = 0.0;
    x += 0.1 - scene(pos + normal * 0.1);
    x += 0.2 - scene(pos + normal * 0.2);
    x += 0.3 - scene(pos + normal * 0.3);
    float t = (MARCH_MAX - (pow(steps, 1.4))) / MARCH_MAX;
    return mix(1.0 - x, t, 0.5);
}

vec3 phong(vec3 normal, vec3 material_color, vec3 cam_dir, vec3 light_normal, vec3 light_color, float light_strength)
{
    float distance2 = length(light_normal);
    distance2 *= distance2;

    light_normal = normalize(light_normal);

    float diffuse = dot(normal, light_normal);

    vec3 reflected_light_dir = normalize(reflect(light_normal, normal));

    float specular = pow(clamp(dot(reflected_light_dir, cam_dir), 0.0, 1.0), 10.0);

    vec3 diffuse_color = material_color * max(diffuse, 0.02);
    vec3 specular_color = light_color * specular;

    return (diffuse_color + specular_color) * light_strength / distance2;
}

float soft_shadow(vec3 pos, vec3 light_normal, float softness)
{
    float res = 1.0;
    int _;
    light_normal = normalize(light_normal);
    for (float depth = EPSILON * 2.0; depth < 20.0;)
    {
        float min_distance = scene(pos + light_normal * depth);
        if (min_distance < EPSILON / 2.0)
            return 0.002;
        res = min(res, softness * min_distance / depth);
        depth += min_distance;
    }
    return res;
}

void shader(vec3 ro, vec3 rv)
{
    int steps;
    float dist = ray_march(ro, rv, steps);

    vec3 pos = ro + rv * dist;

    vec3 normal = get_normal(pos);

    vec4 object_color = vec4(0.2, 0.0, 1.0, 1.0);

    vec3 light_normal = vec3(0.0, 5.0, 0.0) - pos; 

    vec3 color = phong(
        normal, // object normal
        object_color.xyz,
        rv, // camera direction
        light_normal, // light normal
        vec3(1.0, 1.0, 0.8), // light Color
        40.0 // Light strength
    );

    color *= ambient_occulsion(normal, pos, steps);
    color *= soft_shadow(pos, light_normal, 4.0);
    frag_color = vec4(pow(color, vec3(0.4545)), object_color.w);
}

void main()
{
    shader(ray_tp, normalize(ray_tv));
}