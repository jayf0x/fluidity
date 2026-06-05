#!/usr/bin/env python3
"""
Simulate multiple optimization strategies on shader source files.
Reports raw + gzip + brotli savings side-by-side for comparison.
"""
import gzip, re, subprocess
from pathlib import Path

try:
    import brotli
    HAS_BROTLI = True
except ImportError:
    HAS_BROTLI = False

ROOT = Path(__file__).parent.parent

def gz(b: bytes) -> int:
    return len(gzip.compress(b, compresslevel=9))

def br(b: bytes) -> int:
    return len(brotli.compress(b)) if HAS_BROTLI else -1

def kb(n: int) -> str:
    return f"{n/1024:.2f} KB"

# ── Shader source content ──────────────────────────────────────────────────────

glsl_src = (ROOT / "src/core/shaders.ts").read_text()
wgsl_src = (ROOT / "src/core/wgsl-shaders.ts").read_text()
combined_src = (glsl_src + wgsl_src).encode()

# ── Minification strategies ────────────────────────────────────────────────────

def extract_shader_strings(ts_src: str) -> list[str]:
    """Pull the template literal contents (between backticks)."""
    return re.findall(r'`(.*?)`', ts_src, re.DOTALL)

def strip_line_comments(shader: str) -> str:
    lines = []
    for line in shader.split('\n'):
        if '//' in line:
            # Remove // comment but keep the code before it
            code = line[:line.index('//')]
            if code.strip():
                lines.append(code.rstrip())
        else:
            lines.append(line)
    return '\n'.join(lines)

def collapse_whitespace(shader: str) -> str:
    # Collapse runs of whitespace/newlines to single space
    # But preserve at least minimal structure (newline after ;  { })
    result = re.sub(r'[ \t]+', ' ', shader)          # multiple spaces → one
    result = re.sub(r'\n\s*\n+', '\n', result)        # blank lines → one newline
    result = re.sub(r'^\s+', '', result, flags=re.M)  # leading indent
    result = re.sub(r' ?\n ?', '\n', result)           # space around newlines
    return result.strip()

def full_minify(shader: str) -> str:
    s = strip_line_comments(shader)
    s = collapse_whitespace(s)
    # Remove spaces around common operators/punctuation (safe in GLSL/WGSL)
    s = re.sub(r' ?([\+\-\*\/=<>,;:\{\}\(\)\[\]]) ?', r'\1', s)
    # Re-add space after keywords that need it
    keywords = ['void','float','vec2','vec3','vec4','int','bool','return',
                'uniform','varying','attribute','struct','let','var','fn',
                'if','else','for','precision','highp','sampler2D',
                'texture_2d','vec2f','vec3f','vec4f','f32','i32']
    for kw in keywords:
        s = re.sub(r'(?<!\w)' + re.escape(kw) + r'(?=\w)', kw + ' ', s)
    return s

def apply_to_source(ts_src: str, fn) -> str:
    """Apply fn to each template literal string in ts source."""
    def replace_shader(m):
        minified = fn(m.group(1))
        return f'`{minified}`'
    return re.sub(r'`(.*?)`', replace_shader, ts_src, flags=re.DOTALL)

# ── Baseline ───────────────────────────────────────────────────────────────────

baseline = combined_src

strategies = {
    "baseline (current)": combined_src,
    "strip // comments": apply_to_source(glsl_src, strip_line_comments).encode() +
                         apply_to_source(wgsl_src, strip_line_comments).encode(),
    "collapse whitespace": apply_to_source(glsl_src, collapse_whitespace).encode() +
                           apply_to_source(wgsl_src, collapse_whitespace).encode(),
    "comments + whitespace": apply_to_source(glsl_src, lambda s: collapse_whitespace(strip_line_comments(s))).encode() +
                              apply_to_source(wgsl_src, lambda s: collapse_whitespace(strip_line_comments(s))).encode(),
    "full minify (aggressive)": apply_to_source(glsl_src, full_minify).encode() +
                                apply_to_source(wgsl_src, full_minify).encode(),
}

print("=" * 80)
print("SHADER SOURCE OPTIMIZATION COMPARISON")
print("(Applied to shaders.ts + wgsl-shaders.ts combined)")
print("=" * 80)
print(f"\n{'Strategy':<30}  {'Raw':>10}  {'Δraw':>8}  {'Gzip':>8}  {'Δgzip':>8}" +
      ("  {'Brotli':>8}  {'Δbrotli':>9}" if HAS_BROTLI else ""))
print("-" * (80 if not HAS_BROTLI else 100))

base_raw  = len(baseline)
base_gz   = gz(baseline)
base_br   = br(baseline)

for name, data in strategies.items():
    raw_s  = len(data)
    gz_s   = gz(data)
    br_s   = br(data)
    d_raw  = raw_s - base_raw
    d_gz   = gz_s  - base_gz
    d_br   = br_s  - base_br
    sign_r = "+" if d_raw > 0 else ""
    sign_g = "+" if d_gz  > 0 else ""
    sign_b = "+" if d_br  > 0 else ""
    row = (f"{name:<30}  {kb(raw_s):>10}  {sign_r}{kb(d_raw):>7}  "
           f"{kb(gz_s):>8}  {sign_g}{kb(d_gz):>7}")
    if HAS_BROTLI:
        row += f"  {kb(br_s):>8}  {sign_b}{kb(d_br):>8}"
    print(row)

print()

# ── Also estimate bundle impact ────────────────────────────────────────────────
# The bundle = shaders + JS code. JS code doesn't change.
# Shader savings in isolation understate: repetitive shader text compresses
# better as a whole bundle. Let's load actual bundle and estimate.

dist = ROOT / "dist" / "index.js"
if dist.exists():
    bundle_raw = dist.read_bytes()
    bundle_gz  = gz(bundle_raw)

    print(f"\nCurrent bundle: {kb(len(bundle_raw))} raw | {kb(bundle_gz)} gzip")
    print("\nEstimated bundle savings from 'comments + whitespace' strategy:")

    comments_ws = strategies["comments + whitespace"]
    shader_saving_raw = base_raw - len(comments_ws)
    shader_saving_gz  = base_gz  - gz(comments_ws)

    print(f"  Raw savings (shader files only): {kb(shader_saving_raw)}")
    print(f"  Gzip savings (shader files only): {kb(shader_saving_gz)}")
    print(f"  Note: actual bundle savings differ (cross-string compression)")
    print(f"  Rough bundle gzip estimate: {kb(bundle_gz - shader_saving_gz)}")
else:
    print("\nRun `bun build` to get bundle estimates.")

print()
