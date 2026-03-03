/**
 * Export a canvas as a PNG blob and trigger download.
 */
export function downloadPNG(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename.replace(/\.\w+$/, "") + ".png");
  }, "image/png");
}

/**
 * Export a canvas as a PDF using jsPDF.
 */
export async function downloadPDF(
  canvas: HTMLCanvasElement,
  filename: string,
  widthInches: number,
  heightInches: number
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const orientation = widthInches > heightInches ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "in",
    format: [widthInches, heightInches],
  });

  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, widthInches, heightInches);
  pdf.save(filename.replace(/\.\w+$/, "") + ".pdf");
}

/**
 * Export canvas content as an SVG string and trigger download.
 * Builds a simple SVG by rasterizing the canvas as an embedded image.
 */
export function downloadSVG(
  canvas: HTMLCanvasElement,
  filename: string,
  widthInches: number,
  heightInches: number
): void {
  const imgData = canvas.toDataURL("image/png");
  const svgWidth = widthInches * 300;
  const svgHeight = heightInches * 300;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <image width="${svgWidth}" height="${svgHeight}" href="${imgData}" />
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename.replace(/\.\w+$/, "") + ".svg");
}

/**
 * Get a blob URL for the canvas for preview display.
 */
export function canvasToBlobURL(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Failed to create blob"));
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revocation so browser has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
