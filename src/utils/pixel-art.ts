export function svgSource(content: string, width: number, height: number): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${content}</svg>`,
  )}`;
}

export function pixelArtSource(rows: readonly string[], palette: Record<string, string>): string {
  const rects = rows.flatMap((row, y) => Array.from(row, (pixel, x) =>
    palette[pixel] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[pixel]}"/>` : '',
  ));
  return svgSource(rects.join(''), Math.max(...rows.map((row) => row.length)), rows.length);
}
