// Shared bounded-output chunking for the reader/verifier scripts. Keeps non-BMP
// characters intact across a page boundary when stdout encodes each page as UTF-8.
function paginate(payload, pageSize = 8000, { preferLines = false } = {}) {
  const chunks = [];
  for (let start = 0; start < payload.length;) {
    let end = Math.min(start + pageSize, payload.length);
    if (preferLines && end < payload.length) {
      const lineEnd = payload.lastIndexOf('\n', end - 1);
      if (lineEnd >= start) end = lineEnd + 1;
    }
    if (end < payload.length && /[\uD800-\uDBFF]/.test(payload[end - 1])) end--;
    chunks.push(payload.slice(start, end));
    start = end;
  }
  return chunks.length ? chunks : [''];
}

module.exports = { paginate };
