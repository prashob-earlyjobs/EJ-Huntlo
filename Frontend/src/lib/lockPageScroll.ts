const LOCK_CLASS = "landing-scroll-locked";
const SCROLL_Y_KEY = "landingScrollY";

function getScrollbarWidth(): number {
  const measured = window.innerWidth - document.documentElement.clientWidth;
  if (measured > 0) return measured;

  const doc = document.documentElement;
  const canScroll = doc.scrollHeight > doc.clientHeight;
  return canScroll ? 17 : 0;
}

export function lockPageScroll(): void {
  if (document.documentElement.classList.contains(LOCK_CLASS)) return;

  const scrollY = window.scrollY;
  const scrollbarWidth = getScrollbarWidth();

  document.documentElement.classList.add(LOCK_CLASS);
  document.documentElement.style.setProperty(
    "--landing-scrollbar-width",
    `${scrollbarWidth}px`
  );
  document.body.dataset[SCROLL_Y_KEY] = String(scrollY);

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockPageScroll(): void {
  if (!document.documentElement.classList.contains(LOCK_CLASS)) return;

  const scrollY = Number(document.body.dataset[SCROLL_Y_KEY] || "0");

  document.documentElement.classList.remove(LOCK_CLASS);
  document.documentElement.style.removeProperty("--landing-scrollbar-width");

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  delete document.body.dataset[SCROLL_Y_KEY];

  window.scrollTo(0, scrollY);
}
