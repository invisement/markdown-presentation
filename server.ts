import { Router } from "@invisement/husk";

const router = new Router();

// Auto-initialize UI (discovery from deno.json)
const uiDir = await router.initUI();

// Serve ui files
router.push("/:path*", `${uiDir}/:path`);

Deno.serve(router.serverInfo(), async (req) => {
	// Redirect root to the HTML file
	if (req.url.endsWith("/")) {
		return Response.redirect(req.url + "index.html");
	}

	const resp = await router.serve(req);
	if (resp === null) {
		return new Response("404: Resource Not Found!", { status: 404 });
	}
	return resp;
});
