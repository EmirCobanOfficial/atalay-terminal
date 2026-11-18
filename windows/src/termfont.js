'use strict';
// The terminals' font family, picked in Settings → TERMINALS (the Mac's TerminalFont.swift): kept as "terminalFontFamily"
// in the settings, "" while nothing is picked. The monospaced families of this PC come from one PowerShell call (GDI
// measures "iiiiiiii" against "WWWWWWWW"), run beside the app and kept for the session.
const { execFile } = require('child_process');

// Windows' own terminal font, what the pages drew before a pick existed.
const USUAL = 'Cascadia Mono';
// What pages/terminal.js draws while nothing is picked: its first installed family wins.
const STACK = ['MesloLGS NF', 'CaskaydiaCove Nerd Font', USUAL];
// Symbol fonts that measure as equal-width but are no terminal fonts.
const SYMBOLS = /^(marlett|wingdings( \d)?|webdings|symbol|mt extra|holomdl2 assets|segoe (mdl2|fluent) icons)$/i;

const SCRIPT = [
  'Add-Type -AssemblyName System.Drawing, System.Windows.Forms',
  '$fmt = [System.Windows.Forms.TextFormatFlags]::NoPadding',
  '$out = New-Object System.Collections.Generic.List[string]',
  'foreach ($f in (New-Object System.Drawing.Text.InstalledFontCollection).Families) {',
  '  if ($f.Name.StartsWith("@")) { continue }',
  '  try {',
  '    $font = New-Object System.Drawing.Font($f.Name, 12, [System.Drawing.GraphicsUnit]::Pixel)',
  '    $a = [System.Windows.Forms.TextRenderer]::MeasureText("iiiiiiii", $font, [System.Drawing.Size]::new(1000, 100), $fmt).Width',
  '    $b = [System.Windows.Forms.TextRenderer]::MeasureText("WWWWWWWW", $font, [System.Drawing.Size]::new(1000, 100), $fmt).Width',
  '    $font.Dispose()',
  '    if ($a -gt 0 -and $a -eq $b) { $out.Add($f.Name) }',
  '  } catch {}',
  '}',
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  'ConvertTo-Json -Compress -InputObject @($out)',
].join('\n');

function scan() {
  return new Promise((resolve) => {
    const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 60_000, maxBuffer: 8 << 20, encoding: 'utf8' }, (err, stdout) => {
        if (err) return resolve(null);
        try {
          const list = JSON.parse(String(stdout).replace(/^\uFEFF/, '').trim() || '[]');
          resolve(Array.isArray(list) ? list.filter((n) => typeof n === 'string' && n && !SYMBOLS.test(n)) : null);
        } catch {
          resolve(null);
        }
      });
  });
}

/**
 * `settings`: { get(key), set(key, value) }. `scanFonts` is for tests. Answers picked(), usual(), chosen(), current(),
 * set(family), families() (a promise) and warm() (starts the scan early).
 */
function createTermFont({ settings, scanFonts = scan }) {
  let installed = null; // the families found, once the scan is over
  let pending = null;
  const known = (name) => !!installed && installed.some((f) => f.toLowerCase() === name.toLowerCase());

  const load = () => {
    if (!pending) {
      pending = scanFonts().then((list) => {
        if (list) installed = list;
        else pending = null; // a failed scan is tried again next time
        return installed;
      });
    }
    return pending;
  };
  // The first family of the page's stack that is installed; the last one until the scan is known.
  const usual = () => STACK.find((f) => known(f)) || USUAL;
  const picked = () => {
    const v = settings.get('terminalFontFamily');
    return typeof v === 'string' ? v : '';
  };
  const isInstalled = (name) => name.toLowerCase() === USUAL.toLowerCase() || known(name);
  // The pick while it's installed here (the account's pick may come from a computer that has fonts this one hasn't);
  // before the scan is over a pick is trusted, so a window opened at launch already has it.
  const chosen = () => {
    const p = picked();
    if (!p) return '';
    return installed ? (isInstalled(p) ? p : '') : p;
  };
  const current = () => chosen() || usual();

  async function set(family) {
    if (family == null || family === '') {
      settings.set('terminalFontFamily', '');
      return true;
    }
    if (typeof family !== 'string') return false;
    const f = family.trim();
    // eslint-disable-next-line no-control-regex
    if (!f || f.length > 100 || /[\u0000-\u001f\u007f]/.test(f)) return false;
    await load();
    if (!isInstalled(f)) return false;
    const exact = f.toLowerCase() === USUAL.toLowerCase() ? USUAL : installed.find((n) => n.toLowerCase() === f.toLowerCase()) || f;
    settings.set('terminalFontFamily', exact);
    return true;
  }

  // Monospaced families, the usual one first and the rest by name.
  async function families() {
    await load();
    const first = usual();
    const rest = (installed || []).filter((f) => f.toLowerCase() !== first.toLowerCase());
    rest.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [first, ...rest];
  }

  return { picked, usual, chosen, current, set, families, warm: () => { load(); } };
}

module.exports = { createTermFont, scan };
