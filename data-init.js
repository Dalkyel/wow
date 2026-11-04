// Load every recorded volume, update, connection, and timeline entry before building the UI.
const archive = ArchiveData.merge([
  { volume: 0, nodes: nodesVolume0, links: linksVolume0, timeline: timelineVolume0 },
  { volume: 1, nodes, links, timeline },
  { volume: 2, nodes: nodesVolume2, links: linksVolume2, timeline: timelineVolume2 },
  { volume: 3, nodes: nodesVolume3, links: linksVolume3, timeline: timelineVolume3 },
  { volume: 4, nodes: nodesVolume4, links: linksVolume4, timeline: timelineVolume4 },
]);
const MAX_VOLUME = archive.maxVolume;
const DATA_LABEL = `Complete archive · Volumes 1–${MAX_VOLUME}`;
const figureSourceRevisions = archive.revisions;
nodes.splice(0, nodes.length, ...archive.nodes);
links.splice(0, links.length, ...archive.links);
timeline.splice(0, timeline.length, ...archive.timeline);
