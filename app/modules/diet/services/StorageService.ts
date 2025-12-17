import * as SecureStore from "expo-secure-store";

/* ===================== TYPES ===================== */

export interface PersonalInfo {
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

export interface Meal {
  id: string;
  title: string;
  time: string;
  food?: any;
  hasFood: boolean;
}

export type MealsByDate = Record<string, Meal[]>;

/* ===================== STORAGE SERVICE ===================== */

class StorageService {
  private PERSONAL_INFO_KEY = "personal_info";
  private MEALS_KEY = "meals_by_date";
  private FIRST_TIME_USER = "first_time_user";

  /* ===== PERSONAL INFO ===== */

  async savePersonalInfo(info: PersonalInfo): Promise<void> {
    await SecureStore.setItemAsync(
      this.PERSONAL_INFO_KEY,
      JSON.stringify(info)
    );
  }

  async getPersonalInfo(): Promise<PersonalInfo | null> {
    const data = await SecureStore.getItemAsync(this.PERSONAL_INFO_KEY);
    return data ? JSON.parse(data) : null;
  }

  async clearPersonalInfo(): Promise<void> {
    await SecureStore.deleteItemAsync(this.PERSONAL_INFO_KEY);
  }

  /* ===== MEALS (CALENDAR BASED) ===== */

  async saveMeals(meals: MealsByDate): Promise<void> {
    await SecureStore.setItemAsync(this.MEALS_KEY, JSON.stringify(meals));
  }

  async getMeals(): Promise<MealsByDate | null> {
    const data = await SecureStore.getItemAsync(this.MEALS_KEY);
    return data ? JSON.parse(data) : null;
  }

  async clearMeals(): Promise<void> {
    await SecureStore.deleteItemAsync(this.MEALS_KEY);
  }

  /* ===== FIRST TIME USER ===== */

  async setFirstTimeUser(value: boolean): Promise<void> {
    await SecureStore.setItemAsync(this.FIRST_TIME_USER, JSON.stringify(value));
  }

  async isFirstTimeUser(): Promise<boolean> {
    const data = await SecureStore.getItemAsync(this.FIRST_TIME_USER);
    return data ? JSON.parse(data) : true;
  }

  /* ===== SETUP CHECK ===== */

  async hasCompletedSetup(): Promise<boolean> {
    const info = await this.getPersonalInfo();
    return !!info;
  }

  /* ===== CLEAR ALL ===== */

  async clearAllData(): Promise<void> {
    await Promise.all([
      this.clearPersonalInfo(),
      this.clearMeals(),
      SecureStore.deleteItemAsync(this.FIRST_TIME_USER),
    ]);
  }
}

/* ✅ EXPORT A TYPED SINGLETON */
const storageService = new StorageService();
export default storageService;
