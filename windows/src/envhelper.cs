// The env view's helper (envnative.js compiles it with .NET Framework's C# compiler at first use, as cursorhooks.js does
// its hook program): two things the env view (pages/env.js) needs from Windows that Node and Electron can't do. What a
// file holds comes on stdin only, never on the command line or in a file of the helper's own, and the helper prints one
// word and nothing else: ok, busy (another program has the file or the clipboard), denied (the file's permissions refuse
// this account) or failed.
//
//   clip                the UTF-8 text on stdin to the clipboard, marked to stay out of Clipboard History (Win+V) and the
//                       cloud clipboard, and out of clipboard managers that honour "Clipboard Viewer Ignore" (the Mac marks
//                       its copy org.nspasteboard.ConcealedType)
//   save <file> <temp>  the bytes on stdin become <file>'s content: written into <temp> (made new beside it, under the
//                       file's own access list from the start), flushed, then put in the file's place by ReplaceFileW,
//                       which keeps the file's access list, attributes, short name and object ID (the Mac's fcopyfile and
//                       rename). On any failure <temp> is deleted and the file is as it was.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Threading;

static class EnvHelper
{
    [DllImport("user32.dll", SetLastError = true)] static extern bool OpenClipboard(IntPtr owner);
    [DllImport("user32.dll", SetLastError = true)] static extern bool CloseClipboard();
    [DllImport("user32.dll", SetLastError = true)] static extern bool EmptyClipboard();
    [DllImport("user32.dll", SetLastError = true)] static extern IntPtr SetClipboardData(uint format, IntPtr data);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern uint RegisterClipboardFormatW(string name);
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateWindowExW(uint exStyle, string cls, string name, uint style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr param);
    [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr window);
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GlobalAlloc(uint flags, UIntPtr bytes);
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GlobalLock(IntPtr mem);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool GlobalUnlock(IntPtr mem);
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GlobalFree(IntPtr mem);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool ReplaceFileW(string replaced, string replacement, string backup, uint flags, IntPtr exclude, IntPtr reserved);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr CreateFileW(string name, uint access, uint share, IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);

    const uint CF_UNICODETEXT = 13;
    const uint GMEM_MOVEABLE = 0x0002;
    static readonly IntPtr HWND_MESSAGE = new IntPtr(-3);
    static readonly IntPtr INVALID_HANDLE = new IntPtr(-1);
    // A whole file is 1 MB at most; a copy of it (Copy all) a little more once its lines are written out.
    const int MaxInput = 4 << 20;

    static int Main(string[] args)
    {
        byte[] input = null;
        try
        {
            input = ReadInput();
            if (input == null) return Say("failed", 2);
            if (args.Length == 1 && args[0] == "clip") return Clip(input);
            if (args.Length == 3 && args[0] == "save") return Save(args[1], args[2], input);
            return Say("failed", 2);
        }
        catch
        {
            return Say("failed", 2);
        }
        finally
        {
            if (input != null) Array.Clear(input, 0, input.Length);
        }
    }

    static byte[] ReadInput()
    {
        using (Stream s = Console.OpenStandardInput())
        using (MemoryStream m = new MemoryStream())
        {
            byte[] buf = new byte[65536];
            int n;
            while ((n = s.Read(buf, 0, buf.Length)) > 0)
            {
                if (m.Length + n > MaxInput) return null;
                m.Write(buf, 0, n);
            }
            Array.Clear(buf, 0, buf.Length);
            byte[] all = m.ToArray();
            Array.Clear(m.GetBuffer(), 0, (int)m.Length);
            return all;
        }
    }

    static int Say(string word, int code)
    {
        try
        {
            byte[] b = Encoding.ASCII.GetBytes(word);
            using (Stream o = Console.OpenStandardOutput()) o.Write(b, 0, b.Length);
        }
        catch { }
        return code;
    }

