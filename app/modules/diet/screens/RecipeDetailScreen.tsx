import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DietStackParamList } from "../navigation/DietNavigator";

type Props = NativeStackScreenProps<DietStackParamList, "RecipeDetail">;

const RecipeDetailScreen = ({ route, navigation }: Props) => {
  const { recipe } = route.params;

  // Safely extract data with fallbacks
  const nutrients = recipe.nutrition?.nutrients || [];
  const ingredients = recipe.extendedIngredients || [];
  const instructions = recipe.analyzedInstructions?.[0]?.steps || [];

  const getNutrient = (name: string) =>
    Math.round(nutrients.find((n: any) => n.name === name)?.amount || 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: recipe.image }} style={styles.image} />
        <View style={styles.overlay} />

        <Text style={styles.title}>{recipe.title}</Text>

        {/* Nutrition Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Nutrition Facts</Text>
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🔥 Calories</Text>
            <Text style={styles.nutrientValue}>
              {getNutrient("Calories")} kcal
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🥩 Protein</Text>
            <Text style={styles.nutrientValue}>{getNutrient("Protein")} g</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🍞 Carbs</Text>
            <Text style={styles.nutrientValue}>
              {getNutrient("Carbohydrates")} g
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.nutrientRow}>
            <Text style={styles.nutrientText}>🥑 Fat</Text>
            <Text style={styles.nutrientValue}>{getNutrient("Fat")} g</Text>
          </View>
        </View>

        {/* Ingredients Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🛒 Ingredients</Text>
          {ingredients.length > 0 ? (
            ingredients.map((ing: any, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{ing.original}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Ingredients not available.</Text>
          )}
        </View>

        {/* Instructions Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>👨‍🍳 Instructions</Text>
          {instructions.length > 0 ? (
            instructions.map((step: any, index: number) => (
              <View key={index} style={styles.stepContainer}>
                <Text style={styles.stepNumber}>{step.number}</Text>
                <Text style={styles.listText}>{step.step}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.listText}>
              {recipe.instructions?.replace(/<[^>]*>?/gm, "") ||
                "Instructions not available."}
            </Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecipeDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262135",
  },
  scrollView: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    height: 300,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    padding: 20,
    color: "#fff",
    marginTop: -60,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    backgroundColor: "#3C3952",
    borderRadius: 16,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  nutrientText: {
    fontSize: 16,
    color: "#bfb9d6",
  },
  nutrientValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 4,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    color: "#4CAF50",
    fontSize: 18,
    marginRight: 8,
    marginTop: -2,
  },
  listText: {
    fontSize: 16,
    color: "#E0E0E0",
    lineHeight: 24,
    flex: 1,
  },
  stepContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stepNumber: {
    color: "#262135",
    backgroundColor: "#4CAF50",
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "bold",
    marginRight: 12,
    marginTop: 2,
    fontSize: 14,
  },
  emptyText: {
    color: "#888",
    fontStyle: "italic",
  },
});
