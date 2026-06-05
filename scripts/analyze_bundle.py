#!/usr/bin/env python3
"""Analyze current dist/index.js — shader vs JS bytes, compression ratios."""
import gzip, re, sys
from pathlib import Path

try:
    import brotli
    HAS_BROTLI = True
except ImportError:
    HAS_BROTLI = False

ROOT = Path(__file__).parent.parent
dist = ROOT / "dist" / "index.js"

if not dist.exists():
    print("dist/index.js not found — run `bun build` first")
    sys.exit(1)

raw = dist.read_bytes()
raw_str = raw.decode()

def gzip_size(b: bytes) -> int:
    return len(gzip.compress(b, compresslevel=9))

def brotli_size(b: bytes) -> int:
    return len(brotli.compress(b)) if HAS_BROTLI else -1

def fmt(n: int) -> str:
    return f"{n:>8,} B  ({n/1024:.1f} KB)"

print("=" * 60)
print("BUNDLE ANALYSIS")
print("=" * 60)

total = len(raw)
gz    = gzip_size(raw)
br    = brotli_size(raw)

print(f"\nTotal raw :  {fmt(total)}")
print(f"Gzip -9   :  {fmt(gz)}")
if HAS_BROTLI:
    print(f"Brotli    :  {fmt(br)}")

# --- Find shader strings in bundle ---
# Shaders appear as string literals containing GLSL/WGSL keywords
glsl_pattern = re.compile(r'(?:precision highp float|@vertex fn|@fragment fn|void main\s*\(\s*\))[^`"\']{10,}?(?=`|"|\')', re.DOTALL)

# Simpler: find all string content between escaped-newline sequences
# The bundle uses regular strings (esbuild converts template literals)
shader_keywords = [
    'precision highp float',
    '@vertex fn', '@fragment fn',
    'textureSample', 'texture2D',
    'gl_FragColor', 'gl_Position',
    'varying vec2', 'uniform sampler',
    'struct VSOut', 'struct U {',
]

# Find shader-heavy sections by splitting on string boundaries
# Count bytes that are inside shader strings vs not
shader_bytes = 0
in_string = False
string_char = None
buf = []

# Rough heuristic: find contiguous regions with shader keywords
# Better: use regex to find quoted/backtick strings containing shader keywords
# esbuild converts template literals to regular strings
string_re = re.compile(r'"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\'' , re.DOTALL)

shader_content_total = 0
non_shader_strings    = 0
shader_strings        = []

for m in string_re.finditer(raw_str):
    content = m.group(1) or m.group(2) or ''
    has_shader = any(kw in content for kw in shader_keywords)
    if has_shader:
        shader_content_total += len(content)
        shader_strings.append(content)
    else:
        non_shader_strings += len(content)

js_code_bytes = total - shader_content_total

print(f"\n--- Content breakdown (raw) ---")
print(f"Shader strings  : {fmt(shader_content_total)}  ({shader_content_total/total*100:.1f}%)")
print(f"JS/other        : {fmt(js_code_bytes)}           ({js_code_bytes/total*100:.1f}%)")

# Shader string compression
if shader_strings:
    all_shader_text = "\n".join(shader_strings).encode()
    shader_gz = gzip_size(all_shader_text)
    print(f"\nShader text gzip: {fmt(shader_gz)}")
    print(f"Shader ratio    : {shader_gz/len(all_shader_text)*100:.1f}% (lower=more compressible)")

# --- Count whitespace waste in shaders ---
ws_bytes = 0
comment_bytes = 0
for s in shader_strings:
    # Count leading whitespace per line
    for line in s.split('\\n'):
        stripped = line.lstrip(' ')
        ws_bytes += len(line) - len(stripped)
    # Count // comments
    for line in s.split('\\n'):
        if '//' in line:
            idx = line.index('//')
            comment_bytes += len(line) - idx

print(f"\n--- Waste in shader strings ---")
print(f"Leading whitespace : {ws_bytes:,} B")
print(f"Comment lines      : {comment_bytes:,} B")
print(f"Total waste est.   : {ws_bytes + comment_bytes:,} B  ({(ws_bytes+comment_bytes)/total*100:.1f}% of bundle)")
print()
