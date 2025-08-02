import React from 'react';
import { render, screen } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { checkAccessibility } from '@/__tests__/utils/test-utils';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');

    rerender(<Button variant="terminal">Terminal</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-terminal-green');

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border', 'border-border');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).not.toHaveClass('bg-primary');

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-primary', 'underline-offset-4');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10', 'px-4');

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8', 'px-3', 'text-xs');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-12', 'px-6', 'text-base');

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole('button')).toHaveClass('size-10');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('supports custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('inline-flex', 'items-center');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    
    render(<Button ref={ref}>Button with ref</Button>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveTextContent('Button with ref');
  });

  it('supports aria attributes', () => {
    render(
      <Button aria-label="Custom label" aria-describedby="description">
        Button
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /custom label/i });
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  it('has proper focus styles', async () => {
    const user = userEvent.setup();
    
    render(<Button>Focus me</Button>);
    
    const button = screen.getByRole('button', { name: /focus me/i });
    await user.tab();
    
    expect(button).toHaveFocus();
    expect(button).toHaveClass('focus-visible:ring-2');
  });

  it('passes accessibility checks', async () => {
    const { container } = render(<Button>Accessible Button</Button>);
    await checkAccessibility(container);
  });

  it('handles keyboard navigation', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Keyboard Button</Button>);
    
    const button = screen.getByRole('button', { name: /keyboard button/i });
    await user.tab();
    expect(button).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    await user.keyboard('{Space}');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('applies data-slot attribute', () => {
    render(<Button>Data Slot</Button>);
    
    const button = screen.getByRole('button', { name: /data slot/i });
    expect(button).toHaveAttribute('data-slot', 'button');
  });

  describe('Button Variants Visual Regression', () => {
    it('renders all variants consistently', () => {
      const variants = ['default', 'terminal', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>{variant} Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toMatchSnapshot(`button-variant-${variant}`);
        unmount();
      });
    });

    it('renders all sizes consistently', () => {
      const sizes = ['default', 'sm', 'lg', 'icon'] as const;
      
      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>{size} Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toMatchSnapshot(`button-size-${size}`);
        unmount();
      });
    });
  });

  describe('Button Edge Cases', () => {
    it('handles empty children', () => {
      render(<Button></Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('IconText');
    });

    it('preserves other button attributes', () => {
      render(
        <Button 
          type="submit" 
          form="test-form" 
          data-testid="test-button"
          aria-pressed="true"
        >
          Submit
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'test-form');
      expect(button).toHaveAttribute('data-testid', 'test-button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });
});