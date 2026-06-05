import Link from "next/link";

import { BLOG_CATEGORIES, BLOG_CATEGORY_LABELS } from "@/lib/blog";

type Props = {
  activeCategory?: string;
};

export function BlogCategoryNav({ activeCategory }: Props) {
  const active = activeCategory?.trim() || "";

  return (
    <nav className="landing-blog-categories" aria-label="Blog categories">
      <Link
        href="/blog"
        className={`landing-blog-category-pill${!active ? " landing-blog-category-pill--active" : ""}`}
      >
        All
      </Link>
      {BLOG_CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`/blog?category=${encodeURIComponent(cat)}`}
          className={`landing-blog-category-pill${
            active === cat ? " landing-blog-category-pill--active" : ""
          }`}
        >
          {BLOG_CATEGORY_LABELS[cat]}
        </Link>
      ))}
    </nav>
  );
}
