#!/usr/bin/env python3
"""
Run multiple vite builds with different configs and compare sizes.
Writes temp vite configs, builds, measures, restores.
"""
import gzip, json, os, shutil, subprocess, tempfile
from pathlib import Path

try:
    import brotli
    HAS_BROTLI = True
except ImportError:
    HAS_BROTLI = False

ROOT = Path(__file__).parent.parent
DIST = ROOT / "dist"
VITE_CONFIG = ROOT / "vite.config.js"

def gz(b: bytes) -> int:
    return len(gzip.compress(b, compresslevel=9))

def br(b: bytes) -> int:
    return len(brotli.compress(b)) if HAS_BROTLI else -1

def kb(n: int) -> str:
    return f"{n/1024:.2f} KB"

def measure(path: Path):
    b = path.read_bytes()
    return len(b), gz(b), br(b)

def build(config_extra: str = "", label: str = "build") -> tuple[int,int,int]:
    """Write patched vite config, build, return sizes."""
    original = VITE_CONFIG.read_text()

    patched = original + f"\n// PATCH: {label}\n" + config_extra if config_extra else original

    if config_extra:
        VITE_CONFIG.write_text(patched)

    try:
        result = subprocess.run(
            ["bun", "run", "build"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            print(f"  BUILD FAILED for {label}:")
            print(result.stderr[-500:])
            return -1, -1, -1

        out_js = DIST / "index.js"
        if not out_js.exists():
            return -1, -1, -1
        return measure(out_js)
    finally:
        if config_extra:
            VITE_CONFIG.write_text(original)

# ── Configs to test ────────────────────────────────────────────────────────────

CONFIGS: list[tuple[str, str]] = [
    ("baseline (esbuild)", ""),
]

# We'll test configs by writing complete vite.config.js variants
BASELINE_CONFIG = VITE_CONFIG.read_text()

def make_config(minifier: str = "'esbuild'", extra_esbuild: str = "", extra_build: str = "") -> str:
    cfg = BASELINE_CONFIG
    cfg = cfg.replace("minify: 'esbuild'", f"minify: {minifier}")
    if extra_esbuild:
        cfg = cfg.replace(
            "esbuild: {\n    legalComments: 'none',\n  },",
            f"esbuild: {{\n    legalComments: 'none',\n    {extra_esbuild}\n  }},"
        )
    return cfg

configs_to_test: list[tuple[str, str]] = [
    ("baseline (esbuild)", BASELINE_CONFIG),
    ("terser", BASELINE_CONFIG.replace("minify: 'esbuild'", "minify: 'terser'")),
    ("esbuild + manglePrivate", BASELINE_CONFIG.replace(
        "legalComments: 'none',",
        "legalComments: 'none',\n    minifyIdentifiers: true,"
    )),
]

print("=" * 70)
print("BUILD COMPARISON")
print("=" * 70)
print(f"\n{'Config':<30}  {'Raw':>10}  {'Gzip':>8}" + ("  {'Brotli':>8}" if HAS_BROTLI else ""))
print("-" * (54 if not HAS_BROTLI else 65))

results = {}
for label, config_text in configs_to_test:
    print(f"  Building: {label}...", flush=True)
    VITE_CONFIG.write_text(config_text)
    try:
        r = subprocess.run(["bun", "run", "build"], cwd=ROOT,
                           capture_output=True, text=True, timeout=120)
        if r.returncode != 0:
            print(f"    FAILED: {r.stderr[-200:]}")
            results[label] = (-1, -1, -1)
            continue
        raw, gz_s, br_s = measure(DIST / "index.js")
        results[label] = (raw, gz_s, br_s)
    except Exception as e:
        print(f"    ERROR: {e}")
        results[label] = (-1, -1, -1)

# Restore original
VITE_CONFIG.write_text(BASELINE_CONFIG)

base_raw, base_gz, base_br = results.get("baseline (esbuild)", (-1,-1,-1))

print()
for label, (raw, gz_s, br_s) in results.items():
    if raw == -1:
        print(f"{label:<30}  FAILED")
        continue
    d_r = f"{(raw-base_raw)/1024:+.2f}" if label != "baseline (esbuild)" else "     —"
    d_g = f"{(gz_s-base_gz)/1024:+.2f}" if label != "baseline (esbuild)" else "     —"
    row = f"{label:<30}  {kb(raw):>10}  {kb(gz_s):>8}  Δraw={d_r} KB  Δgzip={d_g} KB"
    if HAS_BROTLI and br_s != -1:
        d_b = f"{(br_s-base_br)/1024:+.2f}" if label != "baseline (esbuild)" else "—"
        row += f"  Δbrotli={d_b} KB"
    print(row)

print()
