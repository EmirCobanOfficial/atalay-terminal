'use strict';
// The shared notes' side of the notes bridges (the dashboard's `notes` and a note window's `noteWindow`), the Mac's NotesSync
// (NotesStore.swift): a ticket for a note's live socket (the page opens it; this side only makes the ticket and the address,
// cloud.js), its Yjs document file (notesstore.js), the files in notes (attachments.js), and whether a note holds a password
// or key before it's shared (only yes or no goes back).
const { Y_MAX } = require('./notesstore');

const TYPES = new Set([
  'syncCaps', 'syncTicket', 'saveY', 'loadY', 'secretCheck',
  'attPick', 'attAdd', 'attHas', 'attRead', 'attSave', 'attUpload', 'attDownload', 'attRemove', 'attForget', 'attAdds',
]);
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** store: notesstore.js; attachments: attachments.js; cloud: cloud.js (notesTicket); redactMore: mcpshared.js's mask. */
function createNotesSync({ store, attachments, cloud, redactMore }) {
  const handles = (type) => TYPES.has(type);

  /**
   * One of TYPES. `allow(id)`: whether this page may use note `id` (the dashboard every note; a note window its own note, and
   * for a ticket or an upload only its note's server id). `sender`: the asking page's webContents (a picker opens over its
   * window). Every one answers.
   */
  async function handle(body, { allow, sender }) {
    const type = body.type;
    const id = typeof body.id === 'string' ? body.id : '';
    switch (type) {
      case 'syncCaps':
        return { share: true, files: true };
      case 'syncTicket':
        if (!allow(id)) return { error: 'refused' };
        return cloud.notesTicket(id);
      case 'loadY':
      case 'saveY': {
        if (!allow(id) || !store.validName(id)) return { error: 'refused' };
        try {
          if (type === 'loadY') {
            const d = await store.serial(() => store.loadY(id));
            return d ? { b64: d.toString('base64') } : {};
          }
          const b64 = body.b64;
          if (typeof b64 === 'string') {
            if (!B64.test(b64)) return { error: 'bad request' };
            const d = Buffer.from(b64, 'base64');
            if (d.length > Y_MAX) return { error: 'bad request' };
            await store.serial(() => store.saveY(id, d));
          } else {
            await store.serial(() => store.saveY(id, null));
          }
          return { ok: true };
        } catch (e) {
          return { error: String((e && e.message) || e) };
        }
      }
      case 'secretCheck': {
        // The same patterns that mask what AI is shown (redactMore).
        const text = typeof body.text === 'string' ? body.text : '';
        return { risky: redactMore(text) !== text };
      }
      default: {
        // Files in notes: only the page's own notes' files, kept on this PC (what goes to the server goes from here). An upload
        // only into a note this page may use.
        const note = typeof body.note === 'string' ? body.note : '';
        if (type === 'attUpload' && !allow(note)) return { error: 'refused' };
        return attachments.handle(type, body, sender);
      }
    }
  }

  return { handles, handle };
}

module.exports = { createNotesSync };
