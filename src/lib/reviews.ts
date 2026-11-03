// Reviews are stored in Firebase Firestore when VITE_FIREBASE_* env vars are set.
// Without them, reviews fall back to this browser's localStorage (only you see them).

export type Review = {
  id?: string;
  sectorId: string;
  name: string;
  rating: number; // 1–5
  tags: string[];
  text: string;
  createdAt: number;
};

export const REVIEW_TAGS = ["Live here", "Lived here", "PG", "Woman reviewer", "Family", "Working nearby"];

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const usingFirebase = Boolean(config.apiKey && config.projectId);

// Firebase is loaded lazily so the app stays light when reviews run in demo mode.
let fbPromise: Promise<{ db: import("firebase/firestore").Firestore; fs: typeof import("firebase/firestore") }> | null = null;
function getFb() {
  if (!usingFirebase) return null;
  fbPromise ??= Promise.all([import("firebase/app"), import("firebase/firestore")]).then(([app, fs]) => ({
    db: fs.getFirestore(app.initializeApp(config)),
    fs,
  }));
  return fbPromise;
}

const LS_KEY = "gff-reviews";
const readLocal = (): Review[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
};

export async function listReviews(sectorId: string): Promise<Review[]> {
  const fb = getFb();
  if (fb) {
    const { db, fs } = await fb;
    const q = fs.query(fs.collection(db, "reviews"), fs.where("sectorId", "==", sectorId), fs.orderBy("createdAt", "desc"));
    const snap = await fs.getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, createdAt: data.createdAt?.toMillis?.() ?? Date.now() } as Review;
    });
  }
  return readLocal().filter((r) => r.sectorId === sectorId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReview(r: Omit<Review, "id" | "createdAt">) {
  const clean = {
    sectorId: r.sectorId,
    name: r.name.trim().slice(0, 40) || "Anonymous",
    rating: Math.min(5, Math.max(1, Math.round(r.rating))),
    tags: r.tags.filter((t) => REVIEW_TAGS.includes(t)),
    text: r.text.trim().slice(0, 1000),
  };
  const fb = getFb();
  if (fb) {
    const { db, fs } = await fb;
    await fs.addDoc(fs.collection(db, "reviews"), { ...clean, createdAt: fs.serverTimestamp() });
    return;
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...readLocal(), { ...clean, createdAt: Date.now() }]));
  } catch {
    /* storage unavailable */
  }
}
