import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { db, auth } from "../../../../firebaseConfig";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  setDoc,
  addDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";

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
  docId?: string;
}

interface NutritionalData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DietInfo {
  goal: string;
  dietaryRestrictions: string[];
  allergies: string[];
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
}

interface MealPlanContextType {
  meals: Meal[];
  selectedDate: string;
  changeDate: (date: string) => void;
  dietInfo: DietInfo | null;
  healthInfo: any | null;
  isLoading: boolean;
  updateMeal: (mealId: string, food: FoodItem) => Promise<void>;
  removeMeal: (docId: string) => Promise<void>;
  addCustomMeal: (
    mealId: string,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => Promise<void>;
  getTotalNutrition: () => NutritionalData;
  saveDietInfo: (info: DietInfo) => Promise<void>;
}

const createDefaultMeals = (): Meal[] => [
  { id: "breakfast", title: "Breakfast", time: "7 AM", hasFood: false },
  { id: "lunch", title: "Lunch", time: "12 PM", hasFood: false },
  { id: "snacks", title: "Snacks", time: "3 PM", hasFood: false },
  { id: "dinner", title: "Dinner", time: "7 PM", hasFood: false },
];

const MealPlanContext = createContext<MealPlanContextType | undefined>(
  undefined
);

export const MealPlanProvider = ({ children }: { children: ReactNode }) => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [meals, setMeals] = useState<Meal[]>(createDefaultMeals());
  const [dietInfo, setDietInfo] = useState<DietInfo | null>(null);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ===================== CONSOLIDATED DATA FETCHING ===================== */

  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    setIsLoading(true);

    const syncAllData = async () => {
      try {
        // 1. Force the Profile to fetch FIRST so the UI has context
        const [healthSnap, dietSnap] = await Promise.all([
          getDocs(collection(db, "users", uid, "healthinfo")),
          getDocs(collection(db, "users", uid, "dietinfo")),
        ]);

        if (!healthSnap.empty) setHealthInfo(healthSnap.docs[0].data());
        if (!dietSnap.empty) {
          const dietData =
            dietSnap.docs.find((d) => d.id === "profile")?.data() ||
            dietSnap.docs[0].data();
          setDietInfo(dietData as DietInfo);
        }

        // 2. ONLY start the meal listener after the profile is known
        const mealsRef = collection(db, "users", uid, "meals");
        const mealQuery = query(mealsRef, where("date", "==", selectedDate));

        const unsubscribe = onSnapshot(
          mealQuery,
          (snapshot) => {
            const fetchedMeals = createDefaultMeals();
            snapshot.forEach((doc) => {
              const data = doc.data();
              const index = fetchedMeals.findIndex(
                (m) => m.id === data.mealType
              );
              if (index !== -1) {
                fetchedMeals[index] = {
                  ...fetchedMeals[index],
                  food: data.food,
                  hasFood: true,
                  docId: doc.id,
                };
              }
            });
            setMeals(fetchedMeals);
            setIsLoading(false); // UI is now fully ready with Profile AND Meals
          },
          (error) => {
            setIsLoading(false);
          }
        );

        return unsubscribe;
      } catch (e) {
        console.error("Sync error:", e);
        setIsLoading(false);
      }
    };

    const unsubPromise = syncAllData();

    return () => {
      unsubPromise.then((unsub) => unsub && unsub());
    };
  }, [auth.currentUser, selectedDate]);

  /* ===================== ACTIONS ===================== */

  const changeDate = (date: string) => {
    setSelectedDate(date);
    setIsLoading(true);
  };

  const updateMeal = async (mealType: string, food: FoodItem) => {
    if (!auth.currentUser) return;
    const mealsRef = collection(db, "users", auth.currentUser.uid, "meals");
    const existingMeal = meals.find((m) => m.id === mealType && m.hasFood);

    if (existingMeal?.docId) {
      await setDoc(
        doc(mealsRef, existingMeal.docId),
        {
          date: selectedDate,
          mealType,
          food,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await addDoc(collection(db, "users", auth.currentUser.uid, "meals"), {
        date: selectedDate,
        mealType,
        food,
        createdAt: serverTimestamp(),
      });
    }
  };

  const removeMeal = async (docId: string) => {
    if (!auth.currentUser || !docId) return;
    try {
      // Direct path to the specific meal document
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "meals", docId));
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const addCustomMeal = async (
    mealId: string,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => {
    const food: FoodItem = {
      id: `custom-${Date.now()}`,
      name,
      calories,
      protein,
      carbs,
      fat,
      category: "custom",
    };
    await updateMeal(mealId, food);
  };

  // CORRECTED: Uses setDoc with fixed ID to prevent "re-filling" issue
  const saveDietInfo = async (info: DietInfo) => {
    if (!auth.currentUser) return;

    // We save to a specific document "profile" so it overwrites duplicates
    const dietInfoRef = doc(
      db,
      "users",
      auth.currentUser.uid,
      "dietinfo",
      "profile"
    );

    await setDoc(dietInfoRef, {
      ...info,
      updatedAt: serverTimestamp(),
    });

    setDietInfo(info);
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

  return (
    <MealPlanContext.Provider
      value={{
        meals,
        selectedDate,
        changeDate,
        dietInfo,
        healthInfo,
        isLoading,
        updateMeal,
        removeMeal,
        addCustomMeal,
        getTotalNutrition,
        saveDietInfo,
      }}
    >
      {children}
    </MealPlanContext.Provider>
  );
};

export const useMealPlan = () => {
  const context = useContext(MealPlanContext);
  if (!context)
    throw new Error("useMealPlan must be used within MealPlanProvider");
  return context;
};
