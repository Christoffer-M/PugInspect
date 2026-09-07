import React from "react";

/** The DS is dark-only: the app paints `html, body` #060b16 (globals.css).
 *  Preview cards render on white, so every story sits on the page surface. */
export const Surface: React.FC<{ children: React.ReactNode; w?: number | string }> = ({ children, w = 520 }) => (
  <div style={{ background: "#060b16", padding: 20, borderRadius: 8, maxWidth: "100%", width: w }}>{children}</div>
);
