import jsPDF from "jspdf";

export const RED: readonly [
  number,
  number,
  number
] = [197, 31, 42];

export const DARK: readonly [
  number,
  number,
  number
] = [53, 53, 53];

export const GRAY: readonly [
  number,
  number,
  number
] = [105, 105, 105];

export const LIGHT_GRAY: readonly [
  number,
  number,
  number
] = [225, 225, 225];

export const LIGHT: readonly [
  number,
  number,
  number
] = [245, 232, 232];

export const WHITE: readonly [
  number,
  number,
  number
] = [255, 255, 255];

export const GREEN: readonly [
  number,
  number,
  number
] = [45, 125, 70];

export const PALE_GREEN: readonly [
  number,
  number,
  number
] = [235, 248, 238];

export function safeText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

export function money(
  amount: number,
  currency = "KES"
) {
  const formatted =
    new Intl.NumberFormat("en-KE", {
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  return `${currency} ${formatted}`;
}

export function setText(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  size: number,
  color = DARK,
  weight: "normal" | "bold" = "normal",
  align: "left" | "center" | "right" = "left"
) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);

  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );

  doc.text(safeText(value), x, y, {
    align,
  });
}

export function drawLine(
  doc: jsPDF,
  y: number,
  color = LIGHT_GRAY,
  lineWidth = 0.25
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );

  doc.setLineWidth(lineWidth);

  doc.line(8, y, 72, y);
}

export function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color = GRAY,
  weight: "normal" | "bold" = "normal",
  lineHeight = 3.5,
  align: "left" | "center" | "right" = "left"
) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);

  const lines =
    doc.splitTextToSize(
      safeText(text),
      maxWidth
    );

  lines.forEach(
    (line: string, index: number) => {
      setText(
        doc,
        line,
        x,
        y + index * lineHeight,
        size,
        color,
        weight,
        align
      );
    }
  );

  return (
    y +
    lines.length * lineHeight
  );
}