import React from 'react';
import { describe, it, expect, mock } from 'bun:test';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../index';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Click Me" />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = mock();
    const { getByText } = render(<Button title="Click Me" onPress={onPressMock} />);
    
    fireEvent.press(getByText('Click Me'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('applies correct background class for each variant', () => {
    const { getByText, rerender } = render(<Button title="Primary" variant="primary" />);

    const primaryButton = getByText('Primary').parent.parent;
    expect(primaryButton.props.className).toContain('bg-primary');

    rerender(<Button title="Danger" variant="danger" />);
    const dangerButton = getByText('Danger').parent.parent;
    expect(dangerButton.props.className).toContain('bg-danger');
  });

  it('handles ghost variant with transparent background', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" />);
    const ghostButton = getByText('Ghost').parent.parent;
    expect(ghostButton.props.className).toContain('bg-transparent');
  });
});
