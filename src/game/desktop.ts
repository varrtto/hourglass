/** Desktop (Tauri) helpers. Safe to call from the web build. */

/** Closes the native window when running inside Tauri. Returns false on web. */
export async function closeDesktopApp(): Promise<boolean> {
  try {
    const { isTauri } = await import("@tauri-apps/api/core");
    if (!isTauri()) return false;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
    return true;
  } catch {
    return false;
  }
}
