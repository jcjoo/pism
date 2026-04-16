import { Feather } from "@expo/vector-icons";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function NewProduct() {
    const navigation = useNavigation()
    return (
        <View>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <Text>NewProduct</Text>
        </View>
    );
}