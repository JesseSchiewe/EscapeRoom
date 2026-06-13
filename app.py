from __future__ import annotations

from datetime import datetime, timezone
import os
from typing import Any

from collections import defaultdict
from flask import Flask, jsonify, render_template, request, session

SCENARIOS: dict[str, dict[str, Any]] = {
    "wwjd": {
        "id": "wwjd",
        "title": "WWJD - Why Would Jesse Depart?",
        "description": "Jesse is missing. Nobody misses him, but you paid good money for this escape room, so I guess you can try to find him. Good luck!",
        "difficulty": "Hard",
        "time_limit_seconds": 3600,
        "base_score": 15000,
        "shared_state": True,
        "unlock_groups": [
            {
                "id": "kitchen",
                "name": "Kitchen",
                "lock_ids": ["riddle-me-this", "stoppers", "drink-up"],
                "completion_clue": "The kitchen set is complete. Go find a box in the TV stand drawer.",
            },
            {
                "id": "detective",
                "name": "Detective",
                "lock_ids": ["alpha-omega", "fashion", "heard-that", "that-tracks"],
                "completion_clue": "Detective work complete. Go to the office; it is now unlocked.",
            },
            {
                "id": "office",
                "name": "Office",
                "lock_ids": ["cubers"],
            },
            {
                "id": "spells-1",
                "name": "Spells",
                "lock_ids": ["s1"],
            },
            {
                "id": "spells-2",
                "name": "Spells",
                "lock_ids": ["s2"],
            },
            {
                "id": "spells-3",
                "name": "Spells",
                "lock_ids": ["s3"],
            },
            {
                "id": "spells-4",
                "name": "Spells",
                "lock_ids": ["s4"],
            },
            {
                "id": "finale",
                "name": "Finale",
                "lock_ids": ["strike"],
            },
        ],
        "locks": [
            {
                "id": "riddle-me-this",
                "name": "Riddle Me This",
                "prompt": "Enter the 4-digit code.",
                "code": "2023",
                "input_length": 4,
                "clue": "Kitchen puzzle solved.",
                "unlock_message": "Nice solve.",
            },
            {
                "id": "stoppers",
                "name": "Stoppers",
                "prompt": "Enter the 4-letter code.",
                "code": "WINE",
                "input_length": 4,
                "clue": "Kitchen puzzle solved.",
                "unlock_message": "Nice solve.",
            },
            {
                "id": "drink-up",
                "name": "Drink Up!",
                "prompt": "Enter the 4-digit code.",
                "code": "1324",
                "input_length": 4,
                "clue": "Kitchen puzzle solved.",
                "unlock_message": "Nice solve.",
            },
            {
                "id": "alpha-omega",
                "name": "Alpha Omega",
                "prompt": "Enter the code.",
                "code": "scrubs",
                "input_length": 6,
                "clue": "Detective puzzle solved.",
                "unlock_message": "Clue connected.",
            },
            {
                "id": "fashion",
                "name": "Fashion",
                "prompt": "Enter the 4-letter code.",
                "code": "SPIN",
                "input_length": 4,
                "clue": "Detective puzzle solved.",
                "unlock_message": "Clue connected.",
            },
            {
                "id": "heard-that",
                "name": "Heard That",
                "prompt": "Enter the 4-letter code.",
                "code": "POOR",
                "input_length": 4,
                "clue": "Detective puzzle solved.",
                "unlock_message": "Clue connected.",
            },
            {
                "id": "that-tracks",
                "name": "That Tracks",
                "prompt": "Enter the 5-letter code.",
                "code": "STARS",
                "input_length": 5,
                "clue": "Detective puzzle solved.",
                "unlock_message": "Clue connected.",
            },
            {
                "id": "cubers",
                "name": "Cubers",
                "prompt": "Enter the 4-letter code.",
                "code": "TUBE",
                "input_length": 4,
                "clue": "Great cubing, now check the scanner...",
                "unlock_message": "Great cubing, now check the scanner...",
            },
            {
                "id": "s1",
                "name": "S1",
                "prompt": "Too large to fit through the keyhole? Great things sometimes must become small.",
                "input_type": "spell",
                "spell": "reducio",
                "clue": "Too large to fit through the keyhole? Great things sometimes must become small.",
                "image_url": "/static/images/SpellMovements.png",
                "unlock_message": "Spell accepted.",
            },
            {
                "id": "s2",
                "name": "S2",
                "prompt": "A charging foe need not be defeated. Simply stop it in its tracks.",
                "input_type": "spell",
                "spell": "stupefy",
                "clue": "A charging foe need not be defeated. Simply stop it in its tracks.",
                "image_url": "/static/images/SpellMovements.png",
                "unlock_message": "Spell accepted.",
            },
            {
                "id": "s3",
                "name": "S3",
                "prompt": "Strength remains, magic remains, but one thing must leave its master's hand.",
                "input_type": "spell",
                "spell": "expelliarmus",
                "clue": "Strength remains, magic remains, but one thing must leave its master's hand.",
                "image_url": "/static/images/SpellMovements.png",
                "unlock_message": "Spell accepted.",
            },
            {
                "id": "s4",
                "name": "S4",
                "prompt": "It is so far, but you need it near. Cast the spell to make it appear.",
                "input_type": "spell",
                "spell": "accio",
                "clue": "It is so far, but you need it near. Cast the spell to make it appear.",
                "image_url": "/static/images/SpellMovements.png",
                "unlock_message": "Spell accepted.",
            },
            {
                "id": "strike",
                "name": "Strike",
                "prompt": "Jesse never liked to dance. He would just stand awkwardly in front of a window striking what I like to call an 'x' pose.",
                "input_type": "pose",
                "pose_name": "x pose",
                "clue": "Jesse never liked to dance. He would just stand awkwardly in front of a window striking what I like to call an 'x' pose.",
                "unlock_message": "Wow, you are quite the dancer!",
            },
        ],
    },
    "midnight-lab": {
        "id": "midnight-lab",
        "title": "Midnight Lab",
        "description": "You are trapped in a private chemistry lab after hours. Crack each lock before security arrives.",
        "difficulty": "Medium",
        "time_limit_seconds": 1800,
        "base_score": 10000,
        "locks": [
            {
                "id": "door-panel",
                "name": "Main Door Panel",
                "prompt": "A smudged sticky note reads: 'Pi without decimals.' Enter a 4-digit code.",
                "code": "3141",
                "input_length": 4,
                "clue": "The first code came from a famous math constant.",
                "hint_after_failures": 2,
                "hint_text": "Try the first four digits of pi.",
                "unlock_message": "Door panel accepted. A drawer pops open with a brass key.",
            },
            {
                "id": "specimen-safe",
                "name": "Specimen Safe",
                "prompt": "A lock dial says: 'Atomic number of Carbon + Neon = ____'. Enter a 2-digit code.",
                "code": "16",
                "input_length": 2,
                "clue": "The safe opens with a hiss and reveals a UV flashlight.",
                "hint_after_failures": 2,
                "hint_text": "Carbon is 6, Neon is 10.",
                "unlock_message": "Safe unlocked. The UV flashlight reveals a hidden exit map.",
            },
            {
                "id": "exit-gate",
                "name": "Emergency Exit Gate",
                "prompt": "The map shows cardinal directions in order: North, East, South, West. Convert to keypad digits.",
                "code": "2684",
                "input_length": 4,
                "clue": "Final gate opens and the alarm silences. You escaped Midnight Lab.",
                "hint_after_failures": 3,
                "hint_text": "On a keypad, N/E/S/W correspond to up/right/down/left.",
                "unlock_message": "Exit gate unlocked. Fresh air and freedom.",
            },
        ],
    },
    "clocktower-heist": {
        "id": "clocktower-heist",
        "title": "Clocktower Heist",
        "description": "Retrieve the stolen key from an ancient clocktower by solving timed mechanical locks.",
        "difficulty": "Hard",
        "time_limit_seconds": 2400,
        "base_score": 12000,
        "locks": [
            {
                "id": "gear-lock",
                "name": "Gear Room Lock",
                "prompt": "A brass plate reads: 'Quarter past six'. Enter as a 4-digit time.",
                "code": "0615",
                "input_length": 4,
                "clue": "The gears align, revealing a pendulum token.",
                "hint_after_failures": 2,
                "hint_text": "Use HHMM with leading zero if needed.",
                "unlock_message": "Gear lock clicks open. You hear the tower mechanisms sync.",
            },
            {
                "id": "belfry-box",
                "name": "Belfry Puzzle Box",
                "prompt": "Count the bell strikes at noon and midnight combined.",
                "code": "24",
                "input_length": 2,
                "clue": "The token fits into a hidden slot behind the bell.",
                "hint_after_failures": 2,
                "hint_text": "Noon is 12 strikes and midnight is 12 strikes.",
                "unlock_message": "Puzzle box opens with a metallic chirp.",
            },
            {
                "id": "vault-door",
                "name": "Clocktower Vault Door",
                "prompt": "The inscription says: 'Hours in 3 days'. Enter a 2-digit code.",
                "code": "72",
                "input_length": 2,
                "clue": "Vault opens. The stolen key rests on velvet cloth.",
                "hint_after_failures": 3,
                "hint_text": "One day has 24 hours.",
                "unlock_message": "Vault door unlocked. Mission complete.",
            },
        ],
    },
    "bunny-hoppers": {

        "id": "bunny-hoppers",
        "title": "Bunny Hoppers",
        "description": "Oh no!!! I am HippityHop, and someone stole all of my eggs!\nPLEASE help me find all 7 eggs and return them to me using this basket\nto save the day and become my hero! I don't know where to start, but I\nremember hearing music from the other room.",
        "difficulty": "Easy",
        "time_limit_seconds": 2700,
        "base_score": 7000,
        "locks": [
            {
                "id": "egg-1",
                "name": "Egg 1 – Music",
                "prompt": "I remember hearing music before my eggs were stolen. Perhaps it holds the answer?",
                "sounds": ["F4", "A3", "C4", "E4"],
                "code": "FACE",
                "input_length": 4,
                "clue": "The notes spell out the word 'FACE'.",
                "hint_after_failures": 2,
                "hint_text": "Think about the musical notes on the staff.",
                "unlock_message": "You found the first egg!",
            },
            {
                "id": "egg-2",
                "name": "Egg 2 – Kitchen",
                "prompt": "When the kitchen gets dirty, I must do some cleaning.\nI must wash pots and pans until they are gleaming!\nBut then I must find a good place to dry them\noh where could I find such a useful type of item?\n\nMaybe I could find something to attract the next clue?",
                "code": "SEEK",
                "input_length": 4,
                "clue": "The letters spell out the word 'SEEK'.",
                "hint_after_failures": 2,
                "hint_text": "Think about what you need to do to find the next clue.",
                "unlock_message": "You found the second egg!",
            },
            {
                "id": "egg-3",
                "name": "Egg 3 – PR",
                "prompt": "I like to play games, that much is a fact, there is one in particular that makes me say \"Kwak\"!\nBut when I play this game, my preference is thus:\n\nRoxy, Cap'n, Skully, Hook.",
                "code": "7214",
                "input_length": 4,
                "clue": "The numbers correspond to the value of the characters.",
                "hint_after_failures": 2,
                "hint_text": "Think about the order of the characters' initials.",
                "unlock_message": "You found the third egg!",
            },
            {
                "id": "egg-4",
                "name": "Egg 4 – Pigs",
                "prompt": "TAKE SHELTER!!! The forecast said there would be strong winds coming from the west in the town of pigs, but the building material was affected differently.\nWhile any brick houses and the pigs themselves are not affected by the wind, stick houses would be moved once and straw houses would move double.\nAny exposed pigs would be eaten by the big bad wolf!\nI wonder how many pigs will survive, how many the wolf will eat, what was the total number of pigs, and how many houses are left on solid ground",
                "code": "2352",
                "input_length": 4,
                "clue": "The numbers correspond to the number of pigs after the winds move the houses.",
                "hint_after_failures": 2,
                "hint_text": "Think about what will happen after the winds blow.",
                "unlock_message": "You found the fourth egg!",
            },
            {
                "id": "egg-5",
                "name": "Egg 5 – Placeholder",
                "prompt": "I like to read books\nThat is just how it goes\nBut where did I stop reading?\nFor PETE's sake, who knows?",
                "code": "CATZ",
                "input_length": 4,
                "clue": "The letters spell out the name 'PETE'.",
                "hint_after_failures": 2,
                "hint_text": "Think about the name mentioned in the poem.",
                "unlock_message": "You found the fifth egg!",
            },
            {
                "id": "egg-6",
                "name": "Egg 6 – Amazing",
                "prompt": "Perhaps this will give you something fun to do.\nAt the end of it all, you might find a clue!",
                "image_url": "/static/images/Maze1.png",
                "code": "LNJY",
                "input_length": 4,
                "clue": "The solution to the maze contains the letters for the code.",
                "hint_after_failures": 2,
                "hint_text": "Solve the maze to find the code.",
                "unlock_message": "You found the sixth egg!",
            },
            {
                "id": "egg-7",
                "name": "Egg 7 – Tied",
                "prompt": "Sometimes I am leashed and fairly restricted,\nI am unable to reach some of the items depicted.\nBut I can always take joy in accessing one\nand that item can be a whole lot of fun.",
                "code": "BUZZ",
                "input_length": 4,
                "clue": "The stuffy can only reach one of the toys. What is it?",
                "hint_after_failures": 2,
                "hint_text": "What is still accessible to the stuffed animal even when it's tied up?",
                "unlock_message": "You found the seventh egg!",
            },
            {
                "id": "FINAL",
                "name": "Final Stage – Return the Basket",
                "prompt": "Now return my eggs to the place you departed, \nYou will have to go back to where you _____!",
                "code": "STARTED",
                "input_length": 6,
                "clue": "Fill in the blank. What rhymes with 'departed' and describes how the beginning where you met HippityHop?",
                "hint_after_failures": 2,
                "hint_text": "Think about the beginning of your journey.",
                "unlock_message": "You returned all of the eggs, you are my HERO!",
            },
        ],
    },
}

