import React from 'react';
import { describe, it, expect, mock } from 'bun:test';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { QuantitySelector } from '../index';

function pressButtons(getAllByType: (type: any) => any[]) {
  const buttons = getAllByType(TouchableOpacity);
  return { minusButton: buttons[0], plusButton: buttons[1] };
}

describe('QuantitySelector Component', () => {
  it('renders with the default quantity (min)', () => {
    const { getByText } = render(<QuantitySelector min={3} />);
    expect(getByText('3')).toBeTruthy();
  });

  it('increments quantity when + is pressed', () => {
    const onChangeMock = mock();
    const { UNSAFE_getAllByType } = render(<QuantitySelector value={1} onChange={onChangeMock} />);

    const { plusButton } = pressButtons(UNSAFE_getAllByType);
    fireEvent.press(plusButton);

    expect(onChangeMock).toHaveBeenCalledWith(2, 'up');
  });

  it('decrements quantity when - is pressed', () => {
    const onChangeMock = mock();
    const { UNSAFE_getAllByType } = render(<QuantitySelector value={2} onChange={onChangeMock} />);

    const { minusButton } = pressButtons(UNSAFE_getAllByType);
    fireEvent.press(minusButton);

    expect(onChangeMock).toHaveBeenCalledWith(1, 'down');
  });

  it('does not decrement below minimum', () => {
    const onChangeMock = mock();
    const { UNSAFE_getAllByType } = render(<QuantitySelector value={1} min={1} onChange={onChangeMock} />);

    const { minusButton } = pressButtons(UNSAFE_getAllByType);
    fireEvent.press(minusButton);

    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('displays the custom displayText instead of the quantity', () => {
    const { getByText } = render(<QuantitySelector value={5} displayText="5 caixas" />);
    expect(getByText('5 caixas')).toBeTruthy();
  });

  it('renders the label when provided', () => {
    const { getByText } = render(<QuantitySelector label="Quantidade" value={1} />);
    expect(getByText('Quantidade')).toBeTruthy();
  });
});
