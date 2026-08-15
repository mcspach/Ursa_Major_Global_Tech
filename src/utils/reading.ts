/**
 * Reading time, derived from a post's markdown body.
 *
 * Hand-set read times drift the moment copy changes — every post on this site
 * claimed 5–7 minutes for what was actually about two. Deriving it means the
 * number can't lie. A post's `readTime` frontmatter still wins when it's set,
 * for the cases where a word count misleads (heavy code blocks, big diagrams).
 *
 * 200 wpm is the conservative end of the usual 200–265 range, so the estimate
 * errs toward generous rather than rushing the reader.
 */
const WORDS_PER_MINUTE = 200;

export const readingTime = (body = "") => {
  const words = body
    // Fenced code isn't read at prose speed, and counting it inflates badly.
    .replace(/```[\s\S]*?```/g, " ")
    // Keep link text, drop the URL.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`>_~|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
};
