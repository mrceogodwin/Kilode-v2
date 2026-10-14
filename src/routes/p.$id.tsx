import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicPost } from "@/lib/forum-server";
import { seoHead } from "@/lib/seo";
import { timeLabel, handleColor, type Post } from "@/lib/qonvo-data";
import { PostBody } from "@/components/post-body";
import { postBodyPlain } from "@/lib/post-body";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }): Promise<{ post: Post | null }> => {
    const id = (params as { id: string }).id;
    const row = await getPublicPost({ data: id }).catch(() => null);
    const post = (row as Post | null) ?? null;
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return seoHead({ title: "Post", path: "/p/" });
    return seoHead({
      title: post.title,
      description: (post.excerpt || postBodyPlain(post.body || "")).slice(0, 160),
      path: `/p/${post.slug || post.id}`,
      image: post.image ?? undefined,
      type: "article",
      published: new Date(post.ts).toISOString(),
      author: post.author,
      keywords: [post.category, post.tags].filter(Boolean).join(", "),
    });
  },
  component: PublicPost,
});

function PublicPost() {
  const data = Route.useLoaderData() as { post: Post | null };
  const post = data?.post;
  if (!post) {
    return (
      <main className="grid min-h-svh place-items-center bg-white p-6 text-[#172033]">
        <div className="text-center">
          <p className="text-sm text-[#64748B]">That post is gone.</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-[#1877F2]">
            Back to Kilode
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="read-page min-h-svh bg-white text-[#172033]">
      <header className="sticky top-0 z-10 border-b border-[#E7ECF2] bg-white/95 px-4 py-3 backdrop-blur">
        <Link to="/" className="text-[13px] font-semibold text-[#1877F2]">
          ← Kilode
        </Link>
      </header>
      <article className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="text-[11px] font-bold tracking-[0.08em] text-[#1877F2] uppercase">{post.category || "General"}</div>
        <h1 className="mt-2 text-[22px] font-extrabold leading-[1.25] tracking-tight text-[#172033]">{post.title}</h1>
        <p className="mt-2 text-[12px] text-[#64748B]">
          <span className="font-semibold" style={{ color: handleColor(post.author) }}>{post.author}</span>
          <span className="mx-1.5">·</span>
          {timeLabel(post.ts)}
        </p>
        {post.image ? (
          <img
            src={post.image}
            alt=""
            className="mt-5 w-full rounded-2xl object-cover"
            style={{ maxHeight: 360 }}
          />
        ) : null}
        <PostBody
          body={post.body || ""}
          className="mt-5 text-[15px] leading-[1.65] text-[#172033] [&_a]:text-[#1877F2] [&_a]:underline [&_h2]:mt-5 [&_h2]:text-[18px] [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_img]:my-4 [&_img]:max-h-80 [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_p]:mb-3"
        />
        {post.comments?.length ? (
          <section className="mt-10 border-t border-[#EEF1F5] pt-5">
            <h2 className="text-[13px] font-bold text-[#172033]">Comments</h2>
            <ul className="mt-3 space-y-4">
              {post.comments.map((c) => (
                <li key={c.ts} className="text-[14px]">
                  <span className="font-semibold" style={{ color: handleColor(c.author) }}>{c.author}</span>
                  <span className="ml-2 text-[11px] text-[#94A3B8]">{timeLabel(c.ts)}</span>
                  <p className="mt-1 whitespace-pre-wrap text-[#64748B]">{c.body}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
