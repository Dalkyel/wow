# Readability

- **Legend** — a collapsible panel (top-left) listing every category color present in the loaded data, and reminding you that the horizontal axis follows whichever mode (Chronology / Reading order) is active.
- **Label decluttering** — unlike tSotG's force graph, timeline positions are fixed by era/lane rather than physics-simulated, so label overlap is mostly a left-to-right spacing problem within one lane at low zoom. `readability.js` hides lower-priority labels (closer than ~46 screen pixels to an already-shown one) rather than running the heavier screen-space collision budget tSotG's map needed for free-floating nodes. The selected node's label is always shown.
- Selected status and keyboard focus all work the same way as tSotG's map: `Tab` through visible events, `Enter`/`Space` to open a node's detail panel.
