import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pet } from "./schema";

const profiles = [
  {
    species: "Dog",
    names: [
      "Luna", "Milo", "Bella", "Max", "Daisy", "Charlie", "Ruby", "Cooper",
      "Olive", "Finn", "Pepper", "Scout", "Winnie", "Riley", "Cleo", "Archie",
      "Maple", "Teddy", "Poppy", "Otis", "Hazel", "Louie", "Rosie", "Ollie",
      "Nala", "Hugo", "Willow", "Benny", "Ivy", "Remy", "Coco", "Frankie",
      "Penny", "Moose", "Clover", "Jasper", "Honey", "Bruno", "Millie",
    ],
    ages: [3, 2, 5, 1, 4, 7],
  },
  {
    species: "Cat",
    names: [
      "Mochi", "Miso", "Juno", "Pearl", "Fig", "Alfie", "Nori",
      "Sylvie", "Biscuit", "Pip", "Juniper", "Bean", "Suki", "Opal",
    ],
    ages: [2, 4, 1, 6],
  },
  {
    species: "Bird",
    names: ["Kiwi", "Sunny", "Pico", "Skye", "Tango", "Echo", "Blue", "Peaches", "Rio"],
    ages: [1, 3, 2],
  },
  {
    species: "Rabbit",
    names: ["Cinnamon", "Thistle", "Marshmallow"],
    ages: [2, 1, 3],
  },
  {
    species: "Reptile",
    names: ["Basil", "Spike"],
    ages: [4, 2],
  },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DATABASE_URL before seeding the catalog.");

  const pool = new Pool({ connectionString });
  try {
    const pets = profiles.flatMap(({ species, names, ages }) =>
      names.map((name, index) => ({
        name,
        species,
        age: ages[index % ages.length],
        imageUrl: `https://pets-images.dev-apis.com/pets/${species.toLowerCase()}${index + 1}.jpg`,
      })),
    ).map((profile, index) => ({ ...profile, id: index + 1 }));

    await drizzle(pool).insert(pet).values(pets).onConflictDoNothing({ target: pet.id });
    console.log(`Seeded the ${pets.length}-profile pet catalog.`);
  } finally {
    await pool.end();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
