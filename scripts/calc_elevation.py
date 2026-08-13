#!/usr/bin/env python3
"""
Fetches elevation data for each route from the USGS National Map API and
calculates total elevation gain. Prints results and optionally updates
routes-data.json in place.

Usage:
    python3 scripts/calc_elevation.py            # print only
    python3 scripts/calc_elevation.py --update   # update routes-data.json
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / 'data' / 'routes-data.json'
SAMPLE_EVERY = 5   # query every Nth point to limit API calls
RATE_LIMIT_SLEEP = 0.25  # seconds between requests (USGS is more permissive)


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


def calc_gain(elevations):
    gain = 0
    for i in range(1, len(elevations)):
        a, b = elevations[i - 1], elevations[i]
        if a is not None and b is not None and b > a:
            gain += b - a
    return gain


def main():
    update = '--update' in sys.argv

    with open(DATA_FILE) as f:
        routes = json.load(f)

    for r in routes:
        coords = r.get('route_coordinates', [])
        sampled = coords[::SAMPLE_EVERY]
        # always include the last point
        if coords and coords[-1] != sampled[-1]:
            sampled.append(coords[-1])

        print(f"Route {r['id']}: {r['name']}")
        print(f"  {len(coords)} points -> sampling {len(sampled)} points...")

        elevs = []
        for idx, (lat, lon) in enumerate(sampled):
            e = get_elevation(lat, lon)
            elevs.append(e)
            if (idx + 1) % 20 == 0:
                print(f"  ... {idx + 1}/{len(sampled)}")
            time.sleep(RATE_LIMIT_SLEEP)

        gain_m = calc_gain(elevs)
        gain_ft = round(gain_m * 3.28084 / 10) * 10  # round to nearest 10 ft
        label = f"~{gain_ft} feet"
        print(f"  -> {label}\n")

        if update:
            r['elevation_gain'] = label

    if update:
        with open(DATA_FILE, 'w') as f:
            json.dump(routes, f, indent=2)
        print(f"Updated {DATA_FILE}")
    else:
        print("Run with --update to write results to routes-data.json")


if __name__ == '__main__':
    main()
