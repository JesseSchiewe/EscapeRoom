from __future__ import annotations

import argparse
import sys
import time
from typing import Any

import mido
import requests


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_number_to_note_name(note_number: int) -> str:
    if note_number < 0:
        note_number = 0
    if note_number > 127:
        note_number = 127
    note_name = NOTE_NAMES[note_number % 12]
    octave = (note_number // 12) - 1
    return f"{note_name}{octave}"


def post_note(endpoint: str, scenario_id: str, note: str, timeout_seconds: float) -> None:
    payload: dict[str, Any] = {
        "scenario_id": scenario_id,
        "event_name": "piano_note",
        "timestamp_ms": int(time.time() * 1000),
        "payload": {
            "note": note,
        },
    }
    response = requests.post(endpoint, json=payload, timeout=timeout_seconds)
    response.raise_for_status()


def choose_port(port_name: str | None) -> str:
    available_ports = mido.get_input_names()
    if not available_ports:
        raise RuntimeError("No MIDI input devices found. Check your piano USB connection.")

    if port_name:
        for name in available_ports:
            if name == port_name:
                return name
        joined = "\n".join(f"- {name}" for name in available_ports)
        raise RuntimeError(f"MIDI input port not found: {port_name}\nAvailable ports:\n{joined}")

    return available_ports[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read USB MIDI note-on events and forward them to EscapeJS /motion-events.",
    )
    parser.add_argument(
        "--endpoint",
        default="http://127.0.0.1:5000/motion-events",
        help="Motion endpoint URL (default: http://127.0.0.1:5000/motion-events)",
    )
    parser.add_argument(
        "--scenario-id",
        default="wwjd",
        help="Scenario id to target (default: wwjd)",
    )
    parser.add_argument(
        "--port",
        default=None,
        help="Exact MIDI input port name. If omitted, the first port is used.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=2.0,
        help="HTTP timeout in seconds (default: 2.0)",
    )
    parser.add_argument(
        "--list-ports",
        action="store_true",
        help="List MIDI input ports and exit.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.list_ports:
        ports = mido.get_input_names()
        if not ports:
            print("No MIDI input ports found.")
            return 1
        for port in ports:
            print(port)
        return 0

    try:
        selected_port = choose_port(args.port)
    except RuntimeError as err:
        print(str(err), file=sys.stderr)
        return 1

    print(f"Listening on MIDI input: {selected_port}")
    print(f"Posting note events to: {args.endpoint}")
    print("Press Ctrl+C to stop.")

    with mido.open_input(selected_port) as inport:
        try:
            for message in inport:
                # Only forward key presses, not releases.
                if message.type != "note_on" or getattr(message, "velocity", 0) <= 0:
                    continue

                note = midi_number_to_note_name(int(message.note))
                try:
                    post_note(args.endpoint, args.scenario_id, note, args.timeout)
                    print(f"Sent note: {note}")
                except requests.RequestException as err:
                    print(f"Failed to send note {note}: {err}", file=sys.stderr)
        except KeyboardInterrupt:
            print("\nStopping MIDI bridge.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
