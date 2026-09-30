import { readFileSync } from 'fs';
import path from 'path';
import { API_CONFIG } from '@/types/accounts';

// The dashboard sends { [idParamName]: id } to deleteUrl. Each route must read
// exactly that key from the body, or disconnecting silently fails with a 400.
describe('API_CONFIG delete contract', () => {
  it.each(Object.entries(API_CONFIG))('%s: route reads the key the dashboard sends', (_platform, { deleteUrl, idParamName }) => {
    const route = readFileSync(path.join(__dirname, '../../src/app', deleteUrl, 'route.ts'), 'utf8');
    expect(route).toMatch(new RegExp(`const \\{ ?${idParamName} ?\\} =`));
  });
});
