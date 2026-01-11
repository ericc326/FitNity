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
  targetProtein?: string;
  targetCarbs?: string;
  targetFat?: string;
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

  // 1. EFFECT: Auth State Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setDietInfo(null);
        setHealthInfo(null);
        setMeals(createDefaultMeals());
        setIsLoading(false);
      } else {
        // We set loading true here, and wait for the listeners below to turn it off
        setIsLoading(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. EFFECT: Health Info Listener
  // FIX: Added [auth.currentUser] so it runs when user logs in
  useEffect(() => {
    if (!auth.currentUser) {
      setHealthInfo(null);
      return;
    }

    const uid = auth.currentUser.uid;
    const healthRef = collection(db, "users", uid, "healthinfo");

    const unsubscribe = onSnapshot(
      healthRef,
      (snapshot) => {
        if (!snapshot.empty) {
          setHealthInfo(snapshot.docs[0].data());
        } else {
          setHealthInfo(null);
        }
      },
      (error) => console.error("Health listener error:", error)
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // 3. EFFECT: Diet Info Listener (CONTROLS LOADING STATE)
  // FIX: Added [auth.currentUser] so it runs when user logs in
  useEffect(() => {
    if (!auth.currentUser) {
      setDietInfo(null);
      setIsLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    const dietRef = collection(db, "users", uid, "dietinfo");
    const q = query(dietRef, limit(1));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          setDietInfo(snapshot.docs[0].data() as DietInfo);
        } else {
          setDietInfo(null); // New user (empty diet info)
        }
        // CRITICAL: This turns off the loading screen once we know the diet status
        setIsLoading(false);
      },
      (error) => {
        console.error("Diet listener error:", error);
        setIsLoading(false); // Ensure we don't get stuck on error
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // 4. EFFECT: Meals Listener
  // FIX: Added [auth.currentUser] to dependency array
  useEffect(() => {
    if (!auth.currentUser) {
      setMeals(createDefaultMeals());
      return;
    }

    const uid = auth.currentUser.uid;
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
      },
      (error) => console.error("Meal listener error:", error)
    );

    return () => unsubscribe();
  }, [selectedDate, auth.currentUser]);

  /* ===================== ACTIONS ===================== */
  // (All actions below remain exactly the same as before)

  const changeDate = (date: string) => {
    setSelectedDate(date);
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

  const saveDietInfo = async (info: DietInfo) => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const dietCollectionRef = collection(db, "users", uid, "dietinfo");

    try {
      const q = query(dietCollectionRef, limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log("Profile already exists. Updates are not allowed.");
        return;
      }

      await addDoc(dietCollectionRef, {
        ...info,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
