import { Router } from "@invisement/husk";

const router = new Router();

// 1. Static Routes (serving from 'dist' folders managed by husk/build.ts)
router.push("/editor-editable/:path*", "editor-editable/dist/:path");

router.push("/:path*", "ui/dist/:path");

Deno.serve(router.serverInfo(), async (req) => {
	const url = new URL(req.url);

	// Root redirects
	if (url.pathname === "/") {
		return Response.redirect(new URL("/index.html", req.url));
	}
	if (url.pathname === "/editor-editable" || url.pathname === "/editor-editable/") {
		return Response.redirect(new URL("/editor-editable/index.html", req.url));
	}

	const resp = await router.serve(req);
	return resp || new Response("404: Not Found", { status: 404 });
});
