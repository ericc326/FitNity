import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  TextInput,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DietStackParamList } from "../navigation/DietNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

type DietScreenNavigationProp = NativeStackNavigationProp<
  DietStackParamList,
  "DietHome"
>;

const { width } = Dimensions.get("window");

type FoodItem = {
  id: string;
  name: string;
  type: string;
  tags: string[];
  time: string;
  calories: string;
  description: string;
  ingredients: string[];
  image: any;
  nutrition: {
    protein: string;
    calories: string;
    fat: string;
    carbs: string;
  };
};

const mealCategories = [
  { id: "1", name: "Breakfast", type: "Breakfast" },
  { id: "2", name: "Lunch", type: "Lunch" },
  { id: "3", name: "Dinner", type: "Dinner" },
  { id: "4", name: "Snacks", type: "Snack" },
];

const DietScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("recommended");
  const navigation = useNavigation<DietScreenNavigationProp>();

  const allFoodItems: FoodItem[] = [
    {
      id: "1",
      name: "Honey Pancake",
      type: "Breakfast",
      tags: ["Easy", "Baked"],
      time: "30mins",
      calories: "180kCal",
      description: "Fluffy pancakes with real honey drizzle and fresh berries.",
      ingredients: [
        "1 cup all-purpose flour",
        "2 tbsp sugar",
        "2 tsp baking powder",
        "1/2 tsp salt",
        "1 cup milk",
        "1 egg",
        "2 tbsp honey",
        "Fresh berries for topping",
      ],
      image: require("../../../assets/pancake.png"),
      nutrition: {
        protein: "12g",
        calories: "350kcal",
        fat: "10g",
        carbs: "45g",
      },
    },
    {
      id: "2",
      name: "Avocado Toast",
      type: "Breakfast",
      tags: ["Quick", "Healthy"],
      time: "20mins",
      calories: "230kCal",
      description: "Creamy avocado on toasted whole grain bread.",
      ingredients: [
        "2 slices whole grain bread",
        "1 ripe avocado",
        "1/2 lemon",
        "Chili flakes to taste",
        "Salt and pepper",
        "2 eggs (optional)",
      ],
      image: require("../../../assets/pancake.png"),
      nutrition: {
        protein: "8g",
        calories: "280kcal",
        fat: "15g",
        carbs: "30g",
      },
    },
    // Add more items as needed
  ];

  const recommendedItems = allFoodItems.slice(0, 2);

  const filteredItems = allFoodItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const renderRecommendedItem = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity
      style={styles.recommendedCard}
      onPress={() => navigation.navigate("FoodDetails", { food: item })}
    >
      <Image source={item.image} style={styles.foodImage} />
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{item.name}</Text>
        <View style={styles.foodMeta}>
          <Text style={styles.foodTag}>{item.tags[0]}</Text>
          <Text style={styles.foodTime}>{item.time}</Text>
          <Text style={styles.foodCalories}>{item.calories}</Text>
        </View>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate("FoodDetails", { food: item })}
        >
          <Text style={styles.viewButtonText}>View More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderMealCategory = ({
    item,
  }: {
    item: { id: string; name: string; type: string };
  }) => (
    <TouchableOpacity
      style={styles.mealCategoryCard}
      onPress={() =>
        navigation.navigate("MealRecipes", { mealType: item.type })
      }
    >
      <Text style={styles.mealCategoryName}>{item.name}</Text>
      <Text style={styles.mealCategorySubtitle}>Egg + Foods</Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() =>
          navigation.navigate("MealRecipes", { mealType: item.type })
        }
      >
        <Text style={styles.selectButtonText}>Select</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Diet</Text>
        </View>

        {/* Search and Scan */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for meals..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate("FoodScanner")}
          >
            <MaterialCommunityIcons
              name="barcode-scan"
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Recommended Items */}
        <Text style={styles.sectionTitle}>Recommended for you</Text>
        <FlatList
          data={recommendedItems}
          renderItem={renderRecommendedItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedList}
        />

        {/* Meal Categories */}
        <Text style={styles.sectionTitle}>meal recipes</Text>
        <FlatList
          data={mealCategories}
          renderItem={renderMealCategory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.mealCategoryRow}
          scrollEnabled={false}
          contentContainerStyle={styles.mealCategoriesList}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#262135", // Match your main background
  },
  contentContainer: {
    padding: 12,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  searchBar: {
    flex: 1,
    backgroundColor: "#1E1E1E", // Darker gray
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
    color: "#666", // Gray icon
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF", // White text
    height: "100%",
  },
  scanButton: {
    width: 50,
    backgroundColor: "#5A3BFF",
    borderRadius: 8,
    marginLeft: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
    marginBottom: 16,
    textTransform: "capitalize",
  },
  recommendedList: {
    paddingBottom: 16,
  },
  recommendedCard: {
    width: width * 0.7,
    backgroundColor: "#1E1E1E", // Dark card
    borderRadius: 12,
    marginRight: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#333333", // Dark border
  },
  foodImage: {
    width: "100%",
    height: 150,
  },
  foodInfo: {
    padding: 16,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
    marginBottom: 8,
  },
  foodMeta: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  foodTag: {
    backgroundColor: "#333333", // Dark tag
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    fontSize: 12,
    color: "#FFFFFF", // White text
  },
  foodTime: {
    marginRight: 8,
    fontSize: 12,
    color: "#CCCCCC", // Light gray
  },
  foodCalories: {
    fontSize: 12,
    color: "#CCCCCC", // Light gray
  },
  viewButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#5A3BFF",
    borderRadius: 4,
  },
  viewButtonText: {
    color: "#FFFFFF", // White text
    fontWeight: "bold",
  },
  mealCategoriesList: {
    paddingBottom: 16,
  },
  mealCategoryRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  mealCategoryCard: {
    width: width * 0.43,
    backgroundColor: "#1E1E1E", // Dark card
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333333", // Dark border
  },
  mealCategoryName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
    marginBottom: 4,
  },
  mealCategorySubtitle: {
    fontSize: 12,
    color: "#CCCCCC", // Light gray
    marginBottom: 16,
  },
  selectButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#5A3BFF",
    borderRadius: 4,
  },
  selectButtonText: {
    color: "#FFFFFF", // White text
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default DietScreen;
