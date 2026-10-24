"""Offline check for the answer guardrail (usability improvement 4). No API key or network needed.

A scripted fake model looks up the real price, then "hallucinates" a sale price. The guardrail
must block it, send the reason back, and only let the corrected answer through.

Run from backend/:  python checks/check_guardrail.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import os

os.environ.setdefault("PORTKEY_API_KEY", "offline-check-not-used")  # the fake model never calls out
# keep the fake-model run out of the real output/audit_trail.json
import tempfile

os.environ["CAMPUS_AUDIT_PATH"] = str(Path(tempfile.gettempdir()) / "campus_guardrail_check_audit.json")

from pydantic_ai.messages import ModelResponse, RetryPromptPart, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

import agent

step = {"n": 0}


def scripted(messages, info: AgentInfo) -> ModelResponse:
    step["n"] += 1
    out = info.output_tools[0].name
    if step["n"] == 1:
        return ModelResponse(parts=[ToolCallPart("get_price", {"product_refs": ["morse-1-4-zip"]})])
    if step["n"] == 2:
        return ModelResponse(parts=[ToolCallPart(out, {"reply": "On sale for **$59.99**!", "product_ids": ["morse-1-4-zip"]})])
    retries = [p for m in messages for p in getattr(m, "parts", []) if isinstance(p, RetryPromptPart)]
    assert retries and "$59.99" in str(retries[-1].content), "guardrail feedback missing"
    return ModelResponse(parts=[ToolCallPart(out, {"reply": "The Morse 1/4 Zip is **$72.00**.", "product_ids": ["morse-1-4-zip"]})])


async def main() -> None:
    with agent.get_agent().override(model=FunctionModel(scripted)):
        r = await agent.chat("How much is the Morse 1/4 Zip?", [])
    assert "$59.99" not in r.reply and "$72.00" in r.reply, r.reply
    assert r.check and r.check.passed and r.check.retries == 1 and r.check.prices_checked == 1, r.check
    print("PASS: invented $59.99 blocked; corrected answer sent:", r.reply, "|", r.check)


if __name__ == "__main__":
    asyncio.run(main())
