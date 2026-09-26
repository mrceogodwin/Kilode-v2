import { postBodyToSafeHtml } from "@/lib/post-body";

/** Renders a Feeds post body: sanitized HTML subset, or legacy plain text as paragraphs. */
export function PostBody({
  body,
  className = "mt-5 max-w-full space-y-3 overflow-x-hidden break-words text-[15px] leading-7 text-fg/90 [overflow-wrap:anywhere] [&_a]:break-all [&_a]:text-lime-2 [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_img]:my-3 [&_img]:max-h-80 [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic",
}: {
  body: string;
  className?: string;
}) {
  const html = postBodyToSafeHtml(body);
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
