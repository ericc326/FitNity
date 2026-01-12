import { GoogleGenerativeAI } from "@google/generative-ai";

interface PersonalInfo {
  name: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  activityLevel: string;
  goal: string;
  dietaryRestrictions: string[];
  allergies: string[];
  targetCalories: string;
}

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  // NEW FIELDS
  ingredients?: string[];
  instructions?: string[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private apiKey: string | null = null;

  constructor() {
    // Don't initialize with a placeholder key
    // The API key will be set when needed
  }

  setApiKey(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("API key is required");
    }

    this.apiKey = apiKey.trim();
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    // Use gemini-1.5-flash for faster, cheaper inference, or pro for better quality
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generateMealRecommendations(
    personalInfo: PersonalInfo,
    mealType: string,
    currentMeals: any[] = []
  ): Promise<FoodItem[]> {
    try {
      // Check if API key is set
      if (!this.apiKey || !this.model) {
        throw new Error(
          "API key not configured. Please set your Gemini API key in Settings."
        );
      }

      const prompt = this.buildPrompt(personalInfo, mealType, currentMeals);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAIResponse(text);
    } catch (error) {
      console.error("Error generating meal recommendations:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          throw error;
        }

        // Handle model overload or service unavailable errors
        if (
          error.message.includes("overloaded") ||
          error.message.includes("503") ||
          error.message.includes("service unavailable") ||
          error.message.includes("quota exceeded")
        ) {
          throw new Error(
            "AI service is currently busy. Please try again in a few minutes, or use fallback recommendations."
          );
        }
      }

      // For other errors, return fallback recommendations
      return this.getFallbackRecommendations(mealType);
    }
  }

  private buildPrompt(
    personalInfo: PersonalInfo,
    mealType: string,
    currentMeals: any[]
  ): string {
    const currentNutrition = this.calculateCurrentNutrition(currentMeals);
    const remainingCalories =
      parseInt(personalInfo.targetCalories) - currentNutrition.calories;

    // Map meal types to more descriptive names
    const mealTypeDescriptions = {
      breakfast: "breakfast (morning meal)",
      lunch: "lunch (midday meal)",
      dinner: "dinner (evening meal)",
      snacks: "snack (light meal between main meals)",
    };

    const mealDescription =
      mealTypeDescriptions[mealType as keyof typeof mealTypeDescriptions] ||
      mealType;

    return `You are a professional nutritionist and chef. Generate exactly 5 personalized meal recommendations for ${mealDescription} based on the following user profile.

IMPORTANT: Only generate recommendations for ${mealDescription}. Do NOT include recommendations for other meal types like breakfast, lunch, dinner, or snacks unless specifically requested.

USER PROFILE:
- Name: ${personalInfo.name}
- Age: ${personalInfo.age} years old
- Gender: ${personalInfo.gender}
- Weight: ${personalInfo.weight} kg
- Height: ${personalInfo.height} cm
- Activity Level: ${personalInfo.activityLevel}
- Goal: ${personalInfo.goal}
- Target Calories: ${personalInfo.targetCalories} calories/day
- Dietary Restrictions: ${personalInfo.dietaryRestrictions.join(", ") || "None"}
- Allergies: ${personalInfo.allergies.join(", ") || "None"}

CURRENT NUTRITION TODAY:
- Calories consumed: ${currentNutrition.calories}
- Protein consumed: ${currentNutrition.protein}g
- Carbs consumed: ${currentNutrition.carbs}g
- Fat consumed: ${currentNutrition.fat}g
- Remaining calories for today: ${remainingCalories}

MEAL TYPE: ${mealDescription}

REQUIREMENTS:
1. Generate exactly 5 meal options for ${mealDescription} ONLY
2. Each meal must be appropriate for ${mealDescription} timing and context
3. Consider the user's dietary restrictions and allergies
4. Ensure meals align with their fitness goal
5. Consider remaining daily calories and nutrition needs
6. Make meals realistic and easy to prepare
7. Include nutritional information for each meal
8. Focus only on ${mealDescription} - do not mix with other meal types
9. Provide a list of main ingredients
10. Provide concise step-by-step cooking instructions (3-5 steps)

RESPONSE FORMAT:
Return a JSON array with exactly 5 objects, each containing:
{
  "id": "unique_id",
  "name": "Meal Name",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "category": "${mealType}",
  "ingredients": ["string", "string", "string"],
  "instructions": ["Step 1...", "Step 2...", "Step 3..."]
}

Example for breakfast:
[
  {
    "id": "breakfast_1",
    "name": "Greek Yogurt with Berries and Nuts",
    "calories": 320,
    "protein": 18,
    "carbs": 25,
    "fat": 12,
    "category": "breakfast",
    "ingredients": ["1 cup Greek Yogurt", "1/2 cup Mixed Berries", "1 tbsp Almonds", "1 tsp Honey"],
    "instructions": ["Scoop yogurt into a bowl.", "Wash berries and top the yogurt.", "Sprinkle chopped almonds.", "Drizzle with honey and serve."]
  }
]

Only return the JSON array, no additional text.`;
  }

  private calculateCurrentNutrition(meals: any[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return meals.reduce(
      (total, meal) => {
        if (meal.food) {
          total.calories += meal.food.calories;
          total.protein += meal.food.protein;
          total.carbs += meal.food.carbs;
          total.fat += meal.food.fat;
        }
        return total;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  private parseAIResponse(response: string): FoodItem[] {
    try {
      // Extract JSON from the response using regex to find the array brackets
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any, index: number) => ({
          id: item.id || `ai_meal_${Date.now()}_${index}`,
          name: item.name,
          calories: parseInt(item.calories) || 0,
          protein: parseInt(item.protein) || 0,
          carbs: parseInt(item.carbs) || 0,
          fat: parseInt(item.fat) || 0,
          category: item.category || "general",
          ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
          instructions: Array.isArray(item.instructions)
            ? item.instructions
            : ["No instructions provided."],
        }));
      }
      throw new Error("No valid JSON found in response");
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return this.getFallbackRecommendations("general");
    }
  }

  private getFallbackRecommendations(mealType: string): FoodItem[] {
    const fallbackMeals = {
      breakfast: [
        {
          name: "Oatmeal with Berries and Almonds",
          calories: 280,
          protein: 8,
          carbs: 45,
          fat: 6,
          ingredients: [
            "1/2 cup Oats",
            "1 cup Water/Milk",
            "1/4 cup Berries",
            "1 tbsp Almonds",
          ],
          instructions: [
            "Boil water or milk.",
            "Add oats and cook for 5-7 mins.",
            "Top with berries and almonds.",
          ],
        },
        {
          name: "Greek Yogurt with Honey and Granola",
          calories: 200,
          protein: 15,
          carbs: 20,
          fat: 8,
          ingredients: ["1 cup Greek Yogurt", "2 tbsp Granola", "1 tsp Honey"],
          instructions: [
            "Place yogurt in a bowl.",
            "Top with granola.",
            "Drizzle with honey.",
          ],
        },
      ],
      lunch: [
        {
          name: "Grilled Chicken Salad with Mixed Greens",
          calories: 350,
          protein: 25,
          carbs: 15,
          fat: 18,
          ingredients: [
            "1 Chicken Breast",
            "2 cups Mixed Greens",
            "1 tbsp Olive Oil",
            "Lemon Juice",
          ],
          instructions: [
            "Grill chicken breast until cooked.",
            "Toss greens with olive oil and lemon.",
            "Slice chicken and place on top.",
          ],
        },
        {
          name: "Quinoa Bowl with Roasted Vegetables",
          calories: 380,
          protein: 12,
          carbs: 45,
          fat: 14,
          ingredients: [
            "1 cup Cooked Quinoa",
            "1 cup Roasted Veggies",
            "1 tbsp Tahini",
          ],
          instructions: [
            "Cook quinoa according to package.",
            "Roast seasonal veggies.",
            "Combine in a bowl and drizzle tahini.",
          ],
        },
      ],
      dinner: [
        {
          name: "Salmon with Roasted Vegetables",
          calories: 420,
          protein: 28,
          carbs: 20,
          fat: 22,
          ingredients: [
            "1 Salmon Fillet",
            "1 cup Broccoli",
            "1 tbsp Olive Oil",
            "Garlic",
          ],
          instructions: [
            "Preheat oven to 400°F (200°C).",
            "Place salmon and broccoli on a baking sheet.",
            "Drizzle with oil and garlic.",
            "Bake for 15-20 mins.",
          ],
        },
        {
          name: "Lean Beef Stir Fry with Brown Rice",
          calories: 380,
          protein: 25,
          carbs: 25,
          fat: 18,
          ingredients: [
            "4oz Lean Beef Strips",
            "1 cup Mixed Veggies",
            "1/2 cup Brown Rice",
            "Soy Sauce",
          ],
          instructions: [
            "Cook brown rice.",
            "Stir fry beef in a hot pan.",
            "Add veggies and soy sauce.",
            "Serve over rice.",
          ],
        },
      ],
      snacks: [
        {
          name: "Apple Slices with Almond Butter",
          calories: 180,
          protein: 4,
          carbs: 20,
          fat: 10,
          ingredients: ["1 Apple", "1 tbsp Almond Butter"],
          instructions: ["Slice the apple.", "Dip in almond butter."],
        },
        {
          name: "Hummus with Carrot and Celery Sticks",
          calories: 150,
          protein: 6,
          carbs: 18,
          fat: 8,
          ingredients: ["2 tbsp Hummus", "1 Carrot", "1 Stalk Celery"],
          instructions: ["Cut veggies into sticks.", "Serve with hummus."],
        },
      ],
    };

    const meals =
      fallbackMeals[mealType as keyof typeof fallbackMeals] ||
      fallbackMeals.breakfast;

    return meals.map((meal, index) => ({
      id: `fallback_${mealType}_${index}`,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      category: mealType,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
    }));
  }

  // Check if API key is configured
  isApiKeyConfigured(): boolean {
    return !!this.apiKey && !!this.model;
  }

  // Get the current API key (for debugging)
  getApiKey(): string | null {
    return this.apiKey;
  }
}

export default new GeminiService();
