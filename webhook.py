#!/usr/bin/env python3
"""
GitHub Webhook Receiver for RRKM Dashboard — Self-Hosted CI/CD
Listens on port 9003 for signed push webhooks from GitHub.
"""

import hmac
import hashlib
import subprocess
import os
import sys
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler

# Configuration
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "").encode()
DEPLOY_SCRIPT = "/app/rrkm-deploy.sh"
REPO_NAME = "adhin15/rrkm-dashboard"
LOG_FILE = "/app/logs/rrkm-webhook.log"
PORT = 9003

# Logging
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("rrkm-webhook")


def verify_signature(payload: bytes, signature: str, secret: bytes) -> bool:
    """Verify GitHub webhook signature using HMAC-SHA256."""
    if not secret:
        logger.warning("WEBHOOK_SECRET not set — skipping signature verification (INSECURE)")
        return True

    if not signature.startswith("sha256="):
        return False

    expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    provided = signature[7:]
    return hmac.compare_digest(expected, provided)


def run_deploy() -> bool:
    """Execute the deploy script."""
    try:
        result = subprocess.run(
            ["bash", DEPLOY_SCRIPT],
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode == 0:
            logger.info("Deploy script completed successfully")
            return True
        else:
            logger.error(f"Deploy script failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        logger.error("Deploy script timed out after 600 seconds")
        return False
    except Exception as e:
        logger.error(f"Deploy script exception: {e}")
        return False


class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        payload = self.rfile.read(content_length)

        # Verify GitHub signature
        signature = self.headers.get("X-Hub-Signature-256", "")
        if not verify_signature(payload, signature, WEBHOOK_SECRET):
            logger.warning("Webhook rejected: invalid signature")
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b"Unauthorized")
            return

        # Parse event
        event_type = self.headers.get("X-GitHub-Event", "")
        if event_type != "push":
            logger.info(f"Ignoring event type: {event_type}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f"Ignored: {event_type}".encode())
            return

        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            logger.warning("Webhook rejected: invalid JSON")
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Bad Request: Invalid JSON")
            return

        # Check branch is main
        ref = data.get("ref", "")
        if ref != "refs/heads/main":
            logger.info(f"Ignoring push to {ref}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f"Ignored: push to {ref}".encode())
            return

        # Check repository
        repo = data.get("repository", {}).get("full_name", "")
        if repo != REPO_NAME:
            logger.warning(f"Webhook from unexpected repo: {repo}")
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b"Forbidden: wrong repo")
            return

        # Log commit info
        commit_msg = data.get("head_commit", {}).get("message", "N/A")
        commit_hash = data.get("after", "N/A")[:7]
        pusher = data.get("pusher", {}).get("name", "unknown")
        logger.info(f"Push received: {commit_hash} by {pusher} — '{commit_msg}'")

        # Trigger deploy
        logger.info("Starting RRKM deployment...")
        success = run_deploy()

        if success:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK: RRKM Deployed")
        else:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"Error: Deploy failed")

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"RRKM webhook receiver is running. Send POST for deploy.")


def main():
    if not WEBHOOK_SECRET:
        logger.warning("WEBHOOK_SECRET is not set. Webhook signatures will NOT be verified!")

    server = HTTPServer(("0.0.0.0", PORT), WebhookHandler)
    logger.info(f"RRKM webhook receiver listening on port {PORT}")
    logger.info(f"Expecting pushes from: {REPO_NAME}")
    logger.info(f"Deploy script: {DEPLOY_SCRIPT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
