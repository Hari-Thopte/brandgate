/** Order validated findings by their start offset in the source copy. */
export function orderFindingsByCopyPosition(findings) {
  return [...findings].sort((left, right) => left.span_start - right.span_start);
}
