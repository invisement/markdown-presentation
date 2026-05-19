import { Router } from "@invisement/husk";

const router = new Router();

// 1. Static Routes (serving from 'dist' folders managed by husk/build.ts)
router.push("/easymde/dist/:path*", "editor-easymde/dist/:path");
router.push("/tiptap/dist/:path*", "editor-tiptap/dist/:path");
router.push("/editor-prose/dist/:path*", "editor-prose/dist/:path");

router.push("/easymde/:path*", "editor-easymde/dist/:path");
router.push("/tiptap/:path*", "editor-tiptap/dist/:path");
router.push("/editor-prose/:path*", "editor-prose/dist/:path");
router.push("/editor-editable/:path*", "editor-editable/dist/:path");

router.push("/:path*", "ui/dist/:path");

Deno.serve(router.serverInfo(), async (req) => {
	const url = new URL(req.url);

	// Root redirects
	if (url.pathname === "/") {
		return Response.redirect(new URL("/index.html", req.url));
	}
	if (url.pathname === "/easymde" || url.pathname === "/easymde/") {
		return Response.redirect(new URL("/easymde/index.html", req.url));
	}
	if (url.pathname === "/tiptap" || url.pathname === "/tiptap/") {
		return Response.redirect(new URL("/tiptap/index.html", req.url));
	}
	if (url.pathname === "/editor-prose" || url.pathname === "/editor-prose/") {
		return Response.redirect(new URL("/editor-prose/index.html", req.url));
	}
	if (url.pathname === "/editor-prose/dist" || url.pathname === "/editor-prose/dist/") {
		return Response.redirect(new URL("/editor-prose/dist/index.html", req.url));
	}
	if (url.pathname === "/editor-editable" || url.pathname === "/editor-editable/") {
		return Response.redirect(new URL("/editor-editable/index.html", req.url));
	}

	const resp = await router.serve(req);
	return resp || new Response("404: Not Found", { status: 404 });
});
