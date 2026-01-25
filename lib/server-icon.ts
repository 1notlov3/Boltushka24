// Generates a lightweight, free default server icon as an SVG data URI.
// Used when the user doesn't upload an image.

export function serverIconDataUri(name: string) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";

  // Simple deterministic color based on first char code
  const code = letter.charCodeAt(0);
  const hue = (code * 47) % 360;
  const bg = `hsl(${hue} 70% 45%)`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" ry="28" fill="${bg}" />
  <text x="64" y="74" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="64" font-weight="800" fill="#ffffff">${letter}</text>
</svg>`;

  // Encode as data URI (SVG must be URI-encoded)
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");

  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}