SCENARIO_ORDER = ["wwjd", "bunny-hoppers", "midnight-lab", "clocktower-heist"]

LEADERBOARD: dict[str, list] = defaultdict(list)
ROOM_STATES: dict[str, dict[str, Any]] = {}


def create_app() -> Flask:
    app = Flask(__name__)
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "escapejs-dev-secret")

    @app.route("/")
    def index() -> str:
        return render_template("index.html")

    @app.get("/api/scenarios")
    def list_scenarios():
        scenarios = []
        for scenario_id in SCENARIO_ORDER:
            scenario = SCENARIOS.get(scenario_id)
            if not scenario:
                continue
            scenarios.append(
                {
                    "id": scenario["id"],
                    "title": scenario["title"],
                    "description": scenario["description"],
                    "difficulty": scenario["difficulty"],
                    "total_locks": len(scenario["locks"]),
                }
            )
        return jsonify({"scenarios": scenarios})

    @app.post("/motion-events")
    def motion_events():
        body = request.get_json(silent=True)
        if not isinstance(body, dict):
            return jsonify({"error": "A JSON object body is required."}), 400

        validation_error = _validate_motion_event(body)
        if validation_error:
            return jsonify({"error": validation_error}), 400

        app.logger.info(
            "Motion event received",
            extra={
                "event_name": body["event_name"],
                "timestamp_ms": body["timestamp_ms"],
                "payload": body["payload"],
            },
        )
        _process_motion_event(body)
        return ("", 204)

    @app.post("/api/scenarios/<scenario_id>/start")
    def start_scenario(scenario_id: str):
        scenario = SCENARIOS.get(scenario_id)
        if not scenario:
            return jsonify({"error": "Scenario not found."}), 404

        _init_state(scenario_id)
        return jsonify(_build_state_payload(scenario_id, scenario))

    @app.get("/api/scenarios/<scenario_id>/state")
    def get_state(scenario_id: str):
        scenario = SCENARIOS.get(scenario_id)
        if not scenario:
            return jsonify({"error": "Scenario not found."}), 404

        if not _get_state(scenario_id):
            _init_state(scenario_id)
        return jsonify(_build_state_payload(scenario_id, scenario))

    @app.post("/api/scenarios/<scenario_id>/unlock")
    def unlock(scenario_id: str):
        scenario = SCENARIOS.get(scenario_id)
        if not scenario:
            return jsonify({"error": "Scenario not found."}), 404

        if not _get_state(scenario_id):
            _init_state(scenario_id)

        payload = request.get_json(silent=True) or {}
        lock_id = str(payload.get("lock_id", "")).strip()
        code = str(payload.get("code", "")).strip()

        if not lock_id or not code:
            return jsonify({"error": "Both lock_id and code are required."}), 400

        state = _get_state(scenario_id)
        assert state is not None

        lock = _find_lock(scenario, lock_id)
        if not lock:
            return jsonify({"error": "Lock not found."}), 404

        if lock_id in state["unlocked"]:
            return jsonify(
                {
                    "message": "This lock is already unlocked.",
                    "state": _build_state_payload(scenario_id, scenario),
                }
            )

        active_lock_ids = set(_active_lock_ids(scenario, state))
        if lock_id not in active_lock_ids:
            return jsonify(
                {
                    "error": "This lock is not available yet. Complete all locks in the current stage first.",
                    "state": _build_state_payload(scenario_id, scenario),
                }
            ), 400

        if _lock_input_type(lock) != "code":
            return jsonify(
                {
                    "error": "This lock is cannot be unlocked with a code.",
                    "state": _build_state_payload(scenario_id, scenario),
                }
            ), 400

        attempts = state["attempts"]
        attempts[lock_id] = attempts.get(lock_id, 0) + 1

        if code.upper() == lock["code"].upper():
            _unlock_lock(scenario, state, lock, code)

            _save_state(scenario_id, state)
            return jsonify(
                {
                    "success": True,
                    "message": lock["unlock_message"],
                    "state": _build_state_payload(scenario_id, scenario),
                }
            )

        if attempts[lock_id] >= lock.get("hint_after_failures", 999):
            _add_clue(
                state,
                clue_id=f"hint:{lock_id}",
                text=lock["hint_text"],
                source=f"Hint for {lock['name']}",
            )

        _save_state(scenario_id, state)
        return jsonify(
            {
                "success": False,
                "message": "Incorrect code. Try again.",
                "state": _build_state_payload(scenario_id, scenario),
            }
        )

    @app.get("/api/scenarios/<scenario_id>/leaderboard")
    def get_leaderboard(scenario_id: str):
        if scenario_id not in SCENARIOS:
            return jsonify({"error": "Scenario not found."}), 404
        ranked = sorted(LEADERBOARD[scenario_id], key=lambda e: e["score"], reverse=True)
        for i, entry in enumerate(ranked, 1):
            entry["rank"] = i
        return jsonify({"leaderboard": ranked})

    @app.post("/api/scenarios/<scenario_id>/leaderboard")
    def submit_leaderboard(scenario_id: str):
        scenario = SCENARIOS.get(scenario_id)
        if not scenario:
            return jsonify({"error": "Scenario not found."}), 404
        state = _get_state(scenario_id)
        if not state or not state.get("completed"):
            return jsonify({"error": "Scenario must be completed first."}), 400
        body = request.get_json(silent=True) or {}
        name = str(body.get("name", "")).strip()[:30]
        if not name:
            return jsonify({"error": "Name is required."}), 400
        score_data = _calc_score(state, scenario)
        if not score_data:
            return jsonify({"error": "Score not available."}), 400
        LEADERBOARD[scenario_id].append({
            "name": name,
            "score": score_data["final_score"],
            "elapsed_seconds": score_data["elapsed_seconds"],
            "completed_at": state.get("completed_at", _now_iso()),
            "rank": 0,
        })
        ranked = sorted(LEADERBOARD[scenario_id], key=lambda e: e["score"], reverse=True)
        for i, entry in enumerate(ranked, 1):
            entry["rank"] = i
        return jsonify({"leaderboard": ranked, "your_score": score_data})

    return app


