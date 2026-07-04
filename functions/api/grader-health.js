/* GET /api/grader-health -> { available, reason }
 * Cheap check the client can use to decide whether to offer the AI button at
 * all. "available:false" simply means the app shows its non-AI fallback. */
const GLOBAL_DAILY = 300;

export async function onRequestGet(context) {
  const { env } = context;
  const out = (available, reason) =>
    new Response(JSON.stringify({ available, reason }), { headers: { "content-type": "application/json" } });
  try {
    if (!env.AI || !env.GRADER) return out(false, "not-configured");
    const today = new Date().toISOString().slice(0, 10);
    const gN = parseInt((await env.GRADER.get("g:" + today)) || "0", 10) || 0;
    if (gN >= GLOBAL_DAILY) return out(false, "global-cap");
    return out(true, "ok");
  } catch (e) {
    return out(false, "error");
  }
}
