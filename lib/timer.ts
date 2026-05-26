/**
 * Handle returned by `window.setTimeout` in the browser (a numeric ID).
 *
 * Do not use `ReturnType<typeof setTimeout>` or `ReturnType<typeof window.setTimeout>`
 * for refs: with `@types/node`, TypeScript can merge timer overloads and infer
 * `NodeJS.Timeout`, which does not match the browser's numeric return type and
 * breaks `next build` / Vercel typecheck.
 */
export type BrowserTimerId = number;
