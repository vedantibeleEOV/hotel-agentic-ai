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
        timeout: float = 30.0,
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

    def classify(self, description: str) -> Tuple[MaintenanceCategory, MaintenanceSeverity]:
        """Classify a maintenance issue description into category and severity.

        Args:
            description: Free-text issue description.

        Returns:
            Tuple[MaintenanceCategory, MaintenanceSeverity]: Validated enum instances.

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

        raw_category = parsed.get("category")
        raw_severity = parsed.get("severity")

        if not raw_category or not raw_severity:
            raise ClassificationError(
                f"Missing 'category' or 'severity' in LLM output: '{raw_output}'"
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
            "category": category.value,
            "severity": severity.value,
            "status": "COMPLETED",
        })

        return category, severity

    SAFETY_KEYWORDS = ("gas", "smoke", "fire", "spark", "electric shock")

    def classify_with_fallback(
        self, description: str
    ) -> Tuple[MaintenanceCategory, MaintenanceSeverity, bool]:
        """Classify an issue description with automatic fallback and safety keyword override.

        Args:
            description: Free-text issue description.

        Returns:
            Tuple[MaintenanceCategory, MaintenanceSeverity, bool]:
                - category: Classified or fallback MaintenanceCategory
                - severity: Classified, overridden, or fallback MaintenanceSeverity
                - needs_human_review: True if fallback default was used or safety override was applied, False otherwise.
        """
        # Step a: Try calling self.classify(description)
        try:
            category, severity = self.classify(description)
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
            return MaintenanceCategory.GENERAL, MaintenanceSeverity.MEDIUM, True

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
                "original_severity": original_severity.value,
                "override_severity": MaintenanceSeverity.CRITICAL.value,
                "status": "OVERRIDDEN",
            })
            return category, severity, True

        # Step d: Normal classification success with no safety keywords
        return category, severity, False

