// Curated local recipe catalog for "Masak dengan Loopan".
//
// Pure typed data only — no React, no storage, no Date, no imports from UI code.
// This is an MVP: a small, hand-written catalog of simple Indonesian home recipes.
// There is intentionally NO external API, AI service, dependency, database, or model.
//
// Ingredient names are canonical, lowercase Indonesian names used for matching
// (see src/lib/recipe-match.ts). They are honest and explicit: each recipe lists only
// the ingredients it genuinely needs. We do NOT assume the user has unlisted staples —
// if a recipe needs oil, salt, or water, it is listed as an ingredient.

export interface Recipe {
  id: string;
  title: string;
  minutes: number;
  servings?: number;
  ingredients: string[]; // canonical lowercase Indonesian ingredient names
  steps: string[];
}

// Eight simple Indonesian home recipes, aligned with the demo seed
// (bayam, susu, telur, wortel, roti gandum utuh, beras melati, yoghurt)
// and other common pantry items.
export const RECIPES: Recipe[] = [
  {
    id: "telur-dadar-bayam",
    title: "Telur Dadar Bayam",
    minutes: 15,
    servings: 2,
    ingredients: ["telur", "bayam", "bawang merah", "garam", "minyak goreng"],
    steps: [
      "Cuci bayam, tiriskan, lalu cincang kasar.",
      "Kocok telur bersama sejumput garam hingga rata.",
      "Iris tipis bawang merah dan campurkan ke dalam kocokan telur bersama bayam.",
      "Panaskan sedikit minyak goreng di wajan dengan api sedang.",
      "Tuang adonan, ratakan, lalu masak hingga kedua sisi matang keemasan.",
      "Angkat dan sajikan selagi hangat.",
    ],
  },
  {
    id: "tumis-wortel",
    title: "Tumis Wortel",
    minutes: 20,
    servings: 3,
    ingredients: ["wortel", "bawang putih", "kecap manis", "garam", "minyak goreng"],
    steps: [
      "Kupas wortel dan potong serong tipis agar cepat matang.",
      "Cincang halus bawang putih.",
      "Panaskan minyak goreng, lalu tumis bawang putih sampai harum.",
      "Masukkan wortel, aduk hingga sedikit layu.",
      "Bumbui dengan kecap manis dan garam, tambahkan sedikit air bila perlu.",
      "Masak sampai wortel empuk, lalu angkat.",
    ],
  },
  {
    id: "nasi-goreng-telur",
    title: "Nasi Goreng Telur",
    minutes: 20,
    servings: 2,
    ingredients: ["nasi", "telur", "bawang putih", "kecap manis", "garam", "minyak goreng"],
    steps: [
      "Panaskan minyak goreng, lalu tumis bawang putih cincang hingga harum.",
      "Pecahkan telur ke wajan, orak-arik hingga setengah matang.",
      "Masukkan nasi, aduk rata dengan telur dan bawang.",
      "Tambahkan kecap manis dan garam, aduk hingga bumbu merata.",
      "Masak sambil terus diaduk sampai nasi panas merata, lalu sajikan.",
    ],
  },
  {
    id: "sup-sayur-sederhana",
    title: "Sup Sayur Sederhana",
    minutes: 30,
    servings: 4,
    ingredients: ["wortel", "bayam", "bawang putih", "garam", "air"],
    steps: [
      "Didihkan air dalam panci.",
      "Masukkan bawang putih yang sudah digeprek ke dalam air mendidih.",
      "Potong wortel, masukkan, lalu masak hingga setengah empuk.",
      "Tambahkan bayam dan garam, masak sebentar hingga bayam layu.",
      "Cicipi kuahnya, sesuaikan garam, lalu angkat dan sajikan hangat.",
    ],
  },
  {
    id: "orak-arik-telur-wortel",
    title: "Orak-arik Telur Wortel",
    minutes: 15,
    servings: 2,
    ingredients: ["telur", "wortel", "bawang putih", "garam", "minyak goreng"],
    steps: [
      "Serut atau potong halus wortel.",
      "Panaskan minyak goreng, tumis bawang putih cincang sampai harum.",
      "Masukkan wortel, tumis hingga mulai empuk.",
      "Pecahkan telur ke wajan, lalu aduk cepat hingga menjadi orak-arik.",
      "Bumbui dengan garam, aduk rata, dan sajikan.",
    ],
  },
  {
    id: "roti-panggang-telur-susu",
    title: "Roti Panggang Telur Susu",
    minutes: 15,
    servings: 2,
    ingredients: ["roti", "telur", "susu", "garam", "minyak goreng"],
    steps: [
      "Kocok telur bersama susu dan sejumput garam hingga tercampur.",
      "Celupkan kedua sisi roti ke dalam campuran telur susu.",
      "Panaskan sedikit minyak goreng di wajan dengan api kecil.",
      "Panggang roti hingga kedua sisi berwarna keemasan.",
      "Angkat dan sajikan selagi hangat.",
    ],
  },
  {
    id: "bubur-bayam",
    title: "Bubur Bayam",
    minutes: 35,
    servings: 3,
    ingredients: ["beras", "bayam", "bawang putih", "garam", "air"],
    steps: [
      "Cuci beras, lalu masak bersama banyak air sambil sesekali diaduk.",
      "Tambahkan bawang putih cincang agar bubur lebih harum.",
      "Masak hingga beras hancur dan teksturnya menjadi bubur.",
      "Masukkan bayam cincang dan garam, aduk hingga bayam layu.",
      "Angkat dan sajikan selagi hangat.",
    ],
  },
  {
    id: "smoothie-yoghurt-pisang",
    title: "Smoothie Yoghurt Pisang",
    minutes: 10,
    servings: 2,
    ingredients: ["yoghurt", "pisang", "susu", "madu"],
    steps: [
      "Kupas pisang dan potong menjadi beberapa bagian.",
      "Masukkan pisang, yoghurt, dan susu ke dalam blender.",
      "Tambahkan madu secukupnya sebagai pemanis.",
      "Blender hingga halus dan lembut.",
      "Tuang ke gelas dan sajikan segera.",
    ],
  },
];
