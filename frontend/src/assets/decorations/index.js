import boombox from "./boombox.png";
import guitar from "./guitar.png";
import microphones from "./microphones.png";
import musicalNotes from "./musical-notes.png";
import saxophone from "./saxophone.png";
import starCyan from "./star-cyan.png";
import starPink from "./star-pink.png";
import trebleNotes from "./treble-notes.png";
import vinyl from "./vinyl.png";

/** Left / right rails — evenly spaced by CSS flex (see PageDecorations). */
export const leftDecorations = [
  { id: "star-cyan", src: starCyan, className: "deco deco--sm" },
  { id: "musical-notes", src: musicalNotes, className: "deco deco--sm" },
  { id: "microphones", src: microphones, className: "deco" },
  { id: "vinyl", src: vinyl, className: "deco" },
  { id: "treble-notes", src: trebleNotes, className: "deco deco--sm" },
];

export const rightDecorations = [
  { id: "boombox", src: boombox, className: "deco deco--lg" },
  { id: "guitar", src: guitar, className: "deco" },
  { id: "saxophone", src: saxophone, className: "deco" },
  { id: "treble-notes-right", src: trebleNotes, className: "deco deco--sm" },
  { id: "star-pink", src: starPink, className: "deco deco--sm" },
];
