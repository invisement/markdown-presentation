import { Router } from "@invisement/husk";
import { uiOutDir } from "./config.ts";

const router = new Router();

// Serve built UI files
router.push("/:path*", `${uiOutDir}/:path`);

console.log(`Server starting on http://localhost:8000`);

Deno.serve(async (req) => {
	// Redirect root to the HTML file
	if (new URL(req.url).pathname === "/") {
		return Response.redirect(new URL("/index.html", req.url));
	}

	const resp = await router.serve(req);
	if (resp === null) {
		return new Response("404: Resource Not Found!", { status: 404 });
	}
	return resp;
});
