"""Download .jsonStream files for a past session into backend/data/live_test/.

The live router's test replayer reads these files to simulate a live SignalR
stream without a real session running. See services/live_test_replayer.py.

Usage:
    python backend/scripts/download_test_session.py --year 2024 --round 1 --session R
"""

from __future__ import annotations

import argparse
import sys
import time
import urllib.request
import urllib.error
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import fastf1

BASE = "https://livetiming.formula1.com"

# Mirror of live_signalr._TOPICS — files we expect to exist on the static API.
STREAM_TOPICS = [
    "TimingData",
    "TimingAppData",
    "TimingStats",
    "DriverList",
    "RaceControlMessages",
    "TrackStatus",
    "WeatherData",
    "LapCount",
    "ExtrapolatedClock",
    "SessionInfo",
    "SessionStatus",
    "SessionData",
    "Position.z",
]

# Initial state .json files the replayer loads at t=-1 (see _SAFE_INIT_TOPICS).
INIT_TOPICS = [
    "DriverList",
    "TimingAppData",
    "WeatherData",
    "TrackStatus",
    "SessionInfo",
]


def _fetch(url: str, dest: Path) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": "f1timing-test-downloader/1.0"})
    retries = 3
    backoff = 1.0
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                dest.write_bytes(data)
                return len(data)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 0
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(backoff)
                backoff *= 2
                continue
            raise
        except urllib.error.URLError as e:
            if attempt < retries - 1:
                time.sleep(backoff)
                backoff *= 2
                continue
            raise
    return 0

def fetch_topic(base_url, out_dir, topic, ext, kind):
    url = f"{base_url}{topic}{ext}"
    dest = out_dir / f"{topic}{ext}"
    try:
        n = _fetch(url, dest)
        return topic, ext, kind, n, None
    except Exception as e:
        return topic, ext, kind, 0, e

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--round", type=int, required=True)
    parser.add_argument("--session", default="R", help="Session code: R, Q, S, SQ, FP1, FP2, FP3")
    args = parser.parse_args()

    session = fastf1.get_session(args.year, args.round, args.session)
    api_path = session.api_path  # e.g. /static/2024/2024-03-02_Bahrain_Grand_Prix/2024-03-02_Race/
    base_url = BASE + api_path

    out_dir = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "live_test"
        / f"{args.year}_{args.round}_{args.session}"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading from {base_url}")
    print(f"Saving to        {out_dir}")
    print()

    total_bytes = 0
    skipped = []
    lock = threading.Lock()

    tasks = []
    for topic in STREAM_TOPICS:
        tasks.append((base_url, out_dir, topic, ".jsonStream", "stream"))
    for topic in INIT_TOPICS:
        tasks.append((base_url, out_dir, topic, ".json", "init"))

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(fetch_topic, *task): task for task in tasks
        }
        for future in as_completed(futures):
            topic, ext, kind, n, err = future.result()
            with lock:
                if err:
                    print(f"  {topic:<22} ERROR  {err}")
                elif n == 0:
                    skipped.append(topic + ext)
                    print(f"  {topic:<22} 404")
                else:
                    total_bytes += n
                    print(f"  {topic:<22} {n / 1024:>10.1f} KB  {kind}")

    print()
    print(f"Total: {total_bytes / 1024 / 1024:.2f} MB across {len(STREAM_TOPICS) + len(INIT_TOPICS) - len(skipped)} files")
    if skipped:
        print(f"Skipped (404): {', '.join(skipped)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
