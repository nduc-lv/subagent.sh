import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('bg-red-500', 'text-white', 'p-4');
    expect(result).toBe('bg-red-500 text-white p-4');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class', !isActive && 'inactive-class');
    expect(result).toBe('base-class active-class');
  });

  it('resolves Tailwind conflicts by using twMerge', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles array inputs', () => {
    const result = cn(['bg-red-500', 'text-white'], ['p-4', 'm-2']);
    expect(result).toBe('bg-red-500 text-white p-4 m-2');
  });

  it('handles object inputs with conditional values', () => {
    const result = cn({
      'bg-red-500': true,
      'bg-blue-500': false,
      'text-white': true,
      'text-black': false,
    });
    expect(result).toBe('bg-red-500 text-white');
  });

  it('handles mixed input types', () => {
    const result = cn(
      'base-class',
      ['array-class-1', 'array-class-2'],
      {
        'conditional-true': true,
        'conditional-false': false,
      },
      'final-class'
    );
    expect(result).toBe('base-class array-class-1 array-class-2 conditional-true final-class');
  });

  it('handles empty and falsy values', () => {
    const result = cn('', null, undefined, false, 'valid-class', 0);
    expect(result).toBe('valid-class');
  });

  it('deduplicates identical classes', () => {
    const result = cn('bg-red-500', 'text-white', 'bg-red-500', 'text-white');
    expect(result).toBe('bg-red-500 text-white');
  });

  it('handles complex Tailwind modifier conflicts', () => {
    const result = cn('hover:bg-red-500', 'hover:bg-blue-500', 'focus:bg-green-500');
    expect(result).toBe('hover:bg-blue-500 focus:bg-green-500');
  });

  it('preserves non-conflicting classes while resolving conflicts', () => {
    const result = cn('bg-red-500', 'text-white', 'bg-blue-500', 'p-4');
    expect(result).toBe('text-white bg-blue-500 p-4');
  });

  it('handles responsive prefixes correctly', () => {
    const result = cn('bg-red-500', 'md:bg-blue-500', 'lg:bg-green-500');
    expect(result).toBe('bg-red-500 md:bg-blue-500 lg:bg-green-500');
  });

  it('resolves conflicts within the same responsive breakpoint', () => {
    const result = cn('md:bg-red-500', 'md:bg-blue-500');
    expect(result).toBe('md:bg-blue-500');
  });

  it('handles state variants correctly', () => {
    const result = cn('hover:bg-red-500', 'focus:bg-blue-500', 'active:bg-green-500');
    expect(result).toBe('hover:bg-red-500 focus:bg-blue-500 active:bg-green-500');
  });

  it('handles arbitrary values', () => {
    const result = cn('bg-[#ff0000]', 'text-[14px]', 'margin-[10px]');
    expect(result).toBe('bg-[#ff0000] text-[14px] margin-[10px]');
  });

  it('resolves conflicts with arbitrary values', () => {
    const result = cn('bg-red-500', 'bg-[#0000ff]');
    expect(result).toBe('bg-[#0000ff]');
  });

  it('handles complex nested conditions', () => {
    const isActive = true;
    const hasError = false;
    const size: 'large' | 'small' = 'large';
    
    const result = cn(
      'base-button',
      {
        'bg-blue-500': isActive,
        'bg-gray-500': !isActive,
        'border-red-500': hasError,
        'border-gray-300': !hasError,
      },
      size === 'large' && 'text-lg p-4',
      size === 'small' && 'text-sm p-2'
    );
    
    expect(result).toBe('base-button bg-blue-500 border-gray-300 text-lg p-4');
  });

  it('works with no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles single argument', () => {
    const result = cn('single-class');
    expect(result).toBe('single-class');
  });

  describe('Edge cases', () => {
    it('handles very long class strings', () => {
      const longClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`).join(' ');
      const result = cn(longClasses);
      expect(result).toContain('class-0');
      expect(result).toContain('class-99');
    });

    it('handles special characters in class names', () => {
      const result = cn('bg-red-500/50', 'text-white/90', 'shadow-lg/75');
      expect(result).toBe('bg-red-500/50 text-white/90 shadow-lg/75');
    });

    it('handles classes with underscores and hyphens', () => {
      const result = cn('bg_red_500', 'text-white-500', 'custom_class-name');
      expect(result).toBe('bg_red_500 text-white-500 custom_class-name');
    });

    it('handles numeric class names', () => {
      const result = cn('w-1/2', 'h-1/3', 'top-1/4');
      expect(result).toBe('w-1/2 h-1/3 top-1/4');
    });

    it('resolves conflicts with fraction values', () => {
      const result = cn('w-1/2', 'w-1/3', 'w-full');
      expect(result).toBe('w-full');
    });
  });

  describe('Performance considerations', () => {
    it('processes large numbers of classes efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        cn('bg-red-500', 'text-white', 'p-4', 'm-2', 'rounded-lg', 'shadow-md');
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete 1000 operations in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('handles repeated calls with same inputs consistently', () => {
      const classes = ['bg-red-500', 'text-white', 'p-4'];
      const result1 = cn(...classes);
      const result2 = cn(...classes);
      const result3 = cn(...classes);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('Integration with component patterns', () => {
    it('works with button variants pattern', () => {
      const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium';
      const variants = {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      };
      const sizes = {
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-8 text-lg',
      };
      
      const result = cn(baseClasses, variants.destructive, sizes.lg, 'custom-class');
      
      expect(result).toContain('inline-flex');
      expect(result).toContain('bg-destructive');
      expect(result).toContain('h-11');
      expect(result).toContain('custom-class');
    });

    it('works with conditional styling pattern', () => {
      const isLoading = true;
      const hasError = false;
      const isSuccess = false;
      
      const result = cn(
        'base-input',
        'border rounded px-3 py-2',
        {
          'border-gray-300': !hasError && !isSuccess,
          'border-red-500': hasError,
          'border-green-500': isSuccess,
          'opacity-50 cursor-not-allowed': isLoading,
        }
      );
      
      expect(result).toContain('base-input');
      expect(result).toContain('border-gray-300');
      expect(result).toContain('opacity-50');
      expect(result).toContain('cursor-not-allowed');
      expect(result).not.toContain('border-red-500');
      expect(result).not.toContain('border-green-500');
    });
  });
});