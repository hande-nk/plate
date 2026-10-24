// plate photos live only on this phone in IndexedDB
//database stores the key 

const DB_NAME = "plate";
const STORE = "photos";

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

//runs one readn and write agains the photos store and waits for it to finish
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDB();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req =  fn(tx.objectStore(STORE));
        tx.oncomplete = () => { db.close(); resolve(req.result); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

//shrinks a phone photo to a feed-sized JPED
export async function shrinkPhoto(file: Blob, maxSide = 1080):  Promise<Blob> {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return new Promise((resolve, reject) => 
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not shrink photo"))), "image/jpeg", 0.85)
    );
}

//Saves a photo and returns its key, to store in meals.phot_key.
export async function savePhoto(blob: Blob): Promise<string> {
    navigator.storage?.persist?.();
    const key = crypto.randomUUID();
    await run("readwrite", (s) => s.put(blob, key));
    return key;
}

//returns the photo for a key or null if the phone doesn't have it
export async function getPhoto(key: string): Promise<Blob | null> {
    const blob = await run<Blob | undefined>("readonly", (s) => s.get(key) as IDBRequest<Blob | undefined>);
    return blob ?? null;
}