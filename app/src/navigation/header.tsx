import { TouchableOpacity, Text, View } from "react-native";
import { BottomTabHeaderProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { colors } from '@/theme/color';

export default function Header({ options, route, navigation }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const title = options.headerTitle !== undefined
    ? options.headerTitle
    : options.title !== undefined
      ? options.title
      : route.name;

  const meta = (user as any)?.user_metadata ?? {};
  const fullName: string = meta.full_name ?? meta.name ?? user?.email ?? '';
  const initials = fullName
    .trim().split(' ').filter(Boolean).slice(0, 2)
    .map((w: string) => w[0].toUpperCase()).join('') || '?';

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
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.primary.dark, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{initials}</Text>
      </TouchableOpacity>
    </View>
  );
}
