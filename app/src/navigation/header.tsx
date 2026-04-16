import { Feather } from "@expo/vector-icons";
import { TouchableOpacity, StyleSheet, Text, View } from "react-native";
import { colors, typography } from "@/theme";
import { BottomTabHeaderProps } from "@react-navigation/bottom-tabs";

export default function Header({ options, route, navigation }: BottomTabHeaderProps) {
    const title = options.headerTitle !== undefined
        ? options.headerTitle
        : options.title !== undefined
            ? options.title
            : route.name;

    return (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>{title.toString()}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Menu' as never)}>
                <Feather name="menu" size={28} color={colors.primary.dark} />
            </TouchableOpacity>
        </View>
    );
}


const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: colors.light.main
    },
    headerTitle: {
        fontSize: parseInt(typography.sizes.h3, 10) || 28,
        fontWeight: 'bold',
        color: colors.primary.dark
    },
});
