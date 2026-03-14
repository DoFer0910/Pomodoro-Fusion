
export interface StorageAdapter {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
}

class LocalStorageAdapter implements StorageAdapter {
    async get<T>(key: string): Promise<T | null> {
        if (typeof window === "undefined") return null;
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }

    async set<T>(key: string, value: T): Promise<void> {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, JSON.stringify(value));
    }

    async delete(key: string): Promise<void> {
        if (typeof window === "undefined") return;
        localStorage.removeItem(key);
    }
}

class ElectronStorageAdapter implements StorageAdapter {
    async get<T>(key: string): Promise<T | null> {
        // @ts-ignore
        return window.electron.read(key);
    }

    async set<T>(key: string, value: T): Promise<void> {
        // @ts-ignore
        await window.electron.write(key, value);
    }

    async delete(key: string): Promise<void> {
        // @ts-ignore
        await window.electron.remove(key);
    }
}

export function getStorage(): StorageAdapter {
    if (typeof window !== "undefined" && (window as any).electron) {
        return new ElectronStorageAdapter();
    }
    return new LocalStorageAdapter();
}
