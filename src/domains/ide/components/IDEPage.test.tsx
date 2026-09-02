import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { IDEPage } from './IDEPage';

describe('IDEPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<IDEPage />);
    expect(container).toBeDefined();
  });
});
