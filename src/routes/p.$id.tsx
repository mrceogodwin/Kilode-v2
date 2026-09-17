import { createFileRoute, Link } from "@tanstack/react-router";
import { DEMO_POSTS } from "@/lib/qonvo-seed";
import { listPosts } from "@/lib/forum-server";
import { seoHead } from "@/lib/seo";
import { timeLabel, handleColor, type Post } from "@/lib/qonvo-data";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }): Promise<{ post: Post | null }> => {
    const id = (params as { id: string }).id;
    const rows = await listPosts().catch(() => [] as Post[]);
    const all = rows.length ? (rows as Post[]) : DEMO_POSTS;
    const post = all.find((p) => p.id === id || p.slug === id) ?? DEMO_POSTS.find((p) => p.id === id || p.slug === id) ?? null;
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return seoHead({ title: "Post", path: "/p/" });
    return seoHead({
      title: post.title,
      description: post.excerpt || post.body.slice(0, 160),
      path: `/p/${post.slug || post.id}`,
      image: post.image ?? undefined,
      type: "article",
    });
  },
  component: PublicPost,
});

function PublicPost() {
  const data = Route.useLoaderData() as { post: Post | null };
  const post = data?.post;
  if (!post) {
    return (
      <main className="grid min-h-svh place-items-center bg-bg p-6 text-fg">
        <div>
          <p className="text-sm text-muted">That post is gone.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-lime-2">
            Back to Kilode
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-svh bg-bg text-fg">
      <header className="border-b border-line px-4 py-3">
        <Link to="/" className="text-sm text-lime-2">
          ← Kilode
        </Link>
      </header>
      <article className="mx-auto max-w-2xl px-4 py-6">
        <div className="text-[11px] font-bold tracking-wide text-lime-2 uppercase">{post.category || "General"}</div>
        <h1 className="mt-1 text-2xl font-extrabold">{post.title}</h1>
        <p className="mt-2 text-xs text-muted">
          <span style={{ color: handleColor(post.author) }}>{post.author}</span> · {timeLabel(post.ts)}
        </p>
        {post.image ? <img src={post.image} alt="" className="mt-4 w-full rounded-xl object-cover" /> : null}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
      </article>
    </main>
  );
}
