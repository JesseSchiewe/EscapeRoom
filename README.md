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
- Ordered lock solving flow for game structure
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
