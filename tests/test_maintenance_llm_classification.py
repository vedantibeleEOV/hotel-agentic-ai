import json
import sys
import urllib.request
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.enums import MaintenanceCategory, MaintenanceSeverity
from app.prompts.maintenance_classification_prompt import MAINTENANCE_CLASSIFICATION_PROMPT

OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:latest"

SAMPLE_DESCRIPTIONS = [
    "AC is running but the room is not cooling.",
    "Sparks flying from bedside electrical outlet with burning smell.",
    "Water leaking heavily from bathroom ceiling and flooding floor.",
    "Desk chair leg is wobbly and loose.",
    "Room door lock mechanism is jammed and won't latch shut.",
]


def classify_description(description: str) -> dict:
    """Send description to Ollama API and return raw response dict."""
    prompt = MAINTENANCE_CLASSIFICATION_PROMPT.format(description=description)
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
    }
    req = urllib.request.Request(
        OLLAMA_GENERATE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def run_llm_classification_tests():
    valid_categories = {c.value for c in MaintenanceCategory}
    valid_severities = {s.value for s in MaintenanceSeverity}

    print("=" * 70)
    print(f"RUNNING LLM CLASSIFICATION TEST ON '{MODEL_NAME}'")
    print("=" * 70)

    passed = 0
    total = len(SAMPLE_DESCRIPTIONS)

    for idx, desc in enumerate(SAMPLE_DESCRIPTIONS, 1):
        print(f"\n[Test Case {idx}/{total}]")
        print(f"  Input Description: \"{desc}\"")

        try:
            raw_api_response = classify_description(desc)
            raw_text = raw_api_response.get("response", "").strip()
            print(f"  Raw Model Output : {raw_text}")

            parsed = json.loads(raw_text)
            category = parsed.get("category")
            severity = parsed.get("severity")
            affects_room_readiness = parsed.get("affects_room_readiness")

            print(f"  Parsed Category  : {category}")
            print(f"  Parsed Severity  : {severity}")
            print(f"  Parsed Readiness : {affects_room_readiness}")

            assert category in valid_categories, (
                f"Invalid category '{category}', expected one of {valid_categories}"
            )
            assert severity in valid_severities, (
                f"Invalid severity '{severity}', expected one of {valid_severities}"
            )
            assert isinstance(affects_room_readiness, bool), (
                f"Invalid affects_room_readiness '{affects_room_readiness}', expected boolean"
            )

            print("  Status           : PASS")
            passed += 1

        except Exception as e:
            print(f"  Status           : FAIL ({e})")

    print("\n" + "=" * 70)
    print(f"SUMMARY: {passed}/{total} classification test cases passed.")
    print("=" * 70)
    return passed == total


def test_llm_classification_samples():
    """Pytest test case for LLM classification schema validation."""
    valid_categories = {c.value for c in MaintenanceCategory}
    valid_severities = {s.value for s in MaintenanceSeverity}

    for desc in SAMPLE_DESCRIPTIONS:
        raw_api_response = classify_description(desc)
        raw_text = raw_api_response.get("response", "").strip()
        parsed = json.loads(raw_text)

        assert "category" in parsed, f"Missing 'category' in {raw_text}"
        assert "severity" in parsed, f"Missing 'severity' in {raw_text}"
        assert "affects_room_readiness" in parsed, f"Missing 'affects_room_readiness' in {raw_text}"
        if parsed.get("is_valid_issue") is not False and parsed.get("category") is not None:
            assert parsed["category"] in valid_categories, f"Unknown category in {raw_text}"
            assert parsed["severity"] in valid_severities, f"Unknown severity in {raw_text}"
            assert isinstance(parsed["affects_room_readiness"], bool), f"Expected bool for affects_room_readiness in {raw_text}"
        else:
            assert parsed.get("category") is None
            assert parsed.get("severity") is None


if __name__ == "__main__":
    success = run_llm_classification_tests()
    sys.exit(0 if success else 1)

