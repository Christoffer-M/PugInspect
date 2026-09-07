import { expect, it } from "vitest";
import { PAGES, renderPage } from "./prerender.mjs";

const TEMPLATE = `<!doctype html>
<html lang="en">
<head><!--seo:start--><title>PugInspect</title><!--seo:end--></head>
<body><!--body:start--><div id="app"></div><!--body:end--></body>
</html>`;

it("gives every static page a unique, well-sized title, a canonical and an h1", () => {
  const titles = new Set();
  for (const page of PAGES) {
    const html = renderPage(TEMPLATE, page);
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(html).toContain(`<link rel="canonical" href="https://puginspect.com${page.path}" />`);
    expect(html).toContain(`<h1>${page.h1}</h1>`);
    // Semrush flags titles outside 30-60 characters (audit issues 101 and 102).
    expect(page.title.length, page.title).toBeGreaterThanOrEqual(30);
    expect(page.title.length, page.title).toBeLessThanOrEqual(60);
    titles.add(page.title);
  }
  expect(titles.size).toBe(PAGES.length);
});

it("links every other static page so a crawler can reach them without JavaScript", () => {
  for (const page of PAGES) {
    const html = renderPage(TEMPLATE, page);
    for (const other of PAGES.filter((p) => p.path !== page.path)) {
      expect(html).toContain(`href="https://puginspect.com${other.path}"`);
    }
  }
});

it("keeps the markers, so the backend can still inject character meta", () => {
  const html = renderPage(TEMPLATE, PAGES[0]);
  expect(html).toContain("<!--seo:start-->");
  expect(html).toContain("<!--body:end-->");
  expect(renderPage(html, PAGES[0])).toBe(html);
});
