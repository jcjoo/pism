import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuantitySelector } from '../index';

describe('QuantitySelector Component', () => {
  it('renders correctly with default value', () => {
    const { getByText } = render(<QuantitySelector />);
    expect(getByText(/Quantidade/)).toBeTruthy();
  });

  it('increments quantity when + is pressed', () => {
    const onChangeMock = jest.fn();
    const { getByText } = render(<QuantitySelector value={1} onChange={onChangeMock} />);
    
    fireEvent.press(getByText('+'));
    expect(onChangeMock).toHaveBeenCalledWith(2);
  });

  it('decrements quantity when - is pressed', () => {
    const onChangeMock = jest.fn();
    const { getByText } = render(<QuantitySelector value={2} onChange={onChangeMock} />);
    
    fireEvent.press(getByText('-'));
    expect(onChangeMock).toHaveBeenCalledWith(1);
  });

  it('does not decrement below minimum', () => {
    const onChangeMock = jest.fn();
    const { getByText } = render(<QuantitySelector value={1} min={1} onChange={onChangeMock} />);
    
    fireEvent.press(getByText('-'));
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('displays the current value', () => {
    const { getByText } = render(<QuantitySelector value={5} />);
    expect(getByText(/\(5\)/)).toBeTruthy();
  });
});
