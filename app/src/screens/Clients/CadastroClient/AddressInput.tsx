import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AddressSuggestion } from '@/services/geocoding.service';

interface AddressInputProps {
  value:               string;
  suggestions:         AddressSuggestion[];
  showSuggestions:     boolean;
  suggestionsLoading:  boolean;
  onChangeText:        (text: string) => void;
  onFocus:             () => void;
  onClear:             () => void;
  onSelectSuggestion:  (s: AddressSuggestion) => void;
  onCloseSuggestions:  () => void;
}

export function AddressInput({
  value, suggestions, showSuggestions, suggestionsLoading,
  onChangeText, onFocus, onClear, onSelectSuggestion, onCloseSuggestions,
}: AddressInputProps) {
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#3C096C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
        Endereço
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F0EBF8', borderRadius: 10,
        paddingHorizontal: 12, minHeight: 44,
      }}>
        <TextInput
          style={{ flex: 1, fontSize: 14, color: '#1A0030', paddingVertical: 10 }}
          placeholder="Rua, número, bairro..."
          placeholderTextColor="#8B5A96"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          multiline={false}
        />
        {suggestionsLoading && (
          <ActivityIndicator size="small" color="#5A189A" style={{ marginLeft: 6 }} />
        )}
        {!suggestionsLoading && (value?.length ?? 0) > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={15} color="#8B5A96" />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={{
          backgroundColor: '#fff', borderRadius: 10, marginTop: 4,
          borderWidth: 1, borderColor: '#E1DAE8',
          elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1, shadowRadius: 6, overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onSelectSuggestion(s)}
              style={{
                flexDirection: 'row', alignItems: 'flex-start',
                paddingHorizontal: 14, paddingVertical: 11,
                borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: '#F0EBF8', gap: 10,
              }}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={14} color="#5A189A" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#1A0030', fontWeight: '500' }} numberOfLines={1}>
                  {s.addressText || s.displayName.split(',')[0]}
                </Text>
                <Text style={{ fontSize: 11, color: '#8B5A96', marginTop: 1 }} numberOfLines={1}>
                  {[s.city, s.stateUF].filter(Boolean).join(' · ')}
                  {s.postcode ? ` · ${s.postcode}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={onCloseSuggestions}
            style={{ alignItems: 'center', paddingVertical: 8, backgroundColor: '#FAF8FC' }}
          >
            <Text style={{ fontSize: 11, color: '#8B5A96' }}>Fechar sugestões</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
