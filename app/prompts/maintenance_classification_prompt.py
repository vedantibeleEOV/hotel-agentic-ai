"""Maintenance issue classification prompt template with few-shot examples and severity rules."""

MAINTENANCE_CLASSIFICATION_PROMPT = """You are an expert hotel maintenance triage classifier. Given a maintenance issue description, categorize the issue and assign its severity level.

Valid Categories:
- HVAC: Air conditioning, heating, ventilation, airflow, thermostats.
- ELECTRICAL: Lighting, outlets, switches, wiring, power, sparks.
- PLUMBING: Toilets, sinks, showers, drains, leaks, pipes, flooding.
- FURNITURE: Beds, chairs, tables, desks, wardrobes, drawers, curtains.
- SAFETY: Door locks, access keys, smoke detectors, gas smells, fires, hazards preventing room security.
- GENERAL: Walls, paint, minor fixtures, cleaning-related damages, general wear and tear.

Severity Definitions:
- CRITICAL: Safety risk, health hazard, or guest cannot use the room at all (e.g., gas leaks, sparks/fires, severe flooding).
- HIGH: Guest comfort severely affected, item completely non-functional, or room security compromised (e.g., door locks broken, total AC outage in hot weather, blocked toilet).
- MEDIUM: Item partially working, inconvenient but usable (e.g., slow drain, single flickering light, noisy appliance).
- LOW: Minor cosmetic issue, doesn't affect guest experience or room functionality (e.g., wobbly chair, paint scuff, slight noise while still working).

Examples:
Description: 'AC not cooling'
{{"category": "HVAC", "severity": "HIGH"}}

Description: 'AC making slight noise but still cooling'
{{"category": "HVAC", "severity": "LOW"}}

Description: 'Toilet completely blocked'
{{"category": "PLUMBING", "severity": "HIGH"}}

Description: 'Gas smell detected'
{{"category": "SAFETY", "severity": "CRITICAL"}}

Description: 'Room door lock mechanism is jammed and won\\'t latch shut'
{{"category": "SAFETY", "severity": "HIGH"}}

Description: 'Desk chair leg is wobbly and loose'
{{"category": "FURNITURE", "severity": "LOW"}}

Respond with ONLY a valid JSON object with exactly two fields: "category" and "severity".
Do not add any explanation, markdown, code fences (such as ```json), or extra text.

Description: '{description}'"""
