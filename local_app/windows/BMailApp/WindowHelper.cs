using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public static class WindowHelper
{
    private const int SW_RESTORE = 9;

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    public static void BringWindowToFront(Process process)
    {
        if (process == null)
            return;

        IntPtr hWnd = process.MainWindowHandle;
        if (hWnd == IntPtr.Zero)
            return;

        // 如果窗口被最小化，则还原窗口
        ShowWindow(hWnd, SW_RESTORE);
        // 将窗口置于前台
        SetForegroundWindow(hWnd);
    }
}
