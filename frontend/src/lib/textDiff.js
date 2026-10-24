function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** Render a bounded word-level diff as escaped insertion and deletion markup. */
export function renderWordDiff(before, after) {
  const left = before.match(/\s+|[^\s]+/g) || [];
  const right = after.match(/\s+|[^\s]+/g) || [];
  if (left.length * right.length > 120000) return `<del>${escapeHtml(before)}</del><ins>${escapeHtml(after)}</ins>`;
  const grid = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) grid[i][j] = left[i] === right[j] ? grid[i + 1][j + 1] + 1 : Math.max(grid[i + 1][j], grid[i][j + 1]);
  let i = 0; let j = 0; let markup = '';
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) { markup += escapeHtml(left[i]); i++; j++; }
    else if (i < left.length && (j === right.length || grid[i + 1][j] >= grid[i][j + 1])) { markup += `<del>${escapeHtml(left[i])}</del>`; i++; }
    else { markup += `<ins>${escapeHtml(right[j])}</ins>`; j++; }
  }
  return markup;
}
