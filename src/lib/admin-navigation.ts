const ADMIN_DIRECTORY_KEY = "admin-view-directory";

export function allowAdminDirectoryView() {
  sessionStorage.setItem(ADMIN_DIRECTORY_KEY, "1");
}

export function clearAdminDirectoryView() {
  sessionStorage.removeItem(ADMIN_DIRECTORY_KEY);
}

export function adminMayViewDirectory() {
  return sessionStorage.getItem(ADMIN_DIRECTORY_KEY) === "1";
}
