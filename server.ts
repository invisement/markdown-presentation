import { Router } from "@invisement/husk";
import { watchUI } from "@invisement/husk/transpile-ui";
import {
	importMapFile,
	uiEntrypoints,
	uiOutDir,
	uiSourceDir,
} from "./config.ts";

// if cli has --watch-ui serve dev raw files, otherwise serve prod files
const isDev = Deno.args.includes("--watch-ui");
const uiDir = isDev
	? await watchUI(uiSourceDir, uiEntrypoints, importMapFile)
	: uiOutDir;
console.log("UI Out Directory is", uiDir);

const router = new Router();

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
