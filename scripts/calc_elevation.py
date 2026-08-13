#!/usr/bin/env python3
"""
Fetches elevation data for each route from the USGS National Map API and
calculates total elevation gain. Caches raw elevation data to avoid re-fetching.

Usage:
    python3 scripts/calc_elevation.py            # fetch + print
    python3 scripts/calc_elevation.py --update   # fetch + write to routes-data.json
    python3 scripts/calc_elevation.py --cached   # recalculate from cache (no API calls)
    python3 scripts/calc_elevation.py --cached --update  # recalculate + write
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / 'data' / 'routes-data.json'
CACHE_FILE = Path(__file__).parent / 'elevation_cache.json'
SAMPLE_EVERY = 5
RATE_LIMIT_SLEEP = 0.25
NOISE_THRESHOLD_M = 3.0  # ignore elevation changes smaller than this (meters)


def get_elevation(lat, lon):
    url = (
        f"https://epqs.nationalmap.gov/v1/json"
        f"?x={lon}&y={lat}&wkid=4326&includeDate=false"
    )
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read())
        return float(data['value'])
    except Exception as e:
        print(f"    Error ({lat},{lon}): {e}")
        return None


def calc_gain(elevations, threshold_m=NOISE_THRESHOLD_M):
    """Sum uphill segments, ignoring changes smaller than threshold to filter noise."""
    gain = 0
    for i in range(1, len(elevations)):
        a, b = elevations[i - 1], elevations[i]
        if a is not None and b is not None and (b - a) > threshold_m:
            gain += b - a
    return gain


def main():
    update = '--update' in sys.argv
    use_cache = '--cached' in sys.argv

    with open(DATA_FILE) as f:
        routes = json.load(f)

    cache = {}
    if use_cache and CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            cache = json.load(f)
        print(f"Loaded cache from {CACHE_FILE}\n")

    for r in routes:
        coords = r.get('route_coordinates', [])
        sampled = coords[::SAMPLE_EVERY]
        if coords and coords[-1] != sampled[-1]:
            sampled.append(coords[-1])

        route_key = str(r['id'])
        print(f"Route {r['id']}: {r['name']}")

        if use_cache and route_key in cache:
            elevs = cache[route_key]
            print(f"  Using cached {len(elevs)} elevations")
        else:
            print(f"  {len(coords)} points -> sampling {len(sampled)} points...")
            elevs = []
            for idx, (lat, lon) in enumerate(sampled):
                e = get_elevation(lat, lon)
                elevs.append(e)
                if (idx + 1) % 20 == 0:
                    print(f"  ... {idx + 1}/{len(sampled)}")
                time.sleep(RATE_LIMIT_SLEEP)
            cache[route_key] = elevs

        gain_m = calc_gain(elevs)
        gain_ft = round(gain_m * 3.28084 / 10) * 10
        label = f"~{gain_ft} feet"
        print(f"  -> {label}\n")

        if update:
            r['elevation_gain'] = label

    # always save cache after fetching
    if not use_cache:
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f)
        print(f"Saved elevation cache to {CACHE_FILE}")

    if update:
        with open(DATA_FILE, 'w') as f:
            json.dump(routes, f, indent=2)
        print(f"Updated {DATA_FILE}")
    else:
        print("\nRun with --update to write results to routes-data.json")


if __name__ == '__main__':
    main()
