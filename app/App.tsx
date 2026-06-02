import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from '@/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-light">
        <Navigation />
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}
