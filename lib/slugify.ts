import { nanoid } from "nanoid";

export function generateQrSlug(): string {
  return nanoid(8);
}
