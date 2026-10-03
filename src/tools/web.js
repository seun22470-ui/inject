const UA = "Mozilla/5.0 (compatible; ForgeAgent/1.0; +https://github.com/seun22470-ui/inject)";

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const strip = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function safeUrl(url) {
  const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http(s) URLs supported");
  return u;
}

export async function webSearch(query, max = 10) {
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA },
    });
    const h = await r.text();
    const results = [
      ...h.matchAll(
        /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g,
      ),
    ]
      .slice(0, max)
      .map((m) => {
        let u = decode(m[1]);
        const q = /uddg=([^&]+)/.exec(u);
        if (q) u = decodeURIComponent(q[1]);
        return { title: strip(m[2]), url: u, snippet: strip(m[3]) };
      });
    return results.length ? results : [{ title: "No results", url: "", snippet: "Try different words." }];
  } catch (err) {
    return [{ title: "Search Error", url: "", snippet: err.message }];
  }
}

export async function extractPage(url) {
  try {
    const u = safeUrl(url);
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "text/html,application/json,*/*" }, redirect: "follow" });
    const type = r.headers.get("content-type") ?? "";
    const body = await r.text();
    if (type.includes("json")) {
      try {
        return { url: r.url, status: r.status, type, json: JSON.parse(body) };
      } catch {}
    }
    if (!type.includes("html")) return { url: r.url, status: r.status, type, text: body };
    const meta = Object.fromEntries(
      [...body.matchAll(/<meta\s+[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)].map(
        (m) => [m[1], decode(m[2])],
      ),
    );
    const headings = [...body.matchAll(/<(h[1-4])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => `${m[1]}: ${strip(m[2])}`);
    const links = [...body.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => {
      let href = m[1];
      try {
        href = new URL(href, r.url).href;
      } catch {}
      return { text: strip(m[2]), href };
    });
    const images = [...body.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)].map((m) => {
      try {
        return new URL(m[1], r.url).href;
      } catch {
        return m[1];
      }
    });
    const tables = [...body.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((t) =>
      [...t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((row) =>
        [...row[0].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => strip(c[1])),
      ),
    );
    const jsonLd = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
    const text = strip(body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ""));
    return {
      url: r.url,
      status: r.status,
      title: strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1] ?? ""),
      meta,
      headings: headings.slice(0, 15),
      text: text.slice(0, 2000),
      links: links.slice(0, 20),
      images: images.slice(0, 10),
      tables,
      structuredData: jsonLd,
    };
  } catch (err) {
    return { error: err.message };
  }
}

const TECH = [
  ["Next.js", /__NEXT_DATA__|\/_next\//],
  ["React", /react(-dom)?(\.production)?(\.min)?\.js|data-reactroot|__REACT/i],
  ["Vue", /vue(\.runtime)?(\.min)?\.js|data-v-[a-f0-9]{6}/i],
  ["Tailwind CSS", /tailwind|class="[^"]*\b(?:flex|grid) [^"]*\b(?:px|py|mt|mb)-\d/],
  ["Supabase", /[a-z0-9]{20}\.supabase\.co/],
  ["Firebase", /firebase(app|io)?\.com/],
  ["Stripe", /js\.stripe\.com/],
];

export async function inspectSite(url) {
  try {
    const u = safeUrl(url);
    const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow" });
    const html = await r.text();
    const headers = Object.fromEntries(r.headers.entries());
    const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map((m) => new URL(m[1], r.url).href);
    const styles = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map(
      (m) => new URL(m[1], r.url).href,
    );
    return {
      url: r.url,
      status: r.status,
      server: headers["server"] ?? headers["x-powered-by"] ?? "unknown",
      technologies: TECH.filter(([, re]) => re.test(html)).map(([n]) => n),
      scripts: scripts.slice(0, 10),
      stylesheets: styles.slice(0, 10),
    };
  } catch (err) {
    return { error: err.message };
  }
}
