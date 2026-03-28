podman build -t discord-pet-js:dev .

# Load secrets from the repo’s `.env` (mounted at /app); avoid `--env-file` so token edits apply after restart.
podman run -it --rm \
  -v "$PWD:/app:Z" \
  discord-pet-js:dev