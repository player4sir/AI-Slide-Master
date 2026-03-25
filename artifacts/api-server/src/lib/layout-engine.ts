export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function flexRow(options: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  gap: number;
  justify?: "start" | "center" | "space-between";
}): LayoutRect[] {
  const { x, y, w, h, count, gap, justify = "space-between" } = options;
  if (count === 0) return [];
  
  if (justify === "space-between") {
    const itemW = (w - gap * (count - 1)) / count;
    return Array.from({ length: count }, (_, i) => ({
      x: x + i * (itemW + gap),
      y, w: itemW, h
    }));
  } else {
    // If center, we might assume items have a fixed width, but here we just auto-fill
    const itemW = (w - gap * (count - 1)) / count;
    return Array.from({ length: count }, (_, i) => ({
      x: x + i * (itemW + gap),
      y, w: itemW, h
    }));
  }
}

export function flexGrid(options: {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  columns: number;
  gapX: number;
  gapY: number;
}): LayoutRect[] {
  const { x, y, w, h, count, columns, gapX, gapY } = options;
  const rows = Math.ceil(count / columns);
  if (count === 0) return [];

  const itemW = (w - gapX * (columns - 1)) / columns;
  const itemH = (h - gapY * (rows - 1)) / rows;
  
  return Array.from({ length: count }, (_, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      x: x + col * (itemW + gapX),
      y: y + row * (itemH + gapY),
      w: itemW,
      h: itemH
    };
  });
}