def _state_key(scenario_id: str) -> str:
    return f"escapejs:{scenario_id}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_motion_event(body: dict[str, Any]) -> str | None:
    event_name = body.get("event_name")
    timestamp_ms = body.get("timestamp_ms")
    payload = body.get("payload")

    if not isinstance(event_name, str) or not event_name.strip():
        return "event_name must be a non-empty string."
    if not isinstance(timestamp_ms, int):
        return "timestamp_ms must be an integer."
    if not isinstance(payload, dict):
        return "payload must be an object."

    if event_name == "spell_detected":
        if not isinstance(payload.get("spell_name"), str) or not payload["spell_name"].strip():
            return "spell_detected payload must include a non-empty spell_name string."
        if not isinstance(payload.get("tracking_id"), str) or not payload["tracking_id"].strip():
            return "spell_detected payload must include a non-empty tracking_id string."
        return None

    if event_name == "pose_detected":
        if not isinstance(payload.get("pose_name"), str) or not payload["pose_name"].strip():
            return "pose_detected payload must include a non-empty pose_name string."
        tracking_ids = payload.get("tracking_ids")
        if not isinstance(tracking_ids, list) or not tracking_ids:
            return "pose_detected payload must include a non-empty tracking_ids array."
        if not all(isinstance(tracking_id, str) and tracking_id.strip() for tracking_id in tracking_ids):
            return "pose_detected payload tracking_ids must only contain non-empty strings."
        if not isinstance(payload.get("held_ms"), int):
            return "pose_detected payload must include an integer held_ms."
        return None

    return "Unsupported event_name."


