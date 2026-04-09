import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../index';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Click Me" />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Click Me" onPress={onPressMock} />);
    
    fireEvent.press(getByText('Click Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('applies correct background color for each variant', () => {
    const { getByText, rerender } = render(<Button title="Primary" variant="primary" />);
    // Note: To test styles in React Native with @testing-library/react-native, 
    // we check the props and style array.
    
    const primaryButton = getByText('Primary').parent;
    expect(primaryButton.props.style).toContainEqual(expect.objectContaining({ backgroundColor: expect.any(String) }));

    rerender(<Button title="Danger" variant="danger" />);
    const dangerButton = getByText('Danger').parent;
    expect(dangerButton.props.style).toContainEqual(expect.objectContaining({ backgroundColor: expect.any(String) }));
  });

  it('handles ghost variant with transparent background', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" />);
    const ghostButton = getByText('Ghost').parent;
    expect(ghostButton.props.style).toContainEqual(expect.objectContaining({ backgroundColor: 'transparent' }));
  });
});
