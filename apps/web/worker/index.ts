/**
 * Non-navigation requests that miss a static asset end here. Browser
 * navigation uses Cloudflare's configured SPA fallback to index.html.
 */
export default {
  fetch(): Response {
    return Response.json(
      { error: { code: "not_found", message: "Resource not found." } },
      { status: 404 },
    );
  },
};
