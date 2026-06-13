/**
 * Client-side free-mode flag. In free mode the app is fully automatic and
 * manual on-demand analysis (AI prediction / Dixon-Coles value engine) is
 * hidden — its provider cost is unbounded. Mirrors the server FREE_MODE; set
 * NEXT_PUBLIC_FREE_MODE=false (alongside FREE_MODE=false) to re-enable.
 */
export const FREE_MODE = process.env.NEXT_PUBLIC_FREE_MODE !== 'false'
