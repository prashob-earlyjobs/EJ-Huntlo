type Props = {
  html: string;
};

export function BlogArticleBody({ html }: Props) {
  if (!html.trim()) return null;
  return (
    <div
      className="landing-blog-article-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