def _init_state(scenario_id: str) -> None:
    state = {
        "started_at": _now_iso(),
        "completed": False,
        "attempts": {},
        "unlocked": {},
        "unlocked_history": [],
        "clues": [],
    }
    if _scenario_uses_shared_state(scenario_id):
        ROOM_STATES[scenario_id] = state
    else:
        session[_state_key(scenario_id)] = state
        session.modified = True


def _get_state(scenario_id: str) -> dict[str, Any] | None:
    if _scenario_uses_shared_state(scenario_id):
        return ROOM_STATES.get(scenario_id)
    return session.get(_state_key(scenario_id))


def _save_state(scenario_id: str, state: dict[str, Any]) -> None:
    if _scenario_uses_shared_state(scenario_id):
        ROOM_STATES[scenario_id] = state
    else:
        session[_state_key(scenario_id)] = state
        session.modified = True


def _scenario_uses_shared_state(scenario_id: str) -> bool:
    scenario = SCENARIOS.get(scenario_id)
    return bool(scenario and scenario.get("shared_state"))


def _find_lock(scenario: dict[str, Any], lock_id: str) -> dict[str, Any] | None:
    return next((lock for lock in scenario["locks"] if lock["id"] == lock_id), None)


def _unlock_groups(scenario: dict[str, Any]) -> list[dict[str, Any]]:
    locks = scenario["locks"]
    lock_lookup = {lock["id"]: lock for lock in locks}
    raw_groups = scenario.get("unlock_groups")
    groups: list[dict[str, Any]] = []
    seen_lock_ids: set[str] = set()

    if isinstance(raw_groups, list):
        for raw_group in raw_groups:
            if not isinstance(raw_group, dict):
                continue

            raw_lock_ids = raw_group.get("lock_ids")
            if not isinstance(raw_lock_ids, list):
                continue

            group_lock_ids = []
            for lock_id in raw_lock_ids:
                if not isinstance(lock_id, str):
                    continue
                if lock_id not in lock_lookup or lock_id in seen_lock_ids:
                    continue
                group_lock_ids.append(lock_id)
                seen_lock_ids.add(lock_id)

            if not group_lock_ids:
                continue

            group_index = len(groups) + 1
            groups.append(
                {
                    "id": str(raw_group.get("id") or f"group-{group_index}"),
                    "name": str(raw_group.get("name") or f"Stage {group_index}"),
                    "lock_ids": group_lock_ids,
                    "completion_clue": raw_group.get("completion_clue"),
                }
            )

    for lock in locks:
        if lock["id"] in seen_lock_ids:
            continue
        groups.append(
            {
                "id": f"lock:{lock['id']}",
                "name": lock["name"],
                "lock_ids": [lock["id"]],
                "completion_clue": None,
            }
        )

    return groups


