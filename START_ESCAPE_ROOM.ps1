##### Script to start the Escape Room game

$ScenarioId = "wwjd"


Write-Host "Starting the Escape Room game..."

## Add any initialization or setup code for the Escape Room game below

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# If using bridges for specific controllers (like digital piano, drums, gamepads), initialize them here
# Alesis Digital Piano bridge initialization
python .\resources\piano_bridge.py --scenario-id $ScenarioId --port "Alesis Recital  0"


# Start the containerized app via Docker Compose
docker-compose up

