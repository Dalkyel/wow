# Connections explorer

Opens from the "Explore Connections" header button, a figure profile, or a timeline node's detail panel. Shows a local, expandable sub-graph around one root entity — independent of the main timeline's layout — so you can drill into one figure's or event's immediate relationships without the rest of the archive in view.

- Starts with the root plus up to 12 direct neighbors, prioritized toward the curated `FIGURE_KEY_LINKS` hints where available, then toward other figures.
- Click a node to select it and reveal more of its neighbors; click again (or "Collapse this branch") to fold a branch back in.
- Filter by kind (figures/factions/events/locations/artifacts/lore) or by relationship type.
- Click an edge to see every individual recorded link between the two endpoints, with its volume/section.
- "Full timeline ↗" jumps back to the main timeline, selecting the current node there.
- In-session only — no persistence, and it never mutates the main timeline's own layout.