def _lock_group_index_map(scenario: dict[str, Any]) -> dict[str, int]:
    group_indexes: dict[str, int] = {}
    for index, group in enumerate(_unlock_groups(scenario)):
        for lock_id in group["lock_ids"]:
            group_indexes[lock_id] = index
    return group_indexes


def _group_is_complete(group: dict[str, Any], state: dict[str, Any]) -> bool:
    return all(lock_id in state["unlocked"] for lock_id in group["lock_ids"])


def _active_unlock_group(scenario: dict[str, Any], state: dict[str, Any]) -> dict[str, Any] | None:
    for group in _unlock_groups(scenario):
        if not _group_is_complete(group, state):
            return group
    return None


def _active_lock_ids(scenario: dict[str, Any], state: dict[str, Any]) -> list[str]:
    group = _active_unlock_group(scenario, state)
    if not group:
        return []
    return [lock_id for lock_id in group["lock_ids"] if lock_id not in state["unlocked"]]


def _lock_input_type(lock: dict[str, Any]) -> str:
    input_type = str(lock.get("input_type", "code")).lower()
    if input_type in {"code", "spell", "pose"}:
        return input_type
    return "code"


def _normalize_motion_text(value: str) -> str:
    return "".join(character for character in value.lower() if character.isalnum())


