import React from 'react';
import { render } from '@testing-library/react';
import Page from '../src/app/page';

describe('Page', () => {
  it('should redirect to login', () => {
    expect(() => render(<Page />)).toThrow();
  });
});
