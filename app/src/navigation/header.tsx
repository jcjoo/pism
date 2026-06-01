import { Feather } from "@expo/vector-icons";
import { TouchableOpacity, Text, View } from "react-native";
import { BottomTabHeaderProps } from "@react-navigation/bottom-tabs";

export default function Header({ options, route, navigation }: BottomTabHeaderProps) {
  const title = options.headerTitle !== undefined
    ? options.headerTitle
    : options.title !== undefined
      ? options.title
      : route.name;

  return (
    <View className="page-header px-6 justify-between">
      <Text className="text-[28px] font-bold text-primary-dark">{title.toString()}</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Menu' as never)}>
        <Feather name="menu" size={28} color="#3C096C" />
      </TouchableOpacity>
    </View>
  );
}
