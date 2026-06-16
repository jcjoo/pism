import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/color';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItem {
  id: string;
  leftText: string;
  middleText: string;
  rightText: string;
}

interface AccordionProps {
  title: string;
  items?: AccordionItem[];
}

export function Accordion({ title, items = [] }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View className="bg-light-dark rounded-lg my-1 overflow-hidden border border-light">
      <TouchableOpacity
        className="flex-row justify-between items-center p-4"
        onPress={toggle}
        activeOpacity={0.8}
      >
        <Text className="text-base font-bold text-primary-dark">{title}</Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary.main} />
      </TouchableOpacity>

      {isOpen && (
        <View className="px-4 pb-4">
          {items.map((item, index) => (
            <View key={item.id || index} className="flex-row justify-between py-2">
              <Text className="text-xs text-primary flex-1 text-left">{item.leftText}</Text>
              <Text className="text-xs text-primary flex-1 text-center">{item.middleText}</Text>
              <Text className="text-xs text-primary flex-1 text-right">{item.rightText}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
