/**
 * Basic test to ensure test setup is working
 */

describe('Basic functionality', () => {
  test('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  test('should have access to environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('should be able to create objects', () => {
    const testObject = { foo: 'bar' };
    expect(testObject.foo).toBe('bar');
  });
});