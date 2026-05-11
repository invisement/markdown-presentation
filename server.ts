import { Router } from "@invisement/husk";
import {
	importMapFile,
	uiEntrypoints,
	uiOutDir,
	uiSourceDir,
} from "./config.ts";

const router = new Router();

// Auto-initialize UI (handles transpilation in dev mode)
const uiDir = await router.initUI({
	source: uiSourceDir,
	entrypoints: uiEntrypoints,
	output: uiOutDir,
	importMap: importMapFile,
});

// Serve ui files
router.push("/:path*", `${uiDir}/:path`);

Deno.serve(async (req) => {
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
