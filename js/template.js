/* QWQ Builder · жасалатын қосымшаның HTML қабығы және AI жауабын бөліктерге ажырату.
   AI белгілеуді (HTML), толық дизайнды (CSS) және логиканы (JS) нөлден жазады. */
(function (Q) {
  // Шаблон жоқ: тек HTML қабығы. Дизайн (CSS), белгілеу және бүкіл логиканы (JS) модель нөлден жазады
  const BASE = String.raw`<!doctype html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{{TITLE}}</title>
<style>
*{box-sizing:border-box}html{height:100%}body{margin:0;min-height:100%}
/*APP_CSS*/
</style>
</head>
<body>
<!--APP_BODY-->
<script>
//APP_JS
</script>
</body>
</html>`;

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function build(title, body, css, js) {
    const m = body.match(/<body[^>]*>([\s\S]*?)(?:<\/body>|$)/i);
    if (m) body = m[1];
    css = (css || "").replace(/<\/?style[^>]*>/gi, "");
    js = (js || "").replace(/<\/?script[^>]*>/gi, "").replace(/<\/script/gi, "<\\/script");
    return BASE.replace("{{TITLE}}", () => esc(title))
      .replace("/*APP_CSS*/", () => css)
      .replace("<!--APP_BODY-->", () => body.trim())
      .replace("//APP_JS", () => js);
  }

  /** AI жауабын (===HTML=== / ===CSS=== / ===JS=== / ===END===) бөліктерге ажырату; жартылай жауапқа да жарайды */
  function parse(text) {
    let t = text.replace(/^\s*```[a-zA-Z]*\s*\n/, "");
    const hi = t.indexOf("===HTML===");
    if (hi < 0) return { body: "", css: "", js: "", stage: 0, end: false };
    t = t.slice(hi + 10);
    const ci = t.indexOf("===CSS==="), ji = t.indexOf("===JS==="), ei = t.indexOf("===END===");
    const cut = (s, e) => s.slice(0, e < 0 ? s.length : e).replace(/\n?```\s*$/, "").trim();
    const body = cut(t, ci >= 0 ? ci : ji >= 0 ? ji : ei);
    const css = ci < 0 ? "" : cut(t.slice(ci + 9), ji >= 0 ? ji - ci - 9 : ei >= 0 ? ei - ci - 9 : -1);
    const js = ji < 0 ? "" : cut(t.slice(ji + 8), ei >= 0 ? ei - ji - 8 : -1);
    return { body, css, js, stage: ei >= 0 ? 4 : ji >= 0 ? 3 : ci >= 0 ? 2 : 1, end: ei >= 0 };
  }

  Q.template = { build, parse };
})(window.QWQ);