    // ---------- clip ----------
    // The formats Windows' clipboard reads to keep a copy out of its history and the cloud (learn.microsoft.com, "Cloud
    // Clipboard and Clipboard History Formats"): any data in ExcludeClipboardContentFromMonitorProcessing keeps it out of
    // both; CanIncludeInClipboardHistory and CanUploadToCloudClipboard as a DWORD 0 say so to each. They're put before the
    // text, all in one opening of the clipboard: a watcher is told only when it closes.
    static int Clip(byte[] input)
    {
        string text;
        try { text = new UTF8Encoding(false, true).GetString(input); }
        catch { return Say("failed", 2); }
        byte[] unicode = Encoding.Unicode.GetBytes(text + "\0");
        // A window of its own (message-only) owns the clipboard: with none, EmptyClipboard would leave it ownerless and
        // SetClipboardData may refuse.
        IntPtr owner = CreateWindowExW(0, "STATIC", "", 0, 0, 0, 0, 0, HWND_MESSAGE, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        try
        {
            // Another program may hold the clipboard a moment (a clipboard manager reading it): a second at most.
            bool open = false;
            for (int i = 0; i < 40 && !(open = OpenClipboard(owner)); i++) Thread.Sleep(25);
            if (!open) return Say("busy", 3);
            try
            {
                if (!EmptyClipboard()) return Say("failed", 2);
                byte[] zero = new byte[4];
                bool ok = Put(RegisterClipboardFormatW("ExcludeClipboardContentFromMonitorProcessing"), zero)
                    && Put(RegisterClipboardFormatW("CanIncludeInClipboardHistory"), zero)
                    && Put(RegisterClipboardFormatW("CanUploadToCloudClipboard"), zero)
                    && Put(RegisterClipboardFormatW("Clipboard Viewer Ignore"), zero)
                    && Put(CF_UNICODETEXT, unicode);
                return ok ? Say("ok", 0) : Say("failed", 2);
            }
            finally
            {
                CloseClipboard();
            }
        }
        finally
        {
            Array.Clear(unicode, 0, unicode.Length);
            if (owner != IntPtr.Zero) DestroyWindow(owner);
        }
    }

    /** One format's data, handed to the clipboard (which then owns the memory: it outlives this process). */
    static bool Put(uint format, byte[] data)
    {
        if (format == 0) return false;
        IntPtr mem = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)data.Length);
        if (mem == IntPtr.Zero) return false;
        IntPtr p = GlobalLock(mem);
        if (p == IntPtr.Zero)
        {
            GlobalFree(mem);
            return false;
        }
        Marshal.Copy(data, 0, p, data.Length);
        GlobalUnlock(mem);
        if (SetClipboardData(format, mem) != IntPtr.Zero) return true;
        GlobalFree(mem);
        return false;
    }

    // ---------- save ----------
    static int Save(string file, string temp, byte[] data)
    {
        bool made = false;
        try
        {
            // The file's own access list, for the new file from its first byte (read when this account may; else the new
            // file starts with the folder's, as any new file does, and ReplaceFileW still gives it the file's).
            FileSecurity acl = null;
            try
            {
                acl = File.GetAccessControl(file, AccessControlSections.Access);
                // And the right to delete it, so a failed replace never leaves it behind (ReplaceFileW gives the file its
                // own list back, without this).
                acl.AddAccessRule(new FileSystemAccessRule(WindowsIdentity.GetCurrent().User, FileSystemRights.Delete, AccessControlType.Allow));
            }
            catch { acl = null; }
            try
            {
                using (FileStream f = acl != null
                    ? new FileStream(temp, FileMode.CreateNew, FileSystemRights.Write | FileSystemRights.ReadPermissions, FileShare.None, 4096, FileOptions.None, acl)
                    : new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    made = true;
                    f.Write(data, 0, data.Length);
                    f.Flush(true);
                }
            }
            catch (UnauthorizedAccessException)
            {
                return Say("denied", 4);
            }
            // No backup, no flags: an access list or attribute that can't be carried over fails the whole replace rather
            // than leaving the file under other permissions.
            if (ReplaceFileW(file, temp, null, 0, IntPtr.Zero, IntPtr.Zero))
            {
                made = false;
                return Say("ok", 0);
            }
            int err = Marshal.GetLastWin32Error();
            // ERROR_SHARING_VIOLATION, ERROR_LOCK_VIOLATION: another program has it.
            if (err == 32 || err == 33) return Say("busy", 1);
            // ERROR_ACCESS_DENIED, ERROR_UNABLE_TO_REMOVE_REPLACED: the permissions, or a program holding it without
            // delete sharing (Windows says "access denied" for both).
            if (err == 5 || err == 1175) return Say(Refusal(file), 1);
            return Say("failed", 2);
        }
        catch
        {
            return Say("failed", 2);
        }
        finally
        {
            if (made)
            {
                try { File.Delete(temp); }
                catch { }
            }
        }
    }

    /** Why the file can't be replaced: opening it to write and delete with every kind of sharing allowed fails with "access
     *  denied" for its permissions only; a program holding it open without sharing makes that a sharing violation. */
    static string Refusal(string file)
    {
        const uint DELETE = 0x00010000, FILE_WRITE_DATA = 0x0002, SHARE_ALL = 7, OPEN_EXISTING = 3;
        IntPtr h = CreateFileW(file, DELETE | FILE_WRITE_DATA, SHARE_ALL, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
        if (h == INVALID_HANDLE) return Marshal.GetLastWin32Error() == 5 ? "denied" : "busy";
        CloseHandle(h);
        return "busy";
    }
}
