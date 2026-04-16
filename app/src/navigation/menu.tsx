import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useNavigation } from '@react-navigation/native';

export default function Menu() {
    const navigation = useNavigation()
    const menuItems = [
        { label: 'Produtos', screen: 'Products' },
        { label: 'Clientes', screen: 'Clients' },
        { label: 'Perfil' },
        { label: 'Conta' },
        { label: 'Configurações' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Menu</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Feather name="x" size={32} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.menuItems}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.item}>
                        <Text style={styles.itemText} onPress={() => navigation.navigate(item.screen as never)}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.primary.dark,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 60,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    menuItems: {
        gap: 24,
    },
    item: {
        paddingVertical: 8,
    },
    itemText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
});
