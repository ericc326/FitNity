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
  limit,
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

  // 1. EFFECT: Fetch Profile Data (One-time fetch)
  // This runs once on login to get the static profile data.
  useEffect(() => {
    // Immediate state reset on logout
    if (!auth.currentUser) {
      setDietInfo(null);
      setHealthInfo(null);
      return;
    }

    const uid = auth.currentUser.uid;

    const fetchProfileData = async () => {
      try {
        const [healthSnap, dietSnap] = await Promise.all([
          getDocs(collection(db, "users", uid, "healthinfo")),
          // Query for the first available diet document (since we use Auto-IDs)
          getDocs(query(collection(db, "users", uid, "dietinfo"), limit(1))),
        ]);

        if (!healthSnap.empty) {
          setHealthInfo(healthSnap.docs[0].data());
        } else {
          setHealthInfo(null);
        }

        if (!dietSnap.empty) {
          // Grab the first document found (assuming only 1 exists per your rule)
          setDietInfo(dietSnap.docs[0].data() as DietInfo);
        } else {
          setDietInfo(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfileData();
  }, [auth.currentUser]);

  // 2. EFFECT: Listen to Meals (Real-time listener)
  // Separating this allows synchronous cleanup, fixing the "permission-denied" error on logout.
  useEffect(() => {
    if (!auth.currentUser) {
      setMeals(createDefaultMeals());
      setIsLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    setIsLoading(true);

    const mealsRef = collection(db, "users", uid, "meals");
    const mealQuery = query(mealsRef, where("date", "==", selectedDate));

    const unsubscribe = onSnapshot(
      mealQuery,
      (snapshot) => {
        const fetchedMeals = createDefaultMeals();
        snapshot.forEach((doc) => {
          const data = doc.data();
          const index = fetchedMeals.findIndex((m) => m.id === data.mealType);
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
        setIsLoading(false);
      },
      (error) => {
        // Silently ignore permission errors caused by logout race conditions
        if (error.code !== "permission-denied") {
          console.error("Meal listener error:", error);
        }
        setIsLoading(false);
      }
    );

    // Cleanup runs instantly when auth changes
    return () => {
      unsubscribe();
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

  /**
   * SAVES DIET INFO (Create Once, Never Update)
   * Uses Automatic ID generation.
   */
  const saveDietInfo = async (info: DietInfo) => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const dietCollectionRef = collection(db, "users", uid, "dietinfo");

    try {
      // 1. Check if a profile ALREADY exists
      const q = query(dietCollectionRef, limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // === SCENARIO: PROFILE EXISTS ===
        // We strictly refuse to update it, as per your requirement.
        console.log("Profile already exists. Updates are not allowed.");

        // We still update local state so the UI reflects the (attempted) change for this session
        setDietInfo(info);
        return;
      }

      // === SCENARIO: NEW USER (First Time Setup) ===
      // No document found, so we generate a NEW Automatic ID
      await addDoc(dietCollectionRef, {
        ...info,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Update local state immediately
      setDietInfo(info);
    } catch (error) {
      console.error("Error saving diet info:", error);
      throw error;
    }
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
