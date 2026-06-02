import { Feather } from "@expo/vector-icons";
import { TouchableOpacity, Text, View } from "react-native";
import { BottomTabHeaderProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Header({ options, route, navigation }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();

  const title = options.headerTitle !== undefined
    ? options.headerTitle
    : options.title !== undefined
      ? options.title
      : route.name;

  return (
    <View
      className="flex-row items-center px-6 pb-4 bg-light justify-between"
      style={{ paddingTop: insets.top + 10 }}
    >
      <Text className="text-[26px] font-bold text-primary-dark flex-1 mr-4" numberOfLines={1}>
        {title.toString()}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Menu' as never)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="menu" size={26} color="#3C096C" />
      </TouchableOpacity>
    </View>
  );
}
