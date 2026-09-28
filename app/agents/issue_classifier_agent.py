import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Optional, Tuple

# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.models.enums import MaintenanceCategory, MaintenanceSeverity
from app.prompts.maintenance_classification_prompt import (
    MAINTENANCE_CLASSIFICATION_PROMPT,
)


class ClassificationError(Exception):
    """Raised when issue classification fails due to API, parsing, or validation errors."""
    pass


class IssueClassifierAgent:
    """Agent responsible for classifying hotel maintenance issues into category and severity using an LLM."""

    def __init__(
        self,
        ollama_url: str = "http://localhost:11434/api/generate",
        model_name: str = "llama3.2:latest",
        timeout: float = 60.0,
    ):
        self.ollama_url = ollama_url
        self.model_name = model_name
        self.timeout = timeout
        self.activity_logs: list[dict] = []

    def _call_llm(self, prompt: str) -> str:
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.ollama_url,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result.get("response", "").strip()
        except urllib.error.URLError as e:
            raise ClassificationError(
                f"Failed to connect to Ollama at {self.ollama_url}: {e}"
            ) from e
        except Exception as e:
            raise ClassificationError(f"LLM request error: {e}") from e

    def classify(self, description: str) -> dict:
        """Classify a user request or issue description to check if it is a valid maintenance issue,
        and if valid, determine its category, severity, and affects_room_readiness.

        Args:
            description: Free-text issue description.

        Returns:
            dict: {
                "is_valid_issue": bool,
                "category": Optional[MaintenanceCategory],
                "severity": Optional[MaintenanceSeverity],
                "affects_room_readiness": Optional[bool]
            }

        Raises:
            ClassificationError: If the request, parsing, or enum validation fails.
        """
        if not description or not description.strip():
            raise ClassificationError("Description cannot be empty for classification.")

        prompt = MAINTENANCE_CLASSIFICATION_PROMPT.format(description=description.strip())
        raw_output = self._call_llm(prompt)

        # Parse JSON
        try:
            # Handle potential markdown fencing if model outputs ```json ... ```
            cleaned_text = raw_output
            if "```" in cleaned_text:
                cleaned_text = cleaned_text.split("```")[1]
                if cleaned_text.startswith("json"):
                    cleaned_text = cleaned_text[4:]
                cleaned_text = cleaned_text.strip()

            parsed = json.loads(cleaned_text)
        except Exception as e:
            raise ClassificationError(
                f"Failed to parse LLM response as JSON: '{raw_output}'. Error: {e}"
            ) from e

        if not isinstance(parsed, dict):
            raise ClassificationError(
                f"Expected JSON object from LLM response, got {type(parsed)}: '{raw_output}'"
            )

        if "is_valid_issue" not in parsed:
            raise ClassificationError(
                f"Missing 'is_valid_issue' in LLM output: '{raw_output}'"
            )

        is_valid_issue = bool(parsed["is_valid_issue"])

        if not is_valid_issue:
            self.activity_logs.append({
                "agent": "ISSUE_CLASSIFIER_AGENT",
                "action": "CLASSIFY_ISSUE",
                "description": description,
                "is_valid_issue": False,
                "category": None,
                "severity": None,
                "affects_room_readiness": None,
                "status": "COMPLETED",
            })
            return {
                "is_valid_issue": False,
                "category": None,
                "severity": None,
                "affects_room_readiness": None,
            }

        raw_category = parsed.get("category")
        raw_severity = parsed.get("severity")
        raw_affects_readiness = parsed.get("affects_room_readiness")

        # Safely parse affects_room_readiness with fallback to True for valid issues
        if raw_affects_readiness is None:
            affects_room_readiness = True
        elif isinstance(raw_affects_readiness, bool):
            affects_room_readiness = raw_affects_readiness
        elif isinstance(raw_affects_readiness, str):
            val_clean = raw_affects_readiness.strip().lower()
            if val_clean == "false":
                affects_room_readiness = False
            elif val_clean == "true":
                affects_room_readiness = True
            else:
                affects_room_readiness = True
        else:
            try:
                affects_room_readiness = bool(raw_affects_readiness)
            except Exception:
                affects_room_readiness = True

        if not raw_category or not raw_severity:
            raise ClassificationError(
                f"Missing 'category' or 'severity' for valid maintenance issue in LLM output: '{raw_output}'"
            )

        # Validate against MaintenanceCategory enum
        try:
            category = MaintenanceCategory(str(raw_category).upper().strip())
        except ValueError:
            valid_cats = [c.value for c in MaintenanceCategory]
            raise ClassificationError(
                f"Invalid category '{raw_category}'. Expected one of {valid_cats}"
            )

        # Validate against MaintenanceSeverity enum
        try:
            severity = MaintenanceSeverity(str(raw_severity).upper().strip())
        except ValueError:
            valid_sevs = [s.value for s in MaintenanceSeverity]
            raise ClassificationError(
                f"Invalid severity '{raw_severity}'. Expected one of {valid_sevs}"
            )

        self.activity_logs.append({
            "agent": "ISSUE_CLASSIFIER_AGENT",
            "action": "CLASSIFY_ISSUE",
            "description": description,
            "is_valid_issue": True,
            "category": category.value,
            "severity": severity.value,
            "affects_room_readiness": affects_room_readiness,
            "status": "COMPLETED",
        })

        return {
            "is_valid_issue": True,
            "category": category,
            "severity": severity,
            "affects_room_readiness": affects_room_readiness,
        }

    SAFETY_KEYWORDS = ("gas", "smoke", "fire", "spark", "electric shock")

    def classify_with_fallback(
        self, description: str
    ) -> Tuple[bool, Optional[MaintenanceCategory], Optional[MaintenanceSeverity], bool]:
        """Classify an issue description with automatic fallback and safety keyword override.

        Args:
            description: Free-text issue description.

        Returns:
            Tuple[bool, Optional[MaintenanceCategory], Optional[MaintenanceSeverity], bool]:
                - is_valid_issue: True if input is a valid maintenance issue, False otherwise.
                - category: Classified or fallback MaintenanceCategory (or None if invalid).
                - severity: Classified, overridden, or fallback MaintenanceSeverity (or None if invalid).
                - needs_human_review: True if fallback default was used or safety override was applied.
        """
        # Step a: Try calling self.classify(description)
        try:
            result = self.classify(description)
            is_valid = result.get("is_valid_issue", False)
            if not is_valid:
                self.activity_logs.append({
                    "agent": "ISSUE_CLASSIFIER_AGENT",
                    "action": "INVALID_ISSUE_DETECTED",
                    "description": description,
                    "is_valid_issue": False,
                    "needs_human_review": False,
                    "status": "FLAGGED_INVALID",
                })
                return False, None, None, False

            category = result.get("category")
            severity = result.get("severity")
        except Exception as e:
            # Step b: Log failure and return safe defaults with needs_human_review=True
            self.activity_logs.append({
                "agent": "ISSUE_CLASSIFIER_AGENT",
                "action": "CLASSIFICATION_FALLBACK",
                "description": description,
                "error": str(e),
                "fallback_category": MaintenanceCategory.GENERAL.value,
                "fallback_severity": MaintenanceSeverity.MEDIUM.value,
                "needs_human_review": True,
                "status": "FALLBACK_APPLIED",
            })
            return True, MaintenanceCategory.GENERAL, MaintenanceSeverity.MEDIUM, True

        # Step c: If classify() succeeds, check description for safety keywords
        desc_lower = description.lower() if description else ""
        matched_keywords = [kw for kw in self.SAFETY_KEYWORDS if kw in desc_lower]
        if matched_keywords:
            original_severity = severity
            severity = MaintenanceSeverity.CRITICAL
            self.activity_logs.append({
                "agent": "ISSUE_CLASSIFIER_AGENT",
                "action": "SAFETY_OVERRIDE",
                "description": description,
                "matched_keywords": matched_keywords,
                "original_severity": original_severity.value if hasattr(original_severity, "value") else str(original_severity),
                "override_severity": MaintenanceSeverity.CRITICAL.value,
                "status": "OVERRIDDEN",
            })
            return True, category, severity, True

        # Step d: Normal classification success with no safety keywords
        return True, category, severity, False

