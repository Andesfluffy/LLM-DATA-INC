/**
 * Shared utilities for file uploads with proper Firebase token handling
 */

/**
 * Get Firebase ID token and properly formatted auth headers
 * @returns { idToken: string | null, headers: Record<string, string> }
 */
export async function getAuthToken() {
  let idToken: string | null = null;
  
  try {
    const firebase = await import("@/lib/firebase/client");
    const user = firebase.auth.currentUser;
    
    if (!user) {
      console.warn("[uploadUtils] No Firebase user found. User may not be logged in.");
      return { idToken: null, headers: {} };
    }
    
    idToken = await user.getIdToken();
    console.log("[uploadUtils] Firebase token retrieved successfully");
    
    if (!idToken) {
      console.warn("[uploadUtils] getIdToken() returned empty token");
      return { idToken: null, headers: {} };
    }
    
    return { 
      idToken, 
      headers: { Authorization: `Bearer ${idToken}` } 
    };
  } catch (error) {
    console.error("[uploadUtils] Failed to get Firebase token:", error);
    return { idToken: null, headers: {} };
  }
}

/**
 * Get auth headers with JSON content type (for API calls)
 * Includes Authorization header if user is authenticated
 */
export async function getAuthHeaders() {
  const { idToken } = await getAuthToken();
  
  return {
    "Content-Type": "application/json",
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
  };
}

/**
 * Upload a CSV/Excel file to the server
 * @param file - The file to upload
 * @param name - Name for the datasource
 * @param sheetName - (Optional) Sheet name for Excel files
 */
export async function uploadCsvFile(
  file: File,
  name: string,
  sheetName?: string
) {
  const { idToken, headers } = await getAuthToken();
  
  if (!idToken) {
    throw new Error(
      "Not authenticated. Please sign in and try again. If this persists, refresh the page."
    );
  }

  const fd = new FormData();
  fd.append("file", file);
  fd.append("name", name || file.name);
  if (sheetName) {
    fd.append("sheetName", sheetName);
  }

  console.log("[uploadUtils] Starting upload to /api/datasources/upload-csv");
  
  const res = await fetch("/api/datasources/upload-csv", {
    method: "POST",
    headers, // Authorization header is included here
    body: fd,
  });

  const payload = await res.json();

  if (!res.ok) {
    console.error("[uploadUtils] Upload failed:", res.status, payload);
    throw new Error(payload?.error || `Upload failed with status ${res.status}`);
  }

  console.log("[uploadUtils] Upload successful");
  return payload;
}
