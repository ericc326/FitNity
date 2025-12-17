const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

export interface Recipe {
  id: number;
  title: string;
  image?: string;
  nutrition?: any;
}

export const fetchRecommendedRecipes = async (
  maxCalories: number
): Promise<Recipe[]> => {
  try {
    const url =
      `https://api.spoonacular.com/recipes/complexSearch` +
      `?apiKey=${SPOONACULAR_API_KEY}` +
      `&number=6` +
      `&minProtein=20` +
      `&maxCalories=${Math.round(maxCalories)}` +
      `&addRecipeNutrition=true`;

    const response = await fetch(url);
    const data = await response.json();

    return data.results || [];
  } catch (error) {
    console.error("Failed to fetch recipes:", error);
    return [];
  }
};
