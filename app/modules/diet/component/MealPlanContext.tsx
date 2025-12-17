import StorageService from "../services/StorageService";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

/* ===================== TYPES ===================== */

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

interface Meal {
  id: string;
  title: string;
  time: string;
  food?: FoodItem;
  hasFood: boolean;
}

interface NutritionalData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

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
  targetProtein: string;
  targetCarbs: string;
  targetFat?: string;
}

interface MealPlanContextType {
  mealsByDate: Record<string, Meal[]>;
  meals: Meal[];
  selectedDate: string;
  changeDate: (date: string) => void;
  personalInfo: PersonalInfo | null;
  isLoading: boolean;

  updateMeal: (mealId: string, food: FoodItem) => void;
  removeMeal: (mealId: string) => void;
  addCustomMeal: (
    mealId: string,
    foodName: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => void;
  clearAllMeals: () => void;
  getTotalNutrition: () => NutritionalData;

  savePersonalInfo: (info: PersonalInfo) => Promise<void>;
  loadPersonalInfo: () => Promise<PersonalInfo | null>;
  clearPersonalInfo: () => Promise<void>;
  hasCompletedSetup: () => Promise<boolean>;
}

/* ===================== DEFAULT MEALS (FACTORY) ===================== */

const createDefaultMeals = (): Meal[] => [
  { id: "breakfast", title: "Breakfast", time: "7 AM", hasFood: false },
  { id: "lunch", title: "Lunch", time: "12 PM", hasFood: false },
  { id: "snacks", title: "Snacks", time: "3 PM", hasFood: false },
  { id: "dinner", title: "Dinner", time: "7 PM", hasFood: false },
];

/* ===================== CONTEXT ===================== */

const MealPlanContext = createContext<MealPlanContextType | undefined>(
  undefined
);

export const MealPlanProvider = ({ children }: { children: ReactNode }) => {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [mealsByDate, setMealsByDate] = useState<Record<string, Meal[]>>({});
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const meals = mealsByDate[selectedDate] ?? createDefaultMeals();

  /* ===================== DATE CHANGE ===================== */

  const changeDate = (date: string) => {
    setSelectedDate(date);

    setMealsByDate((prev) => {
      if (prev[date]) return prev;

      return {
        ...prev,
        [date]: createDefaultMeals(),
      };
    });
  };

  /* ===================== MEAL ACTIONS ===================== */

  const updateMeal = (mealId: string, food: FoodItem) => {
    const updatedMeals = meals.map((meal) =>
      meal.id === mealId ? { ...meal, food, hasFood: true } : meal
    );

    setMealsByDate((prev) => ({
      ...prev,
      [selectedDate]: updatedMeals,
    }));
  };

  const removeMeal = (mealId: string) => {
    const updatedMeals = meals.map((meal) =>
      meal.id === mealId ? { ...meal, food: undefined, hasFood: false } : meal
    );

    setMealsByDate((prev) => ({
      ...prev,
      [selectedDate]: updatedMeals,
    }));
  };

  const addCustomMeal = (
    mealId: string,
    foodName: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => {
    updateMeal(mealId, {
      id: `custom-${Date.now()}`,
      name: foodName,
      calories,
      protein,
      carbs,
      fat,
      category: "custom",
    });
  };

  const clearAllMeals = () => {
    setMealsByDate((prev) => ({
      ...prev,
      [selectedDate]: createDefaultMeals(),
    }));
  };

  const getTotalNutrition = (): NutritionalData => {
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
  };

  /* ===================== STORAGE ===================== */

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const savedMeals = await StorageService.getMeals();
      if (savedMeals) {
        setMealsByDate(savedMeals);

        if (!savedMeals[today]) {
          setMealsByDate((prev) => ({
            ...prev,
            [today]: createDefaultMeals(),
          }));
        }
      } else {
        setMealsByDate({
          [today]: createDefaultMeals(),
        });
      }

      const info = await StorageService.getPersonalInfo();
      if (info) setPersonalInfo(info);

      setIsLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      StorageService.saveMeals(mealsByDate);
    }
  }, [mealsByDate, isLoading]);

  /* ===================== PROVIDER ===================== */

  return (
    <MealPlanContext.Provider
      value={{
        mealsByDate,
        meals,
        selectedDate,
        changeDate,
        personalInfo,
        isLoading,
        updateMeal,
        removeMeal,
        addCustomMeal,
        clearAllMeals,
        getTotalNutrition,
        savePersonalInfo: StorageService.savePersonalInfo,
        loadPersonalInfo: StorageService.getPersonalInfo,
        clearPersonalInfo: StorageService.clearPersonalInfo,
        hasCompletedSetup: StorageService.hasCompletedSetup,
      }}
    >
      {children}
    </MealPlanContext.Provider>
  );
};

export const useMealPlan = () => {
  const context = useContext(MealPlanContext);
  if (!context) {
    throw new Error("useMealPlan must be used within MealPlanProvider");
  }
  return context;
};
