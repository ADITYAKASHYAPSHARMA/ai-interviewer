"""
Aegis AI Agent Interviewer Package
"""

import sys
import uvicorn

def main() -> None:
    """Entrypoint to run the AI Agent Interviewer Web Application."""
    print("\n" + "=" * 60)
    print("🚀 Starting Aegis AI Agent Interviewer Server...")
    print("🌐 Open http://localhost:8000 in your browser")
    print("=" * 60 + "\n")
    uvicorn.run("aiagent.server:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