def _motion_matches_lock(lock: dict[str, Any], body: dict[str, Any]) -> bool:
    input_type = _lock_input_type(lock)
    event_name = str(body.get("event_name", ""))
    payload = body.get("payload")
    if not isinstance(payload, dict):
        return False

    if input_type == "spell":
        expected = str(lock.get("spell", "")).strip()
        actual = str(payload.get("spell_name", "")).strip()
        return (
            event_name == "spell_detected"
            and bool(expected)
            and bool(actual)
            and _normalize_motion_text(expected) == _normalize_motion_text(actual)
        )

    if input_type == "pose":
        expected = str(lock.get("pose_name", "")).strip()
        actual = str(payload.get("pose_name", "")).strip()
        aliases = lock.get("pose_aliases")
        expected_values = [expected]
        if isinstance(aliases, list):
            expected_values.extend(alias for alias in aliases if isinstance(alias, str))
        normalized_actual = _normalize_motion_text(actual)
        return (
            event_name == "pose_detected"
            and bool(actual)
            and any(
                _normalize_motion_text(expected_value) == normalized_actual
                for expected_value in expected_values
                if expected_value
            )
        )

    return False


def _unlock_lock(scenario: dict[str, Any], state: dict[str, Any], lock: dict[str, Any], solved_with: str) -> None:
    lock_id = lock["id"]
    unlocked_at = _now_iso()
    state["unlocked"][lock_id] = {
        "code": solved_with,
        "unlocked_at": unlocked_at,
    }
    state["unlocked_history"].append(
        {
            "lock_id": lock_id,
            "lock_name": lock["name"],
            "code": solved_with,
            "unlocked_at": unlocked_at,
            "message": lock["unlock_message"],
        }
    )
    _add_clue(
        state,
        clue_id=f"lock:{lock_id}",
        text=str(lock.get("clue") or f"Unlocked {lock['name']}"),
        source=f"Unlocked {lock['name']}",
    )
    _add_group_completion_clues(scenario, state)

    if len(state["unlocked"]) == len(scenario["locks"]):
        state["completed"] = True
        state["completed_at"] = _now_iso()


