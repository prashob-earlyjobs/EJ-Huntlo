import Link from "next/link";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import {
  blogCategoryLabel,
  formatBlogDate,
  type BlogPostSummary,
} from "@/lib/blog";

type Props = {
  post: BlogPostSummary;
  variant?: "default" | "featured";
};

export function BlogPostCard({ post, variant = "default" }: Props) {
  const href = `/blog/${encodeURIComponent(post.slug)}`;
  const isFeatured = variant === "featured";

  return (
    <article
      className={`landing-blog-card group${isFeatured ? " landing-blog-card--featured" : ""}`}
    >
      <Link href={href} className="landing-blog-card-link">
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt=""
            className="landing-blog-card-cover"
            loading="lazy"
          />
        ) : (
          <div className="landing-blog-card-cover landing-blog-card-cover--placeholder" aria-hidden>
            <MaterialIcon name="article" className="text-3xl text-[#0050cb]/70" />
          </div>
        )}
        <div className="landing-blog-card-body">
          <div className="landing-blog-card-meta">
            <span className="landing-blog-chip">{blogCategoryLabel(post.category)}</span>
            {post.publishedAt ? (
              <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
            ) : null}
            <span>{post.readTimeMinutes} min read</span>
          </div>
          <h2 className="landing-blog-card-title">{post.title}</h2>
          {post.excerpt ? <p className="landing-blog-card-excerpt">{post.excerpt}</p> : null}
          <span className="landing-blog-card-cta">
            Read article
            <MaterialIcon name="arrow_forward" className="text-base" />
          </span>
        </div>
      </Link>
    </article>
  );
}
