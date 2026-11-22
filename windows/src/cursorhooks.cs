// Orbiterm: Cursor's CLI (cursor-agent) runs this on its hooks (%USERPROFILE%\.cursor\hooks.json), the event's JSON on
// stdin: the Windows side of the Mac's cursor-hook.sh (Engine/CursorHooks.swift). The event goes to its conversation's
// file for the dashboard (cursor-events\<conversation id>.jsonl, one line per event, beside this program), and the events
// of a conversation itself say which cursor-agent process is in it (cursor-events\pid\<pid>). Nothing is printed: Cursor
// decides nothing differently. It does nothing when no cursor-agent is above it (the Cursor editor runs the same hooks).
//
// A program, not a PowerShell script: Cursor waits for preToolUse before every tool call, and PowerShell takes a second or
// more to start and another to look up its parents. Compiled by cursorhooks.js with .NET Framework's C# compiler (C# 5:
// no interpolated strings, no `out var`, no `?.`).
using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

static class CursorHook {
  [StructLayout(LayoutKind.Sequential)]
  struct PBI { public IntPtr ExitStatus; public IntPtr Peb; public IntPtr Affinity; public IntPtr Priority; public IntPtr Pid; public IntPtr Parent; }
  [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int cls, ref PBI info, int size, out int ret);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h, int flags, StringBuilder name, ref int size);
  [DllImport("kernel32.dll")] static extern bool GetProcessTimes(IntPtr h, out long created, out long exited, out long kernel, out long user);
  [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h, IntPtr at, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("kernel32.dll")] static extern bool IsWow64Process(IntPtr h, out bool wow);

  // What one process is, as far as its parent's walk needs: its parent, when it started, its program and command line.
  sealed class Proc { public int Parent; public long Created; public string Image = ""; public string Command = ""; }

  // Cursor's CLI runs as its own Node (cursor-agent\versions\<version>\node.exe) on cursor-agent\versions\<version>\index.js,
  // under its `agent` and `cursor-agent` launchers: known by that folder, as the Mac's script knows it (IsCursor).
  static readonly Regex Script = new Regex(@"[\\/]cursor-agent[\\/]versions[\\/][^\\/""]+[\\/]index\.js", RegexOptions.IgnoreCase);

  static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);

  static int Main(string[] args) {
    try { Run(args); } catch { }
    return 0;
  }

  static void Run(string[] args) {
    if (args.Length < 1 || !Regex.IsMatch(args[0], "^[A-Za-z]{1,40}$")) return;
    string ev = args[0];
    // The JSON's own bytes (UTF-8), on one line.
    MemoryStream buf = new MemoryStream();
    using (Stream input = Console.OpenStandardInput()) input.CopyTo(buf);
    string json = Utf8.GetString(buf.ToArray()).Replace('\r', ' ').Replace('\n', ' ').Trim();
    if (json.Length == 0 || json[0] != '{') return;
    int agent = Agent();
    if (agent == 0) return;
    string sid = Field(json, "conversation_id");
    if (sid == null || !Regex.IsMatch(sid, "^[A-Za-z0-9._-]{1,128}$")) return;
    // A big payload (a tool's whole output, a file written) is cut down to the fields the dashboard reads.
    if (json.Length > 16000) {
      StringBuilder small = new StringBuilder("{\"truncated\":true");
      foreach (string k in new[] { "conversation_id", "generation_id", "model", "tool_use_id", "tool_name", "hook_event_name", "status",
          "subagent_id", "subagent_type", "parent_conversation_id", "command", "cwd", "path", "file_path" }) {
        string v = Field(json, k);
        if (!string.IsNullOrEmpty(v)) small.Append(",\"").Append(k).Append("\":\"").Append(v).Append('"');
      }
      foreach (string k in new[] { "text", "prompt" }) {
        string v = Field(json, k);
        if (string.IsNullOrEmpty(v)) continue;
        if (v.Length > 4000) v = v.Substring(0, 4000);
        // Cut in the middle of an escape: what is left of it goes.
        v = Regex.Replace(v, @"\\u[0-9a-fA-F]{0,3}$", "");
        v = Regex.Replace(v, @"\\+$", "");
        small.Append(",\"").Append(k).Append("\":\"").Append(v).Append('"');
      }
      json = small.Append('}').ToString();
    }
    string home = Path.GetDirectoryName(Assembly.GetEntryAssembly().Location);
    string dir = Path.Combine(home, "cursor-events");
    Directory.CreateDirectory(Path.Combine(dir, "pid"));
    long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
    byte[] line = Utf8.GetBytes("{\"e\":\"" + ev + "\",\"t\":" + now + ",\"agent\":" + agent + ",\"p\":" + json + "}\n");
    // Parallel tool calls run this at once: one at a time appends (the file opened for writing by one only; readers may
    // read on meanwhile), or their lines would interleave. A hook that dies lets go of it with its process.
    string file = Path.Combine(dir, sid + ".jsonl");
    for (int n = 0; n < 150; n++) {
      try {
        using (FileStream fs = new FileStream(file, FileMode.Append, FileAccess.Write, FileShare.Read)) fs.Write(line, 0, line.Length);
        break;
      } catch (IOException) {
        Thread.Sleep(20);
      }
    }
    if (ev == "sessionStart" || ev == "beforeSubmitPrompt" || ev == "stop") File.WriteAllText(Path.Combine(Path.Combine(dir, "pid"), agent.ToString()), sid);
  }

  // The first string value named `key` in the JSON, as it is written there (escapes kept), or null.
  static string Field(string json, string key) {
    Match m = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
    return m.Success ? m.Groups[1].Value : null;
  }

  // The cursor-agent process this hook runs under, 0 when none: up its parents (ten at most, each one started before the
  // one below it, or a later process took a dead parent's number) to the nearest cursor-agent, then on up while its parent
  // is Cursor's too (a launcher of its own), as the app's process list counts the one at the top as the session.
  static int Agent() {
    Proc me = Look(System.Diagnostics.Process.GetCurrentProcess().Id);
    if (me == null) return 0;
    int found = 0, p = me.Parent;
    long below = me.Created;
    for (int n = 0; n < 10 && p > 4; n++) {
      Proc q = Look(p);
      if (q == null || q.Created > below) break;
      if (IsCursor(q)) found = p;
      else if (found != 0) break;
      below = q.Created;
      p = q.Parent;
    }
    return found;
  }

  // Whether a process is Cursor's CLI as runaways.js aiTool counts it: its own program by name (cursor-agent.exe,
  // cursor-agent-sea.exe), or a Node (Bun, Deno) running its index.js. Not a shell whose command line only names it (a
  // `cmd /c node …\index.js`): that one is no session.
  static bool IsCursor(Proc q) {
    string name = Path.GetFileNameWithoutExtension(q.Image).ToLowerInvariant();
    if (name == "cursor-agent" || name == "cursor-agent-sea") return true;
    if (name != "node" && name != "bun" && name != "deno") return false;
    return Script.IsMatch(q.Command) || q.Image.Replace('/', '\\').ToLowerInvariant().Contains("\\cursor-agent\\versions\\");
  }

  static Proc Look(int pid) {
    // Query limited information and read memory (its command line); without the second, the first alone.
    IntPtr h = OpenProcess(0x1010, false, pid);
    if (h == IntPtr.Zero) h = OpenProcess(0x1000, false, pid);
    if (h == IntPtr.Zero) return null;
    try {
      Proc out_ = new Proc();
      PBI pbi = new PBI();
      int ret;
      if (NtQueryInformationProcess(h, 0, ref pbi, Marshal.SizeOf(pbi), out ret) != 0) return null;
      out_.Parent = (int)(long)pbi.Parent;
      long created, exited, kernel, user;
      if (!GetProcessTimes(h, out created, out exited, out kernel, out user)) return null;
      out_.Created = created;
      StringBuilder sb = new StringBuilder(1024);
      int size = sb.Capacity;
      if (QueryFullProcessImageName(h, 0, sb, ref size)) out_.Image = sb.ToString();
      out_.Command = CommandLine(h, pbi.Peb);
      return out_;
    } catch {
      return null;
    } finally {
      CloseHandle(h);
    }
  }

  // Its command line, from its process parameters (x64 layout, as runaways.js reads a folder; a 32-bit process, or one
  // this user can't read, has none).
  static string CommandLine(IntPtr h, IntPtr peb) {
    try {
      bool wow;
      if (IntPtr.Size != 8 || peb == IntPtr.Zero || (IsWow64Process(h, out wow) && wow)) return "";
      byte[] p = Read(h, peb + 0x20, 8);
      if (p == null) return "";
      byte[] us = Read(h, (IntPtr)BitConverter.ToInt64(p, 0) + 0x70, 16);
      if (us == null) return "";
      int len = BitConverter.ToUInt16(us, 0);
      if (len <= 0 || len > 65534) return "";
      byte[] s = Read(h, (IntPtr)BitConverter.ToInt64(us, 8), len);
      return s == null ? "" : Encoding.Unicode.GetString(s);
    } catch {
      return "";
    }
  }

  static byte[] Read(IntPtr h, IntPtr at, int n) {
    byte[] b = new byte[n];
    IntPtr got;
    return ReadProcessMemory(h, at, b, (IntPtr)n, out got) ? b : null;
  }
}
