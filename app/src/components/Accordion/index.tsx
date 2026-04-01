import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { colors, typography } from '../../theme';
import { Feather } from '@expo/vector-icons';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
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
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.title}>{title}</Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary.main} />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.content}>
          {items.map((item, index) => (
            <View key={item.id || index} style={styles.row}>
              <Text style={styles.itemTextLeft}>{item.leftText}</Text>
              <Text style={styles.itemTextCenter}>{item.middleText}</Text>
              <Text style={styles.itemTextRight}>{item.rightText}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.dark,
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.main,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: parseInt(typography.sizes.corpo, 10) || 16,
    fontWeight: 'bold',
    color: colors.primary.dark,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemTextLeft: {
    fontSize: 12,
    color: colors.primary.main,
    flex: 1,
    textAlign: 'left',
  },
  itemTextCenter: {
    fontSize: 12,
    color: colors.primary.main,
    flex: 1,
    textAlign: 'center',
  },
  itemTextRight: {
    fontSize: 12,
    color: colors.primary.main,
    flex: 1,
    textAlign: 'right',
  },
});
