import { View, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function Clients() {
    const navigation = useNavigation()
    return (
        <View>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Feather name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
            <Text>Clients</Text>
        </View>
    );
}