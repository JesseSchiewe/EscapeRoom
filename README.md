# EscapeJS

EscapeJS is a Flask-powered escape room app where players can:

- Choose a scenario
- Enter lock combinations (including 4-digit codes)
- Track lock-by-lock progress
- Reveal clues as they progress or struggle
- View unlock history with successful codes and timestamps
- Monitor overall completion with a progress bar

## Features

- Scenario selection with multiple built-in rooms
- Ordered or grouped lock solving flow for game structure
- Real-time status for each lock:
	- Locked or unlocked
	- Attempt count
	- Successful code used
	- Unlock time
- Clue system:
	- Clues are unleashed when locks are unlocked
	- Additional hints reveal after repeated failed attempts
- Overall progress tracking:
	- Number of locks solved
	- Percentage complete
	- Completion banner when all locks are solved
- Motion webhook endpoint for external spell and pose detection events

## Tech Stack

- Backend: Flask
- Frontend: Vanilla JavaScript, HTML, CSS
- State: Server-side session state per scenario

## Run Locally

1. Create and activate a virtual environment.
2. Install dependencies:

	 ```bash
	 pip install -r requirements.txt
	 ```

3. Start the app:

	 ```bash
	 flask --app app run --debug
	 ```

4. Open your browser to:

	 ```
	 http://127.0.0.1:5000
	 ```

## Motion Webhook

The app exposes a webhook endpoint for external motion detection services:

- `POST /motion-events`
- Accepts a JSON object with `event_name`, `timestamp_ms`, and `payload`
- Returns a fast `204 No Content` response for valid events

Supported event payloads:

- `spell_detected`: `payload.spell_name`, `payload.tracking_id`
- `pose_detected`: `payload.pose_name`, `payload.tracking_ids`, `payload.held_ms`

Example spell event:

```json
{
	"event_name": "spell_detected",
	"timestamp_ms": 1710000000000,
	"payload": {
		"spell_name": "accio",
		"tracking_id": "track-1"
	}
}
```

Example pose event:

```json
{
	"event_name": "pose_detected",
	"timestamp_ms": 1710000000001,
	"payload": {
		"pose_name": "t_pose",
		"tracking_ids": ["track-1", "track-2"],
		"held_ms": 850
	}
}
```

## Unlock Groups

Scenarios can optionally define `unlock_groups` to control which locks are available at the same time.

- If `unlock_groups` is omitted, the default behavior stays sequential: one lock becomes available at a time in the order listed.
- If a group contains multiple `lock_ids`, every lock in that group is shown and can be solved in parallel.
- The next group does not unlock until every lock in the current group has been opened.

Example:

```python
"unlock_groups": [
	{
		"id": "egg-hunt",
		"name": "Egg Hunt",
		"lock_ids": ["egg-1", "egg-2", "egg-3"]
	},
	{
		"id": "final-stage",
		"name": "Final Stage",
		"lock_ids": ["FINAL"]
	}
]
```

In the built-in Bunny Hoppers scenario, all seven eggs are now available together, and the final basket step unlocks only after all seven eggs are complete.

## Security Note

Set a strong Flask secret key for non-development use:

```bash
set FLASK_SECRET_KEY=replace-with-a-random-value
```

## Project Structure

- `app.py`: Flask app and API routes
- `templates/index.html`: Main app shell
- `static/js/app.js`: Frontend game logic
- `static/css/styles.css`: Visual design and responsive layout
