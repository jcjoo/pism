import { mock } from 'bun:test';
import React from 'react';

mock.module('react-native', () => {
  const passthrough = (displayName: string) => {
    const Comp = ({ children, ...props }: any) => React.createElement(displayName, props, children);
    Comp.displayName = displayName;
    return Comp;
  };

  return {
    View: passthrough('View'),
    Text: passthrough('Text'),
    TouchableOpacity: passthrough('TouchableOpacity'),
    TextInput: passthrough('TextInput'),
    ScrollView: passthrough('ScrollView'),
    Image: passthrough('Image'),
    Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

mock.module('@expo/vector-icons', () => {
  const iconStub = (name: string) => {
    const Comp = (props: any) => React.createElement(name, props);
    Comp.displayName = name;
    return Comp;
  };
  return {
    Feather: iconStub('Feather'),
    Ionicons: iconStub('Ionicons'),
    MaterialIcons: iconStub('MaterialIcons'),
    FontAwesome: iconStub('FontAwesome'),
    AntDesign: iconStub('AntDesign'),
  };
});

mock.module('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: async (key: string) => (key in store ? store[key] : null),
      setItem: async (key: string, value: string) => { store[key] = value; },
      removeItem: async (key: string) => { delete store[key]; },
      clear: async () => { store = {}; },
    },
  };
});