def _add_group_completion_clues(scenario: dict[str, Any], state: dict[str, Any]) -> None:
    for group in _unlock_groups(scenario):
        completion_clue = group.get("completion_clue")
        if not isinstance(completion_clue, str) or not completion_clue.strip():
            continue
        if not _group_is_complete(group, state):
            continue
        _add_clue(
            state,
            clue_id=f"group:{group['id']}:complete",
            text=completion_clue,
            source=f"{group['name']} Complete",
        )


def _process_motion_event(body: dict[str, Any]) -> None:
    scenario_id_hint = body.get("scenario_id")
    candidate_ids: list[str]
    if isinstance(scenario_id_hint, str) and scenario_id_hint in SCENARIOS:
        candidate_ids = [scenario_id_hint]
    else:
        candidate_ids = [
            scenario_id
            for scenario_id, scenario in SCENARIOS.items()
            if scenario.get("shared_state")
        ]

    for scenario_id in candidate_ids:
        scenario = SCENARIOS.get(scenario_id)
        if not scenario:
            continue
        state = _get_state(scenario_id)
        if not state or state.get("completed"):
            continue

        for active_lock_id in _active_lock_ids(scenario, state):
            lock = _find_lock(scenario, active_lock_id)
            if not lock:
                continue
            if not _motion_matches_lock(lock, body):
                continue

            payload = body.get("payload")
            solved_with = "MOTION"
            if isinstance(payload, dict):
                if body.get("event_name") == "spell_detected":
                    solved_with = str(payload.get("spell_name") or solved_with)
                elif body.get("event_name") == "pose_detected":
                    solved_with = str(payload.get("pose_name") or solved_with)

            _unlock_lock(scenario, state, lock, solved_with)
            _save_state(scenario_id, state)
            return


def _add_clue(state: dict[str, Any], clue_id: str, text: str, source: str) -> None:
    if any(existing["id"] == clue_id for existing in state["clues"]):
        return
    state["clues"].append(
        {
            "id": clue_id,
            "text": text,
            "source": source,
            "revealed_at": _now_iso(),
        }
    )


