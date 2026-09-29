/**
 * Studio page + home intro copy.
 *
 * settings/studio.json is edited through /admin. settings/studio-copy.json
 * (about paragraphs, principles, process) is deliberately kept out of the
 * admin and edited by hand.
 */
import data from "./settings/studio.json";
import copy from "./settings/studio-copy.json";

export interface Studio {
  /** Home page intro - kept short; the full statement lives on /studio. */
  intro: string;
  /** Opening statement on /studio. */
  statement: string;
  about: string[];
  founder: {
    name: string;
    title: string;
    /** Empty hides the paragraph. */
    bio: string;
    /** Repo path, e.g. "/content/studio/portrait.jpg". Empty uses a project photo. */
    portrait: string;
  };
  pillars: { title: string; body: string }[];
  process: { step: string; title: string; body: string }[];
  /** Hides the "By the numbers" section when false. */
  showStats: boolean;
  stats: { value: number; suffix: string; label: string }[];
  /** e.g. a COA registration number. Empty hides it. */
  credentials: string;
}

export const studio = { ...copy, ...data } as Studio;
