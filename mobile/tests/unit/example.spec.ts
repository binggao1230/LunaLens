import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import HomePage from '@/views/HomePage.vue';

describe('HomePage.vue', () => {
  test('renders the LunaLens welcome', () => {
    const wrapper = mount(HomePage);
    expect(wrapper.text()).toContain('Explore the Moon');
  });
});
