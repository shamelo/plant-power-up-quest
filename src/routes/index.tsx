import { createFileRoute } from "@tanstack/react-router";
import { PlantKingdomApp } from "@/components/plant-kingdom-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plant Kingdom Tracker — Retro Plant Watering Game" },
      {
        name: "description",
        content:
          "A retro 8-bit plant watering tracker. Care for Aloe, Jade, and Pothos, earn coins, build streaks, and never forget a watering.",
      },
      { property: "og:title", content: "Plant Kingdom Tracker" },
      {
        property: "og:description",
        content:
          "Retro plant care game. Water your plants, earn coins, and unlock badges.",
      },
    ],
  }),
  component: PlantKingdomApp,
});
