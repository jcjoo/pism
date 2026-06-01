import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Navigation } from '@/navigation';

export default function App() {
  return (
    <View className="flex-1 bg-light">
      <Navigation />
      <StatusBar style="auto" />
    </View>
  );
}
