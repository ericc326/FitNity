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
  updateDoc, // Ensure updateDoc is imported
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
  editMeal: (
    mealId: string,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => Promise<void>;
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
        setIsLoading(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. EFFECT: Health Info Listener
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

  // 3. EFFECT: Diet Info Listener
  useEffect(() => {
    if (!auth.currentUser) {
      setDietInfo(null);
      setIsLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    const dietDocRef = doc(db, "users", uid, "dietinfo", "currentPlan");

    const unsubscribe = onSnapshot(
      dietDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setDietInfo(snapshot.data() as DietInfo);
        } else {
          setDietInfo(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Diet listener error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // 4. EFFECT: Meals Listener
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

  const changeDate = (date: string) => {
    setSelectedDate(date);
  };

  // --- Updated updateMeal (Combines foods instead of replacing) ---
  const updateMeal = async (mealType: string, newFood: FoodItem) => {
    if (!auth.currentUser) return;

    // 1. Find the current meal in our local state to see if it already has food
    const existingMeal = meals.find((m) => m.id === mealType);

    // 2. Prepare the data to save
    let finalFood = newFood;

    // 3. COMBINE LOGIC: If food already exists, merge them!
    if (existingMeal && existingMeal.hasFood && existingMeal.food) {
      const current = existingMeal.food;

      finalFood = {
        id: current.id, // Keep the original ID
        // Combine Names: "Rice" + "Chicken" -> "Rice, Chicken"
        name: `${current.name}, ${newFood.name}`,
        // Sum the Numbers
        calories: (current.calories || 0) + (newFood.calories || 0),
        protein: (current.protein || 0) + (newFood.protein || 0),
        carbs: (current.carbs || 0) + (newFood.carbs || 0),
        fat: (current.fat || 0) + (newFood.fat || 0),
        category: "combined", // Mark as combined
      };
    }

    // 4. Save to Firebase (Same logic as before, just using finalFood)
    const mealsRef = collection(db, "users", auth.currentUser.uid, "meals");

    if (existingMeal?.docId) {
      await setDoc(
        doc(mealsRef, existingMeal.docId),
        {
          date: selectedDate,
          mealType,
          food: finalFood, // <--- Saving the merged object
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await addDoc(collection(db, "users", auth.currentUser.uid, "meals"), {
        date: selectedDate,
        mealType,
        food: finalFood,
        createdAt: serverTimestamp(),
      });
    }
  };

  // --- NEW: Edit Meal Function (Updates Firebase) ---
  const editMeal = async (
    mealId: string,
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  ) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    try {
      // Find the specific meal in current state to get its docId
      const targetMeal = meals.find((m) => m.id === mealId);

      // We can only edit if it already exists in Firebase (has a docId)
      if (targetMeal && targetMeal.docId && targetMeal.food) {
        const mealDocRef = doc(db, "users", uid, "meals", targetMeal.docId);

        // Update the 'food' object inside the document
        // We preserve the original food ID and category, just updating values
        await updateDoc(mealDocRef, {
          food: {
            ...targetMeal.food,
            name,
            calories,
            protein,
            carbs,
            fat,
          },
        });
        // Note: We don't need to setMeals() here because the Snapshot Listener (Effect #4)
        // will automatically detect the change in Firebase and update the UI.
      } else {
        console.warn("Cannot edit meal: No Document ID found.");
      }
    } catch (error) {
      console.error("Error editing meal:", error);
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
    const dietDocRef = doc(db, "users", uid, "dietinfo", "currentPlan");

    try {
      await setDoc(
        dietDocRef,
        {
          ...info,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
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
        editMeal, // <--- ADDED HERE so it is exposed to components
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
