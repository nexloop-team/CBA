/**
 * Client quotes. Edited through /admin - the data lives in
 * settings/testimonials.json, where `show` hides the whole section.
 */
import data from "./settings/testimonials.json";

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company?: string;
}

export const showTestimonials = data.show;
export const testimonials: Testimonial[] = data.show ? data.items : [];
