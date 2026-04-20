podman build -t discord-pet-js:dev .

# Load secrets from the repo’s `.env` (mounted at /app); avoid `--env-file` so token edits apply after restart.
podman run -it --rm \
  -v "$PWD:/app:Z" \
  discord-pet-js:dev

# to install stuff you can run command there like
# podman run --rm -it -v "$PWD:/app:Z" -w /app discord-pet-js:dev npm install minecraft-protocol