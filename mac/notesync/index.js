// window.NoteSync: the notes' Yjs model for web/notes.js and the live line of a shared note. Built into ../Resources/web/notesync.js.
import { AiOrigin, KNOWN_TYPES, NoteModel, Y, diffText, newId, plainOf, specOf, validId } from './model.js';
import { SharedProvider } from './provider.js';

const b64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

window.NoteSync = { Y, NoteModel, AiOrigin, SharedProvider, KNOWN_TYPES, diffText, newId, plainOf, specOf, validId, b64, unb64, version: 2 };