def _calc_score(state: dict[str, Any], scenario: dict[str, Any]) -> dict[str, Any] | None:
    if not state.get("completed"):
        return None
    total_locks = len(scenario["locks"])
    total_attempts = sum(state["attempts"].values())
    failed_attempts = max(0, total_attempts - total_locks)
    hints_used = sum(1 for c in state["clues"] if c["id"].startswith("hint:"))
    started = datetime.fromisoformat(state["started_at"])
    completed = datetime.fromisoformat(state.get("completed_at", _now_iso()))
    elapsed = int((completed - started).total_seconds())
    time_limit = scenario.get("time_limit_seconds", 1800)
    time_remaining = max(0, time_limit - elapsed)
    base = scenario.get("base_score", 10000)
    attempts_penalty = failed_attempts * 200
    hints_penalty = hints_used * 300
    time_bonus = time_remaining * 2
    final_score = max(0, base - attempts_penalty - hints_penalty + time_bonus)
    return {
        "base_score": base,
        "failed_attempts": failed_attempts,
        "attempts_penalty": attempts_penalty,
        "hints_used": hints_used,
        "hints_penalty": hints_penalty,
        "time_bonus": time_bonus,
        "elapsed_seconds": elapsed,
        "final_score": final_score,
    }


def _build_state_payload(scenario_id: str, scenario: dict[str, Any]) -> dict[str, Any]:
    state = _get_state(scenario_id)
    if state is None:
        raise ValueError("Scenario state must be initialized before building payload")

    total_locks = len(scenario["locks"])
    unlocked_count = len(state["unlocked"])
    progress_pct = round((unlocked_count / total_locks) * 100, 1) if total_locks else 0.0
    unlock_groups = _unlock_groups(scenario)
    lock_group_indexes = _lock_group_index_map(scenario)
    active_group = _active_unlock_group(scenario, state)
    active_lock_ids = _active_lock_ids(scenario, state)
    active_lock_id_set = set(active_lock_ids)

    locks_payload = []
    for lock in scenario["locks"]:
        lock_id = lock["id"]
        unlocked_data = state["unlocked"].get(lock_id)
        group_index = lock_group_indexes.get(lock_id)
        group = unlock_groups[group_index] if group_index is not None else None
        input_type = _lock_input_type(lock)
        expected_code = str(lock.get("code", ""))
        locks_payload.append(
            {
                "id": lock_id,
                "name": lock["name"],
                "prompt": lock["prompt"],
                "input_type": input_type,
                "input_length": lock.get("input_length") if input_type == "code" else None,
                "status": "unlocked" if unlocked_data else "locked",
                "attempts": state["attempts"].get(lock_id, 0),
                "successful_code": unlocked_data["code"] if unlocked_data else None,
                "unlocked_at": unlocked_data["unlocked_at"] if unlocked_data else None,
                "image_url": lock.get("image_url"),
                "sounds": lock.get("sounds"),
                "group_id": group["id"] if group else None,
                "group_name": group["name"] if group else None,
                "is_available": bool(unlocked_data) or lock_id in active_lock_id_set,
            }
        )

    score = _calc_score(state, scenario) if state["completed"] else None

    return {
        "scenario": {
            "id": scenario["id"],
            "title": scenario["title"],
            "description": scenario["description"],
            "difficulty": scenario["difficulty"],
            "total_locks": total_locks,
            "time_limit_seconds": scenario.get("time_limit_seconds", 1800),
        },
        "state": {
            "started_at": state["started_at"],
            "completed": state["completed"],
            "unlocked_count": unlocked_count,
            "progress_pct": progress_pct,
            "next_lock_id": active_lock_ids[0] if active_lock_ids else None,
            "active_lock_ids": active_lock_ids,
            "active_group": {
                "id": active_group["id"],
                "name": active_group["name"],
                "lock_ids": active_group["lock_ids"],
            } if active_group else None,
            "unlock_groups": [
                {
                    "id": group["id"],
                    "name": group["name"],
                    "lock_ids": group["lock_ids"],
                    "completed": _group_is_complete(group, state),
                    "is_active": active_group is not None and group["id"] == active_group["id"],
                }
                for group in unlock_groups
            ],
            "locks": locks_payload,
            "clues": state["clues"],
            "unlocked_history": state["unlocked_history"],
            "score": score,
        },
    }


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
