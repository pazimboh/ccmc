interface StoredItem<T> {
  value: T;
  expiry: number;
}

export function setItemWithExpiry<T>(key: string, value: T, ttlMs: number): void {
  const now = new Date();
  const item: StoredItem<T> = {
    value: value,
    expiry: now.getTime() + ttlMs,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage:`, error);
    // Handle potential storage full errors or other issues
  }
}

export function getItemWithExpiry<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    const item = JSON.parse(itemStr) as StoredItem<T>;
    const now = new Date();
    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    // If parsing fails or other error, treat as missing/expired
    localStorage.removeItem(key); // Clean up potentially corrupted item
    return null;
  }
}

// Optional: function to remove item, though localStorage.removeItem(key) works directly
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
  }
}
